import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Navigation } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VoucherDetailDialog } from "@/components/VoucherDetailDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useClaimCampaign, describeClaimCampaignError } from "@/hooks/useClaimCampaign";
import { useMyVouchers } from "@/hooks/useMyVouchers";
import { useOrgStaff } from "@/hooks/useOrgStaff";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import type { PublishedCampaignRow } from "@/lib/campaignToMapItem";
import { canViewCampaignParticipants } from "@/lib/canViewCampaignParticipants";
import { campaignDetailReturnState } from "@/lib/campaignDetailReturnNav";
import { temperatureAndFulfillmentCustomerLine } from "@/lib/campaignVoucherRulesDisplay";
import { formatCampaignInstantCompact } from "@/lib/formatCampaignInstant";
import { voucherNameFromOfferAndMenu } from "@/lib/voucherOfferLabels";
import type { Tables } from "@/integrations/supabase/types";

type PoolRow = {
  campaign_voucher_id: string;
  quantity: number;
  minted_count: number;
  remaining: number;
};

type CampaignVoucherRow = Tables<"campaign_vouchers"> & {
  menu_items: Tables<"menu_items"> | null;
};

function getCampaignIntro(campaignType: string): string {
  if (campaignType === "hunt") {
    return "This is a hunt campaign — go to the location, check the hints, find the QR code, and scan to unlock a voucher!";
  }
  if (campaignType === "grab") {
    return 'This is a grab campaign — tap “Grab offer” to add the voucher to your wallet without visiting the location first.';
  }
  return "This is a campaign on Coffeebro.";
}

/** Line shown before the voucher cards in Rewards. */
function getRewardsLeadIn(rewardMode: string, rewardPerAction: number): string {
  if (rewardMode === "fixed") {
    return "Each successful claim awards:";
  }
  if (rewardMode === "random") {
    const n = Math.max(1, rewardPerAction);
    if (n <= 1) {
      return "Each successful claim draws one random prize from:";
    }
    return `Each successful claim draws up to ${n} random prizes from:`;
  }
  return "Rewards:";
}

/** Single line for campaign window (compact dates, arrow when both exist). */
function getAvailabilityLine(startLabel: string | null, endLabel: string | null): string {
  if (startLabel && endLabel) {
    return `Available ${startLabel} → ${endLabel}`;
  }
  if (startLabel) {
    return `Available from ${startLabel}. No end date is listed; the host may close the campaign anytime.`;
  }
  if (endLabel) {
    return `Available until ${endLabel}.`;
  }
  return "No end date is listed; the host may close the campaign anytime.";
}

function normalizeOrg(row: PublishedCampaignRow) {
  const raw = row.orgs as PublishedCampaignRow["orgs"] | PublishedCampaignRow["orgs"][] | null | undefined;
  return Array.isArray(raw) ? raw[0] ?? null : raw ?? null;
}

type HuntQrMapTarget = { displayAddress: string | null; mapsUrl: string | null };

/** Treasure / shop coordinates and address for hunt QR location (aligns with map pin logic). */
function getHuntQrMapTarget(campaign: PublishedCampaignRow, org: ReturnType<typeof normalizeOrg>): HuntQrMapTarget {
  if (campaign.campaign_type !== "hunt") {
    return { displayAddress: null, mapsUrl: null };
  }

  const orgLat = org?.lat ?? null;
  const orgLng = org?.lng ?? null;

  let lat: number | null = null;
  let lng: number | null = null;
  let address: string | null = null;

  if (campaign.treasure_location_type === "shop") {
    lat = orgLat;
    lng = orgLng;
    address = org?.location?.trim() || null;
  } else {
    lat = campaign.treasure_lat ?? orgLat;
    lng = campaign.treasure_lng ?? orgLng;
    address =
      campaign.treasure_address?.trim() ||
      campaign.treasure_area_name?.trim() ||
      org?.location?.trim() ||
      null;
  }

  const mapsUrl =
    lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)
      ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
      : address
        ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
        : null;

  let displayAddress = address;
  if (!displayAddress && lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
    displayAddress = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }

  return { displayAddress, mapsUrl };
}

function sortCampaignVouchers(list: PublishedCampaignRow["campaign_vouchers"]): CampaignVoucherRow[] {
  const arr = Array.isArray(list) ? list : list ? [list] : [];
  return [...arr].sort(
    (a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at),
  );
}

export default function CampaignDetailPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isSuperAdmin, isLoading: roleLoading } = useUserRole();
  const { data: staffAssignments = [], isLoading: staffLoading } = useOrgStaff();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const claim = useClaimCampaign();
  const [hintImageDialogOpen, setHintImageDialogOpen] = useState(false);
  const [myVoucherDialogOpen, setMyVoucherDialogOpen] = useState(false);

  const { data: campaign, isLoading } = useQuery({
    queryKey: ["campaign_public", campaignId],
    enabled: Boolean(campaignId),
    queryFn: async (): Promise<PublishedCampaignRow | null> => {
      if (!campaignId) return null;
      const { data, error } = await supabase
        .from("campaigns")
        .select(
          `
          *,
          orgs ( id, org_name, logo_url, preview_photo_url, lat, lng, location, owner_user_id ),
          campaign_vouchers ( *, menu_items (*) )
        `,
        )
        .eq("id", campaignId)
        .eq("status", "published")
        .maybeSingle();
      if (error) throw error;
      return data as PublishedCampaignRow | null;
    },
  });

  const { data: myVouchers = [] } = useMyVouchers();

  const myVouchersForCampaign = useMemo(
    () => myVouchers.filter((v) => v.campaign_id === campaignId),
    [myVouchers, campaignId],
  );

  const poolQuery = useQuery({
    queryKey: ["campaign_voucher_pool", campaignId],
    enabled: Boolean(campaignId),
    queryFn: async (): Promise<PoolRow[]> => {
      if (!campaignId) return [];
      const { data, error } = await supabase.rpc("get_published_campaign_voucher_pool", {
        p_campaign_id: campaignId,
      });
      if (error) throw error;
      return (data ?? []) as PoolRow[];
    },
  });

  const poolByCvId = useMemo(() => {
    const m = new Map<string, PoolRow>();
    for (const row of poolQuery.data ?? []) {
      m.set(row.campaign_voucher_id, row);
    }
    return m;
  }, [poolQuery.data]);

  const org = campaign != null ? normalizeOrg(campaign) : null;
  const huntQrMapTarget = useMemo(() => {
    if (!campaign) return { displayAddress: null, mapsUrl: null } as HuntQrMapTarget;
    return getHuntQrMapTarget(campaign, org);
  }, [campaign, org]);

  useEffect(() => {
    setHintImageDialogOpen(false);
    setMyVoucherDialogOpen(false);
  }, [campaignId]);

  const onGrab = async () => {
    if (!user || !campaignId) {
      navigate("/profile");
      return;
    }
    if (campaign?.campaign_type !== "grab") return;
    try {
      await claim.mutateAsync(campaignId);
      void queryClient.invalidateQueries({ queryKey: ["campaign_voucher_pool", campaignId] });
      toast({ title: "Claimed!", description: "Check your wallet." });
    } catch (e) {
      toast({
        title: "Could not claim",
        description: describeClaimCampaignError(e),
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-lg font-semibold">Loading…</div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <p className="text-center text-muted-foreground">Campaign not found or not published.</p>
        <Button className="mx-auto mt-4 block" variant="outline" onClick={() => navigate("/hunts")}>
          Back to map
        </Button>
      </div>
    );
  }

  const title = campaign.display_title?.trim() || "Campaign";
  const sortedVouchers = sortCampaignVouchers(campaign.campaign_vouchers);
  const startLabel = formatCampaignInstantCompact(campaign.start_at);
  const endLabel = formatCampaignInstantCompact(campaign.end_at);
  const isHunt = campaign.campaign_type === "hunt";

  const canViewParticipants =
    !roleLoading &&
    !staffLoading &&
    canViewCampaignParticipants({
      userId: user?.id,
      isSuperAdmin,
      campaignOrgId: campaign.org_id,
      orgOwnerUserId: org?.owner_user_id ?? null,
      staffAssignments,
    });

  const availabilityLine = getAvailabilityLine(startLabel, endLabel);

  const showHintsSection =
    isHunt &&
    (Boolean(campaign.hint_text?.trim()) ||
      Boolean(campaign.hint_image_url) ||
      Boolean(huntQrMapTarget.mapsUrl));

  const staffNavFromDetail = campaignId ? campaignDetailReturnState(campaignId) : undefined;

  return (
    <>
      <div className="min-h-screen bg-background pb-40">
        <div className="sticky top-0 z-10 flex min-w-0 items-center border-b border-border bg-background px-4 py-4">
          <button type="button" onClick={() => navigate(-1)} className="mr-2 shrink-0 p-2" aria-label="Back">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="min-w-0 flex-1 text-lg font-bold leading-tight">{title}</h1>
        </div>

        <div className="container max-w-lg space-y-8 px-4 py-6">
        <div className="flex flex-col gap-8 text-sm leading-relaxed text-foreground">
          <div className="space-y-6">
            {canViewParticipants && campaignId ? (
              <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-auto min-h-8 whitespace-normal px-1.5 py-2 text-center text-[10px] font-semibold leading-tight sm:text-xs"
                    onClick={() =>
                      navigate(
                        `/org/${campaign.org_id}/campaigns/${campaignId}`,
                        staffNavFromDetail,
                      )
                    }
                  >
                    Edit campaign
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-auto min-h-8 whitespace-normal px-1.5 py-2 text-center text-[10px] font-semibold leading-tight sm:text-xs"
                    onClick={() =>
                      navigate(
                        `/org/${campaign.org_id}/campaigns/${campaignId}/participants`,
                        staffNavFromDetail,
                      )
                    }
                  >
                    View participants
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-auto min-h-8 whitespace-normal px-1.5 py-2 text-center text-[10px] font-semibold leading-tight sm:text-xs"
                    onClick={() => navigate("/scan", staffNavFromDetail)}
                  >
                    Scan vouchers
                  </Button>
                </div>
              </div>
            ) : null}
            <p>{getCampaignIntro(campaign.campaign_type)}</p>

            {showHintsSection ? (
              <div>
                <p className="font-semibold text-foreground">Hints</p>
                <div className="mt-2 flex gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
                  {campaign.hint_image_url ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setHintImageDialogOpen(true)}
                        className="shrink-0 overflow-hidden rounded-lg border border-border ring-offset-background transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        aria-label="View hint photo full size"
                      >
                        <img
                          src={campaign.hint_image_url}
                          alt=""
                          className="h-28 w-28 object-cover"
                        />
                      </button>
                      <Dialog open={hintImageDialogOpen} onOpenChange={setHintImageDialogOpen}>
                        <DialogContent className="box-border max-h-[min(90vh,calc(100dvh-1rem))] w-[min(430px,calc(100vw-1rem))] max-w-[min(430px,calc(100vw-1rem))] overflow-hidden border-0 bg-transparent px-2 pb-2 pt-14 shadow-none sm:max-w-[min(430px,calc(100vw-1rem))] [&>button]:right-[max(0.5rem,env(safe-area-inset-right))] [&>button]:top-[max(0.5rem,env(safe-area-inset-top))] [&>button]:flex [&>button]:size-10 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-full [&>button]:border-0 [&>button]:!bg-orange-500 [&>button]:!text-white [&>button]:p-0 [&>button]:opacity-100 [&>button]:shadow-lg [&>button]:ring-2 [&>button]:ring-white/30 [&>button]:hover:!bg-orange-600 [&>button]:hover:!text-white [&>button]:hover:opacity-100 [&>button]:focus-visible:ring-orange-200 [&>button]:focus-visible:ring-offset-2 [&>button]:focus-visible:ring-offset-black/50 [&>button]:data-[state=open]:!bg-orange-500 [&>button]:data-[state=open]:!text-white [&_svg]:size-[1.125rem] [&_svg]:stroke-[2.5] [&_svg]:!text-white">
                          <DialogTitle className="sr-only">Hint photo</DialogTitle>
                          <img
                            src={campaign.hint_image_url}
                            alt=""
                            className="mx-auto max-h-[min(58vh,calc(100vw-4rem))] w-full max-w-full rounded-lg object-contain"
                          />
                        </DialogContent>
                      </Dialog>
                    </>
                  ) : null}
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    {campaign.hint_text?.trim() ? (
                      <p className="leading-relaxed text-foreground">{campaign.hint_text.trim()}</p>
                    ) : null}
                    {huntQrMapTarget.displayAddress ? (
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {huntQrMapTarget.displayAddress}
                      </p>
                    ) : null}
                    {huntQrMapTarget.mapsUrl ? (
                      <a
                        href={huntQrMapTarget.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Open directions in Google Maps"
                        className="inline-flex w-fit items-center gap-1.5 rounded-full bg-orange-500 px-4 py-2 text-xs font-semibold tracking-wide text-white hover:bg-orange-600"
                      >
                        <Navigation className="size-4 shrink-0" aria-hidden />
                        directions
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            <div>
            <p className="font-semibold text-foreground">Rewards</p>
            <p className="mt-1 text-muted-foreground">
              {getRewardsLeadIn(campaign.reward_mode, campaign.reward_per_action)}
            </p>

            {poolQuery.isError ? (
              <p className="mt-3 text-sm text-destructive">Could not load prize availability.</p>
            ) : null}

            {sortedVouchers.length === 0 ? (
              <p className="mt-3 text-muted-foreground">No voucher details published for this campaign.</p>
            ) : (
              <ul className="mt-3 space-y-4">
                {sortedVouchers.map((cv) => {
                  const name = voucherNameFromOfferAndMenu(cv.offer_type, cv.menu_items?.item_name);
                  const pool = poolByCvId.get(cv.id);
                  const rulesLine = temperatureAndFulfillmentCustomerLine(cv.temperature_rule, cv.fulfillment_rule);
                  const stockCorner = poolQuery.isLoading ? (
                    <span className="text-sm text-muted-foreground">Loading…</span>
                  ) : pool ? (
                    <span className="text-sm text-muted-foreground">
                      {pool.remaining} {pool.remaining === 1 ? "voucher" : "vouchers"} left
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  );

                  return (
                    <li key={cv.id} className="rounded-lg border border-border bg-card p-3 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <p className="min-w-0 flex-1 font-medium leading-snug">{name ?? "Reward"}</p>
                        <div className="shrink-0 text-right">{stockCorner}</div>
                      </div>
                      <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                        {rulesLine ? <li>{rulesLine}</li> : null}
                        <li className="text-foreground">
                          Redemption: valid for {cv.redeem_valid_days} day{cv.redeem_valid_days === 1 ? "" : "s"} after you
                          receive the voucher
                        </li>
                      </ul>
                    </li>
                  );
                })}
              </ul>
            )}
            </div>
          </div>

          <div>
            <p className="font-semibold text-foreground">Campaign period</p>
            <p className="mt-1 text-muted-foreground">{availabilityLine}</p>
          </div>
        </div>

        <div className="text-sm leading-relaxed text-foreground">
          <p className="font-semibold text-foreground">Claim your voucher at:</p>
          <section className="mt-2 rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex gap-3">
              {org?.logo_url ? (
                <div className="shrink-0 rounded-lg border border-border bg-background p-1">
                  <img src={org.logo_url} alt="" className="h-14 w-14 rounded-md object-cover" />
                </div>
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-snug text-foreground">{org?.org_name ?? "Organizer"}</p>
                {org?.location ? (
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{org.location}</p>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">Address not listed.</p>
                )}
              </div>
            </div>
          </section>
        </div>
        </div>
      </div>

      <div className="fixed bottom-[calc(var(--tab-nav-track-height)+env(safe-area-inset-bottom,0px))] left-1/2 z-[45] w-full max-w-[430px] -translate-x-1/2 border-t border-border bg-background/95 px-4 pt-3 backdrop-blur supports-[backdrop-filter]:bg-background/90 pb-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
        {campaign.campaign_type === "grab" ? (
          <Button className="w-full" onClick={() => void onGrab()} disabled={claim.isPending}>
            {claim.isPending ? "Claiming…" : "Grab offer"}
          </Button>
        ) : isHunt && user && myVouchersForCampaign.length > 0 ? (
          <Button className="w-full" type="button" onClick={() => setMyVoucherDialogOpen(true)}>
            My Voucher
          </Button>
        ) : (
          <Button className="w-full" onClick={() => navigate("/hunts/scan")}>
            Scan hunt QR
          </Button>
        )}
      </div>

      <VoucherDetailDialog
        vouchers={myVouchersForCampaign}
        open={myVoucherDialogOpen}
        onOpenChange={setMyVoucherDialogOpen}
      />
    </>
  );
}
