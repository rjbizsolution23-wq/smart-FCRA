/**
 * Self-serve, PAY-FIRST tenant signup pipeline.
 *
 * Flow:
 *  1. Prospect fills out the public branding form (business name, logo, colors,
 *     address, plan) at /get-started (public/static/brand/forms/tenant-signup.html).
 *  2. POST /api/public/tenant-signup/start validates + Turnstile-checks the
 *     payload, stores it in `pending_tenant_signups` (status='pending'), and
 *     creates a Stripe Checkout Session (metadata.type='tenant_signup') whose
 *     success_url points back at /api/public/tenant-signup/complete.
 *  3. Stripe redirects the buyer to Checkout. On success, Stripe fires
 *     checkout.session.completed. The webhook (src/index.tsx) detects
 *     metadata.type === 'tenant_signup' and calls fulfillTenantSignupCheckout()
 *     below, which is idempotent and does the actual provisioning.
 *  4. fulfillTenantSignupCheckout() calls provisionTenant() (same engine used
 *     by the platform-owner's manual New Tenant Wizard), marks the pending row
 *     'provisioned', emails the new owner their login + temp password, and
 *     notifies the platform owner a new paid tenant came online.
 *  5. The success page (/api/public/tenant-signup/complete) polls the pending
 *     row's status so the buyer sees "your account is ready" the moment the
 *     webhook finishes (webhooks can lag a few seconds behind the redirect).
 */
import type { Hono } from 'hono';
import Stripe from 'stripe';
import { generateId } from './auth';
import { verifyTurnstileToken } from './turnstile';
import { validateSubdomain, tenantPortalOrigin } from './tenant-resolver';
import { provisionTenant } from './tenant-provision';
import { isSaaSPlanId, resolveCheckoutPriceId, resolveFrontendUrl, productionStripeBlockReason, type SaaSPlanId } from './stripe-catalog';
import { sendTemplatedClientMessage } from './email-templates';
import { loadOrgBrand, brandVars } from './org-branding';
import { PLATFORM_OWNER_EMAILS, extraOwnerEmailsFromEnv } from './platform-owner';

/** System actor id recorded on tenant_provision_log / organizations.provisioned_by
 *  for tenants that were auto-provisioned by the Stripe webhook (no staff user). */
export const SYSTEM_SIGNUP_ACTOR = 'system:stripe_tenant_signup';

const LOGO_DATA_URI_RE = /^data:image\/(png|jpe?g|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/;
const MAX_LOGO_DATA_URI_LENGTH = 2_100_000;

type Env = {
  DB: D1Database;
  STRIPE_API_KEY?: string;
  STRIPE_PROFESSIONAL_PRICE_ID?: string;
  STRIPE_UNLIMITED_PRICE_ID?: string;
  STRIPE_ENTERPRISE_PRICE_ID?: string;
  FRONTEND_URL?: string;
  APP_BASE_URL?: string;
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  PLATFORM_OWNER_EMAILS?: string;
  ENVIRONMENT?: string;
  [key: string]: any;
};

function appBase(env: Env, requestUrl?: string): string {
  return resolveFrontendUrl(env, requestUrl).replace(/\/$/, '');
}

function stripeClient(env: Env): Stripe {
  if (!env.STRIPE_API_KEY) throw new Error('STRIPE_API_KEY is not configured');
  return new Stripe(env.STRIPE_API_KEY, { httpClient: Stripe.createFetchHttpClient() });
}

function normStr(v: unknown, max = 200): string {
  return String(v ?? '').trim().slice(0, max);
}

function isEmailShaped(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

/** Validate + normalize the public signup payload before it ever touches the DB. */
function parseSignupBody(body: any): { ok: true; value: Record<string, string> } | { ok: false; error: string } {
  const businessName = normStr(body.businessName || body.business_name, 120);
  const ownerName = normStr(body.ownerName || body.owner_name, 120);
  const ownerEmail = normStr(body.ownerEmail || body.owner_email || body.email, 160).toLowerCase();
  const plan = normStr(body.plan, 20);
  const subdomainRaw = normStr(body.subdomain, 63);

  if (!businessName) return { ok: false, error: 'Business name is required' };
  if (!ownerName) return { ok: false, error: 'Your name is required' };
  if (!ownerEmail || !isEmailShaped(ownerEmail)) return { ok: false, error: 'A valid email is required' };
  if (!isSaaSPlanId(plan)) return { ok: false, error: 'Select a plan (professional, unlimited, or enterprise)' };
  if (!subdomainRaw) return { ok: false, error: 'Choose a subdomain for your portal' };
  const subCheck = validateSubdomain(subdomainRaw);
  if (!subCheck.ok || !subCheck.normalized) return { ok: false, error: subCheck.error || 'Invalid subdomain' };

  const logoBase64 = normStr(body.logoBase64 || body.logo_base64, MAX_LOGO_DATA_URI_LENGTH);
  if (logoBase64) {
    if (logoBase64.length > MAX_LOGO_DATA_URI_LENGTH) return { ok: false, error: 'Logo image is too large (max ~1.5MB)' };
    if (!LOGO_DATA_URI_RE.test(logoBase64)) return { ok: false, error: 'Logo must be a PNG, JPEG, WEBP, or SVG file' };
  }

  return {
    ok: true,
    value: {
      businessName,
      legalName: normStr(body.legalName || body.legal_name, 160),
      ownerName,
      ownerEmail,
      phone: normStr(body.phone, 40),
      supportEmail: normStr(body.supportEmail || body.support_email, 160).toLowerCase(),
      address: normStr(body.address, 200),
      city: normStr(body.city, 100),
      state: normStr(body.state, 60),
      zip: normStr(body.zip, 20),
      subdomain: subCheck.normalized,
      primaryColor: normStr(body.primaryColor || body.primary_color, 20) || '#2563eb',
      secondaryColor: normStr(body.secondaryColor || body.secondary_color, 20) || '#f59e0b',
      logoBase64,
      timezone: normStr(body.timezone, 60) || 'America/New_York',
      plan,
      attributionMode: 'powered_by',
    },
  };
}

export function registerTenantSignupRoutes(app: Hono<any>): void {
  /** Public — live availability check for the branded signup form (no admin session needed). */
  app.get('/api/public/tenant-signup/subdomain-check', async (c) => {
    const raw = c.req.query('subdomain') || '';
    const check = validateSubdomain(raw);
    if (!check.ok) return c.json({ available: false, error: check.error });
    const taken = await c.env.DB.prepare(
      'SELECT id FROM organizations WHERE lower(subdomain) = ? LIMIT 1',
    ).bind(check.normalized).first();
    return c.json({
      available: !taken,
      normalized: check.normalized,
      portalUrl: tenantPortalOrigin(check.normalized, c.env),
    });
  });

  /** Public — start pay-first tenant signup: capture branding, create Stripe Checkout. */
  app.post('/api/public/tenant-signup/start', async (c) => {
    const env = c.env as Env;
    const body = await c.req.json().catch(() => ({}));

    const turnstile = await verifyTurnstileToken(
      env,
      body.cfTurnstileToken || body['cf-turnstile-response'] || c.req.header('cf-turnstile-response'),
      c.req.header('CF-Connecting-IP'),
    );
    if (!turnstile.ok) return c.json({ error: 'Bot check failed', detail: turnstile.error }, 403);

    const parsed = parseSignupBody(body);
    if (!parsed.ok) return c.json({ error: parsed.error }, 400);
    const v = parsed.value;

    if (!env.STRIPE_API_KEY) {
      return c.json({ error: 'Billing is not configured on this environment yet. Contact support.' }, 503);
    }
    const blocked = productionStripeBlockReason(env);
    if (blocked) return c.json({ error: blocked, code: 'STRIPE_LIVE_REQUIRED' }, 503);

    const existingSub = await env.DB.prepare(
      'SELECT id FROM organizations WHERE lower(subdomain) = ? LIMIT 1',
    ).bind(v.subdomain).first();
    if (existingSub) return c.json({ error: 'That subdomain is already taken. Choose another.' }, 409);

    const existingUser = await env.DB.prepare(
      'SELECT id FROM users WHERE lower(email) = ? LIMIT 1',
    ).bind(v.ownerEmail).first();
    if (existingUser) {
      return c.json({
        error: 'An account with this email already exists. Sign in instead, or use a different email.',
        code: 'EMAIL_EXISTS',
      }, 409);
    }

    const pendingId = generateId();
    try {
      await env.DB.prepare(
        `INSERT INTO pending_tenant_signups
          (id, status, plan, business_name, legal_name, owner_name, owner_email, phone, support_email,
           address, city, state, zip, subdomain, primary_color, secondary_color, logo_base64, timezone, attribution_mode)
         VALUES (?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        pendingId, v.plan, v.businessName, v.legalName || null, v.ownerName, v.ownerEmail,
        v.phone || null, v.supportEmail || null, v.address || null, v.city || null, v.state || null,
        v.zip || null, v.subdomain, v.primaryColor, v.secondaryColor, v.logoBase64 || null,
        v.timezone, v.attributionMode,
      ).run();
    } catch (e: any) {
      console.error('[tenant-signup] pending insert failed', e);
      return c.json({ error: 'Could not start signup. Try again.' }, 500);
    }

    const base = appBase(env, c.req.url);
    try {
      const stripe = stripeClient(env);
      const resolved = await resolveCheckoutPriceId(stripe, {
        STRIPE_API_KEY: env.STRIPE_API_KEY,
        STRIPE_PROFESSIONAL_PRICE_ID: env.STRIPE_PROFESSIONAL_PRICE_ID,
        STRIPE_UNLIMITED_PRICE_ID: env.STRIPE_UNLIMITED_PRICE_ID,
        STRIPE_ENTERPRISE_PRICE_ID: env.STRIPE_ENTERPRISE_PRICE_ID,
        FRONTEND_URL: base,
      }, v.plan as SaaSPlanId);

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{ price: resolved.priceId, quantity: 1 }],
        mode: 'subscription',
        success_url: `${base}/api/public/tenant-signup/complete?pending=${pendingId}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}/get-started?cancelled=1`,
        customer_email: v.ownerEmail,
        metadata: { type: 'tenant_signup', pendingSignupId: pendingId, plan: v.plan },
        subscription_data: { metadata: { type: 'tenant_signup', pendingSignupId: pendingId, plan: v.plan } },
      });

      await env.DB.prepare(
        `UPDATE pending_tenant_signups SET stripe_session_id = ? WHERE id = ?`,
      ).bind(session.id, pendingId).run();

      return c.json({ ok: true, url: session.url, pendingId });
    } catch (err: any) {
      console.error('[tenant-signup] checkout create failed', err);
      await env.DB.prepare(
        `UPDATE pending_tenant_signups SET status = 'failed', error_message = ? WHERE id = ?`,
      ).bind(String(err?.message || 'checkout_failed').slice(0, 300), pendingId).run().catch(() => null);
      return c.json({ error: `Stripe error: ${err.message || 'Unknown error'}` }, 500);
    }
  });

  /** Public — landing page the buyer returns to right after paying. Renders a tiny
   *  status page that polls /status until the webhook finishes provisioning (usually
   *  a couple seconds), then sends them straight to their new branded portal login. */
  app.get('/api/public/tenant-signup/complete', async (c) => {
    const pendingId = c.req.query('pending') || '';
    const base = appBase(c.env as Env, c.req.url);
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Setting up your account…</title>
<style>
  body{font-family:system-ui,-apple-system,sans-serif;background:#0b1220;color:#e2e8f0;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}
  .card{max-width:440px;padding:2.5rem;text-align:center}
  .spinner{width:44px;height:44px;border-radius:50%;border:4px solid #1e293b;border-top-color:#22d3ee;margin:0 auto 1.5rem;animation:spin 0.9s linear infinite}
  @keyframes spin{to{transform:rotate(360deg)}}
  h1{font-size:1.35rem;margin:0 0 0.5rem}
  p{color:#94a3b8;line-height:1.6}
  a.btn{display:inline-block;margin-top:1.25rem;padding:0.8rem 1.4rem;border-radius:10px;background:linear-gradient(135deg,#2563eb,#0ea5e9);color:#fff;text-decoration:none;font-weight:600}
  .err{color:#fca5a5}
</style></head>
<body><div class="card" id="card">
  <div class="spinner" id="spin"></div>
  <h1 id="title">Payment received — building your account…</h1>
  <p id="sub">This usually takes just a few seconds. Do not close this tab.</p>
</div>
<script>
  var pendingId = ${JSON.stringify(pendingId)};
  var tries = 0;
  function poll() {
    tries++;
    fetch('/api/public/tenant-signup/status?pending=' + encodeURIComponent(pendingId))
      .then(function(r){ return r.json(); })
      .then(function(data){
        if (data.status === 'provisioned' && data.portalUrl) {
          document.getElementById('spin').style.display = 'none';
          document.getElementById('title').textContent = 'Your account is ready!';
          document.getElementById('sub').innerHTML = 'Redirecting you to your new branded portal…<br/>We also emailed your login to ' + (data.ownerEmail || 'your inbox') + '.';
          setTimeout(function(){ window.location.href = data.portalUrl; }, 2200);
        } else if (data.status === 'failed') {
          document.getElementById('spin').style.display = 'none';
          document.getElementById('title').textContent = 'Almost there';
          document.getElementById('title').className = 'err';
          document.getElementById('sub').textContent = 'Your payment went through, but account setup needs a hand. Support has been notified — check your email shortly, or contact us.';
        } else if (tries < 40) {
          setTimeout(poll, 1500);
        } else {
          document.getElementById('sub').textContent = 'Setup is taking longer than expected. We\\'ll email your login as soon as it\\'s ready.';
        }
      })
      .catch(function(){ if (tries < 40) setTimeout(poll, 1500); });
  }
  poll();
</script>
</body></html>`;
    return c.html(html);
  });

  /** Public — polled by the completion page above. */
  app.get('/api/public/tenant-signup/status', async (c) => {
    const pendingId = c.req.query('pending') || '';
    if (!pendingId) return c.json({ status: 'unknown' });
    const row = await c.env.DB.prepare(
      `SELECT status, org_id, subdomain, owner_email FROM pending_tenant_signups WHERE id = ?`,
    ).bind(pendingId).first() as any;
    if (!row) return c.json({ status: 'unknown' });
    return c.json({
      status: row.status,
      ownerEmail: row.owner_email,
      portalUrl: row.status === 'provisioned' ? tenantPortalOrigin(row.subdomain, c.env) : null,
    });
  });
}

/** Fulfill a Stripe Checkout session for a self-serve tenant signup. Idempotent —
 *  safe to call more than once for the same session (webhook retries). Returns
 *  true if this branch handled the event (whether or not provisioning succeeded). */
export async function fulfillTenantSignupCheckout(env: Env, sessionObj: any): Promise<boolean> {
  const pendingId = sessionObj?.metadata?.pendingSignupId;
  if (!pendingId) return false;
  const db = env.DB;

  const pending = await db.prepare(
    `SELECT * FROM pending_tenant_signups WHERE id = ?`,
  ).bind(pendingId).first() as any;
  if (!pending) return true; // handled (nothing to do — unknown pending row)

  // Idempotent: webhook can retry — if already provisioned, just re-link the session id.
  if (pending.status === 'provisioned') {
    if (!pending.stripe_session_id && sessionObj?.id) {
      await db.prepare(`UPDATE pending_tenant_signups SET stripe_session_id = ? WHERE id = ?`)
        .bind(sessionObj.id, pendingId).run().catch(() => null);
    }
    return true;
  }

  try {
    const result = await provisionTenant(db, SYSTEM_SIGNUP_ACTOR, {
      businessName: pending.business_name,
      legalName: pending.legal_name || undefined,
      ownerName: pending.owner_name,
      ownerEmail: pending.owner_email,
      phone: pending.phone || undefined,
      supportEmail: pending.support_email || undefined,
      address: pending.address || undefined,
      city: pending.city || undefined,
      state: pending.state || undefined,
      zip: pending.zip || undefined,
      subdomain: pending.subdomain,
      primaryColor: pending.primary_color || undefined,
      secondaryColor: pending.secondary_color || undefined,
      logoBase64: pending.logo_base64 || undefined,
      timezone: pending.timezone || undefined,
      plan: pending.plan,
      attributionMode: (pending.attribution_mode as any) || 'powered_by',
    });

    await db.prepare(
      `UPDATE pending_tenant_signups
       SET status = 'provisioned', org_id = ?, user_id = ?, provisioned_at = datetime('now'),
           stripe_session_id = COALESCE(?, stripe_session_id)
       WHERE id = ?`,
    ).bind(result.orgId, result.userId, sessionObj?.id || null, pendingId).run();

    // Link Stripe customer/subscription to the freshly-created org so future
    // billing-portal / cancellation flows work exactly like an existing tenant.
    try {
      await db.prepare(
        `UPDATE organizations SET stripe_customer_id = COALESCE(?, stripe_customer_id), stripe_subscription_id = COALESCE(?, stripe_subscription_id) WHERE id = ?`,
      ).bind(sessionObj?.customer || null, sessionObj?.subscription || null, result.orgId).run();
    } catch { /* soft */ }

    try {
      await db.prepare(
        'INSERT INTO activity_log (id, org_id, user_id, action, description, metadata) VALUES (?, ?, ?, ?, ?, ?)',
      ).bind(
        generateId(),
        result.orgId,
        result.userId,
        'tenant_self_signup_provisioned',
        `Tenant auto-provisioned from paid Stripe checkout (${pending.plan})`,
        JSON.stringify({ pendingSignupId: pendingId, stripeSessionId: sessionObj?.id, plan: pending.plan }),
      ).run().catch(() => null);
    } catch { /* soft */ }

    // Email the new owner their login + temp password.
    try {
      const brand = await loadOrgBrand(env, result.orgId);
      await sendTemplatedClientMessage(env as any, {
        templateId: 'tenant_signup_welcome',
        orgId: result.orgId,
        clientId: `admin:${result.userId}`,
        email: pending.owner_email,
        notifyEmail: true,
        skipClientAlert: true,
        brand,
        vars: {
          ...brandVars(brand),
          name: pending.owner_name,
          email: pending.owner_email,
          temporaryPassword: result.temporaryPassword || '(already set)',
          loginUrl: `${result.portalUrl}/`,
          plan: pending.plan,
        },
      });
    } catch (e) { console.warn('[tenant-signup] owner welcome email failed', e); }

    // Notify the platform owner a new paid tenant just came online.
    try {
      const ownerEmails = Array.from(new Set([...PLATFORM_OWNER_EMAILS, ...extraOwnerEmailsFromEnv(env)]));
      for (const toEmail of ownerEmails.slice(0, 5)) {
        await sendTemplatedClientMessage(env as any, {
          templateId: 'platform_new_tenant_alert',
          orgId: result.orgId,
          clientId: `admin:platform`,
          email: toEmail,
          notifyEmail: true,
          skipClientAlert: true,
          vars: {
            businessName: pending.business_name,
            ownerName: pending.owner_name,
            ownerEmail: pending.owner_email,
            plan: pending.plan,
            subdomain: result.subdomain,
            portalUrl: result.portalUrl,
          },
        });
      }
    } catch (e) { console.warn('[tenant-signup] platform owner alert failed', e); }

    return true;
  } catch (err: any) {
    console.error('[tenant-signup] provisioning failed', err);
    await db.prepare(
      `UPDATE pending_tenant_signups SET status = 'failed', error_message = ? WHERE id = ?`,
    ).bind(String(err?.message || 'provision_failed').slice(0, 300), pendingId).run().catch(() => null);
    return true;
  }
}
