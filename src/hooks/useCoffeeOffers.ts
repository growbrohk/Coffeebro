import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { localYMD } from '@/lib/date';

export interface CoffeeOffer {
  id: string;
  name: string;
  offer_type: string | null;
  event_date: string;
  event_time: string | null;
  location: string | null;
  description: string | null;
  org_id: string;
  created_by: string;
  created_at: string;
  quantity_limit: number | null;
  redeem_before_time: string | null;
}

export function useMonthlyCoffeeOffers(year: number, month: number) {
  return useQuery({
    queryKey: ['coffee-offers', year, month],
    queryFn: async () => {
      const startDate = localYMD(new Date(year, month, 1));
      const endDate = localYMD(new Date(year, month + 1, 0));

      const { data, error } = await supabase
        .from('coffee_offers')
        .select('id, name, offer_type, event_date, event_time, location, description, org_id, created_by, created_at, quantity_limit, redeem_before_time')
        .gte('event_date', startDate)
        .lte('event_date', endDate)
        .order('event_date', { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as CoffeeOffer[];
    },
  });
}

// Group coffee offers by day of month for calendar
export function groupCoffeeOffersByDate(offers: CoffeeOffer[]): Map<number, CoffeeOffer[]> {
  const map = new Map<number, CoffeeOffer[]>();

  offers.forEach((offer) => {
    const day = Number(offer.event_date.slice(8, 10));
    const existing = map.get(day) || [];
    map.set(day, [...existing, offer]);
  });

  return map;
}
