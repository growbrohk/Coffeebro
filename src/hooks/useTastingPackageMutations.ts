import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import type { TastingPackageEditorDraft, TastingPackageRedemptionDateDraft, TastingPackageShopDraft, TastingPackageTier } from "@/types/tastingPackage";
import { splitDraftToTierShops } from "@/lib/tastingPackageEditorShops";
import { publishedTastingPackagesQueryKey } from "./usePublishedTastingPackages";

export type SaveTastingPackagePayload = {
  packageId?: string;
  draft: TastingPackageEditorDraft;
  createdBy?: string;
};

async function shopHasVouchers(shopId: string): Promise<boolean> {
  const { data: items, error: itemsErr } = await supabase
    .from("tasting_package_items")
    .select("id")
    .eq("package_shop_id", shopId);
  if (itemsErr) throw itemsErr;

  const itemIds = (items ?? []).map((it) => it.id);
  if (itemIds.length === 0) return false;

  const { count, error } = await supabase
    .from("vouchers")
    .select("id", { count: "exact", head: true })
    .in("tasting_package_item_id", itemIds);
  if (error) throw error;
  return (count ?? 0) > 0;
}

async function itemHasVouchers(itemId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from("vouchers")
    .select("id", { count: "exact", head: true })
    .eq("tasting_package_item_id", itemId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

async function syncShopItems(
  shopId: string,
  shop: TastingPackageShopDraft,
) {
  const { data: existingItems, error: itemsErr } = await supabase
    .from("tasting_package_items")
    .select("id, portion_index, menu_item_id")
    .eq("package_shop_id", shopId);
  if (itemsErr) throw itemsErr;

  const existingByPortion = new Map(
    (existingItems ?? []).map((it) => [it.portion_index, it]),
  );

  for (let p = 0; p < shop.menu_item_ids.length; p++) {
    const menuItemId = shop.menu_item_ids[p]?.trim();
    if (!menuItemId) continue;

    const portionIndex = p + 1;
    const existing = existingByPortion.get(portionIndex);

    if (existing) {
      if (existing.menu_item_id !== menuItemId) {
        const { error } = await supabase
          .from("tasting_package_items")
          .update({ menu_item_id: menuItemId })
          .eq("id", existing.id);
        if (error) throw error;
      }
      existingByPortion.delete(portionIndex);
    } else {
      const { error } = await supabase.from("tasting_package_items").insert({
        package_shop_id: shopId,
        menu_item_id: menuItemId,
        portion_index: portionIndex,
      });
      if (error) throw error;
    }
  }

  for (const [, item] of existingByPortion) {
    if (await itemHasVouchers(item.id)) {
      throw new Error("Cannot remove a tasting item that has been purchased");
    }
    const { error } = await supabase.from("tasting_package_items").delete().eq("id", item.id);
    if (error) throw error;
  }
}

async function syncRedemptionDates(packageId: string, dates: TastingPackageRedemptionDateDraft[]) {
  const normalized = dates
    .filter((d) => d.redeem_date.trim())
    .map((d) => ({
      redeem_date: d.redeem_date.trim(),
      is_available: d.is_available,
      max_purchases: Math.max(1, Math.floor(d.max_purchases)),
    }));

  const { data: existing, error: loadErr } = await supabase
    .from("tasting_package_redemption_dates")
    .select("id, redeem_date")
    .eq("package_id", packageId);
  if (loadErr) throw loadErr;

  const existingByDate = new Map((existing ?? []).map((row) => [row.redeem_date, row.id]));
  const nextDates = new Set(normalized.map((d) => d.redeem_date));

  for (const [date, rowId] of existingByDate) {
    if (!nextDates.has(date)) {
      const { error } = await supabase.from("tasting_package_redemption_dates").delete().eq("id", rowId);
      if (error) throw error;
    }
  }

  for (const d of normalized) {
    const existingId = existingByDate.get(d.redeem_date);
    if (existingId) {
      const { error } = await supabase
        .from("tasting_package_redemption_dates")
        .update({
          is_available: d.is_available,
          max_purchases: d.max_purchases,
        })
        .eq("id", existingId);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("tasting_package_redemption_dates").insert({
        package_id: packageId,
        redeem_date: d.redeem_date,
        is_available: d.is_available,
        max_purchases: d.max_purchases,
      });
      if (error) throw error;
    }
  }
}

async function syncShopsAndItems(
  packageId: string,
  tier: TastingPackageTier,
  shops: TastingPackageShopDraft[],
) {
  const completeShops = shops.filter((s) => s.org_id.trim());

  const { data: existingShops, error: loadErr } = await supabase
    .from("tasting_package_shops")
    .select("id, org_id")
    .eq("package_id", packageId)
    .eq("tier", tier);
  if (loadErr) throw loadErr;

  const existingByOrg = new Map((existingShops ?? []).map((s) => [s.org_id, s.id]));
  const nextOrgIds = new Set(completeShops.map((s) => s.org_id));

  for (const [orgId, shopId] of existingByOrg) {
    if (!nextOrgIds.has(orgId)) {
      if (await shopHasVouchers(shopId)) {
        throw new Error("Cannot remove shop — customers already hold vouchers for this package");
      }
      const { error } = await supabase.from("tasting_package_shops").delete().eq("id", shopId);
      if (error) throw error;
      existingByOrg.delete(orgId);
    }
  }

  for (let i = 0; i < completeShops.length; i++) {
    const shop = completeShops[i];
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
      existingByOrg.set(shop.org_id, shopId);
    }

    await syncShopItems(shopId, shop);
  }
}

export function useTastingPackageMutations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ packageId, draft, createdBy }: SaveTastingPackagePayload) => {
      const row: TablesInsert<"tasting_packages"> | (TablesUpdate<"tasting_packages"> & { id: string }) = {
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        hk_areas: draft.hk_areas,
        districts: draft.districts,
        mtr_stations: draft.mtr_stations,
        cover_image_url: draft.cover_image_url.trim() || null,
        status: draft.status,
        is_active: draft.is_active,
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

      const { singleShops, duoShops } = splitDraftToTierShops(draft.shops);
      await syncShopsAndItems(id, "single", singleShops);
      await syncShopsAndItems(id, "duo", duoShops);
      await syncRedemptionDates(id, draft.redemption_dates);

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

export function useToggleTastingPackageActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ packageId, isActive }: { packageId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("tasting_packages")
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq("id", packageId);
      if (error) throw error;
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
