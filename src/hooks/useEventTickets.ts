import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface EventTicket {
  id: string;
  event_id: string;
  code: string;
  status: 'active' | 'redeemed' | 'void';
  assigned_to: string | null;
  redeemed_at: string | null;
  redeemed_by: string | null;
  created_at: string;
}

export function useEventTickets(eventId: string | null) {
  return useQuery({
    queryKey: ['event-tickets', eventId],
    queryFn: async () => {
      if (!eventId) return [];

      const { data, error } = await supabase
        .from('event_tickets')
        .select('id, event_id, code, status, assigned_to, redeemed_at, redeemed_by, created_at')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data ?? []) as EventTicket[];
    },
    enabled: !!eventId,
  });
}

/**
 * Hook to get the current user's ticket for a specific event
 */
export function useMyTicketForEvent(eventId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['event-ticket', 'my', eventId, user?.id],
    queryFn: async () => {
      if (!eventId || !user) return null;

      const { data, error } = await supabase
        .from('event_tickets')
        .select('id, event_id, code, status, assigned_to, redeemed_at, redeemed_by, created_at')
        .eq('event_id', eventId)
        .eq('assigned_to', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (error) throw error;
      return (data as EventTicket) || null;
    },
    enabled: !!eventId && !!user,
  });
}
