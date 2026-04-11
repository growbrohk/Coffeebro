import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useMyClaimedCampaignIds() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my_claimed_campaigns", user?.id],
    queryFn: async (): Promise<Set<string>> => {
      if (!user) return new Set();
      const { data, error } = await supabase
        .from("vouchers")
        .select("campaign_id")
        .eq("owner_id", user.id);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.campaign_id).filter(Boolean) as string[]);
    },
    enabled: !!user,
  });
}
