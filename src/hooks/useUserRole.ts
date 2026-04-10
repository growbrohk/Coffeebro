import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type AppRole = 'super_admin' | 'owner' | 'user';

interface UserRoleData {
  role: AppRole | null;
  isSuperAdmin: boolean;
  /** Global user_access.role === 'owner' (café staff; synced from org_hosts). */
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

  const { data: role, isLoading } = useQuery({
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
  const isStaffUser = role === 'owner';
  const canAccessStaffNav = isSuperAdmin || isStaffUser;

  return {
    role,
    isSuperAdmin,
    isStaffUser,
    isRunClubHost: isStaffUser,
    canAccessStaffNav,
    canHostEvent: canAccessStaffNav,
    isLoading,
  };
}
