import type { HuntMapPinKind } from "@/lib/huntMapPinKind";

/** Consumer map / carousel row for a published campaign (or discovery café stub). */
export type CampaignMapItem = {
  id: string;
  hunt_id: string;
  qr_code_id: string;
  name: string;
  description: string | null;
  lat: number | null;
  lng: number | null;
  address: string | null;
  sort_order: number;
  clue_image?: string | null;
  scanned: boolean;
  pinKind: HuntMapPinKind;
  offerTitle: string | null;
  offerDescription: string | null;
  offerType: string | null;
  orgName: string | null;
  orgLogoUrl: string | null;
  orgPreviewPhotoUrl: string | null;
  quantityLimit: number | null;
  campaignTitle: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  campaign_type?: "grab" | "hunt";
  org_id?: string;
  campaign_id?: string;
  cafeDetailTreasureId?: string | null;
  calendarOfferId?: string | null;
  eventDate?: string | null;
};
