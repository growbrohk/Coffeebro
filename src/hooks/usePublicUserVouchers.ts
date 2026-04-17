import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { MyVoucher } from "@/hooks/useMyVouchers";
import { voucherNameFromOfferAndMenu, voucherOfferLabel } from "@/lib/voucherOfferLabels";
import { orgDirectionsUrl } from "@/lib/orgDirectionsUrl";

/** Wallet row without redemption code (another user’s list). */
export type PublicVoucher = Omit<MyVoucher, "code"> & { code?: never };

type RpcRow = {
  id: string;
  status: string;
  created_at: string;
  redeemed_at: string | null;
  expires_at: string | null;
  campaign_id: string;
  org_id: string;
  org_name: string | null;
  org_logo_url: string | null;
  org_lat: number | null;
  org_lng: number | null;
  org_location: string | null;
  org_google_maps_url: string | null;
  offer_type: string | null;
  menu_item_name: string | null;
  display_title: string | null;
  campaign_type: string | null;
  hint_text: string | null;
  hint_image_url: string | null;
  campaign_end_at: string | null;
};

function mapRow(v: RpcRow): PublicVoucher {
  const cvOffer = v.offer_type;
  const menuName = v.menu_item_name;
  const camp = {
    display_title: v.display_title,
    campaign_type: v.campaign_type ?? "grab",
    end_at: v.campaign_end_at,
    hint_text: v.hint_text,
    hint_image_url: v.hint_image_url,
  };
  const voucherName =
    cvOffer != null && String(cvOffer).trim() !== ""
      ? voucherNameFromOfferAndMenu(cvOffer, menuName)
      : null;
  const title =
    voucherName ??
    (camp.display_title?.trim() ||
      menuName?.trim() ||
      (camp.campaign_type === "hunt" ? "Hunt reward" : "Campaign reward"));
  const campaignDetails = camp.display_title?.trim() || null;
  const offerType = cvOffer ? voucherOfferLabel(cvOffer) : undefined;
  const thumb = camp.hint_image_url || null;
  const locationTrimmed = v.org_location?.trim() || null;
  const redeemDirectionsUrl = orgDirectionsUrl({
    lat: v.org_lat ?? null,
    lng: v.org_lng ?? null,
    location: v.org_location ?? null,
    google_maps_url: v.org_google_maps_url ?? null,
  });

  return {
    id: v.id,
    status: v.status as PublicVoucher["status"],
    created_at: v.created_at,
    redeemed_at: v.redeemed_at ?? null,
    expires_at: v.expires_at ?? null,
    title,
    org_id: v.org_id,
    org_name: v.org_name ?? undefined,
    org_logo_url: v.org_logo_url ?? null,
    offer_type: offerType,
    description: camp.hint_text ?? null,
    location: locationTrimmed,
    event_date: camp.end_at ?? null,
    thumbnail_url: thumb,
    campaign_id: v.campaign_id,
    campaign_details: campaignDetails,
    redeem_directions_url: redeemDirectionsUrl,
  };
}

export function usePublicUserVouchers(ownerId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["vouchers", "public", ownerId, user?.id],
    queryFn: async () => {
      if (!user || !ownerId) return [];

      const { data, error } = await supabase.rpc("get_public_user_vouchers", {
        p_owner_id: ownerId,
      });

      if (error) throw error;

      const rows = (data ?? []) as RpcRow[];
      return rows.map(mapRow);
    },
    enabled: !!user && !!ownerId,
  });
}
