import type { DiscoveryOrgRow } from "@/hooks/useDiscoveryOrgs";
import type { CampaignMapItem } from "@/types/campaignMapItem";

export function discoveryOrgToCafeTreasure(row: DiscoveryOrgRow): CampaignMapItem {
  return {
    id: `discovery-org:${row.id}`,
    hunt_id: "",
    qr_code_id: `discovery:${row.id}`,
    name: row.org_name,
    description: null,
    lat: row.lat,
    lng: row.lng,
    address: row.location,
    sort_order: 0,
    clue_image: row.preview_photo_url ?? row.logo_url ?? null,
    scanned: false,
    pinKind: "coffee_shop",
    offerTitle: null,
    offerDescription: null,
    offerType: null,
    orgName: row.org_name,
    orgLogoUrl: row.logo_url ?? null,
    orgPreviewPhotoUrl: row.preview_photo_url,
    quantityLimit: null,
    campaignTitle: null,
    org_id: row.id,
  };
}
