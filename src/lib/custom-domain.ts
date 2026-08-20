/**
 * Per-tenant custom domain — backward-compatible wrapper around tenant-resolver.
 */
import { resolveOrgByCustomDomain as resolveCustom, type TenantHostOrg } from './tenant-resolver';

export async function resolveOrgByCustomDomain(
  db: D1Database,
  host: string | null | undefined,
  env?: { FRONTEND_URL?: string },
): Promise<{ id: string; name: string; slug: string; settings: any; subdomain?: string | null } | null> {
  const tenant = await resolveCustom(db, host, env);
  if (!tenant) return null;
  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    settings: tenant.settings,
    subdomain: tenant.subdomain,
  };
}

export { setOrgCustomDomain } from './tenant-resolver-set-domain';

export type { TenantHostOrg };
