/**
 * Integration Hub — connection health, OAuth/PIT flows, MFSN adapter status.
 */
import { verifyGhlConnection, ghlConfigured } from './ghl-client';
import { resolvePartnerMfsnCredentials } from '../engine/mfsn-client';
import { mergeGhlEnv, mergeMfsnEnv, maskSecret, loadOrgTwilioCredentials } from './org-integrations';
import { loadIntegrationSecret, listVaultPreviews, logVaultAccess } from './credential-vault';
import { countPendingIntegrationJobs } from './integration-dlq';
import { SYSTEM_OF_RECORD, GHL_FIELD_SYNC_RULES } from './integration-sync-rules';
import { minimizationPayload } from './data-classification';

export const INTEGRATION_PROVIDERS = [
  { id: 'ghl', name: 'GoHighLevel', category: 'crm', authTypes: ['oauth', 'private_integration', 'pit'] },
  { id: 'mfsn', name: 'MyFreeScoreNow', category: 'credit_monitoring', authTypes: ['partner_api', 'affiliate_feed'] },
  { id: 'click2mail', name: 'Click2Mail', category: 'mailing', authTypes: ['api_key'] },
  { id: 'stripe', name: 'Stripe', category: 'billing', authTypes: ['api_key'] },
  { id: 'twilio', name: 'Twilio', category: 'telephony', authTypes: ['api_key'] },
  { id: 'zapier', name: 'Zapier / Webhooks', category: 'automation', authTypes: ['webhook', 'api_key'] },
  { id: 'zoom', name: 'Zoom Meetings', category: 'video', authTypes: ['oauth_s2s'] },
  { id: 'authorize_net', name: 'Authorize.net', category: 'payments', authTypes: ['api_login'] },
  { id: 'nmi', name: 'NMI Gateway', category: 'payments', authTypes: ['security_key'] },
] as const;

export async function upsertIntegrationConnection(opts: {
  db: D1Database;
  orgId: string;
  provider: string;
  patch: Partial<{
    authType: string;
    status: string;
    locationId: string;
    locationName: string;
    scopes: string[];
    config: Record<string, unknown>;
    healthStatus: string;
    lastSuccessAt: string;
    lastError: string;
    tokenExpiresAt: string;
  }>;
  id: string;
}): Promise<void> {
  const existing = await opts.db.prepare(
    'SELECT id FROM integration_connections WHERE org_id = ? AND provider = ?',
  ).bind(opts.orgId, opts.provider).first() as any;

  const p = opts.patch;
  if (existing) {
    const sets: string[] = ['updated_at = datetime(\'now\')'];
    const binds: any[] = [];
    if (p.authType) { sets.push('auth_type = ?'); binds.push(p.authType); }
    if (p.status) { sets.push('status = ?'); binds.push(p.status); }
    if (p.locationId !== undefined) { sets.push('location_id = ?'); binds.push(p.locationId); }
    if (p.locationName !== undefined) { sets.push('location_name = ?'); binds.push(p.locationName); }
    if (p.scopes) { sets.push('scopes_json = ?'); binds.push(JSON.stringify(p.scopes)); }
    if (p.config) { sets.push('config_json = ?'); binds.push(JSON.stringify(p.config)); }
    if (p.healthStatus) { sets.push('health_status = ?'); binds.push(p.healthStatus); }
    if (p.lastSuccessAt) { sets.push('last_success_at = ?'); binds.push(p.lastSuccessAt); }
    if (p.lastError !== undefined) { sets.push('last_error = ?', 'last_error_at = datetime(\'now\')'); binds.push(p.lastError); }
    if (p.tokenExpiresAt) { sets.push('token_expires_at = ?'); binds.push(p.tokenExpiresAt); }
    binds.push(existing.id);
    await opts.db.prepare(`UPDATE integration_connections SET ${sets.join(', ')} WHERE id = ?`).bind(...binds).run();
  } else {
    await opts.db.prepare(
      `INSERT INTO integration_connections (id, org_id, provider, auth_type, status, location_id, location_name, scopes_json, config_json, health_status, connected_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    ).bind(
      opts.id, opts.orgId, opts.provider,
      p.authType || 'manual', p.status || 'connected',
      p.locationId || null, p.locationName || null,
      JSON.stringify(p.scopes || []), JSON.stringify(p.config || {}),
      p.healthStatus || 'healthy',
    ).run();
  }
}

export async function loadOrgSettingsWithVault(
  db: D1Database,
  orgId: string,
  encryptionKey?: string,
): Promise<any> {
  const org = await db.prepare('SELECT settings FROM organizations WHERE id = ?').bind(orgId).first() as any;
  let settings: any = {};
  try { settings = JSON.parse(org?.settings || '{}'); } catch { /* */ }
  if (!encryptionKey) return settings;

  settings.integrations = settings.integrations || {};
  settings.integrations.ghl = settings.integrations.ghl || {};
  settings.integrations.mfsn = settings.integrations.mfsn || {};

  const pit = await loadIntegrationSecret({ db, orgId, provider: 'ghl', secretKey: 'pit_token', encryptionKey });
  if (pit) settings.integrations.ghl.pitToken = pit;

  const mfsnPass = await loadIntegrationSecret({ db, orgId, provider: 'mfsn', secretKey: 'partner_password', encryptionKey });
  if (mfsnPass) settings.integrations.mfsn.password = mfsnPass;

  const mfsnToken = await loadIntegrationSecret({ db, orgId, provider: 'mfsn', secretKey: 'client_token', encryptionKey });
  if (mfsnToken) settings.integrations.mfsn.clientToken = mfsnToken;

  return settings;
}

export async function loadOrgGhlEnv(db: D1Database, orgId: string, platformEnv: any, encryptionKey?: string) {
  const settings = await loadOrgSettingsWithVault(db, orgId, encryptionKey);
  return mergeGhlEnv(platformEnv, settings);
}

export async function integrationHubDashboard(opts: {
  db: D1Database;
  orgId: string;
  platformEnv: any;
  encryptionKey?: string;
}): Promise<Record<string, unknown>> {
  const connections = await opts.db.prepare(
    'SELECT * FROM integration_connections WHERE org_id = ? ORDER BY provider',
  ).bind(opts.orgId).all().catch(() => ({ results: [] }));

  const vaultPreviews = await listVaultPreviews(opts.db, opts.orgId);
  const pendingJobs = await countPendingIntegrationJobs(opts.db, opts.orgId);
  const identityQueue = await opts.db.prepare(
    'SELECT COUNT(*) as c FROM identity_resolution_queue WHERE org_id = ? AND status = ?',
  ).bind(opts.orgId, 'pending').first() as any;

  const ghlEnv = await loadOrgGhlEnv(opts.db, opts.orgId, opts.platformEnv, opts.encryptionKey);
  let ghlVerify: any = { ok: false };
  if (ghlConfigured(ghlEnv)) {
    try { ghlVerify = await verifyGhlConnection(ghlEnv); } catch (e: any) { ghlVerify = { ok: false, error: e.message }; }
  }

  const org = await opts.db.prepare('SELECT settings FROM organizations WHERE id = ?').bind(opts.orgId).first() as any;
  let settings: any = {};
  try { settings = JSON.parse(org?.settings || '{}'); } catch { /* */ }
  const mfsnEnv = mergeMfsnEnv(opts.platformEnv, settings);
  const mfsnPartner = resolvePartnerMfsnCredentials(mfsnEnv);

  const clientLinks = await opts.db.prepare(
    'SELECT COUNT(*) as c FROM external_identity_links WHERE org_id = ?',
  ).bind(opts.orgId).first() as any;

  const mfsnClients = await opts.db.prepare(
    `SELECT COUNT(*) as c FROM clients WHERE org_id = ? AND mfsn_member_email IS NOT NULL`,
  ).bind(opts.orgId).first() as any;

  let twilioStatus: any = { configured: false, source: 'none' };
  try {
    const encKey = opts.encryptionKey || '';
    if (encKey) {
      const tw = await loadOrgTwilioCredentials(opts.db, opts.orgId, opts.platformEnv, encKey);
      if (tw) twilioStatus = { configured: true, source: tw.source, phoneNumber: tw.phoneNumber };
    } else if (opts.platformEnv.TWILIO_ACCOUNT_SID) {
      twilioStatus = { configured: true, source: 'platform', phoneNumber: opts.platformEnv.TWILIO_PHONE_NUMBER };
    }
  } catch { /* soft */ }

  return {
    providers: INTEGRATION_PROVIDERS,
    connections: connections.results || [],
    vaultPreviews,
    pendingJobs,
    identityResolutionPending: Number(identityQueue?.c || 0),
    externalIdentityLinks: Number(clientLinks?.c || 0),
    systemOfRecord: SYSTEM_OF_RECORD,
    syncRules: GHL_FIELD_SYNC_RULES,
    dataMinimization: minimizationPayload(),
    ghl: {
      configured: ghlConfigured(ghlEnv),
      verify: ghlVerify,
      locationId: ghlEnv.GHL_LOCATION_ID || settings?.integrations?.ghl?.locationId || null,
      pitTokenMasked: vaultPreviews.ghl?.pit_token || maskSecret(settings?.integrations?.ghl?.pitToken),
      authTypes: ['oauth', 'private_integration', 'pit'],
      oauthConnectUrl: '/api/integrations/ghl/oauth/start',
      scopes: ['contacts.readonly', 'contacts.write', 'locations.readonly', 'conversations.readonly'],
      syncOptions: ['basic_contact', 'lifecycle_stage', 'appointment', 'assigned_rep', 'safe_case_status'],
      blockedFromSync: ['ssn', 'fullCreditReport', 'disputeEvidence', 'damagesModel'],
    },
    mfsn: {
      strategy: 'partner_api_first',
      disclaimer: 'Consumer credential auto-login is NOT supported unless MFSN expressly authorizes that integration model.',
      supportedMechanisms: ['official_api', 'partner_affiliate_feed', 'consumer_authorized_import', 'oauth_if_available'],
      partnerConfigured: !!mfsnPartner,
      affiliateId: settings?.integrations?.mfsn?.affiliateId || 'A8289',
      email: settings?.integrations?.mfsn?.email || null,
      passwordMasked: vaultPreviews.mfsn?.partner_password || maskSecret(settings?.integrations?.mfsn?.password),
      clientTokenMasked: vaultPreviews.mfsn?.client_token || maskSecret(settings?.integrations?.mfsn?.clientToken),
      enrolledClients: Number(mfsnClients?.c || 0),
      connectionStatus: mfsnPartner ? 'partner_configured' : 'not_configured',
    },
    twilio: {
      configured: twilioStatus.configured,
      source: twilioStatus.source,
      phoneNumber: twilioStatus.phoneNumber || settings?.integrations?.twilio?.phoneNumber || null,
      connectRoute: '/api/integration-os/connections/twilio',
      testRoute: '/api/integration-os/connections/twilio/test',
      docs: 'Settings → Twilio SMS & Video — paste Account SID, Auth Token, and your approved From number.',
    },
    healthSummary: {
      actionRequired: pendingJobs + Number(identityQueue?.c || 0),
      degraded: (connections.results || []).filter((c: any) => c.health_status === 'degraded').length,
    },
  };
}

export async function testGhlConnectionForOrg(opts: {
  db: D1Database;
  orgId: string;
  platformEnv: any;
  encryptionKey?: string;
  userId?: string;
  role?: string;
  ip?: string;
  logId: string;
}): Promise<{ ok: boolean; error?: string; locationId?: string }> {
  const ghlEnv = await loadOrgGhlEnv(opts.db, opts.orgId, opts.platformEnv, opts.encryptionKey);
  const result = await verifyGhlConnection(ghlEnv);
  await logVaultAccess({
    db: opts.db,
    orgId: opts.orgId,
    provider: 'ghl',
    action: 'test_connection',
    userId: opts.userId,
    role: opts.role,
    ip: opts.ip,
    success: !!result.ok,
    detail: result.ok ? 'OK' : String((result as any).error || 'failed'),
    id: opts.logId,
  });
  if (result.ok) {
    await upsertIntegrationConnection({
      db: opts.db,
      orgId: opts.orgId,
      provider: 'ghl',
      id: opts.logId,
      patch: {
        status: 'connected',
        healthStatus: 'healthy',
        lastSuccessAt: new Date().toISOString(),
        locationId: ghlEnv.GHL_LOCATION_ID,
        lastError: '',
      },
    });
  }
  return { ok: !!result.ok, error: (result as any).error, locationId: ghlEnv.GHL_LOCATION_ID };
}
