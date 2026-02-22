 import { useQuery } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from '@/contexts/AuthContext';
 import { useUserRole } from './useUserRole';
 
 export interface HostEvent {
   id: string;
   name: string;
   event_date: string;
   event_time: string | null;
   location: string | null;
   org_id: string | null;
 }
 
 export function useHostEvents() {
   const { user } = useAuth();
   const { isSuperAdmin, canHostEvent } = useUserRole();

   return useQuery({
     queryKey: ['host-events', user?.id, isSuperAdmin],
     queryFn: async () => {
       if (!user || !canHostEvent) return [];

       // Super admin sees all events
       if (isSuperAdmin) {
         const { data, error } = await supabase
           .from('run_club_events')
           .select('id, name, event_date, event_time, location, org_id')
           .order('event_date', { ascending: false });

         if (error) throw error;
         return data as HostEvent[];
       }

       // Run club host sees only events from orgs they are assigned to in org_hosts
       const { data: orgHosts, error: orgHostsError } = await supabase
         .from('org_hosts')
         .select('org_id')
         .eq('user_id', user.id);

       if (orgHostsError) throw orgHostsError;

       if (!orgHosts || orgHosts.length === 0) return [];

       const orgIds = orgHosts.map(oh => oh.org_id);
       const { data, error } = await supabase
         .from('run_club_events')
         .select('id, name, event_date, event_time, location, org_id')
         .in('org_id', orgIds)
         .order('event_date', { ascending: false });

       if (error) throw error;
       return data as HostEvent[];
     },
     enabled: !!user && canHostEvent,
   });
 }