/**
 * Resolve company / org brand for outbound emails AND dispute PDF letterheads.
 * Prefer org.settings.letterhead (Settings UI), then flat settings keys,
 * then COMPANY_* env, then safe defaults.
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

/** Structured firm letterhead used on dispute PDFs and letter body headers. */
export type OrgLetterhead = {
  orgName: string;
  firmName: string;
  attorneyName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  barNumber: string;
  logoBase64?: string;
  logoUrl?: string;
  headerText: string;
  customSubtext: string;
  isHiredAdvocate: boolean;
  repAgreementAttached: boolean;
  /** True when firm name / address / logo was actually configured (not just defaults). */
  configured: boolean;
};

const DEFAULTS: OrgBrand = {
  name: 'RJ Business Solutions',
  owner: 'Rick Jefferson',
  address: '1342 NM 333, Tijeras, New Mexico 87059',
  website: 'https://rjbusinesssolutions.org',
  supportEmail: 'support@rjbusinesssolutions.org',
  logoUrl: 'https://storage.googleapis.com/msgsndr/qQnxRHDtyx0uydPd5sRl/media/67eb83c5e519ed689430646b.jpeg',
  fromName: 'RJ Business Solutions',
};

function safeParseSettings(raw: unknown): any {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(String(raw) || '{}');
  } catch {
    return {};
  }
}

function formatAddressLine(lh: {
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
}): string {
  const cityStateZip = [lh.city, lh.state, lh.zip].filter(Boolean).join(', ').replace(/, ([A-Z]{2}), /, ', $1 ');
  // Prefer "City, ST ZIP"
  const csz = [lh.city, [lh.state, lh.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  return [lh.address, csz || cityStateZip].filter(Boolean).join(', ');
}

/**
 * Normalize Settings UI letterhead + legacy flat keys into one letterhead object,
 * and return flat keys suitable to persist alongside nested letterhead.
 */
export function normalizeOrgLetterhead(
  settings: any,
  orgName?: string,
): { letterhead: OrgLetterhead; flatPatch: Record<string, any> } {
  const s = settings || {};
  const lh = (s.letterhead && typeof s.letterhead === 'object') ? s.letterhead : {};
  const branding = (s.branding && typeof s.branding === 'object') ? s.branding : {};

  const firmName =
    lh.firmName ||
    s.company_name ||
    s.brand_name ||
    branding.firmName ||
    orgName ||
    '';

  const attorneyName = lh.attorneyName || s.owner_name || s.owner || branding.attorneyName || '';
  const address = lh.address || s.business_address || s.address || '';
  const city = lh.city || s.city || '';
  const state = lh.state || s.state || '';
  const zip = lh.zip || s.zip || '';
  const phone = lh.phone || s.business_phone || s.phone || '';
  const email = lh.email || s.business_email || s.support_email || '';
  const barNumber = lh.barNumber || s.bar_number || '';
  const logoBase64 = lh.logoBase64 || s.letterhead_logo_base64 || undefined;
  const logoUrl = lh.logoUrl || s.letterhead_logo_url || s.logo_url || undefined;

  const addressLine = formatAddressLine({ address, city, state, zip });
  const contactBits = [phone, email].filter(Boolean).join(' • ');
  const headerText = s.letterhead_title || firmName || orgName || 'Dispute Document';
  const customSubtext =
    s.letterhead_subtext ||
    [firmName || orgName, addressLine, contactBits].filter(Boolean).join(' • ') ||
    'Official Dispute Document • FCRA Compliance Engine';

  const isHiredAdvocate = s.is_hired_advocate === true || s.is_hired_advocate === 1 || lh.isHiredAdvocate === true;
  const repAgreementAttached =
    s.rep_agreement_attached === true || s.rep_agreement_attached === 1 || lh.repAgreementAttached === true;

  const configured = !!(firmName || logoBase64 || address || attorneyName || phone || email);

  const letterhead: OrgLetterhead = {
    orgName: orgName || firmName || 'Smart FCRA',
    firmName: firmName || orgName || '',
    attorneyName,
    address,
    city,
    state,
    zip,
    phone,
    email,
    barNumber,
    logoBase64: typeof logoBase64 === 'string' && logoBase64.length > 40 ? logoBase64 : undefined,
    logoUrl: logoUrl || undefined,
    headerText,
    customSubtext,
    isHiredAdvocate,
    repAgreementAttached,
    configured,
  };

  const flatPatch: Record<string, any> = {
    company_name: letterhead.firmName || undefined,
    brand_name: letterhead.firmName || undefined,
    owner_name: letterhead.attorneyName || undefined,
    business_address: addressLine || undefined,
    business_email: letterhead.email || undefined,
    business_phone: letterhead.phone || undefined,
    letterhead_title: letterhead.headerText || undefined,
    letterhead_subtext: letterhead.customSubtext || undefined,
    letterhead_logo_base64: letterhead.logoBase64 || s.letterhead_logo_base64 || undefined,
    letterhead_logo_url: letterhead.logoUrl || undefined,
    logo_url: letterhead.logoUrl || undefined,
    is_hired_advocate: isHiredAdvocate,
    rep_agreement_attached: repAgreementAttached,
  };

  return { letterhead, flatPatch };
}

/** Merge letterhead form body into settings, flattening PDF/email keys. */
export function mergeLetterheadIntoSettings(settings: any, letterheadBody: any, orgName?: string): any {
  const next = { ...(settings || {}) };
  next.letterhead = {
    ...(next.letterhead || {}),
    ...letterheadBody,
  };
  if (typeof letterheadBody?.isHiredAdvocate === 'boolean') {
    next.is_hired_advocate = letterheadBody.isHiredAdvocate;
  }
  if (typeof letterheadBody?.repAgreementAttached === 'boolean') {
    next.rep_agreement_attached = letterheadBody.repAgreementAttached;
  }
  const { flatPatch } = normalizeOrgLetterhead({ ...next, letterhead: next.letterhead }, orgName);
  Object.assign(next, flatPatch);
  return next;
}

/** Build a plain-text firm header prepended to every generated letter body. */
export function buildFirmLetterheadBlock(lh: OrgLetterhead): string {
  if (!lh?.configured || !lh.firmName) return '';
  const lines: string[] = [
    String(lh.firmName).toUpperCase(),
  ];
  if (lh.attorneyName) {
    lines.push(`${lh.attorneyName}${lh.barNumber ? `  |  Bar #${lh.barNumber}` : ''}`);
  }
  const addr = formatAddressLine(lh);
  if (addr) lines.push(addr);
  const contact = [lh.phone, lh.email].filter(Boolean).join('  |  ');
  if (contact) lines.push(contact);
  if (lh.isHiredAdvocate) {
    lines.push('Authorized Credit Representative / Consumer Advocate');
  }
  lines.push('═'.repeat(64));
  lines.push('');
  return lines.join('\n');
}

/** Prepend firm branding to letter content when org letterhead is configured. */
export function brandLetterContent(content: string, lh: OrgLetterhead | null | undefined): string {
  if (!content) return content;
  if (!lh?.configured || !lh.firmName) return content;
  const header = buildFirmLetterheadBlock(lh);
  if (!header) return content;
  // Avoid double-branding if regenerate is called
  if (content.toUpperCase().startsWith(String(lh.firmName).toUpperCase())) return content;
  return header + content;
}

export async function loadOrgBrand(env: BrandEnv, orgId?: string | null): Promise<OrgBrand> {
  let settings: any = {};
  let orgName = '';
  if (env.DB && orgId) {
    try {
      const org = await env.DB.prepare('SELECT id, name, settings FROM organizations WHERE id = ?').bind(orgId).first() as any;
      if (org) {
        orgName = org.name || '';
        settings = safeParseSettings(org.settings);
      }
    } catch { /* soft */ }
  }

  const { letterhead } = normalizeOrgLetterhead(settings, orgName);
  // Tenant orgs must never inherit the platform owner's home address / personal name.
  const platformFallback = !orgId;

  const name =
    letterhead.firmName ||
    settings.brand_name ||
    settings.company_name ||
    orgName ||
    (platformFallback ? env.COMPANY_NAME || DEFAULTS.name : 'Smart FCRA');

  const owner =
    letterhead.attorneyName ||
    settings.owner_name ||
    settings.owner ||
    (platformFallback ? env.COMPANY_OWNER || DEFAULTS.owner : '');

  const address =
    formatAddressLine(letterhead) ||
    settings.business_address ||
    settings.address ||
    (platformFallback ? env.COMPANY_ADDRESS || DEFAULTS.address : '');

  const website =
    settings.website ||
    (platformFallback ? env.COMPANY_WEBSITE || DEFAULTS.website : '');

  const supportEmail =
    letterhead.email ||
    settings.business_email ||
    settings.support_email ||
    (platformFallback ? env.COMPANY_EMAIL || DEFAULTS.supportEmail : '');

  const logoUrl =
    letterhead.logoUrl ||
    settings.letterhead_logo_url ||
    settings.logo_url ||
    (platformFallback ? env.COMPANY_LOGO || DEFAULTS.logoUrl : '');

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

export async function loadOrgLetterhead(env: BrandEnv, orgId?: string | null): Promise<OrgLetterhead> {
  let settings: any = {};
  let orgName = '';
  if (env.DB && orgId) {
    try {
      const org = await env.DB.prepare('SELECT id, name, settings FROM organizations WHERE id = ?').bind(orgId).first() as any;
      if (org) {
        orgName = org.name || '';
        settings = safeParseSettings(org.settings);
      }
    } catch { /* soft */ }
  }
  return normalizeOrgLetterhead(settings, orgName).letterhead;
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
