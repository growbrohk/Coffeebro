import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ReturnVoucherHolderRow = {
  voucher_id: string;
  owner_id: string;
  owner_name: string;
  status: string;
  code: string;
  created_at: string;
  redeemed_at: string | null;
  redeemable_from: string | null;
  expires_at: string | null;
};

export function returnVoucherHoldersQueryKey(presetId: string) {
  return ["return_voucher_holders", presetId] as const;
}

export function useReturnVoucherHolders(presetId: string | undefined) {
  return useQuery({
    queryKey: presetId ? returnVoucherHoldersQueryKey(presetId) : ["return_voucher_holders", "none"],
    enabled: Boolean(presetId),
    queryFn: async (): Promise<ReturnVoucherHolderRow[]> => {
      if (!presetId) return [];
      const { data, error } = await supabase.rpc("list_return_voucher_holders", {
        p_preset_id: presetId,
      });
      if (error) throw error;
      return (data ?? []) as ReturnVoucherHolderRow[];
    },
  });
}
