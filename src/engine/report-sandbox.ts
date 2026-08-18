/**
 * Consumer credit-report sandbox helpers.
 * Original report content is untrusted (PDF/HTML/text from bureaus or uploads).
 * Render it in a scriptless sandbox and never treat field variance as an automatic legal violation.
 */

export type PaymentCell = {
  code: string;
  label: string;
  tone: 'ok' | 'late30' | 'late60' | 'late90' | 'derog' | 'none' | 'unknown';
};

export type SandboxAccount = {
  id: string;
  creditorName: string;
  accountNumberMasked: string;
  accountType: string;
  accountStatus: string;
  balance: number | null;
  creditLimit: number | null;
  pastDue: number | null;
  monthlyPayment: number | null;
  dateOpened: string;
  dateClosed: string;
  dateReported: string;
  dofd: string;
  paymentStatus: string;
  remarks: string;
  responsibility: string;
  isCollection: boolean;
  paymentHistory: string;
  paymentCells: PaymentCell[];
};

const CODE_MAP: Record<string, { label: string; tone: PaymentCell['tone'] }> = {
  C: { label: 'Current', tone: 'ok' },
  '0': { label: 'Current', tone: 'ok' },
  OK: { label: 'Current', tone: 'ok' },
  '1': { label: '30 days late', tone: 'late30' },
  '2': { label: '60 days late', tone: 'late60' },
  '3': { label: '90 days late', tone: 'late90' },
  '4': { label: '120 days late', tone: 'late90' },
  '5': { label: '150 days late', tone: 'late90' },
  '6': { label: '180 days late', tone: 'derog' },
  '7': { label: 'Foreclosure / wage assignment', tone: 'derog' },
  '8': { label: 'Repossession', tone: 'derog' },
  '9': { label: 'Collection / charge-off', tone: 'derog' },
  G: { label: 'Collection', tone: 'derog' },
  H: { label: 'Foreclosure', tone: 'derog' },
  J: { label: 'Voluntary surrender', tone: 'derog' },
  K: { label: 'Repossession', tone: 'derog' },
  L: { label: 'Charge-off', tone: 'derog' },
  E: { label: 'Zero balance', tone: 'ok' },
  X: { label: 'No data', tone: 'none' },
  '-': { label: 'No data', tone: 'none' },
  B: { label: 'Unknown / too new', tone: 'unknown' },
  U: { label: 'Unknown', tone: 'unknown' },
  D: { label: 'No business this month', tone: 'none' },
};

export function parsePaymentHistory(raw: string | null | undefined): PaymentCell[] {
  const s = String(raw || '').trim();
  if (!s) return [];
  const tokens = s.includes(' ') || s.includes(',')
    ? s.split(/[\s,]+/).filter(Boolean)
    : s.split('');
  return tokens.slice(0, 48).map((t) => {
    const code = t.toUpperCase();
    const mapped = CODE_MAP[code] || { label: code, tone: 'unknown' as const };
    return { code, label: mapped.label, tone: mapped.tone };
  });
}

export function maskAccountNumber(raw: string | null | undefined): string {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '—';
  if (digits.length < 4) return '****';
  return `****${digits.slice(-4)}`;
}

/** Redact full SSNs. Keep last four so the consumer can still match their file. */
export function redactSsn(text: string): string {
  return String(text || '')
    .replace(/\b(\d{3})-(\d{2})-(\d{4})\b/g, '***-**-$3')
    .replace(/\bSSN[:\s#]*([0-9-]{9,11})\b/gi, (_m, raw: string) => {
      const d = String(raw).replace(/\D/g, '');
      if (d.length < 4) return 'SSN ***-**-****';
      return `SSN ***-**-${d.slice(-4)}`;
    });
}

export function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function money(n: number | null | undefined): string {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export type InquiryKind = 'hard' | 'soft' | 'unknown';

export function classifyInquiry(raw: string | null | undefined): { kind: InquiryKind; label: string } {
  const t = String(raw || '').trim();
  if (!t) return { kind: 'unknown', label: 'Type not specified on this file' };
  const u = t.toUpperCase();
  if (/SOFT|ACCOUNT.?REVIEW|^AR$|^PR$|^IN$|PROMOTIONAL|INSURANCE|EMPLOYMENT|CONSUMER.?REQUEST|OWN.?REQUEST/.test(u)) {
    return { kind: 'soft', label: `Soft · ${t}` };
  }
  if (/HARD|NEW.?CREDIT|AUTO|MORTGAGE|INSTALLMENT|^HP$|^HA$|^CL$/.test(u)) {
    return { kind: 'hard', label: `Hard · ${t}` };
  }
  return { kind: 'unknown', label: t };
}

export function accountFromParsed(a: any, idx: number): SandboxAccount {
  const history = String(a.paymentHistory || '');
  return {
    id: `acct_${idx}`,
    creditorName: redactSsn(String(a.creditorName || a.collectorName || 'Unknown creditor')),
    accountNumberMasked: maskAccountNumber(a.accountNumber),
    accountType: String(a.accountType || ''),
    accountStatus: String(a.accountStatus || ''),
    balance: a.currentBalance ?? a.balance ?? null,
    creditLimit: a.creditLimit ?? null,
    pastDue: a.pastDue ?? null,
    monthlyPayment: a.monthlyPayment ?? null,
    dateOpened: String(a.dateOpened || ''),
    dateClosed: String(a.dateClosed || ''),
    dateReported: String(a.dateReported || ''),
    dofd: String(a.dofd || ''),
    paymentStatus: String(a.paymentStatus || ''),
    remarks: redactSsn(String(a.remarks || a.comments || '')),
    responsibility: String(a.responsibility || ''),
    isCollection: !!(a.isCollection || /collection/i.test(String(a.accountType || ''))),
    paymentHistory: history,
    paymentCells: parsePaymentHistory(history),
  };
}

export function scoreModelFromParsed(parsed: any, report: any): { score: number | null; model: string } {
  const sc = parsed?.scores || {};
  const vantage = sc.vantage ?? report?.vantage_score ?? null;
  const fico = sc.fico ?? report?.fico_score ?? null;
  const named = sc.equifax ?? sc.experian ?? sc.transunion ?? null;
  const score = fico ?? vantage ?? named ?? null;
  let model = 'Score model not identified on this report';
  if (sc.model) model = String(sc.model);
  else if (vantage != null && (fico == null || vantage === score)) model = 'VantageScore 3.0';
  else if (fico != null) model = 'FICO Score (model version not specified by source)';
  return { score, model };
}

/**
 * Paper-style HTML for a scriptless iframe sandbox.
 * All dynamic values are escaped. No scripts, no event handlers, no remote assets.
 */
export function buildSandboxDocument(opts: {
  bureau: string;
  reportDate?: string | null;
  importedAt?: string | null;
  fileName?: string | null;
  score?: number | null;
  scoreModel?: string;
  personal: { names: string[]; addresses: string[]; employers: string[]; dobs: string[]; ssnLast4: string[] };
  accounts: SandboxAccount[];
  collections: SandboxAccount[];
  inquiries: { creditorName: string; inquiryDate: string; inquiryType: string; kind?: InquiryKind }[];
  publicRecords: { recordType: string; filingDate: string; status: string; amount?: number }[];
  sourceText?: string;
}): string {
  const cells = (a: SandboxAccount) => a.paymentCells.map((c) => `<span class="ph ${c.tone}" title="${escapeHtml(c.label)}">${escapeHtml(c.code)}</span>`).join('');

  function accountBlock(a: SandboxAccount, collection = false): string {
    return `<article id="${escapeHtml(a.id)}" class="acct${collection ? ' coll' : ''}">
      <h3>${escapeHtml(a.creditorName)}</h3>
      <div class="meta">${escapeHtml(a.accountType || 'Account')} · ${escapeHtml(a.accountStatus || '—')} · ${escapeHtml(a.accountNumberMasked)}</div>
      <div class="grid">
        <div><span>Balance</span><b>${money(a.balance)}</b></div>
        <div><span>Limit</span><b>${money(a.creditLimit)}</b></div>
        <div><span>Opened</span><b>${escapeHtml(a.dateOpened || '—')}</b></div>
        <div><span>Reported</span><b>${escapeHtml(a.dateReported || '—')}</b></div>
        <div><span>Past due</span><b>${money(a.pastDue)}</b></div>
        <div><span>Payment</span><b>${money(a.monthlyPayment)}</b></div>
      </div>
      ${a.dofd ? `<div class="muted">Date of first delinquency (as reported): ${escapeHtml(a.dofd)}</div>` : ''}
      ${a.remarks ? `<div class="muted">Remarks: ${escapeHtml(a.remarks)}</div>` : ''}
      ${a.paymentCells.length ? `<div class="ph-row">${cells(a)}</div>` : ''}
    </article>`;
  }

  const accountsHtml = opts.accounts.map((a) => accountBlock(a)).join('');
  const collectionsHtml = opts.collections.map((a) => accountBlock(a, true)).join('');
  const inquiriesHtml = opts.inquiries.length
    ? `<table><thead><tr><th>Creditor</th><th>Date</th><th>As reported</th><th>Hard / soft</th></tr></thead><tbody>${
      opts.inquiries.map((i) => {
        const cls = classifyInquiry(i.inquiryType);
        const kind = i.kind || cls.kind;
        return `<tr><td>${escapeHtml(i.creditorName)}</td><td>${escapeHtml(i.inquiryDate)}</td><td>${escapeHtml(i.inquiryType || '—')}</td><td class="inq-${escapeHtml(kind)}">${escapeHtml(cls.label)}</td></tr>`;
      }).join('')
    }</tbody></table>
    <p class="muted">Soft inquiries typically do not affect scores. Hard inquiries may. Labels come from this file and are not a prediction of how a lender will score you.</p>`
    : '<p class="muted">None reported on this file.</p>';
  const recordsHtml = opts.publicRecords.length
    ? opts.publicRecords.map((r) => `<div class="row"><strong>${escapeHtml(r.recordType)}</strong> · ${escapeHtml(r.filingDate)} · ${escapeHtml(r.status)}${r.amount != null ? ' · ' + money(r.amount) : ''}</div>`).join('')
    : '<p class="muted">None reported on this file.</p>';

  const hasDofd = [...opts.accounts, ...opts.collections].some((a) => a.dofd);
  const dofdBanner = hasDofd
    ? `<div class="banner">Date of first delinquency (DOFD) is shown as reported. Many derogatory items generally must stop being reported seven years from the start of delinquency (FCRA § 605). This is educational and is not a promise any item will be removed.</div>`
    : '';
  const source = opts.sourceText
    ? `<section id="source"><h2>Source text</h2><pre>${escapeHtml(opts.sourceText.slice(0, 200000))}</pre></section>`
    : '';

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(opts.bureau)} credit report</title>
<style>
  :root { color-scheme: light; }
  body { margin:0; font-family: Georgia, "Times New Roman", serif; background:#e8eef5; color:#111; }
  .paper { position:relative; max-width: 780px; margin: 16px auto 48px; background:#fff; padding: 28px 32px 48px;
    box-shadow: 0 8px 30px rgba(15,23,42,.18); border: 1px solid #cbd5e1; }
  .paper:before { content:"CONFIDENTIAL — consumer copy — not for lending"; position:absolute; top:48%; left:50%;
    transform:translate(-50%,-50%) rotate(-28deg); font-size:22px; color:rgba(30,58,138,.07); white-space:nowrap; pointer-events:none; }
  header { border-bottom: 3px solid #1e3a8a; padding-bottom: 12px; margin-bottom: 18px; }
  h1 { font-size: 20px; margin: 0 0 4px; color:#1e3a8a; letter-spacing:.02em; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing:.12em; color:#1e3a8a; border-bottom:1px solid #cbd5e1; padding-bottom:4px; }
  h3 { font-size: 15px; margin: 0 0 4px; }
  .banner { font-size: 11px; background:#eff6ff; border:1px solid #bfdbfe; padding:8px 10px; margin: 10px 0 16px; }
  .muted { color:#475569; font-size: 12px; }
  .score { font-size: 28px; font-family: ui-monospace, monospace; }
  .acct { border:1px solid #e2e8f0; padding:12px; margin:10px 0; page-break-inside:avoid; }
  .acct.coll { border-left: 4px solid #b45309; }
  .grid { display:grid; grid-template-columns: repeat(3,1fr); gap:8px; margin:8px 0; font-size:12px; }
  .grid span { display:block; color:#64748b; font-size:10px; text-transform:uppercase; }
  table { width:100%; border-collapse:collapse; font-size:12px; }
  th, td { border-bottom:1px solid #e2e8f0; text-align:left; padding:6px 4px; }
  pre { white-space:pre-wrap; font-size:10px; line-height:1.45; background:#f8fafc; padding:12px; border:1px solid #e2e8f0; }
  .ph-row { display:flex; flex-wrap:wrap; gap:3px; margin-top:8px; }
  .ph { width:18px; height:18px; font: 9px/18px ui-monospace,monospace; text-align:center; border-radius:2px; }
  .ph.ok { background:#dcfce7; color:#166534; }
  .ph.late30 { background:#fef9c3; color:#854d0e; }
  .ph.late60 { background:#ffedd5; color:#9a3412; }
  .ph.late90 { background:#fee2e2; color:#991b1b; }
  .ph.derog { background:#7f1d1d; color:#fecaca; }
  .ph.none { background:#f1f5f9; color:#94a3b8; }
  .ph.unknown { background:#e2e8f0; color:#334155; }
  .legend { display:flex; flex-wrap:wrap; gap:6px; margin:8px 0 14px; font-size:10px; }
  .legend span { display:inline-flex; align-items:center; gap:4px; }
  .inq-hard { color:#9a3412; font-weight:700; }
  .inq-soft { color:#166534; }
  .inq-unknown { color:#475569; }
</style></head><body>
<div class="paper">
  <header>
    <h1>${escapeHtml(opts.bureau)} credit report</h1>
    <div class="muted">File: ${escapeHtml(opts.fileName || 'imported report')} · Report date: ${escapeHtml(opts.reportDate || '—')} · Imported: ${escapeHtml(opts.importedAt || '—')}</div>
    <div class="banner">This is a copy of the report imported into Smart FCRA. It is not the bureau’s live website. The score below is the score stored on this file and is not necessarily the score a lender will use. Opening this view does not file a dispute.</div>
    ${dofdBanner}
    <div class="legend" id="legend">
      <span><span class="ph ok">C</span> Current</span>
      <span><span class="ph late30">1</span> 30 late</span>
      <span><span class="ph late60">2</span> 60 late</span>
      <span><span class="ph late90">3</span> 90+ late</span>
      <span><span class="ph derog">9</span> Collection / C/O</span>
      <span><span class="ph none">X</span> No data</span>
    </div>
    <div>Score: <span class="score">${opts.score == null ? '—' : escapeHtml(String(opts.score))}</span>
      <div class="muted">Model: ${escapeHtml(opts.scoreModel || 'Score model not identified on this report')}</div>
    </div>
  </header>
  <section id="personal">
    <h2>Personal information as reported</h2>
    <p><strong>Names:</strong> ${escapeHtml(opts.personal.names.join('; ') || '—')}</p>
    <p><strong>Date of birth:</strong> ${escapeHtml(opts.personal.dobs.join('; ') || '—')}</p>
    <p><strong>SSN (last four):</strong> ${escapeHtml(opts.personal.ssnLast4.map((s) => `***-**-${s}`).join('; ') || '—')}</p>
    <p><strong>Addresses:</strong> ${escapeHtml(opts.personal.addresses.join('; ') || '—')}</p>
    <p><strong>Employers:</strong> ${escapeHtml(opts.personal.employers.join('; ') || '—')}</p>
  </section>
  <section id="accounts">
    <h2>Accounts (${opts.accounts.length})</h2>
    ${accountsHtml || '<p class="muted">No accounts parsed from this file.</p>'}
  </section>
  <section id="collections">
    <h2>Collections (${opts.collections.length})</h2>
    ${collectionsHtml || '<p class="muted">No collections parsed from this file.</p>'}
  </section>
  <section id="inquiries">
    <h2>Inquiries (${opts.inquiries.length})</h2>
    ${inquiriesHtml}
  </section>
  <section id="records">
    <h2>Public records (${opts.publicRecords.length})</h2>
    ${recordsHtml}
  </section>
  ${source}
</div>
</body></html>`;
}

/** allow-same-origin lets the parent scroll to account anchors. Do not add allow-scripts. */
export const SANDBOX_IFRAME_ATTR = 'sandbox="allow-same-origin" referrerpolicy="no-referrer"';
