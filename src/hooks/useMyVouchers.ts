import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { normalizeClaimSpot } from "@/lib/campaignToMapItem";
import { voucherNameFromOfferAndMenu, voucherOfferLabel } from "@/lib/voucherOfferLabels";
import { walletRedeemLocation } from "@/lib/walletRedeemLocation";

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
  /** Online-shop claim spot label when both label and address are shown (two-line footer). */
  pickup_spot_label?: string | null;
  /** Org `shop_type` for pickup vs redeem copy in voucher UI. */
  org_shop_type?: string | null;
  /** Present for redeemed vouchers with an associated daily_coffees review row. */
  review?: MyVoucherReview | null;
  /** Tasting package purchase folder grouping. */
  tasting_package_purchase_id?: string | null;
  tasting_package_id?: string | null;
  tasting_package_title?: string | null;
  tasting_package_tier?: string | null;
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

function parseRedemptionDeadline(
  expiresAt: string | null | undefined,
  eventDate: string | null | undefined,
): number | null {
  if (expiresAt) {
    const t = new Date(expiresAt).getTime();
    if (!Number.isNaN(t)) return t;
  }
  if (eventDate) {
    const t = new Date(eventDate + "T12:00:00").getTime();
    if (!Number.isNaN(t)) return t;
  }
  return null;
}

export function getVoucherRedemptionDeadline(v: MyVoucher): number | null {
  return parseRedemptionDeadline(v.expires_at, v.event_date ?? null);
}

export function isVoucherWalletActive(v: MyVoucher): boolean {
  if (v.status !== "active") return false;
  const deadline = getVoucherRedemptionDeadline(v);
  if (deadline == null) return true;
  return deadline >= Date.now();
}

export function isVoucherWalletExpired(v: MyVoucher): boolean {
  if (isVoucherWalletActive(v)) return false;
  if (v.status === "expired") return true;
  if (v.status === "active") {
    const deadline = getVoucherRedemptionDeadline(v);
    return deadline != null && deadline < Date.now();
  }
  return false;
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
          loyalty_catalog_id,
          tasting_package_purchase_id,
          tasting_package_item_id,
          menu_item_id,
          org_id,
          orgs ( org_name, logo_url, lat, lng, location, google_maps_url, shop_type ),
          menu_items ( id, item_name ),
          tasting_package_items (
            id,
            portion_index,
            menu_items ( id, item_name )
          ),
          tasting_package_purchases (
            id,
            tier,
            package_id,
            tasting_packages ( id, title )
          ),
          vouchers_catalog ( title, menu_item_id, menu_items ( id, item_name ) ),
          campaign_vouchers (
            offer_type,
            menu_items ( id, item_name ),
            campaigns (
              display_title,
              campaign_type,
              start_at,
              end_at,
              hint_text,
              hint_image_url,
              org_claim_spots ( id, label, address, lat, lng, google_maps_url )
            )
          )
        `,
        )
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const result: MyVoucher[] = (vouchers ?? []).map((v: Record<string, unknown>) => {
        const tastingPurchaseRaw = v.tasting_package_purchases;
        const tastingPurchase = (Array.isArray(tastingPurchaseRaw)
          ? tastingPurchaseRaw[0]
          : tastingPurchaseRaw) as
          | {
              id: string;
              tier: string;
              package_id: string;
              tasting_packages: { id: string; title: string } | { id: string; title: string }[] | null;
            }
          | null
          | undefined;

        if (v.tasting_package_purchase_id) {
          const rawPkg = tastingPurchase?.tasting_packages;
          const pkg = rawPkg
            ? Array.isArray(rawPkg)
              ? rawPkg[0]
              : rawPkg
            : null;
          const orgsRow = v.orgs as {
            org_name: string;
            logo_url?: string | null;
            lat: number | null;
            lng: number | null;
            location: string | null;
            google_maps_url: string | null;
            shop_type?: string | null;
          } | null;

          const rawTpi = v.tasting_package_items;
          const tpi = (Array.isArray(rawTpi) ? rawTpi[0] : rawTpi) as
            | { menu_items: { id: string; item_name: string } | { id: string; item_name: string }[] | null }
            | null
            | undefined;
          const rawMenuFromTpi = tpi?.menu_items;
          const menuFromTpi = Array.isArray(rawMenuFromTpi) ? rawMenuFromTpi[0] : rawMenuFromTpi;

          const rawMenuDirect = v.menu_items;
          const menuDirect = Array.isArray(rawMenuDirect) ? rawMenuDirect[0] : rawMenuDirect;
          const menu = menuDirect ?? menuFromTpi;

          const { location: locationTrimmed, redeem_directions_url: redeemDirectionsUrl, pickup_spot_label } =
            walletRedeemLocation(
              orgsRow
                ? {
                    shop_type: orgsRow.shop_type ?? null,
                    lat: orgsRow.lat ?? null,
                    lng: orgsRow.lng ?? null,
                    location: orgsRow.location ?? null,
                    google_maps_url: orgsRow.google_maps_url ?? null,
                  }
                : null,
              null,
            );

          const tier = tastingPurchase?.tier ?? 'single';
          const tierLabel = tier === 'duo' ? 'Duo' : 'Single';
          const packageTitle = pkg?.title ?? 'Tasting package';

          return {
            id: v.id as string,
            code: v.code as string,
            status: v.status as MyVoucher["status"],
            created_at: v.created_at as string,
            redeemed_at: (v.redeemed_at as string | null) ?? null,
            expires_at: (v.expires_at as string | null) ?? null,
            title: menu?.item_name?.trim() ?? 'Tasting drink',
            org_id: v.org_id as string,
            org_name: orgsRow?.org_name,
            org_logo_url: orgsRow?.logo_url ?? null,
            offer_type: 'Tasting',
            description: `${packageTitle} (${tierLabel})`,
            location: locationTrimmed,
            event_date: null,
            thumbnail_url: null,
            menu_item_id: menu?.id ?? null,
            menu_item_name: menu?.item_name?.trim() ?? null,
            campaign_details: packageTitle,
            redeem_directions_url: redeemDirectionsUrl,
            pickup_spot_label: pickup_spot_label ?? null,
            org_shop_type: orgsRow?.shop_type ?? null,
            review: null,
            tasting_package_purchase_id: v.tasting_package_purchase_id as string,
            tasting_package_id: tastingPurchase?.package_id ?? pkg?.id ?? null,
            tasting_package_title: packageTitle,
            tasting_package_tier: tier,
          };
        }

        const rawLoyalty = v.vouchers_catalog;
        const loyaltyRow = (Array.isArray(rawLoyalty) ? rawLoyalty[0] : rawLoyalty) as
          | {
              title: string;
              menu_items: { id: string; item_name: string } | { id: string; item_name: string }[] | null;
            }
          | null
          | undefined;

        if (v.loyalty_catalog_id && loyaltyRow) {
          const orgsRow = v.orgs as {
            org_name: string;
            logo_url?: string | null;
            lat: number | null;
            lng: number | null;
            location: string | null;
            google_maps_url: string | null;
            shop_type?: string | null;
          } | null;

          const rawLm = loyaltyRow.menu_items;
          const lmenu = Array.isArray(rawLm) ? rawLm[0] : rawLm;

          const { location: locationTrimmed, redeem_directions_url: redeemDirectionsUrl, pickup_spot_label } =
            walletRedeemLocation(
              orgsRow
                ? {
                    shop_type: orgsRow.shop_type ?? null,
                    lat: orgsRow.lat ?? null,
                    lng: orgsRow.lng ?? null,
                    location: orgsRow.location ?? null,
                    google_maps_url: orgsRow.google_maps_url ?? null,
                  }
                : null,
              null,
            );

          return {
            id: v.id as string,
            code: v.code as string,
            status: v.status as MyVoucher["status"],
            created_at: v.created_at as string,
            redeemed_at: (v.redeemed_at as string | null) ?? null,
            expires_at: (v.expires_at as string | null) ?? null,
            title: loyaltyRow.title,
            org_id: v.org_id as string,
            org_name: orgsRow?.org_name,
            org_logo_url: orgsRow?.logo_url ?? null,
            offer_type: "Loyalty reward",
            description: "Redeem with your points at this shop.",
            location: locationTrimmed,
            event_date: null,
            thumbnail_url: null,
            campaign_id: (v.campaign_id as string | undefined) ?? undefined,
            menu_item_id: lmenu?.id ?? null,
            menu_item_name: lmenu?.item_name?.trim() ?? null,
            campaign_details: loyaltyRow.title,
            redeem_directions_url: redeemDirectionsUrl,
            pickup_spot_label: pickup_spot_label ?? null,
            org_shop_type: orgsRow?.shop_type ?? null,
            review: null,
          };
        }

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
                org_claim_spots:
                  | {
                      id: string;
                      label: string;
                      address: string | null;
                      lat: number | null;
                      lng: number | null;
                      google_maps_url: string | null;
                    }[]
                  | {
                      id: string;
                      label: string;
                      address: string | null;
                      lat: number | null;
                      lng: number | null;
                      google_maps_url: string | null;
                    }
                  | null;
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
          shop_type?: string | null;
        } | null;

        const claimSpot = normalizeClaimSpot(camp?.org_claim_spots);
        const { location: locationTrimmed, redeem_directions_url: redeemDirectionsUrl, pickup_spot_label } =
          walletRedeemLocation(
            orgsRow
              ? {
                  shop_type: orgsRow.shop_type ?? null,
                  lat: orgsRow.lat ?? null,
                  lng: orgsRow.lng ?? null,
                  location: orgsRow.location ?? null,
                  google_maps_url: orgsRow.google_maps_url ?? null,
                }
              : null,
            claimSpot,
          );

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
          campaign_id: (v.campaign_id as string | null) ?? undefined,
          menu_item_id: menu?.id ?? null,
          menu_item_name: menu?.item_name?.trim() ?? null,
          campaign_details: campaignDetails,
          redeem_directions_url: redeemDirectionsUrl,
          pickup_spot_label: pickup_spot_label ?? null,
          org_shop_type: orgsRow?.shop_type ?? null,
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
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    staleTime: 5_000,
    retry: 1,
    retryDelay: (attempt) => 3000 * attempt,
  });
}
