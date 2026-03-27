import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { instantIntervalOverlapsMs, localDayBoundsMs, localMonthBoundsMs, localYMD } from '@/lib/date';

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
  coffee_types: string[] | null;
  campaign_title?: string | null;
}

export interface HuntOfferTreasureEmbed {
  id: string;
  name: string;
  address: string | null;
  clue_image: string | null;
  starts_at: string | null;
  ends_at: string | null;
  hunt_id: string;
}

/** Hunt offer row with nested treasure for voucher calendar list */
export interface HuntOfferForCalendarRow {
  id: string;
  name: string;
  offer_type: string | null;
  location: string | null;
  description: string | null;
  quantity_limit: number | null;
  treasure_id: string | null;
  campaign_title: string | null;
  treasures: HuntOfferTreasureEmbed | HuntOfferTreasureEmbed[] | null;
}

export function normalizeHuntTreasure(
  t: HuntOfferTreasureEmbed | HuntOfferTreasureEmbed[] | null
): HuntOfferTreasureEmbed | null {
  if (!t) return null;
  return Array.isArray(t) ? t[0] ?? null : t;
}

export function useMonthlyCoffeeOffers(year: number, month: number) {
  return useQuery({
    queryKey: ['coffee-offers', year, month],
    queryFn: async () => {
      const startDate = localYMD(new Date(year, month, 1));
      const endDate = localYMD(new Date(year, month + 1, 0));

      const { data, error } = await (supabase as any)
        .from('offers')
        .select(
          'id, name, offer_type, event_date, event_time, location, description, org_id, created_by, created_at, quantity_limit, redeem_before_time, coffee_types, campaign_title'
        )
        .eq('source_type', 'calendar')
        .gte('event_date', startDate)
        .lte('event_date', endDate)
        .order('event_date', { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as CoffeeOffer[];
    },
  });
}

export function useMonthlyHuntOffersForVoucherCalendar(year: number, month: number) {
  return useQuery({
    queryKey: ['hunt-offers-voucher-calendar', year, month],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('offers')
        .select(
          `id, name, offer_type, location, description, quantity_limit, treasure_id, campaign_title,
          treasures ( id, name, address, clue_image, starts_at, ends_at, hunt_id )`
        )
        .eq('source_type', 'hunt')
        .not('treasure_id', 'is', null);

      if (error) throw error;
      const rows = (data || []) as HuntOfferForCalendarRow[];

      const { start: mStart, end: mEnd } = localMonthBoundsMs(year, month);

      return rows.filter((row) => {
        const tr = normalizeHuntTreasure(row.treasures);
        if (!tr) return false;
        return instantIntervalOverlapsMs(mStart, mEnd, tr.starts_at, tr.ends_at);
      });
    },
  });
}

/** Hunt offer active on a local calendar day (treasure window overlaps that day). */
export function huntOfferActiveOnLocalDay(
  row: HuntOfferForCalendarRow,
  year: number,
  month: number,
  day: number
): boolean {
  const tr = normalizeHuntTreasure(row.treasures);
  if (!tr) return false;
  const { start, end } = localDayBoundsMs(year, month, day);
  return instantIntervalOverlapsMs(start, end, tr.starts_at, tr.ends_at);
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
