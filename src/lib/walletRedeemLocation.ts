import type { PublishedCampaignClaimSpot } from "@/lib/campaignToMapItem";
import { orgDirectionsUrl } from "@/lib/orgDirectionsUrl";

export type WalletOrgRow = {
  shop_type?: string | null;
  lat: number | null;
  lng: number | null;
  location: string | null;
  google_maps_url: string | null;
};

/**
 * Resolves wallet "redeem / pickup" display text and Maps directions URL.
 * Online orgs use the campaign-linked claim spot only (no org storefront fallback).
 */
export function walletRedeemLocation(
  org: WalletOrgRow | null,
  claimSpot: PublishedCampaignClaimSpot | null,
): {
  location: string | null;
  redeem_directions_url: string | null;
  pickup_spot_label: string | null;
} {
  const shopType = org?.shop_type?.trim();
  if (shopType === "online") {
    if (!claimSpot) {
      return { location: null, redeem_directions_url: null, pickup_spot_label: null };
    }
    const addr = claimSpot.address?.trim() || null;
    const lab = claimSpot.label?.trim() || null;
    let location: string | null;
    let pickup_spot_label: string | null;
    if (addr && lab) {
      location = addr;
      pickup_spot_label = lab;
    } else {
      location = addr || lab || null;
      pickup_spot_label = null;
    }
    const redeem_directions_url = orgDirectionsUrl({
      lat: claimSpot.lat ?? null,
      lng: claimSpot.lng ?? null,
      location: claimSpot.address?.trim() || claimSpot.label?.trim() || null,
      google_maps_url: claimSpot.google_maps_url ?? null,
    });
    return { location, redeem_directions_url, pickup_spot_label };
  }

  if (!org) {
    return { location: null, redeem_directions_url: null, pickup_spot_label: null };
  }
  const location = org.location?.trim() || null;
  const redeem_directions_url = orgDirectionsUrl({
    lat: org.lat ?? null,
    lng: org.lng ?? null,
    location: org.location ?? null,
    google_maps_url: org.google_maps_url ?? null,
  });
  return { location, redeem_directions_url, pickup_spot_label: null };
}
