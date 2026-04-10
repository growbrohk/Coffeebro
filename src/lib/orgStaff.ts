/** Per-org role on org_hosts (not global user_access.role). */
export type OrgHostsRole = 'owner' | 'host' | 'manager' | 'barista';

export function canManageOrgOffers(role: string | null | undefined): boolean {
  if (!role) return false;
  return role === 'owner' || role === 'host' || role === 'manager';
}

export function canEditOrgProfileForOrgRole(role: string | null | undefined): boolean {
  if (!role) return false;
  return role === 'owner' || role === 'host';
}

export function assignmentsCanManageOffers(
  assignments: { role: string }[] | undefined
): boolean {
  if (!assignments?.length) return false;
  return assignments.some((a) => canManageOrgOffers(a.role));
}

export function assignmentsAreOnlyBarista(
  assignments: { role: string }[] | undefined
): boolean {
  if (!assignments?.length) return false;
  return assignments.every((a) => a.role === 'barista');
}
