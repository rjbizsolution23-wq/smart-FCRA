/**
 * Outbound copy QA — prohibited phrases, red flags, and playbook replacements.
 */
import { scanProhibitedLanguage } from '../engine/hallucination-firewall';
import { detectRedFlagTerms, PROHIBITED_PHRASES } from '../data/support-playbook';

export type CopyScanResult = {
  passed: boolean;
  prohibitedHits: string[];
  redFlagHits: string[];
  suggestions: { never: string; use: string }[];
  score: number;
  summary: string;
};

export function scanOutboundCopy(text: string, opts: { strict?: boolean } = {}): CopyScanResult {
  const body = String(text || '');
  const prohibitedHits = scanProhibitedLanguage(body);
  const redFlagHits = detectRedFlagTerms(body);

  const suggestions = PROHIBITED_PHRASES.filter((pair) => {
    const needle = pair.never.replace(/\.$/, '').toLowerCase();
    return body.toLowerCase().includes(needle.slice(0, Math.min(needle.length, 24)));
  });

  const critical = prohibitedHits.length;
  const warnings = redFlagHits.length;
  const score = Math.max(0, 100 - critical * 25 - warnings * 5);

  const passed = opts.strict
    ? critical === 0 && warnings === 0
    : critical === 0;

  let summary = 'Copy passed compliance scan.';
  if (critical) summary = `Blocked: ${critical} prohibited phrase(s) — remove outcome guarantees.`;
  else if (warnings) summary = `${warnings} red-flag term(s) — review tone before send.`;

  return {
    passed,
    prohibitedHits,
    redFlagHits,
    suggestions,
    score,
    summary,
  };
}

export function assertCopyApprovedForSend(text: string): { ok: boolean; error?: string; scan: CopyScanResult } {
  const scan = scanOutboundCopy(text, { strict: false });
  if (!scan.passed) {
    return {
      ok: false,
      error: `Copy QA failed: ${scan.prohibitedHits.join(', ')}`,
      scan,
    };
  }
  return { ok: true, scan };
}
