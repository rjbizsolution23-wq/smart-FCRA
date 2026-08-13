/**
 * Smart FCRA client-portal intelligence APIs.
 * Evidence-first disputes, CROA cancellation, consents, credit events, compliance evaluate.
 */
import type { Hono } from 'hono';
import { generateId } from './auth';
import { sha256Hex } from '../data/legal-contracts';
import {
  attestationCanonicalPayload,
  deriveDisputeReasons,
  evaluateIdentityTheftGate,
  interviewForIssue,
  type ClientAttestation,
} from '../engine/dispute-attestation';
import { validateAssertions, type FactualAssertion } from '../engine/hallucination-firewall';
import { tallyResultTaxonomy } from '../engine/credit-events';
import { computeNextBestAction, CASE_STAGE_LABELS, type NbaContext } from '../engine/next-best-action';
import { aggregateUtilization } from '../engine/utilization';
import { evaluateBillableEvent, isCoveredCreditRepairService, BILLING_POLICY_VERSION } from './billing-compliance';
import { findingHasForbiddenLabel } from '../engine/metro2-findings';

const CONSENT_CATALOG = [
  { type: 'ELECTRONIC_COMMUNICATIONS', version: '1.0', label: 'Electronic communications' },
  { type: 'SMS', version: '1.0', label: 'SMS' },
  { type: 'EMAIL', version: '1.0', label: 'Email' },
  { type: 'E_SIGNATURES', version: '1.0', label: 'E-signatures' },
  { type: 'CREDIT_REPORT_ANALYSIS', version: '1.0', label: 'Credit report analysis' },
  { type: 'CREDIT_MONITORING_CONNECTION', version: '1.0', label: 'Credit monitoring connection' },
  { type: 'DOCUMENT_GENERATION', version: '1.0', label: 'Document generation' },
  { type: 'MAIL_AUTHORIZATION', version: '1.0', label: 'Mail authorization' },
  { type: 'THIRD_PARTY_DATA_SHARING', version: '1.0', label: 'Third-party data sharing' },
  { type: 'PARTNER_REFERRAL', version: '1.0', label: 'Partner referral' },
  { type: 'AI_ASSISTED_ANALYSIS', version: '2.1', label: 'AI-assisted analysis' },
  { type: 'OPTIONAL_MARKETING', version: '1.0', label: 'Optional marketing' },
];

const CONSUMER_RIGHTS = {
  disclaimer: 'Educational summary of federal consumer rights. Not legal advice. Official sources control.',
  topics: [
    {
      id: 'fcra-dispute',
      title: 'Credit report disputes (FCRA)',
      body: 'Consumers may dispute inaccurate or incomplete information with consumer reporting companies and with furnishers. The CFPB states that consumer reporting companies generally investigate disputes within 30 days; some circumstances permit up to 45 days. Results generally follow after the investigation.',
      source: 'Consumer Financial Protection Bureau',
    },
    {
      id: 'croa',
      title: 'Credit repair (CROA)',
      body: 'The Credit Repair Organizations Act requires specified consumer disclosures, a written contract, and cancellation rights. It prohibits charging for covered credit-repair services before the promised service has been fully performed.',
      source: 'Federal Trade Commission',
    },
    {
      id: 'tsr',
      title: 'Telemarketing Sales Rule',
      body: 'The TSR contains additional restrictions applicable to certain telemarketed credit-repair transactions, including advance-fee limits where the rule applies.',
      source: 'eCFR / FTC',
    },
    {
      id: 'fdcpa',
      title: 'Debt collection (FDCPA)',
      body: 'Collectors are restricted in how they may communicate and must, when applicable, validate debts. This portal does not automatically file complaints.',
      source: 'CFPB / FTC',
    },
    {
      id: 'identity-theft',
      title: 'Identity theft',
      body: 'Identity-theft disputes require you to affirmatively identify the account or transaction as related to identity theft. This system will not recommend a false identity-theft claim as a deletion tactic.',
      source: 'FTC / FCRA § 1681c-2',
    },
  ],
};

const CANCELLATION_RIGHTS = {
  title: 'Cancel credit repair services',
  body: 'You may cancel covered credit-repair services. CROA provides a cancellation right; your written contract states the timing that applies to you. Cancellation is available here — you do not need to hunt through support.',
  notes: [
    'Cancelling services is different from closing your portal login, a privacy deletion request, a legal hold, or record-retention requirements.',
    'We will record who requested cancellation, when, the channel, and a confirmation number.',
  ],
};

function qJson(v: any, fallback: any) {
  if (!v) return fallback;
  try { return JSON.parse(v); } catch { return fallback; }
}

async function softAll(db: any, sql: string, ...bind: any[]) {
  try {
    const r = await db.prepare(sql).bind(...bind).all();
    return r?.results || [];
  } catch {
    return [];
  }
}

async function softFirst(db: any, sql: string, ...bind: any[]) {
  try {
    return await db.prepare(sql).bind(...bind).first();
  } catch {
    return null;
  }
}

function forbidStaffConsumerAction(user: any): string | null {
  if (user?.role !== 'client') {
    return 'Staff preview cannot attest, approve disputes, or cancel services. Impersonation cannot forge consumer authorization.';
  }
  return null;
}

function scoreModelLabel(report: any): { model: string; score: number | null; provider: string | null; date: string | null } {
  const vantage = report?.vantage_score ?? null;
  const fico = report?.fico_score ?? null;
  const score = fico ?? vantage ?? null;
  let model = 'Score model not identified on this report';
  if (vantage != null && (fico == null || vantage === score)) model = 'VantageScore 3.0';
  if (fico != null && vantage == null) model = 'FICO Score (model version not specified by source)';
  if (fico != null && vantage != null && fico === score) model = 'FICO Score (model version not specified by source)';
  return {
    model,
    score,
    provider: report?.source_provider || null,
    date: report?.report_date || report?.created_at || null,
  };
}

export function registerClientIntelligenceRoutes(
  app: Hono<any>,
  deps: {
    authMiddleware: any;
    resolvePortalClientSafe: (c: any, user: any, bodyClientId?: string) => Promise<any | null>;
    isPortalAnalysisUnlocked: (client: any) => boolean;
  },
) {
  const { authMiddleware, resolvePortalClientSafe, isPortalAnalysisUnlocked } = deps;

  app.get('/api/client-portal/intelligence', authMiddleware, async (c) => {
    const user = c.get('user');
    const client = await resolvePortalClientSafe(c, user, c.req.query('clientId') || undefined);
    if (!client) return c.json({ error: 'Client profile not found' }, 404);
    const unlocked = isPortalAnalysisUnlocked(client);
    const gate = user.role === 'client' && !unlocked;

    const reports = await softAll(
      c.env.DB,
      `SELECT id, bureau, report_date, created_at, fico_score, vantage_score, source_provider, total_accounts, total_collections, total_inquiries, is_current
       FROM credit_reports WHERE client_id = ? AND org_id = ? ORDER BY created_at DESC LIMIT 20`,
      client.id, user.org_id,
    );
    const currentByBureau: Record<string, any> = {};
    for (const r of reports) {
      const b = String(r.bureau || '');
      if (b && !currentByBureau[b]) currentByBureau[b] = r;
    }

    const events = gate ? [] : await softAll(
      c.env.DB,
      `SELECT * FROM credit_events WHERE client_id = ? AND org_id = ? ORDER BY created_at DESC LIMIT 40`,
      client.id, user.org_id,
    );
    const disputes = gate ? [] : await softAll(
      c.env.DB,
      `SELECT * FROM portal_disputes WHERE client_id = ? AND org_id = ? ORDER BY created_at DESC LIMIT 40`,
      client.id, user.org_id,
    );
    const findings = gate ? [] : await softAll(
      c.env.DB,
      `SELECT * FROM case_findings WHERE client_id = ? AND org_id = ? AND status = 'OPEN' ORDER BY created_at DESC LIMIT 30`,
      client.id, user.org_id,
    );
    const attestations = await softAll(
      c.env.DB,
      `SELECT question_id, account_key, response FROM client_attestations WHERE client_id = ? AND org_id = ? ORDER BY created_at DESC LIMIT 200`,
      client.id, user.org_id,
    );
    const uploads = await softAll(
      c.env.DB,
      `SELECT id, category FROM portal_uploads WHERE client_id = ? AND org_id = ? LIMIT 50`,
      client.id, user.org_id,
    );
    const cancel = await softFirst(
      c.env.DB,
      `SELECT * FROM service_cancellations WHERE client_id = ? AND org_id = ? ORDER BY requested_at DESC LIMIT 1`,
      client.id, user.org_id,
    );
    const contracts = await softAll(
      c.env.DB,
      `SELECT id, status, contract_type FROM legal_contracts WHERE client_id = ? AND org_id = ? LIMIT 20`,
      client.id, user.org_id,
    );

    const attestedKeys = new Set(attestations.map((a: any) => a.account_key).filter(Boolean));
    const pendingAttestations = findings.filter((f: any) => f.requires_consumer_confirmation && !attestedKeys.has(f.id)).length
      || Math.max(0, (gate ? 0 : findings.length) - attestedKeys.size);

    const nbaCtx: NbaContext = {
      hasReport: reports.length > 0,
      analysisUnlocked: unlocked,
      pendingAttestations: gate ? 0 : pendingAttestations,
      draftDisputes: disputes.filter((d: any) => d.status === 'DISPUTE_PREPARATION' || d.status === 'CLIENT_REVIEW').length,
      awaitingApproval: disputes.filter((d: any) => d.status === 'CLIENT_APPROVAL').length,
      mailedPendingResponse: disputes.filter((d: any) => ['MAILED', 'DELIVERED', 'INVESTIGATION'].includes(d.status)).length,
      responseUploadedUnreviewed: disputes.filter((d: any) => d.status === 'RESPONSE_RECEIVED').length,
      missingIdUpload: !uploads.some((u: any) => /id|identity|address/i.test(String(u.category || ''))),
      unsignedContract: contracts.length > 0 && !contracts.some((x: any) => String(x.status || '').toLowerCase().includes('sign')),
      cancellationRequested: !!cancel && cancel.status !== 'WITHDRAWN',
    };
    const nba = computeNextBestAction(nbaCtx);

    const scores = ['Experian', 'Equifax', 'TransUnion'].map((bureau) => {
      const row = currentByBureau[bureau];
      const meta = scoreModelLabel(row || {});
      const clientScore = bureau === 'Experian' ? client.ex_score : bureau === 'Equifax' ? client.eq_score : client.tu_score;
      const score = meta.score ?? clientScore ?? null;
      return {
        bureau,
        score,
        scoreModel: score == null ? 'No score on file' : meta.model,
        provider: meta.provider,
        dateObtained: meta.date,
        previousScore: null as number | null,
        change: null as number | null,
      };
    });

    const results = tallyResultTaxonomy(events.map((e: any) => ({ taxonomy: e.taxonomy, eventType: e.event_type })));
    const health = {
      paymentHistory: findings.some((f: any) => f.field === 'accountStatus') ? 'Needs attention' : 'Review in reports',
      utilization: null as number | null,
      creditAge: null as string | null,
      derogatories: Number(client.total_collections || 0) || events.filter((e: any) => e.taxonomy === 'NEW_DEROGATORY').length,
      collections: currentByBureau.Experian?.total_collections || currentByBureau.Equifax?.total_collections || currentByBureau.TransUnion?.total_collections || 0,
      hardInquiries: currentByBureau.Experian?.total_inquiries || currentByBureau.Equifax?.total_inquiries || currentByBureau.TransUnion?.total_inquiries || 0,
      accountMix: 'See My Credit',
    };

    const hour = new Date().getUTCHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    return c.json({
      client: {
        id: client.id,
        first_name: client.first_name,
        last_name: client.last_name,
        currentStage: nba.stage,
        stageLabel: CASE_STAGE_LABELS[nba.stage],
      },
      greeting,
      journeyPercent: reports.length ? (unlocked ? 48 : 22) + Math.min(40, disputes.filter((d: any) => d.approved_at).length * 8) : 8,
      analysisUnlocked: unlocked,
      analysisLocked: gate,
      lastReportRefresh: reports[0]?.report_date || reports[0]?.created_at || null,
      monitoringStatus: client.mfsn_member_id ? 'Connected' : 'Not connected',
      scores,
      nextBestAction: nba.primary,
      additionalActions: nba.additional,
      results: gate ? null : results,
      creditHealth: gate ? null : health,
      recentEvents: gate ? [] : events.slice(0, 8).map((e: any) => ({
        id: e.id,
        eventType: e.event_type,
        taxonomy: e.taxonomy,
        field: e.field,
        previousValue: e.previous_value,
        newValue: e.new_value,
        bureau: e.bureau,
        detectedAt: e.detected_at || e.created_at,
      })),
      findings: gate ? [] : findings.filter((f: any) => !findingHasForbiddenLabel(f.note || f.severity || '')),
      disputes: gate ? [] : disputes,
      noGuaranteeNotice: 'Smart FCRA does not guarantee deletions, score increases, lending approval, homeownership, or funding.',
    });
  });

  app.get('/api/client-portal/credit-events', authMiddleware, async (c) => {
    const user = c.get('user');
    const client = await resolvePortalClientSafe(c, user, c.req.query('clientId') || undefined);
    if (!client) return c.json({ error: 'Client profile not found' }, 404);
    const events = await softAll(
      c.env.DB,
      `SELECT * FROM credit_events WHERE client_id = ? AND org_id = ? ORDER BY created_at DESC LIMIT 200`,
      client.id, user.org_id,
    );
    return c.json({ events, results: tallyResultTaxonomy(events.map((e: any) => ({ taxonomy: e.taxonomy }))) });
  });

  app.get('/api/client-portal/findings', authMiddleware, async (c) => {
    const user = c.get('user');
    const client = await resolvePortalClientSafe(c, user, c.req.query('clientId') || undefined);
    if (!client) return c.json({ error: 'Client profile not found' }, 404);
    const findings = await softAll(
      c.env.DB,
      `SELECT * FROM case_findings WHERE client_id = ? AND org_id = ? ORDER BY created_at DESC LIMIT 100`,
      client.id, user.org_id,
    );
    return c.json({ findings });
  });

  app.get('/api/client-portal/interview', authMiddleware, async (c) => {
    const issue = c.req.query('issue') || '';
    return c.json({ questions: interviewForIssue(issue) });
  });

  app.get('/api/client-portal/attestations', authMiddleware, async (c) => {
    const user = c.get('user');
    const client = await resolvePortalClientSafe(c, user, c.req.query('clientId') || undefined);
    if (!client) return c.json({ error: 'Client profile not found' }, 404);
    const rows = await softAll(
      c.env.DB,
      `SELECT id, account_key, violation_id, question_id, response, client_statement, evidence_ids_json, accepted_at, statement_hash
       FROM client_attestations WHERE client_id = ? AND org_id = ? ORDER BY created_at DESC LIMIT 200`,
      client.id, user.org_id,
    );
    return c.json({ attestations: rows, questions: interviewForIssue(c.req.query('issue') || '') });
  });

  app.post('/api/client-portal/attestations', authMiddleware, async (c) => {
    const user = c.get('user');
    const blocked = forbidStaffConsumerAction(user);
    if (blocked) return c.json({ error: blocked }, 403);
    const body = await c.req.json();
    const client = await resolvePortalClientSafe(c, user, body.clientId);
    if (!client) return c.json({ error: 'Client profile not found' }, 404);

    const items: ClientAttestation[] = Array.isArray(body.attestations) ? body.attestations : [body];
    const saved: any[] = [];
    for (const item of items) {
      const questionId = String(item.questionId || body.questionId || '').trim();
      const response = String(item.response || '').toUpperCase();
      if (!questionId || !['YES', 'NO', 'UNSURE'].includes(response)) {
        return c.json({ error: 'Each attestation needs questionId and YES | NO | UNSURE' }, 400);
      }
      const payload = attestationCanonicalPayload({
        questionId,
        accountId: item.accountId || body.accountKey,
        response,
        clientStatement: item.clientStatement,
        evidenceIds: item.evidenceIds,
      });
      const hash = await sha256Hex(payload);
      const id = generateId();
      await c.env.DB.prepare(
        `INSERT INTO client_attestations (
           id, org_id, client_id, account_key, violation_id, dispute_id, question_id, response,
           client_statement, evidence_ids_json, statement_hash, created_by
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        id, user.org_id, client.id, item.accountId || body.accountKey || null,
        body.violationId || null, body.disputeId || null, questionId, response,
        item.clientStatement || null, JSON.stringify(item.evidenceIds || []), hash, user.id,
      ).run();
      saved.push({ id, questionId, response, statementHash: hash });
    }

    const derived = deriveDisputeReasons(items.map((i) => ({
      questionId: String(i.questionId),
      accountId: i.accountId,
      response: String(i.response).toUpperCase() as any,
      clientStatement: i.clientStatement,
      evidenceIds: i.evidenceIds,
    })));

    await c.env.DB.prepare(
      `INSERT INTO action_receipts (id, org_id, client_id, action, confirmation_number, payload_json)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(
      generateId(), user.org_id, client.id, 'CLIENT_ATTESTED',
      `ACT-${saved[0]?.id?.slice(0, 8).toUpperCase()}`,
      JSON.stringify({ count: saved.length, reasons: derived.reasons }),
    ).run().catch(() => null);

    return c.json({ ok: true, attestations: saved, derived, immutable: true });
  });

  app.get('/api/client-portal/disputes', authMiddleware, async (c) => {
    const user = c.get('user');
    const client = await resolvePortalClientSafe(c, user, c.req.query('clientId') || undefined);
    if (!client) return c.json({ error: 'Client profile not found' }, 404);
    const rows = await softAll(
      c.env.DB,
      `SELECT * FROM portal_disputes WHERE client_id = ? AND org_id = ? ORDER BY created_at DESC LIMIT 100`,
      client.id, user.org_id,
    );
    return c.json({ disputes: rows });
  });

  app.post('/api/client-portal/disputes', authMiddleware, async (c) => {
    const user = c.get('user');
    const blocked = forbidStaffConsumerAction(user);
    if (blocked) return c.json({ error: blocked }, 403);
    const body = await c.req.json();
    const client = await resolvePortalClientSafe(c, user, body.clientId);
    if (!client) return c.json({ error: 'Client profile not found' }, 404);

    const attRows = await softAll(
      c.env.DB,
      `SELECT question_id, response, client_statement, evidence_ids_json, account_key
       FROM client_attestations WHERE client_id = ? AND org_id = ? AND (account_key = ? OR ? IS NULL)
       ORDER BY created_at DESC LIMIT 50`,
      client.id, user.org_id, body.accountKey || null, body.accountKey || null,
    );
    const attestations: ClientAttestation[] = attRows.map((r: any) => ({
      questionId: r.question_id,
      accountId: r.account_key,
      response: r.response,
      clientStatement: r.client_statement,
      evidenceIds: qJson(r.evidence_ids_json, []),
    }));
    const derived = deriveDisputeReasons(attestations);
    if (!derived.reasons.length) {
      return c.json({
        error: 'NO_FABRICATED_DISPUTE_REASON',
        message: 'No dispute reason can be generated from your confirmed facts. Accurate information is not treated as automatically disputable.',
        derived,
      }, 400);
    }
    if (derived.reasons.includes('IDENTITY_THEFT') === false && /identity.?theft/i.test(String(body.forceReason || body.prompt || ''))) {
      const gate = evaluateIdentityTheftGate({
        consumerAffirmedIdentityTheft: false,
        accountIsMine: true,
        promptInjection: true,
      });
      return c.json({ error: 'IDENTITY_THEFT_BLOCKED', message: gate.reason, derived }, 403);
    }

    const assertions: FactualAssertion[] = (body.assertions || derived.reasons.map((r) => ({
      text: r.replace(/_/g, ' ').toLowerCase(),
      source: 'CLIENT_ATTESTATION',
      clientConfirmed: true,
    })));
    const firewall = validateAssertions(assertions, {
      consumerAffirmedIdentityTheft: derived.reasons.includes('IDENTITY_THEFT'),
      accountIsMine: attestations.some((a) => a.questionId === 'opened_account' && a.response === 'YES'),
    });
    if (firewall.verdict === 'FAILED_FACT_VALIDATION') {
      return c.json({ error: 'FAILED_FACT_VALIDATION', firewall, derived }, 400);
    }

    const id = generateId();
    await c.env.DB.prepare(
      `INSERT INTO portal_disputes (
         id, org_id, client_id, account_key, account_name, recipient_type, recipient, status,
         dispute_basis_json, requested_resolution_json, evidence_ids_json, client_attestation_ids_json,
         firewall_verdict, created_by
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id, user.org_id, client.id, body.accountKey || null, body.accountName || null,
      body.recipientType || 'CRA', body.recipient || 'EXPERIAN',
      firewall.verdict === 'REQUIRES_CLIENT_CONFIRMATION' ? 'CLIENT_REVIEW' : 'CLIENT_APPROVAL',
      JSON.stringify(derived.reasons),
      JSON.stringify(body.requestedResolution || ['Investigate and correct inaccurate information']),
      JSON.stringify(body.evidenceIds || []),
      JSON.stringify(attRows.map((r: any) => r.question_id)),
      firewall.verdict, user.id,
    ).run();

    return c.json({ id, derived, firewall, status: 'CLIENT_APPROVAL' });
  });

  app.post('/api/client-portal/disputes/:id/approve', authMiddleware, async (c) => {
    const user = c.get('user');
    const blocked = forbidStaffConsumerAction(user);
    if (blocked) return c.json({ error: blocked }, 403);
    const client = await resolvePortalClientSafe(c, user, c.req.query('clientId') || undefined);
    if (!client) return c.json({ error: 'Client profile not found' }, 404);
    const id = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    if (body.confirmAccurate !== true) {
      return c.json({ error: 'You must confirm these statements are accurate, or request changes.' }, 400);
    }
    const dispute = await softFirst(
      c.env.DB,
      `SELECT * FROM portal_disputes WHERE id = ? AND client_id = ? AND org_id = ?`,
      id, client.id, user.org_id,
    );
    if (!dispute) return c.json({ error: 'Dispute not found' }, 404);

    const approvalId = generateId();
    await c.env.DB.prepare(
      `INSERT INTO letter_approvals (id, org_id, client_id, dispute_id, letter_id, statements_json, evidence_json, confirmed_accurate, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`
    ).bind(
      approvalId, user.org_id, client.id, id, dispute.letter_id,
      dispute.dispute_basis_json || '[]', dispute.evidence_ids_json || '[]', user.id,
    ).run();
    await c.env.DB.prepare(
      `UPDATE portal_disputes SET status = 'READY_TO_SEND', approved_at = datetime('now') WHERE id = ? AND org_id = ?`
    ).bind(id, user.org_id).run();

    const confirmation = `ACT-${approvalId.slice(0, 8).toUpperCase()}`;
    await c.env.DB.prepare(
      `INSERT INTO action_receipts (id, org_id, client_id, action, confirmation_number, payload_json)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(generateId(), user.org_id, client.id, 'DISPUTE_APPROVED', confirmation, JSON.stringify({ disputeId: id })).run();

    return c.json({ ok: true, approvalId, confirmation, immutable: true });
  });

  app.get('/api/client-portal/consents', authMiddleware, async (c) => {
    const user = c.get('user');
    const client = await resolvePortalClientSafe(c, user, c.req.query('clientId') || undefined);
    if (!client) return c.json({ error: 'Client profile not found' }, 404);
    const rows = await softAll(
      c.env.DB,
      `SELECT * FROM client_consents WHERE client_id = ? AND org_id = ? ORDER BY consent_type`,
      client.id, user.org_id,
    );
    return c.json({ catalog: CONSENT_CATALOG, consents: rows });
  });

  app.post('/api/client-portal/consents', authMiddleware, async (c) => {
    const user = c.get('user');
    const blocked = forbidStaffConsumerAction(user);
    if (blocked) return c.json({ error: blocked }, 403);
    const body = await c.req.json();
    const client = await resolvePortalClientSafe(c, user, body.clientId);
    if (!client) return c.json({ error: 'Client profile not found' }, 404);
    const type = String(body.consentType || '').toUpperCase();
    const version = String(body.version || '1.0');
    const status = String(body.status || 'GRANTED').toUpperCase();
    if (!type || !['GRANTED', 'REVOKED', 'DENIED'].includes(status)) {
      return c.json({ error: 'consentType and status (GRANTED|REVOKED|DENIED) required' }, 400);
    }
    const id = generateId();
    const accepted = status === 'GRANTED' ? new Date().toISOString() : null;
    const revoked = status === 'REVOKED' ? new Date().toISOString() : null;
    await c.env.DB.prepare(
      `INSERT INTO client_consents (id, org_id, client_id, consent_type, version, status, presented_at, accepted_at, revoked_at, source)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?, ?, 'CLIENT_PORTAL')
       ON CONFLICT(client_id, consent_type, version) DO UPDATE SET
         status = excluded.status, accepted_at = excluded.accepted_at, revoked_at = excluded.revoked_at, updated_at = datetime('now')`
    ).bind(id, user.org_id, client.id, type, version, status, accepted, revoked).run();
    return c.json({ ok: true, consentType: type, status });
  });

  app.get('/api/client-portal/cancel-services', authMiddleware, async (c) => {
    const user = c.get('user');
    const client = await resolvePortalClientSafe(c, user, c.req.query('clientId') || undefined);
    if (!client) return c.json({ error: 'Client profile not found' }, 404);
    const existing = await softFirst(
      c.env.DB,
      `SELECT * FROM service_cancellations WHERE client_id = ? AND org_id = ? ORDER BY requested_at DESC LIMIT 1`,
      client.id, user.org_id,
    );
    return c.json({
      rights: CANCELLATION_RIGHTS,
      currentStatus: existing || { status: 'ACTIVE', service: 'credit_repair' },
      statesNote: 'SERVICE CANCELLATION, PORTAL DEACTIVATION, PRIVACY DELETION REQUEST, RECORD RETENTION, and LEGAL HOLD are different states.',
    });
  });

  app.post('/api/client-portal/cancel-services', authMiddleware, async (c) => {
    const user = c.get('user');
    const blocked = forbidStaffConsumerAction(user);
    if (blocked) return c.json({ error: blocked }, 403);
    const body = await c.req.json().catch(() => ({}));
    const client = await resolvePortalClientSafe(c, user, body.clientId);
    if (!client) return c.json({ error: 'Client profile not found' }, 404);
    const id = generateId();
    const confirmation = `CXL-${id.slice(0, 8).toUpperCase()}`;
    const effective = new Date();
    effective.setUTCDate(effective.getUTCDate() + 3);
    await c.env.DB.prepare(
      `INSERT INTO service_cancellations (
         id, org_id, client_id, requested_at, effective_at, channel, reason_optional, confirmation_number, created_by
       ) VALUES (?, ?, ?, datetime('now'), ?, 'CLIENT_PORTAL', ?, ?, ?)`
    ).bind(id, user.org_id, client.id, effective.toISOString(), body.reason || null, confirmation, user.id).run();
    await c.env.DB.prepare(
      `INSERT INTO action_receipts (id, org_id, client_id, action, confirmation_number, payload_json)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(generateId(), user.org_id, client.id, 'CANCELLATION_REQUESTED', confirmation, JSON.stringify({ cancellationId: id })).run();
    return c.json({
      ok: true,
      cancellationId: id,
      confirmationNumber: confirmation,
      effectiveAt: effective.toISOString(),
      channel: 'CLIENT_PORTAL',
    });
  });

  app.get('/api/client-portal/rights', authMiddleware, async (c) => {
    return c.json(CONSUMER_RIGHTS);
  });

  app.get('/api/client-portal/action-receipts', authMiddleware, async (c) => {
    const user = c.get('user');
    const client = await resolvePortalClientSafe(c, user, c.req.query('clientId') || undefined);
    if (!client) return c.json({ error: 'Client profile not found' }, 404);
    const rows = await softAll(
      c.env.DB,
      `SELECT * FROM action_receipts WHERE client_id = ? AND org_id = ? ORDER BY created_at DESC LIMIT 50`,
      client.id, user.org_id,
    );
    return c.json({ receipts: rows });
  });

  app.get('/api/client-portal/utilization', authMiddleware, async (c) => {
    const user = c.get('user');
    const client = await resolvePortalClientSafe(c, user, c.req.query('clientId') || undefined);
    if (!client) return c.json({ error: 'Client profile not found' }, 404);
    const snaps = await softAll(
      c.env.DB,
      `SELECT furnisher_name, balance, credit_limit FROM tradeline_snapshots
       WHERE client_id = ? AND org_id = ? AND credit_limit > 0
       ORDER BY created_at DESC LIMIT 40`,
      client.id, user.org_id,
    );
    const seen = new Set<string>();
    const accounts = [];
    for (const s of snaps) {
      const k = s.furnisher_name;
      if (seen.has(k)) continue;
      seen.add(k);
      accounts.push({ name: s.furnisher_name, balance: Number(s.balance || 0), limit: Number(s.credit_limit || 0) });
    }
    return c.json(aggregateUtilization(accounts));
  });

  app.get('/api/client-portal/billing-center', authMiddleware, async (c) => {
    const user = c.get('user');
    const client = await resolvePortalClientSafe(c, user, c.req.query('clientId') || undefined);
    if (!client) return c.json({ error: 'Client profile not found' }, 404);
    const services = await softAll(
      c.env.DB,
      `SELECT id, service_type, performed_at, status FROM service_records WHERE client_id = ? AND org_id = ? ORDER BY performed_at DESC LIMIT 50`,
      client.id, user.org_id,
    );
    return c.json({
      currentServices: [{ type: 'credit_intelligence', status: client.payment_status || 'active' }],
      completedServices: services,
      notice: 'Internal CROA/TSR billing rules are not exposed here. Invoices and receipts appear when generated.',
      cancelPage: 'client-cancel',
    });
  });

  app.post('/api/compliance/evaluate', authMiddleware, async (c) => {
    const user = c.get('user');
    const body = await c.req.json();
    const action = String(body.action || '');
    const client = body.client_id || body.clientId
      ? await resolvePortalClientSafe(c, user, body.client_id || body.clientId)
      : await resolvePortalClientSafe(c, user, c.req.query('clientId') || undefined);

    if (action === 'CHARGE_PAYMENT' || action === 'BILL_SERVICE') {
      const evalResult = evaluateBillableEvent({
        clientState: client?.state,
        serviceType: body.serviceType || 'credit_report_analysis',
        salesChannel: body.salesChannel || 'ONLINE',
        contractSigned: !!body.contractSigned,
        croaDisclosuresAcknowledged: !!body.croaDisclosuresAcknowledged,
        serviceFullyPerformed: !!body.serviceFullyPerformed,
        coveredCreditRepair: isCoveredCreditRepairService(body.serviceType || 'credit_report_analysis'),
        tsrApplies: body.tsrApplies,
      });
      const decisionId = generateId();
      await c.env.DB.prepare(
        `INSERT INTO compliance_decisions (id, org_id, client_id, action_type, rules_evaluated_json, result, explanation_json, policy_version)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        decisionId, user.org_id, client?.id || null, action,
        JSON.stringify(evalResult.requirements), evalResult.result,
        JSON.stringify(evalResult.explanation), evalResult.policyVersion,
      ).run().catch(() => null);
      return c.json({ result: evalResult.result, requirements: evalResult.requirements, decision_id: decisionId, explanation: evalResult.explanation });
    }

    if (action === 'SEND_DISPUTE' || action === 'CLAIM_IDENTITY_THEFT') {
      const disputeId = body.dispute_id || body.disputeId;
      const dispute = disputeId ? await softFirst(
        c.env.DB,
        `SELECT * FROM portal_disputes WHERE id = ? AND org_id = ?`,
        disputeId, user.org_id,
      ) : null;
      const att = client ? await softAll(
        c.env.DB,
        `SELECT question_id, response FROM client_attestations WHERE client_id = ? AND org_id = ? ORDER BY created_at DESC LIMIT 80`,
        client.id, user.org_id,
      ) : [];
      const derived = deriveDisputeReasons(att.map((a: any) => ({ questionId: a.question_id, response: a.response })));
      const idTheft = evaluateIdentityTheftGate({
        consumerAffirmedIdentityTheft: derived.reasons.includes('IDENTITY_THEFT'),
        accountIsMine: att.some((a: any) => a.question_id === 'opened_account' && a.response === 'YES'),
        promptInjection: action === 'CLAIM_IDENTITY_THEFT' && !derived.reasons.includes('IDENTITY_THEFT'),
      });
      let result = 'ALLOW';
      const explanation: string[] = [];
      if (action === 'CLAIM_IDENTITY_THEFT' && idTheft.blocked) {
        result = 'BLOCK';
        explanation.push(idTheft.reason);
      }
      if (action === 'SEND_DISPUTE' && (!dispute || !dispute.approved_at)) {
        result = 'BLOCK';
        explanation.push('Unsigned / unapproved dispute cannot bypass required client approval.');
      }
      const decisionId = generateId();
      await c.env.DB.prepare(
        `INSERT INTO compliance_decisions (id, org_id, client_id, action_type, rules_evaluated_json, result, explanation_json, policy_version)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        decisionId, user.org_id, client?.id || null, action,
        JSON.stringify(derived.reasons), result, JSON.stringify(explanation), BILLING_POLICY_VERSION,
      ).run().catch(() => null);
      return c.json({ result, requirements: explanation, decision_id: decisionId, derived });
    }

    return c.json({ result: 'MANUAL_REVIEW', requirements: ['Unknown action type'], decision_id: null }, 400);
  });

  app.get('/api/compliance/decisions/:id', authMiddleware, async (c) => {
    const user = c.get('user');
    const row = await softFirst(
      c.env.DB,
      `SELECT * FROM compliance_decisions WHERE id = ? AND org_id = ?`,
      c.req.param('id'), user.org_id,
    );
    if (!row) return c.json({ error: 'Not found' }, 404);
    return c.json({ decision: row });
  });
}
