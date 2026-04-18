import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CampaignVoucherPoolRow } from "@/lib/campaignVoucherPoolsMerge";

/** Invalidate with `{ queryKey: campaignVoucherPoolsQueryKey }` to refresh all pool queries. */
export const campaignVoucherPoolsQueryKey = ["campaign_voucher_pools"] as const;

/**
 * Batch-fetches voucher pool stats for many campaigns (remaining = quantity − minted per line).
 * Anon-safe RPC; `staleTime` aligned with `usePublishedCampaigns`.
 */
export function usePublishedCampaignVoucherPools(campaignIds: string[]) {
  const sortedUniqueIds = useMemo(
    () => [...new Set(campaignIds.filter(Boolean))].sort(),
    [campaignIds],
  );

  return useQuery({
    queryKey: [...campaignVoucherPoolsQueryKey, sortedUniqueIds] as const,
    queryFn: async (): Promise<CampaignVoucherPoolRow[]> => {
      if (sortedUniqueIds.length === 0) return [];
      const { data, error } = await supabase.rpc("get_published_campaigns_voucher_pools", {
        p_campaign_ids: sortedUniqueIds,
      });
      if (error) throw error;
      return (data ?? []) as CampaignVoucherPoolRow[];
    },
    enabled: sortedUniqueIds.length > 0,
    staleTime: 15_000,
  });
}
