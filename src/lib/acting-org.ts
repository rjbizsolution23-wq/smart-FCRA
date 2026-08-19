/** Super-admin tenant preview: which APIs honor X-Acting-Org-Id. */

export function shouldApplyActingOrg(path: string): boolean {
  const p = String(path || '');
  if (p.startsWith('/api/admin/overview-stats')) return true;
  if (p.startsWith('/api/admin/privacy-requests')) return true;
  if (p.startsWith('/api/admin/')) return false;
  return true;
}
