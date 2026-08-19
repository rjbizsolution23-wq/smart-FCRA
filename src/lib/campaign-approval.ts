/**
 * Campaign approval workflow — draft → brand → compliance → approved → send.
 */
export type ApprovalStatus =
  | 'draft'
  | 'brand_review'
  | 'compliance_review'
  | 'approved'
  | 'scheduled'
  | 'sent'
  | 'rejected';

export const APPROVAL_TRANSITIONS: Record<ApprovalStatus, ApprovalStatus[]> = {
  draft: ['brand_review', 'compliance_review'],
  brand_review: ['compliance_review', 'draft', 'rejected'],
  compliance_review: ['approved', 'draft', 'rejected'],
  approved: ['scheduled', 'sent'],
  scheduled: ['sent', 'draft'],
  sent: [],
  rejected: ['draft'],
};

export function canTransition(from: ApprovalStatus, to: ApprovalStatus): boolean {
  return (APPROVAL_TRANSITIONS[from] || []).includes(to);
}

export async function transitionCampaignApproval(opts: {
  db: D1Database;
  orgId: string;
  campaignId: string;
  toStatus: ApprovalStatus;
  reviewerId: string;
  notes?: string;
  logId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const campaign = await opts.db.prepare(
    'SELECT approval_status, body_template, subject FROM marketing_campaigns WHERE id = ? AND org_id = ?',
  ).bind(opts.campaignId, opts.orgId).first() as any;
  if (!campaign) return { ok: false, error: 'Campaign not found' };

  const from = (campaign.approval_status || 'draft') as ApprovalStatus;
  if (!canTransition(from, opts.toStatus)) {
    return { ok: false, error: `Cannot transition ${from} → ${opts.toStatus}` };
  }

  if (opts.toStatus === 'approved' || opts.toStatus === 'compliance_review') {
    const { assertCopyApprovedForSend } = await import('./copy-qa');
    const copyText = `${campaign.subject || ''}\n${campaign.body_template || ''}`;
    const qa = assertCopyApprovedForSend(copyText);
    if (!qa.ok && opts.toStatus === 'approved') {
      return { ok: false, error: qa.error || 'Copy QA failed — prohibited phrases detected' };
    }
  }

  const updates: string[] = ['approval_status = ?', 'updated_at = datetime(\'now\')'];
  const binds: any[] = [opts.toStatus];

  if (opts.toStatus === 'approved') {
    updates.push('approved_by = ?', 'approved_at = datetime(\'now\')');
    binds.push(opts.reviewerId);
  }
  if (opts.toStatus === 'compliance_review' || opts.toStatus === 'approved') {
    updates.push('compliance_reviewed_by = ?', 'compliance_reviewed_at = datetime(\'now\')');
    binds.push(opts.reviewerId);
  }

  binds.push(opts.campaignId, opts.orgId);
  await opts.db.prepare(
    `UPDATE marketing_campaigns SET ${updates.join(', ')} WHERE id = ? AND org_id = ?`,
  ).bind(...binds).run();

  await opts.db.prepare(
    `INSERT INTO campaign_approval_log (id, org_id, target_type, target_id, from_status, to_status, reviewer_id, notes)
     VALUES (?, ?, 'campaign', ?, ?, ?, ?, ?)`,
  ).bind(opts.logId, opts.orgId, opts.campaignId, from, opts.toStatus, opts.reviewerId, opts.notes || null).run();

  return { ok: true };
}

export async function simulateCampaignSuppression(opts: {
  db: D1Database;
  orgId: string;
  segmentId: string;
}): Promise<{ audience: number; blocked: number; allowed: number; sampleBlocks: string[] }> {
  const { resolveSegmentAudience, BUILTIN_SEGMENTS } = await import('./campaign-builder');
  const { canSendMessage } = await import('./comms-compliance');
  const audience = await resolveSegmentAudience(opts.db, opts.orgId, opts.segmentId);
  let blocked = 0;
  let allowed = 0;
  const sampleBlocks: string[] = [];
  for (const client of audience) {
    const gate = await canSendMessage({
      db: opts.db,
      orgId: opts.orgId,
      clientId: client.id,
      email: client.email,
      lane: 'marketing',
      channel: 'email',
    });
    if (gate.allowed) allowed += 1;
    else {
      blocked += 1;
      if (sampleBlocks.length < 5) sampleBlocks.push(gate.reasons[0] || 'blocked');
    }
  }
  return { audience: audience.length, blocked, allowed, sampleBlocks };
}
