/**
 * Fact-check detected violations against live parsed report fields.
 * Attaches visible reasoning traces + case-law from the curated KB.
 * Rejects speculative hits that cannot be grounded in report data.
 */
import type { CreditReportData, Violation, ParsedAccount } from './violations';
import { getCaseLawForViolation, getCaseLawByStatute, formatCaseLawCitation } from '../data/case-law-database';

export type ReasoningStep = {
  step: number;
  thought: string;
  fact: string;
  source: 'report_field' | 'statute' | 'case_law' | 'rule' | 'rejected';
};

export type FactCheckedViolation = Violation & {
  factCheckStatus: 'verified' | 'needs_review' | 'rejected';
  confidence: number; // 0–100
  reasoning: ReasoningStep[];
  groundedFields: string[];
  caseLawCitations: { caseName: string; citation: string; holding: string }[];
  analysisMode: 'live_rules_engine';
};

function allAccounts(report: CreditReportData): ParsedAccount[] {
  return [...(report.accounts || []), ...(report.collections || [])];
}

function findAccount(report: CreditReportData, v: Violation): ParsedAccount | null {
  const accts = allAccounts(report);
  if (v.accountNumber) {
    const byNum = accts.find((a) => a.accountNumber && a.accountNumber === v.accountNumber);
    if (byNum) return byNum;
  }
  if (v.accountName) {
    const name = v.accountName.toLowerCase();
    return accts.find((a) => (a.creditorName || '').toLowerCase().includes(name) || name.includes((a.creditorName || '').toLowerCase())) || null;
  }
  return null;
}

function enrichCaseLaw(v: Violation): { text: string; citations: { caseName: string; citation: string; holding: string }[] } {
  const fromType = getCaseLawForViolation(v.subcategory || '');
  const fromStatute = getCaseLawByStatute(v.statute || '');
  const merged = [...fromType, ...fromStatute].slice(0, 3);
  const citations = merged.map((c) => ({
    caseName: c.caseName,
    citation: c.citation,
    holding: c.keyHolding,
  }));
  if (citations.length) {
    return {
      text: citations.map((c) => formatCaseLawCitation(merged.find((m) => m.citation === c.citation)!)).join('\n\n'),
      citations,
    };
  }
  // Keep existing string only if present — do not invent new case names
  return { text: v.caseLaw || '', citations: [] };
}

function isSpeculativeInquiry(v: Violation): boolean {
  const sub = (v.subcategory || '').toLowerCase();
  const evidence = (v.evidence || '').toLowerCase();
  return (
    sub.includes('inquiry') &&
    (evidence.includes('unauthorized') || evidence.includes('potential unauthorized') || sub.includes('unauthorized'))
  );
}

function isUngroundedCollectionDispute(v: Violation, report: CreditReportData): boolean {
  const sub = (v.subcategory || '').toLowerCase();
  if (!sub.includes('disputed') && !sub.includes('dispute indicator')) return false;
  const acct = findAccount(report, v);
  if (!acct) return true;
  const remarks = String((acct as any).remarks || acct.comments || '').toLowerCase();
  const flagged = !!(acct.disputeFlag || remarks.includes('dispute'));
  return !flagged;
}

/**
 * Fact-check and attach reasoning. Rejected violations are filtered out by default.
 */
export function factCheckViolations(
  report: CreditReportData,
  violations: Violation[],
  opts?: { keepRejected?: boolean },
): FactCheckedViolation[] {
  const out: FactCheckedViolation[] = [];

  for (const v of violations) {
    const reasoning: ReasoningStep[] = [];
    const groundedFields: string[] = [];
    let confidence = 70;
    let status: FactCheckedViolation['factCheckStatus'] = 'verified';

    reasoning.push({
      step: 1,
      thought: 'Received detector output from live rules engine (not generative AI).',
      fact: `${v.category} · ${v.subcategory} · ${v.statute}`,
      source: 'rule',
    });

    // Ground to report fields
    const acct = findAccount(report, v);
    if (acct) {
      groundedFields.push('creditorName', 'accountNumber');
      reasoning.push({
        step: 2,
        thought: 'Matched violation to an account present on the parsed credit report.',
        fact: `${acct.creditorName} · acct ${acct.accountNumber || 'n/a'} · balance ${acct.currentBalance ?? 'n/a'} · DOFD ${acct.dofd || 'n/a'}`,
        source: 'report_field',
      });
      if (v.dofd && acct.dofd && v.dofd !== acct.dofd) {
        confidence -= 15;
        reasoning.push({
          step: reasoning.length + 1,
          thought: 'DOFD on violation differs from account DOFD — flag for attorney review.',
          fact: `violation DOFD=${v.dofd} vs account DOFD=${acct.dofd}`,
          source: 'report_field',
        });
        status = 'needs_review';
      }
      if (v.accountNumber && acct.accountNumber && v.accountNumber !== acct.accountNumber) {
        confidence -= 20;
        status = 'needs_review';
      }
    } else if (v.accountName || v.accountNumber) {
      confidence -= 25;
      status = 'needs_review';
      reasoning.push({
        step: 2,
        thought: 'Could not firmly match this finding to a parsed account row — keep for review, do not treat as proven.',
        fact: `Lookup failed for ${v.accountName || ''} ${v.accountNumber || ''}`,
        source: 'report_field',
      });
    } else {
      // Report-level findings (mixed file, inquiries batch, etc.)
      reasoning.push({
        step: 2,
        thought: 'Report-level finding (not tied to a single tradeline).',
        fact: `Bureau=${report.bureau}; accounts=${report.accounts?.length || 0}; collections=${report.collections?.length || 0}; inquiries=${report.inquiries?.length || 0}`,
        source: 'report_field',
      });
      groundedFields.push('bureau', 'reportDate');
    }

    // Reject speculative inquiry "unauthorized" without purpose evidence
    if (isSpeculativeInquiry(v)) {
      const hasPurposeGap = (report.inquiries || []).some((i) => !i.purpose || i.purpose === 'unknown');
      if (!hasPurposeGap && (report.inquiries || []).length < 6) {
        reasoning.push({
          step: reasoning.length + 1,
          thought: 'Rejected speculative unauthorized-inquiry claim — volume alone is not proof of impermissible purpose.',
          fact: 'Requires consumer attestation or furnisher response before asserting §1681b violation.',
          source: 'rejected',
        });
        status = 'rejected';
        confidence = 15;
      } else {
        status = 'needs_review';
        confidence = Math.min(confidence, 45);
        reasoning.push({
          step: reasoning.length + 1,
          thought: 'Inquiry volume is elevated — mark as needs_review pending permissible-purpose verification (not auto-proven).',
          fact: `${report.inquiries?.length || 0} inquiries on file`,
          source: 'rule',
        });
        // Soften explanation to avoid overclaiming
        v.explanation = `${v.explanation} [FACT-CHECK: Requires verification of permissible purpose before asserting unauthorized access.]`;
        v.severity = v.severity === 'critical' ? 'high' : v.severity === 'high' ? 'medium' : v.severity;
      }
    }

    // Reject FDCPA dispute-indicator hits without dispute flag/remarks
    if (isUngroundedCollectionDispute(v, report)) {
      reasoning.push({
        step: reasoning.length + 1,
        thought: 'Rejected FDCPA dispute-indicator finding — no dispute flag or dispute remark on the collection account.',
        fact: 'Placeholder detector logic cannot invent a dispute that is not on the report.',
        source: 'rejected',
      });
      status = 'rejected';
      confidence = 10;
    }

    // Statute grounding
    if (v.statute) {
      reasoning.push({
        step: reasoning.length + 1,
        thought: 'Mapped finding to statutory duty.',
        fact: `${v.statute}${v.statuteText ? ` — ${v.statuteText.slice(0, 180)}` : ''}`,
        source: 'statute',
      });
    }

    // Case law from curated KB only
    const enriched = enrichCaseLaw(v);
    if (enriched.citations.length) {
      v.caseLaw = enriched.text;
      reasoning.push({
        step: reasoning.length + 1,
        thought: 'Attached case-law from curated knowledge base (not model-generated).',
        fact: enriched.citations.map((c) => `${c.caseName} (${c.citation})`).join('; '),
        source: 'case_law',
      });
      confidence = Math.min(100, confidence + 8);
    } else if (v.caseLaw) {
      reasoning.push({
        step: reasoning.length + 1,
        thought: 'Detector supplied a case-law string; KB had no stronger match — left as-is for attorney review.',
        fact: v.caseLaw.slice(0, 200),
        source: 'case_law',
      });
    }

    reasoning.push({
      step: reasoning.length + 1,
      thought: `Final fact-check status: ${status} (confidence ${confidence}).`,
      fact: status === 'verified'
        ? 'Grounded in parsed report fields + statute. Safe to surface as a live finding.'
        : status === 'needs_review'
          ? 'Partially grounded — show with review badge; do not overstate.'
          : 'Not grounded — filtered from live client-facing results.',
      source: status === 'rejected' ? 'rejected' : 'rule',
    });

    if (status === 'rejected' && !opts?.keepRejected) continue;

    out.push({
      ...v,
      factCheckStatus: status,
      confidence: Math.max(0, Math.min(100, confidence)),
      reasoning,
      groundedFields,
      caseLawCitations: enriched.citations,
      analysisMode: 'live_rules_engine',
    });
  }

  return out.sort((a, b) => {
    const sev = { critical: 0, high: 1, medium: 2, low: 3 };
    return sev[a.severity] - sev[b.severity] || b.confidence - a.confidence;
  });
}

/** Full live analysis pipeline: detect → fact-check → reasoning */
export function analyzeReportLive(report: CreditReportData, detectFn: (r: CreditReportData) => Violation[]) {
  const raw = detectFn(report);
  const verified = factCheckViolations(report, raw);
  const rejectedCount = raw.length - verified.filter((v) => v.factCheckStatus !== 'rejected').length;
  return {
    analysisMode: 'live_rules_engine' as const,
    rawCount: raw.length,
    verifiedCount: verified.filter((v) => v.factCheckStatus === 'verified').length,
    needsReviewCount: verified.filter((v) => v.factCheckStatus === 'needs_review').length,
    rejectedCount: Math.max(0, raw.length - verified.length),
    violations: verified,
    reasoningSummary: `Analyzed live parsed ${report.bureau} report dated ${report.reportDate || 'n/a'}: ${raw.length} detector hits → ${verified.length} grounded findings after fact-check.`,
  };
}
