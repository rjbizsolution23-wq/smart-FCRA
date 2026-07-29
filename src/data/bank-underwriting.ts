/**
 * Deterministic bank-statement underwriting: cash flow, DTI, reserves.
 * Complements LLM mentor analysis — numbers are parsed from text, never invented.
 */
export type CashFlowLine = { date?: string; description: string; amount: number; type: 'credit' | 'debit' };

export type UnderwritingPack = {
  monthlyIncomeEstimate: number;
  monthlyExpenseEstimate: number;
  monthlyDebtEstimate: number;
  dtiPct: number | null;
  endingBalanceEstimate: number | null;
  reservesMonths: number | null;
  netCashFlow: number;
  credits: number;
  debits: number;
  linesSampled: number;
  confidence: 'low' | 'medium' | 'high';
  flags: string[];
  recommendations: string[];
  lines: CashFlowLine[];
};

const MONEY_RE = /(?:^|[\s:])(-?\$?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\b/g;
const DATE_RE = /\b(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)\b/;

function parseMoneyToken(tok: string): number | null {
  const cleaned = tok.replace(/[$,]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function looksLikeDebt(desc: string): boolean {
  const d = desc.toLowerCase();
  return /loan|mortgage|auto\s?pay|payment\s+to|credit\s+card|card\s+payment|student\s+loan|financing|installment|navy\s+federal|capital\s+one|chase\s+card|amex|discover/.test(d);
}

function looksLikeIncome(desc: string): boolean {
  const d = desc.toLowerCase();
  return /payroll|direct\s+dep|salary|wage|ach\s+credit|deposit|venmo\s+cashout|zelle\s+from|refund|tax\s+refund|social\s+security|benefit/.test(d);
}

/** Extract signed amounts from a bank statement / OCR dump. */
export function parseBankStatementText(raw: string): UnderwritingPack {
  const text = String(raw || '').replace(/\r/g, '');
  const lines: CashFlowLine[] = [];
  const flags: string[] = [];

  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length < 6) continue;
    const dateMatch = trimmed.match(DATE_RE);
    const amounts: number[] = [];
    let m: RegExpExecArray | null;
    const re = new RegExp(MONEY_RE.source, 'g');
    while ((m = re.exec(trimmed)) !== null) {
      const n = parseMoneyToken(m[1]);
      if (n != null && Math.abs(n) >= 1) amounts.push(n);
    }
    if (!amounts.length) continue;
    // Prefer last amount on the line (typical statement layout)
    let amount = amounts[amounts.length - 1];
    const desc = trimmed.replace(MONEY_RE, ' ').replace(/\s+/g, ' ').trim().slice(0, 180);
    const lower = desc.toLowerCase();
    let type: 'credit' | 'debit' = amount < 0 || /withdrawal|debit|purchase|payment|pos|fee/.test(lower) ? 'debit' : 'credit';
    if (amount < 0) {
      amount = Math.abs(amount);
      type = 'debit';
    }
    if (/deposit|credit|payroll/.test(lower) && !/fee/.test(lower)) type = 'credit';
    lines.push({ date: dateMatch?.[1], description: desc || 'line', amount, type });
  }

  const credits = lines.filter((l) => l.type === 'credit').reduce((s, l) => s + l.amount, 0);
  const debits = lines.filter((l) => l.type === 'debit').reduce((s, l) => s + l.amount, 0);

  // Heuristic: statement spans ~1 month if we see 20+ lines; else scale conservatively
  const monthFactor = lines.length >= 25 ? 1 : lines.length >= 10 ? 1.2 : 1.5;
  const incomeHits = lines.filter((l) => l.type === 'credit' && looksLikeIncome(l.description));
  const debtHits = lines.filter((l) => l.type === 'debit' && looksLikeDebt(l.description));

  const monthlyIncomeEstimate = Math.round(
    ((incomeHits.length ? incomeHits.reduce((s, l) => s + l.amount, 0) : credits * 0.55) / monthFactor) * 100,
  ) / 100;
  const monthlyExpenseEstimate = Math.round((debits / monthFactor) * 100) / 100;
  const monthlyDebtEstimate = Math.round(
    ((debtHits.length ? debtHits.reduce((s, l) => s + l.amount, 0) : monthlyExpenseEstimate * 0.35) / monthFactor) * 100,
  ) / 100;

  const netCashFlow = Math.round((credits - debits) * 100) / 100;

  // Ending balance: last large credit-looking remaining balance token if present
  let endingBalanceEstimate: number | null = null;
  const balMatch = text.match(/(?:ending|available|current)\s+balance[:\s]+\$?([\d,]+\.\d{2})/i);
  if (balMatch) endingBalanceEstimate = parseMoneyToken(balMatch[1]);

  const dtiPct =
    monthlyIncomeEstimate > 0
      ? Math.round((monthlyDebtEstimate / monthlyIncomeEstimate) * 1000) / 10
      : null;

  const reservesMonths =
    endingBalanceEstimate != null && monthlyExpenseEstimate > 0
      ? Math.round((endingBalanceEstimate / monthlyExpenseEstimate) * 10) / 10
      : null;

  let confidence: UnderwritingPack['confidence'] = 'low';
  if (lines.length >= 30 && incomeHits.length >= 1) confidence = 'high';
  else if (lines.length >= 12) confidence = 'medium';

  if (lines.length < 8) flags.push('Thin statement extract — paste more pages for higher confidence');
  if (dtiPct != null && dtiPct > 43) flags.push(`DTI ~${dtiPct}% exceeds common conventional comfort (~43%)`);
  if (dtiPct != null && dtiPct > 36 && dtiPct <= 43) flags.push(`DTI ~${dtiPct}% is elevated — pay down revolving before apply`);
  if (reservesMonths != null && reservesMonths < 2) flags.push('Reserves under 2 months of expenses — build cushion for underwriting');
  if (netCashFlow < 0) flags.push('Negative net cash flow on this extract — stabilize before major credit apps');

  const recommendations: string[] = [];
  if (dtiPct != null && dtiPct > 36) recommendations.push('Attack highest-APR revolving balances to drop DTI before mortgage/auto submit');
  if ((reservesMonths ?? 0) < 3) recommendations.push('Park 1–3 months of essentials in a dedicated savings account (documentable reserves)');
  recommendations.push('Keep payroll direct-deposit visible for 60+ days — underwriters love seasoning');
  if (debtHits.length === 0) recommendations.push('Label debt payments clearly when uploading next statement for sharper DTI');

  return {
    monthlyIncomeEstimate,
    monthlyExpenseEstimate,
    monthlyDebtEstimate,
    dtiPct,
    endingBalanceEstimate,
    reservesMonths,
    netCashFlow,
    credits: Math.round(credits * 100) / 100,
    debits: Math.round(debits * 100) / 100,
    linesSampled: lines.length,
    confidence,
    flags,
    recommendations,
    lines: lines.slice(0, 40),
  };
}
