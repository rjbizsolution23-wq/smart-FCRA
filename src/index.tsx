import { Hono } from 'hono';
import { cors } from 'hono/cors';
import Stripe from 'stripe';
import { generateId, hashPassword, verifyPassword, createSessionToken, generateEmailToken } from './lib/auth';
import { parseCreditReportText } from './engine/parser';
import { detectViolations, calculateLitigationScore } from './engine/violations';
import { mapMfsnToInternal } from './engine/mfsn-mapper';
import { mapSmartCreditToInternal } from './engine/smartcredit-mapper';
import { DOCUMENT_TYPES, type DocumentData } from './engine/documents';
import { generatePDFReport, type PDFReportData, generatePDFFromText } from './engine/pdf-generator';
import { FOUNDER_TEMPLATES } from './engine/founder-templates';

type Bindings = {
  DB: D1Database;
  STRIPE_API_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  FRONTEND_URL: string;
  CLICK2MAIL_USERNAME: string;
  CLICK2MAIL_AUTH_BASIC: string;
  CLICK2MAIL_API_URL: string;
  AI: any;
};
type Variables = { user?: any; org?: any; session?: any };

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Stripe initialization helper
const getStripe = (env: Bindings) => new Stripe(env.STRIPE_API_KEY, {
  httpClient: Stripe.createFetchHttpClient(),
});

app.use('/api/*', cors());

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
    'SELECT s.*, u.id as user_id, u.name as user_name, u.email as user_email, u.role as user_role, u.org_id FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.id = ? AND s.expires_at > datetime("now")'
  ).bind(sessionId).first();

  if (!session) return c.json({ error: 'Session expired' }, 401);
  c.set('user', { id: session.user_id, name: session.user_name, email: session.user_email, role: session.user_role, org_id: session.org_id });
  c.set('session', session);
  return next();
}

// ═══════════════════════════════════════════════════════════════
// HEALTH CHECK
app.get('/api/health', async (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    region: c.req.header('CF-Region') || 'unknown',
  });
});

// AUTH ROUTES
// ═══════════════════════════════════════════════════════════════
app.post('/api/auth/register', async (c) => {
  const { name, email, password, orgName } = await c.req.json();
  if (!name || !email || !password || !orgName) return c.json({ error: 'All fields required' }, 400);

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (existing) return c.json({ error: 'Email already registered' }, 409);

  let orgId: string, userId: string, slug: string, passwordHash: string, token: string;
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
    return c.json({ error: 'Internal error (hashing)' }, 500);
  }

  try {
    await c.env.DB.batch([
      c.env.DB.prepare('INSERT INTO organizations (id, name, slug, plan) VALUES (?, ?, ?, ?)').bind(orgId, orgName, slug, 'free'),
      c.env.DB.prepare('INSERT INTO users (id, org_id, email, name, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)').bind(userId, orgId, email, name, passwordHash, 'admin'),
    ]);
  } catch (e: any) {
    console.error('[REGISTER] batch insert failed:', e.message, e.stack);
    if (e.message?.includes('UNIQUE')) return c.json({ error: 'Organization name already taken' }, 409);
    return c.json({ error: `Internal error (db insert): ${e.message}` }, 500);
  }

  let sessionToken: string;
  try {
    sessionToken = createSessionToken();
  } catch (e: any) {
    console.error('[REGISTER] createSessionToken failed:', e);
    return c.json({ error: 'Internal error (token gen)' }, 500);
  }

  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  try {
    await c.env.DB.prepare('INSERT INTO sessions (id, user_id, org_id, expires_at) VALUES (?, ?, ?, ?)').bind(sessionToken, userId, orgId, expires).run();
  } catch (e: any) {
    console.error('[REGISTER] session insert failed:', e.message, e.stack);
    return c.json({ error: `Internal error (session): ${e.message}` }, 500);
  }

  return c.json({ token: sessionToken, user: { id: userId, name, email, role: 'admin', org_id: orgId }, org: { id: orgId, name: orgName, plan: 'free' } });
});

app.post('/api/auth/login', async (c) => {
  const { email, password } = await c.req.json();
  if (!email || !password) return c.json({ error: 'Email and password required' }, 400);

  const user = await c.env.DB.prepare('SELECT u.*, o.name as org_name, o.plan as org_plan FROM users u JOIN organizations o ON u.org_id = o.id WHERE u.email = ? AND u.is_active = 1').bind(email).first() as any;
  if (!user) return c.json({ error: 'Invalid credentials' }, 401);

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) return c.json({ error: 'Invalid credentials' }, 401);

  const token = createSessionToken();
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await c.env.DB.prepare('INSERT INTO sessions (id, user_id, org_id, expires_at) VALUES (?, ?, ?, ?)').bind(token, user.id, user.org_id, expires).run();
  await c.env.DB.prepare('UPDATE users SET last_login = datetime("now") WHERE id = ?').bind(user.id).run();

  return c.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, org_id: user.org_id }, org: { id: user.org_id, name: user.org_name, plan: user.org_plan } });
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

  const user = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first() as any;
  if (!user) {
    // Don't reveal whether email exists
    return c.json({ ok: true, message: 'If the email exists, a reset link has been sent' });
  }

  const token = generateEmailToken();
  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

  await c.env.DB.prepare(
    'INSERT INTO password_reset_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)'
  ).bind(generateId(), user.id, token, expires).run();

  // In production: send email via your email provider (Resend, SendGrid, etc.)
  // For now, return token directly so the frontend can show the link in dev
  const resetUrl = `https://rickjeffersonsolutions.com/reset-password?token=${token}`;
  console.log(`[PASSWORD RESET] ${email} -> ${resetUrl}`);

  return c.json({ ok: true, message: 'If the email exists, a reset link has been sent', debugToken: token });
});

app.post('/api/auth/reset-password', async (c) => {
  const { token, password } = await c.req.json();
  if (!token || !password) return c.json({ error: 'Token and new password required' }, 400);

  const record = await c.env.DB.prepare(
    'SELECT * FROM password_reset_tokens WHERE token = ? AND expires_at > datetime("now")'
  ).bind(token).first() as any;
  if (!record) return c.json({ error: 'Invalid or expired token' }, 400);

  const newHash = await hashPassword(password);
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(newHash, record.user_id),
    c.env.DB.prepare('DELETE FROM password_reset_tokens WHERE token = ?').bind(token),
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

  await c.env.DB.prepare(
    'INSERT INTO clients (id, org_id, created_by, first_name, last_name, email, phone, address_line1, address_line2, city, state, zip, dob, ssn_last4, notes, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, user.org_id, user.id, firstName, lastName, data.email || null, data.phone || null, data.addressLine1 || null, data.addressLine2 || null, data.city || null, data.state || null, data.zip || null, data.dob || null, data.ssnLast4 || null, data.notes || null, JSON.stringify(data.tags || [])).run();

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

  return c.json({ client, reports: reports?.results || [], violations: violations?.results || [], documents: documents?.results || [], activity: activity?.results || [] });
});

app.put('/api/clients/:id', authMiddleware, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const data = await c.req.json();

  await c.env.DB.prepare(
    'UPDATE clients SET first_name=?, last_name=?, email=?, phone=?, address_line1=?, city=?, state=?, zip=?, notes=?, status=?, updated_at=datetime("now") WHERE id=? AND org_id=?'
  ).bind(data.firstName, data.lastName, data.email, data.phone, data.addressLine1, data.city, data.state, data.zip, data.notes, data.status || 'active', id, user.org_id).run();

  return c.json({ ok: true });
});

// ═══════════════════════════════════════════════════════════════
// CREDIT REPORT UPLOAD & FULL-PROCESS ANALYSIS
// ═══════════════════════════════════════════════════════════════
app.post('/api/reports/upload', authMiddleware, async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const { clientId, bureau, rawText, fileName } = body;

  if (!clientId || !rawText) return c.json({ error: 'Client ID and report text required' }, 400);

  const reportId = generateId();

  // Parse the report
  const parsed = parseCreditReportText(rawText);
  
  // Detect violations
  const violations = detectViolations(parsed);
  const litScore = calculateLitigationScore(violations);

  // Save report
  await c.env.DB.prepare(
    'INSERT INTO credit_reports (id, org_id, client_id, uploaded_by, bureau, report_date, file_name, raw_text, parsed_data, status, total_accounts, total_inquiries, total_public_records, total_collections, analysis_started_at, analysis_completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))'
  ).bind(reportId, user.org_id, clientId, user.id, parsed.bureau || bureau || 'Unknown', parsed.reportDate, fileName || 'upload.txt', rawText, JSON.stringify(parsed), 'analyzed', parsed.accounts.length, parsed.inquiries.length, parsed.publicRecords.length, parsed.collections.length).run();

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

app.post('/api/reports/mfsn-import', authMiddleware, async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const { clientId, mfsnData } = body;

  if (!clientId || !mfsnData) return c.json({ error: 'Client ID and MFSN data required' }, 400);

  // Map MFSN data to internal reports (usually returns one per bureau)
  const mappedReports = mapMfsnToInternal(mfsnData);
  const results = [];

  for (const report of mappedReports) {
    const reportId = generateId();
    
    // Detect violations for this specific bureau report
    const violations = detectViolations(report);
    const litScore = calculateLitigationScore(violations);

    // Save report
    await c.env.DB.prepare(
      'INSERT INTO credit_reports (id, org_id, client_id, uploaded_by, bureau, report_date, file_name, raw_text, parsed_data, status, total_accounts, total_inquiries, total_public_records, total_collections, analysis_started_at, analysis_completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))'
    ).bind(reportId, user.org_id, clientId, user.id, report.bureau, report.reportDate, `mfsn-import-${report.bureau}.json`, JSON.stringify(mfsnData), JSON.stringify(report), 'analyzed', report.accounts.length, report.inquiries.length, report.publicRecords.length, report.collections.length).run();

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
    'professional': { amount: 19900, name: 'Professional Plan', interval: 'month' },
    'enterprise': { amount: 39900, name: 'Enterprise Plan', interval: 'month' },
    'unlimited': { amount: 79900, name: 'Unlimited Plan', interval: 'month' }
  };

  const plan = planPrices[planId as string];
  if (!plan) return c.json({ error: 'Invalid plan' }, 400);

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: plan.name },
          unit_amount: plan.amount,
          recurring: { interval: plan.interval as 'month' }
        },
        quantity: 1
      }],
      mode: 'subscription',
      success_url: `${c.env.FRONTEND_URL}/dashboard?checkout=success`,
      cancel_url: `${c.env.FRONTEND_URL}/billing?checkout=cancelled`,
      client_reference_id: user.org_id,
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
      const plan = priceId === process.env.STRIPE_UNLIMITED_PRICE_ID ? 'unlimited'
        : priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID ? 'enterprise'
        : priceId === process.env.STRIPE_PROFESSIONAL_PRICE_ID ? 'professional' : 'professional';

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
          const plan = priceId === process.env.STRIPE_UNLIMITED_PRICE_ID ? 'unlimited'
            : priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID ? 'enterprise'
            : priceId === process.env.STRIPE_PROFESSIONAL_PRICE_ID ? 'professional' : 'professional';
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
        const plan = priceId === process.env.STRIPE_UNLIMITED_PRICE_ID ? 'unlimited'
          : priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID ? 'enterprise'
          : priceId === process.env.STRIPE_PROFESSIONAL_PRICE_ID ? 'professional' : 'professional';
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

  return c.json({ reports: reports?.results || [], total: total?.count || 0, page, limit });
});

app.get('/api/reports/:id', authMiddleware, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const report = await c.env.DB.prepare('SELECT * FROM credit_reports WHERE id = ? AND org_id = ?').bind(id, user.org_id).first();
  if (!report) return c.json({ error: 'Not found' }, 404);

  const violations = await c.env.DB.prepare('SELECT * FROM violations WHERE report_id = ? AND org_id = ? ORDER BY severity ASC').bind(id, user.org_id).all();
  const litScore = calculateLitigationScore((violations?.results || []) as any);
  const documents = await c.env.DB.prepare('SELECT * FROM documents WHERE report_id = ? AND org_id = ? ORDER BY created_at DESC').bind(id, user.org_id).all();

  return c.json({ report, violations: violations?.results || [], litigationScore: litScore, documents: documents?.results || [] });
});

app.get('/api/reports/:id/pdf', authMiddleware, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  const report = await c.env.DB.prepare('SELECT * FROM credit_reports WHERE id = ? AND org_id = ?').bind(id, user.org_id).first();
  if (!report) return c.json({ error: 'Report not found' }, 404);

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
    litigationScore: litScore,
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
      JSON.stringify(mfsnReportData), 
      JSON.stringify(primaryReport), 
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
  const body = await c.req.json();
  const { clientId, smartCreditData, trackingToken, username, password } = body;

  if (!clientId) {
    return c.json({ error: 'Client ID is required' }, 400);
  }

  let payload = smartCreditData;
  let resolvedTrackingToken = trackingToken;

  try {
    if (username && password) {
      const clientKey = '19343205-b3a9-4143-8bef-2cb5da0c731f';
      const clientSecret = 'WE_9tIrlwv0yvLW83CNmqlkyCIJVaxV5ouVu2sJ7QYQ';
      const authHeader = 'Basic ' + btoa(`${clientKey}:${clientSecret}`);

      const authRes = await fetch('https://api.consumerdirect.com/v1.1/member/authenticate', {
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
        return c.json({ error: `SmartCredit Authentication Failed (${authRes.status}): ${errText}` }, authRes.status);
      }

      const authData: any = await authRes.json();
      resolvedTrackingToken = authData.trackingToken || authData.data?.trackingToken || authData.member?.trackingToken || authData.token;

      if (!resolvedTrackingToken) {
        return c.json({ error: 'Failed to resolve trackingToken from authentication response' }, 500);
      }
    }

    // If trackingToken is provided/resolved and raw smartCreditData is absent, fetch via ConsumerDirect API
    if (resolvedTrackingToken && !payload) {
      const clientKey = '19343205-b3a9-4143-8bef-2cb5da0c731f';
      const clientSecret = 'WE_9tIrlwv0yvLW83CNmqlkyCIJVaxV5ouVu2sJ7QYQ';
      const url = `https://api.consumerdirect.com/v1.1/report/retrieve?clientKey=${clientKey}&trackingToken=${resolvedTrackingToken}`;
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
        return c.json({ error: `SmartCredit API Retrieve Failed (${res.status}): ${errText}` }, res.status);
      }

      payload = await res.json();
    }

    if (!payload) {
      return c.json({ error: 'Either smartCreditData (JSON payload) or trackingToken or credentials are required' }, 400);
    }

    // Map SmartCredit Data to Internal Format
    const bureauReports = mapSmartCreditToInternal(payload);
    if (bureauReports.length === 0) {
      return c.json({ error: 'No bureau data found in SmartCredit report response' }, 404);
    }

    const primaryReport = bureauReports[0];
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
      JSON.stringify(payload), 
      JSON.stringify(primaryReport), 
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

    await c.env.DB.prepare('INSERT INTO activity_log (id, org_id, client_id, report_id, user_id, action, description, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(generateId(), user.org_id, clientId, reportId, user.id, 'report_imported', `Real import from SmartCredit: ${allViolations.length} violations found across ${bureauReports.length} bureaus`, JSON.stringify({ score: litScore.score })).run();

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

    // 3. Call Cloudflare Workers AI
    const aiResult = await c.env.AI.run('@cf/meta/llama-3.2-3b-instruct', {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Here is the dispute letter to rewrite:\n\n${doc.content}` }
      ]
    }) as any;

    const rewrittenText = aiResult?.response;
    if (!rewrittenText) {
      return c.json({ error: 'Failed to rewrite document using Cloudflare Workers AI. No response returned.' }, 500);
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

  const pdfBytes = generatePDFFromText(doc.title, doc.content);

  return new Response(pdfBytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="FounderOS-${id}.pdf"`,
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
  const addrData = await addrRes.json();
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
  const createData = await createRes.json();
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
  const mailingData = await mailingRes.json();

  // Update document status to "mailed"
  await c.env.DB.prepare('UPDATE documents SET status = ?, mailed_at = ?, mailed_by = ? WHERE id = ?').bind('mailed', new Date().toISOString(), user.id, id).run();

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
  if (user.role !== 'admin') return c.json({ error: 'Admin only' }, 403);
  
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
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
    * { font-family: 'Inter', system-ui, sans-serif; }
    .glass { background: rgba(255,255,255,0.05); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); }
    .gradient-bg { background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%); }
    .card-hover { transition: all 0.2s; }
    .card-hover:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,0,0,0.3); }
    .severity-critical { border-left: 4px solid #ef4444; }
    .severity-high { border-left: 4px solid #f97316; }
    .severity-medium { border-left: 4px solid #eab308; }
    .severity-low { border-left: 4px solid #22c55e; }
    .fade-in { animation: fadeIn 0.3s ease-in; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: #1e293b; }
    ::-webkit-scrollbar-thumb { background: #475569; border-radius: 3px; }
    .pulse-glow { animation: pulseGlow 2s ease-in-out infinite; }
    @keyframes pulseGlow { 0%, 100% { box-shadow: 0 0 5px rgba(59,130,246,0.5); } 50% { box-shadow: 0 0 20px rgba(59,130,246,0.8); } }
    .step-done { background: rgba(34, 197, 94, 0.15); border-color: rgba(34, 197, 94, 0.5); }
    .step-active { background: rgba(59, 130, 246, 0.15); border-color: rgba(59, 130, 246, 0.5); }
    .step-pending { background: rgba(100, 116, 139, 0.1); border-color: rgba(100, 116, 139, 0.3); }
    @keyframes progressPulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
    .progress-pulse { animation: progressPulse 1s ease-in-out infinite; }
  </style>
</head>
<body class="gradient-bg min-h-screen text-gray-100">
  <div id="app"></div>
  <script src="/static/app.js"></script>
</body>
</html>`;
}

export default app;
