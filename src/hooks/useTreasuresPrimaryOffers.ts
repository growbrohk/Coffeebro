import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TreasurePrimaryOfferRow {
  treasure_id: string;
  offer_type: string;
  name: string;
  description: string | null;
  sort_order: number;
}

/** One batched query: all hunt offers for the given treasure ids; caller picks first per treasure by sort_order. */
export function useTreasuresPrimaryOffers(treasureIds: string[]) {
  const sortedIds = [...treasureIds].sort();
  const key = sortedIds.join(',');

  return useQuery({
    queryKey: ['treasures-primary-offers', key],
    queryFn: async (): Promise<TreasurePrimaryOfferRow[]> => {
      if (treasureIds.length === 0) return [];

      const { data, error } = await (supabase as any)
        .from('offers')
        .select('treasure_id, offer_type, name, description, sort_order')
        .eq('source_type', 'hunt')
        .in('treasure_id', treasureIds)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return (data || []) as TreasurePrimaryOfferRow[];
    },
    enabled: treasureIds.length > 0,
    staleTime: 60_000,
  });
}

export function primaryOfferByTreasureId(
  rows: TreasurePrimaryOfferRow[]
): Map<string, TreasurePrimaryOfferRow> {
  const map = new Map<string, TreasurePrimaryOfferRow>();
  for (const row of rows) {
    if (!map.has(row.treasure_id)) {
      map.set(row.treasure_id, row);
    }
  }
  return map;
}
