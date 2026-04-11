import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type MenuItemRow = Tables<"menu_items">;

export function orgMenuItemsQueryKey(orgId: string) {
  return ["org_menu_items", orgId] as const;
}

export function useOrgMenuItems(orgId: string | undefined) {
  return useQuery({
    queryKey: orgId ? orgMenuItemsQueryKey(orgId) : ["org_menu_items", "none"],
    enabled: Boolean(orgId),
    queryFn: async (): Promise<MenuItemRow[]> => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("menu_items")
        .select("*")
        .eq("org_id", orgId)
        .order("item_name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMenuItemMutations(orgId: string | undefined) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    if (orgId) void queryClient.invalidateQueries({ queryKey: orgMenuItemsQueryKey(orgId) });
  };

  const insert = useMutation({
    mutationFn: async (row: TablesInsert<"menu_items">) => {
      const { data, error } = await supabase.from("menu_items").insert(row).select("*").single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TablesUpdate<"menu_items"> }) => {
      const { data, error } = await supabase.from("menu_items").update(patch).eq("id", id).select("*").single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("menu_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { insert, update, remove };
}
