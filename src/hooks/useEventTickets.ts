import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EventTicket {
  id: string;
  event_id: string;
  code: string;
  status: 'active' | 'redeemed' | 'void';
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
        .select('id, event_id, code, status, redeemed_at, redeemed_by, created_at')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data ?? []) as EventTicket[];
    },
    enabled: !!eventId,
  });
}
