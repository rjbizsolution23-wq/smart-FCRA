/**
 * Per-tenant custom domain resolution for white-label portals.
 */
export async function resolveOrgByCustomDomain(
  db: D1Database,
  host: string | null | undefined,
): Promise<{ id: string; name: string; slug: string; settings: any } | null> {
  const h = String(host || '').split(':')[0].toLowerCase().trim();
  if (!h || h === 'localhost' || h === '127.0.0.1') return null;
  if (h === 'smartfcra.com' || h === 'www.smartfcra.com' || h.endsWith('.pages.dev')) return null;

  const row = await db.prepare(
    `SELECT id, name, slug, settings, custom_domain, custom_domain_verified FROM organizations
     WHERE custom_domain = ? AND custom_domain_verified = 1 LIMIT 1`,
  ).bind(h).first().catch(() => null) as any;

  if (!row) {
    const bySettings = await db.prepare(
      `SELECT id, name, slug, settings, custom_domain, custom_domain_verified FROM organizations WHERE settings LIKE ? LIMIT 5`,
    ).bind(`%"custom_domain":"${h}"%`).all().catch(() => ({ results: [] }));
    const match = ((bySettings as any).results || []).find((r: any) => {
      try {
        const s = JSON.parse(r.settings || '{}');
        return s.custom_domain === h && s.custom_domain_verified;
      } catch { return false; }
    });
    if (!match) return null;
    return { id: match.id, name: match.name, slug: match.slug, settings: JSON.parse(match.settings || '{}') };
  }

  let settings = {};
  try { settings = JSON.parse(row.settings || '{}'); } catch { /* */ }
  return { id: row.id, name: row.name, slug: row.slug, settings };
}

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
