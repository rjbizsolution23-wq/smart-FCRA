/**
 * Bureau / furnisher reply intelligence.
 * Classifies uploaded response letters and extracts account-level outcomes
 * so the client file can be updated without purely manual status entry.
 */

export type ReplyOutcome = 'deleted' | 'verified' | 'updated' | 'partial' | 'inconclusive';

export type ReplyAccountFinding = {
  accountHint: string;
  outcome: ReplyOutcome;
  evidence: string;
};

export type BureauReplyAnalysis = {
  documentKind: 'bureau_response' | 'furnisher_response' | 'collection_response' | 'unknown';
  bureauHint: 'Equifax' | 'Experian' | 'TransUnion' | 'Furnisher' | 'Unknown';
  overallOutcome: ReplyOutcome;
  confidence: number; // 0–1
  summary: string;
  accounts: ReplyAccountFinding[];
  suggestedDisputeResult: 'deleted' | 'verified' | 'updated' | 'partial';
  nextActions: string[];
};

function detectBureau(text: string): BureauReplyAnalysis['bureauHint'] {
  const t = text.toLowerCase();
  if (t.includes('equifax')) return 'Equifax';
  if (t.includes('experian')) return 'Experian';
  if (t.includes('transunion') || t.includes('trans union')) return 'TransUnion';
  if (hasAny(t, ['collection', 'debt collector', 'valley collection', 'midland', 'portfolio recovery'])) return 'Furnisher';
  return 'Unknown';
}

function hasAny(hay: string, needles: string[]): boolean {
  return needles.some((n) => hay.includes(n));
}

function detectKind(text: string, bureau: BureauReplyAnalysis['bureauHint']): BureauReplyAnalysis['documentKind'] {
  const t = text.toLowerCase();
  if (bureau === 'Furnisher' || hasAny(t, ['we are writing in response to your direct dispute', 'as a furnisher'])) {
    return 'furnisher_response';
  }
  if (hasAny(t, ['results of our reinvestigation', 'we have completed our investigation', 'credit reporting agency', 'consumer reporting agency'])) {
    return 'bureau_response';
  }
  if (hasAny(t, ['validation of debt', 'debt collector', 'fdcpa'])) return 'collection_response';
  if (bureau !== 'Unknown') return 'bureau_response';
  return 'unknown';
}

/** Extract rough account hints (names / last-4 style numbers) near outcome language. */
function extractAccountFindings(text: string): ReplyAccountFinding[] {
  const findings: ReplyAccountFinding[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const outcomePatterns: Array<{ re: RegExp; outcome: ReplyOutcome; label: string }> = [
    { re: /\b(deleted|removed|suppressed|expunged|no longer report)\b/i, outcome: 'deleted', label: 'deletion language' },
    { re: /\b(updated|modified|corrected|revised|changed)\b/i, outcome: 'updated', label: 'update language' },
    { re: /\b(verified|remains|accurate|confirmed|will continue to report)\b/i, outcome: 'verified', label: 'verification language' },
  ];

  for (const line of lines) {
    for (const p of outcomePatterns) {
      if (!p.re.test(line)) continue;
      const acct =
        line.match(/(?:account|acct\.?|#)\s*([A-Z0-9*-]{4,})/i)?.[1] ||
        line.match(/\b([A-Z][A-Za-z0-9 &.'/-]{2,40})\b/)?.[1] ||
        'item';
      findings.push({
        accountHint: String(acct).slice(0, 80),
        outcome: p.outcome,
        evidence: `${p.label}: ${line.slice(0, 160)}`,
      });
      break;
    }
  }

  // Deduplicate by accountHint+outcome
  const seen = new Set<string>();
  return findings.filter((f) => {
    const k = `${f.accountHint}|${f.outcome}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, 25);
}

function scoreOverall(accounts: ReplyAccountFinding[], text: string): {
  overallOutcome: ReplyOutcome;
  confidence: number;
  suggestedDisputeResult: BureauReplyAnalysis['suggestedDisputeResult'];
} {
  const t = text.toLowerCase();
  const deleted = accounts.filter((a) => a.outcome === 'deleted').length;
  const verified = accounts.filter((a) => a.outcome === 'verified').length;
  const updated = accounts.filter((a) => a.outcome === 'updated').length;

  let overallOutcome: ReplyOutcome = 'inconclusive';
  let confidence = 0.35;

  if (deleted && !verified && !updated) {
    overallOutcome = 'deleted';
    confidence = 0.85;
  } else if (deleted && (verified || updated)) {
    overallOutcome = 'partial';
    confidence = 0.75;
  } else if (updated && !verified) {
    overallOutcome = 'updated';
    confidence = 0.7;
  } else if (verified && !deleted) {
    overallOutcome = 'verified';
    confidence = 0.75;
  } else if (hasAny(t, ['deleted', 'removed from your credit file', 'information has been deleted'])) {
    overallOutcome = 'deleted';
    confidence = 0.65;
  } else if (hasAny(t, ['we have verified', 'information is accurate', 'remains on your credit file'])) {
    overallOutcome = 'verified';
    confidence = 0.6;
  } else if (hasAny(t, ['we have updated', 'information has been modified', 'corrected the following'])) {
    overallOutcome = 'updated';
    confidence = 0.6;
  }

  const suggestedDisputeResult: BureauReplyAnalysis['suggestedDisputeResult'] =
    overallOutcome === 'inconclusive' ? 'partial' : overallOutcome === 'partial' ? 'partial' : overallOutcome;

  return { overallOutcome, confidence, suggestedDisputeResult };
}

export function classifyBureauReply(rawText: string): BureauReplyAnalysis {
  const text = String(rawText || '').trim();
  if (text.length < 40) {
    return {
      documentKind: 'unknown',
      bureauHint: 'Unknown',
      overallOutcome: 'inconclusive',
      confidence: 0.1,
      summary: 'Not enough text to classify this upload as a bureau/furnisher reply.',
      accounts: [],
      suggestedDisputeResult: 'partial',
      nextActions: ['Upload a clearer PDF/text extract of the response letter', 'Or manually record the response on the related dispute document'],
    };
  }

  const bureauHint = detectBureau(text);
  const documentKind = detectKind(text, bureauHint);
  const accounts = extractAccountFindings(text);
  const { overallOutcome, confidence, suggestedDisputeResult } = scoreOverall(accounts, text);

  const nextActions: string[] = [];
  if (overallOutcome === 'deleted' || overallOutcome === 'partial') {
    nextActions.push('Mark matching violations resolved / deleted and refresh the client LVS');
    nextActions.push('Request an updated tri-bureau report to confirm deletion');
  }
  if (overallOutcome === 'verified' || overallOutcome === 'partial') {
    nextActions.push('Escalate verified items: method-of-verification + intent-to-sue pack');
    nextActions.push('File CFPB complaint on unresolved high-severity items');
  }
  if (overallOutcome === 'updated') {
    nextActions.push('Compare updated reporting against Metro 2 / DOFD rules before closing');
  }
  if (overallOutcome === 'inconclusive') {
    nextActions.push('Staff review required — attach to the open dispute round manually');
  }

  const summary = [
    `${documentKind.replace(/_/g, ' ')} from ${bureauHint}`,
    `overall: ${overallOutcome}`,
    accounts.length ? `${accounts.length} account-level finding(s)` : 'no account lines extracted',
    `confidence ${(confidence * 100).toFixed(0)}%`,
  ].join(' · ');

  return {
    documentKind,
    bureauHint,
    overallOutcome,
    confidence,
    summary,
    accounts,
    suggestedDisputeResult,
    nextActions,
  };
}

/** Categories that should trigger reply intelligence on portal upload. */
export function isReplyUploadCategory(category: string): boolean {
  const c = String(category || '').toLowerCase();
  return [
    'bureau_response',
    'bureau_reply',
    'dispute_response',
    'dispute_reply',
    'furnisher_response',
    'collection_response',
    'creditor_response',
    'creditor_reply',
    'mail_response',
  ].includes(c);
}
