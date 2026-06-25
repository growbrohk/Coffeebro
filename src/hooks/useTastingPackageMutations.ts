import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import type { TastingPackageEditorDraft, TastingPackageTier } from "@/types/tastingPackage";
import { publishedTastingPackagesQueryKey } from "./usePublishedTastingPackages";

export type SaveTastingPackagePayload = {
  packageId?: string;
  draft: TastingPackageEditorDraft;
  createdBy?: string;
};

async function syncShopsAndItems(
  packageId: string,
  tier: TastingPackageTier,
  shops: TastingPackageEditorDraft["singleShops"],
) {
  const { data: existingShops, error: loadErr } = await supabase
    .from("tasting_package_shops")
    .select("id, org_id")
    .eq("package_id", packageId)
    .eq("tier", tier);
  if (loadErr) throw loadErr;

  const existingByOrg = new Map((existingShops ?? []).map((s) => [s.org_id, s.id]));
  const nextOrgIds = new Set(shops.map((s) => s.org_id));

  for (const [orgId, shopId] of existingByOrg) {
    if (!nextOrgIds.has(orgId)) {
      const { error } = await supabase.from("tasting_package_shops").delete().eq("id", shopId);
      if (error) throw error;
    }
  }

  for (let i = 0; i < shops.length; i++) {
    const shop = shops[i];
    let shopId = existingByOrg.get(shop.org_id);

    if (shopId) {
      const { error } = await supabase
        .from("tasting_package_shops")
        .update({ sort_order: i })
        .eq("id", shopId);
      if (error) throw error;
    } else {
      const { data: inserted, error } = await supabase
        .from("tasting_package_shops")
        .insert({
          package_id: packageId,
          org_id: shop.org_id,
          tier,
          sort_order: i,
        })
        .select("id")
        .single();
      if (error) throw error;
      shopId = inserted.id;
    }

    const { data: existingItems, error: itemsErr } = await supabase
      .from("tasting_package_items")
      .select("id, portion_index")
      .eq("package_shop_id", shopId);
    if (itemsErr) throw itemsErr;

    const existingItemIds = (existingItems ?? []).map((it) => it.id);
    if (existingItemIds.length > 0) {
      const { error } = await supabase
        .from("tasting_package_items")
        .delete()
        .in("id", existingItemIds);
      if (error) throw error;
    }

    for (let p = 0; p < shop.menu_item_ids.length; p++) {
      const menuItemId = shop.menu_item_ids[p]?.trim();
      if (!menuItemId) continue;
      const { error } = await supabase.from("tasting_package_items").insert({
        package_shop_id: shopId,
        menu_item_id: menuItemId,
        portion_index: p + 1,
      });
      if (error) throw error;
    }
  }
}

export function useTastingPackageMutations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ packageId, draft, createdBy }: SaveTastingPackagePayload) => {
      const row: TablesInsert<"tasting_packages"> | (TablesUpdate<"tasting_packages"> & { id: string }) = {
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        district: draft.district,
        cover_image_url: draft.cover_image_url.trim() || null,
        status: draft.status,
      };

      let id = packageId;

      if (id) {
        const { error } = await supabase.from("tasting_packages").update(row).eq("id", id);
        if (error) throw error;
      } else {
        const insertRow: TablesInsert<"tasting_packages"> = {
          ...row,
          created_by: createdBy ?? null,
        };
        const { data, error } = await supabase
          .from("tasting_packages")
          .insert(insertRow)
          .select("id")
          .single();
        if (error) throw error;
        id = data.id;
      }

      await syncShopsAndItems(id, "single", draft.singleShops);
      await syncShopsAndItems(id, "duo", draft.duoShops);

      const { data: fresh, error: loadErr } = await supabase
        .from("tasting_packages")
        .select("id")
        .eq("id", id)
        .single();
      if (loadErr) throw loadErr;
      return fresh;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tasting-packages"] });
      void queryClient.invalidateQueries({ queryKey: publishedTastingPackagesQueryKey });
    },
  });
}

export function useDeleteTastingPackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (packageId: string) => {
      const { error } = await supabase.from("tasting_packages").delete().eq("id", packageId);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tasting-packages"] });
      void queryClient.invalidateQueries({ queryKey: publishedTastingPackagesQueryKey });
    },
  });
}
