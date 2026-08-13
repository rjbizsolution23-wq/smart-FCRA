/** Resolve per-tenant CSS tokens from org.settings.branding with RJ defaults. */

export const RJ_THEME_DEFAULTS = {
  primary: '#2563eb',
  sky: '#0ea5e9',
  navy: '#0f172a',
  deep: '#1e3a8a',
  gold: '#f59e0b',
  logoUrl: 'https://storage.googleapis.com/msgsndr/qQnxRHDtyx0uydPd5sRl/media/67eb83c5e519ed689430646b.jpeg',
  productName: 'Smart FCRA',
  companyName: 'RJ Business Solutions',
  tagline: 'Empowering Generational Wealth',
  fontHead: 'Space Grotesk',
  fontBody: 'Inter',
};

export type TenantTheme = typeof RJ_THEME_DEFAULTS;

function hex(v: unknown, fallback: string): string {
  const s = String(v || '').trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s) ? s : fallback;
}

export function resolveTenantTheme(settings: any, orgName?: string): TenantTheme {
  const b = (settings && typeof settings === 'object' && settings.branding) ? settings.branding : {};
  const lh = (settings && settings.letterhead) ? settings.letterhead : {};
  return {
    primary: hex(b.primary || b.blue, RJ_THEME_DEFAULTS.primary),
    sky: hex(b.sky, RJ_THEME_DEFAULTS.sky),
    navy: hex(b.navy, RJ_THEME_DEFAULTS.navy),
    deep: hex(b.deep, RJ_THEME_DEFAULTS.deep),
    gold: hex(b.gold, RJ_THEME_DEFAULTS.gold),
    logoUrl: String(b.logoUrl || lh.logoUrl || settings?.logo_url || RJ_THEME_DEFAULTS.logoUrl).slice(0, 500),
    productName: String(b.productName || RJ_THEME_DEFAULTS.productName).slice(0, 80),
    companyName: String(b.companyName || lh.firmName || settings?.company_name || orgName || RJ_THEME_DEFAULTS.companyName).slice(0, 80),
    tagline: String(b.tagline || RJ_THEME_DEFAULTS.tagline).slice(0, 120),
    fontHead: String(b.fontHead || RJ_THEME_DEFAULTS.fontHead).slice(0, 60),
    fontBody: String(b.fontBody || RJ_THEME_DEFAULTS.fontBody).slice(0, 60),
  };
}
