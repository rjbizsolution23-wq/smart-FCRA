/**
 * Tenant Blueprint — default Smart FCRA package seeded on one-click provisioning.
 * Global locked controls stay in code; this seeds tenant-customizable defaults.
 */
import { STARTER_CAMPAIGNS } from './campaign-builder';
import { listWorkflowLibrary } from '../data/crm-campaign-library';
import { generateId } from './auth';

export const BLUEPRINT_VERSION = '2026.08.1';

export type BlueprintInput = {
  businessName: string;
  legalName?: string;
  ownerName: string;
  ownerEmail: string;
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
};

export function buildBlueprintSettings(input: BlueprintInput): Record<string, unknown> {
  const businessName = input.businessName.trim();
  const legalName = (input.legalName || businessName).trim();
  const portalUrl = `https://${input.subdomain}.smartfcra.com`;

  return {
    blueprint_version: BLUEPRINT_VERSION,
    blueprint_seeded_at: new Date().toISOString(),
    timezone: input.timezone || 'America/New_York',
    attribution_mode: input.attributionMode || 'powered_by',
    company_name: businessName,
    support_email: input.supportEmail || input.ownerEmail,
    business_phone: input.phone || '',
    letterhead: {
      firmName: businessName,
      legalName,
      attorneyName: input.ownerName,
      phone: input.phone || '',
      email: input.supportEmail || input.ownerEmail,
      address: input.address || '',
      city: input.city || '',
      state: input.state || '',
      zip: input.zip || '',
      logoUrl: input.logoUrl || '',
    },
    branding: {
      companyName: businessName,
      productName: businessName,
      tagline: 'Your credit journey, organized',
      primary: input.primaryColor || '#2563eb',
      secondary: input.secondaryColor || '#f59e0b',
      gold: input.secondaryColor || '#f59e0b',
      sky: input.primaryColor || '#0ea5e9',
      logoUrl: input.logoUrl || '',
    },
    portal: {
      welcomeTitle: `Welcome to ${businessName}`,
      poweredBySmartFcra: input.attributionMode !== 'hidden',
    },
    integrations: {},
    comms_gate_disabled: false,
    skip_comms_compliance: false,
    compliance_os_disabled: false,
    tenant_isolation_disabled: false,
    suppression_bypass: false,
    hallucination_firewall_disabled: false,
    croa_billing_gate_disabled: false,
    investigation_clocks_disabled: false,
    data_classification_bypass: false,
    mandatory_workflows_disabled: false,
    blueprint: {
      version: BLUEPRINT_VERSION,
      workflowKeys: listWorkflowLibrary().map((w) => w.key),
      starterCampaignIds: STARTER_CAMPAIGNS.map((c) => c.id),
      lifecycleStagesEnabled: true,
      complianceOsEnabled: true,
    },
    portal_url: portalUrl,
  };
}

export async function seedTenantBlueprint(opts: {
  db: D1Database;
  orgId: string;
  userId: string;
  input: BlueprintInput;
}): Promise<{ campaignsCreated: number; workflowsAvailable: number }> {
  const settings = buildBlueprintSettings(opts.input);
  let campaignsCreated = 0;

  for (const starter of STARTER_CAMPAIGNS) {
    try {
      const id = generateId();
      await opts.db.prepare(
        `INSERT INTO marketing_campaigns (id, org_id, name, channel, segment_json, subject, body_template, status, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?)`,
      ).bind(
        id,
        opts.orgId,
        `[Blueprint] ${starter.name}`,
        starter.channel,
        JSON.stringify({ id: starter.segmentId }),
        starter.subject,
        starter.bodyTemplate,
        opts.userId,
      ).run();
      campaignsCreated += 1;
    } catch { /* soft — table may vary */ }
  }

  try {
    await opts.db.prepare(
      `INSERT INTO tenant_provision_log (id, org_id, action, actor_user_id, detail_json)
       VALUES (?, ?, 'blueprint_seed', ?, ?)`,
    ).bind(
      generateId(),
      opts.orgId,
      opts.userId,
      JSON.stringify({
        blueprintVersion: BLUEPRINT_VERSION,
        campaignsCreated,
        workflowCount: listWorkflowLibrary().length,
        subdomain: opts.input.subdomain,
      }),
    ).run();
  } catch { /* soft */ }

  return {
    campaignsCreated,
    workflowsAvailable: listWorkflowLibrary().length,
  };
}

/** Safe config clone — never copies secrets or consumer data. */
export const CLONE_CONFIG_ALLOW = [
  'letterhead', 'branding', 'portal', 'timezone', 'attribution_mode',
  'default_mail_class', 'communication_preferences', 'blueprint',
] as const;

export const CLONE_CONFIG_DENY = [
  'integrations', 'stripe', 'oauth', 'api_keys', 'webhook_secrets',
] as const;

export function pickCloneableSettings(settings: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of CLONE_CONFIG_ALLOW) {
    if (settings[key] !== undefined) out[key] = settings[key];
  }
  return out;
}
