/**
 * Evidence-first dispute reasons from consumer attestations + source data.
 * Never: NEGATIVE ACCOUNT → RANDOM REASON → TEMPLATE.
 * Identity theft is a gated workflow, not a deletion tactic.
 */

export const FACT_SOURCES = [
  'SOURCE_REPORT',
  'CLIENT_ATTESTATION',
  'CLIENT_DOCUMENT',
  'CRA_RESPONSE',
  'FURNISHER_RESPONSE',
  'PUBLIC_LAW',
  'SYSTEM_CALCULATION',
  'MODEL_INFERENCE',
] as const;

export type FactSource = (typeof FACT_SOURCES)[number];

export const DISPUTE_REASONS = [
  'ACCOUNT_NOT_RECOGNIZED',
  'BALANCE_INACCURATE',
  'PAYMENT_HISTORY_INACCURATE',
  'ACCOUNT_STATUS_INACCURATE',
  'ACCOUNT_OWNERSHIP_INACCURATE',
  'ACCOUNT_TYPE_INACCURATE',
  'DATE_INACCURATE',
  'DUPLICATE_ACCOUNT',
  'LIMIT_INACCURATE',
  'PAST_DUE_INACCURATE',
  'ACCOUNT_INFORMATION_INCOMPLETE',
  'IDENTITY_THEFT',
  'MIXED_FILE',
  'AUTHORIZED_USER_ISSUE',
] as const;

export type DisputeReason = (typeof DISPUTE_REASONS)[number];

export type AttestationAnswer = 'YES' | 'NO' | 'UNSURE';

export type ClientAttestation = {
  questionId: string;
  accountId?: string;
  response: AttestationAnswer;
  clientStatement?: string;
  evidenceIds?: string[];
};

export type InterviewQuestion = {
  questionId: string;
  prompt: string;
  mapsTo?: DisputeReason;
  identityTheftGate?: boolean;
};

export const CORE_INTERVIEW: InterviewQuestion[] = [
  { questionId: 'recognize_account', prompt: 'Do you recognize this account?' },
  { questionId: 'opened_account', prompt: 'Did you open this account?' },
  { questionId: 'balance_accuracy', prompt: 'Is the reported balance correct?', mapsTo: 'BALANCE_INACCURATE' },
  { questionId: 'late_as_reported', prompt: 'Were you late during the reported month(s)?', mapsTo: 'PAYMENT_HISTORY_INACCURATE' },
  { questionId: 'status_accuracy', prompt: 'Is the reported account status correct?', mapsTo: 'ACCOUNT_STATUS_INACCURATE' },
  { questionId: 'ownership_accuracy', prompt: 'Are you the person responsible for this account as reported?', mapsTo: 'ACCOUNT_OWNERSHIP_INACCURATE' },
  {
    questionId: 'identity_theft',
    prompt: 'Do you affirmatively identify this account or transaction as related to identity theft?',
    mapsTo: 'IDENTITY_THEFT',
    identityTheftGate: true,
  },
];

export function interviewForIssue(issueHint?: string): InterviewQuestion[] {
  const hint = String(issueHint || '').toLowerCase();
  const extra: InterviewQuestion[] = [];
  if (hint.includes('limit') || hint.includes('credit limit')) {
    extra.push({ questionId: 'limit_accuracy', prompt: 'Is the reported credit limit correct?', mapsTo: 'LIMIT_INACCURATE' });
  }
  if (hint.includes('past due') || hint.includes('pastdue')) {
    extra.push({ questionId: 'past_due_accuracy', prompt: 'Is the reported past-due amount correct?', mapsTo: 'PAST_DUE_INACCURATE' });
  }
  if (hint.includes('duplicate')) {
    extra.push({ questionId: 'duplicate_account', prompt: 'Is this a duplicate of another account you already have?', mapsTo: 'DUPLICATE_ACCOUNT' });
  }
  if (hint.includes('date')) {
    extra.push({ questionId: 'date_accuracy', prompt: 'Are the reported dates (opened / closed / first delinquency) correct?', mapsTo: 'DATE_INACCURATE' });
  }
  return [...CORE_INTERVIEW, ...extra];
}

export type DerivedReasonResult = {
  reasons: DisputeReason[];
  blocked: string[];
  requiresClientConfirmation: boolean;
  identityTheftBlocked: boolean;
};

/**
 * Reasons are generated only from consumer answers and (optionally) source-report facts.
 * Accurate, recognized accounts produce NO fabricated dispute reason.
 */
export function deriveDisputeReasons(
  attestations: ClientAttestation[],
  opts: { sourceFactsPresent?: boolean } = {},
): DerivedReasonResult {
  const byQ = new Map(attestations.map((a) => [a.questionId, a]));
  const reasons: DisputeReason[] = [];
  const blocked: string[] = [];

  const recognize = byQ.get('recognize_account');
  const opened = byQ.get('opened_account');
  const mine = opened?.response === 'YES' || recognize?.response === 'YES';

  if (recognize?.response === 'NO' && opened?.response !== 'YES') {
    reasons.push('ACCOUNT_NOT_RECOGNIZED');
  }

  const addIfNo = (qid: string, reason: DisputeReason) => {
    const a = byQ.get(qid);
    if (a?.response === 'NO') reasons.push(reason);
  };

  addIfNo('balance_accuracy', 'BALANCE_INACCURATE');
  addIfNo('late_as_reported', 'PAYMENT_HISTORY_INACCURATE');
  addIfNo('status_accuracy', 'ACCOUNT_STATUS_INACCURATE');
  addIfNo('ownership_accuracy', 'ACCOUNT_OWNERSHIP_INACCURATE');
  addIfNo('limit_accuracy', 'LIMIT_INACCURATE');
  addIfNo('past_due_accuracy', 'PAST_DUE_INACCURATE');
  addIfNo('date_accuracy', 'DATE_INACCURATE');

  const dup = byQ.get('duplicate_account');
  if (dup?.response === 'YES') reasons.push('DUPLICATE_ACCOUNT');

  const idTheft = byQ.get('identity_theft');
  const idGate = evaluateIdentityTheftGate({
    consumerAffirmedIdentityTheft: idTheft?.response === 'YES',
    accountIsMine: mine,
    promptInjection: false,
  });
  if (idGate.allowed) reasons.push('IDENTITY_THEFT');
  if (idGate.blocked) {
    blocked.push(idGate.reason);
  }

  const unique = [...new Set(reasons)];
  const requiresClientConfirmation = attestations.some((a) => a.response === 'UNSURE') || unique.length === 0;

  return {
    reasons: unique,
    blocked,
    requiresClientConfirmation,
    identityTheftBlocked: idGate.blocked,
  };
}

export type IdentityTheftGateInput = {
  consumerAffirmedIdentityTheft: boolean;
  accountIsMine?: boolean;
  promptInjection?: boolean;
};

export type IdentityTheftGateResult = {
  allowed: boolean;
  blocked: boolean;
  reason: string;
};

/**
 * Identity theft workflows require an affirmative consumer identification.
 * Never recommend false identity-theft representations as a routine deletion tactic.
 */
export function evaluateIdentityTheftGate(input: IdentityTheftGateInput): IdentityTheftGateResult {
  if (input.promptInjection) {
    return {
      allowed: false,
      blocked: true,
      reason: 'BLOCKED: identity-theft claim cannot be generated from a prompt injection or staff/AI instruction.',
    };
  }
  if (input.accountIsMine && !input.consumerAffirmedIdentityTheft) {
    return {
      allowed: false,
      blocked: true,
      reason: 'BLOCKED: consumer reports the account is theirs. Identity-theft workflow is not available.',
    };
  }
  if (!input.consumerAffirmedIdentityTheft) {
    return {
      allowed: false,
      blocked: true,
      reason: 'BLOCKED: identity theft requires an affirmative consumer identification of the account or transaction.',
    };
  }
  return { allowed: true, blocked: false, reason: 'Consumer affirmatively identified identity theft.' };
}

export function attestationCanonicalPayload(a: {
  questionId: string;
  accountId?: string;
  response: string;
  clientStatement?: string;
  evidenceIds?: string[];
}): string {
  return JSON.stringify({
    questionId: a.questionId,
    accountId: a.accountId || null,
    response: String(a.response || '').toUpperCase(),
    clientStatement: a.clientStatement || '',
    evidenceIds: [...(a.evidenceIds || [])].sort(),
  });
}
