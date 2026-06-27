import type { Tables } from "@/integrations/supabase/types";

export type TastingPackageTier = "single" | "duo";

export type TastingPackageRow = Tables<"tasting_packages">;
export type TastingPackageShopRow = Tables<"tasting_package_shops">;
export type TastingPackageItemRow = Tables<"tasting_package_items">;

export type TastingPackageMenuItem = {
  id: string;
  item_name: string;
  portion_index: number;
};

export type TastingPackageShop = {
  id: string;
  org_id: string;
  tier: TastingPackageTier;
  sort_order: number;
  org_name: string | null;
  org_logo_url: string | null;
  org_preview_photo_url: string | null;
  lat: number | null;
  lng: number | null;
  location: string | null;
  items: TastingPackageMenuItem[];
};

export type TastingPackage = TastingPackageRow & {
  shops: TastingPackageShop[];
};

export type TastingPackageShopDraft = {
  clientId: string;
  org_id: string;
  org_name?: string;
  menu_item_ids: string[];
};

export type TastingPackageEditorDraft = {
  title: string;
  description: string;
  hk_areas: string[];
  districts: string[];
  mtr_stations: string[];
  cover_image_url: string;
  status: "draft" | "published";
  is_active: boolean;
  singleShops: TastingPackageShopDraft[];
  duoShops: TastingPackageShopDraft[];
};

export const TASTING_SINGLE_MAX_SHOPS = 5;
export const TASTING_DUO_MAX_SHOPS = 5;
export const TASTING_SINGLE_PORTIONS = 1;
export const TASTING_DUO_PORTIONS = 2;
export const TASTING_DUO_PRICE_CENTS = 14700;

export function formatPackageDistricts(districts: string[]): string {
  if (districts.length === 0) return '';
  return districts.join(', ');
}

export function formatPackageMtrStations(mtrStations: string[]): string {
  if (mtrStations.length === 0) return '';
  return mtrStations.join(', ');
}

export function formatTastingPrice(cents: number): string {
  return `$${Math.round(cents / 100)}`;
}
