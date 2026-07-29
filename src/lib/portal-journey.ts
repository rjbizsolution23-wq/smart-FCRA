/**
 * Persist journey state + generate/send daily motivational wake-ups.
 */
import { dispatchClientAlert, type AlertEnv } from './alerts';
import {
  buildJourneyPlan,
  nextStreak,
  type JourneyInput,
  type JourneyPlan,
  type DailyMotivation,
} from '../data/client-journey';

export type JourneyEnv = AlertEnv & {
  FRONTEND_URL?: string;
  APP_BASE_URL?: string;
};

function utcDate(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function generateId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 24);
}

async function softFirst(env: JourneyEnv, sql: string, ...binds: any[]): Promise<any> {
  try {
    return await env.DB.prepare(sql).bind(...binds).first();
  } catch {
    return null;
  }
}

async function softAll(env: JourneyEnv, sql: string, ...binds: any[]): Promise<any[]> {
  try {
    const rows = await env.DB.prepare(sql).bind(...binds).all();
    return (rows?.results || []) as any[];
  } catch {
    return [];
  }
}

async function gatherJourneyInput(env: JourneyEnv, client: any): Promise<JourneyInput> {
  const clientId = client.id;
  const orgId = client.org_id;

  const [reports, viol, docs, signed, fundSnap, edu, roadmap, journey, reportMeta] = await Promise.all([
    softFirst(env, `SELECT COUNT(*) as c FROM credit_reports WHERE client_id = ? AND org_id = ?`, clientId, orgId),
    softFirst(env, `SELECT COUNT(*) as c FROM violations WHERE client_id = ? AND org_id = ?`, clientId, orgId),
    softFirst(env, `SELECT COUNT(*) as c FROM documents WHERE client_id = ? AND org_id = ?`, clientId, orgId),
    softFirst(env, `SELECT COUNT(*) as c FROM documents WHERE client_id = ? AND org_id = ? AND (status = 'signed' OR status = 'sent')`, clientId, orgId),
    softFirst(env, `SELECT overall_score, mortgage_ready, auto_ready, report_json FROM fundability_snapshots WHERE client_id = ? AND org_id = ? ORDER BY created_at DESC LIMIT 1`, clientId, orgId),
    softFirst(env, `SELECT COUNT(*) as c FROM education_progress WHERE client_id = ? AND org_id = ? AND status = 'completed'`, clientId, orgId),
    softAll(env, `SELECT completed_steps_json FROM roadmap_progress WHERE client_id = ? AND org_id = ?`, clientId, orgId),
    softFirst(env, `SELECT * FROM client_journey_state WHERE client_id = ? AND org_id = ?`, clientId, orgId),
    softFirst(env, `SELECT total_collections FROM credit_reports WHERE client_id = ? AND org_id = ? ORDER BY created_at DESC LIMIT 1`, clientId, orgId),
  ]);

  let revolvingUtilPct: number | null = null;
  let blockers: string[] = [];
  if (fundSnap?.report_json) {
    try {
      const parsed = JSON.parse(fundSnap.report_json);
      revolvingUtilPct = parsed.revolvingUtilPct ?? null;
      blockers = parsed.blockers || [];
    } catch { /* soft */ }
  }

  let roadmapCompletedSteps = 0;
  for (const row of roadmap) {
    try {
      roadmapCompletedSteps += JSON.parse(row.completed_steps_json || '[]').length;
    } catch { /* soft */ }
  }

  return {
    firstName: client.first_name || 'friend',
    preferredLanguage: client.preferred_language || 'en',
    eqScore: client.eq_score,
    exScore: client.ex_score,
    tuScore: client.tu_score,
    reportCount: reports?.c || 0,
    violationCount: viol?.c || 0,
    documentCount: docs?.c || 0,
    signedDocCount: signed?.c || 0,
    collectionCount: reportMeta?.total_collections || 0,
    revolvingUtilPct,
    fundabilityOverall: fundSnap?.overall_score ?? null,
    mortgageReady: fundSnap?.mortgage_ready ?? null,
    autoReady: fundSnap?.auto_ready ?? null,
    blockers,
    roadmapCompletedSteps,
    roadmapTotalSteps: 12,
    educationCompleted: edu?.c || 0,
    educationTotal: 8,
    focusGoal: journey?.focus_goal || 'mortgage',
    streakDays: journey?.streak_days || 0,
    sendDate: utcDate(),
  };
}

export async function ensureJourneyState(env: JourneyEnv, client: any, plan: JourneyPlan): Promise<any> {
  const existing = await env.DB.prepare(
    `SELECT * FROM client_journey_state WHERE client_id = ? AND org_id = ?`
  ).bind(client.id, client.org_id).first() as any;

  if (existing) {
    await env.DB.prepare(
      `UPDATE client_journey_state SET phase = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(plan.phase, existing.id).run();
    return { ...existing, phase: plan.phase };
  }

  const id = generateId();
  await env.DB.prepare(
    `INSERT INTO client_journey_state (id, org_id, client_id, phase, streak_days, longest_streak, focus_goal, motivation_opt_in, updated_at)
     VALUES (?, ?, ?, ?, 0, 0, 'mortgage', 1, datetime('now'))`
  ).bind(id, client.org_id, client.id, plan.phase).run();

  return {
    id,
    org_id: client.org_id,
    client_id: client.id,
    phase: plan.phase,
    streak_days: 0,
    longest_streak: 0,
    focus_goal: 'mortgage',
    motivation_opt_in: 1,
  };
}

export async function loadClientJourney(
  env: JourneyEnv,
  client: any,
): Promise<{ plan: JourneyPlan; state: any; todayLogged: boolean; todayMessage: DailyMotivation | null }> {
  const input = await gatherJourneyInput(env, client);
  const plan = buildJourneyPlan(input);
  const state = await ensureJourneyState(env, client, plan);
  plan.today = buildJourneyPlan({ ...input, streakDays: state.streak_days || 0 }).today;

  const today = utcDate();
  const logged = await env.DB.prepare(
    `SELECT * FROM daily_motivation_log WHERE client_id = ? AND send_date = ?`
  ).bind(client.id, today).first() as any;

  return {
    plan,
    state,
    todayLogged: !!logged,
    todayMessage: logged
      ? {
          title: logged.title,
          greeting: plan.today.greeting,
          body: logged.body,
          focusAction: logged.focus_action || plan.today.focusAction,
          focusCta: plan.today.focusCta,
          suggestions: plan.suggestions,
          phase: (logged.phase || plan.phase) as any,
          phaseLabel: plan.phaseLabel,
          encouragement: plan.today.encouragement,
        }
      : plan.today,
  };
}

export async function checkInJourney(env: JourneyEnv, client: any): Promise<{ streak: number; longest: number; plan: JourneyPlan }> {
  const loaded = await loadClientJourney(env, client);
  const today = utcDate();
  const { streak } = nextStreak(loaded.state.last_check_in_date, loaded.state.streak_days || 0, today);
  const longest = Math.max(loaded.state.longest_streak || 0, streak);

  await env.DB.prepare(
    `UPDATE client_journey_state SET streak_days = ?, longest_streak = ?, last_check_in_date = ?, phase = ?, updated_at = datetime('now')
     WHERE client_id = ? AND org_id = ?`
  ).bind(streak, longest, today, loaded.plan.phase, client.id, client.org_id).run();

  const input = await gatherJourneyInput(env, client);
  const plan = buildJourneyPlan({ ...input, streakDays: streak });
  return { streak, longest, plan };
}

export async function generateAndDispatchDailyMotivation(
  env: JourneyEnv,
  client: any,
  opts?: { force?: boolean },
): Promise<{ sent: boolean; skipped?: string; motivation?: DailyMotivation; channels?: any }> {
  if (client.journey_opt_in === 0) {
    return { sent: false, skipped: 'opted_out' };
  }
  const optIn = client.journey_opt_in !== 0 && client.notify_email !== 0;
  const stateRow = await env.DB.prepare(
    `SELECT * FROM client_journey_state WHERE client_id = ?`
  ).bind(client.id).first() as any;
  if (stateRow && stateRow.motivation_opt_in === 0) {
    return { sent: false, skipped: 'opted_out' };
  }

  const today = utcDate();
  if (!opts?.force) {
    const existing = await env.DB.prepare(
      `SELECT id FROM daily_motivation_log WHERE client_id = ? AND send_date = ?`
    ).bind(client.id, today).first();
    if (existing) return { sent: false, skipped: 'already_sent_today' };
  }

  const input = await gatherJourneyInput(env, client);
  const plan = buildJourneyPlan({ ...input, streakDays: stateRow?.streak_days || 0 });
  const motivation = plan.today;

  await ensureJourneyState(env, client, plan);

  const channels = await dispatchClientAlert(env, {
    orgId: client.org_id,
    clientId: client.id,
    eventType: 'daily_motivation',
    title: motivation.title,
    body: `${motivation.body}\n\n→ Today's focus: ${motivation.focusAction}\n\n${motivation.encouragement}`,
    email: optIn && client.email ? client.email : null,
    phone: client.phone_e164 || client.phone,
    notifyEmail: optIn !== false && !!client.email && client.notify_email !== 0,
    notifySms: !!client.notify_sms && !!(client.phone_e164 || client.phone),
  });

  const logId = generateId();
  try {
    await env.DB.prepare(
      `INSERT INTO daily_motivation_log (id, org_id, client_id, send_date, title, body, focus_action, suggestions_json, phase, channels_json, alert_ids_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(client_id, send_date) DO UPDATE SET
         title = excluded.title,
         body = excluded.body,
         focus_action = excluded.focus_action,
         suggestions_json = excluded.suggestions_json,
         phase = excluded.phase,
         channels_json = excluded.channels_json,
         alert_ids_json = excluded.alert_ids_json`
    ).bind(
      logId,
      client.org_id,
      client.id,
      today,
      motivation.title,
      motivation.body,
      motivation.focusAction,
      JSON.stringify(motivation.suggestions),
      plan.phase,
      JSON.stringify({ email: channels.email, sms: channels.sms, in_app: true }),
      JSON.stringify(channels.alertIds || []),
    ).run();
  } catch (e) {
    console.warn('[journey] motivation log insert failed', e);
  }

  await env.DB.prepare(
    `UPDATE client_journey_state SET last_motivation_date = ?, phase = ?, updated_at = datetime('now') WHERE client_id = ? AND org_id = ?`
  ).bind(today, plan.phase, client.id, client.org_id).run();

  return { sent: true, motivation, channels };
}

export async function dispatchDailyMotivationBatch(
  env: JourneyEnv,
  opts?: { orgId?: string; limit?: number },
): Promise<{ processed: number; sent: number; skipped: number; errors: number }> {
  const limit = Math.min(opts?.limit || 200, 500);
  let clients: any[] = [];
  try {
    let q = `SELECT * FROM clients WHERE status != 'purged' AND COALESCE(journey_opt_in, 1) = 1`;
    const binds: any[] = [];
    if (opts?.orgId) {
      q += ` AND org_id = ?`;
      binds.push(opts.orgId);
    }
    q += ` ORDER BY updated_at DESC LIMIT ?`;
    binds.push(limit);
    const rows = await env.DB.prepare(q).bind(...binds).all();
    clients = (rows?.results || []) as any[];
  } catch {
    let q = `SELECT * FROM clients WHERE status != 'purged'`;
    const binds: any[] = [];
    if (opts?.orgId) {
      q += ` AND org_id = ?`;
      binds.push(opts.orgId);
    }
    q += ` ORDER BY updated_at DESC LIMIT ?`;
    binds.push(limit);
    const rows = await env.DB.prepare(q).bind(...binds).all();
    clients = (rows?.results || []) as any[];
  }
  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (const client of clients) {
    try {
      const r = await generateAndDispatchDailyMotivation(env, client);
      if (r.sent) sent++;
      else skipped++;
    } catch (e) {
      console.error('[journey] dispatch failed for', client.id, e);
      errors++;
    }
  }

  return { processed: clients.length, sent, skipped, errors };
}
