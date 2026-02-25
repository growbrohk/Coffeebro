import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UserEvent {
  id: string;
  name: string;
  event_date: string;
  event_time: string | null;
  location: string | null;
  description: string | null;
  org_id: string | null;
  org_name: string | null;
  created_at: string;
}

export function useUserEvents() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-events', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Fetch all events where the user has a ticket
      const { data: tickets, error: ticketsError } = await supabase
        .from('event_tickets')
        .select('event_id')
        .eq('assigned_to', user.id)
        .eq('status', 'active');

      if (ticketsError) throw ticketsError;
      if (!tickets || tickets.length === 0) return [];

      const eventIds = tickets.map(t => t.event_id);

      // Fetch event details with org info
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select(`
          id,
          name,
          event_date,
          event_time,
          location,
          description,
          org_id,
          created_at,
          orgs:org_id (
            org_name
          )
        `)
        .in('id', eventIds)
        .order('event_date', { ascending: false });

      if (eventsError) throw eventsError;

      // Transform the data to flatten org_name
      return events.map(event => ({
        id: event.id,
        name: event.name,
        event_date: event.event_date,
        event_time: event.event_time,
        location: event.location,
        description: event.description,
        org_id: event.org_id,
        org_name: (event.orgs as any)?.org_name || null,
        created_at: event.created_at,
      })) as UserEvent[];
    },
    enabled: !!user,
  });
}
