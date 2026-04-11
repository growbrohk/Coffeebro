import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type CampaignVoucherWithMenu = Tables<"campaign_vouchers"> & {
  menu_items: Tables<"menu_items"> | null;
};

export type CampaignWithVouchers = Tables<"campaigns"> & {
  campaign_vouchers: CampaignVoucherWithMenu[];
};

export function orgCampaignsQueryKey(orgId: string) {
  return ["org_campaigns", orgId] as const;
}

export function useOrgCampaigns(orgId: string | undefined) {
  return useQuery({
    queryKey: orgId ? orgCampaignsQueryKey(orgId) : ["org_campaigns", "none"],
    enabled: Boolean(orgId),
    queryFn: async (): Promise<CampaignWithVouchers[]> => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("campaigns")
        .select(
          `
          *,
          campaign_vouchers (
            *,
            menu_items (*)
          )
        `,
        )
        .eq("org_id", orgId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as CampaignWithVouchers[];
      for (const c of rows) {
        c.campaign_vouchers?.sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));
      }
      return rows;
    },
  });
}

export function useCampaign(orgId: string | undefined, campaignId: string | undefined) {
  return useQuery({
    queryKey: ["campaign", orgId, campaignId],
    enabled: Boolean(orgId && campaignId),
    queryFn: async (): Promise<CampaignWithVouchers> => {
      if (!orgId || !campaignId) throw new Error("Missing org or campaign");
      const { data, error } = await supabase
        .from("campaigns")
        .select(
          `
          *,
          campaign_vouchers (
            *,
            menu_items (*)
          )
        `,
        )
        .eq("id", campaignId)
        .eq("org_id", orgId)
        .single();
      if (error) throw error;
      const row = data as CampaignWithVouchers;
      row.campaign_vouchers?.sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));
      return row;
    },
  });
}
