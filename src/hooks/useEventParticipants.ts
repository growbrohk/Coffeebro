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
 
       // Get tickets assigned to users for the event
       const { data: tickets, error: ticketsError } = await supabase
         .from('event_tickets')
         .select('id, assigned_to, event_id, status, created_at')
         .eq('event_id', eventId)
         .not('assigned_to', 'is', null)
         .eq('status', 'active')
         .order('created_at', { ascending: false });
 
       if (ticketsError) throw ticketsError;
       if (!tickets || tickets.length === 0) return [];
 
       // Get profiles for participants
       const userIds = tickets.map(t => t.assigned_to).filter(Boolean) as string[];
       const { data: profiles, error: profileError } = await supabase
         .from('profiles')
         .select('user_id, username')
         .in('user_id', userIds);
 
       if (profileError) throw profileError;
 
       // Merge username into tickets
       const profileMap = new Map(profiles?.map(p => [p.user_id, p.username]) || []);
 
       return tickets.map(t => ({
         id: t.id,
         user_id: t.assigned_to || '',
         event_id: t.event_id,
         status: t.status,
         created_at: t.created_at,
         username: t.assigned_to ? profileMap.get(t.assigned_to) : undefined,
       })) as Participant[];
     },
     enabled: !!user && !!eventId,
   });
 }