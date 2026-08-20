/**
 * One-click tenant provisioning — CREATE BUSINESS for platform super admin.
 */
import { hashPassword, generateId } from './auth';
import { validateSubdomain, tenantPortalOrigin } from './tenant-resolver';
import { buildBlueprintSettings, seedTenantBlueprint, pickCloneableSettings, BLUEPRINT_VERSION, type BlueprintInput } from './tenant-blueprint';
import { isSaaSPlanId, type SaaSPlanId } from './stripe-catalog';

export type ProvisionTenantInput = {
  businessName: string;
  legalName?: string;
  ownerName: string;
  ownerEmail: string;
  ownerPassword?: string;
  phone?: string;
  supportEmail?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  subdomain: string;
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
  timezone?: string;
  plan?: string;
  attributionMode?: 'powered_by' | 'minimal' | 'hidden';
  sendInvite?: boolean;
};

export type ProvisionTenantResult = {
  orgId: string;
  userId: string;
  subdomain: string;
  portalUrl: string;
  slug: string;
  plan: string;
  blueprintVersion: string;
  campaignsCreated: number;
  workflowsAvailable: number;
  temporaryPassword?: string;
};

function slugFromName(name: string, orgId: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) + '-' + orgId.slice(0, 8);
}

export async function provisionTenant(
  db: D1Database,
  actorUserId: string,
  input: ProvisionTenantInput,
): Promise<ProvisionTenantResult> {
  const subCheck = validateSubdomain(input.subdomain);
  if (!subCheck.ok || !subCheck.normalized) throw new Error(subCheck.error || 'Invalid subdomain');

  const email = String(input.ownerEmail || '').trim().toLowerCase();
  if (!email || !email.includes('@')) throw new Error('Valid owner email required');
  if (!input.businessName?.trim()) throw new Error('Business name required');
  if (!input.ownerName?.trim()) throw new Error('Owner name required');

  const existingSub = await db.prepare(
    'SELECT id FROM organizations WHERE lower(subdomain) = ? LIMIT 1',
  ).bind(subCheck.normalized).first();
  if (existingSub?.id) throw new Error('Subdomain already in use');

  const existingEmail = await db.prepare('SELECT id FROM users WHERE lower(email) = ? LIMIT 1').bind(email).first();
  if (existingEmail?.id) throw new Error('Owner email already registered');

  const plan: SaaSPlanId | string = isSaaSPlanId(input.plan) ? input.plan : 'professional';

  const orgId = generateId();
  const userId = generateId();
  const slug = slugFromName(input.businessName, orgId);
  const tempPassword = input.ownerPassword || `Sf${generateId().slice(0, 10)}!`;
  const passwordHash = await hashPassword(tempPassword);

  const blueprintInput: BlueprintInput = {
    businessName: input.businessName.trim(),
    legalName: input.legalName?.trim(),
    ownerName: input.ownerName.trim(),
    ownerEmail: email,
    phone: input.phone,
    supportEmail: input.supportEmail || email,
    address: input.address,
    city: input.city,
    state: input.state,
    zip: input.zip,
    subdomain: subCheck.normalized,
    primaryColor: input.primaryColor,
    secondaryColor: input.secondaryColor,
    logoUrl: input.logoUrl,
    timezone: input.timezone,
    plan,
    attributionMode: input.attributionMode,
  };

  const settings = buildBlueprintSettings(blueprintInput);

  await db.batch([
    db.prepare(
      `INSERT INTO organizations
       (id, name, slug, subdomain, legal_name, plan, settings, blueprint_version, attribution_mode, timezone, provisioned_at, provisioned_by, max_users, max_clients, max_reports_per_month)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, 25, 500, 500)`,
    ).bind(
      orgId,
      input.businessName.trim(),
      slug,
      subCheck.normalized,
      blueprintInput.legalName || input.businessName.trim(),
      plan,
      JSON.stringify(settings),
      BLUEPRINT_VERSION,
      input.attributionMode || 'powered_by',
      input.timezone || 'America/New_York',
      actorUserId,
    ),
    db.prepare(
      `INSERT INTO users (id, org_id, email, name, password_hash, role, is_active)
       VALUES (?, ?, ?, ?, ?, 'admin', 1)`,
    ).bind(userId, orgId, email, input.ownerName.trim(), passwordHash),
  ]);

  const seed = await seedTenantBlueprint({ db, orgId, userId: actorUserId, input: blueprintInput });

  try {
    await db.prepare(
      `INSERT INTO tenant_provision_log (id, org_id, action, actor_user_id, detail_json)
       VALUES (?, ?, 'create_business', ?, ?)`,
    ).bind(
      generateId(),
      orgId,
      actorUserId,
      JSON.stringify({
        subdomain: subCheck.normalized,
        ownerEmail: email,
        plan,
        portalUrl: tenantPortalOrigin(subCheck.normalized),
      }),
    ).run();
  } catch { /* soft */ }

  return {
    orgId,
    userId,
    subdomain: subCheck.normalized,
    portalUrl: tenantPortalOrigin(subCheck.normalized),
    slug,
    plan,
    blueprintVersion: BLUEPRINT_VERSION,
    campaignsCreated: seed.campaignsCreated,
    workflowsAvailable: seed.workflowsAvailable,
    temporaryPassword: input.ownerPassword ? undefined : tempPassword,
  };
}

export async function cloneTenantConfiguration(
  db: D1Database,
  actorUserId: string,
  sourceOrgId: string,
  targetOrgId: string,
): Promise<{ clonedKeys: string[] }> {
  if (sourceOrgId === targetOrgId) throw new Error('Source and target must differ');

  const [source, target] = await Promise.all([
    db.prepare('SELECT settings FROM organizations WHERE id = ?').bind(sourceOrgId).first() as Promise<any>,
    db.prepare('SELECT settings FROM organizations WHERE id = ?').bind(targetOrgId).first() as Promise<any>,
  ]);
  if (!source) throw new Error('Source organization not found');
  if (!target) throw new Error('Target organization not found');

  let sourceSettings: Record<string, unknown> = {};
  let targetSettings: Record<string, unknown> = {};
  try { sourceSettings = JSON.parse(source.settings || '{}'); } catch { /* */ }
  try { targetSettings = JSON.parse(target.settings || '{}'); } catch { /* */ }

  const cloned = pickCloneableSettings(sourceSettings);
  const merged = { ...targetSettings, ...cloned };

  await db.prepare(
    `UPDATE organizations SET settings = ?, updated_at = datetime('now') WHERE id = ?`,
  ).bind(JSON.stringify(merged), targetOrgId).run();

  try {
    await db.prepare(
      `INSERT INTO tenant_provision_log (id, org_id, action, actor_user_id, detail_json)
       VALUES (?, ?, 'clone_config', ?, ?)`,
    ).bind(
      generateId(),
      targetOrgId,
      actorUserId,
      JSON.stringify({ sourceOrgId, clonedKeys: Object.keys(cloned) }),
    ).run();
  } catch { /* soft */ }

  return { clonedKeys: Object.keys(cloned) };
}
