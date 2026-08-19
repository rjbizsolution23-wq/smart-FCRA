/**
 * Click2Mail letter send + account address lookup.
 * @see https://developers.click2mail.com/docs/getting-started
 * @see https://developers.click2mail.com/reference/getaccountaddresses
 */
export type Click2MailEnv = {
  CLICK2MAIL_USERNAME?: string;
  CLICK2MAIL_AUTH_BASIC?: string;
  CLICK2MAIL_API_URL?: string;
};

export type Click2MailMailClass = 'STANDARD' | 'FIRST_CLASS' | 'CERTIFIED';

export type Click2MailRecipient = {
  name: string;
  address1: string;
  city: string;
  state: string;
  zip: string;
};

export type Click2MailAddress = {
  id: string | number;
  name?: string;
  address1?: string;
  city?: string;
  state?: string;
  zip?: string;
  isDefault?: boolean;
};

function utf8ToB64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function click2mailConfigured(env: Click2MailEnv): boolean {
  return !!(env.CLICK2MAIL_USERNAME && env.CLICK2MAIL_AUTH_BASIC && env.CLICK2MAIL_API_URL);
}

function authHeader(env: Click2MailEnv): string {
  return `Basic ${env.CLICK2MAIL_AUTH_BASIC}`;
}

function apiBase(env: Click2MailEnv): string {
  return String(env.CLICK2MAIL_API_URL || '').replace(/\/$/, '');
}

/** Map UI/org settings to Click2Mail API mailClass values. */
export function normalizeClick2MailClass(input?: string | null): Click2MailMailClass {
  const v = String(input || 'FIRST_CLASS').trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (v === 'CERTIFIED' || v === 'CERTIFIED_MAIL') return 'CERTIFIED';
  if (v === 'STANDARD' || v === 'STANDARD_MAIL') return 'STANDARD';
  return 'FIRST_CLASS';
}

/** Resolve mail class from request body, org settings, or default. */
export function resolveMailClass(opts: {
  bodyMailClass?: string | null;
  orgDefault?: string | null;
}): Click2MailMailClass {
  if (opts.bodyMailClass) return normalizeClick2MailClass(opts.bodyMailClass);
  if (opts.orgDefault) return normalizeClick2MailClass(opts.orgDefault);
  return 'FIRST_CLASS';
}

export async function getClick2MailAccountAddresses(env: Click2MailEnv): Promise<Click2MailAddress[]> {
  if (!click2mailConfigured(env)) {
    throw Object.assign(new Error('Click2Mail is not configured.'), { status: 503 });
  }
  const addrRes = await fetch(`${apiBase(env)}/account/addresses`, {
    headers: { Authorization: authHeader(env), 'Content-Type': 'application/json' },
  });
  if (!addrRes.ok) {
    throw Object.assign(new Error(`Click2Mail address fetch failed: ${await addrRes.text()}`), { status: 502 });
  }
  const addrData = await addrRes.json() as { addresses?: Click2MailAddress[] };
  return addrData.addresses || [];
}

export async function sendLetterViaClick2Mail(env: Click2MailEnv, opts: {
  title: string;
  content: string;
  recipient: Click2MailRecipient;
  mailClass?: Click2MailMailClass | string;
  fromAddressId?: string | number;
}): Promise<{ mailingId: string; documentId: string; mailClass: string; fromAddressId: string | number }> {
  if (!click2mailConfigured(env)) {
    throw Object.assign(new Error('Click2Mail is not configured. Set CLICK2MAIL_USERNAME, CLICK2MAIL_AUTH_BASIC, and CLICK2MAIL_API_URL.'), { status: 503 });
  }
  const apiUrl = apiBase(env);
  const auth = authHeader(env);
  const mailClass = normalizeClick2MailClass(opts.mailClass);

  let fromAddress = opts.fromAddressId;
  if (!fromAddress) {
    const addresses = await getClick2MailAccountAddresses(env);
    fromAddress = addresses[0]?.id;
  }
  if (!fromAddress) {
    throw Object.assign(new Error('No sender address found in Click2Mail account'), { status: 400 });
  }

  const createRes = await fetch(`${apiUrl}/documents`, {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      documentName: opts.title || 'FCRA Legal Document',
      documentType: '00',
      fileExtension: 'txt',
      content: utf8ToB64(opts.content || ''),
    }),
  });
  if (!createRes.ok) {
    throw Object.assign(new Error(`Click2Mail document creation failed: ${await createRes.text()}`), { status: 502 });
  }
  const createData = await createRes.json() as { id?: string | number };
  const documentId = createData.id;

  const mailingRes = await fetch(`${apiUrl}/mailings`, {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      documentId,
      fromAddressId: fromAddress,
      toName: opts.recipient.name,
      toAddress1: opts.recipient.address1,
      toCity: opts.recipient.city,
      toState: opts.recipient.state,
      toZip: opts.recipient.zip,
      toCountry: 'USA',
      mailClass,
      format: 'LETTER',
    }),
  });
  if (!mailingRes.ok) {
    throw Object.assign(new Error(`Click2Mail mailing creation failed: ${await mailingRes.text()}`), { status: 502 });
  }
  const mailingData = await mailingRes.json() as { id?: string | number; mailingId?: string | number };
  return {
    mailingId: String(mailingData.id || mailingData.mailingId || ''),
    documentId: String(documentId),
    mailClass,
    fromAddressId: fromAddress,
  };
}
