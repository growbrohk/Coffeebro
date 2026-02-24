import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RunClubEvent {
  id: string;
  name: string;
  event_type: '$17Coffee' | 'Event';  // DB values; display treats all as Event
  event_date: string;
  event_time: string | null;
  location: string | null;
  description: string | null;
  created_at: string;
}

// Format date using local timezone parts to avoid UTC shift issues
function toYMDLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function useMonthlyEvents(year: number, month: number) {
  return useQuery({
    queryKey: ['events', year, month],
    queryFn: async () => {
      const startDate = toYMDLocal(new Date(year, month, 1));
      const endDate = toYMDLocal(new Date(year, month + 1, 0));
      
      const { data, error } = await supabase
        .from('events')
        .select('id, name, event_type, event_date, event_time, location, description, created_at')
        .gte('event_date', startDate)
        .lte('event_date', endDate)
        .order('event_date', { ascending: true });
      
      if (error) throw error;
      return data as RunClubEvent[];
    },
  });
}

// Group events by date for easy lookup
export function groupEventsByDate(events: RunClubEvent[]): Map<number, RunClubEvent[]> {
  const map = new Map<number, RunClubEvent[]>();
  
  events.forEach(event => {
    // Extract day directly from "YYYY-MM-DD" string to avoid timezone parsing issues
    const day = Number(event.event_date.slice(8, 10));
    const existing = map.get(day) || [];
    map.set(day, [...existing, event]);
  });
  
  return map;
}
