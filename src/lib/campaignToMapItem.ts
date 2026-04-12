import type { CampaignMapItem } from "@/types/campaignMapItem";
import { pinKindFromCampaignType } from "@/lib/huntMapPinKind";
import type { Tables } from "@/integrations/supabase/types";
import { voucherOfferLabel } from "@/lib/voucherOfferLabels";

export type PublishedCampaignRow = Tables<"campaigns"> & {
  orgs: Pick<
    Tables<"orgs">,
    "id" | "org_name" | "logo_url" | "preview_photo_url" | "lat" | "lng" | "location"
  > | null;
  campaign_vouchers: Array<
    Tables<"campaign_vouchers"> & {
      menu_items: Tables<"menu_items"> | null;
    }
  >;
};

export function publishedCampaignToMapItem(
  row: PublishedCampaignRow,
  claimedCampaignIds: Set<string>,
): CampaignMapItem | null {
  const orgRaw = row.orgs as PublishedCampaignRow["orgs"] | PublishedCampaignRow["orgs"][] | null | undefined;
  const org = Array.isArray(orgRaw) ? orgRaw[0] ?? null : orgRaw ?? null;
  const orgLat = org?.lat ?? null;
  const orgLng = org?.lng ?? null;
  const isGrab = row.campaign_type === "grab";

  let lat: number | null = null;
  let lng: number | null = null;
  let address: string | null = null;

  if (isGrab || row.treasure_location_type === "shop") {
    lat = orgLat;
    lng = orgLng;
    address = org?.location ?? null;
  } else {
    lat = row.treasure_lat ?? orgLat;
    lng = row.treasure_lng ?? orgLng;
    address = row.treasure_address ?? row.treasure_area_name ?? org?.location ?? null;
  }

  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  if (row.end_at != null) {
    const endMs = new Date(row.end_at).getTime();
    if (Number.isFinite(endMs) && Date.now() >= endMs) {
      return null;
    }
  }

  const cvRaw = row.campaign_vouchers;
  const cvList = Array.isArray(cvRaw) ? cvRaw : cvRaw ? [cvRaw] : [];
  const sortedVouchers = [...cvList].sort(
    (a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at),
  );
  const primary = sortedVouchers[0];
  const menu = primary?.menu_items;
  const offerTypeLabel = primary ? voucherOfferLabel(primary.offer_type) : null;

  const title = row.display_title?.trim() || row.campaign_type || "Campaign";

  return {
    id: row.id,
    hunt_id: "",
    qr_code_id: row.qr_payload ?? `campaign:${row.id}`,
    name: title,
    description: row.hint_text ?? null,
    lat,
    lng,
    address,
    sort_order: 0,
    clue_image: row.hint_image_url ?? org?.preview_photo_url ?? org?.logo_url ?? null,
    scanned: claimedCampaignIds.has(row.id),
    pinKind: pinKindFromCampaignType(row.campaign_type),
    offerTitle: menu?.item_name ?? title,
    offerDescription: row.hint_text,
    offerType: primary ? voucherOfferLabel(primary.offer_type) : null,
    orgName: org?.org_name ?? null,
    orgLogoUrl: org?.logo_url ?? null,
    orgPreviewPhotoUrl: org?.preview_photo_url ?? null,
    quantityLimit: primary?.quantity ?? null,
    campaignTitle: row.display_title,
    starts_at: row.start_at,
    ends_at: row.end_at,
    campaign_type: row.campaign_type as "grab" | "hunt",
    org_id: row.org_id,
    campaign_id: row.id,
  };
}
