/**
 * Load tutor growth profile for a client — journey-aware companion memory.
 */
import {
  buildTutorGrowthProfile,
  buildTutorSystemAddendum,
  buildTutorFallbackReply,
  type TutorGrowthInput,
  type TutorGrowthProfile,
} from '../data/tutor-growth';
import { EDUCATION_LIBRARY } from '../data/portal-education';
import { buildJourneyPlan } from '../data/client-journey';

export type TutorEnv = {
  DB: any;
};

async function softFirst(env: TutorEnv, sql: string, ...binds: any[]): Promise<any> {
  try {
    return await env.DB.prepare(sql).bind(...binds).first();
  } catch {
    return null;
  }
}

async function softAll(env: TutorEnv, sql: string, ...binds: any[]): Promise<any[]> {
  try {
    const rows = await env.DB.prepare(sql).bind(...binds).all();
    return (rows?.results || []) as any[];
  } catch {
    return [];
  }
}

export async function gatherTutorGrowthInput(env: TutorEnv, client: any, memory?: any): Promise<TutorGrowthInput> {
  const clientId = client.id;
  const orgId = client.org_id;

  const [reports, viol, signed, fundSnap, edu, roadmap, journey, reportMeta, underwriting, financialUploads] = await Promise.all([
    softFirst(env, `SELECT COUNT(*) as c FROM credit_reports WHERE client_id = ? AND org_id = ?`, clientId, orgId),
    softFirst(env, `SELECT COUNT(*) as c FROM violations WHERE client_id = ? AND org_id = ?`, clientId, orgId),
    softFirst(env, `SELECT COUNT(*) as c FROM documents WHERE client_id = ? AND org_id = ? AND (status = 'signed' OR status = 'sent')`, clientId, orgId),
    softFirst(env, `SELECT overall_score, report_json FROM fundability_snapshots WHERE client_id = ? AND org_id = ? ORDER BY created_at DESC LIMIT 1`, clientId, orgId),
    softFirst(env, `SELECT COUNT(*) as c FROM education_progress WHERE client_id = ? AND org_id = ? AND status = 'completed'`, clientId, orgId),
    softAll(env, `SELECT completed_steps_json FROM roadmap_progress WHERE client_id = ? AND org_id = ?`, clientId, orgId),
    softFirst(env, `SELECT * FROM client_journey_state WHERE client_id = ? AND org_id = ?`, clientId, orgId),
    softFirst(env, `SELECT total_collections FROM credit_reports WHERE client_id = ? AND org_id = ? ORDER BY created_at DESC LIMIT 1`, clientId, orgId),
    softFirst(env, `SELECT monthly_income, monthly_debt, dti_pct, reserves_months, report_json, created_at FROM underwriting_snapshots WHERE client_id = ? AND org_id = ? ORDER BY created_at DESC LIMIT 1`, clientId, orgId),
    softAll(env, `SELECT category, file_name, analysis_json, created_at FROM portal_uploads WHERE client_id = ? AND org_id = ? AND category IN ('bank_statement','paystub','w2','tax_return') ORDER BY created_at DESC LIMIT 5`, clientId, orgId),
  ]);

  let revolvingUtilPct: number | null = null;
  if (fundSnap?.report_json) {
    try {
      revolvingUtilPct = JSON.parse(fundSnap.report_json).revolvingUtilPct ?? null;
    } catch { /* soft */ }
  }

  let roadmapCompletedSteps = 0;
  for (const row of roadmap) {
    try {
      roadmapCompletedSteps += JSON.parse(row.completed_steps_json || '[]').length;
    } catch { /* soft */ }
  }

  const journeyInput = {
    firstName: client.first_name || 'friend',
    preferredLanguage: client.preferred_language || 'en',
    eqScore: client.eq_score,
    exScore: client.ex_score,
    tuScore: client.tu_score,
    reportCount: reports?.c || 0,
    violationCount: viol?.c || 0,
    documentCount: 0,
    signedDocCount: signed?.c || 0,
    collectionCount: reportMeta?.total_collections || 0,
    revolvingUtilPct,
    fundabilityOverall: fundSnap?.overall_score ?? null,
    focusGoal: journey?.focus_goal || 'mortgage',
    streakDays: journey?.streak_days || 0,
    educationCompleted: edu?.c || 0,
    educationTotal: EDUCATION_LIBRARY.length,
    roadmapCompletedSteps,
    roadmapTotalSteps: 12,
  };

  const plan = buildJourneyPlan(journeyInput);
  const milestonesDone = plan.milestones.filter((m) => m.done).length;

  const financialBits: string[] = [];
  if (underwriting) {
    financialBits.push(
      `Latest underwriting ${underwriting.created_at || ''}: income ~$${Number(underwriting.monthly_income || 0).toFixed(0)}/mo, debts ~$${Number(underwriting.monthly_debt || 0).toFixed(0)}/mo, DTI ${underwriting.dti_pct ?? 'n/a'}%, reserves ${underwriting.reserves_months ?? 'n/a'} mo.`,
    );
  }
  for (const u of financialUploads || []) {
    let summary = '';
    try {
      const a = JSON.parse(u.analysis_json || '{}');
      summary = String(a.summary || '').slice(0, 400);
      if (!summary && a.underwriting) {
        summary = `DTI ${a.underwriting.dtiPct}% · income $${a.underwriting.monthlyIncomeEstimate}`;
      }
    } catch { /* */ }
    financialBits.push(`${u.category} “${u.file_name || ''}” (${(u.created_at || '').slice(0, 10)}): ${summary || 'uploaded — ask client to confirm numbers'}`);
  }

  return {
    firstName: client.first_name || 'friend',
    preferredLanguage: client.preferred_language || 'en',
    eqScore: client.eq_score,
    exScore: client.ex_score,
    tuScore: client.tu_score,
    journeyPhase: plan.phase,
    phaseLabel: plan.phaseLabel,
    focusGoal: journey?.focus_goal || 'mortgage',
    streakDays: journey?.streak_days || 0,
    journeyProgressPct: plan.progressPct,
    violationCount: viol?.c || 0,
    signedDocCount: signed?.c || 0,
    fundabilityOverall: fundSnap?.overall_score ?? null,
    revolvingUtilPct,
    collectionCount: reportMeta?.total_collections || 0,
    educationCompleted: edu?.c || 0,
    educationTotal: EDUCATION_LIBRARY.length,
    sessionsCount: memory?.sessions_count || 0,
    roadmapCompletedSteps,
    milestonesDone,
    milestonesTotal: plan.milestones.length,
    financialSummary: financialBits.length ? financialBits.join('\n') : null,
  };
}

export async function loadTutorCompanion(
  env: TutorEnv,
  client: any,
): Promise<{ growth: TutorGrowthProfile; input: TutorGrowthInput; memory: any; progress: any[] }> {
  let memory: any = null;
  try {
    memory = await env.DB.prepare(
      `SELECT * FROM tutor_memory WHERE client_id = ? AND org_id = ?`
    ).bind(client.id, client.org_id).first();
  } catch { /* soft */ }

  let progress: any[] = [];
  try {
    const rows = await env.DB.prepare(
      `SELECT lesson_id, status, quiz_score, quiz_total FROM education_progress WHERE client_id = ?`
    ).bind(client.id).all();
    progress = rows?.results || [];
  } catch { /* soft */ }

  const input = await gatherTutorGrowthInput(env, client, memory);
  const growth = buildTutorGrowthProfile(input);

  // Persist growth snapshot (soft — columns may be added by migration 0011)
  try {
    if (memory?.id) {
      await env.DB.prepare(
        `UPDATE tutor_memory SET level = ?, xp = ?, rank_title = ?, growth_json = ?, updated_at = datetime('now') WHERE id = ?`
      ).bind(growth.level, growth.xp, growth.rankTitle, JSON.stringify({
        rank: growth.rank,
        curriculumFocus: growth.curriculumFocus,
        phase: input.journeyPhase,
        notes: growth.growthNotes,
      }), memory.id).run();
    }
  } catch {
    try {
      if (memory?.id) {
        await env.DB.prepare(
          `UPDATE tutor_memory SET strengths_json = ?, updated_at = datetime('now') WHERE id = ?`
        ).bind(JSON.stringify({
          level: growth.level,
          xp: growth.xp,
          rank: growth.rank,
          rankTitle: growth.rankTitle,
          curriculumFocus: growth.curriculumFocus,
          phase: input.journeyPhase,
        }), memory.id).run();
      }
    } catch { /* soft */ }
  }

  return { growth, input, memory, progress };
}

export function tutorChatSystemBlock(input: TutorGrowthInput, growth: TutorGrowthProfile, memorySummary?: string | null, goalsJson?: string | null): string {
  return [
    buildTutorSystemAddendum(input, growth),
    memorySummary ? `Long-term tutor memory:\n${memorySummary.slice(0, 2500)}` : '',
    goalsJson ? `Stored goals JSON: ${goalsJson}` : '',
  ].filter(Boolean).join('\n\n');
}

export { buildTutorFallbackReply, buildTutorGrowthProfile };
