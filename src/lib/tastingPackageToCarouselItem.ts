import type { CampaignMapItem } from "@/types/campaignMapItem";
import type { TastingPackage, TastingPackageShop } from "@/types/tastingPackage";
import {
  formatTastingPrice,
  formatPackageDistricts,
  formatPackageMtrStations,
  TASTING_PACKAGE_MAX_SHOPS,
} from "@/types/tastingPackage";

function packageShopCount(pkg: TastingPackage): number {
  const singleOrgs = new Set(
    pkg.shops.filter((s) => s.tier === "single").map((s) => s.org_id),
  );
  if (singleOrgs.size > 0) return Math.min(singleOrgs.size, TASTING_PACKAGE_MAX_SHOPS);
  return Math.min(
    pkg.shops.filter((s) => s.tier === "duo").length,
    TASTING_PACKAGE_MAX_SHOPS,
  );
}

/** Single-tier shops for map pins (shared orgs with duo tier). */
export function packageShopsForMap(pkg: TastingPackage): TastingPackageShop[] {
  const single = pkg.shops
    .filter((s) => s.tier === "single")
    .sort((a, b) => a.sort_order - b.sort_order)
    .slice(0, TASTING_PACKAGE_MAX_SHOPS);
  if (single.length > 0) return single;
  return pkg.shops
    .filter((s) => s.tier === "duo")
    .sort((a, b) => a.sort_order - b.sort_order)
    .slice(0, TASTING_PACKAGE_MAX_SHOPS);
}

export function tastingPackageToCarouselItem(pkg: TastingPackage): CampaignMapItem {
  const shopCount = packageShopCount(pkg);
  const coverOrg = pkg.shops.find((s) => s.org_preview_photo_url)?.org_preview_photo_url
    ?? pkg.shops.find((s) => s.org_logo_url)?.org_logo_url
    ?? pkg.cover_image_url;

  const districtLabel = formatPackageDistricts(pkg.districts);
  const locationLabel =
    formatPackageMtrStations(pkg.mtr_stations) || districtLabel;

  return {
    id: pkg.id,
    hunt_id: pkg.id,
    qr_code_id: pkg.id,
    name: pkg.title,
    description: pkg.description,
    lat: null,
    lng: null,
    address: locationLabel,
    sort_order: 0,
    clue_image: pkg.cover_image_url ?? coverOrg ?? null,
    scanned: false,
    pinKind: "coffee_shop",
    offerTitle: `${formatTastingPrice(pkg.single_price_cents)} / ${formatTastingPrice(pkg.duo_price_cents)}`,
    offerDescription: `${shopCount} shops`,
    offerType: "tasting_package",
    orgName: districtLabel,
    orgLogoUrl: null,
    orgPreviewPhotoUrl: pkg.cover_image_url ?? coverOrg ?? null,
    vouchersRemaining: null,
    primaryCampaignVoucherId: null,
    campaignTitle: pkg.title,
    tasting_package_id: pkg.id,
  } as CampaignMapItem & { tasting_package_id: string };
}

export function tastingPackageShopsToMapItems(
  pkg: TastingPackage,
  packageId?: string,
): CampaignMapItem[] {
  const seen = new Set<string>();
  const out: CampaignMapItem[] = [];

  for (const shop of packageShopsForMap(pkg)) {
    if (seen.has(shop.org_id)) continue;
    seen.add(shop.org_id);
    const lat = shop.lat != null ? Number(shop.lat) : null;
    const lng = shop.lng != null ? Number(shop.lng) : null;
    if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    out.push({
      id: `tasting-${pkg.id}-${shop.org_id}`,
      hunt_id: pkg.id,
      qr_code_id: shop.org_id,
      name: shop.org_name ?? "Coffee shop",
      description: null,
      lat,
      lng,
      address: shop.location,
      sort_order: shop.sort_order,
      clue_image: shop.org_preview_photo_url ?? shop.org_logo_url ?? null,
      scanned: false,
      pinKind: "coffee_shop",
      offerTitle: pkg.title,
      offerDescription: null,
      offerType: "tasting_shop",
      orgName: shop.org_name,
      orgLogoUrl: shop.org_logo_url,
      orgPreviewPhotoUrl: shop.org_preview_photo_url,
      vouchersRemaining: null,
      primaryCampaignVoucherId: null,
      campaignTitle: pkg.title,
      org_id: shop.org_id,
      tasting_package_id: packageId ?? pkg.id,
    } as CampaignMapItem & { tasting_package_id: string });
  }

  return out;
}
