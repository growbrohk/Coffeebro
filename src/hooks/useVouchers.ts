import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface MyVoucherHunterStats {
  voucherCount: number;
  topPercent: number | null;
}

/** Total voucher count + "Top X%" among voucher holders (see my_voucher_hunter_stats RPC). */
export function useMyVoucherHunterStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["voucher-hunter-stats", user?.id],
    queryFn: async (): Promise<MyVoucherHunterStats> => {
      if (!user) return { voucherCount: 0, topPercent: null };

      const { data, error } = await supabase.rpc("my_voucher_hunter_stats");

      if (error) throw error;

      const row = Array.isArray(data) ? data[0] : data;
      return {
        voucherCount: row?.voucher_count ?? 0,
        topPercent: row?.top_percent ?? null,
      };
    },
    enabled: !!user,
  });
}

/** "Top X%" among voucher holders (see my_voucher_hunter_top_percent RPC). Null if user has no qualifying vouchers. */
export function useMyVoucherTopPercent() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["voucher-hunter-top-percent", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase.rpc("my_voucher_hunter_top_percent");

      if (error) throw error;
      return data as number | null;
    },
    enabled: !!user,
  });
}
