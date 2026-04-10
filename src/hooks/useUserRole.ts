import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrgStaff } from '@/hooks/useOrgStaff';

export type AppRole = 'super_admin' | 'owner' | 'user';

interface UserRoleData {
  role: AppRole | null;
  isSuperAdmin: boolean;
  /** Café staff: global user_access.owner, org_hosts row, or orgs.owner_user_id (legacy primary owner). */
  isStaffUser: boolean;
  /** @deprecated use isStaffUser */
  isRunClubHost: boolean;
  /** Super admin or global staff (any org assignment). */
  canAccessStaffNav: boolean;
  /** @deprecated use canAccessStaffNav */
  canHostEvent: boolean;
  isLoading: boolean;
}

export function useUserRole(): UserRoleData {
  const { user } = useAuth();
  const { data: staffAssignments = [], isLoading: staffLoading } = useOrgStaff();

  const { data: ownedOrgRow, isLoading: ownedOrgLoading } = useQuery({
    queryKey: ['owned-org-id', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('orgs')
        .select('id')
        .eq('owner_user_id', user.id)
        .limit(1)
        .maybeSingle();
      if (error) {
        console.error('Error fetching owned org:', error);
        return null;
      }
      return data;
    },
    enabled: !!user,
  });

  const { data: role, isLoading: roleLoading } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_access')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user role:', error);
        return null;
      }

      return (data?.role as AppRole) || null;
    },
    enabled: !!user,
  });

  const isSuperAdmin = role === 'super_admin';
  const hasOwnedOrg = Boolean(ownedOrgRow?.id);
  const isStaffUser =
    role === 'owner' || staffAssignments.length > 0 || hasOwnedOrg;
  const canAccessStaffNav = isSuperAdmin || isStaffUser;

  return {
    role,
    isSuperAdmin,
    isStaffUser,
    isRunClubHost: isStaffUser,
    canAccessStaffNav,
    canHostEvent: canAccessStaffNav,
    isLoading: roleLoading || staffLoading || ownedOrgLoading,
  };
}
