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
  quantity_cap: number | null;
  max_redemptions_per_user: number | null;
};

export function useCatalogForOrg(orgId: string | undefined) {
  return useQuery({
    queryKey: ["vouchers-catalog", orgId],
    queryFn: async (): Promise<CatalogItem[]> => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("vouchers_catalog")
        .select("id, title, points_cost, active, menu_item_id, quantity_cap, max_redemptions_per_user")
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

/** Total minted per active catalog row (for global sold-out). */
export function useLoyaltyCatalogAvailability(orgId: string | undefined) {
  return useQuery({
    queryKey: ["loyalty-catalog-availability", orgId],
    queryFn: async (): Promise<Record<string, number>> => {
      if (!orgId) return {};
      const { data, error } = await supabase.rpc("get_loyalty_catalog_availability", {
        p_org_id: orgId,
      });
      if (error) throw error;
      const rows = (data ?? []) as { catalog_id: string; minted_all: number }[];
      return Object.fromEntries(rows.map((r) => [r.catalog_id, r.minted_all]));
    },
    enabled: !!orgId,
    staleTime: 30_000,
  });
}

/** Count of active+redeemed loyalty vouchers per catalog for the current user. */
export function useMyCatalogRedemptionCounts(orgId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-loyalty-catalog-redemptions", user?.id, orgId],
    queryFn: async (): Promise<Record<string, number>> => {
      if (!user || !orgId) return {};
      const { data, error } = await supabase
        .from("vouchers")
        .select("loyalty_catalog_id")
        .eq("org_id", orgId)
        .eq("owner_id", user.id)
        .in("status", ["active", "redeemed"])
        .not("loyalty_catalog_id", "is", null);
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of data ?? []) {
        const cid = (row as { loyalty_catalog_id: string | null }).loyalty_catalog_id;
        if (!cid) continue;
        counts[cid] = (counts[cid] ?? 0) + 1;
      }
      return counts;
    },
    enabled: !!user && !!orgId,
    staleTime: 30_000,
  });
}

export type LoyaltyActivityRow = {
  kind: string;
  occurred_at: string;
  delta: number;
  title: string;
  detail_json: Record<string, unknown> | null;
  ledger_id: string;
};

export function useLoyaltyActivityFeed(orgId: string | undefined, limit = 50) {
  return useQuery({
    queryKey: ["loyalty-activity", orgId, limit],
    queryFn: async (): Promise<LoyaltyActivityRow[]> => {
      if (!orgId) return [];
      const { data, error } = await supabase.rpc("get_loyalty_activity_feed", {
        p_org_id: orgId,
        p_limit: limit,
      });
      if (error) throw error;
      return (data ?? []) as LoyaltyActivityRow[];
    },
    enabled: !!orgId,
    staleTime: 30_000,
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
      await qc.invalidateQueries({ queryKey: ["loyalty-activity", orgId] });
      await qc.invalidateQueries({ queryKey: ["loyalty-catalog-availability", orgId] });
      await qc.invalidateQueries({ queryKey: ["my-loyalty-catalog-redemptions", user?.id, orgId] });
    },
  });
}
