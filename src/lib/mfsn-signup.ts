/**
 * Public MyFreeScoreNow signup → create client + portal user + pull/analyze report.
 * Analysis is stored for staff but gated from the client until portal_analysis_unlocked = 1.
 */

export type ParsedPersonName = { firstName: string; lastName: string };

export function parsePersonNameFromReport(personalInfo: any): ParsedPersonName {
  const raw = String(personalInfo?.names?.[0] || '').trim();
  if (!raw) return { firstName: 'New', lastName: 'Client' };
  let firstName = '';
  let lastName = '';
  if (raw.includes(',')) {
    const parts = raw.split(',');
    lastName = parts[0].trim();
    firstName = parts.slice(1).join(',').trim();
  } else {
    const parts = raw.split(/\s+/).filter(Boolean);
    firstName = parts[0] || 'New';
    lastName = parts.slice(1).join(' ') || 'Client';
  }
  const toTitleCase = (str: string) =>
    str
      .toLowerCase()
      .replace(/(?:^|\s|-|')\S/g, (m) => m.toUpperCase())
      .replace(/\b(Mc)([a-z])/g, (_m, p1, p2) => p1 + p2.toUpperCase());
  return {
    firstName: toTitleCase(firstName) || 'New',
    lastName: toTitleCase(lastName) || 'Client',
  };
}

export function parseAddressFromReport(personalInfo: any): {
  addressLine1: string;
  city: string;
  state: string;
  zip: string;
} {
  const fullAddr = String(personalInfo?.addresses?.[0] || '').trim();
  if (!fullAddr) return { addressLine1: '', city: '', state: '', zip: '' };
  const parts = fullAddr.split(',').map((p: string) => p.trim());
  if (parts.length >= 3) {
    const city = parts[parts.length - 2] || '';
    const stateZip = parts[parts.length - 1].split(/\s+/);
    return {
      addressLine1: parts.slice(0, parts.length - 2).join(', ') || fullAddr,
      city,
      state: (stateZip[0] || '').toUpperCase(),
      zip: stateZip[1] || '',
    };
  }
  return { addressLine1: fullAddr, city: '', state: '', zip: '' };
}

export function extractSsnLast4(personalInfo: any): string {
  let ssnVal = String(personalInfo?.ssns?.[0] || '').trim();
  if (!ssnVal) return '';
  if (ssnVal.includes('-')) ssnVal = ssnVal.split('-').pop() || '';
  ssnVal = ssnVal.replace(/\D/g, '');
  if (ssnVal.length > 4) ssnVal = ssnVal.slice(-4);
  return ssnVal;
}

/** Locked only when explicitly 0 — missing/1 means unlocked (legacy clients). */
export function isPortalAnalysisUnlocked(client: { portal_analysis_unlocked?: unknown } | null | undefined): boolean {
  if (!client) return true;
  const v = client.portal_analysis_unlocked;
  return v !== 0 && v !== '0' && v !== false;
}

export function generatePortalTempPassword(): string {
  return `SmartPass-${Math.random().toString(36).substring(2, 10).toUpperCase()}!`;
}

export function resolvePublicSignupOrgId(env: {
  PUBLIC_SIGNUP_ORG_ID?: string;
  DEFAULT_SIGNUP_ORG_ID?: string;
}): string {
  return (
    String(env.PUBLIC_SIGNUP_ORG_ID || env.DEFAULT_SIGNUP_ORG_ID || 'org_platform_master').trim() ||
    'org_platform_master'
  );
}

export function isEmailShaped(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}
