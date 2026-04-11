import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CampaignParticipantRow = {
  voucher_id: string;
  owner_id: string;
  owner_name: string;
  status: string;
  created_at: string;
  redeemed_at: string | null;
  code: string;
};

export function campaignParticipantsQueryKey(campaignId: string) {
  return ["campaign_participants", campaignId] as const;
}

export function useCampaignParticipants(campaignId: string | undefined) {
  return useQuery({
    queryKey: campaignId ? campaignParticipantsQueryKey(campaignId) : ["campaign_participants", "none"],
    enabled: Boolean(campaignId),
    queryFn: async (): Promise<CampaignParticipantRow[]> => {
      if (!campaignId) return [];
      const { data, error } = await supabase.rpc("list_campaign_participants", {
        p_campaign_id: campaignId,
      });
      if (error) throw error;
      return (data ?? []) as CampaignParticipantRow[];
    },
  });
}
