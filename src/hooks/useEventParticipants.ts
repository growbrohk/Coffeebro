 import { useQuery } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from '@/contexts/AuthContext';
 
 export interface Participant {
   id: string;
   user_id: string;
   event_id: string;
   status: string;
   created_at: string;
   username?: string;
 }
 
 export function useEventParticipants(eventId: string | null) {
   const { user } = useAuth();
 
   return useQuery({
     queryKey: ['event-participants', eventId],
     queryFn: async () => {
       if (!eventId) return [];
 
       // Get registrations for the event
       const { data: registrations, error: regError } = await supabase
         .from('event_registrations')
         .select('id, user_id, event_id, status, created_at')
         .eq('event_id', eventId)
         .order('created_at', { ascending: false });
 
       if (regError) throw regError;
       if (!registrations || registrations.length === 0) return [];
 
       // Get profiles for participants
       const userIds = registrations.map(r => r.user_id);
       const { data: profiles, error: profileError } = await supabase
         .from('profiles')
         .select('user_id, username')
         .in('user_id', userIds);
 
       if (profileError) throw profileError;
 
       // Merge username into registrations
       const profileMap = new Map(profiles?.map(p => [p.user_id, p.username]) || []);
 
       return registrations.map(r => ({
         ...r,
         username: profileMap.get(r.user_id) || undefined,
       })) as Participant[];
     },
     enabled: !!user && !!eventId,
   });
 }