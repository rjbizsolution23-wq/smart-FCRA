/**
 * Intelligent letter / document selection from detected violations.
 * Used by attorney workflow pack + recommend API so CROs generate the right
 * sequence for each situation (Metro 2, obsolete, inquiry, BK, medical, etc.).
 */

export type LetterRecommendation = {
  docType: string;
  name: string;
  priority: number; // 1 = send first
  reason: string;
  category: string;
  required: boolean;
};

export type LetterStrategyResult = {
  recommendations: LetterRecommendation[];
  packTypes: string[];
  strategySummary: string;
  signals: string[];
};

type ViolationLike = {
  category?: string;
  subcategory?: string;
  statute?: string;
  statute_text?: string;
  statuteText?: string;
  severity?: string;
  account_name?: string;
  accountName?: string;
  account_type?: string;
  accountType?: string;
  description?: string;
  evidence?: string;
  metro2_fields?: string;
  metro2Fields?: string;
};

const DOC_NAMES: Record<string, string> = {
  'bureau-dispute': 'Bureau Dispute Letter',
  '1681i-letter': '§ 1681i Reinvestigation Letter',
  'furnisher-dispute': 'Furnisher Direct Dispute',
  '623-direct-furnisher': '§ 623 Direct Furnisher Dispute',
  'debt-validation': 'Debt Validation Demand',
  'r1-collection-dispute': 'R1 Collection Direct Dispute',
  'cease-desist': 'Cease and Desist Letter',
  'obsolete-deletion': 'Obsolete Information Deletion Demand',
  're-aging-violation': 'Re-Aging Violation Dispute',
  'unauthorized-inquiry': 'Unauthorized Inquiry Removal Letter',
  'post-bankruptcy-discharge': 'Post-Bankruptcy Discharge Dispute',
  'medical-debt-cfpb-2024': 'Medical Debt Dispute (CFPB 2024)',
  'medical-debt-violation': 'Medical Debt Violation Dispute',
  'identity-theft-block': 'Identity Theft Comprehensive Dispute',
  'mixed-file-correction': 'Mixed File Correction Demand',
  'student-loan-violation': 'Student Loan Reporting Violation Dispute',
  'scra-violation': 'SCRA Violation Dispute',
  'method-of-verification': 'Method of Verification Request',
  '609-unverifiable-dispute': '§ 609 Unverifiable Information Dispute',
  '611-max-accuracy': '§ 611 Maximum Accuracy Demand',
  'intent-to-sue-fcra': 'Intent to Sue Letter',
  'pre-litigation-settlement': 'Pre-Litigation Settlement Demand',
  'cfpb-complaint': 'CFPB Complaint',
  'fed-complaint': 'Federal Court Complaint (FCRA Lawsuit)',
  'state-ag-complaint': 'State Attorney General Complaint',
  'texas-finance-code-392': 'Texas Finance Code Ch. 392 Enhanced Letter',
  'new-york-gbl-349': 'New York GBL § 349 Enhanced Letter',
  'illinois-collection-agency-act': 'Illinois Collection Agency Act Enhanced Letter',
};

function textOf(v: ViolationLike): string {
  return [
    v.category, v.subcategory, v.statute, v.statute_text, v.statuteText,
    v.description, v.evidence, v.account_type, v.accountType,
    v.metro2_fields, v.metro2Fields, v.account_name, v.accountName,
  ].filter(Boolean).join(' ').toLowerCase();
}

function hasAny(hay: string, needles: string[]): boolean {
  return needles.some((n) => hay.includes(n));
}

function add(
  map: Map<string, LetterRecommendation>,
  docType: string,
  priority: number,
  reason: string,
  category: string,
  required = false,
) {
  const existing = map.get(docType);
  if (existing) {
    if (priority < existing.priority) existing.priority = priority;
    if (required) existing.required = true;
    if (!existing.reason.includes(reason)) existing.reason = `${existing.reason}; ${reason}`;
    return;
  }
  map.set(docType, {
    docType,
    name: DOC_NAMES[docType] || docType,
    priority,
    reason,
    category,
    required,
  });
}

/**
 * Recommend the right letter sequence for a violation set.
 * Always includes a core dispute pack; layers specialty letters by signal.
 */
export function recommendLetterStrategy(
  violations: ViolationLike[],
  opts: {
    litigationScore?: number;
    clientState?: string;
    includeLitigationPack?: boolean;
    /** Identity-theft letters require an affirmative consumer identification. */
    identityTheftConsumerAffirmed?: boolean;
  } = {},
): LetterStrategyResult {
  const map = new Map<string, LetterRecommendation>();
  const signals: string[] = [];
  const score = opts.litigationScore ?? 0;
  const state = String(opts.clientState || '').toUpperCase();
  const includeLitigation = opts.includeLitigationPack !== false;

  // Core always-on pack for any verified violation set
  add(map, 'bureau-dispute', 1, 'Core bureau dispute for every open violation set', 'Dispute Letters', true);
  add(map, '1681i-letter', 2, 'Statutory reinvestigation demand under § 1681i', 'Dispute Letters', true);

  if (!violations?.length) {
    return {
      recommendations: [...map.values()].sort((a, b) => a.priority - b.priority),
      packTypes: [...map.keys()],
      strategySummary: 'No violations yet — core dispute templates only.',
      signals: ['empty'],
    };
  }

  for (const v of violations) {
    const t = textOf(v);
    const sev = String(v.severity || '').toLowerCase();

    if (hasAny(t, ['obsolete', '7-year', 'seven year', '1681c', 'outdated'])) {
      signals.push('obsolete');
      add(map, 'obsolete-deletion', 3, 'Obsolete / 7-year reporting signal', 'Dispute Letters');
    }
    if (hasAny(t, ['re-ag', 'reage', 'dofd', 'date of first delinquen', 'date_of_first'])) {
      signals.push('re-aging');
      add(map, 're-aging-violation', 3, 'DOFD / re-aging Metro 2 signal', 'Dispute Letters');
    }
    if (hasAny(t, ['inquiry', 'permissible purpose', '1681b', 'hard pull'])) {
      signals.push('inquiry');
      add(map, 'unauthorized-inquiry', 4, 'Unauthorized / impermissible inquiry', 'Dispute Letters');
    }
    if (hasAny(t, ['bankrupt', 'discharge', 'chapter 7', 'chapter 13', '11 u.s.c'])) {
      signals.push('bankruptcy');
      add(map, 'post-bankruptcy-discharge', 3, 'Post-discharge reporting signal', 'Dispute Letters');
    }
    if (hasAny(t, ['medical', 'cfpb 2024', '1022.30'])) {
      signals.push('medical');
      add(map, 'medical-debt-cfpb-2024', 3, 'Medical debt / CFPB 2024 signal', 'Dispute Letters');
    }
    if (hasAny(t, ['identity theft', 'fraud', '1681c-2', 'victim'])) {
      if (opts.identityTheftConsumerAffirmed === true) {
        signals.push('identity-theft');
        add(map, 'identity-theft-block', 2, 'Identity theft / fraud block path', 'Dispute Letters', true);
      } else {
        signals.push('identity-theft-gated');
      }
    }
    if (hasAny(t, ['mixed file', 'mixed-file', 'file merger', 'wrong person'])) {
      signals.push('mixed-file');
      add(map, 'mixed-file-correction', 3, 'Mixed-file accuracy signal', 'Dispute Letters');
    }
    if (hasAny(t, ['student loan', 'navient', 'nelnet', 'mohela', 'aidvantage', '34 cfr'])) {
      signals.push('student-loan');
      add(map, 'student-loan-violation', 4, 'Student loan reporting signal', 'Dispute Letters');
    }
    if (hasAny(t, ['scra', 'military', 'servicemember', '50 u.s.c'])) {
      signals.push('scra');
      add(map, 'scra-violation', 3, 'SCRA / servicemember protection', 'Dispute Letters');
    }
    if (hasAny(t, ['collection', 'debt collector', 'fdcpa', '1692'])) {
      signals.push('collection');
      add(map, 'debt-validation', 3, 'Collection / FDCPA validation path', 'Dispute Letters');
      add(map, 'r1-collection-dispute', 4, 'R1 collection direct dispute', 'Dispute Letters');
      add(map, 'cease-desist', 5, 'Stop collection communication', 'Legal Notices');
    }
    if (hasAny(t, ['furnisher', '623', '1681s-2', 'data furnisher'])) {
      signals.push('furnisher');
      add(map, 'furnisher-dispute', 3, 'Furnisher § 623 path', 'Dispute Letters');
      add(map, '623-direct-furnisher', 4, 'Direct furnisher dispute', 'Dispute Letters');
    }
    if (hasAny(t, ['metro 2', 'metro2', 'balance exceeds', 'closed.*delinquen', 'sold balance'])) {
      signals.push('metro2');
      add(map, '611-max-accuracy', 3, 'Metro 2 / maximum accuracy demand', 'Dispute Letters');
      add(map, 'method-of-verification', 5, 'Force method-of-verification disclosure', 'Information Requests');
    }
    if (hasAny(t, ['unverifiable', 'cannot verify', '609'])) {
      signals.push('unverifiable');
      add(map, '609-unverifiable-dispute', 3, 'Unverifiable information path', 'Dispute Letters');
    }
    if (sev === 'critical' || sev === 'high') {
      signals.push('high-severity');
    }
  }

  // State-enhanced letters
  if (state === 'TX') {
    signals.push('state:TX');
    add(map, 'texas-finance-code-392', 6, 'Texas resident Chapter 392 enhancement', 'Dispute Letters');
  } else if (state === 'NY') {
    signals.push('state:NY');
    add(map, 'new-york-gbl-349', 6, 'New York GBL § 349 enhancement', 'Dispute Letters');
  } else if (state === 'IL') {
    signals.push('state:IL');
    add(map, 'illinois-collection-agency-act', 6, 'Illinois Collection Agency Act enhancement', 'Dispute Letters');
  }

  // Litigation / regulatory layer by score or severity volume
  const uniqueSignals = [...new Set(signals)];
  if (includeLitigation && (score >= 40 || uniqueSignals.includes('high-severity') || violations.length >= 3)) {
    add(map, 'intent-to-sue-fcra', 8, 'Litigation leverage — intent to sue', 'Court & Litigation filings', score >= 60);
    add(map, 'pre-litigation-settlement', 9, 'Settlement demand before filing', 'Court & Litigation filings', score >= 60);
    add(map, 'cfpb-complaint', 10, 'Regulatory pressure via CFPB', 'Regulatory Complaints', true);
  }
  if (includeLitigation && score >= 70) {
    add(map, 'fed-complaint', 11, 'High LVS — draft federal complaint package', 'Court & Litigation filings');
    add(map, 'state-ag-complaint', 12, 'Parallel state AG complaint', 'Regulatory Complaints');
  }

  const recommendations = [...map.values()].sort((a, b) => a.priority - b.priority || a.docType.localeCompare(b.docType));
  const packTypes = recommendations.map((r) => r.docType);

  const strategySummary = [
    `${violations.length} violation(s)`,
    uniqueSignals.length ? `signals: ${uniqueSignals.join(', ')}` : 'core dispute path',
    score ? `LVS ${score}` : null,
    `${recommendations.length} recommended documents`,
  ].filter(Boolean).join(' · ');

  return { recommendations, packTypes, strategySummary, signals: uniqueSignals };
}

/** Convenience: just the ordered docType list for workflow launch. */
export function selectWorkflowPackTypes(
  violations: ViolationLike[],
  opts: { litigationScore?: number; clientState?: string } = {},
): string[] {
  return recommendLetterStrategy(violations, { ...opts, includeLitigationPack: true }).packTypes;
}
