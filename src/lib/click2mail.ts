/**
 * Click2Mail first-class letter send. Tracking arrives later via mailing-callback.
 */
export type Click2MailEnv = {
  CLICK2MAIL_USERNAME?: string;
  CLICK2MAIL_AUTH_BASIC?: string;
  CLICK2MAIL_API_URL?: string;
};

export type Click2MailRecipient = {
  name: string;
  address1: string;
  city: string;
  state: string;
  zip: string;
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

export async function sendLetterViaClick2Mail(env: Click2MailEnv, opts: {
  title: string;
  content: string;
  recipient: Click2MailRecipient;
  mailClass?: 'FIRST_CLASS' | 'CERTIFIED';
}): Promise<{ mailingId: string; documentId: string; mailClass: string }> {
  if (!click2mailConfigured(env)) {
    throw Object.assign(new Error('Click2Mail is not configured. Set CLICK2MAIL_USERNAME, CLICK2MAIL_AUTH_BASIC, and CLICK2MAIL_API_URL.'), { status: 503 });
  }
  const apiUrl = env.CLICK2MAIL_API_URL!;
  const auth = `Basic ${env.CLICK2MAIL_AUTH_BASIC}`;
  const addrRes = await fetch(`${apiUrl}/account/addresses`, {
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
  });
  if (!addrRes.ok) {
    throw Object.assign(new Error(`Click2Mail address fetch failed: ${await addrRes.text()}`), { status: 502 });
  }
  const addrData = await addrRes.json() as any;
  const fromAddress = addrData.addresses?.[0]?.id;
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
  const createData = await createRes.json() as any;
  const documentId = createData.id;
  const mailClass = opts.mailClass || 'FIRST_CLASS';

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
  const mailingData = await mailingRes.json() as any;
  return { mailingId: String(mailingData.id || mailingData.mailingId || ''), documentId: String(documentId), mailClass };
}
