import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { publishedCampaignsQueryKey } from "@/hooks/usePublishedCampaigns";
import { campaignVoucherPoolsQueryKey } from "@/hooks/usePublishedCampaignVoucherPools";

function primaryErrorText(error: unknown): string {
  if (typeof error === "string") return error.trim();
  if (!error || typeof error !== "object") return "";
  const o = error as Record<string, unknown>;
  if (typeof o.message === "string" && o.message.trim()) return o.message.trim();
  if (typeof o.error_description === "string" && o.error_description.trim()) {
    return o.error_description.trim();
  }
  if (typeof o.details === "string" && o.details.trim()) return o.details.trim();
  return "";
}

/** Maps Postgres RPC raise strings / PostgREST errors to copy for claim toasts. */
export function describeClaimCampaignError(error: unknown): string {
  const raw = primaryErrorText(error);
  const u = raw.toUpperCase();
  if (u.includes("ALREADY_CLAIMED")) return "You already claimed this offer.";
  if (u.includes("CAMPAIGN_NOT_STARTED")) return "This offer has not started yet.";
  if (u.includes("CAMPAIGN_ENDED")) return "This offer has ended.";
  if (u.includes("CAMPAIGN_NOT_IN_WINDOW")) return "This offer is not available right now.";
  if (u.includes("POOL_EMPTY")) return "This offer is fully claimed for now.";
  if (u.includes("NO_VOUCHER_DEFINITION")) return "This campaign is not set up for claims yet.";
  if (u.includes("NOT_GRAB_CAMPAIGN")) return "Claims are only available for grab offers.";
  if (u.includes("NOT_AUTHORIZED")) return "Please sign in to claim.";
  if (u.includes("CAMPAIGN_NOT_FOUND")) return "Campaign not found.";
  if (u.includes("CAMPAIGN_NOT_PUBLISHED")) return "This campaign is not live yet.";
  if (u.includes("PAYMENT_REQUIRED")) return "This offer requires payment.";
  if (u.includes("PAYMENT_PENDING")) return "Payment is still processing.";
  if (u.includes("PAYMENT_FAILED")) return "Payment did not complete.";
  if (u.includes("HUNT_NOT_FOUND")) return "That hunt code was not found.";
  if (u.includes("NOT_HUNT_CAMPAIGN")) return "That code is not a hunt campaign.";
  if (u.includes("RANDOM_CAMPAIGN_PAID_OFFER_NOT_ALLOWED")) {
    return "Random prize pools can only include free offers.";
  }
  if (raw) return raw;
  return "Something went wrong. Please try again.";
}

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
      void queryClient.invalidateQueries({ queryKey: campaignVoucherPoolsQueryKey });
    },
  });
}
