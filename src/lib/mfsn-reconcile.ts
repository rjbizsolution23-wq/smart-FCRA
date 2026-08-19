/**
 * Reconcile MyFreeScoreNow affiliate members → Smart FCRA clients (+ optional GHL sync).
 */
import { fetchMfsnMemberList } from './mfsn-admin';
import { syncMfsnMemberToGhl, syncClientToGhl } from './ghl-client';
import { mergeGhlEnv, mergeMfsnEnv, resolveOrgMfsnCredentials } from './org-integrations';
import { startWorkflowRun } from './crm-workflow-engine';
import { portalBaseUrl } from './portal-services';

export async function reconcileMfsnMembersToClients(opts: {
  db: D1Database;
  env: any;
  orgId: string;
  orgSettings: any;
  orgName?: string;
  list?: 'active' | 'paused';
  generateId: () => string;
  syncGhl?: boolean;
}): Promise<{
  fetched: number;
  created: number;
  updated: number;
  linked: number;
  ghlSynced: number;
  errors: string[];
}> {
  const mfsnEnv = mergeMfsnEnv(opts.env, opts.orgSettings);
  if (!resolveOrgMfsnCredentials(opts.env, opts.orgSettings)) {
    return { fetched: 0, created: 0, updated: 0, linked: 0, ghlSynced: 0, errors: ['MFSN not configured'] };
  }

  const fetched = await fetchMfsnMemberList(mfsnEnv, opts.list || 'active');
  if (!fetched.ok) {
    return { fetched: 0, created: 0, updated: 0, linked: 0, ghlSynced: 0, errors: [fetched.error || 'MFSN fetch failed'] };
  }

  const members = fetched.members || [];
  let created = 0;
  let updated = 0;
  let linked = 0;
  let ghlSynced = 0;
  const errors: string[] = [];
  const ghlEnv = mergeGhlEnv(opts.env, opts.orgSettings);
  const portalUrl = `${portalBaseUrl(opts.env)}/`;

  for (const member of members) {
    const email = String(member.email || member.memberEmail || '').trim().toLowerCase();
    if (!email) continue;

    let client = await opts.db.prepare(
      'SELECT * FROM clients WHERE org_id = ? AND lower(email) = ?',
    ).bind(opts.orgId, email).first() as any;

    const memberId = String(member.id || member.memberId || member.customerId || '');
    const status = String(member.status || member.accountStatus || 'active');
    const fields = {
      mfsn_member_id: memberId || null,
      mfsn_account_status: status,
      mfsn_member_email: email,
      signup_source: client?.signup_source || 'mfsn_reconcile',
    };

    if (!client) {
      const clientId = opts.generateId();
      await opts.db.prepare(
        `INSERT INTO clients (id, org_id, email, first_name, last_name, status, case_status, lifecycle_stage,
          mfsn_member_id, mfsn_account_status, mfsn_member_email, signup_source, portal_analysis_unlocked, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'active', 'ONBOARDING', 'onboarding', ?, ?, ?, 'mfsn_reconcile', 0, datetime('now'), datetime('now'))`,
      ).bind(
        clientId, opts.orgId, email,
        member.firstName || member.first_name || '',
        member.lastName || member.last_name || '',
        fields.mfsn_member_id, fields.mfsn_account_status, email,
      ).run();
      client = await opts.db.prepare('SELECT * FROM clients WHERE id = ?').bind(clientId).first();
      created += 1;

      await startWorkflowRun({
        db: opts.db,
        env: opts.env,
        orgId: opts.orgId,
        workflowKey: 'welcome',
        clientId,
        context: { portal_link: portalUrl },
        generateId: opts.generateId,
      }).catch(() => { /* soft */ });
    } else {
      await opts.db.prepare(
        `UPDATE clients SET mfsn_member_id = ?, mfsn_account_status = ?, mfsn_member_email = ?,
         updated_at = datetime('now') WHERE id = ? AND org_id = ?`,
      ).bind(fields.mfsn_member_id, fields.mfsn_account_status, email, client.id, opts.orgId).run();
      updated += 1;
      linked += 1;
    }

    if (opts.syncGhl !== false) {
      try {
        const ghlMember = await syncMfsnMemberToGhl(ghlEnv, member, {
          orgName: opts.orgName,
          portalUrl,
        });
        if (ghlMember.ok && ghlMember.contactId && client) {
          await opts.db.prepare(
            'UPDATE clients SET ghl_contact_id = ?, ghl_synced_at = datetime(\'now\') WHERE id = ? AND org_id = ?',
          ).bind(ghlMember.contactId, client.id, opts.orgId).run();
          ghlSynced += 1;
        } else if (client) {
          const synced = await syncClientToGhl(ghlEnv, client, {
            portalUrl,
            orgName: opts.orgName,
            analysisUnlocked: client.portal_analysis_unlocked === 1,
          });
          if (synced.ok && synced.contactId) {
            await opts.db.prepare(
              'UPDATE clients SET ghl_contact_id = ?, ghl_synced_at = datetime(\'now\') WHERE id = ? AND org_id = ?',
            ).bind(synced.contactId, client.id, opts.orgId).run();
            ghlSynced += 1;
          }
        }
      } catch (e: any) {
        errors.push(`${email}: ${e?.message || e}`);
      }
    }
  }

  return { fetched: members.length, created, updated, linked, ghlSynced, errors: errors.slice(0, 20) };
}
