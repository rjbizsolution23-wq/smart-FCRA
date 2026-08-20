/**
 * Unified tenant template variables — {{business.name}}, {{brand.logo}}, {{portal.url}}, etc.
 * Legacy aliases ({{org_name}}) remain supported.
 */
import { loadOrgBrand } from './org-branding';
import { resolvePortalUrlForOrg } from './tenant-resolver';

export type TemplateVarEnv = {
  DB: D1Database;
  FRONTEND_URL?: string;
  APP_BASE_URL?: string;
};

export type TenantTemplateContext = Record<string, string>;

export async function resolveTenantTemplateVars(
  env: TemplateVarEnv,
  orgId: string,
  extras: Record<string, string> = {},
): Promise<TenantTemplateContext> {
  const row = await env.DB.prepare(
    `SELECT id, name, slug, subdomain, legal_name, settings, custom_domain, custom_domain_verified, attribution_mode
     FROM organizations WHERE id = ?`,
  ).bind(orgId).first().catch(() => null) as any;

  let settings: any = {};
  try { settings = JSON.parse(row?.settings || '{}'); } catch { /* */ }
  const brand = await loadOrgBrand(env, orgId).catch(() => null);
  const lh = settings.letterhead || {};
  const b = settings.branding || {};
  const portalUrl = resolvePortalUrlForOrg({
    subdomain: row?.subdomain,
    settings,
    custom_domain: row?.custom_domain,
    custom_domain_verified: row?.custom_domain_verified,
  }, env);

  const businessName = String(lh.firmName || b.companyName || row?.name || brand?.name || 'Smart FCRA');
  const legalName = String(row?.legal_name || lh.legalName || businessName);
  const supportEmail = String(lh.email || brand?.supportEmail || settings.support_email || 'support@smartfcra.com');
  const phone = String(lh.phone || settings.business_phone || '');
  const addressParts = [lh.address, lh.city, lh.state, lh.zip].filter(Boolean);
  const address = addressParts.join(', ') || String(brand?.address || '');

  const vars: TenantTemplateContext = {
    // Canonical dotted keys
    'business.name': businessName,
    'business.legal_name': legalName,
    'business.phone': phone,
    'business.support_email': supportEmail,
    'business.address': address,
    'business.website': String(brand?.website || portalUrl),
    'brand.logo': String(b.logoUrl || lh.logoUrl || brand?.logoUrl || ''),
    'brand.primary_color': String(b.primary || b.blue || '#2563eb'),
    'brand.secondary_color': String(b.gold || b.secondary || '#f59e0b'),
    'brand.tagline': String(b.tagline || ''),
    'portal.url': portalUrl,
    'portal.link': `${portalUrl}/app`,

    // Legacy flat keys (keep all existing templates working)
    org_name: businessName,
    org_legal_name: legalName,
    business_name: businessName,
    firm_name: businessName,
    support_email: supportEmail,
    business_phone: phone,
    business_address: address,
    portal_link: `${portalUrl}/app`,
    portal_url: portalUrl,
    logo_url: String(b.logoUrl || lh.logoUrl || brand?.logoUrl || ''),
    signature: `— ${businessName}`,
    scheduling_link: `${portalUrl}/app`,
    appointment_link: `${portalUrl}/app`,
    secure_link: `${portalUrl}/app`,
  };

  for (const [k, v] of Object.entries(extras)) {
    if (v != null) vars[k] = String(v);
  }
  return vars;
}

/** Apply {{dotted.key}} and {{flat_key}} placeholders. */
export function applyTemplateVars(template: string, vars: TenantTemplateContext): string {
  if (!template) return '';
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    const safe = String(v ?? '');
    out = out.replace(new RegExp(`\\{\\{${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}\\}`, 'g'), safe);
    out = out.replace(new RegExp(`\\{${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}`, 'g'), safe);
  }
  // Legacy {first_name} style
  out = out.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
  return out;
}

export async function renderTenantTemplate(
  env: TemplateVarEnv,
  orgId: string,
  template: string,
  extras: Record<string, string> = {},
): Promise<string> {
  const vars = await resolveTenantTemplateVars(env, orgId, extras);
  return applyTemplateVars(template, vars);
}
