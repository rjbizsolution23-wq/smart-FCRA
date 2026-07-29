/**
 * Multi-bureau helpers — normalize CRA identity, detect from text/filename,
 * and keep EQ / EX / TU packs distinct for the CRM.
 */

export type BureauName = 'Equifax' | 'Experian' | 'TransUnion' | 'Unknown';

export function normalizeBureau(input?: string | null): BureauName {
  const s = String(input || '').toLowerCase().replace(/[^a-z]/g, '');
  if (!s || s === 'unknown' || s === 'autodetect') return 'Unknown';
  if (s.includes('experian') || s === 'ex' || s === 'exp') return 'Experian';
  if (s.includes('transunion') || s === 'tu' || s === 'trans') return 'TransUnion';
  if (s.includes('equifax') || s === 'eq' || s === 'efx') return 'Equifax';
  return 'Unknown';
}

export function detectBureauFromFilename(fileName?: string | null): BureauName {
  const n = String(fileName || '').toLowerCase();
  if (!n) return 'Unknown';
  if (/(experian|\bex[_-]|\bexp\b|ex-acr)/i.test(n)) return 'Experian';
  if (/(trans\s*union|\btu[_-]|\btu\b|tu-acr)/i.test(n)) return 'TransUnion';
  if (/(equifax|\beq[_-]|\befx\b|eq-acr|efx-acr)/i.test(n)) return 'Equifax';
  return 'Unknown';
}

/**
 * Score bureau identity from ACR / CRA text.
 * Uses weighted header markers so disclosure pages mentioning all 3 bureaus
 * do not flip the primary bureau incorrectly.
 */
export function detectBureauFromText(rawText: string): BureauName {
  const text = String(rawText || '');
  if (!text.trim()) return 'Unknown';

  const header = text.slice(0, Math.min(2500, text.length)).toLowerCase();
  const body = text.toLowerCase();

  const score = (bureau: BureauName, patterns: RegExp[], weight: number) => {
    let s = 0;
    for (const p of patterns) {
      if (p.test(header)) s += weight * 3;
      else if (p.test(body)) s += weight;
    }
    return s;
  };

  const scores: Record<BureauName, number> = {
    Equifax: score('Equifax', [
      /\bequifax\b/,
      /equifax\.com/,
      /confirmation\s*#/,
      /efx-acr/,
      /equifax information services/,
    ], 2),
    Experian: score('Experian', [
      /\bexperian\b/,
      /usa\.experian\.com/,
      /experian information solutions/,
      /date generated/,
      /ex-acr/,
    ], 2),
    TransUnion: score('TransUnion', [
      /\btransunion\b/,
      /trans\s*union/,
      /personal credit report for:/,
      /transunion\.com/,
      /credit report date/,
      /tu-acr/,
    ], 2),
    Unknown: 0,
  };

  // Strong unique markers
  if (/confirmation\s*#/i.test(header) && /equifax/i.test(header)) scores.Equifax += 12;
  if (/usa\.experian\.com/i.test(header)) scores.Experian += 12;
  if (/personal credit report for:/i.test(header)) scores.TransUnion += 12;

  const ranked = (Object.entries(scores) as [BureauName, number][])
    .filter(([k]) => k !== 'Unknown')
    .sort((a, b) => b[1] - a[1]);

  if (!ranked.length || ranked[0][1] <= 0) return 'Unknown';
  // Require clear winner when close
  if (ranked.length > 1 && ranked[0][1] === ranked[1][1]) return 'Unknown';
  return ranked[0][0];
}

/** Resolve bureau with precedence: explicit hint > filename > text. */
export function resolveBureau(opts: {
  hint?: string | null;
  fileName?: string | null;
  rawText?: string | null;
}): BureauName {
  const fromHint = normalizeBureau(opts.hint);
  if (fromHint !== 'Unknown') return fromHint;
  const fromFile = detectBureauFromFilename(opts.fileName);
  if (fromFile !== 'Unknown') return fromFile;
  return detectBureauFromText(opts.rawText || '');
}

export function bureauScoreColumn(bureau: BureauName): 'eq_score' | 'ex_score' | 'tu_score' | null {
  if (bureau === 'Equifax') return 'eq_score';
  if (bureau === 'Experian') return 'ex_score';
  if (bureau === 'TransUnion') return 'tu_score';
  return null;
}
