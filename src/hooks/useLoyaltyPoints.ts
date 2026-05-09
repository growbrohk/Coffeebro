import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useLoyaltyBalance(orgId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["loyalty-balance", user?.id, orgId],
    queryFn: async () => {
      if (!user || !orgId) return 0;
      const { data, error } = await supabase
        .from("loyalty_balances")
        .select("balance")
        .eq("user_id", user.id)
        .eq("org_id", orgId)
        .maybeSingle();
      if (error) throw error;
      return data?.balance ?? 0;
    },
    enabled: !!user && !!orgId,
    staleTime: 30_000,
  });
}

export type CatalogItem = {
  id: string;
  title: string;
  points_cost: number;
  active: boolean;
  menu_item_id: string | null;
};

export function useCatalogForOrg(orgId: string | undefined) {
  return useQuery({
    queryKey: ["vouchers-catalog", orgId],
    queryFn: async (): Promise<CatalogItem[]> => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("vouchers_catalog")
        .select("id, title, points_cost, active, menu_item_id")
        .eq("org_id", orgId)
        .eq("active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CatalogItem[];
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });
}

export function useRedeemCatalogItem(orgId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (catalogId: string) => {
      if (!user) throw new Error("Not signed in");
      const { data, error } = await supabase.rpc("redeem_catalog_item", {
        p_catalog_id: catalogId,
      });
      if (error) throw error;
      return data as { id?: string; code?: string };
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["vouchers", "my", user?.id] });
      await qc.invalidateQueries({ queryKey: ["loyalty-balance", user?.id, orgId] });
      await qc.invalidateQueries({ queryKey: ["vouchers-catalog", orgId] });
    },
  });
}
