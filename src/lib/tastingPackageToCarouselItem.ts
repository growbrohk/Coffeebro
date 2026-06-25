import type { CampaignMapItem } from "@/types/campaignMapItem";
import type { TastingPackage } from "@/types/tastingPackage";
import { formatTastingPrice, formatPackageDistricts } from "@/types/tastingPackage";

export function tastingPackageToCarouselItem(pkg: TastingPackage): CampaignMapItem {
  const singleCount = pkg.shops.filter((s) => s.tier === "single").length;
  const duoCount = pkg.shops.filter((s) => s.tier === "duo").length;
  const coverOrg = pkg.shops.find((s) => s.org_preview_photo_url)?.org_preview_photo_url
    ?? pkg.shops.find((s) => s.org_logo_url)?.org_logo_url
    ?? pkg.cover_image_url;

  const districtLabel = formatPackageDistricts(pkg.districts);

  return {
    id: pkg.id,
    hunt_id: pkg.id,
    qr_code_id: pkg.id,
    name: pkg.title,
    description: pkg.description,
    lat: null,
    lng: null,
    address: districtLabel,
    sort_order: 0,
    clue_image: pkg.cover_image_url ?? coverOrg ?? null,
    scanned: false,
    pinKind: "coffee_shop",
    offerTitle: `${formatTastingPrice(pkg.single_price_cents)} / ${formatTastingPrice(pkg.duo_price_cents)}`,
    offerDescription: `${singleCount} shops · ${duoCount} duo shops`,
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

  for (const shop of pkg.shops) {
    if (seen.has(shop.org_id)) continue;
    seen.add(shop.org_id);
    if (shop.lat == null || shop.lng == null) continue;

    out.push({
      id: `tasting-${pkg.id}-${shop.org_id}`,
      hunt_id: pkg.id,
      qr_code_id: shop.org_id,
      name: shop.org_name ?? "Coffee shop",
      description: null,
      lat: shop.lat,
      lng: shop.lng,
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
