import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from './useUserRole';

export interface Org {
  id: string;
  owner_user_id: string;
  org_name: string;
  created_at: string;
  location?: string | null;
  lat?: number | null;
  lng?: number | null;
  instagram_handle?: string | null;
  phone?: string | null;
  google_maps_url?: string | null;
  opening_hours?: unknown | null;
  hk_area?: string | null;
  district?: string | null;
  mtr_station?: string | null;
  logo_url?: string | null;
  preview_photo_url?: string | null;
}

export function useOrgs() {
  const { user } = useAuth();
  const { isSuperAdmin, isStaffUser } = useUserRole();

  return useQuery({
    // isStaffUser: user_access, org_hosts, or orgs.owner_user_id (useUserRole).
    queryKey: ['orgs', user?.id, isSuperAdmin, isStaffUser],
    queryFn: async () => {
      if (!user) return [];

      // Super admin sees all orgs
      if (isSuperAdmin) {
        const { data, error } = await supabase
          .from('orgs')
          .select('*')
          .order('org_name');

        if (error) {
          console.error('Error fetching orgs:', error);
          throw error;
        }

        return data as Org[];
      }

      // Staff: orgs from org_hosts plus any org where user is primary owner
      if (isStaffUser) {
        const { data: orgHosts, error: orgHostsError } = await supabase
          .from('org_hosts')
          .select('org_id')
          .eq('user_id', user.id);

        if (orgHostsError) {
          console.error('Error fetching org_hosts:', orgHostsError);
          throw orgHostsError;
        }

        const { data: ownedOrgs, error: ownedError } = await supabase
          .from('orgs')
          .select('id')
          .eq('owner_user_id', user.id);

        if (ownedError) {
          console.error('Error fetching owned orgs:', ownedError);
          throw ownedError;
        }

        const orgIds = [
          ...new Set([
            ...(orgHosts ?? []).map((oh) => oh.org_id),
            ...(ownedOrgs ?? []).map((o) => o.id),
          ]),
        ];

        if (orgIds.length === 0) return [];

        const { data, error } = await supabase
          .from('orgs')
          .select('*')
          .in('id', orgIds)
          .order('org_name');

        if (error) {
          console.error('Error fetching orgs:', error);
          throw error;
        }

        return data as Org[];
      }

      // Regular users can't see any orgs (they can't create coffee offers)
      return [];
    },
    enabled: !!user && (isSuperAdmin || isStaffUser),
  });
}

export function useOrg(orgId: string | undefined) {
  return useQuery({
    queryKey: ["org", orgId],
    enabled: Boolean(orgId),
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase.from("orgs").select("*").eq("id", orgId).single();
      if (error) throw error;
      return data as Org;
    },
  });
}