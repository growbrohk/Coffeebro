import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PublishedCampaignRow } from "@/lib/campaignToMapItem";

export const publishedCampaignsQueryKey = ["campaigns", "published"] as const;

export function usePublishedCampaigns() {
  return useQuery({
    queryKey: publishedCampaignsQueryKey,
    queryFn: async (): Promise<PublishedCampaignRow[]> => {
      const { data, error } = await supabase
        .from("campaigns")
        .select(
          `
          *,
          orgs ( id, org_name, logo_url, preview_photo_url, lat, lng, location ),
          campaign_vouchers (
            *,
            menu_items (*)
          )
        `,
        )
        .eq("status", "published")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PublishedCampaignRow[];
    },
    staleTime: 15_000,
  });
}
