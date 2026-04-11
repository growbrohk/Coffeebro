import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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
