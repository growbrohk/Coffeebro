import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { voucherNameFromOfferAndMenu, voucherOfferLabel } from "@/lib/voucherOfferLabels";

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
  /** Campaign `display_title` for the wallet details dialog. */
  campaign_details?: string | null;
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
          orgs ( org_name, logo_url ),
          campaign_vouchers (
            offer_type,
            menu_items ( item_name ),
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
              menu_items: { item_name: string } | null;
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
        const orgsRow = v.orgs as { org_name: string; logo_url?: string | null } | null;

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
          location: null,
          event_date: camp?.end_at ?? null,
          thumbnail_url: thumb,
          campaign_id: v.campaign_id as string,
          campaign_details: campaignDetails,
        };
      });

      return result;
    },
    enabled: !!user,
  });
}
