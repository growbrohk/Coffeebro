import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TreasurePrimaryOfferRow {
  treasure_id: string;
  offer_type: string;
  name: string;
  description: string | null;
  sort_order: number;
  quantity_limit: number;
  campaign_title: string | null;
  org_name: string | null;
  org_preview_photo_url: string | null;
  /** From linked preset; map UI prefers this over `treasures.clue_image`. */
  preset_clue_image: string | null;
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
        .select(
          'treasure_id, offer_type, name, description, sort_order, quantity_limit, campaign_title, orgs(org_name, preview_photo_url), preset_offers(clue_image)'
        )
        .eq('source_type', 'hunt')
        .in('treasure_id', treasureIds)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return (data || []).map(
        (r: {
          treasure_id: string;
          offer_type: string;
          name: string;
          description: string | null;
          sort_order: number;
          quantity_limit: number | null;
          campaign_title: string | null;
          orgs?: { org_name: string; preview_photo_url: string | null } | null;
          preset_offers?: { clue_image: string | null } | null;
        }): TreasurePrimaryOfferRow => ({
          treasure_id: r.treasure_id,
          offer_type: r.offer_type,
          name: r.name,
          description: r.description,
          sort_order: r.sort_order,
          quantity_limit: r.quantity_limit ?? 17,
          campaign_title: r.campaign_title ?? null,
          org_name: r.orgs?.org_name ?? null,
          org_preview_photo_url: r.orgs?.preview_photo_url ?? null,
          preset_clue_image: r.preset_offers?.clue_image ?? null,
        })
      );
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
