import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { voucherNameFromOfferAndMenu, voucherOfferLabel } from "@/lib/voucherOfferLabels";
import { orgDirectionsUrl } from "@/lib/orgDirectionsUrl";

export interface MyVoucherReview {
  id: string;
  log_item: string | null;
  log_item_other: string | null;
  tasting_notes: string | null;
  share_publicly: boolean;
  coffee_date: string;
}

export interface MyVoucher {
  id: string;
  code: string;
  status: "active" | "redeemed" | "expired" | "refunded";
  created_at: string;
  redeemed_at: string | null;
  expires_at: string | null;
  title: string;
  org_name?: string;
  offer_type?: string;
  description?: string | null;
  location?: string | null;
  event_date?: string | null;
  thumbnail_url?: string | null;
  org_logo_url?: string | null;
  campaign_id?: string;
  org_id?: string;
  /** Menu item id embedded in the voucher's campaign_voucher (nullable). */
  menu_item_id?: string | null;
  /** Menu item display name embedded in the voucher's campaign_voucher. */
  menu_item_name?: string | null;
  /** Campaign `display_title` for the wallet details dialog. */
  campaign_details?: string | null;
  /** Google Maps directions URL for the redeeming org, when derivable. */
  redeem_directions_url?: string | null;
  /** Present for redeemed vouchers with an associated daily_coffees review row. */
  review?: MyVoucherReview | null;
}

export function formatVoucherRedemptionPeriod(
  expiresAt: string | null | undefined,
  eventDate: string | null | undefined,
): string {
  if (expiresAt) {
    const d = new Date(expiresAt);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
  }
  if (eventDate) {
    const d = new Date(eventDate + "T12:00:00");
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
  }
  return "—";
}

export function useMyVouchers() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["vouchers", "my", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: vouchers, error } = await supabase
        .from("vouchers")
        .select(
          `
          id,
          code,
          status,
          created_at,
          redeemed_at,
          expires_at,
          campaign_id,
          org_id,
          orgs ( org_name, logo_url, lat, lng, location, google_maps_url ),
          campaign_vouchers (
            offer_type,
            menu_items ( id, item_name ),
            campaigns ( display_title, campaign_type, start_at, end_at, hint_text, hint_image_url )
          )
        `,
        )
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const result: MyVoucher[] = (vouchers ?? []).map((v: Record<string, unknown>) => {
        const rawCv = v.campaign_vouchers;
        const cv = (Array.isArray(rawCv) ? rawCv[0] : rawCv) as
          | {
              offer_type: string;
              menu_items: { id: string; item_name: string } | null;
              campaigns: {
                display_title: string | null;
                campaign_type: string;
                start_at: string | null;
                end_at: string | null;
                hint_text: string | null;
                hint_image_url: string | null;
              } | null;
            }
          | null
          | undefined;
        const rawCamp = cv?.campaigns;
        const camp = Array.isArray(rawCamp) ? rawCamp[0] : rawCamp;
        const rawMenu = cv?.menu_items;
        const menu = Array.isArray(rawMenu) ? rawMenu[0] : rawMenu;
        const voucherName =
          cv?.offer_type != null && String(cv.offer_type).trim() !== ""
            ? voucherNameFromOfferAndMenu(cv.offer_type, menu?.item_name)
            : null;
        const title =
          voucherName ??
          (camp?.display_title?.trim() ||
            menu?.item_name?.trim() ||
            (camp?.campaign_type === "hunt" ? "Hunt reward" : "Campaign reward"));
        const campaignDetails = camp?.display_title?.trim() || null;
        const offerType = cv?.offer_type ? voucherOfferLabel(cv.offer_type) : undefined;
        const thumb = camp?.hint_image_url || null;
        const orgsRow = v.orgs as {
          org_name: string;
          logo_url?: string | null;
          lat: number | null;
          lng: number | null;
          location: string | null;
          google_maps_url: string | null;
        } | null;

        const locationTrimmed = orgsRow?.location?.trim() || null;
        const redeemDirectionsUrl = orgsRow
          ? orgDirectionsUrl({
              lat: orgsRow.lat ?? null,
              lng: orgsRow.lng ?? null,
              location: orgsRow.location ?? null,
              google_maps_url: orgsRow.google_maps_url ?? null,
            })
          : null;

        return {
          id: v.id as string,
          code: v.code as string,
          status: v.status as MyVoucher["status"],
          created_at: v.created_at as string,
          redeemed_at: (v.redeemed_at as string | null) ?? null,
          expires_at: (v.expires_at as string | null) ?? null,
          title,
          org_id: v.org_id as string,
          org_name: orgsRow?.org_name,
          org_logo_url: orgsRow?.logo_url ?? null,
          offer_type: offerType,
          description: camp?.hint_text ?? null,
          location: locationTrimmed,
          event_date: camp?.end_at ?? null,
          thumbnail_url: thumb,
          campaign_id: v.campaign_id as string,
          menu_item_id: menu?.id ?? null,
          menu_item_name: menu?.item_name?.trim() ?? null,
          campaign_details: campaignDetails,
          redeem_directions_url: redeemDirectionsUrl,
          review: null,
        };
      });

      const redeemedIds = result
        .filter((v) => v.status === "redeemed")
        .map((v) => v.id);

      if (redeemedIds.length > 0) {
        const { data: reviewRows } = await supabase
          .from("daily_coffees")
          .select(
            "id, voucher_id, log_item, log_item_other, tasting_notes, share_publicly, coffee_date",
          )
          .eq("user_id", user.id)
          .in("voucher_id", redeemedIds);

        const byVoucher = new Map<string, MyVoucherReview>();
        for (const r of reviewRows ?? []) {
          if (!r.voucher_id) continue;
          byVoucher.set(r.voucher_id, {
            id: r.id,
            log_item: r.log_item ?? null,
            log_item_other: r.log_item_other ?? null,
            tasting_notes: r.tasting_notes ?? null,
            share_publicly: Boolean(r.share_publicly),
            coffee_date: r.coffee_date,
          });
        }

        for (const v of result) {
          if (v.status === "redeemed") {
            v.review = byVoucher.get(v.id) ?? null;
          }
        }
      }

      return result;
    },
    enabled: !!user,
  });
}
