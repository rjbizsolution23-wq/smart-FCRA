/**
 * Escalation engine — recommend round-2 / MOV / intent-to-sue when bureau replies "verified".
 */
import { recommendLetterStrategy } from '../engine/letter-strategy';

export type EscalationTrigger = 'bureau_verified' | 'no_change_after_dispute' | 'deadline_expired' | 'staff_manual';

export type EscalationRecommendation = {
  triggerType: EscalationTrigger;
  recommendedAction: string;
  letterTypes: string[];
  priority: 'high' | 'medium' | 'low';
  explanation: string[];
};

export function buildEscalationRecommendation(opts: {
  triggerType: EscalationTrigger;
  replyOutcome?: string;
  violationCategories?: string[];
  roundNumber?: number;
}): EscalationRecommendation {
  const round = opts.roundNumber || 1;
  const strategy = recommendLetterStrategy(
    (opts.violationCategories || []).map((cat) => ({ category: cat, severity: 'high', subcategory: cat })),
    { includeLitigationPack: round >= 2 },
  );
  const letterTypes = strategy.packTypes.slice(0, 4);

  if (opts.triggerType === 'bureau_verified' || opts.replyOutcome === 'verified') {
    return {
      triggerType: opts.triggerType,
      recommendedAction: round >= 2 ? 'Consider method-of-verification demand or §611 follow-up' : 'Generate round-2 dispute with method-of-verification',
      letterTypes: letterTypes.length ? letterTypes : ['method-of-verification', '1681i-letter', 'bureau-dispute'],
      priority: 'high',
      explanation: [
        'Bureau or furnisher response indicates verification without adequate reinvestigation detail.',
        'Human review required before sending — do not promise deletion or legal violation.',
        `Suggested escalation round: ${round + 1}`,
      ],
    };
  }

  return {
    triggerType: opts.triggerType,
    recommendedAction: 'Review file and select next evidence-backed correspondence',
    letterTypes: letterTypes.length ? letterTypes : ['bureau-dispute'],
    priority: 'medium',
    explanation: ['Standard escalation path based on case stage.'],
  };
}

export async function persistEscalation(opts: {
  db: D1Database;
  id: string;
  orgId: string;
  clientId: string;
  documentId?: string;
  violationId?: string;
  rec: EscalationRecommendation;
}): Promise<void> {
  await opts.db.prepare(
    `INSERT INTO escalation_queue (id, org_id, client_id, document_id, violation_id, trigger_type, recommended_action, letter_types_json, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
  ).bind(
    opts.id, opts.orgId, opts.clientId, opts.documentId || null, opts.violationId || null,
    opts.rec.triggerType, opts.rec.recommendedAction, JSON.stringify(opts.rec.letterTypes),
  ).run();
}
