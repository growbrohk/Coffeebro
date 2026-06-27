import type {
  TastingPackageSharedShopDraft,
  TastingPackageShopDraft,
} from "@/types/tastingPackage";
import { TASTING_PACKAGE_MAX_SHOPS } from "@/types/tastingPackage";

export type LoadedTierShopRow = {
  id: string;
  org_id: string;
  menu_item_ids: string[];
};

/** Dedupe by org_id and cap at package max (shared shops model). */
export function normalizeSharedShops(
  shops: TastingPackageSharedShopDraft[],
): TastingPackageSharedShopDraft[] {
  const seen = new Set<string>();
  const out: TastingPackageSharedShopDraft[] = [];
  for (const shop of shops) {
    const orgId = shop.org_id.trim();
    if (!orgId || seen.has(orgId)) continue;
    seen.add(orgId);
    out.push(shop);
    if (out.length >= TASTING_PACKAGE_MAX_SHOPS) break;
  }
  return out;
}

export function mergeLoadedShopsToDraft(
  singleRows: LoadedTierShopRow[],
  duoRows: LoadedTierShopRow[],
): TastingPackageSharedShopDraft[] {
  const duoByOrg = new Map(duoRows.map((r) => [r.org_id, r]));
  const primary = singleRows.length > 0 ? singleRows : duoRows;

  const merged = primary.slice(0, TASTING_PACKAGE_MAX_SHOPS).map((row) => {
    const duo = duoByOrg.get(row.org_id);
    const isSinglePrimary = singleRows.length > 0;
    return {
      clientId: row.id,
      org_id: row.org_id,
      single_menu_item_id: isSinglePrimary
        ? row.menu_item_ids[0] ?? ""
        : duo?.menu_item_ids[0] ?? row.menu_item_ids[0] ?? "",
      duo_extra_menu_item_id:
        duo?.menu_item_ids[1] ??
        (isSinglePrimary ? "" : row.menu_item_ids[1] ?? row.menu_item_ids[0] ?? ""),
    };
  });

  return normalizeSharedShops(merged);
}

export function splitDraftToTierShops(shops: TastingPackageSharedShopDraft[]): {
  singleShops: TastingPackageShopDraft[];
  duoShops: TastingPackageShopDraft[];
} {
  const singleShops: TastingPackageShopDraft[] = [];
  const duoShops: TastingPackageShopDraft[] = [];

  for (const shop of normalizeSharedShops(shops)) {
    if (!shop.org_id.trim()) continue;
    singleShops.push({
      clientId: shop.clientId,
      org_id: shop.org_id,
      org_name: shop.org_name,
      menu_item_ids: shop.single_menu_item_id ? [shop.single_menu_item_id] : [],
    });
    duoShops.push({
      clientId: shop.clientId,
      org_id: shop.org_id,
      org_name: shop.org_name,
      menu_item_ids:
        shop.single_menu_item_id && shop.duo_extra_menu_item_id
          ? [shop.single_menu_item_id, shop.duo_extra_menu_item_id]
          : [],
    });
  }

  return { singleShops, duoShops };
}
