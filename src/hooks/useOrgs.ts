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
}
 
 export function useOrgs() {
   const { user } = useAuth();
   const { isSuperAdmin, isRunClubHost } = useUserRole();

   return useQuery({
     queryKey: ['orgs', user?.id, isSuperAdmin, isRunClubHost],
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

       // Run club host sees only orgs they are assigned to in org_hosts
       if (isRunClubHost) {
         const { data: orgHosts, error: orgHostsError } = await supabase
           .from('org_hosts')
           .select('org_id')
           .eq('user_id', user.id);

         if (orgHostsError) {
           console.error('Error fetching org_hosts:', orgHostsError);
           throw orgHostsError;
         }

         if (!orgHosts || orgHosts.length === 0) return [];

         const orgIds = orgHosts.map(oh => oh.org_id);
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
     enabled: !!user && (isSuperAdmin || isRunClubHost),
   });
 }