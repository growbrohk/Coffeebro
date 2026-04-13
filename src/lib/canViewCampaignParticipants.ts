/** Minimal shape from org_hosts assignments. */
export type StaffAssignmentForParticipants = { org_id: string };

/**
 * Whether the user may open the campaign participants list for this org
 * (super admin, primary org owner, or any org_hosts role for that org).
 */
export function canViewCampaignParticipants(args: {
  userId: string | undefined;
  isSuperAdmin: boolean;
  campaignOrgId: string | null | undefined;
  orgOwnerUserId: string | null | undefined;
  staffAssignments: StaffAssignmentForParticipants[];
}): boolean {
  const { userId, isSuperAdmin, campaignOrgId, orgOwnerUserId, staffAssignments } = args;
  if (!userId || !campaignOrgId) return false;
  if (isSuperAdmin) return true;
  if (orgOwnerUserId === userId) return true;
  return staffAssignments.some((a) => a.org_id === campaignOrgId);
}
