/**
 * AI / letter hallucination firewall.
 * Every factual assertion needs SOURCE_REPORT, CLIENT_ATTESTATION, or another allowed source.
 * Blocks guaranteed-outcome marketing language and identity-theft prompt injection.
 */

import {
  evaluateIdentityTheftGate,
  type FactSource,
  FACT_SOURCES,
} from './dispute-attestation';

export type FirewallVerdict =
  | 'PASSED_FACT_VALIDATION'
  | 'FAILED_FACT_VALIDATION'
  | 'REQUIRES_CLIENT_CONFIRMATION'
  | 'REQUIRES_HUMAN_REVIEW';

export type FactualAssertion = {
  text: string;
  source?: FactSource | string | null;
  clientConfirmed?: boolean;
  highRisk?: boolean;
};

export type FirewallResult = {
  verdict: FirewallVerdict;
  allowed: FactualAssertion[];
  blocked: { assertion: FactualAssertion; reason: string }[];
  prohibitedLanguage: string[];
  identityTheftBlocked: boolean;
};

const PROHIBITED_PHRASES = [
  'guaranteed deletion',
  'guaranteed 100-point',
  'guaranteed 750',
  'guaranteed approval',
  'guaranteed homeownership',
  'guaranteed funding',
  'guaranteed removal of accurate information',
  'we will delete',
  'we guarantee',
  'you are approved',
  '100-point increase',
];

const GROUNDED_SOURCES: FactSource[] = [
  'SOURCE_REPORT',
  'CLIENT_ATTESTATION',
  'CLIENT_DOCUMENT',
  'CRA_RESPONSE',
  'FURNISHER_RESPONSE',
  'PUBLIC_LAW',
  'SYSTEM_CALCULATION',
];

export function isAllowedFactSource(source: string | null | undefined): source is FactSource {
  return FACT_SOURCES.includes(String(source || '') as FactSource);
}

export function scanProhibitedLanguage(text: string): string[] {
  const lower = String(text || '').toLowerCase();
  return PROHIBITED_PHRASES.filter((p) => lower.includes(p));
}

export function looksLikeIdentityTheftInjection(text: string): boolean {
  const t = String(text || '').toLowerCase();
  return (
    (t.includes('identity theft') || t.includes('id theft') || t.includes('ftc identity')) &&
    (t.includes('anyway') || t.includes('ignore') || t.includes('generate anyway') || t.includes('even if') || t.includes('falsify'))
  );
}

/**
 * FOR EACH FACTUAL ASSERTION:
 *   SOURCE EXISTS? → YES ALLOW
 *   CLIENT CONFIRMED? → YES ALLOW
 *   ELSE BLOCK
 */
export function validateAssertions(
  assertions: FactualAssertion[],
  opts: { consumerAffirmedIdentityTheft?: boolean; accountIsMine?: boolean } = {},
): FirewallResult {
  const allowed: FactualAssertion[] = [];
  const blocked: { assertion: FactualAssertion; reason: string }[] = [];
  const prohibitedLanguage: string[] = [];
  let identityTheftBlocked = false;
  let needsConfirm = false;
  let needsHuman = false;

  for (const assertion of assertions) {
    const prohibited = scanProhibitedLanguage(assertion.text);
    if (prohibited.length) {
      prohibitedLanguage.push(...prohibited);
      blocked.push({ assertion, reason: `Prohibited outcome language: ${prohibited.join(', ')}` });
      continue;
    }

    if (looksLikeIdentityTheftInjection(assertion.text)) {
      const gate = evaluateIdentityTheftGate({
        consumerAffirmedIdentityTheft: !!opts.consumerAffirmedIdentityTheft,
        accountIsMine: opts.accountIsMine,
        promptInjection: true,
      });
      identityTheftBlocked = true;
      blocked.push({ assertion, reason: gate.reason });
      continue;
    }

    const source = String(assertion.source || '');
    if (source === 'MODEL_INFERENCE' && !assertion.clientConfirmed) {
      blocked.push({ assertion, reason: 'MODEL_INFERENCE cannot stand alone as a consumer statement of fact.' });
      needsConfirm = true;
      continue;
    }

    if (GROUNDED_SOURCES.includes(source as FactSource)) {
      allowed.push(assertion);
      if (assertion.highRisk) needsHuman = true;
      continue;
    }

    if (assertion.clientConfirmed) {
      allowed.push({ ...assertion, source: assertion.source || 'CLIENT_ATTESTATION' });
      continue;
    }

    blocked.push({
      assertion,
      reason: 'No authoritative source and consumer has not confirmed this statement.',
    });
    needsConfirm = true;
  }

  let verdict: FirewallVerdict = 'PASSED_FACT_VALIDATION';
  if (blocked.length && !allowed.length) verdict = 'FAILED_FACT_VALIDATION';
  else if (blocked.length && needsConfirm) verdict = 'REQUIRES_CLIENT_CONFIRMATION';
  else if (blocked.length) verdict = 'FAILED_FACT_VALIDATION';
  else if (needsHuman) verdict = 'REQUIRES_HUMAN_REVIEW';

  return {
    verdict,
    allowed,
    blocked,
    prohibitedLanguage: [...new Set(prohibitedLanguage)],
    identityTheftBlocked,
  };
}

export function letterMayFinalize(result: FirewallResult): boolean {
  return result.verdict === 'PASSED_FACT_VALIDATION' || result.verdict === 'REQUIRES_HUMAN_REVIEW';
}
