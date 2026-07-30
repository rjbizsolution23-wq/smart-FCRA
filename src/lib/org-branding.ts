/**
 * Resolve company / org brand for outbound client emails.
 * Prefer org.settings JSON, then COMPANY_* env, then safe defaults.
 */
export type BrandEnv = {
  DB?: any;
  COMPANY_NAME?: string;
  COMPANY_OWNER?: string;
  COMPANY_ADDRESS?: string;
  COMPANY_WEBSITE?: string;
  COMPANY_EMAIL?: string;
  COMPANY_LOGO?: string;
  CLOUDFLARE_EMAIL_FROM_NOREPLY?: string;
  CLOUDFLARE_EMAIL_FROM_ONBOARDING?: string;
  RESEND_FROM_EMAIL?: string;
};

export type OrgBrand = {
  orgId?: string;
  name: string;
  owner: string;
  address: string;
  website: string;
  supportEmail: string;
  logoUrl: string;
  fromName: string;
  replyTo?: string;
};

const DEFAULTS: OrgBrand = {
  name: 'Smart FCRA',
  owner: 'Rick Jefferson Solutions',
  address: '',
  website: 'https://rjbusinesssolutions.org',
  supportEmail: 'support@rjbusinesssolutions.org',
  logoUrl: '',
  fromName: 'Smart FCRA',
};

export async function loadOrgBrand(env: BrandEnv, orgId?: string | null): Promise<OrgBrand> {
  let settings: any = {};
  let orgName = '';
  if (env.DB && orgId) {
    try {
      const org = await env.DB.prepare('SELECT id, name, settings FROM organizations WHERE id = ?').bind(orgId).first() as any;
      if (org) {
        orgName = org.name || '';
        try { settings = JSON.parse(org.settings || '{}'); } catch { settings = {}; }
      }
    } catch { /* soft */ }
  }

  const name =
    settings.brand_name ||
    settings.company_name ||
    orgName ||
    env.COMPANY_NAME ||
    DEFAULTS.name;

  const owner =
    settings.owner_name ||
    settings.owner ||
    env.COMPANY_OWNER ||
    DEFAULTS.owner;

  const address =
    settings.business_address ||
    settings.address ||
    env.COMPANY_ADDRESS ||
    DEFAULTS.address;

  const website =
    settings.website ||
    env.COMPANY_WEBSITE ||
    DEFAULTS.website;

  const supportEmail =
    settings.business_email ||
    settings.support_email ||
    env.COMPANY_EMAIL ||
    DEFAULTS.supportEmail;

  const logoUrl =
    settings.letterhead_logo_url ||
    settings.logo_url ||
    env.COMPANY_LOGO ||
    DEFAULTS.logoUrl;

  return {
    orgId: orgId || undefined,
    name,
    owner,
    address,
    website,
    supportEmail,
    logoUrl,
    fromName: settings.from_name || name,
    replyTo: settings.reply_to || supportEmail,
  };
}

export function brandVars(brand: OrgBrand): Record<string, string> {
  return {
    brandName: brand.name,
    brandOwner: brand.owner,
    brandAddress: brand.address,
    brandWebsite: brand.website,
    brandEmail: brand.supportEmail,
    brandLogo: brand.logoUrl,
    brandFromName: brand.fromName,
  };
}
