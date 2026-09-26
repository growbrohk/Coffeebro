import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PublishedCampaignRow } from "@/lib/campaignToMapItem";
import { collectMenuItemIds, fetchMenuItemNames } from "@/lib/fetchMenuItemNames";

export const publishedCampaignsQueryKey = ["campaigns", "published"] as const;

const MAP_CAMPAIGN_SELECT = `
  id,
  org_id,
  status,
  campaign_type,
  display_title,
  hint_text,
  hint_image_url,
  qr_payload,
  start_at,
  end_at,
  treasure_location_type,
  treasure_lat,
  treasure_lng,
  treasure_address,
  treasure_area_name,
  updated_at,
  orgs ( id, org_name, logo_url, preview_photo_url, lat, lng, location, shop_type ),
  org_claim_spots ( id, label, address, lat, lng, google_maps_url ),
  campaign_vouchers (
    id,
    sort_order,
    created_at,
    offer_type,
    custom_item_text,
    menu_item_ids,
    menu_items ( id, item_name )
  )
`;

export function usePublishedCampaigns() {
  return useQuery({
    queryKey: publishedCampaignsQueryKey,
    queryFn: async (): Promise<PublishedCampaignRow[]> => {
      const { data, error } = await supabase
        .from("campaigns")
        .select(MAP_CAMPAIGN_SELECT)
        .eq("status", "published")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as PublishedCampaignRow[];
      const names = await fetchMenuItemNames(collectMenuItemIds(rows.flatMap((row) => row.campaign_vouchers ?? [])));
      return rows.map((row) => ({ ...row, menu_item_names: names }));
    },
    staleTime: 15_000,
  });
}
