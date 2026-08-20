/**
 * Custom domain persistence — kept separate to avoid circular imports.
 */
export async function setOrgCustomDomain(opts: {
  db: D1Database;
  orgId: string;
  domain: string;
  verified?: boolean;
}): Promise<void> {
  const domain = String(opts.domain || '').toLowerCase().replace(/^https?:\/\//, '').split('/')[0].trim();
  let settings: any = {};
  const org = await opts.db.prepare('SELECT settings FROM organizations WHERE id = ?').bind(opts.orgId).first() as any;
  try { settings = JSON.parse(org?.settings || '{}'); } catch { /* */ }
  settings.custom_domain = domain;
  settings.custom_domain_verified = !!opts.verified;
  await opts.db.prepare(
    'UPDATE organizations SET custom_domain = ?, custom_domain_verified = ?, settings = ?, updated_at = datetime(\'now\') WHERE id = ?',
  ).bind(domain || null, opts.verified ? 1 : 0, JSON.stringify(settings), opts.orgId).run();
}
