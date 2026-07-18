import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type ReturnVoucherPresetWithMenu = Tables<"return_voucher_presets"> & {
  menu_items: Tables<"menu_items"> | null;
};

export function returnVoucherPresetsQueryKey(orgId: string) {
  return ["return_voucher_presets", orgId] as const;
}

export function useReturnVoucherPresets(orgId: string | undefined) {
  return useQuery({
    queryKey: orgId ? returnVoucherPresetsQueryKey(orgId) : ["return_voucher_presets", "none"],
    enabled: Boolean(orgId),
    queryFn: async (): Promise<ReturnVoucherPresetWithMenu[]> => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("return_voucher_presets")
        .select("*, menu_items (*)")
        .eq("org_id", orgId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ReturnVoucherPresetWithMenu[];
    },
  });
}

export type ReturnVoucherPresetSaveRow = Omit<TablesInsert<"return_voucher_presets">, "org_id"> & {
  id?: string;
};

async function presetHasMintedVouchers(presetId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from("vouchers")
    .select("id", { count: "exact", head: true })
    .eq("return_voucher_preset_id", presetId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

export function useReturnVoucherPresetMutations(orgId: string | undefined) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    if (orgId) {
      void queryClient.invalidateQueries({ queryKey: returnVoucherPresetsQueryKey(orgId) });
    }
  };

  const upsert = useMutation({
    mutationFn: async (row: ReturnVoucherPresetSaveRow) => {
      if (!orgId) throw new Error("Missing org");
      if (row.id) {
        const { id, ...patch } = row;
        const { error } = await supabase
          .from("return_voucher_presets")
          .update(patch as TablesUpdate<"return_voucher_presets">)
          .eq("id", id);
        if (error) throw error;
        return id;
      }
      const { data, error } = await supabase
        .from("return_voucher_presets")
        .insert({ ...row, org_id: orgId })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (presetId: string) => {
      if (await presetHasMintedVouchers(presetId)) {
        throw new Error("Cannot delete a preset that has minted vouchers");
      }
      const { error } = await supabase.from("return_voucher_presets").delete().eq("id", presetId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { upsert, remove };
}
