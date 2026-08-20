/**
 * Three-tier tenant configuration.
 * Global locked controls cannot be disabled by a tenant admin.
 */
export const CONFIG_TIER = {
  locked: 'locked',
  default: 'default',
  customizable: 'customizable',
} as const;

export type ConfigTier = typeof CONFIG_TIER[keyof typeof CONFIG_TIER];

export type ConfigControl = {
  key: string;
  tier: ConfigTier;
  label: string;
  description: string;
};

/** Keys tenants must never turn off — enforced in applyTenantSettingsPatch */
export const LOCKED_SETTING_KEYS = [
  'comms_gate_disabled',
  'skip_comms_compliance',
  'compliance_os_disabled',
  'tenant_isolation_disabled',
  'suppression_bypass',
  'hallucination_firewall_disabled',
  'croa_billing_gate_disabled',
  'investigation_clocks_disabled',
  'data_classification_bypass',
  'mandatory_workflows_disabled',
] as const;

export const TENANT_CONFIG_SCHEMA: ConfigControl[] = [
  { key: 'tenant_isolation', tier: 'locked', label: 'Tenant isolation', description: 'Every record is scoped by organization_id. Cannot be disabled.' },
  { key: 'comms_compliance', tier: 'locked', label: 'Communication compliance gate', description: 'Marketing/transactional/compliance lanes, DNC, and suppression.' },
  { key: 'croa_billing_gate', tier: 'locked', label: 'CROA billing gate', description: 'Covered credit-repair charges require a service-completion record.' },
  { key: 'hallucination_firewall', tier: 'locked', label: 'AI hallucination firewall', description: 'Dispute copy must stay grounded in consumer attestations.' },
  { key: 'investigation_clocks', tier: 'locked', label: 'FCRA investigation clocks', description: '§ 611 30/35-day clocks on mailed disputes.' },
  { key: 'data_classification', tier: 'locked', label: 'Data classification', description: 'SSN/full reports never sync to marketing CRMs.' },
  { key: 'mandatory_workflows', tier: 'locked', label: 'Mandatory compliance workflows', description: 'Library items marked mandatory cannot be deleted.' },
  { key: 'workflow_library', tier: 'default', label: 'Campaign & workflow library', description: 'Smart FCRA starter drips, education, and follow-ups. Clone and customize.' },
  { key: 'pipeline_stages', tier: 'default', label: 'CRM lifecycle stages', description: 'Lead → enrollment → active → renewal defaults.' },
  { key: 'academy_lessons', tier: 'default', label: 'Academy curriculum', description: 'Consumer education lessons and quizzes.' },
  { key: 'signature_packet', tier: 'default', label: 'Client signature packet', description: 'CROA disclosure, contract, POA — recommended, not lockouts.' },
  { key: 'letterhead', tier: 'customizable', label: 'Firm letterhead', description: 'Legal name, address, phone, logo for PDFs and letters.' },
  { key: 'branding', tier: 'customizable', label: 'Portal branding', description: 'Colors, logo, tagline, company display name.' },
  { key: 'contact', tier: 'customizable', label: 'Contact details', description: 'Support email, phone, business hours, timezone.' },
  { key: 'integrations', tier: 'customizable', label: 'Integrations', description: 'This org’s Meta, Google, HighLevel, MFSN, Twilio credentials.' },
  { key: 'attribution', tier: 'customizable', label: 'Powered by Smart FCRA', description: 'Attribution level: powered_by | minimal | hidden (plan-gated).' },
];

export function lockedSettingsSnapshot(): Record<string, false> {
  const out: Record<string, false> = {};
  for (const k of LOCKED_SETTING_KEYS) out[k] = false;
  return out;
}

export function stripLockedSettings(incoming: Record<string, unknown> | null | undefined): {
  sanitized: Record<string, unknown>;
  rejected: string[];
} {
  const sanitized: Record<string, unknown> = { ...(incoming || {}) };
  const rejected: string[] = [];
  for (const key of LOCKED_SETTING_KEYS) {
    if (key in sanitized) {
      delete sanitized[key];
      rejected.push(key);
    }
  }
  if (sanitized.blueprint && typeof sanitized.blueprint === 'object') {
    const bp = { ...(sanitized.blueprint as Record<string, unknown>) };
    if (bp.complianceOsEnabled === false) {
      bp.complianceOsEnabled = true;
      rejected.push('blueprint.complianceOsEnabled');
    }
    sanitized.blueprint = bp;
  }
  if (sanitized.integrations && typeof sanitized.integrations === 'object') {
    const integ = { ...(sanitized.integrations as Record<string, unknown>) };
    delete integ.bypass_sync_rules;
    delete integ.skip_comms_gate;
    sanitized.integrations = integ;
  }
  return { sanitized, rejected };
}

export function applyTenantSettingsPatch(
  current: Record<string, unknown>,
  incoming: Record<string, unknown>,
): { settings: Record<string, unknown>; rejected: string[] } {
  const { sanitized, rejected } = stripLockedSettings(incoming);
  const merged = { ...current, ...sanitized, ...lockedSettingsSnapshot() };
  return { settings: merged, rejected };
}

export function tenantConfigSchemaPayload() {
  return {
    version: '2026.08.1',
    tiers: [
      { id: 'locked', label: 'Smart FCRA Global Locked', note: 'Security, compliance, audit, isolation. Tenants cannot disable.' },
      { id: 'default', label: 'Smart FCRA Default', note: 'Recommended campaigns, workflows, stages. Clone and customize.' },
      { id: 'customizable', label: 'Tenant Customizable', note: 'Branding, contacts, hours, integrations, landing copy.' },
    ],
    controls: TENANT_CONFIG_SCHEMA,
    lockedKeys: LOCKED_SETTING_KEYS,
  };
}
