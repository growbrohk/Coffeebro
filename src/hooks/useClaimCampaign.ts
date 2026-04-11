import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { publishedCampaignsQueryKey } from "@/hooks/usePublishedCampaigns";

export function useClaimCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaignId: string) => {
      const { data, error } = await supabase.rpc("claim_campaign_voucher", { p_campaign_id: campaignId });
      if (error) throw error;
      return data ?? [];
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vouchers", "my"] });
      void queryClient.invalidateQueries({ queryKey: ["voucher-hunter-top-percent"] });
      void queryClient.invalidateQueries({ queryKey: ["my_claimed_campaigns"] });
      void queryClient.invalidateQueries({ queryKey: publishedCampaignsQueryKey });
    },
  });
}
