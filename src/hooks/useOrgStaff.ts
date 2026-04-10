import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { OrgHostsRole } from '@/lib/orgStaff';

export type OrgStaffAssignment = {
  org_id: string;
  role: OrgHostsRole;
};

export function useOrgStaff() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['org-staff-assignments', user?.id],
    queryFn: async (): Promise<OrgStaffAssignment[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('org_hosts')
        .select('org_id, role')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching org_hosts:', error);
        throw error;
      }

      return (data ?? []).map((row) => ({
        org_id: row.org_id,
        role: row.role as OrgHostsRole,
      }));
    },
    enabled: !!user,
  });
}
