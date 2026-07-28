import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/cloudflare-pages';
import Stripe from 'stripe';
import { generateId, hashPassword, verifyPassword, needsPasswordRehash, createSessionToken, generateEmailToken, generateMFASecret, verifyTOTP, sendTransactionalEmail } from './lib/auth';
import { encryptText, decryptText, requireEncryptionKey } from './lib/crypto';
import { parseCreditReportText } from './engine/parser';
import { detectViolations, calculateLitigationScore, type CreditReportData } from './engine/violations';
import { mapMfsnToInternal } from './engine/mfsn-mapper';
import { mapSmartCreditToInternal } from './engine/smartcredit-mapper';
import { DOCUMENT_TYPES, type DocumentData } from './engine/documents';
import { generatePDFReport, type PDFReportData, generatePDFFromText } from './engine/pdf-generator';
import { FOUNDER_TEMPLATES } from './engine/founder-templates';

// Secure field-level cryptographic helpers mapped to Worker bindings
async function encryptPII(c: any, text: string): Promise<string> {
  requireEncryptionKey(c.env.PII_ENCRYPTION_KEY);
  return encryptText(text, c.env.PII_ENCRYPTION_KEY);
}

async function decryptPII(c: any, text: string): Promise<string> {
  return decryptText(text, c.env.PII_ENCRYPTION_KEY);
}

async function backpopulateClientInfo(c: any, clientId: string, personalInfo: any, orgId: string) {
  if (!personalInfo) return;

  try {
    const client = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ? AND org_id = ?').bind(clientId, orgId).first() as any;
    if (!client) return;

    const updates: string[] = [];
    const binds: any[] = [];

    // 1. Backpopulate Full Address details if currently empty
    if (!client.address_line1 && personalInfo.addresses?.[0]) {
      const fullAddr = personalInfo.addresses[0].trim();
      updates.push('address_line1 = ?');
      binds.push(fullAddr);

      if (!client.city || !client.state || !client.zip) {
        const parts = fullAddr.split(',').map((p: string) => p.trim());
        if (parts.length >= 3) {
          let parsedCity = parts[parts.length - 2];
          const stateZip = parts[parts.length - 1].split(/\s+/);
          let parsedState = stateZip[0] || null;
          let parsedZip = stateZip[1] || null;

          if (!client.city && parsedCity) {
            updates.push('city = ?');
            binds.push(parsedCity);
          }
          if (!client.state && parsedState) {
            updates.push('state = ?');
            binds.push(parsedState.toUpperCase());
          }
          if (!client.zip && parsedZip) {
            updates.push('zip = ?');
            binds.push(parsedZip);
          }
        }
      }
    }

    // 2. Backpopulate Date of Birth if currently empty
    if (!client.dob && personalInfo.dobs?.[0]) {
      updates.push('dob = ?');
      binds.push(personalInfo.dobs[0].trim());
    }

    // 3. Backpopulate Clean SSN Last 4 if currently empty
    if (!client.ssn_last4 && personalInfo.ssns?.[0]) {
      let ssnVal = personalInfo.ssns[0].trim();
      if (ssnVal.includes('-')) {
        const parts = ssnVal.split('-');
        ssnVal = parts[parts.length - 1];
      }
      ssnVal = ssnVal.replace(/\D/g, '');
      if (ssnVal.length > 4) {
        ssnVal = ssnVal.slice(-4);
      }
      if (ssnVal) {
        updates.push('ssn_last4 = ?');
        binds.push(ssnVal);
      }
    }

    // 4. Update placeholder Name ("New Client") with parsed Real Name
    if ((!client.first_name || client.first_name === 'New') && (!client.last_name || client.last_name === 'Client') && personalInfo.names?.[0]) {
      const rawName = personalInfo.names[0].trim();
      let firstName = '';
      let lastName = '';
      if (rawName.includes(',')) {
        const parts = rawName.split(',');
        lastName = parts[0].trim();
        firstName = parts.slice(1).join(',').trim();
      } else {
        const parts = rawName.split(/\s+/);
        firstName = parts[0] || '';
        lastName = parts.slice(1).join(' ') || 'Client';
      }
      
      const toTitleCase = (str: string) => {
        return str.toLowerCase()
          .replace(/(?:^|\s|-|')\S/g, (m) => m.toUpperCase())
          .replace(/\b(Mc)([a-z])/g, (_, p1, p2) => p1 + p2.toUpperCase());
      };

      if (firstName && lastName) {
        updates.push('first_name = ?', 'last_name = ?');
        binds.push(toTitleCase(firstName), toTitleCase(lastName));
      }
    }

    if (updates.length > 0) {
      updates.push('updated_at = datetime("now")');
      binds.push(clientId);
      const sql = `UPDATE clients SET ${updates.join(', ')} WHERE id = ?`;
      await c.env.DB.prepare(sql).bind(...binds).run();
    }
  } catch (err) {
    console.error('Failed to backpopulate client info from parsed report:', err);
  }
}




type Bindings = {
  DB: any;
  STRIPE_API_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PROFESSIONAL_PRICE_ID?: string;
  STRIPE_UNLIMITED_PRICE_ID?: string;
  STRIPE_ENTERPRISE_PRICE_ID?: string;
  FRONTEND_URL?: string;
  CLICK2MAIL_USERNAME?: string;
  CLICK2MAIL_AUTH_BASIC?: string;
  CLICK2MAIL_API_URL?: string;
  AI?: any;
  SMARTCREDIT_CLIENT_KEY?: string;
  SMARTCREDIT_CLIENT_SECRET?: string;
  RATE_LIMIT_KV?: any;
  SENTRY_DSN?: string;
  PII_ENCRYPTION_KEY?: string;
  RESEND_API_KEY?: string;
  MAILING_WEBHOOK_SECRET?: string;
  PLATFORM_BOOTSTRAP_EMAIL?: string;
  PLATFORM_BOOTSTRAP_PASSWORD?: string;
  ENVIRONMENT?: string;
};
type Variables = { user?: any; org?: any; session?: any };

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Stripe initialization helper
const getStripe = (env: Bindings) => {
  if (!env.STRIPE_API_KEY) throw new Error('STRIPE_API_KEY is not configured');
  return new Stripe(env.STRIPE_API_KEY, {
    httpClient: Stripe.createFetchHttpClient(),
  });
};

app.use('/api/*', cors());

// ═══════════════════════════════════════════════════════════════
// GLOBAL SECURITY HEADERS & CONTENT SECURITY POLICY (CSP)
// ═══════════════════════════════════════════════════════════════
app.use('*', async (c, next) => {
  await next();
  c.res.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; img-src 'self' data: https://storage.googleapis.com https://images.unsplash.com; connect-src 'self' https://api.stripe.com https://fonts.googleapis.com;");
  c.res.headers.set('X-Frame-Options', 'DENY');
  c.res.headers.set('X-Content-Type-Options', 'nosniff');
  c.res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
});

// ═══════════════════════════════════════════════════════════════
// EDGE RATE LIMITING MIDDLEWARE (VIA CLOUDFLARE KV)
// ═══════════════════════════════════════════════════════════════
async function rateLimiter(c: any, next: any) {
  const ip = c.req.header('CF-Connecting-IP') || 'anonymous';
  const key = `rate_limit:${ip}`;
  
  if (!c.env.RATE_LIMIT_KV) {
    return await next();
  }

  try {
    const currentCount = parseInt(await c.env.RATE_LIMIT_KV.get(key) || '0', 10);
    if (currentCount >= 100) {
      return c.json({ error: 'Too many requests. Please slow down.' }, 429);
    }
    await c.env.RATE_LIMIT_KV.put(key, (currentCount + 1).toString(), { expirationTtl: 60 });
  } catch (e) {
    console.warn('[WARN] Rate limiter KV failed:', e);
  }
  
  await next();
}

app.use('/api/auth/login', rateLimiter);
app.use('/api/auth/register', rateLimiter);
app.use('/api/auth/forgot-password', rateLimiter);
app.use('/api/reports/upload', rateLimiter);

// ═══════════════════════════════════════════════════════════════
// GLOBAL ERROR HANDLER & OBSERVABILITY TELEMETRY
// ═══════════════════════════════════════════════════════════════
app.onError((err, c) => {
  const errorLog = {
    error: err.message,
    stack: err.stack,
    method: c.req.method,
    path: c.req.path,
    timestamp: new Date().toISOString(),
    ip: c.req.header('CF-Connecting-IP') || 'unknown',
    user_agent: c.req.header('User-Agent') || 'unknown',
    user_id: c.get('session')?.user_id || 'anonymous',
  };
  console.error('[CRITICAL UNHANDLED EXCEPTION]', JSON.stringify(errorLog));
  return c.json({ error: 'Internal Server Error', message: err.message }, 500);
});

// Serve static assets in local development and production
app.use('/static/*', serveStatic());
app.use('/content/*', serveStatic());

// Request logging middleware
app.use('/api/*', async (c, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  const log = {
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    duration_ms: ms,
    ip: c.req.header('CF-Connecting-IP') || 'unknown',
    user_agent: c.req.header('User-Agent') || 'unknown',
    timestamp: new Date().toISOString(),
  };
  if (c.res.status >= 500) {
    console.error('[ERROR]', JSON.stringify(log));
  } else if (c.res.status >= 400) {
    console.warn('[WARN]', JSON.stringify(log));
  } else {
    console.log('[INFO]', JSON.stringify(log));
  }
});

// Delay utility for mock API simulations
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ═══════════════════════════════════════════════════════════════
// AUTH MIDDLEWARE
// ═══════════════════════════════════════════════════════════════
async function authMiddleware(c: any, next: any) {
  const sessionId = c.req.header('Authorization')?.replace('Bearer ', '') ||
    c.req.query('token');
  if (!sessionId) return c.json({ error: 'Unauthorized' }, 401);

  const session = await c.env.DB.prepare(
    'SELECT s.*, u.id as user_id, u.name as user_name, u.email as user_email, u.role as user_role, u.is_active, u.org_id FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.id = ? AND s.expires_at > datetime("now")'
  ).bind(sessionId).first();

  if (!session) return c.json({ error: 'Session expired' }, 401);

  // Active Suspension Enforcement
  if (session.is_active === 0) {
    return c.json({ error: 'User account suspended' }, 403);
  }

  const org = await c.env.DB.prepare('SELECT settings FROM organizations WHERE id = ?').bind(session.org_id).first();
  if (org) {
    try {
      const settings = JSON.parse(org.settings || '{}');
      if (settings.suspended) {
        return c.json({ error: 'Organization account suspended' }, 403);
      }
    } catch (e) {}
  }

  // Session Request Fingerprinting (Zero-Trust Session Hijacking Protection)
  const currentIp = c.req.header('CF-Connecting-IP') || 'unknown';
  const currentUa = c.req.header('User-Agent') || 'unknown';

  if (session.ip_address && session.ip_address !== 'unknown' && session.ip_address !== currentIp) {
    console.warn(`[SECURITY] Session Hijacking Attempt detected! Session: ${session.id}. Saved IP: ${session.ip_address}, Request IP: ${currentIp}`);
    await c.env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();
    return c.json({ error: 'Session hijacked / IP mismatch' }, 401);
  }
  if (session.user_agent && session.user_agent !== 'unknown' && session.user_agent !== currentUa) {
    console.warn(`[SECURITY] Session Hijacking Attempt detected! Session: ${session.id}. Saved UA: ${session.user_agent}, Request UA: ${currentUa}`);
    await c.env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();
    return c.json({ error: 'Session hijacked / User-Agent mismatch' }, 401);
  }

  c.set('user', { id: session.user_id, name: session.user_name, email: session.user_email, role: session.user_role, org_id: session.org_id });
  c.set('session', session);
  return next();
}

// ═══════════════════════════════════════════════════════════════
// MULTI-TENANCY PLAN LIMITS & 'NO FREE TRIALS' ENFORCEMENT
// ═══════════════════════════════════════════════════════════════
async function verifyOrgPlanLimits(c: any, resourceType: 'client' | 'report' | 'user') {
  const user = c.get('user');
  if (!user || !user.org_id) {
    return { allowed: false, message: 'Unauthorized' };
  }

  // Master bypass check: Rick Jefferson has unlimited access for free
  if (user.role === 'super_admin' || user.email === 'rjbizsolution23@gmail.com') {
    return { allowed: true };
  }

  const org = await c.env.DB.prepare('SELECT plan FROM organizations WHERE id = ?').bind(user.org_id).first();
  const plan = org?.plan || 'free';

  // Strict "No Free Trials" Compliance Gate
  if (plan === 'free') {
    return {
      allowed: false,
      message: 'Subscription Required. Under SmartFCRA compliance rules and RJ Business Solutions terms, free trials are not supported. Please subscribe to a plan in the Billing tab to unlock all features.'
    };
  }

  if (resourceType === 'client') {
    if (plan === 'professional' || plan === 'pro') {
      const clientCountRes = await c.env.DB.prepare('SELECT COUNT(*) as total FROM clients WHERE org_id = ?').bind(user.org_id).first();
      const clientCount = clientCountRes?.total || 0;
      if (clientCount >= 100) {
        return {
          allowed: false,
          message: 'Client Limit Reached. Your Basic plan supports up to 100 clients. Please upgrade to the Unlimited or Enterprise plan for unlimited clients.'
        };
      }
    }
  }

  if (resourceType === 'report') {
    if (plan === 'professional' || plan === 'pro') {
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      const reportCountRes = await c.env.DB.prepare(
        "SELECT COUNT(*) as total FROM credit_reports WHERE org_id = ? AND strftime('%Y-%m', created_at) = ?"
      ).bind(user.org_id, currentMonth).first();
      const reportCount = reportCountRes?.total || 0;
      if (reportCount >= 100) {
        return {
          allowed: false,
          message: 'Report Analysis Limit Reached. Your Basic plan supports up to 100 report analyses per month. Please upgrade to the Unlimited or Enterprise plan for unlimited analyses.'
        };
      }
    }
  }

  if (resourceType === 'user') {
    if (plan === 'professional' || plan === 'pro') {
      const userCountRes = await c.env.DB.prepare('SELECT COUNT(*) as total FROM users WHERE org_id = ?').bind(user.org_id).first();
      const userCount = userCountRes?.total || 0;
      if (userCount >= 5) {
        return {
          allowed: false,
          message: 'Team Limit Reached. Your Basic plan supports up to 5 team members. Please upgrade to the Unlimited or Enterprise plan for more seats.'
        };
      }
    } else if (plan === 'unlimited') {
      const userCountRes = await c.env.DB.prepare('SELECT COUNT(*) as total FROM users WHERE org_id = ?').bind(user.org_id).first();
      const userCount = userCountRes?.total || 0;
      if (userCount >= 20) {
        return {
          allowed: false,
          message: 'Team Limit Reached. Your Unlimited plan supports up to 20 team members. Please upgrade to the Enterprise plan for more seats.'
        };
      }
    }
  }

  return { allowed: true };
}

// ═══════════════════════════════════════════════════════════════
// HEALTH CHECK
app.get('/api/health', async (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    region: c.req.header('CF-Region') || 'unknown',
  });
});

// AUTH ROUTES
// ═══════════════════════════════════════════════════════════════
app.post('/api/auth/register', async (c) => {
  const { name, email, password, orgName } = await c.req.json();
  if (!name || !email || !password || !orgName) return c.json({ error: 'All fields required' }, 400);
  if (String(password).length < 8) return c.json({ error: 'Password must be at least 8 characters' }, 400);

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (existing) return c.json({ error: 'Email already registered' }, 409);

  let orgId: string, userId: string, slug: string, passwordHash: string;
  try {
    orgId = generateId();
    userId = generateId();
    slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) + '-' + orgId.slice(0, 8);
  } catch (e: any) {
    console.error('[REGISTER] generateId failed:', e);
    return c.json({ error: 'Internal error (id gen)' }, 500);
  }

  try {
    passwordHash = await hashPassword(password);
  } catch (e: any) {
    console.error('[REGISTER] hashPassword failed:', e);
    return c.json({ error: e.message || 'Internal error (hashing)' }, 500);
  }

  try {
    // New orgs start inactive until email verified when Resend is configured
    const requireVerify = !!c.env.RESEND_API_KEY;
    await c.env.DB.batch([
      c.env.DB.prepare('INSERT INTO organizations (id, name, slug, plan) VALUES (?, ?, ?, ?)').bind(orgId, orgName, slug, 'free'),
      c.env.DB.prepare('INSERT INTO users (id, org_id, email, name, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(
        userId, orgId, email, name, passwordHash, 'admin', requireVerify ? 0 : 1
      ),
    ]);
  } catch (e: any) {
    console.error('[REGISTER] batch insert failed:', e.message, e.stack);
    if (e.message?.includes('UNIQUE')) return c.json({ error: 'Organization name already taken' }, 409);
    return c.json({ error: `Internal error (db insert): ${e.message}` }, 500);
  }

  if (c.env.RESEND_API_KEY) {
    const verifyToken = generateEmailToken();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await c.env.DB.prepare(
      'INSERT INTO email_verification_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)'
    ).bind(generateId(), userId, verifyToken, expires).run();
    const base = c.env.FRONTEND_URL || 'https://smart-fcra.pages.dev';
    const verifyUrl = `${base}/?verifyEmail=${verifyToken}`;
    try {
      await sendTransactionalEmail(c.env.RESEND_API_KEY, {
        to: email,
        subject: 'Verify your Smart FCRA account',
        html: `<p>Welcome to Smart FCRA Supreme.</p><p><a href="${verifyUrl}">Verify your email</a> to activate your account.</p>`,
      });
    } catch (e) {
      console.error('[REGISTER] verification email failed', e);
    }
    return c.json({
      requiresVerification: true,
      message: 'Account created. Check your email to verify before signing in.',
      user: { id: userId, name, email, role: 'admin', org_id: orgId },
      org: { id: orgId, name: orgName, plan: 'free' },
    });
  }

  const sessionToken = createSessionToken();
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const ip = c.req.header('CF-Connecting-IP') || 'unknown';
  const ua = c.req.header('User-Agent') || 'unknown';
  await c.env.DB.prepare('INSERT INTO sessions (id, user_id, org_id, expires_at, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)').bind(sessionToken, userId, orgId, expires, ip, ua).run();

  return c.json({ token: sessionToken, user: { id: userId, name, email, role: 'admin', org_id: orgId }, org: { id: orgId, name: orgName, plan: 'free' } });
});

app.post('/api/auth/login', async (c) => {
  const { email, password } = await c.req.json();
  if (!email || !password) return c.json({ error: 'Email and password required' }, 400);

  // Optional env-based platform bootstrap (NEVER hardcode credentials in source)
  const bootstrapEmail = (c.env.PLATFORM_BOOTSTRAP_EMAIL || '').toLowerCase().trim();
  const bootstrapPassword = c.env.PLATFORM_BOOTSTRAP_PASSWORD || '';
  const isBootstrap =
    !!bootstrapEmail &&
    !!bootstrapPassword &&
    email.toLowerCase().trim() === bootstrapEmail &&
    password === bootstrapPassword;

  let user: any = null;

  if (isBootstrap) {
    user = await c.env.DB.prepare(
      'SELECT u.*, o.name as org_name, o.plan as org_plan FROM users u JOIN organizations o ON u.org_id = o.id WHERE u.email = ?'
    ).bind(email).first() as any;

    if (!user) {
      const orgId = 'org_platform_master';
      const userId = 'usr_platform_master';
      const passwordHash = await hashPassword(password);
      await c.env.DB.prepare(
        'INSERT OR IGNORE INTO organizations (id, name, slug, plan, max_users, max_clients, max_reports_per_month) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).bind(orgId, 'RJ Business Solutions', 'rj-business-solutions', 'enterprise', 1000, 100000, 100000).run();
      await c.env.DB.prepare(
        'INSERT OR IGNORE INTO users (id, org_id, email, name, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)'
      ).bind(userId, orgId, email, 'Platform Owner', passwordHash, 'super_admin').run();
      user = await c.env.DB.prepare(
        'SELECT u.*, o.name as org_name, o.plan as org_plan FROM users u JOIN organizations o ON u.org_id = o.id WHERE u.email = ?'
      ).bind(email).first() as any;
    } else {
      await c.env.DB.prepare('UPDATE users SET role = "super_admin", is_active = 1 WHERE id = ?').bind(user.id).run();
      await c.env.DB.prepare('UPDATE organizations SET plan = "enterprise" WHERE id = ?').bind(user.org_id).run();
      user = await c.env.DB.prepare(
        'SELECT u.*, o.name as org_name, o.plan as org_plan FROM users u JOIN organizations o ON u.org_id = o.id WHERE u.email = ?'
      ).bind(email).first() as any;
    }
  } else {
    user = await c.env.DB.prepare(
      'SELECT u.*, o.name as org_name, o.plan as org_plan, o.settings as org_settings FROM users u JOIN organizations o ON u.org_id = o.id WHERE u.email = ? AND u.is_active = 1'
    ).bind(email).first() as any;
    if (!user) return c.json({ error: 'Invalid credentials' }, 401);

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) return c.json({ error: 'Invalid credentials' }, 401);

    if (needsPasswordRehash(user.password_hash)) {
      try {
        const upgraded = await hashPassword(password);
        await c.env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(upgraded, user.id).run();
      } catch (e) {
        console.warn('[LOGIN] password rehash failed', e);
      }
    }
  }

  // Org suspension gate
  try {
    const settings = typeof user.org_settings === 'string' ? JSON.parse(user.org_settings || '{}') : (user.org_settings || {});
    if (settings.suspended) return c.json({ error: 'Organization suspended. Contact support.' }, 403);
  } catch { /* ignore */ }

  if (user.mfa_enabled === 1) {
    const tempToken = createSessionToken();
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await c.env.DB.prepare(
      'INSERT INTO mfa_challenges (id, user_id, token, expires_at, consumed) VALUES (?, ?, ?, ?, 0)'
    ).bind(generateId(), user.id, tempToken, expires).run();
    return c.json({ mfaRequired: true, userId: user.id, tempToken });
  }

  const token = createSessionToken();
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const ip = c.req.header('CF-Connecting-IP') || 'unknown';
  const ua = c.req.header('User-Agent') || 'unknown';
  await c.env.DB.prepare('INSERT INTO sessions (id, user_id, org_id, expires_at, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)').bind(token, user.id, user.org_id, expires, ip, ua).run();
  await c.env.DB.prepare('UPDATE users SET last_login = datetime("now") WHERE id = ?').bind(user.id).run();

  return c.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, org_id: user.org_id },
    org: { id: user.org_id, name: user.org_name, plan: user.org_plan },
  });
});

app.post('/api/auth/mfa/challenge', async (c) => {
  const { userId, code, tempToken } = await c.req.json();
  if (!userId || !code || !tempToken) return c.json({ error: 'All fields required' }, 400);

  const challenge = await c.env.DB.prepare(
    'SELECT * FROM mfa_challenges WHERE token = ? AND user_id = ? AND consumed = 0 AND expires_at > datetime("now")'
  ).bind(tempToken, userId).first() as any;
  if (!challenge) return c.json({ error: 'Invalid or expired MFA challenge' }, 401);

  const user = await c.env.DB.prepare(
    'SELECT u.*, o.name as org_name, o.plan as org_plan FROM users u JOIN organizations o ON u.org_id = o.id WHERE u.id = ? AND u.is_active = 1'
  ).bind(userId).first() as any;
  if (!user) return c.json({ error: 'User not found' }, 404);

  const isValid = await verifyTOTP(user.mfa_secret, code);
  if (!isValid) return c.json({ error: 'Invalid 6-digit MFA code' }, 401);

  await c.env.DB.prepare('UPDATE mfa_challenges SET consumed = 1 WHERE id = ?').bind(challenge.id).run();

  const token = createSessionToken();
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const ip = c.req.header('CF-Connecting-IP') || 'unknown';
  const ua = c.req.header('User-Agent') || 'unknown';
  await c.env.DB.prepare('INSERT INTO sessions (id, user_id, org_id, expires_at, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)').bind(token, user.id, user.org_id, expires, ip, ua).run();
  await c.env.DB.prepare('UPDATE users SET last_login = datetime("now") WHERE id = ?').bind(user.id).run();

  return c.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, org_id: user.org_id },
    org: { id: user.org_id, name: user.org_name, plan: user.org_plan },
  });
});

app.post('/api/auth/mfa/setup', authMiddleware, async (c) => {
  const user = c.get('user');
  const mfaSecret = generateMFASecret();
  await c.env.DB.prepare('UPDATE users SET mfa_secret = ? WHERE id = ?').bind(mfaSecret, user.id).run();

  const issuer = 'SmartFCRA';
  const otpauthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(user.email)}?secret=${mfaSecret}&issuer=${encodeURIComponent(issuer)}`;

  return c.json({ secret: mfaSecret, otpauthUrl, issuer });
});

app.post('/api/auth/mfa/verify', authMiddleware, async (c) => {
  const user = c.get('user');
  const { code } = await c.req.json();
  if (!code) return c.json({ error: '6-digit code required' }, 400);

  const dbUser = await c.env.DB.prepare('SELECT mfa_secret FROM users WHERE id = ?').bind(user.id).first() as any;
  if (!dbUser || !dbUser.mfa_secret) return c.json({ error: 'MFA not set up yet' }, 400);

  const isValid = await verifyTOTP(dbUser.mfa_secret, code);
  if (!isValid) return c.json({ error: 'Invalid 6-digit MFA code' }, 401);

  await c.env.DB.prepare('UPDATE users SET mfa_enabled = 1 WHERE id = ?').bind(user.id).run();

  return c.json({ success: true, message: 'Multi-factor authentication enabled successfully' });
});

app.post('/api/auth/mfa/disable', authMiddleware, async (c) => {
  const user = c.get('user');
  const { code } = await c.req.json();
  if (!code) return c.json({ error: 'Code required to disable MFA' }, 400);

  const dbUser = await c.env.DB.prepare('SELECT mfa_secret, mfa_enabled FROM users WHERE id = ?').bind(user.id).first() as any;
  if (!dbUser || !dbUser.mfa_enabled) return c.json({ error: 'MFA is not enabled' }, 400);

  const isValid = await verifyTOTP(dbUser.mfa_secret, code);
  if (!isValid) return c.json({ error: 'Invalid 6-digit MFA code' }, 401);

  await c.env.DB.prepare('UPDATE users SET mfa_secret = NULL, mfa_enabled = 0 WHERE id = ?').bind(user.id).run();

  return c.json({ success: true, message: 'Multi-factor authentication disabled successfully' });
});

app.get('/api/auth/mfa/status', authMiddleware, async (c) => {
  const user = c.get('user');
  const dbUser = await c.env.DB.prepare('SELECT mfa_enabled FROM users WHERE id = ?').bind(user.id).first() as any;
  return c.json({ enabled: dbUser ? dbUser.mfa_enabled === 1 : false });
});

app.post('/api/auth/logout', authMiddleware, async (c) => {
  const session = c.get('session');
  await c.env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(session.id).run();
  return c.json({ ok: true });
});

app.get('/api/auth/me', authMiddleware, async (c) => {
  const user = c.get('user');
  const org = await c.env.DB.prepare('SELECT * FROM organizations WHERE id = ?').bind(user.org_id).first();
  return c.json({ user, org });
});

app.post('/api/auth/verify-email', async (c) => {
  const { token } = await c.req.json();
  if (!token) return c.json({ error: 'Token required' }, 400);

  const record = await c.env.DB.prepare(
    'SELECT * FROM email_verification_tokens WHERE token = ? AND expires_at > datetime("now")'
  ).bind(token).first() as any;
  if (!record) return c.json({ error: 'Invalid or expired token' }, 400);

  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE users SET is_active = 1 WHERE id = ?').bind(record.user_id),
    c.env.DB.prepare('DELETE FROM email_verification_tokens WHERE token = ?').bind(token),
  ]);

  return c.json({ ok: true, message: 'Email verified successfully' });
});

app.post('/api/auth/forgot-password', async (c) => {
  const { email } = await c.req.json();
  if (!email) return c.json({ error: 'Email required' }, 400);

  const user = await c.env.DB.prepare('SELECT id, email, name FROM users WHERE email = ?').bind(email).first() as any;
  // Always return the same message (no email enumeration)
  const okPayload = { ok: true, message: 'If the email exists, a reset link has been sent' };
  if (!user) return c.json(okPayload);

  const token = generateEmailToken();
  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  await c.env.DB.prepare(
    'INSERT INTO password_reset_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)'
  ).bind(generateId(), user.id, token, expires).run();

  const base = c.env.FRONTEND_URL || 'https://smart-fcra.pages.dev';
  const resetUrl = `${base}/?resetToken=${token}`;
  try {
    await sendTransactionalEmail(c.env.RESEND_API_KEY, {
      to: user.email,
      subject: 'Reset your Smart FCRA password',
      html: `<p>Hello ${user.name || ''},</p><p><a href="${resetUrl}">Reset your password</a>. This link expires in 1 hour.</p>`,
    });
  } catch (e) {
    console.error('[PASSWORD RESET] email failed', e);
  }

  // Only expose token in non-production for local QA
  if ((c.env.ENVIRONMENT || 'development') !== 'production') {
    return c.json({ ...okPayload, debugToken: token });
  }
  return c.json(okPayload);
});

app.post('/api/auth/reset-password', async (c) => {
  const { token, password } = await c.req.json();
  if (!token || !password) return c.json({ error: 'Token and new password required' }, 400);
  if (String(password).length < 8) return c.json({ error: 'Password must be at least 8 characters' }, 400);

  const record = await c.env.DB.prepare(
    'SELECT * FROM password_reset_tokens WHERE token = ? AND expires_at > datetime("now")'
  ).bind(token).first() as any;
  if (!record) return c.json({ error: 'Invalid or expired token' }, 400);

  const newHash = await hashPassword(password);
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(newHash, record.user_id),
    c.env.DB.prepare('DELETE FROM password_reset_tokens WHERE token = ?').bind(token),
    c.env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(record.user_id),
  ]);

  return c.json({ ok: true, message: 'Password reset successfully' });
});

// ═══════════════════════════════════════════════════════════════
// DASHBOARD STATS (enhanced)
// ═══════════════════════════════════════════════════════════════
app.get('/api/dashboard', authMiddleware, async (c) => {
  const user = c.get('user');
  const oid = user.org_id;

  const [clients, reports, violations, docs] = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) as count FROM clients WHERE org_id = ?').bind(oid).first(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM credit_reports WHERE org_id = ?').bind(oid).first(),
    c.env.DB.prepare('SELECT COUNT(*) as count, severity FROM violations WHERE org_id = ? GROUP BY severity').bind(oid).all(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM documents WHERE org_id = ?').bind(oid).first(),
  ]);

  const totalDamages = await c.env.DB.prepare('SELECT SUM(total_damages_min) as min_total, SUM(total_damages_max) as max_total FROM violations WHERE org_id = ?').bind(oid).first() as any;
  const recentActivity = await c.env.DB.prepare('SELECT * FROM activity_log WHERE org_id = ? ORDER BY created_at DESC LIMIT 10').bind(oid).all();
  const recentViolations = await c.env.DB.prepare('SELECT v.*, c.first_name, c.last_name FROM violations v JOIN clients c ON v.client_id = c.id WHERE v.org_id = ? ORDER BY v.created_at DESC LIMIT 5').bind(oid).all();
  const byCategory = await c.env.DB.prepare('SELECT category, COUNT(*) as count FROM violations WHERE org_id = ? GROUP BY category').bind(oid).all();

  const stats = {
    totalClients: (clients as any)?.count || 0,
    totalReports: (reports as any)?.count || 0,
    totalViolations: violations?.results?.reduce((s: number, r: any) => s + r.count, 0) || 0,
    violationsBySeverity: violations?.results || [],
    violationsByCategory: byCategory?.results || [],
    totalDocuments: (docs as any)?.count || 0,
    totalDamagesMin: totalDamages?.min_total || 0,
    totalDamagesMax: totalDamages?.max_total || 0,
  };

  return c.json({
    stats,
    ...stats,
    recentActivity: recentActivity?.results || [],
    recentViolations: recentViolations?.results || [],
  });
});

// ═══════════════════════════════════════════════════════════════
// CLIENT (CRM) ROUTES
// ═══════════════════════════════════════════════════════════════
app.get('/api/clients', authMiddleware, async (c) => {
  const user = c.get('user');
  const search = c.req.query('search') || '';
  const status = c.req.query('status') || '';
  
  let query = 'SELECT c.*, (SELECT COUNT(*) FROM credit_reports WHERE client_id = c.id) as report_count, (SELECT COUNT(*) FROM violations WHERE client_id = c.id) as violation_count, (SELECT SUM(total_damages_min) FROM violations WHERE client_id = c.id) as damages_min, (SELECT SUM(total_damages_max) FROM violations WHERE client_id = c.id) as damages_max FROM clients c WHERE c.org_id = ?';
  const params: any[] = [user.org_id];

  if (search) { query += ' AND (c.first_name LIKE ? OR c.last_name LIKE ? OR c.email LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  if (status) { query += ' AND c.status = ?'; params.push(status); }
  query += ' ORDER BY c.updated_at DESC';

  const result = await c.env.DB.prepare(query).bind(...params).all();
  return c.json({ clients: result?.results || [] });
});

app.post('/api/clients', authMiddleware, async (c) => {
  const user = c.get('user');
  const planCheck = await verifyOrgPlanLimits(c, 'client');
  if (!planCheck.allowed) return c.json({ error: planCheck.message }, 403);

  const data = await c.req.json();
  const id = generateId();

  // Support both {name} and {firstName, lastName} payloads
  let firstName = data.firstName || '';
  let lastName = data.lastName || '';
  if (!firstName && data.name) {
    const parts = data.name.trim().split(/\s+/);
    firstName = parts[0] || '';
    lastName = parts.slice(1).join(' ') || '';
  }
  if (!firstName) return c.json({ error: 'First name is required' }, 400);

  // Regulatory checkbox values (CROA, FCRA, and TSR)
  const permissiblePurposeConsent = data.permissiblePurposeConsent ? 1 : 0;
  const croaContractAgreed = data.croaContractAgreed ? 1 : 0;
  const tsrAdvanceFeeWaived = data.tsrAdvanceFeeWaived ? 1 : 0;
  const consentTimestamp = data.consentTimestamp || (permissiblePurposeConsent || croaContractAgreed || tsrAdvanceFeeWaived ? new Date().toISOString() : null);

  await c.env.DB.prepare(
    'INSERT INTO clients (id, org_id, created_by, first_name, last_name, email, phone, address_line1, address_line2, city, state, zip, dob, ssn_last4, notes, tags, permissible_purpose_consent, croa_contract_agreed, tsr_advance_fee_waived, consent_timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    id, user.org_id, user.id, firstName, lastName,
    data.email || null, data.phone || null, data.addressLine1 || null, data.addressLine2 || null,
    data.city || null, data.state || null, data.zip || null, data.dob || null, data.ssnLast4 || null,
    data.notes || null, JSON.stringify(data.tags || []),
    permissiblePurposeConsent, croaContractAgreed, tsrAdvanceFeeWaived, consentTimestamp
  ).run();

  await c.env.DB.prepare('INSERT INTO activity_log (id, org_id, client_id, user_id, action, description) VALUES (?, ?, ?, ?, ?, ?)').bind(generateId(), user.org_id, id, user.id, 'client_created', `Created client ${firstName} ${lastName}`).run();

  return c.json({ client: { id, firstName, lastName }, message: 'Client created' }, 201);
});

app.get('/api/clients/:id', authMiddleware, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const client = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ? AND org_id = ?').bind(id, user.org_id).first();
  if (!client) return c.json({ error: 'Not found' }, 404);

  const reports = await c.env.DB.prepare('SELECT * FROM credit_reports WHERE client_id = ? ORDER BY created_at DESC').bind(id).all();
  const violations = await c.env.DB.prepare('SELECT * FROM violations WHERE client_id = ? ORDER BY severity ASC, created_at DESC').bind(id).all();
  const documents = await c.env.DB.prepare('SELECT * FROM documents WHERE client_id = ? ORDER BY created_at DESC').bind(id).all();
  const activity = await c.env.DB.prepare('SELECT a.*, u.name as user_name FROM activity_log a JOIN users u ON a.user_id = u.id WHERE a.client_id = ? ORDER BY a.created_at DESC LIMIT 50').bind(id).all();

  // Transparently decrypt raw text and parsed structures
  const reportsResult = reports?.results || [];
  for (const r of reportsResult) {
    if (r.raw_text) r.raw_text = await decryptPII(c, r.raw_text);
    if (r.parsed_data) r.parsed_data = await decryptPII(c, r.parsed_data);
  }

  return c.json({ client, reports: reportsResult, violations: violations?.results || [], documents: documents?.results || [], activity: activity?.results || [] });
});

app.put('/api/clients/:id', authMiddleware, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const data = await c.req.json();

  const client = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ? AND org_id = ?').bind(id, user.org_id).first() as any;
  if (!client) return c.json({ error: 'Client not found' }, 404);

  const firstName = data.firstName !== undefined ? data.firstName : client.first_name;
  const lastName = data.lastName !== undefined ? data.lastName : client.last_name;
  const email = data.email !== undefined ? data.email : client.email;
  const phone = data.phone !== undefined ? data.phone : client.phone;
  const addressLine1 = data.addressLine1 !== undefined ? data.addressLine1 : client.address_line1;
  const city = data.city !== undefined ? data.city : client.city;
  const stateVal = data.state !== undefined ? data.state : client.state;
  const zip = data.zip !== undefined ? data.zip : client.zip;
  const notes = data.notes !== undefined ? data.notes : client.notes;
  const status = data.status !== undefined ? data.status : client.status;

  const dob = data.dob !== undefined ? data.dob : client.dob;
  const ssnLast4 = data.ssnLast4 !== undefined ? data.ssnLast4 : client.ssn_last4;
  const permissiblePurposeConsent = data.permissiblePurposeConsent !== undefined 
    ? (data.permissiblePurposeConsent ? 1 : 0) 
    : client.permissible_purpose_consent;
  const croaContractAgreed = data.croaContractAgreed !== undefined 
    ? (data.croaContractAgreed ? 1 : 0) 
    : client.croa_contract_agreed;
  const tsrAdvanceFeeWaived = data.tsrAdvanceFeeWaived !== undefined 
    ? (data.tsrAdvanceFeeWaived ? 1 : 0) 
    : client.tsr_advance_fee_waived;
  const consentTimestamp = data.consentTimestamp !== undefined 
    ? data.consentTimestamp 
    : (data.permissiblePurposeConsent || data.croaContractAgreed || data.tsrAdvanceFeeWaived ? new Date().toISOString() : client.consent_timestamp);

  // New admin case tracking fields
  const caseStatus = data.caseStatus !== undefined ? data.caseStatus : client.case_status;
  const lvsScore = data.lvsScore !== undefined ? data.lvsScore : client.lvs_score;
  const estimatedRecovery = data.estimatedRecovery !== undefined ? data.estimatedRecovery : client.estimated_recovery;
  const subscriptionPlan = data.subscriptionPlan !== undefined ? data.subscriptionPlan : client.subscription_plan;
  const subscriptionStatus = data.subscriptionStatus !== undefined ? data.subscriptionStatus : client.subscription_status;

  await c.env.DB.prepare(
    'UPDATE clients SET first_name=?, last_name=?, email=?, phone=?, address_line1=?, city=?, state=?, zip=?, dob=?, ssn_last4=?, notes=?, status=?, permissible_purpose_consent=?, croa_contract_agreed=?, tsr_advance_fee_waived=?, consent_timestamp=?, case_status=?, lvs_score=?, estimated_recovery=?, subscription_plan=?, subscription_status=?, updated_at=datetime("now") WHERE id=? AND org_id=?'
  ).bind(
    firstName, lastName, email, phone, addressLine1, city, stateVal, zip, dob, ssnLast4, notes, status || 'active',
    permissiblePurposeConsent, croaContractAgreed, tsrAdvanceFeeWaived, consentTimestamp,
    caseStatus || 'ONBOARDING', lvsScore || 0, estimatedRecovery || 0, subscriptionPlan || 'free', subscriptionStatus || 'inactive',
    id, user.org_id
  ).run();

  // If password is provided, dynamically create or update their client user account
  if (data.password && email) {
    const hash = await hashPassword(data.password);
    const existingUser = await c.env.DB.prepare('SELECT * FROM users WHERE email = ? AND org_id = ?').bind(email, user.org_id).first() as any;
    if (existingUser) {
      await c.env.DB.prepare('UPDATE users SET password_hash = ?, name = ?, updated_at = datetime("now") WHERE id = ?')
        .bind(hash, `${firstName} ${lastName}`, existingUser.id).run();
    } else {
      const userId = generateId();
      await c.env.DB.prepare('INSERT INTO users (id, org_id, email, name, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)')
        .bind(userId, user.org_id, email, `${firstName} ${lastName}`, hash, 'client').run();
    }
  }

  return c.json({ ok: true });
});

// ═══════════════════════════════════════════════════════════════
// CLIENT PORTAL & SELF-SERVICE ENDPOINTS
// ═══════════════════════════════════════════════════════════════
app.get('/api/client-portal/dashboard', authMiddleware, async (c) => {
  const user = c.get('user');
  const queryClientId = c.req.query('clientId');

  let client;
  if ((user.role === 'admin' || user.role === 'super_admin') && queryClientId) {
    client = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ? AND org_id = ?').bind(queryClientId, user.org_id).first() as any;
  } else {
    // Find the unique consumer client mapped to this user's email address
    client = await c.env.DB.prepare('SELECT * FROM clients WHERE email = ? AND org_id = ?').bind(user.email, user.org_id).first() as any;
  }

  if (!client) {
    return c.json({ error: 'Client profile not found. Onboarding may be incomplete.' }, 404);
  }

  const reports = await c.env.DB.prepare('SELECT id, bureau, report_date, file_name, created_at, status, total_accounts, total_collections, total_inquiries FROM credit_reports WHERE client_id = ? AND org_id = ? ORDER BY report_date DESC').bind(client.id, user.org_id).all();
  const violations = await c.env.DB.prepare('SELECT * FROM violations WHERE client_id = ? AND org_id = ? ORDER BY created_at DESC').bind(client.id, user.org_id).all();
  const documents = await c.env.DB.prepare('SELECT id, doc_type, title, status, created_at, signature_timestamp FROM documents WHERE client_id = ? AND org_id = ? ORDER BY created_at DESC').bind(client.id, user.org_id).all();
  const activity = await c.env.DB.prepare('SELECT * FROM activity_log WHERE client_id = ? AND org_id = ? ORDER BY created_at DESC LIMIT 30').bind(client.id, user.org_id).all();

  return c.json({
    client,
    reports: reports?.results || [],
    violations: violations?.results || [],
    documents: documents?.results || [],
    activity: activity?.results || []
  });
});

app.post('/api/documents/:id/sign', authMiddleware, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const { signatureData } = await c.req.json();
  if (!signatureData) return c.json({ error: 'Signature data is required' }, 400);

  // If role is client, enforce zero-trust ownership match on documents
  if (user.role === 'client') {
    const client = await c.env.DB.prepare('SELECT * FROM clients WHERE email = ? AND org_id = ?').bind(user.email, user.org_id).first() as any;
    if (!client) return c.json({ error: 'Client profile not found' }, 404);

    const doc = await c.env.DB.prepare('SELECT * FROM documents WHERE id = ? AND client_id = ? AND org_id = ?').bind(id, client.id, user.org_id).first();
    if (!doc) return c.json({ error: 'Document not found or unauthorized' }, 403);
  } else {
    const doc = await c.env.DB.prepare('SELECT * FROM documents WHERE id = ? AND org_id = ?').bind(id, user.org_id).first();
    if (!doc) return c.json({ error: 'Document not found' }, 404);
  }

  const ip = c.req.header('CF-Connecting-IP') || '127.0.0.1';
  const timestamp = new Date().toISOString();

  await c.env.DB.prepare(
    'UPDATE documents SET status = "signed", signature_data = ?, signature_ip = ?, signature_timestamp = ?, updated_at = datetime("now") WHERE id = ? AND org_id = ?'
  ).bind(signatureData, ip, timestamp, id, user.org_id).run();

  return c.json({ ok: true, timestamp, ip });
});

// ═══════════════════════════════════════════════════════════════
// ADMINISTRATIVE CRM & LITIGATION PIPELINE ENDPOINTS
// ═══════════════════════════════════════════════════════════════
app.get('/api/admin/overview-stats', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role === 'client') return c.json({ error: 'Unauthorized administrative action' }, 403);

  // Core metrics
  const totalClients = await c.env.DB.prepare('SELECT COUNT(*) as val FROM clients WHERE org_id = ?').bind(user.org_id).first() as any;
  const activeLit = await c.env.DB.prepare('SELECT COUNT(*) as val FROM clients WHERE org_id = ? AND case_status IN ("LITIGATION", "FILED", "DISCOVERY", "NEGOTIATIONS")').bind(user.org_id).first() as any;
  const pendingQA = await c.env.DB.prepare('SELECT COUNT(*) as val FROM violations WHERE org_id = ? AND status = "pending_qa"').bind(user.org_id).first() as any;
  const totalRecovery = await c.env.DB.prepare('SELECT SUM(estimated_recovery) as val FROM clients WHERE org_id = ?').bind(user.org_id).first() as any;

  // Breakdown metrics
  const onboardingCount = await c.env.DB.prepare('SELECT COUNT(*) as val FROM clients WHERE org_id = ? AND case_status = "ONBOARDING"').bind(user.org_id).first() as any;
  const disputingCount = await c.env.DB.prepare('SELECT COUNT(*) as val FROM clients WHERE org_id = ? AND case_status = "DISPUTING"').bind(user.org_id).first() as any;
  const settledCount = await c.env.DB.prepare('SELECT COUNT(*) as val FROM clients WHERE org_id = ? AND case_status = "SETTLED"').bind(user.org_id).first() as any;

  // Monthly revenue analytics series (6-month period)
  const monthlyRevenues = [
    { label: 'Jan', value: 14200 },
    { label: 'Feb', value: 18500 },
    { label: 'Mar', value: 21400 },
    { label: 'Apr', value: 25900 },
    { label: 'May', value: 29800 },
    { label: 'Jun', value: 36500 }
  ];

  // Litigation outcomes ratios
  const outcomes = [
    { name: 'Settled Out of Court', value: 65, color: '#0A66FF' },
    { name: 'Won in Court', value: 22, color: '#10B981' },
    { name: 'Dismissed', value: 8, color: '#EF4444' },
    { name: 'Pending Trial', value: 5, color: '#F59E0B' }
  ];

  // Urgent action items board
  const urgentItems: any[] = [];
  
  // 1. Missing compliance disclosures
  const missingConsents = await c.env.DB.prepare('SELECT id, first_name, last_name, created_at FROM clients WHERE org_id = ? AND (permissible_purpose_consent = 0 OR croa_contract_agreed = 0 OR tsr_advance_fee_waived = 0) LIMIT 5').bind(user.org_id).all();
  if (missingConsents?.results) {
    for (const mc of missingConsents.results as any[]) {
      urgentItems.push({
        id: generateId(),
        type: 'missing_consent',
        title: 'Missing Compliance Consent',
        description: `Client ${mc.first_name} ${mc.last_name} has not signed essential regulatory disclosures.`,
        targetId: mc.id,
        date: mc.created_at
      });
    }
  }

  // 2. Draft letters pending pad review
  const draftDocs = await c.env.DB.prepare('SELECT id, title, created_at FROM documents WHERE org_id = ? AND status = "draft" LIMIT 5').bind(user.org_id).all();
  if (draftDocs?.results) {
    for (const dd of draftDocs.results as any[]) {
      urgentItems.push({
        id: generateId(),
        type: 'draft_document',
        title: 'Document Draft Pending Approval',
        description: `Dispute letter draft "${dd.title}" is ready for operator signature pad review.`,
        targetId: dd.id,
        date: dd.created_at
      });
    }
  }

  // 3. Violations waiting for administrative QA sign-off
  const qaViolations = await c.env.DB.prepare('SELECT v.id, v.account_name, v.subcategory, c.first_name, c.last_name, v.created_at FROM violations v JOIN clients c ON v.client_id = c.id WHERE v.org_id = ? AND v.status = "pending_qa" LIMIT 5').bind(user.org_id).all();
  if (qaViolations?.results) {
    for (const qv of qaViolations.results as any[]) {
      urgentItems.push({
        id: generateId(),
        type: 'pending_qa',
        title: 'FCRA Violation Pending QA',
        description: `Review potential ${qv.subcategory || qv.category || 'FCRA'} violation on ${qv.account_name} for client ${qv.first_name} ${qv.last_name}.`,
        targetId: qv.id,
        date: qv.created_at
      });
    }
  }

  return c.json({
    stats: {
      totalClients: totalClients?.val || 0,
      activeLitigation: activeLit?.val || 0,
      pendingQA: pendingQA?.val || 0,
      totalRecovery: totalRecovery?.val || 0.0,
      onboardingCount: onboardingCount?.val || 0,
      disputingCount: disputingCount?.val || 0,
      settledCount: settledCount?.val || 0
    },
    monthlyRevenues,
    outcomes,
    urgentItems
  });
});

app.post('/api/admin/violations/:id/review', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role === 'client') return c.json({ error: 'Unauthorized administrative action' }, 403);

  const id = c.req.param('id');
  const { action } = await c.req.json(); // 'approve' or 'reject'
  if (!action) return c.json({ error: 'Action required' }, 400);

  const status = action === 'approve' ? 'approved' : 'false_positive';

  const violation = await c.env.DB.prepare('SELECT * FROM violations WHERE id = ? AND org_id = ?').bind(id, user.org_id).first() as any;
  if (!violation) return c.json({ error: 'Violation not found' }, 404);

  await c.env.DB.prepare(
    'UPDATE violations SET status = ?, updated_at = datetime("now") WHERE id = ? AND org_id = ?'
  ).bind(status, id, user.org_id).run();

  // Log to Activity Ledger
  await c.env.DB.prepare(
    'INSERT INTO activity_log (id, org_id, client_id, user_id, action, description) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(
    generateId(),
    user.org_id,
    violation.client_id,
    user.id,
    'violation_reviewed',
    `FCRA Violation on account ${violation.account_name} (${violation.subcategory || violation.category || 'FCRA'}) review marked as ${status} by operator ${user.name}`
  ).run();

  return c.json({ ok: true, status });
});

// ═══════════════════════════════════════════════════════════════
// CREDIT REPORT UPLOAD & FULL-PROCESS ANALYSIS
// ═══════════════════════════════════════════════════════════════
app.post('/api/reports/upload', authMiddleware, async (c) => {
  const user = c.get('user');
  const planCheck = await verifyOrgPlanLimits(c, 'report');
  if (!planCheck.allowed) return c.json({ error: planCheck.message }, 403);

  const body = await c.req.json();
  const { clientId, bureau, rawText, fileName } = body;

  if (!clientId || !rawText) return c.json({ error: 'Client ID and report text required' }, 400);

  // Compliance Consent Check
  const client = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ? AND org_id = ?').bind(clientId, user.org_id).first() as any;
  if (!client) return c.json({ error: 'Client not found' }, 404);
  if (!client.permissible_purpose_consent || !client.croa_contract_agreed || !client.tsr_advance_fee_waived) {
    return c.json({ 
      error: 'Regulatory Compliance Consent Required', 
      complianceRequired: true,
      message: 'This client profile is missing signed regulatory compliance consents for permissible purpose (FCRA), CROA contract, and TSR advance fee waiver. Report ingestion is disabled until these consents are logged.' 
    }, 403);
  }

  const reportId = generateId();

  // Parse the report
  const parsed = parseCreditReportText(rawText);
  
  // Back-populate parsed client personal information to database if currently empty
  await backpopulateClientInfo(c, clientId, parsed.personalInfo, user.org_id);
  
  // Detect violations
  const violations = detectViolations(parsed);
  const litScore = calculateLitigationScore(violations);

  // Field-level AES-GCM Encryptions
  const encryptedRawText = await encryptPII(c, rawText);
  const encryptedParsedData = await encryptPII(c, JSON.stringify(parsed));

  // Save report
  await c.env.DB.prepare(
    'INSERT INTO credit_reports (id, org_id, client_id, uploaded_by, bureau, report_date, file_name, raw_text, parsed_data, status, total_accounts, total_inquiries, total_public_records, total_collections, analysis_started_at, analysis_completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))'
  ).bind(reportId, user.org_id, clientId, user.id, parsed.bureau || bureau || 'Unknown', parsed.reportDate, fileName || 'upload.txt', encryptedRawText, encryptedParsedData, 'analyzed', parsed.accounts.length, parsed.inquiries.length, parsed.publicRecords.length, parsed.collections.length).run();

  // Save violations in batch
  for (const v of violations) {
    await c.env.DB.prepare(
      'INSERT INTO violations (id, org_id, report_id, client_id, category, subcategory, severity, statute, statute_text, legal_standard, evidence, explanation, case_law, account_name, account_number, dofd, falloff_date, days_overdue, statutory_damages_min, statutory_damages_max, actual_damages_est, punitive_damages_est, attorney_fees_est, total_damages_min, total_damages_max, defendant_type, defendant_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(v.id, user.org_id, reportId, clientId, v.category, v.subcategory, v.severity, v.statute, v.statuteText, v.legalStandard, v.evidence, v.explanation, v.caseLaw, v.accountName || null, v.accountNumber || null, v.dofd || null, v.falloffDate || null, v.daysOverdue || null, v.statutoryDamagesMin, v.statutoryDamagesMax, v.actualDamagesEst, v.punitiveDamagesEst, v.attorneyFeesEst, v.totalDamagesMin, v.totalDamagesMax, v.defendantType, v.defendantName).run();
  }

  await c.env.DB.prepare('INSERT INTO activity_log (id, org_id, client_id, report_id, user_id, action, description, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(generateId(), user.org_id, clientId, reportId, user.id, 'report_analyzed', `Analyzed credit report: ${violations.length} violations found`, JSON.stringify({ score: litScore.score })).run();

  return c.json({
    reportId,
    bureau: parsed.bureau,
    reportDate: parsed.reportDate,
    personalInfo: parsed.personalInfo,
    totalAccounts: parsed.accounts.length,
    totalCollections: parsed.collections.length,
    totalInquiries: parsed.inquiries.length,
    totalPublicRecords: parsed.publicRecords.length,
    violationsFound: violations.length,
    violations,
    litigationScore: litScore,
  });
});

// ═══════════════════════════════════════════════════════════════
// SMART CLIENT AUTOPILOT ONBOARDING ENDPOINT
// ═══════════════════════════════════════════════════════════════
app.post('/api/reports/onboard', authMiddleware, async (c) => {
  const user = c.get('user');
  const clientCheck = await verifyOrgPlanLimits(c, 'client');
  if (!clientCheck.allowed) return c.json({ error: clientCheck.message }, 403);
  const reportCheck = await verifyOrgPlanLimits(c, 'report');
  if (!reportCheck.allowed) return c.json({ error: reportCheck.message }, 403);

  const body = await c.req.json();
  const { rawText, fileName, bureau, clientId: bodyClientId } = body;

  if (!rawText) return c.json({ error: 'Report text required for onboarding' }, 400);

  // 1. Parse credit report text
  const parsed = parseCreditReportText(rawText);

  // 2. Extract demographics
  const personal = parsed.personalInfo || { names: [], addresses: [], employers: [], ssns: [], dobs: [] };
  const rawName = personal.names && personal.names[0] ? personal.names[0].trim() : 'Unknown Client';
  
  // Title Case conversion helper
  const toTitleCase = (str: string) => {
    return str.toLowerCase()
      .replace(/(?:^|\s|-|')\S/g, (m) => m.toUpperCase())
      .replace(/\b(Mc)([a-z])/g, (_, p1, p2) => p1 + p2.toUpperCase());
  };

  let firstName = '';
  let lastName = '';
  if (rawName) {
    if (rawName.includes(',')) {
      const parts = rawName.split(',');
      lastName = toTitleCase(parts[0].trim());
      firstName = toTitleCase(parts.slice(1).join(',').trim());
    } else {
      const parts = rawName.split(/\s+/);
      firstName = toTitleCase(parts[0] || '');
      lastName = toTitleCase(parts.slice(1).join(' ') || 'Client');
    }
  }

  // DOB
  const dob = personal.dobs && personal.dobs[0] ? personal.dobs[0].trim() : null;

  // SSN Last 4
  let ssnLast4: string | null = null;
  const rawSsn = personal.ssns && personal.ssns[0] ? personal.ssns[0].trim() : null;
  if (rawSsn) {
    const match = rawSsn.match(/\d{4}$/);
    if (match) {
      ssnLast4 = match[0];
    } else {
      const digits = rawSsn.replace(/\D/g, '');
      if (digits.length >= 4) {
        ssnLast4 = digits.slice(-4);
      } else if (digits.length > 0) {
        ssnLast4 = digits;
      }
    }
  }

  // Parse Address
  let addressLine1: string | null = null;
  let city: string | null = null;
  let state: string | null = null;
  let zip: string | null = null;
  const rawAddr = personal.addresses && personal.addresses[0] ? personal.addresses[0].trim() : null;

  if (rawAddr) {
    const parts = rawAddr.split(',').map(p => p.trim());
    if (parts.length >= 3) {
      addressLine1 = parts[0];
      if (parts.length === 4) {
        addressLine1 = `${parts[0]}, ${parts[1]}`;
        city = parts[2];
        const stateZip = parts[3].split(/\s+/);
        state = stateZip[0] || null;
        zip = stateZip[1] || null;
      } else {
        city = parts[1];
        const stateZip = parts[2].split(/\s+/);
        state = stateZip[0] || null;
        zip = stateZip[1] || null;
      }
    } else {
      const zipMatch = rawAddr.match(/\b\d{5}(?:-\d{4})?\b$/);
      if (zipMatch) {
        zip = zipMatch[0];
        const rest = rawAddr.substring(0, rawAddr.length - zip.length).trim();
        const stateMatch = rest.match(/\b([A-Z]{2})\b$/);
        if (stateMatch) {
          state = stateMatch[1];
          const rest2 = rest.substring(0, rest.length - state.length).trim().replace(/,$/, '').trim();
          const cityParts = rest2.split(/\s+/);
          if (cityParts.length > 1) {
            city = cityParts[cityParts.length - 1];
            addressLine1 = cityParts.slice(0, -1).join(' ');
          } else {
            addressLine1 = rest2;
          }
        } else {
          addressLine1 = rest;
        }
      } else {
        addressLine1 = rawAddr;
      }
    }
  }

  // Ensure state is capitalized if parsed
  if (state) state = state.toUpperCase();

  // Autopilot Contact Information Extraction
  let extractedEmail: string | null = null;
  let extractedPhone: string | null = null;

  // Regex scan for email addresses in the raw report text
  const emailMatch = rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) {
    extractedEmail = emailMatch[0].trim();
  } else {
    // Generate a fallback clean email
    extractedEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${generateId().slice(0, 5)}@smart-fcra.com`;
  }

  // Regex scan for phone numbers in the raw report text
  const phoneMatch = rawText.match(/(?:\+?1[-.●\s]?)?\(?([2-9]\d{2})\)?[-.●\s]?(\d{3})[-.●\s]?(\d{4})/);
  if (phoneMatch) {
    extractedPhone = phoneMatch[0].trim();
  }

  // 3. Match / Deduplicate Client in D1
  let clientId = '';
  let isNewClient = false;

  if (bodyClientId) {
    const existingClient = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ? AND org_id = ?').bind(bodyClientId, user.org_id).first() as any;
    if (existingClient) {
      clientId = existingClient.id;
      // Also update fields if empty
      const updates: string[] = [];
      const binds: any[] = [];
      if (!existingClient.dob && dob) { updates.push('dob = ?'); binds.push(dob); }
      if (!existingClient.ssn_last4 && ssnLast4) { updates.push('ssn_last4 = ?'); binds.push(ssnLast4); }
      if (!existingClient.address_line1 && addressLine1) { updates.push('address_line1 = ?'); binds.push(addressLine1); }
      if (!existingClient.city && city) { updates.push('city = ?'); binds.push(city); }
      if (!existingClient.state && state) { updates.push('state = ?'); binds.push(state); }
      if (!existingClient.zip && zip) { updates.push('zip = ?'); binds.push(zip); }
      if (!existingClient.email && extractedEmail) { updates.push('email = ?'); binds.push(extractedEmail); }
      if (!existingClient.phone && extractedPhone) { updates.push('phone = ?'); binds.push(extractedPhone); }

      // Consents must be explicitly attested — never auto-stamp silent compliance flags
      if (body.permissiblePurposeConsent === true && (!existingClient.permissible_purpose_consent || existingClient.permissible_purpose_consent === 0)) {
        updates.push('permissible_purpose_consent = 1');
      }
      if (body.croaContractAgreed === true && (!existingClient.croa_contract_agreed || existingClient.croa_contract_agreed === 0)) {
        updates.push('croa_contract_agreed = 1');
      }
      if (body.tsrAdvanceFeeWaived === true && (!existingClient.tsr_advance_fee_waived || existingClient.tsr_advance_fee_waived === 0)) {
        updates.push('tsr_advance_fee_waived = 1');
      }
      if ((body.permissiblePurposeConsent || body.croaContractAgreed || body.tsrAdvanceFeeWaived) && !existingClient.consent_timestamp) {
        updates.push('consent_timestamp = ?');
        binds.push(new Date().toISOString());
      }

      if (updates.length > 0) {
        const sql = `UPDATE clients SET ${updates.join(', ')} WHERE id = ?`;
        binds.push(existingClient.id);
        await c.env.DB.prepare(sql).bind(...binds).run();
      }
    }
  }

  if (!clientId) {
    // Run the duplicate matching logic
    // Simple Levenshtein Distance helper
    const getLevenshteinDistance = (a: string, b: string): number => {
      const matrix: number[][] = [];
      for (let i = 0; i <= a.length; i++) matrix[i] = [i];
      for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
      for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
          matrix[i][j] = Math.min(
            matrix[i - 1][j] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
          );
        }
      }
      return matrix[a.length][b.length];
    };

    const allClientsQuery = await c.env.DB.prepare(
      'SELECT * FROM clients WHERE org_id = ?'
    ).bind(user.org_id).all();
    const allClients = allClientsQuery?.results || [];

    let bestMatch: any = null;
    let highestConfidence = 0;

    for (const cl of allClients) {
      let confidence = 0;
      const dbFirst = (cl.first_name || '').toLowerCase().trim();
      const dbLast = (cl.last_name || '').toLowerCase().trim();
      const parsedFirst = firstName.toLowerCase().trim();
      const parsedLast = lastName.toLowerCase().trim();

      // Check exact SSN match
      const ssnMatch = ssnLast4 && cl.ssn_last4 && cl.ssn_last4 === ssnLast4;
      // Check exact DOB match
      const dobMatch = dob && cl.dob && cl.dob === dob;
      // Check exact Zip match
      const zipMatch = zip && cl.zip && cl.zip === zip;

      const firstLev = getLevenshteinDistance(dbFirst, parsedFirst);
      const lastLev = getLevenshteinDistance(dbLast, parsedLast);

      const firstSimilar = firstLev <= 3 || dbFirst.startsWith(parsedFirst.substring(0, 3)) || parsedFirst.startsWith(dbFirst.substring(0, 3));
      const lastSimilar = lastLev <= 3 || dbLast.includes(parsedLast) || parsedLast.includes(dbLast);

      // Detect explicit conflicts
      const ssnConflict = ssnLast4 && cl.ssn_last4 && cl.ssn_last4 !== ssnLast4;
      const dobConflict = dob && cl.dob && cl.dob !== dob;

      if (ssnConflict || dobConflict) {
        confidence = -100; // Hard rejection on mismatching identifiers
      } else {
        if (ssnMatch) confidence += 70;
        if (dobMatch) confidence += 40;
        if (zipMatch) confidence += 20;

        if (dbFirst === parsedFirst && dbLast === parsedLast) {
          confidence += 50;
        } else if (firstSimilar && lastSimilar) {
          confidence += 45; // Increased to bypass the 40 threshold gate
        } else if (lastSimilar) {
          confidence += 15;
        } else if (firstSimilar) {
          confidence += 10;
        }
      }

      if (confidence > highestConfidence) {
        highestConfidence = confidence;
        bestMatch = cl;
      }
    }

    if (bestMatch && highestConfidence >= 40) {
      clientId = bestMatch.id;
      
      // Dynamically merge/update missing profile fields on the existing client
      const updates: string[] = [];
      const binds: any[] = [];

      if (!bestMatch.dob && dob) { updates.push('dob = ?'); binds.push(dob); }
      if (!bestMatch.ssn_last4 && ssnLast4) { updates.push('ssn_last4 = ?'); binds.push(ssnLast4); }
      if (!bestMatch.address_line1 && addressLine1) { updates.push('address_line1 = ?'); binds.push(addressLine1); }
      if (!bestMatch.city && city) { updates.push('city = ?'); binds.push(city); }
      if (!bestMatch.state && state) { updates.push('state = ?'); binds.push(state); }
      if (!bestMatch.zip && zip) { updates.push('zip = ?'); binds.push(zip); }
      if (!bestMatch.email && extractedEmail) { updates.push('email = ?'); binds.push(extractedEmail); }
      if (!bestMatch.phone && extractedPhone) { updates.push('phone = ?'); binds.push(extractedPhone); }

      // Consents require explicit operator attestation from the onboarding wizard
      if (body.permissiblePurposeConsent === true && (!bestMatch.permissible_purpose_consent || bestMatch.permissible_purpose_consent === 0)) {
        updates.push('permissible_purpose_consent = 1');
      }
      if (body.croaContractAgreed === true && (!bestMatch.croa_contract_agreed || bestMatch.croa_contract_agreed === 0)) {
        updates.push('croa_contract_agreed = 1');
      }
      if (body.tsrAdvanceFeeWaived === true && (!bestMatch.tsr_advance_fee_waived || bestMatch.tsr_advance_fee_waived === 0)) {
        updates.push('tsr_advance_fee_waived = 1');
      }
      if ((body.permissiblePurposeConsent || body.croaContractAgreed || body.tsrAdvanceFeeWaived) && !bestMatch.consent_timestamp) {
        updates.push('consent_timestamp = ?');
        binds.push(new Date().toISOString());
      }

      if (updates.length > 0) {
        const sql = `UPDATE clients SET ${updates.join(', ')} WHERE id = ?`;
        binds.push(bestMatch.id);
        await c.env.DB.prepare(sql).bind(...binds).run();
      }
    } else {
      clientId = generateId();
      isNewClient = true;
    }
  }

  // 4. Create new client profile if not matched
  if (isNewClient) {
    const pp = body.permissiblePurposeConsent === true ? 1 : 0;
    const croa = body.croaContractAgreed === true ? 1 : 0;
    const tsr = body.tsrAdvanceFeeWaived === true ? 1 : 0;
    if (!pp || !croa || !tsr) {
      return c.json({
        error: 'Regulatory Compliance Consent Required',
        complianceRequired: true,
        message: 'Onboarding requires explicit FCRA permissible purpose, CROA contract, and TSR advance-fee waiver attestation before creating a client file.',
      }, 403);
    }
    await c.env.DB.prepare(
      'INSERT INTO clients (id, org_id, created_by, first_name, last_name, email, phone, address_line1, address_line2, city, state, zip, dob, ssn_last4, status, notes, tags, permissible_purpose_consent, croa_contract_agreed, tsr_advance_fee_waived, consent_timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      clientId,
      user.org_id,
      user.id,
      firstName,
      lastName,
      extractedEmail,
      extractedPhone,
      addressLine1,
      null,
      city,
      state,
      zip,
      dob,
      ssnLast4,
      'active',
      'Automatically created via Smart Client Autopilot',
      '[]',
      pp,
      croa,
      tsr,
      new Date().toISOString()
    ).run();

    await c.env.DB.prepare(
      'INSERT INTO activity_log (id, org_id, client_id, user_id, action, description) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(
      generateId(),
      user.org_id,
      clientId,
      user.id,
      'client_created',
      `Automatically created client profile for ${firstName} ${lastName} via Smart Client Autopilot`
    ).run();
  } else {
    // Existing client: require consents on file (or freshly attested in this request)
    const existing = await c.env.DB.prepare(
      'SELECT permissible_purpose_consent, croa_contract_agreed, tsr_advance_fee_waived FROM clients WHERE id = ? AND org_id = ?'
    ).bind(clientId, user.org_id).first() as any;
    const ppOk = existing?.permissible_purpose_consent === 1 || body.permissiblePurposeConsent === true;
    const croaOk = existing?.croa_contract_agreed === 1 || body.croaContractAgreed === true;
    const tsrOk = existing?.tsr_advance_fee_waived === 1 || body.tsrAdvanceFeeWaived === true;
    if (!ppOk || !croaOk || !tsrOk) {
      return c.json({
        error: 'Regulatory Compliance Consent Required',
        complianceRequired: true,
        message: 'Matched client is missing FCRA/CROA/TSR consents. Attest all three checkboxes before continuing.',
      }, 403);
    }
  }

  // 5. Generate secure client login credentials autonomously
  const generatedPassword = `SmartPass-${Math.random().toString(36).substring(2, 10).toUpperCase()}!`;
  const passwordHash = await hashPassword(generatedPassword);

  const existingUser = await c.env.DB.prepare('SELECT id FROM users WHERE email = ? AND org_id = ?').bind(extractedEmail, user.org_id).first() as any;
  if (!existingUser) {
    const userId = generateId();
    await c.env.DB.prepare('INSERT INTO users (id, org_id, email, name, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?, "client", 1)')
      .bind(userId, user.org_id, extractedEmail, `${firstName} ${lastName}`, passwordHash).run();
  } else {
    await c.env.DB.prepare('UPDATE users SET password_hash = ?, name = ? WHERE id = ?')
      .bind(passwordHash, `${firstName} ${lastName}`, existingUser.id).run();
  }

  // Send the Autopilot Credentials Welcome Email
  let emailStatus = 'simulated';
  const mailSubject = "SmartFCRA™ Supreme — Secure Client Portal Credentials";
  const mailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e8ed; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <img src="https://storage.googleapis.com/msgsndr/qQnxRHDtyx0uydPd5sRl/media/67eb83c5e519ed689430646b.jpeg" alt="RJ Business Solutions Logo" style="width: 140px; height: auto; border-radius: 8px;">
      </div>
      <h2 style="color: #0A66FF; text-align: center; margin-bottom: 8px;">Welcome to Your Credit Litigation Cockpit</h2>
      <p style="font-size: 14px; color: #4b5563; text-align: center; margin-bottom: 24px;">RJ Business Solutions has automatically established your secure dispute portal.</p>
      
      <div style="background-color: #f8fbff; border: 1px solid #eaf3ff; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <h3 style="margin-top: 0; color: #003B8F; font-size: 14px; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px;">Portal Access Coordinates</h3>
        <p style="font-size: 13px; margin: 8px 0; color: #374151;"><strong>Client Profile:</strong> ${firstName} ${lastName}</p>
        <p style="font-size: 13px; margin: 8px 0; color: #374151;"><strong>Secure Portal Link:</strong> <a href="https://5f51817c.smart-fcra.pages.dev" style="color: #0A66FF; font-weight: bold; text-decoration: none;">smart-fcra.pages.dev</a></p>
        <p style="font-size: 13px; margin: 8px 0; color: #374151;"><strong>Username / Email:</strong> <span style="font-family: monospace; background-color: #f3f4f6; padding: 2px 6px; border-radius: 4px;">${extractedEmail}</span></p>
        <p style="font-size: 13px; margin: 8px 0; color: #374151;"><strong>Generated Password:</strong> <span style="font-family: monospace; background-color: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-weight: bold; color: #0A66FF;">${generatedPassword}</span></p>
      </div>
      
      <p style="font-size: 12px; color: #9ca3af; line-height: 1.5; margin-bottom: 24px;">
        <strong>Security Notice:</strong> This is an automatically generated temporary password. You can update your password at any time within your portal's security settings. Please secure this email and do not share your credentials.
      </p>
      
      <hr style="border: 0; border-top: 1px solid #f3f4f6; margin-bottom: 16px;">
      <div style="text-align: center; font-size: 11px; color: #9ca3af;">
        <p style="margin: 4px 0;"><strong>RJ Business Solutions</strong></p>
        <p style="margin: 4px 0;">1342 NM 333, Tijeras, New Mexico 87059</p>
        <p style="margin: 4px 0;">support@rjbusinesssolutions.org | +1 (414) 430-4277</p>
      </div>
    </div>
  `;

  if (c.env.RESEND_API_KEY) {
    try {
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${c.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
         },
         body: JSON.stringify({
           from: 'SmartFCRA™ Supreme <notifications@rjbusinesssolutions.org>',
           to: extractedEmail,
           subject: mailSubject,
           html: mailHtml
         })
      });
      if (resendResponse.ok) {
        emailStatus = 'sent';
      }
    } catch (e: any) {
      console.error('[ONBOARD_EMAIL] Resend error:', e.message);
    }
  }

  // Log dispatch action to activity table
  await c.env.DB.prepare(
    'INSERT INTO activity_log (id, org_id, client_id, user_id, action, description, metadata) VALUES (?, ?, ?, ?, "credentials_sent", ?, ?)'
  ).bind(
    generateId(),
    user.org_id,
    clientId,
    user.id,
    `Auto-generated credentials welcome email sent to ${extractedEmail} (${emailStatus})`,
    JSON.stringify({ email: extractedEmail, status: emailStatus, credentialsDispatched: true })
  ).run();

  // 6. Detect violations and calculate score
  const violations = detectViolations(parsed);
  const litScore = calculateLitigationScore(violations);
  const reportId = generateId();

  // 7. Save report with Field-Level AES-GCM Encryptions
  const encryptedRawText = await encryptPII(c, rawText);
  const encryptedParsedData = await encryptPII(c, JSON.stringify(parsed));

  await c.env.DB.prepare(
    'INSERT INTO credit_reports (id, org_id, client_id, uploaded_by, bureau, report_date, file_name, raw_text, parsed_data, status, total_accounts, total_inquiries, total_public_records, total_collections, analysis_started_at, analysis_completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))'
  ).bind(
    reportId,
    user.org_id,
    clientId,
    user.id,
    parsed.bureau || bureau || 'Unknown',
    parsed.reportDate,
    fileName || 'upload.txt',
    encryptedRawText,
    encryptedParsedData,
    'analyzed',
    parsed.accounts.length,
    parsed.inquiries.length,
    parsed.publicRecords.length,
    parsed.collections.length
  ).run();

  // 8. Save violations in batch
  for (const v of violations) {
    await c.env.DB.prepare(
      'INSERT INTO violations (id, org_id, report_id, client_id, category, subcategory, severity, statute, statute_text, legal_standard, evidence, explanation, case_law, account_name, account_number, dofd, falloff_date, days_overdue, statutory_damages_min, statutory_damages_max, actual_damages_est, punitive_damages_est, attorney_fees_est, total_damages_min, total_damages_max, defendant_type, defendant_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      v.id,
      user.org_id,
      reportId,
      clientId,
      v.category,
      v.subcategory,
      v.severity,
      v.statute,
      v.statuteText,
      v.legalStandard,
      v.evidence,
      v.explanation,
      v.caseLaw,
      v.accountName || null,
      v.accountNumber || null,
      v.dofd || null,
      v.falloffDate || null,
      v.daysOverdue || null,
      v.statutoryDamagesMin,
      v.statutoryDamagesMax,
      v.actualDamagesEst,
      v.punitiveDamagesEst,
      v.attorneyFeesEst,
      v.totalDamagesMin,
      v.totalDamagesMax,
      v.defendantType,
      v.defendantName
    ).run();
  }

  // 9. Log activity
  await c.env.DB.prepare(
    'INSERT INTO activity_log (id, org_id, client_id, report_id, user_id, action, description, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    generateId(),
    user.org_id,
    clientId,
    reportId,
    user.id,
    'report_analyzed',
    `Autopilot processed report for ${firstName} ${lastName}: ${violations.length} violations found`,
    JSON.stringify({ score: litScore.score })
  ).run();

  return c.json({
    success: true,
    clientId,
    isNewClient,
    clientName: `${firstName} ${lastName}`,
    reportId,
    bureau: parsed.bureau || bureau || 'Unknown',
    reportDate: parsed.reportDate,
    personalInfo: parsed.personalInfo,
    totalAccounts: parsed.accounts.length,
    totalCollections: parsed.collections.length,
    totalInquiries: parsed.inquiries.length,
    totalPublicRecords: parsed.publicRecords.length,
    violationsFound: violations.length,
    violations,
    litigationScore: litScore,
    extractedEmail,
    extractedPhone,
    generatedPassword
  });
});

app.post('/api/reports/mfsn-import', authMiddleware, async (c) => {
  const user = c.get('user');
  const planCheck = await verifyOrgPlanLimits(c, 'report');
  if (!planCheck.allowed) return c.json({ error: planCheck.message }, 403);

  const body = await c.req.json();
  const { clientId, mfsnData } = body;

  if (!clientId || !mfsnData) return c.json({ error: 'Client ID and MFSN data required' }, 400);

  // Map MFSN data to internal reports (usually returns one per bureau)
  const mappedReports = mapMfsnToInternal(mfsnData);
  if (mappedReports.length > 0) {
    await backpopulateClientInfo(c, clientId, mappedReports[0].personalInfo, user.org_id);
  }
  const results = [];

  for (const report of mappedReports) {
    const reportId = generateId();
    
    // Detect violations for this specific bureau report
    const violations = detectViolations(report);
    const litScore = calculateLitigationScore(violations);

    // Save report with Field-Level AES-GCM Encryptions
    const encryptedRawText = await encryptPII(c, JSON.stringify(mfsnData));
    const encryptedParsedData = await encryptPII(c, JSON.stringify(report));

    await c.env.DB.prepare(
      'INSERT INTO credit_reports (id, org_id, client_id, uploaded_by, bureau, report_date, file_name, raw_text, parsed_data, status, total_accounts, total_inquiries, total_public_records, total_collections, analysis_started_at, analysis_completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))'
    ).bind(reportId, user.org_id, clientId, user.id, report.bureau, report.reportDate, `mfsn-import-${report.bureau}.json`, encryptedRawText, encryptedParsedData, 'analyzed', report.accounts.length, report.inquiries.length, report.publicRecords.length, report.collections.length).run();

    // Save violations
    for (const v of violations) {
      await c.env.DB.prepare(
        'INSERT INTO violations (id, org_id, report_id, client_id, category, subcategory, severity, statute, statute_text, legal_standard, evidence, explanation, case_law, account_name, account_number, dofd, falloff_date, days_overdue, statutory_damages_min, statutory_damages_max, actual_damages_est, punitive_damages_est, attorney_fees_est, total_damages_min, total_damages_max, defendant_type, defendant_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(v.id, user.org_id, reportId, clientId, v.category, v.subcategory, v.severity, v.statute, v.statuteText, v.legalStandard, v.evidence, v.explanation, v.caseLaw, v.accountName || null, v.accountNumber || null, v.dofd || null, v.falloffDate || null, v.daysOverdue || null, v.statutoryDamagesMin, v.statutoryDamagesMax, v.actualDamagesEst, v.punitiveDamagesEst, v.attorneyFeesEst, v.totalDamagesMin, v.totalDamagesMax, v.defendantType, v.defendantName).run();
    }

    await c.env.DB.prepare('INSERT INTO activity_log (id, org_id, client_id, report_id, user_id, action, description, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(generateId(), user.org_id, clientId, reportId, user.id, 'report_analyzed', `Imported MFSN report (${report.bureau}): ${violations.length} violations found`, JSON.stringify({ score: litScore.score })).run();

    results.push({
      bureau: report.bureau,
      reportId,
      violationsFound: violations.length,
      score: litScore.score
    });
  }

  return c.json({ success: true, reports: results });
});



// ═══════════════════════════════════════════════════════════════
// BILLING ROUTES (Stripe)
// ═══════════════════════════════════════════════════════════════
app.post('/api/billing/checkout', authMiddleware, async (c) => {
  const user = c.get('user');
  const { planId } = await c.req.json();
  if (!planId) return c.json({ error: 'Plan ID required' }, 400);

  const stripe = getStripe(c.env);
  const org = await c.env.DB.prepare('SELECT * FROM organizations WHERE id = ?').bind(user.org_id).first();

  const planPrices: Record<string, { amount: number; name: string; interval: 'month' }> = {
    'professional': { amount: 49700, name: 'Basic Plan', interval: 'month' },
    'unlimited': { amount: 250000, name: 'Unlimited Plan', interval: 'month' },
    'enterprise': { amount: 999700, name: 'Enterprise Plan', interval: 'month' }
  };

  const plan = planPrices[planId as string];
  if (!plan) return c.json({ error: 'Invalid plan' }, 400);

  const priceIdMap: Record<string, string | undefined> = {
    professional: c.env.STRIPE_PROFESSIONAL_PRICE_ID,
    unlimited: c.env.STRIPE_UNLIMITED_PRICE_ID,
    enterprise: c.env.STRIPE_ENTERPRISE_PRICE_ID,
  };

  let session;
  try {
    const configuredPriceId = priceIdMap[planId as string];
    const lineItems = configuredPriceId
      ? [{ price: configuredPriceId, quantity: 1 }]
      : [{
          price_data: {
            currency: 'usd',
            product_data: { name: plan.name, metadata: { planId } },
            unit_amount: plan.amount,
            recurring: { interval: plan.interval as 'month' },
          },
          quantity: 1,
        }];

    session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'subscription',
      success_url: `${c.env.FRONTEND_URL || 'http://localhost:3000'}/?checkout=success`,
      cancel_url: `${c.env.FRONTEND_URL || 'http://localhost:3000'}/?page=billing&checkout=cancelled`,
      client_reference_id: user.org_id,
      metadata: { planId, orgId: user.org_id },
      subscription_data: { metadata: { planId, orgId: user.org_id } },
      customer: org.stripe_customer_id || undefined,
      customer_email: org.stripe_customer_id ? undefined : user.email,
    });
  } catch (err: any) {
    console.error('Stripe checkout error:', err);
    return c.json({ error: `Stripe error: ${err.message || 'Unknown error'}` }, 500);
  }

  return c.json({ url: session.url });
});

app.post('/api/billing/webhook', async (c) => {
  const signature = c.req.header('stripe-signature');
  if (!signature) return c.json({ error: 'Missing signature' }, 400);

  const body = await c.req.raw.clone().text();
  const stripe = getStripe(c.env);
  let event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      c.env.STRIPE_WEBHOOK_SECRET,
      undefined,
      Stripe.createSubtleCryptoProvider()
    );
  } catch (err: any) {
    return c.json({ error: `Webhook error: ${err.message}` }, 400);
  }

  // 5. Webhook Idempotency (FTC/TSR & SLA security guarantee)
  try {
    await c.env.DB.prepare('INSERT INTO stripe_processed_events (id) VALUES (?)').bind(event.id).run();
  } catch (dbErr: any) {
    console.warn(`[WEBHOOK] Event ${event.id} already processed. Intercepting replay cleanly.`);
    return c.json({ received: true, duplicate: true });
  }

  const session = event.data.object as any;

  switch (event.type) {
    case 'checkout.session.completed': {
      const orgId = session.client_reference_id;
      const stripeCustomerId = session.customer as string;
      const stripeSubId = session.subscription as string;
      if (!orgId || !stripeSubId) break;

      const stripe = getStripe(c.env);
      const subscription = await stripe.subscriptions.retrieve(stripeSubId);
      const priceId = subscription.items.data[0]?.price.id;
      const metaPlan = session.metadata?.planId || subscription.metadata?.planId;
      const plan = metaPlan || (priceId === c.env.STRIPE_UNLIMITED_PRICE_ID ? 'unlimited'
        : priceId === c.env.STRIPE_ENTERPRISE_PRICE_ID ? 'enterprise'
        : priceId === c.env.STRIPE_PROFESSIONAL_PRICE_ID ? 'professional' : 'professional');

      await c.env.DB.prepare(
        'UPDATE organizations SET plan = ?, stripe_customer_id = ?, stripe_subscription_id = ? WHERE id = ?'
      ).bind(plan, stripeCustomerId, stripeSubId, orgId).run();
      break;
    }

    case 'customer.subscription.deleted':
      await c.env.DB.prepare(
        'UPDATE organizations SET plan = \'free\', stripe_subscription_id = NULL WHERE stripe_subscription_id = ?'
      ).bind(session.subscription as string).run();
      break;

    case 'customer.subscription.updated': {
      const subId = session.id as string;
      const stripe = getStripe(c.env);
      try {
        const subscription = await stripe.subscriptions.retrieve(subId);
        const priceId = subscription.items.data[0]?.price.id;
        const status = subscription.status;
        if (status === 'active' || status === 'trialing') {
          const plan = priceId === c.env.STRIPE_UNLIMITED_PRICE_ID ? 'unlimited'
            : priceId === c.env.STRIPE_ENTERPRISE_PRICE_ID ? 'enterprise'
            : priceId === c.env.STRIPE_PROFESSIONAL_PRICE_ID ? 'professional' : 'professional';
          await c.env.DB.prepare('UPDATE organizations SET plan = ? WHERE stripe_subscription_id = ?').bind(plan, subId).run();
        } else if (status === 'past_due') {
          await c.env.DB.prepare('UPDATE organizations SET plan = \'free\' WHERE stripe_subscription_id = ?').bind(subId).run();
        }
      } catch {}
      break;
    }

    case 'invoice.payment_succeeded': {
      const subId = session.subscription as string;
      if (!subId) break;
      const stripe = getStripe(c.env);
      try {
        const subscription = await stripe.subscriptions.retrieve(subId);
        const priceId = subscription.items.data[0]?.price.id;
        const plan = priceId === c.env.STRIPE_UNLIMITED_PRICE_ID ? 'unlimited'
          : priceId === c.env.STRIPE_ENTERPRISE_PRICE_ID ? 'enterprise'
          : priceId === c.env.STRIPE_PROFESSIONAL_PRICE_ID ? 'professional' : 'professional';
        await c.env.DB.prepare('UPDATE organizations SET plan = ? WHERE stripe_subscription_id = ?').bind(plan, subId).run();
      } catch {}
      break;
    }

    case 'invoice.payment_failed': {
      const subId = session.subscription as string;
      if (!subId) break;
      await c.env.DB.prepare('UPDATE organizations SET plan = \'free\' WHERE stripe_subscription_id = ?').bind(subId).run();
      break;
    }
  }

  return c.json({ received: true });
});

app.post('/api/billing/mailing-callback', async (c) => {
  const expected = c.env.MAILING_WEBHOOK_SECRET;
  const provided = c.req.header('X-Mailing-Webhook-Secret') || c.req.query('secret');
  if (!expected || provided !== expected) {
    return c.json({ error: 'Unauthorized mailing webhook' }, 401);
  }

  const body = await c.req.json();
  const { documentId, uspsTrackingNumber, mailingDate } = body;

  if (!documentId) {
    return c.json({ error: 'documentId is required' }, 400);
  }

  const doc = await c.env.DB.prepare('SELECT * FROM documents WHERE id = ?').bind(documentId).first() as any;
  if (!doc) {
    return c.json({ error: 'Document not found' }, 404);
  }

  const mDate = mailingDate ? new Date(mailingDate) : new Date();
  const due = new Date(mDate.getTime() + 35 * 24 * 60 * 60 * 1000);
  const responseDueDateStr = due.toISOString().split('T')[0];
  const sentDateStr = mDate.toISOString().split('T')[0];

  await c.env.DB.prepare(
    'UPDATE documents SET usps_tracking_number = ?, response_due_date = ?, sent_date = ?, status = \'sent\', updated_at = datetime("now") WHERE id = ?'
  ).bind(uspsTrackingNumber || null, responseDueDateStr, sentDateStr, documentId).run();

  await c.env.DB.prepare(
    'INSERT INTO mailing_webhook_events (id, document_id, payload) VALUES (?, ?, ?)'
  ).bind(generateId(), documentId, JSON.stringify(body)).run();

  await c.env.DB.prepare(
    'INSERT INTO activity_log (id, org_id, client_id, document_id, user_id, action, description, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    generateId(),
    doc.org_id,
    doc.client_id,
    documentId,
    'system_usps',
    'document_mailed',
    `Certified letter sent via USPS. Tracking: ${uspsTrackingNumber || 'N/A'}. Due date set to ${responseDueDateStr} (15 U.S.C. § 1681i).`,
    JSON.stringify({ trackingNumber: uspsTrackingNumber, responseDueDate: responseDueDateStr, sentDate: sentDateStr })
  ).run();

  return c.json({ ok: true, responseDueDate: responseDueDateStr });
});

// ═══════════════════════════════════════════════════════════════
// ORG SETTINGS — letterhead, branding, security prefs
// ═══════════════════════════════════════════════════════════════
app.get('/api/settings/org', authMiddleware, async (c) => {
  const user = c.get('user');
  const org = await c.env.DB.prepare('SELECT id, name, slug, plan, settings, max_users, max_clients, max_reports_per_month FROM organizations WHERE id = ?').bind(user.org_id).first() as any;
  if (!org) return c.json({ error: 'Organization not found' }, 404);
  let settings = {};
  try { settings = JSON.parse(org.settings || '{}'); } catch { settings = {}; }
  return c.json({ org: { ...org, settings } });
});

app.put('/api/settings/org', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role !== 'admin' && user.role !== 'super_admin') {
    return c.json({ error: 'Only org admins can update settings' }, 403);
  }
  const body = await c.req.json();
  const org = await c.env.DB.prepare('SELECT settings FROM organizations WHERE id = ?').bind(user.org_id).first() as any;
  let settings: any = {};
  try { settings = JSON.parse(org?.settings || '{}'); } catch { settings = {}; }

  if (body.letterhead && typeof body.letterhead === 'object') {
    settings.letterhead = {
      ...(settings.letterhead || {}),
      ...body.letterhead,
    };
  }
  if (body.branding && typeof body.branding === 'object') {
    settings.branding = { ...(settings.branding || {}), ...body.branding };
  }
  if (typeof body.name === 'string' && body.name.trim()) {
    await c.env.DB.prepare('UPDATE organizations SET name = ?, settings = ?, updated_at = datetime("now") WHERE id = ?')
      .bind(body.name.trim(), JSON.stringify(settings), user.org_id).run();
  } else {
    await c.env.DB.prepare('UPDATE organizations SET settings = ?, updated_at = datetime("now") WHERE id = ?')
      .bind(JSON.stringify(settings), user.org_id).run();
  }

  return c.json({ ok: true, settings });
});

app.get('/api/health/ready', async (c) => {
  const checks: Record<string, boolean | string> = {
    db: false,
    encryptionKey: !!(c.env.PII_ENCRYPTION_KEY && c.env.PII_ENCRYPTION_KEY.length >= 32),
    stripe: !!c.env.STRIPE_API_KEY,
    resend: !!c.env.RESEND_API_KEY,
    smartcredit: !!(c.env.SMARTCREDIT_CLIENT_KEY && c.env.SMARTCREDIT_CLIENT_SECRET),
    click2mail: !!(c.env.CLICK2MAIL_USERNAME && c.env.CLICK2MAIL_AUTH_BASIC),
    environment: c.env.ENVIRONMENT || 'development',
  };
  try {
    await c.env.DB.prepare('SELECT 1 as ok').first();
    checks.db = true;
  } catch {
    checks.db = false;
  }
  const ready = checks.db === true && checks.encryptionKey === true;
  return c.json({ ready, version: '2.0.0', checks }, ready ? 200 : 503);
});

app.get('/api/reports', authMiddleware, async (c) => {
  const user = c.get('user');
  const page = parseInt(c.req.query('page') || '1');
  const limit = 20;
  const offset = (page - 1) * limit;

  const reports = await c.env.DB.prepare(`
    SELECT cr.*, c.first_name, c.last_name, c.email as client_email,
           (SELECT COUNT(*) FROM violations WHERE report_id = cr.id) as violation_count,
           (SELECT SUM(total_damages_max) FROM violations WHERE report_id = cr.id) as total_damages
    FROM credit_reports cr
    JOIN clients c ON cr.client_id = c.id
    WHERE cr.org_id = ?
    ORDER BY cr.created_at DESC
    LIMIT ? OFFSET ?
  `).bind(user.org_id, limit, offset).all();

  const total = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM credit_reports WHERE org_id = ?'
  ).bind(user.org_id).first();

  const results = reports?.results || [];
  const decryptedReports = [];
  for (const r of results as any[]) {
    const rDecrypted = { ...r };
    if (rDecrypted.raw_text) {
      rDecrypted.raw_text = await decryptPII(c, rDecrypted.raw_text);
    }
    if (rDecrypted.parsed_data) {
      rDecrypted.parsed_data = await decryptPII(c, rDecrypted.parsed_data);
    }
    decryptedReports.push(rDecrypted);
  }

  return c.json({ reports: decryptedReports, total: total?.count || 0, page, limit });
});

app.get('/api/reports/:id', authMiddleware, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const report = await c.env.DB.prepare('SELECT * FROM credit_reports WHERE id = ? AND org_id = ?').bind(id, user.org_id).first() as any;
  if (!report) return c.json({ error: 'Not found' }, 404);

  if (report.raw_text) report.raw_text = await decryptPII(c, report.raw_text);
  if (report.parsed_data) report.parsed_data = await decryptPII(c, report.parsed_data);

  const violations = await c.env.DB.prepare('SELECT * FROM violations WHERE report_id = ? AND org_id = ? ORDER BY severity ASC').bind(id, user.org_id).all();
  const litScore = calculateLitigationScore((violations?.results || []) as any);
  const documents = await c.env.DB.prepare('SELECT * FROM documents WHERE report_id = ? AND org_id = ? ORDER BY created_at DESC').bind(id, user.org_id).all();

  return c.json({ report, violations: violations?.results || [], litigationScore: litScore, documents: documents?.results || [] });
});

app.get('/api/reports/:id/comparison', authMiddleware, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  
  // 1. Fetch current report
  const currentReport = await c.env.DB.prepare('SELECT * FROM credit_reports WHERE id = ? AND org_id = ?').bind(id, user.org_id).first() as any;
  if (!currentReport) return c.json({ error: 'Current credit report not found' }, 404);

  // 2. Decrypt current parsed data
  let currentParsed: any = null;
  if (currentReport.parsed_data) {
    const decryptedParsed = await decryptPII(c, currentReport.parsed_data);
    currentParsed = JSON.parse(decryptedParsed);
  } else {
    return c.json({ error: 'Current credit report is missing structured data' }, 400);
  }

  // 3. Fetch prior report for same client
  const previousReport = await c.env.DB.prepare(
    'SELECT * FROM credit_reports WHERE client_id = ? AND org_id = ? AND id != ? AND created_at < ? ORDER BY created_at DESC LIMIT 1'
  ).bind(currentReport.client_id, user.org_id, id, currentReport.created_at).first() as any;

  let previousParsed: any = null;
  if (previousReport && previousReport.parsed_data) {
    const decryptedPrevParsed = await decryptPII(c, previousReport.parsed_data);
    previousParsed = JSON.parse(decryptedPrevParsed);
  }

  // Helpers for normalization & matching
  const cleanStr = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanAcctNum = (s: string) => {
    return (s || '').toLowerCase().replace(/[^a-z0-9x*]/g, '');
  };

  const areAccountsMatching = (actA: any, actB: any) => {
    const normAName = cleanStr(actA.creditorName);
    const normBName = cleanStr(actB.creditorName);
    const normAAcct = cleanAcctNum(actA.accountNumber);
    const normBAcct = cleanAcctNum(actB.accountNumber);

    // Exact matches
    if (normAAcct && normBAcct && normAAcct === normBAcct) return true;

    // Fallback name similarity
    const nameMatch = normAName === normBName || normAName.includes(normBName) || normBName.includes(normAName);
    if (nameMatch) {
      if (!normAAcct || !normBAcct) return true;
      const aStripped = normAAcct.replace(/[x*]/g, '');
      const bStripped = normBAcct.replace(/[x*]/g, '');
      if (aStripped && bStripped && (aStripped.includes(bStripped) || bStripped.includes(aStripped))) {
        return true;
      }
    }
    return false;
  };

  const erasedAccounts: any[] = [];
  const updatedAccounts: any[] = [];
  const newInquiries: any[] = [];

  if (previousParsed) {
    const prevAccounts = previousParsed.accounts || [];
    const currAccounts = currentParsed.accounts || [];

    for (const prevAct of prevAccounts) {
      const match = currAccounts.find((currAct: any) => areAccountsMatching(prevAct, currAct));
      if (!match) {
        const creditor = prevAct.creditorName || 'Unknown Creditor';
        const acctNum = prevAct.accountNumber || 'N/A';
        const status = prevAct.accountStatus || prevAct.paymentStatus || 'Delinquent';
        
        let explanation = '';
        let statutoryLeverage = '';

        const isNeg = prevAct.isCollection || prevAct.isChargeOff || status.toLowerCase().includes('collection') || status.toLowerCase().includes('charge-off') || status.toLowerCase().includes('past due') || status.toLowerCase().includes('late');

        if (isNeg) {
          statutoryLeverage = '15 U.S.C. § 1681i / 15 U.S.C. § 1692g';
          explanation = `Tradeline for ${creditor} (Acct: ${acctNum}) was permanently erased from the consumer profile following statutory dispute challenges. Under the FCRA (15 U.S.C. § 1681i), the Consumer Reporting Agency (CRA) must conduct a reasonable reinvestigation within 30 days. If the furnisher fails to verify the accurate status, or fails to respond within the statutory timeframe, the CRA must immediately delete the item.`;
          
          if (prevAct.isCollection) {
            explanation += ` Additionally, under FDCPA 15 U.S.C. § 1692g, third-party collectors must cease collection and verify the debt. Failure to produce valid documentation leads to absolute deletion.`;
          }
        } else {
          statutoryLeverage = '15 U.S.C. § 1681i';
          explanation = `This account was deleted following dispute enforcement under 15 U.S.C. § 1681i. The furnisher did not or could not verify the accuracy within the mandated 30-day statutory timeline, enforcing automatic legal deletion.`;
        }

        erasedAccounts.push({
          creditorName: creditor,
          accountNumber: acctNum,
          bureau: prevAct.bureau || currentReport.bureau,
          previousStatus: status,
          previousBalance: prevAct.balance || 0,
          stattext: statutoryLeverage,
          statutoryReason: explanation
        });
      } else {
        const prevBal = Number(prevAct.balance) || 0;
        const currBal = Number(match.balance) || 0;
        const prevStatus = prevAct.accountStatus || prevAct.paymentStatus || '';
        const currStatus = match.accountStatus || match.paymentStatus || '';

        const wasNegative = prevAct.isCollection || prevAct.isChargeOff || prevStatus.toLowerCase().includes('collection') || prevStatus.toLowerCase().includes('charge-off') || prevStatus.toLowerCase().includes('past due') || prevStatus.toLowerCase().includes('late');
        const isNowPositive = !match.isCollection && !match.isChargeOff && !currStatus.toLowerCase().includes('collection') && !currStatus.toLowerCase().includes('charge-off') && !currStatus.toLowerCase().includes('past due') && !currStatus.toLowerCase().includes('late');

        if ((wasNegative && isNowPositive) || (prevBal > 0 && currBal === 0 && wasNegative)) {
          updatedAccounts.push({
            creditorName: prevAct.creditorName,
            accountNumber: prevAct.accountNumber,
            bureau: prevAct.bureau || currentReport.bureau,
            previousStatus: prevStatus,
            currentStatus: currStatus,
            previousBalance: prevBal,
            currentBalance: currBal,
            changeType: (wasNegative && isNowPositive) ? 'Status Restored to Positive' : 'Balance Settled to Zero'
          });
        }
      }
    }

    const prevInquiries = previousParsed.inquiries || [];
    const currInquiries = currentParsed.inquiries || [];
    for (const currInq of currInquiries) {
      const match = prevInquiries.find((prevInq: any) => {
        return cleanStr(currInq.creditorName) === cleanStr(prevInq.creditorName) &&
               currInq.date === prevInq.date;
      });
      if (!match) {
        newInquiries.push({
          creditorName: currInq.creditorName,
          date: currInq.date,
          bureau: currInq.bureau || currentReport.bureau
        });
      }
    }
  }

  const client = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ?').bind(currentReport.client_id).first() as any;
  const currentScores = {
    Equifax: client?.eq_score || 720,
    Experian: client?.ex_score || 710,
    TransUnion: client?.tu_score || 715
  };

  const scoreTrends = {
    Equifax: { current: currentScores.Equifax, previous: currentScores.Equifax - (erasedAccounts.length * 8) },
    Experian: { current: currentScores.Experian, previous: currentScores.Experian - (erasedAccounts.length * 11) },
    TransUnion: { current: currentScores.TransUnion, previous: currentScores.TransUnion - (erasedAccounts.length * 7) }
  };

  return c.json({
    hasPrevious: !!previousReport,
    previousReportDate: previousReport?.report_date || null,
    currentReportDate: currentReport.report_date,
    erasedAccounts,
    updatedAccounts,
    newInquiries,
    scoreTrends,
    complianceStatus: {
      croaAgreed: client?.croa_contract_agreed === 1,
      permissiblePurpose: client?.permissible_purpose_consent === 1,
      tsrWaived: client?.tsr_advance_fee_waived === 1
    }
  });
});

app.get('/api/reports/:id/pdf', authMiddleware, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  const report = await c.env.DB.prepare('SELECT * FROM credit_reports WHERE id = ? AND org_id = ?').bind(id, user.org_id).first() as any;
  if (!report) return c.json({ error: 'Report not found' }, 404);

  if (report.raw_text) report.raw_text = await decryptPII(c, report.raw_text);
  if (report.parsed_data) report.parsed_data = await decryptPII(c, report.parsed_data);

  const violations = await c.env.DB.prepare('SELECT * FROM violations WHERE report_id = ? AND org_id = ? ORDER BY severity ASC').bind(id, user.org_id).all();
  const litScore = calculateLitigationScore((violations?.results || []) as any);
  const client = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ? AND org_id = ?').bind((report as any).client_id, user.org_id).first();

  const pdfViolations: PDFReportData['violations'] = (violations?.results || []).map((v: any) => ({
    id: v.id,
    category: v.category,
    subcategory: v.subcategory,
    severity: v.severity,
    statute: v.statute,
    statuteText: v.statute_text,
    legalStandard: v.legal_standard,
    evidence: v.evidence,
    explanation: v.explanation,
    caseLaw: v.case_law,
    accountName: v.account_name,
    accountNumber: v.account_number,
    dofd: v.dofd,
    falloffDate: v.falloff_date,
    daysOverdue: v.days_overdue,
    statutoryDamagesMin: v.statutory_damages_min,
    statutoryDamagesMax: v.statutory_damages_max,
    actualDamagesEst: v.actual_damages_est,
    punitiveDamagesEst: v.punitive_damages_est,
    attorneyFeesEst: v.attorney_fees_est,
    totalDamagesMin: v.total_damages_min,
    totalDamagesMax: v.total_damages_max,
    defendantType: v.defendant_type,
    defendantName: v.defendant_name,
    remedialAction: v.remedial_action || 'Dispute and validate with bureau',
    disputeStrategy: v.dispute_strategy || 'File formal dispute with supporting documentation',
  }));

  const reportData: PDFReportData = {
    clientName: client ? `${(client as any).first_name} ${(client as any).last_name}` : 'Unknown Client',
    clientAddress: (client as any)?.address_line1 || '',
    clientCity: (client as any)?.city || '',
    clientState: (client as any)?.state || '',
    clientZip: (client as any)?.zip || '',
    clientSSNLast4: (client as any)?.ssn_last4,
    clientDOB: (client as any)?.dob,
    clientEmail: (client as any)?.email,
    reportDate: (report as any).report_date,
    bureau: (report as any).bureau,
    violations: pdfViolations,
    litigationScore: litScore.score,
    generatedDate: new Date().toISOString().split('T')[0],
    reportId: id,
    orgName: 'RJ Business Solutions',
  };

  const pdfBytes = generatePDFReport(reportData);

  return new Response(pdfBytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="FCRA-Report-${id}.pdf"`,
    },
  });
});

// ═══════════════════════════════════════════════════════════════
// REPORT IMPORT - MYFREESCORENOW / IDENTITYIQ
// ═══════════════════════════════════════════════════════════════
app.post('/api/reports/import-mfsn', authMiddleware, async (c) => {
  const user = c.get('user');
  const planCheck = await verifyOrgPlanLimits(c, 'report');
  if (!planCheck.allowed) return c.json({ error: planCheck.message }, 403);

  const body = await c.req.json();
  const { clientId, username, password, clientEmail, secretWord } = body;

  if (!clientId || !username || !password || !clientEmail) {
    return c.json({ error: 'Client ID, API username, password, and client email are required' }, 400);
  }

  try {
    // 1. Authenticate with MyFreeScoreNow
    const loginFormData = new FormData();
    loginFormData.append('email', username);
    loginFormData.append('password', password);

    const loginRes = await fetch('https://api.myfreescorenow.com/api/auth/login', {
      method: 'POST',
      body: loginFormData,
    });

    const loginData: any = await loginRes.json();
    if (!loginData.success) {
      return c.json({ error: `MFSN Auth Failed: ${loginData.message || 'Unknown error'}` }, 401);
    }

    const accessToken = loginData.token;

    // 2. Fetch 3B Credit Report JSON
    const fetchFormData = new FormData();
    fetchFormData.append('email', clientEmail);
    fetchFormData.append('client_token', secretWord || '');

    const fetchRes = await fetch('https://api.myfreescorenow.com/api/auth/fetch-3B-json', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: fetchFormData,
    });

    const mfsnReportData: any = await fetchRes.json();
    if (!mfsnReportData.success) {
      return c.json({ error: `MFSN Fetch Failed: ${mfsnReportData.message || 'Unknown error'}` }, 400);
    }

    // 3. Map MFSN Data to Internal Format
    const bureauReports = mapMfsnToInternal(mfsnReportData);
    if (bureauReports.length === 0) {
      return c.json({ error: 'No bureau data found in MFSN report response' }, 404);
    }

    const primaryReport = bureauReports[0];
    await backpopulateClientInfo(c, clientId, primaryReport.personalInfo, user.org_id);
    const reportId = generateId();

    let totalAccounts = 0;
    let totalInquiries = 0;
    let totalPublicRecords = 0;
    let totalCollections = 0;
    let allViolations: any[] = [];

    for (const report of bureauReports) {
      totalAccounts += report.accounts.length;
      totalInquiries += report.inquiries.length;
      totalPublicRecords += report.publicRecords.length;
      totalCollections += report.collections.length;
      
      const bureauViolations = detectViolations(report);
      allViolations = [...allViolations, ...bureauViolations];
    }

    const litScore = calculateLitigationScore(allViolations);

    const encryptedRawText = await encryptPII(c, JSON.stringify(mfsnReportData));
    const encryptedParsedData = await encryptPII(c, JSON.stringify(primaryReport));

    await c.env.DB.prepare(
      'INSERT INTO credit_reports (id, org_id, client_id, uploaded_by, bureau, report_date, file_name, raw_text, parsed_data, status, total_accounts, total_inquiries, total_public_records, total_collections, analysis_started_at, analysis_completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))'
    ).bind(
      reportId, 
      user.org_id, 
      clientId, 
      user.id, 
      'MyFreeScoreNow (3B)', 
      primaryReport.reportDate, 
      `mfsn_${username}.json`, 
      encryptedRawText, 
      encryptedParsedData, 
      'analyzed', 
      totalAccounts, 
      totalInquiries, 
      totalPublicRecords, 
      totalCollections
    ).run();

    for (const v of allViolations) {
      await c.env.DB.prepare(
        'INSERT INTO violations (id, org_id, report_id, client_id, category, subcategory, severity, statute, statute_text, legal_standard, evidence, explanation, case_law, account_name, account_number, dofd, falloff_date, days_overdue, statutory_damages_min, statutory_damages_max, actual_damages_est, punitive_damages_est, attorney_fees_est, total_damages_min, total_damages_max, defendant_type, defendant_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(v.id, user.org_id, reportId, clientId, v.category, v.subcategory, v.severity, v.statute, v.statuteText, v.legalStandard, v.evidence, v.explanation, v.caseLaw, v.accountName || null, v.accountNumber || null, v.dofd || null, v.falloffDate || null, v.daysOverdue || null, v.statutoryDamagesMin, v.statutoryDamagesMax, v.actualDamagesEst, v.punitiveDamagesEst, v.attorneyFeesEst, v.totalDamagesMin, v.totalDamagesMax, v.defendantType, v.defendantName).run();
    }

    await c.env.DB.prepare('INSERT INTO activity_log (id, org_id, client_id, report_id, user_id, action, description, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(generateId(), user.org_id, clientId, reportId, user.id, 'report_imported', `Real import from MyFreeScoreNow: ${allViolations.length} violations found across 3 bureaus`, JSON.stringify({ score: litScore.score })).run();

    return c.json({
      reportId,
      bureau: 'MyFreeScoreNow (Tri-Bureau)',
      reportDate: primaryReport.reportDate,
      personalInfo: primaryReport.personalInfo,
      totalAccounts,
      totalCollections,
      totalInquiries,
      totalPublicRecords,
      violationsFound: allViolations.length,
      violations: allViolations,
      litigationScore: litScore,
    });
  } catch (err: any) {
    console.error('MFSN Import Error:', err);
    return c.json({ error: `Connection Error: ${err.message}` }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════
// REPORT IMPORT - SMARTCREDIT / CONSUMERDIRECT
// ═══════════════════════════════════════════════════════════════
app.post('/api/reports/import-smartcredit', authMiddleware, async (c) => {
  const user = c.get('user');
  const planCheck = await verifyOrgPlanLimits(c, 'report');
  if (!planCheck.allowed) return c.json({ error: planCheck.message }, 403);

  const body = await c.req.json();
  const { clientId, smartCreditData, trackingToken, username, password, fileText } = body;

  if (!clientId) {
    return c.json({ error: 'Client ID is required' }, 400);
  }

  let payload = smartCreditData;
  let resolvedTrackingToken = trackingToken;
  let bureauReports: CreditReportData[] = [];

  const isSandbox = username === 'test_smartcredit@rjbusinesssolutions.com';

  try {
    if (isSandbox) {
      resolvedTrackingToken = "sandbox_token_999";
      const mockEquifax: CreditReportData = {
        bureau: 'Equifax',
        reportDate: new Date().toLocaleDateString(),
        personalInfo: {
          names: [ 'Rick Jefferson', 'Rick A Jefferson' ],
          addresses: [ '1342 NM 333, Tijeras, NM 87059' ],
          employers: [ 'RJ Business Solutions' ],
          ssns: [ '***-**-9999' ],
          dobs: [ '05/21/1985' ]
        },
        accounts: [
          {
            creditorName: 'Chase Bank',
            accountNumber: '411122223333',
            accountType: 'Revolving',
            accountStatus: 'Open',
            dateOpened: '04/10/2021',
            currentBalance: 1500,
            originalAmount: 5000,
            highBalance: 1200, // Balance Exceeds High Balance (Impossible Data)
            creditLimit: 5000,
            monthlyPayment: 50,
            paymentStatus: 'Current',
            paymentHistory: 'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
            isCollection: false
          }
        ],
        inquiries: [
          { creditorName: 'Capital One', inquiryDate: '05/10/2026', inquiryType: 'Hard' },
          { creditorName: 'Citibank', inquiryDate: '05/12/2026', inquiryType: 'Hard' },
          { creditorName: 'Discover', inquiryDate: '05/15/2026', inquiryType: 'Hard' },
          { creditorName: 'Wells Fargo', inquiryDate: '06/01/2026', inquiryType: 'Hard' },
          { creditorName: 'Bank of America', inquiryDate: '06/05/2026', inquiryType: 'Hard' },
          { creditorName: 'Synchrony', inquiryDate: '06/10/2026', inquiryType: 'Hard' },
          { creditorName: 'Barclays', inquiryDate: '06/15/2026', inquiryType: 'Hard' }
        ],
        publicRecords: [],
        collections: [
          {
            creditorName: 'ACME Collections',
            accountNumber: '98765-COLL',
            accountType: 'Collection',
            accountStatus: 'Collection',
            dateOpened: '05/15/2018',
            dofd: '01/15/2018', // Obsolete collection (7-year rule)
            currentBalance: 350,
            originalAmount: 350,
            highBalance: 0,
            creditLimit: 0,
            monthlyPayment: 0,
            paymentStatus: 'Collection',
            paymentHistory: '999999999999999999999999999999',
            isCollection: true
          }
        ]
      };

      const mockExperian: CreditReportData = {
        bureau: 'Experian',
        reportDate: new Date().toLocaleDateString(),
        personalInfo: {
          names: [ 'Rick Jefferson' ],
          addresses: [ '1342 NM 333, Tijeras, NM 87059' ],
          employers: [ 'RJ Business Solutions' ],
          ssns: [ '***-**-9999' ],
          dobs: [ '05/21/1985' ]
        },
        accounts: [
          {
            creditorName: 'Chase Bank',
            accountNumber: '411122223333',
            accountType: 'Revolving',
            accountStatus: 'Open',
            dateOpened: '04/10/2021',
            currentBalance: 2500, // Contradicts Equifax's 1500
            originalAmount: 5000,
            highBalance: 2500,
            creditLimit: 0, // Missing Credit Limit - Utilization Distortion
            monthlyPayment: 75,
            paymentStatus: 'Current',
            paymentHistory: 'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
            isCollection: false
          }
        ],
        inquiries: [
          { creditorName: 'Capital One', inquiryDate: '05/10/2026', inquiryType: 'Hard' },
          { creditorName: 'Citibank', inquiryDate: '05/12/2026', inquiryType: 'Hard' },
          { creditorName: 'Discover', inquiryDate: '05/15/2026', inquiryType: 'Hard' },
          { creditorName: 'Wells Fargo', inquiryDate: '06/01/2026', inquiryType: 'Hard' },
          { creditorName: 'Bank of America', inquiryDate: '06/05/2026', inquiryType: 'Hard' },
          { creditorName: 'Synchrony', inquiryDate: '06/10/2026', inquiryType: 'Hard' },
          { creditorName: 'Barclays', inquiryDate: '06/15/2026', inquiryType: 'Hard' }
        ],
        publicRecords: [],
        collections: [
          {
            creditorName: 'ACME Collections',
            accountNumber: '98765-COLL',
            accountType: 'Collection',
            accountStatus: 'Collection',
            dateOpened: '05/15/2018',
            dofd: '01/15/2018',
            currentBalance: 350,
            originalAmount: 350,
            highBalance: 0,
            creditLimit: 0,
            monthlyPayment: 0,
            paymentStatus: 'Collection',
            paymentHistory: '999999999999999999999999999999',
            isCollection: true
          }
        ]
      };

      const mockTransUnion: CreditReportData = {
        bureau: 'TransUnion',
        reportDate: new Date().toLocaleDateString(),
        personalInfo: {
          names: [ 'Rick Jefferson' ],
          addresses: [ '1342 NM 333, Tijeras, NM 87059' ],
          employers: [ 'RJ Business Solutions' ],
          ssns: [ '***-**-9999' ],
          dobs: [ '05/21/1985' ]
        },
        accounts: [
          {
            creditorName: 'Chase Bank',
            accountNumber: '411122223333',
            accountType: 'Revolving',
            accountStatus: 'Open',
            dateOpened: '04/10/2021',
            currentBalance: 1500, // Matches Equifax but has credit limit reported correctly
            originalAmount: 5000,
            highBalance: 1500,
            creditLimit: 5000,
            monthlyPayment: 50,
            paymentStatus: 'Current',
            paymentHistory: 'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
            isCollection: false
          }
        ],
        inquiries: [
          { creditorName: 'Capital One', inquiryDate: '05/10/2026', inquiryType: 'Hard' },
          { creditorName: 'Citibank', inquiryDate: '05/12/2026', inquiryType: 'Hard' },
          { creditorName: 'Discover', inquiryDate: '05/15/2026', inquiryType: 'Hard' },
          { creditorName: 'Wells Fargo', inquiryDate: '06/01/2026', inquiryType: 'Hard' },
          { creditorName: 'Bank of America', inquiryDate: '06/05/2026', inquiryType: 'Hard' },
          { creditorName: 'Synchrony', inquiryDate: '06/10/2026', inquiryType: 'Hard' },
          { creditorName: 'Barclays', inquiryDate: '06/15/2026', inquiryType: 'Hard' }
        ],
        publicRecords: [],
        collections: [
          {
            creditorName: 'ACME Collections',
            accountNumber: '98765-COLL',
            accountType: 'Collection',
            accountStatus: 'Collection',
            dateOpened: '05/15/2018',
            dofd: '01/15/2018',
            currentBalance: 350,
            originalAmount: 350,
            highBalance: 0,
            creditLimit: 0,
            monthlyPayment: 0,
            paymentStatus: 'Collection',
            paymentHistory: '999999999999999999999999999999',
            isCollection: true
          }
        ]
      };

      bureauReports = [mockEquifax, mockExperian, mockTransUnion];
      payload = {
        isMockSandbox: true,
        reports: bureauReports
      };
    } else if (fileText) {
      try {
        const parsedJson = JSON.parse(fileText);
        bureauReports = mapSmartCreditToInternal(parsedJson);
        payload = parsedJson;
        resolvedTrackingToken = trackingToken || 'file_upload_json';
      } catch (jsonErr) {
        const parsedReport = parseCreditReportText(fileText);
        bureauReports = [parsedReport];
        payload = { rawText: fileText, source: 'file_upload_text' };
        resolvedTrackingToken = trackingToken || 'file_upload_text';
      }
    } else {
      if (username && password) {
        const clientKey = c.env.SMARTCREDIT_CLIENT_KEY;
        const clientSecret = c.env.SMARTCREDIT_CLIENT_SECRET;
        if (!clientKey || !clientSecret) {
          return c.json({ error: 'SmartCredit credentials are not configured. Set SMARTCREDIT_CLIENT_KEY and SMARTCREDIT_CLIENT_SECRET.' }, 503);
        }
        const authHeader = 'Basic ' + btoa(`${clientKey}:${clientSecret}`);

        const authRes = await fetch('https://api.smartcredit.com/v1.1/member/authenticate', {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ username, password })
        });

        if (!authRes.ok) {
          const errText = await authRes.text();
          return c.json({ error: `SmartCredit Authentication Failed (${authRes.status}): ${errText}` }, authRes.status as any);
        }

        const authData: any = await authRes.json();
        resolvedTrackingToken = authData.trackingToken || authData.data?.trackingToken || authData.member?.trackingToken || authData.token;

        if (!resolvedTrackingToken) {
          return c.json({ error: 'Failed to resolve trackingToken from authentication response' }, 500);
        }
      }

      // If trackingToken is provided/resolved and raw smartCreditData is absent, fetch via ConsumerDirect API
      if (resolvedTrackingToken && !payload) {
        const clientKey = c.env.SMARTCREDIT_CLIENT_KEY;
        const clientSecret = c.env.SMARTCREDIT_CLIENT_SECRET;
        if (!clientKey || !clientSecret) {
          return c.json({ error: 'SmartCredit credentials are not configured. Set SMARTCREDIT_CLIENT_KEY and SMARTCREDIT_CLIENT_SECRET.' }, 503);
        }
        const url = `https://api.smartcredit.com/v1.1/report/retrieve?clientKey=${clientKey}&trackingToken=${resolvedTrackingToken}`;
        const authHeader = 'Basic ' + btoa(`${clientKey}:${clientSecret}`);

        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': authHeader,
            'Accept': 'application/json'
          }
        });

        if (!res.ok) {
          const errText = await res.text();
          return c.json({ error: `SmartCredit API Retrieve Failed (${res.status}): ${errText}` }, res.status as any);
        }

        payload = await res.json();
      }

      if (!payload) {
        return c.json({ error: 'Either smartCreditData (JSON payload) or trackingToken or credentials are required' }, 400);
      }

      // Map SmartCredit Data to Internal Format
      bureauReports = mapSmartCreditToInternal(payload);
    }

    if (bureauReports.length === 0) {
      return c.json({ error: 'No bureau data found in SmartCredit report response' }, 404);
    }

    const primaryReport = bureauReports[0];
    await backpopulateClientInfo(c, clientId, primaryReport.personalInfo, user.org_id);
    const reportId = generateId();

    let totalAccounts = 0;
    let totalInquiries = 0;
    let totalPublicRecords = 0;
    let totalCollections = 0;
    let allViolations: any[] = [];

    for (const report of bureauReports) {
      totalAccounts += report.accounts.length;
      totalInquiries += report.inquiries.length;
      totalPublicRecords += report.publicRecords.length;
      totalCollections += report.collections.length;
      
      const bureauViolations = detectViolations(report);
      allViolations = [...allViolations, ...bureauViolations];
    }

    const litScore = calculateLitigationScore(allViolations);

    const encryptedRawText = await encryptPII(c, JSON.stringify(payload));
    const encryptedParsedData = await encryptPII(c, JSON.stringify(primaryReport));

    await c.env.DB.prepare(
      'INSERT INTO credit_reports (id, org_id, client_id, uploaded_by, bureau, report_date, file_name, raw_text, parsed_data, status, total_accounts, total_inquiries, total_public_records, total_collections, analysis_started_at, analysis_completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))'
    ).bind(
      reportId, 
      user.org_id, 
      clientId, 
      user.id, 
      bureauReports.map(r => r.bureau).join(', ') || 'SmartCredit', 
      primaryReport.reportDate, 
      resolvedTrackingToken ? `smartcredit_${resolvedTrackingToken}.json` : `smartcredit_manual.json`, 
      encryptedRawText, 
      encryptedParsedData, 
      'analyzed', 
      totalAccounts, 
      totalInquiries, 
      totalPublicRecords, 
      totalCollections
    ).run();

    for (const v of allViolations) {
      await c.env.DB.prepare(
        'INSERT INTO violations (id, org_id, report_id, client_id, category, subcategory, severity, statute, statute_text, legal_standard, evidence, explanation, case_law, account_name, account_number, dofd, falloff_date, days_overdue, statutory_damages_min, statutory_damages_max, actual_damages_est, punitive_damages_est, attorney_fees_est, total_damages_min, total_damages_max, defendant_type, defendant_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(v.id, user.org_id, reportId, clientId, v.category, v.subcategory, v.severity, v.statute, v.statuteText, v.legalStandard, v.evidence, v.explanation, v.caseLaw, v.accountName || null, v.accountNumber || null, v.dofd || null, v.falloffDate || null, v.daysOverdue || null, v.statutoryDamagesMin, v.statutoryDamagesMax, v.actualDamagesEst, v.punitiveDamagesEst, v.attorneyFeesEst, v.totalDamagesMin, v.totalDamagesMax, v.defendantType, v.defendantName).run();
    }

    const actionText = isSandbox 
      ? `Sandbox simulation import from SmartCredit: ${allViolations.length} violations found across ${bureauReports.length} bureaus`
      : fileText 
        ? `Manual report upload/import from SmartCredit: ${allViolations.length} violations found`
        : `Real import from SmartCredit: ${allViolations.length} violations found across ${bureauReports.length} bureaus`;

    await c.env.DB.prepare('INSERT INTO activity_log (id, org_id, client_id, report_id, user_id, action, description, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(generateId(), user.org_id, clientId, reportId, user.id, 'report_imported', actionText, JSON.stringify({ score: litScore.score })).run();

    return c.json({
      reportId,
      bureau: bureauReports.map(r => r.bureau).join(', ') || 'SmartCredit',
      reportDate: primaryReport.reportDate,
      personalInfo: primaryReport.personalInfo,
      totalAccounts,
      totalCollections,
      totalInquiries,
      totalPublicRecords,
      violationsFound: allViolations.length,
      violations: allViolations,
      litigationScore: litScore,
    });
  } catch (err: any) {
    console.error('SmartCredit Import Error:', err);
    return c.json({ error: `Connection Error: ${err.message}` }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════
// VIOLATIONS ROUTES (enhanced)
// ═══════════════════════════════════════════════════════════════
app.get('/api/violations', authMiddleware, async (c) => {
  const user = c.get('user');
  const severity = c.req.query('severity');
  const category = c.req.query('category');
  
  let query = 'SELECT v.*, c.first_name, c.last_name FROM violations v JOIN clients c ON v.client_id = c.id WHERE v.org_id = ?';
  const params: any[] = [user.org_id];
  if (severity) { query += ' AND v.severity = ?'; params.push(severity); }
  if (category) { query += ' AND v.category = ?'; params.push(category); }
  query += ' ORDER BY v.created_at DESC';

  const result = await c.env.DB.prepare(query).bind(...params).all();
  return c.json({ violations: result?.results || [] });
});

app.put('/api/violations/:id', authMiddleware, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const data = await c.req.json();

  await c.env.DB.prepare('UPDATE violations SET status=?, dispute_sent_date=?, dispute_response_date=?, dispute_result=?, notes=?, updated_at=datetime("now") WHERE id=? AND org_id=?').bind(data.status, data.disputeSentDate || null, data.disputeResponseDate || null, data.disputeResult || null, data.notes || null, id, user.org_id).run();

  return c.json({ ok: true });
});

// Export violations as text report
app.get('/api/violations/export', authMiddleware, async (c) => {
  const user = c.get('user');
  const clientId = c.req.query('clientId');
  const reportId = c.req.query('reportId');
  
  let query = 'SELECT v.*, c.first_name, c.last_name FROM violations v JOIN clients c ON v.client_id = c.id WHERE v.org_id = ?';
  const params: any[] = [user.org_id];
  if (clientId) { query += ' AND v.client_id = ?'; params.push(clientId); }
  if (reportId) { query += ' AND v.report_id = ?'; params.push(reportId); }
  query += ' ORDER BY v.severity ASC, v.created_at DESC';

  const result = await c.env.DB.prepare(query).bind(...params).all();
  const violations = result?.results || [];
  const litScore = calculateLitigationScore(violations as any);

  // Build text export
  let report = `${'═'.repeat(70)}\nFCRA/FDCPA VIOLATION ANALYSIS REPORT\nGenerated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}\n${'═'.repeat(70)}\n\n`;
  report += `SUMMARY:\n  Total Violations: ${violations.length}\n  Litigation Score: ${litScore.score}/100 (${litScore.grade})\n  Recommendation: ${litScore.recommendation}\n  Total Damages: $${litScore.totalDamagesMin.toLocaleString()} — $${litScore.totalDamagesMax.toLocaleString()}\n\n`;
  report += `SETTLEMENT RANGES:\n  Pre-Litigation: $${litScore.preLitSettlement.min.toLocaleString()} — $${litScore.preLitSettlement.max.toLocaleString()}\n  Post-Filing: $${litScore.postFilingSettlement.min.toLocaleString()} — $${litScore.postFilingSettlement.max.toLocaleString()}\n  Trial Verdict: $${litScore.trialVerdict.min.toLocaleString()} — $${litScore.trialVerdict.max.toLocaleString()}\n\n`;
  
  report += `${'─'.repeat(70)}\nDETAILED VIOLATIONS:\n${'─'.repeat(70)}\n\n`;
  for (const [i, v] of (violations as any[]).entries()) {
    report += `VIOLATION ${i + 1} of ${violations.length} — [${(v.severity || '').toUpperCase()}]\n`;
    report += `  Category: ${v.category} — ${v.subcategory}\n`;
    report += `  Statute: ${v.statute}\n`;
    report += `  Account: ${v.account_name || 'N/A'} #${v.account_number || 'N/A'}\n`;
    report += `  Evidence: ${v.evidence}\n`;
    report += `  Legal Standard: ${v.legal_standard}\n`;
    report += `  Case Law: ${v.case_law}\n`;
    report += `  Defendant: ${v.defendant_type} — ${v.defendant_name}\n`;
    report += `  Damages: $${(v.total_damages_min || 0).toLocaleString()} — $${(v.total_damages_max || 0).toLocaleString()}\n`;
    report += '\n' + '─'.repeat(50) + '\n\n';
  }

  report += `\nLITIGATION PLAN:\n${litScore.litigationPlan.map((s, i) => `  ${s}`).join('\n')}\n`;

  return c.text(report);
});

// ═══════════════════════════════════════════════════════════════
// DOCUMENT GENERATION ROUTES (enhanced)
// ═══════════════════════════════════════════════════════════════
app.get('/api/documents', authMiddleware, async (c) => {
  const user = c.get('user');
  const result = await c.env.DB.prepare('SELECT d.*, c.first_name, c.last_name FROM documents d JOIN clients c ON d.client_id = c.id WHERE d.org_id = ? ORDER BY d.created_at DESC').bind(user.org_id).all();
  return c.json({ documents: result?.results || [] });
});

app.post('/api/documents/generate', authMiddleware, async (c) => {
  const user = c.get('user');
  const { clientId, reportId, violationIds, docType, bureau, creditorName, creditorAddress } = await c.req.json();

  const client = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ? AND org_id = ?').bind(clientId, user.org_id).first() as any;
  if (!client) return c.json({ error: 'Client not found' }, 404);

  const violationsResult = violationIds?.length
    ? await c.env.DB.prepare(`SELECT * FROM violations WHERE id IN (${violationIds.map(() => '?').join(',')}) AND org_id = ?`).bind(...violationIds, user.org_id).all()
    : reportId
      ? await c.env.DB.prepare('SELECT * FROM violations WHERE report_id = ? AND org_id = ?').bind(reportId, user.org_id).all()
      : await c.env.DB.prepare('SELECT * FROM violations WHERE client_id = ? AND org_id = ? ORDER BY created_at DESC LIMIT 50').bind(clientId, user.org_id).all();

  const violations = violationsResult?.results || [];
  const docDef = (DOCUMENT_TYPES as any)[docType];
  if (!docDef) return c.json({ error: 'Unknown document type' }, 400);

  const docData: DocumentData = {
    clientName: `${client.first_name} ${client.last_name}`,
    clientAddress: client.address_line1 || '',
    clientCity: client.city || '',
    clientState: client.state || '',
    clientZip: client.zip || '',
    clientSSNLast4: client.ssn_last4 || '',
    clientDOB: client.dob || '',
    today: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    violations: violations as any[],
    bureau: bureau || 'Equifax',
    creditorName,
    creditorAddress,
    reportId,
    clientPhone: client.phone || '',
    clientEmail: client.email || '',
  };

  const content = docDef.fn(docData);
  const docId = generateId();
  const title = `${docDef.name} - ${client.first_name} ${client.last_name}`;

  await c.env.DB.prepare(
    'INSERT INTO documents (id, org_id, client_id, report_id, violation_ids, doc_type, doc_subtype, title, recipient_name, recipient_address, content, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(docId, user.org_id, clientId, reportId || null, JSON.stringify(violationIds || []), docType, docDef.category, title, creditorName || null, creditorAddress || null, content, 'draft', user.id).run();

  await c.env.DB.prepare('INSERT INTO activity_log (id, org_id, client_id, document_id, user_id, action, description) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(generateId(), user.org_id, clientId, docId, user.id, 'document_generated', `Generated ${docDef.name}`).run();

  return c.json({ id: docId, title, content, docType, category: docDef.category });
});

// Bulk document generation — generate multiple docs at once
app.post('/api/documents/generate-bulk', authMiddleware, async (c) => {
  const user = c.get('user');
  const { clientId, reportId, docTypes, bureau, creditorName, creditorAddress } = await c.req.json();

  const client = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ? AND org_id = ?').bind(clientId, user.org_id).first() as any;
  if (!client) return c.json({ error: 'Client not found' }, 404);

  const violationsResult = reportId
    ? await c.env.DB.prepare('SELECT * FROM violations WHERE report_id = ? AND org_id = ?').bind(reportId, user.org_id).all()
    : await c.env.DB.prepare('SELECT * FROM violations WHERE client_id = ? AND org_id = ? ORDER BY created_at DESC LIMIT 50').bind(clientId, user.org_id).all();

  const violations = violationsResult?.results || [];
  const generated: any[] = [];

  for (const docType of (docTypes || [])) {
    const docDef = (DOCUMENT_TYPES as any)[docType];
    if (!docDef) continue;

    const docData: DocumentData = {
      clientName: `${client.first_name} ${client.last_name}`,
      clientAddress: client.address_line1 || '',
      clientCity: client.city || '',
      clientState: client.state || '',
      clientZip: client.zip || '',
      clientSSNLast4: client.ssn_last4 || '',
      clientDOB: client.dob || '',
      today: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      violations: violations as any[],
      bureau: bureau || 'Equifax',
      creditorName,
      creditorAddress,
      reportId,
      clientPhone: client.phone || '',
      clientEmail: client.email || '',
    };

    const content = docDef.fn(docData);
    const docId = generateId();
    const title = `${docDef.name} - ${client.first_name} ${client.last_name}`;

    await c.env.DB.prepare(
      'INSERT INTO documents (id, org_id, client_id, report_id, violation_ids, doc_type, doc_subtype, title, recipient_name, recipient_address, content, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(docId, user.org_id, clientId, reportId || null, '[]', docType, docDef.category, title, creditorName || null, creditorAddress || null, content, 'draft', user.id).run();

    generated.push({ id: docId, title, docType, category: docDef.category, content });
  }

  if (generated.length > 0) {
    await c.env.DB.prepare('INSERT INTO activity_log (id, org_id, client_id, user_id, action, description) VALUES (?, ?, ?, ?, ?, ?)').bind(generateId(), user.org_id, clientId, user.id, 'bulk_documents_generated', `Generated ${generated.length} documents`).run();
  }

  return c.json({ documents: generated, count: generated.length });
});

app.get('/api/documents/:id', authMiddleware, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const doc = await c.env.DB.prepare('SELECT * FROM documents WHERE id = ? AND org_id = ?').bind(id, user.org_id).first();
  if (!doc) return c.json({ error: 'Not found' }, 404);
  return c.json({ document: doc });
});

app.put('/api/documents/:id', authMiddleware, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const { content } = await c.req.json();
  await c.env.DB.prepare('UPDATE documents SET content = ?, updated_at = datetime("now") WHERE id = ? AND org_id = ?').bind(content, id, user.org_id).run();
  return c.json({ success: true });
});

app.post('/api/documents/:id/ai-rewrite', authMiddleware, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  // 1. Fetch document and verify authorization
  const doc = await c.env.DB.prepare('SELECT * FROM documents WHERE id = ? AND org_id = ?').bind(id, user.org_id).first() as any;
  if (!doc) return c.json({ error: 'Document not found' }, 404);
  if (!doc.content) return c.json({ error: 'Document has no text content to rewrite' }, 400);

  try {
    // 2. Build system instructions for OCR bypass
    const systemPrompt = `You are an expert consumer advocate and legal drafting specialist.
Your task is to rewrite the provided credit bureau dispute letter to completely bypass automatic Optical Character Recognition (OCR) template-matching scanners.
To do this, you must dynamically and semantically restructure the sentences, headers, list styles, and overall format so that the letter appears completely custom, natural, and unique, as if written by a consumer themselves.

CRITICAL INSTRUCTIONS:
1. You MUST preserve all vital factual information exactly as-is. DO NOT change, omit, or modify any of the following:
   - Full Name, Mailing Address, SSN Last 4, Date of Birth (DOB).
   - Creditor/Furnisher Names, Account Names, and Account Numbers.
   - Specific inaccuracies, dates, disputed amounts, or dollar figures.
   - Statutory citations (e.g., Fair Credit Reporting Act, 15 U.S.C. § 1681i, 15 U.S.C. § 1681s-2(b), etc.).
2. You MUST totally rewrite all other prose, transition sentences, and introductory/concluding paragraphs. Use alternative phrasing, vary sentence lengths, and restructure bullet points or tables.
3. The tone must remain professional, firm, assertive, yet authentic.
4. Return ONLY the rewritten plain text document, with no introductory text, no conversational remarks, and no markdown formatting (like asterisks for bolding). Preserve a clean, professional letter layout.`;

    // 3. Call Cloudflare Workers AI with a Resilient Model Multi-Tier Fallback Pool
    const modelPool = [
      '@cf/meta/llama-3.1-70b-instruct', // Ultra-premium 70B legal reasoning model
      '@cf/meta/llama-3.1-8b-instruct',  // High-performance 8B model
      '@cf/meta/llama-3.2-3b-instruct'   // Standard lightweight fallback
    ];

    let aiResult: any = null;
    let errorDetails = '';

    for (const model of modelPool) {
      try {
        console.log(`[INFO] Attempting dynamic AI rewrite with model: ${model}`);
        aiResult = await c.env.AI.run(model, {
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Here is the dispute letter to rewrite:\n\n${doc.content}` }
          ]
        }) as any;
        if (aiResult?.response) {
          console.log(`[SUCCESS] AI rewrite completed using model: ${model}`);
          break;
        }
      } catch (err: any) {
        console.warn(`[WARN] Model ${model} execution failed or timed out:`, err);
        errorDetails += `${model}: ${err.message || err}; `;
      }
    }

    const rewrittenText = aiResult?.response;
    if (!rewrittenText) {
      return c.json({ error: 'Failed to rewrite document using Cloudflare Workers AI. No response returned. Details: ' + errorDetails }, 500);
    }

    // 4. Update the document in D1
    await c.env.DB.prepare('UPDATE documents SET content = ?, updated_at = datetime("now") WHERE id = ? AND org_id = ?').bind(rewrittenText, id, user.org_id).run();

    // 5. Append to Activity Log
    const activityId = generateId();
    await c.env.DB.prepare('INSERT INTO activity_log (id, org_id, client_id, document_id, user_id, action, description) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(activityId, user.org_id, doc.client_id, id, user.id, 'document_ai_rewritten', `Dynamically rewrote document "${doc.title}" via AI`).run();

    return c.json({ success: true, content: rewrittenText });
  } catch (err: any) {
    console.error('[AI REWRITE ERROR]', err);
    return c.json({ error: `Cloudflare Workers AI Error: ${err.message}` }, 500);
  }
});


// ═══════════════════════════════════════════════════════════════
// FOUNDER OS SUITE INTEGRATION ENDPOINTS
// ═══════════════════════════════════════════════════════════════
app.get('/api/founder-templates', authMiddleware, async (c) => {
  const templates = Object.entries(FOUNDER_TEMPLATES).map(([key, val]) => ({
    id: key,
    name: val.name,
    description: val.description,
    fields: val.fields,
  }));
  return c.json({ templates });
});

app.post('/api/documents/preview-founder', authMiddleware, async (c) => {
  const { templateId, fields } = await c.req.json();
  const template = FOUNDER_TEMPLATES[templateId];
  if (!template) {
    return c.json({ error: 'Template not found' }, 404);
  }
  const content = template.fn(fields || {});
  return c.json({ content });
});

app.post('/api/documents/generate-founder', authMiddleware, async (c) => {
  const user = c.get('user');
  const { clientId, templateId, fields } = await c.req.json();

  const client = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ? AND org_id = ?').bind(clientId, user.org_id).first() as any;
  if (!client) return c.json({ error: 'Client not found' }, 404);

  const template = FOUNDER_TEMPLATES[templateId];
  if (!template) return c.json({ error: 'Template not found' }, 404);

  const content = template.fn(fields || {});
  const docId = generateId();
  const title = `${template.name} - ${client.first_name} ${client.last_name}`;

  await c.env.DB.prepare(
    'INSERT INTO documents (id, org_id, client_id, doc_type, doc_subtype, title, content, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(docId, user.org_id, clientId, templateId, 'founder_os', title, content, 'draft', user.id).run();

  await c.env.DB.prepare('INSERT INTO activity_log (id, org_id, client_id, document_id, user_id, action, description) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(generateId(), user.org_id, clientId, docId, user.id, 'document_generated', `Generated Founder OS: ${template.name}`).run();

  return c.json({ id: docId, title, content, docType: templateId, doc_subtype: 'founder_os' });
});

app.get('/api/documents/:id/pdf', authMiddleware, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  const doc = await c.env.DB.prepare('SELECT * FROM documents WHERE id = ? AND org_id = ?').bind(id, user.org_id).first() as any;
  if (!doc) return c.json({ error: 'Document not found' }, 404);

  // Load B2B organization settings for letterhead and brand personalization
  const org = await c.env.DB.prepare('SELECT name, settings FROM organizations WHERE id = ?').bind(user.org_id).first() as any;
  const settings = JSON.parse(org?.settings || '{}');

  // Support real-time UI overrides via query parameters
  const queryHiredAdvocate = c.req.query('isHiredAdvocate');
  const queryRepAttached = c.req.query('repAgreementAttached');

  const isHiredAdvocate = queryHiredAdvocate !== undefined
    ? queryHiredAdvocate === 'true'
    : (settings.is_hired_advocate === true || settings.is_hired_advocate === 1);

  const repAgreementAttached = queryRepAttached !== undefined
    ? queryRepAttached === 'true'
    : (settings.rep_agreement_attached === true || settings.rep_agreement_attached === 1);

  const customLetterhead = {
    orgName: org?.name || 'RJ Business Solutions',
    logoBase64: settings.letterhead_logo_base64 || undefined,
    headerText: settings.letterhead_title || doc.title,
    customSubtext: settings.letterhead_subtext || (settings.business_address ? `Official Communication from ${org?.name} • ${settings.business_address}` : `Official Dispute Document • FCRA Compliance Engine`),
    isHiredAdvocate,
    repAgreementAttached
  };

  const pdfBytes = generatePDFFromText(doc.title, doc.content, customLetterhead);

  return new Response(pdfBytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="DisputeLetter-${id}.pdf"`,
    },
  });
});

// ═══════════════════════════════════════════════════════════════
// CLICK2MAIL DOCUMENT SENDING
// ═══════════════════════════════════════════════════════════════
app.post('/api/documents/:id/send', authMiddleware, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const { recipientName, recipientAddress, recipientCity, recipientState, recipientZip } = await c.req.json();

  const doc = await c.env.DB.prepare('SELECT * FROM documents WHERE id = ? AND org_id = ?').bind(id, user.org_id).first() as any;
  if (!doc) return c.json({ error: 'Document not found' }, 404);

  const username = c.env.CLICK2MAIL_USERNAME;
  const authBasic = c.env.CLICK2MAIL_AUTH_BASIC;
  const apiUrl = c.env.CLICK2MAIL_API_URL;

  // Step 1: Get account addresses
  const addrRes = await fetch(`${apiUrl}/account/addresses`, {
    headers: {
      'Authorization': `Basic ${authBasic}`,
      'Content-Type': 'application/json',
    },
  });
  if (!addrRes.ok) {
    const errText = await addrRes.text();
    return c.json({ error: `Click2Mail address fetch failed: ${errText}` }, 502);
  }
  const addrData = await addrRes.json() as any;
  const fromAddress = addrData.addresses?.[0]?.id;
  if (!fromAddress) return c.json({ error: 'No sender address found in Click2Mail account' }, 400);

  // Step 2: Create document job (plain text letter)
  const letterContent = doc.content || '';
  const docName = doc.title || 'FCRA Legal Document';

  const createRes = await fetch(`${apiUrl}/documents`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${authBasic}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      documentName: docName,
      documentType: '00',
      fileExtension: 'txt',
      content: btoa(letterContent),
    }),
  });
  if (!createRes.ok) {
    const errText = await createRes.text();
    return c.json({ error: `Click2Mail document creation failed: ${errText}` }, 502);
  }
  const createData = await createRes.json() as any;
  const documentId = createData.id;

  // Step 3: Create mailing
  const mailingRes = await fetch(`${apiUrl}/mailings`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${authBasic}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      documentId,
      fromAddressId: fromAddress,
      toName: recipientName || doc.recipient_name || '',
      toAddress1: recipientAddress || doc.recipient_address || '',
      toCity: recipientCity || '',
      toState: recipientState || '',
      toZip: recipientZip || '',
      toCountry: 'USA',
      mailClass: 'FIRST_CLASS',
      format: 'LETTER',
    }),
  });
  if (!mailingRes.ok) {
    const errText = await mailingRes.text();
    return c.json({ error: `Click2Mail mailing creation failed: ${errText}` }, 502);
  }
  const mailingData = await mailingRes.json() as any;

  // Update document status to "sent" using correct database schema columns
  const mDate = new Date();
  const due = new Date(mDate.getTime() + 35 * 24 * 60 * 60 * 1000);
  const responseDueDateStr = due.toISOString().split('T')[0];
  const sentDateStr = mDate.toISOString().split('T')[0];

  await c.env.DB.prepare(
    'UPDATE documents SET status = ?, sent_date = ?, response_due_date = ?, updated_at = datetime("now") WHERE id = ?'
  ).bind('sent', sentDateStr, responseDueDateStr, id).run();

  await c.env.DB.prepare('INSERT INTO activity_log (id, org_id, client_id, document_id, user_id, action, description) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(generateId(), user.org_id, doc.client_id, id, user.id, 'document_mailed', `Mailed "${doc.title}" to ${recipientName || doc.recipient_name || 'recipient'}`).run();

  return c.json({ success: true, mailingId: mailingData.id, message: `Document mailed successfully` });
});

// ═══════════════════════════════════════════════════════════════
// TEAM / ORG MANAGEMENT
// ═══════════════════════════════════════════════════════════════
app.get('/api/team', authMiddleware, async (c) => {
  const user = c.get('user');
  const result = await c.env.DB.prepare('SELECT id, name, email, role, is_active, last_login, created_at FROM users WHERE org_id = ?').bind(user.org_id).all();
  return c.json({ members: result?.results || [] });
});

app.post('/api/team/invite', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role !== 'admin' && user.role !== 'super_admin') return c.json({ error: 'Admin only' }, 403);

  const planCheck = await verifyOrgPlanLimits(c, 'user');
  if (!planCheck.allowed) return c.json({ error: planCheck.message }, 403);
  
  const { name, email, password, role } = await c.req.json();
  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (existing) return c.json({ error: 'Email already exists' }, 409);

  const id = generateId();
  const hash = await hashPassword(password);
  await c.env.DB.prepare('INSERT INTO users (id, org_id, email, name, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)').bind(id, user.org_id, email, name, hash, role || 'member').run();

  return c.json({ id, message: 'Team member added' }, 201);
});

// ═══════════════════════════════════════════════════════════════
// DOCUMENT TYPE & SETTINGS ENDPOINTS
// ═══════════════════════════════════════════════════════════════
app.get('/api/document-types', (c) => {
  const types = Object.entries(DOCUMENT_TYPES).map(([key, val]) => ({
    id: key,
    name: val.name,
    category: val.category,
    description: val.description,
  }));
  return c.json({ types });
});

app.get('/api/settings/statutes', (c) => {
  return c.json({
    categories: [
      { id: 'FCRA', name: 'Fair Credit Reporting Act', code: '15 U.S.C. § 1681' },
      { id: 'FDCPA', name: 'Fair Debt Collection Practices Act', code: '15 U.S.C. § 1692' },
      { id: 'ECOA', name: 'Equal Credit Opportunity Act', code: '15 U.S.C. § 1691' },
    ],
    severities: ['critical', 'high', 'medium', 'low'],
  });
});

// ═══════════════════════════════════════════════════════════════
// PLATFORM SUPER ADMIN ENDPOINTS (Gated to role === 'super_admin')
// ═══════════════════════════════════════════════════════════════

const adminGateMiddleware = async (c: any, next: any) => {
  const user = c.get('user');
  if (!user || user.role !== 'super_admin') {
    return c.json({ error: 'Forbidden: Platform super_admin access only' }, 403);
  }
  return next();
};

// 1. GET /api/admin/db-stats
app.get('/api/admin/db-stats', authMiddleware, adminGateMiddleware, async (c) => {
  try {
    const orgsCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM organizations').first('count');
    const usersCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM users').first('count');
    const clientsCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM clients').first('count');
    const reportsCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM credit_reports').first('count');
    const violationsCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM violations').first('count');
    const documentsCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM documents').first('count');
    const activeSessionsCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM sessions WHERE expires_at > datetime("now")').first('count');

    return c.json({
      stats: {
        organizations: orgsCount || 0,
        users: usersCount || 0,
        clients: clientsCount || 0,
        reports: reportsCount || 0,
        violations: violationsCount || 0,
        documents: documentsCount || 0,
        active_sessions: activeSessionsCount || 0,
      }
    });
  } catch (err: any) {
    return c.json({ error: `Failed to fetch stats: ${err.message}` }, 500);
  }
});

// 2. GET /api/admin/organizations
app.get('/api/admin/organizations', authMiddleware, adminGateMiddleware, async (c) => {
  try {
    const orgs = await c.env.DB.prepare('SELECT * FROM organizations ORDER BY created_at DESC').all();
    return c.json({ organizations: orgs?.results || [] });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 3. POST /api/admin/organizations/:id
app.post('/api/admin/organizations/:id', authMiddleware, adminGateMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { name, plan, max_users, max_clients, max_reports_per_month } = body;

    await c.env.DB.prepare(
      'UPDATE organizations SET name = ?, plan = ?, max_users = ?, max_clients = ?, max_reports_per_month = ? WHERE id = ?'
    ).bind(name, plan, max_users, max_clients, max_reports_per_month, id).run();

    return c.json({ ok: true, message: 'Organization updated' });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 4. POST /api/admin/organizations/:id/toggle-suspension
app.post('/api/admin/organizations/:id/toggle-suspension', authMiddleware, adminGateMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const org = await c.env.DB.prepare('SELECT settings FROM organizations WHERE id = ?').bind(id).first();
    if (!org) return c.json({ error: 'Organization not found' }, 404);

    const settings = JSON.parse(org.settings || '{}');
    const isSuspended = !!settings.suspended;
    settings.suspended = !isSuspended;

    await c.env.DB.prepare('UPDATE organizations SET settings = ? WHERE id = ?').bind(JSON.stringify(settings), id).run();

    // Log the action
    const adminUser = c.get('user');
    await c.env.DB.prepare(
      'INSERT INTO activity_log (id, org_id, user_id, action, description, metadata) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(
      generateId(),
      adminUser.org_id,
      adminUser.id,
      'admin_toggle_suspension',
      `Toggled suspension of organization ${id} to ${settings.suspended}`,
      JSON.stringify({ target_org: id, suspended: settings.suspended })
    ).run();

    return c.json({ ok: true, suspended: settings.suspended });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 5. GET /api/admin/users
app.get('/api/admin/users', authMiddleware, adminGateMiddleware, async (c) => {
  try {
    const query = `
      SELECT u.id, u.name, u.email, u.role, u.is_active, u.last_login, u.created_at, o.name as org_name, o.id as org_id 
      FROM users u 
      JOIN organizations o ON u.org_id = o.id 
      ORDER BY u.created_at DESC
    `;
    const users = await c.env.DB.prepare(query).all();
    return c.json({ users: users?.results || [] });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 5.5. POST /api/admin/users
app.post('/api/admin/users', authMiddleware, adminGateMiddleware, async (c) => {
  try {
    const { name, email, password, role, org_id } = await c.req.json();
    if (!name || !email || !password || !role || !org_id) {
      return c.json({ error: 'All fields are required (name, email, password, role, org_id)' }, 400);
    }

    const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
    if (existing) {
      return c.json({ error: 'Email already exists' }, 409);
    }

    const id = generateId();
    const hash = await hashPassword(password);
    await c.env.DB.prepare('INSERT INTO users (id, org_id, email, name, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(id, org_id, email, name, hash, role)
      .run();

    // Log the action
    const adminUser = c.get('user');
    await c.env.DB.prepare(
      'INSERT INTO activity_log (id, org_id, user_id, action, description, metadata) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(
      generateId(),
      adminUser.org_id,
      adminUser.id,
      'admin_create_user',
      `Created user ${name} (${email}) with role ${role} under organization ${org_id}`,
      JSON.stringify({ created_user_id: id, email, role, org_id })
    ).run();

    return c.json({ id, message: 'User created successfully' }, 201);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 5.6. POST /api/admin/users/:id/reset-password
app.post('/api/admin/users/:id/reset-password', authMiddleware, adminGateMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const { password } = await c.req.json();
    if (!password || password.length < 6) {
      return c.json({ error: 'Password must be at least 6 characters' }, 400);
    }

    const user = await c.env.DB.prepare('SELECT id, name, email FROM users WHERE id = ?').bind(id).first();
    if (!user) return c.json({ error: 'User not found' }, 404);

    const hash = await hashPassword(password);
    await c.env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(hash, id).run();

    // Log the action
    const adminUser = c.get('user');
    await c.env.DB.prepare(
      'INSERT INTO activity_log (id, org_id, user_id, action, description, metadata) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(
      generateId(),
      adminUser.org_id,
      adminUser.id,
      'admin_reset_user_password',
      `Reset password of user ${user.name} (${user.email})`,
      JSON.stringify({ target_user_id: id })
    ).run();

    return c.json({ ok: true, message: 'Password reset successfully' });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 6. POST /api/admin/users/:id/toggle-status
app.post('/api/admin/users/:id/toggle-status', authMiddleware, adminGateMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const user = await c.env.DB.prepare('SELECT is_active, org_id FROM users WHERE id = ?').bind(id).first();
    if (!user) return c.json({ error: 'User not found' }, 404);

    const newStatus = user.is_active === 1 ? 0 : 1;
    await c.env.DB.prepare('UPDATE users SET is_active = ? WHERE id = ?').bind(newStatus, id).run();

    // Force expire any active sessions for the suspended user instantly
    if (newStatus === 0) {
      await c.env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id).run();
    }

    // Log the action
    const adminUser = c.get('user');
    await c.env.DB.prepare(
      'INSERT INTO activity_log (id, org_id, user_id, action, description, metadata) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(
      generateId(),
      adminUser.org_id,
      adminUser.id,
      'admin_toggle_user_status',
      `Toggled status of user ${id} to ${newStatus === 1 ? 'Active' : 'Suspended'}`,
      JSON.stringify({ target_user: id, is_active: newStatus })
    ).run();

    return c.json({ ok: true, is_active: newStatus });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 7. GET /api/admin/logs
app.get('/api/admin/logs', authMiddleware, adminGateMiddleware, async (c) => {
  try {
    const query = `
      SELECT l.*, u.email as user_email, o.name as org_name 
      FROM activity_log l 
      JOIN users u ON l.user_id = u.id 
      JOIN organizations o ON l.org_id = o.id 
      ORDER BY l.created_at DESC 
      LIMIT 100
    `;
    const logs = await c.env.DB.prepare(query).all();
    return c.json({ logs: logs?.results || [] });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 8. GET /api/admin/global-clients
app.get('/api/admin/global-clients', authMiddleware, adminGateMiddleware, async (c) => {
  try {
    const query = `
      SELECT c.*, o.name as org_name, u.name as creator_name
      FROM clients c 
      JOIN organizations o ON c.org_id = o.id 
      LEFT JOIN users u ON c.created_by = u.id
      ORDER BY c.created_at DESC
    `;
    const clients = await c.env.DB.prepare(query).all();
    return c.json({ clients: clients?.results || [] });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 9. GET /api/admin/global-reports
app.get('/api/admin/global-reports', authMiddleware, adminGateMiddleware, async (c) => {
  try {
    const query = `
      SELECT cr.id, cr.bureau, cr.file_name, cr.file_size, cr.status, cr.total_accounts, cr.created_at, cr.org_id,
             c.first_name, c.last_name, o.name as org_name
      FROM credit_reports cr
      JOIN clients c ON cr.client_id = c.id
      JOIN organizations o ON cr.org_id = o.id
      ORDER BY cr.created_at DESC
    `;
    const reports = await c.env.DB.prepare(query).all();
    return c.json({ reports: reports?.results || [] });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 10. GET /api/admin/global-documents
app.get('/api/admin/global-documents', authMiddleware, adminGateMiddleware, async (c) => {
  try {
    const query = `
      SELECT d.id, d.title, d.doc_type, d.status, d.created_at, d.org_id,
             c.first_name, c.last_name, o.name as org_name
      FROM documents d
      JOIN clients c ON d.client_id = c.id
      JOIN organizations o ON d.org_id = o.id
      ORDER BY d.created_at DESC
    `;
    const docs = await c.env.DB.prepare(query).all();
    return c.json({ documents: docs?.results || [] });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 11. POST /api/send-email (FCRA Dispute & Pre-Litigation Campaign Dispatch)
app.post('/api/send-email', authMiddleware, async (c) => {
  const user = c.get('user');
  const { to, subject, html } = await c.req.json();
  if (!to || !subject || !html) {
    return c.json({ error: 'Missing required parameters (to, subject, html)' }, 400);
  }

  let sent = false;
  let details = 'Simulated Delivery';

  if (c.env.RESEND_API_KEY) {
    try {
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${c.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'SmartFCRA™ Supreme <notifications@rjbusinesssolutions.org>',
          to,
          subject,
          html
        })
      });

      if (resendResponse.ok) {
        sent = true;
        details = 'Delivered via Resend';
      } else {
        const errText = await resendResponse.text();
        console.warn('[EMAIL] Resend delivery failed, falling back to simulation:', errText);
        details = `Fallback Simulation: Resend returned status ${resendResponse.status}`;
      }
    } catch (err: any) {
      console.warn('[EMAIL] Resend network error, falling back to simulation:', err.message);
      details = `Fallback Simulation: Network error - ${err.message}`;
    }
  }

  // Always log email dispatch inside activity_log
  const logId = generateId();
  await c.env.DB.prepare(
    'INSERT INTO activity_log (id, org_id, user_id, action, description, metadata) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(
    logId,
    user.org_id,
    user.id,
    'email_sent',
    `Sent email to ${to}: "${subject}" (${details})`,
    JSON.stringify({ to, subject, details })
  ).run();

  return c.json({ success: true, sent, details });
});

// 12. POST /api/marketing/campaign/trigger (FCRA Outreach Campaign Dispatch)
app.post('/api/marketing/campaign/trigger', authMiddleware, async (c) => {
  const user = c.get('user');
  const { clientId, campaignId, step } = await c.req.json();

  if (!clientId || !campaignId || !step) {
    return c.json({ error: 'Missing required parameters (clientId, campaignId, step)' }, 400);
  }

  try {
    // 1. Fetch client details
    const client = await c.env.DB.prepare(
      'SELECT * FROM clients WHERE id = ? AND org_id = ?'
    ).bind(clientId, user.org_id).first();

    if (!client) {
      return c.json({ error: 'Client not found' }, 404);
    }

    // 2. Query violations count and estimate damages
    const violationSummary = await c.env.DB.prepare(
      'SELECT COUNT(*) as count, SUM(total_damages_max) as total_damages FROM violations WHERE client_id = ? AND org_id = ?'
    ).bind(clientId, user.org_id).first();

    const violationCount = violationSummary?.count || 0;
    const estimatedDamages = violationSummary?.total_damages || 0;

    // 3. Define outreach email templates based on 06_EMAIL_CAMPAIGNS.md
    const campaigns: Record<string, Record<number, { subject: string; body: string }>> = {
      'cold-outreach': {
        1: {
          subject: `Quick question about ${client.first_name}'s credit report workflow`,
          body: `Hi ${client.first_name},<br><br>
            Quick question: How many credit reports are you analyzing per week right now?<br><br>
            I ask because our automated scan found <strong>${violationCount} core violations</strong> on your report, representing up to <strong>$${(estimatedDamages || violationCount * 1000).toLocaleString()}</strong> in estimated statutory damages under the FCRA and FDCPA (15 U.S.C. § 1681).<br><br>
            We built software that does this analysis in 15 minutes, uncovering re-aging, Metro 2 formatting errors, and state law violations that manual reviews completely miss.<br><br>
            Worth a 15-minute call to see if it fits your workflow?<br><br>
            Best,<br>
            ${user.name}<br>
            RJ Business Solutions`
        },
        2: {
          subject: `Re: Quick question about ${client.first_name}'s credit report`,
          body: `Hi ${client.first_name},<br><br>
            Following up on my previous message. Most credit repair operators miss up to 40% of actionable violations because manual reviews cannot catch:<br>
            - Re-aging (DOFD manipulation)<br>
            - Technical Metro 2 formatting mismatches<br>
            - Unlawful collection on state statute-of-limitation (SOL) expired debts<br><br>
            We found <strong>${violationCount} specific violations</strong> on your report. Our automated letter generator compiles lawsuit-grade dispute documents citing exact case law in seconds.<br><br>
            Would a 15-minute demo be worth your time?<br><br>
            Best,<br>
            ${user.name}`
        },
        3: {
          subject: `How we recovered $${(estimatedDamages || violationCount * 1000).toLocaleString()} in statutory violations`,
          body: `Hi ${client.first_name},<br><br>
            I wanted to share a quick case study of how we help operators turn credit inaccuracies into heavy leverage.<br><br>
            By identifying the exact <strong>${violationCount} violations</strong> on your file (representing a valuation of up to $${(estimatedDamages || violationCount * 1000).toLocaleString()}), our platform automatically constructs dispute packages that force bureau and creditor liability.<br><br>
            Instead of spending hours manually drafting letters, let our automated system do the heavy lifting in seconds.<br><br>
            Let's grab 15 minutes to review your parsed dashboard: [CALENDAR_LINK]<br><br>
            Best,<br>
            ${user.name}`
        }
      }
    };

    const campaign = campaigns[campaignId];
    if (!campaign) {
      return c.json({ error: 'Invalid campaign ID' }, 400);
    }

    const template = campaign[parseInt(step, 10)];
    if (!template) {
      return c.json({ error: 'Invalid campaign step' }, 400);
    }

    // 4. In a production system, this would send an email. We will invoke our send-email simulation/Resend flow
    let sent = false;
    let details = 'Simulated Outreach Delivery';

    if (c.env.RESEND_API_KEY && client.email) {
      try {
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${c.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'SmartFCRA™ Campaign <notifications@rjbusinesssolutions.org>',
            to: client.email,
            subject: template.subject,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff;">
                <div style="text-align: center; margin-bottom: 20px;">
                  <img src="https://storage.googleapis.com/msgsndr/qQnxRHDtyx0uydPd5sRl/media/67eb83c5e519ed689430646b.jpeg" alt="RJ Business Solutions" style="max-height: 50px; border-radius: 8px;">
                </div>
                <div style="color: #1e293b; line-height: 1.6; font-size: 14px;">
                  ${template.body}
                </div>
                <div style="margin-top: 30px; border-t: 1px solid #e2e8f0; padding-top: 15px; font-size: 11px; color: #64748b; text-align: center;">
                  RJ Business Solutions | 1342 NM 333, Tijeras, New Mexico 87059
                </div>
              </div>
            `
          })
        });

        if (resendResponse.ok) {
          sent = true;
          details = 'Delivered via Resend';
        }
      } catch (err: any) {
        console.warn('[CAMPAIGN] Resend failed, fell back to simulation:', err.message);
      }
    }

    // Always log the campaign dispatch in activity_log
    const logId = generateId();
    await c.env.DB.prepare(
      'INSERT INTO activity_log (id, org_id, client_id, user_id, action, description, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      logId,
      user.org_id,
      clientId,
      user.id,
      'marketing_campaign_sent',
      `Triggered ${campaignId} (Step ${step}) email to ${client.first_name} ${client.last_name}: "${template.subject}"`,
      JSON.stringify({ campaignId, step, sent, details })
    ).run();

    return c.json({ success: true, sent, details, subject: template.subject });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════
// SERVE FRONTEND SPA
// ═══════════════════════════════════════════════════════════════
app.get('*', async (c) => {
  const path = c.req.path;

  // Serve static HTML files directly (legal pages, etc.)
  if (path.startsWith('/content/') || path.startsWith('/legal/') || path.startsWith('/compliance/')) {
    // Get the filename and map to content directory
    const segments = path.split('/').filter(Boolean);
    const filename = segments[segments.length - 1];
    let contentPath = path;

    // Map /legal/terms -> /content/legal-terms.html
    if (path.startsWith('/legal/')) {
      contentPath = `/content/legal-${filename}.html`;
    } else if (path.startsWith('/compliance/')) {
      contentPath = `/content/legal-${filename}.html`;
    }

    // Static files are in the dist folder, accessed via Workers static asset API
    // For Cloudflare Pages, static files are served automatically when excluded from SPA
    // But since we're using SPA mode, we need to serve them here
    try {
      // Read the static file from the bundle - this works because _worker.js IS the dist folder
      const staticContent = await getStaticFile(contentPath);
      if (staticContent) {
        return c.html(staticContent);
      }
    } catch (e) {
      // Fall through to SPA
    }
  }

  return c.html(getAppHtml());
});

// Helper to serve static HTML files
async function getStaticFile(path: string): Promise<string | null> {
  const staticFiles: Record<string, string> = {
    '/content/legal-terms.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Terms of Service | FCRA Supreme Detector</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <style>
    body { background: #030014; color: #e5e7eb; font-family: system-ui, -apple-system, sans-serif; }
    .glass { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); backdrop-filter: blur(40px); }
  </style>
</head>
<body class="min-h-screen">
  <div class="max-w-4xl mx-auto px-4 py-12">
    <div class="flex items-center gap-4 mb-10">
      <div class="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
        <i class="fas fa-shield-alt text-xl text-blue-400"></i>
      </div>
      <div>
        <h1 class="text-xl font-bold text-white">FCRA Supreme Detector</h1>
        <p class="text-xs text-gray-500">RJ Business Solutions</p>
      </div>
    </div>
    <div class="glass rounded-2xl p-8 mb-8">
      <h2 class="text-2xl font-bold text-white mb-2">Terms of Service</h2>
      <p class="text-sm text-gray-500 mb-6">Last updated: April 22, 2026</p>
      <div class="prose prose-invert prose-sm max-w-none text-gray-300">
        <p>By using the FCRA Supreme Violation Detector service, you agree to be bound by these Terms of Service.</p>
        <h3 class="text-lg font-semibold text-white mt-6 mb-3">1. Acceptance of Terms</h3>
        <p>These Terms of Service govern your use of the FCRA Supreme Violation Detector operated by RJ Business Solutions.</p>
        <h3 class="text-lg font-semibold text-white mt-6 mb-3">2. Use of Service</h3>
        <p>You may use this service solely for lawful purposes. You agree not to use the service in any way that violates applicable laws.</p>
        <h3 class="text-lg font-semibold text-white mt-6 mb-3">3. Disclaimer</h3>
        <p>This service provides dispute document preparation only. It is NOT legal advice. Consult an attorney for legal counsel.</p>
        <h3 class="text-lg font-semibold text-white mt-6 mb-3">4. Limitation of Liability</h3>
        <p>RJ Business Solutions shall not be liable for any damages arising from your use of this service.</p>
      </div>
    </div>
    <div class="text-center text-sm text-gray-500">
      <p>RJ Business Solutions | 1342 NM 333, Tijeras, New Mexico 87059</p>
    </div>
  </div>
</body>
</html>`,
    '/content/legal-privacy.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Privacy Policy | FCRA Supreme Detector</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <style>
    body { background: #030014; color: #e5e7eb; font-family: system-ui, -apple-system, sans-serif; }
    .glass { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); backdrop-filter: blur(40px); }
  </style>
</head>
<body class="min-h-screen">
  <div class="max-w-4xl mx-auto px-4 py-12">
    <div class="flex items-center gap-4 mb-10">
      <div class="w-12 h-12 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
        <i class="fas fa-shield-alt text-xl text-purple-400"></i>
      </div>
      <div>
        <h1 class="text-xl font-bold text-white">FCRA Supreme Detector</h1>
        <p class="text-xs text-gray-500">RJ Business Solutions</p>
      </div>
    </div>
    <div class="glass rounded-2xl p-8 mb-8">
      <h2 class="text-2xl font-bold text-white mb-2">Privacy Policy</h2>
      <p class="text-sm text-gray-500 mb-6">Last updated: April 22, 2026</p>
      <div class="prose prose-invert prose-sm max-w-none text-gray-300">
        <p>We take your privacy seriously. This policy describes how we collect, use, and protect your personal information.</p>
        <h3 class="text-lg font-semibold text-white mt-6 mb-3">Information We Collect</h3>
        <p>We collect information you provide directly, including name, email, address, and credit report data.</p>
        <h3 class="text-lg font-semibold text-white mt-6 mb-3">How We Use Your Information</h3>
        <p>We use your information to provide credit report analysis, generate dispute documents, and improve our services.</p>
        <h3 class="text-lg font-semibold text-white mt-6 mb-3">Data Security</h3>
        <p>We implement industry-standard security measures to protect your personal information.</p>
      </div>
    </div>
    <div class="text-center text-sm text-gray-500">
      <p>RJ Business Solutions | 1342 NM 333, Tijeras, New Mexico 87059</p>
    </div>
  </div>
</body>
</html>`,
    '/content/legal-disclaimers.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Disclaimers | FCRA Supreme Detector</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <style>
    body { background: #030014; color: #e5e7eb; font-family: system-ui, -apple-system, sans-serif; }
    .glass { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); backdrop-filter: blur(40px); }
  </style>
</head>
<body class="min-h-screen">
  <div class="max-w-4xl mx-auto px-4 py-12">
    <div class="flex items-center gap-4 mb-10">
      <div class="w-12 h-12 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center">
        <i class="fas fa-exclamation-triangle text-xl text-amber-400"></i>
      </div>
      <div>
        <h1 class="text-xl font-bold text-white">FCRA Supreme Detector</h1>
        <p class="text-xs text-gray-500">RJ Business Solutions</p>
      </div>
    </div>
    <div class="glass rounded-2xl p-8 mb-8">
      <h2 class="text-2xl font-bold text-white mb-2">Important Disclaimers</h2>
      <p class="text-sm text-gray-500 mb-6">Last updated: April 22, 2026</p>
      <div class="prose prose-invert prose-sm max-w-none text-gray-300">
        <div class="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-6">
          <p class="text-amber-200 font-semibold"><i class="fas fa-exclamation-triangle mr-2"></i>FCRA NOTICE</p>
          <p class="text-amber-100/80 text-sm mt-2">We prepare dispute documents only. This is NOT legal advice.</p>
        </div>
        <h3 class="text-lg font-semibold text-white mt-6 mb-3">Document Preparation Service</h3>
        <p>This service provides credit report dispute document preparation. We are not attorneys and do not provide legal advice.</p>
        <h3 class="text-lg font-semibold text-white mt-6 mb-3">No Guarantee of Results</h3>
        <p>While we strive to provide accurate analysis, we cannot guarantee specific outcomes from credit bureau investigations.</p>
        <h3 class="text-lg font-semibold text-white mt-6 mb-3">Consult an Attorney</h3>
        <p>For legal advice regarding your credit situation, please consult with a qualified attorney.</p>
      </div>
    </div>
    <div class="text-center text-sm text-gray-500">
      <p>RJ Business Solutions | 1342 NM 333, Tijeras, New Mexico 87059</p>
    </div>
  </div>
</body>
</html>`,
  };

  return staticFiles[path] || null;
}

function getAppHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FCRA Supreme Violation Detector</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.0/css/all.min.css" rel="stylesheet">
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: { 50:'#eff6ff',100:'#dbeafe',200:'#bfdbfe',300:'#93c5fd',400:'#60a5fa',500:'#3b82f6',600:'#2563eb',700:'#1d4ed8',800:'#1e40af',900:'#1e3a8a' },
            danger: { 500:'#ef4444',600:'#dc2626' },
            success: { 500:'#22c55e',600:'#16a34a' },
            warn: { 500:'#f59e0b',600:'#d97706' },
          }
        }
      }
    }
  </script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap');
    
    * { 
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif; 
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    h1, h2, h3, .font-title {
      font-family: 'Space Grotesk', system-ui, sans-serif;
    }

    .glass { 
      background: rgba(10, 15, 30, 0.6); 
      backdrop-filter: blur(24px) saturate(180%); 
      -webkit-backdrop-filter: blur(24px) saturate(180%); 
      border: 1px solid rgba(255, 255, 255, 0.08); 
      box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
    }

    .glass-premium {
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%);
      backdrop-filter: blur(30px);
      -webkit-backdrop-filter: blur(30px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1), 0 20px 50px rgba(0, 0, 0, 0.4);
    }

    .gradient-bg { 
      background: radial-gradient(circle at 50% 0%, #172554 0%, #0f172a 60%, #020617 100%); 
    }

    .card-hover { 
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
    }

    .card-hover:hover { 
      transform: translateY(-4px) scale(1.01); 
      border-color: rgba(59, 130, 246, 0.35);
      box-shadow: 0 12px 30px rgba(10, 102, 255, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.15); 
    }

    .severity-critical { border-left: 5px solid #ef4444; background: linear-gradient(90deg, rgba(239, 68, 68, 0.05) 0%, transparent 100%); }
    .severity-high { border-left: 5px solid #f97316; background: linear-gradient(90deg, rgba(249, 115, 22, 0.05) 0%, transparent 100%); }
    .severity-medium { border-left: 5px solid #eab308; background: linear-gradient(90deg, rgba(234, 179, 8, 0.05) 0%, transparent 100%); }
    .severity-low { border-left: 5px solid #22c55e; background: linear-gradient(90deg, rgba(34, 197, 94, 0.05) 0%, transparent 100%); }

    .fade-in { 
      animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1); 
    }

    @keyframes fadeIn { 
      from { opacity: 0; transform: translateY(12px); } 
      to { opacity: 1; transform: translateY(0); } 
    }

    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: #020617; }
    ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 4px; border: 2px solid #020617; }
    ::-webkit-scrollbar-thumb:hover { background: #334155; }

    .pulse-glow { animation: pulseGlow 3s ease-in-out infinite; }
    @keyframes pulseGlow { 
      0%, 100% { box-shadow: 0 0 10px rgba(59, 130, 246, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.05); } 
      50% { box-shadow: 0 0 25px rgba(59, 130, 246, 0.55), inset 0 1px 1px rgba(255, 255, 255, 0.15); border-color: rgba(59, 130, 246, 0.5); } 
    }

    .step-done { background: rgba(34, 197, 94, 0.12); border-color: rgba(34, 197, 94, 0.35); color: #4ade80; }
    .step-active { background: rgba(59, 130, 246, 0.15); border-color: rgba(59, 130, 246, 0.45); color: #60a5fa; box-shadow: 0 0 15px rgba(59, 130, 246, 0.25); }
    .step-pending { background: rgba(100, 116, 139, 0.06); border-color: rgba(100, 116, 139, 0.2); color: #94a3b8; }
    
    @keyframes progressPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
    .progress-pulse { animation: progressPulse 1.2s ease-in-out infinite; }

    /* Elegant brand styling */
    .brand-glow {
      text-shadow: 0 0 20px rgba(10, 102, 255, 0.4);
    }
  </style>
</head>
<body class="gradient-bg min-h-screen text-gray-100">
  <div id="app"></div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js"></script>
  <script>
    if (window.pdfjsLib) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
    }
  </script>
  <script src="/static/app.js"></script>
</body>
</html>`;
}

export default app;
