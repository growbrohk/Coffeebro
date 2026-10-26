import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type LoyaltyCatalogRow = Tables<"vouchers_catalog">;

export function orgLoyaltyCatalogQueryKey(orgId: string) {
  return ["vouchers-catalog-all", orgId] as const;
}

export function useOrgLoyaltyCatalog(orgId: string | undefined) {
  return useQuery({
    queryKey: orgId ? orgLoyaltyCatalogQueryKey(orgId) : ["vouchers-catalog-all", "none"],
    enabled: Boolean(orgId),
    queryFn: async (): Promise<LoyaltyCatalogRow[]> => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("vouchers_catalog")
        .select("*")
        .eq("org_id", orgId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}
