import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { useClaimCampaign, describeClaimCampaignError } from "@/hooks/useClaimCampaign";
import { useToast } from "@/hooks/use-toast";
import type { PublishedCampaignRow } from "@/lib/campaignToMapItem";
import { fulfillmentRuleDisplay, temperatureRuleDisplay } from "@/lib/campaignVoucherRulesDisplay";
import { formatCampaignInstant } from "@/lib/formatCampaignInstant";
import { voucherNameFromOfferAndMenu } from "@/lib/voucherOfferLabels";
import type { Tables } from "@/integrations/supabase/types";

type PoolRow = {
  campaign_voucher_id: string;
  quantity: number;
  minted_count: number;
  remaining: number;
};

function campaignTypeLabel(t: string): string {
  if (t === "grab") return "Grab";
  if (t === "hunt") return "Hunt";
  return t;
}

function rewardModeLabel(m: string): string {
  if (m === "fixed") return "Fixed reward";
  if (m === "random") return "Random pool";
  return m;
}

function normalizeOrg(row: PublishedCampaignRow) {
  const raw = row.orgs as PublishedCampaignRow["orgs"] | PublishedCampaignRow["orgs"][] | null | undefined;
  return Array.isArray(raw) ? raw[0] ?? null : raw ?? null;
}

function sortCampaignVouchers(
  list: PublishedCampaignRow["campaign_vouchers"],
): Array<Tables<"campaign_vouchers"> & { menu_items: Tables<"menu_items"> | null }> {
  const arr = Array.isArray(list) ? list : list ? [list] : [];
  return [...arr].sort(
    (a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at),
  );
}

export default function CampaignDetailPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const claim = useClaimCampaign();

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
          orgs ( id, org_name, logo_url, preview_photo_url, lat, lng, location ),
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

  const totalRemaining = useMemo(() => {
    let s = 0;
    for (const row of poolQuery.data ?? []) {
      s += row.remaining;
    }
    return s;
  }, [poolQuery.data]);

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

  const org = normalizeOrg(campaign);
  const title = campaign.display_title?.trim() || "Campaign";
  const sortedVouchers = sortCampaignVouchers(campaign.campaign_vouchers);
  const startLabel = formatCampaignInstant(campaign.start_at);
  const endLabel = formatCampaignInstant(campaign.end_at);
  const isHunt = campaign.campaign_type === "hunt";
  const isRandom = campaign.reward_mode === "random";

  return (
    <>
      <div className="min-h-screen bg-background pb-40">
        <div className="sticky top-0 z-10 flex items-center border-b border-border bg-background px-4 py-4">
          <button type="button" onClick={() => navigate(-1)} className="mr-2 p-2" aria-label="Back">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-bold leading-tight">{title}</h1>
        </div>

        <div className="container max-w-lg space-y-6 px-4 py-6">
        <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h2 className="text-base font-semibold">Campaign info</h2>
          <p className="mt-1 text-sm text-muted-foreground">{title}</p>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex flex-wrap gap-x-2 gap-y-1">
              <dt className="text-muted-foreground">Type</dt>
              <dd className="font-medium">{campaignTypeLabel(campaign.campaign_type)}</dd>
            </div>
            <div className="flex flex-wrap gap-x-2 gap-y-1">
              <dt className="text-muted-foreground">Reward</dt>
              <dd className="font-medium">{rewardModeLabel(campaign.reward_mode)}</dd>
            </div>
            {isRandom ? (
              <div className="flex flex-wrap gap-x-2 gap-y-1">
                <dt className="text-muted-foreground">Prizes per claim</dt>
                <dd className="font-medium">Up to {campaign.reward_per_action}</dd>
              </div>
            ) : null}
            <Separator className="my-3" />
            <div>
              <dt className="text-muted-foreground">Starts</dt>
              <dd className="font-medium">{startLabel ?? "Not set"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Ends</dt>
              <dd className="font-medium">{endLabel ?? "Not set"}</dd>
            </div>
            {!startLabel && !endLabel ? (
              <p className="text-xs text-muted-foreground">
                Any start or end time the host sets will apply when you claim.
              </p>
            ) : null}
          </dl>

          {isHunt && (campaign.hint_text || campaign.hint_image_url) ? (
            <>
              <Separator className="my-4" />
              <h3 className="text-sm font-semibold">Hunt clues</h3>
              {campaign.hint_text ? <p className="mt-2 text-sm leading-relaxed">{campaign.hint_text}</p> : null}
              {campaign.hint_image_url ? (
                <img
                  src={campaign.hint_image_url}
                  alt="Hunt hint"
                  className="mt-3 w-full max-h-64 rounded-lg border border-border object-cover"
                />
              ) : null}
            </>
          ) : null}
        </section>

        <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h2 className="text-base font-semibold">Voucher info</h2>
          {isRandom ? (
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Each successful claim awards up to {campaign.reward_per_action} random prize
              {campaign.reward_per_action === 1 ? "" : "s"} from the pool below (while stock lasts).
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              One voucher per participant for this campaign.
            </p>
          )}

          {poolQuery.isError ? (
            <p className="mt-3 text-sm text-destructive">Could not load prize availability.</p>
          ) : null}

          {!poolQuery.isError && poolQuery.isFetched && sortedVouchers.length > 0 ? (
            <p className="mt-3 text-sm font-medium">
              Total prizes left:{" "}
              {poolQuery.isLoading ? (
                <span className="text-muted-foreground">…</span>
              ) : (
                <span>{totalRemaining}</span>
              )}
            </p>
          ) : null}

          <ul className="mt-4 space-y-4">
            {sortedVouchers.map((cv) => {
              const name = voucherNameFromOfferAndMenu(cv.offer_type, cv.menu_items?.item_name);
              const pool = poolByCvId.get(cv.id);
              return (
                <li key={cv.id} className="rounded-lg border border-border bg-background/60 p-3">
                  <p className="font-medium leading-snug">{name ?? "Reward"}</p>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    <li>{temperatureRuleDisplay(cv.temperature_rule)}</li>
                    <li>{fulfillmentRuleDisplay(cv.fulfillment_rule)}</li>
                    <li className="text-foreground">
                      Redemption: valid for {cv.redeem_valid_days} day{cv.redeem_valid_days === 1 ? "" : "s"} after you
                      receive the voucher
                    </li>
                    <li className="text-foreground">
                      Remaining:{" "}
                      {poolQuery.isLoading ? (
                        <span className="text-muted-foreground">Loading…</span>
                      ) : pool ? (
                        <>
                          {pool.remaining} of {pool.quantity}
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </li>
                  </ul>
                </li>
              );
            })}
          </ul>

          {sortedVouchers.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No voucher details published for this campaign.</p>
          ) : null}
        </section>

        <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h2 className="text-base font-semibold">Org info</h2>
          {org?.logo_url ? (
            <img
              src={org.logo_url}
              alt=""
              className="mt-3 h-14 w-14 rounded-md border border-border object-cover"
            />
          ) : null}
          <p className="mt-3 text-sm font-medium">{org?.org_name ?? "Organizer"}</p>
          {org?.location ? (
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{org.location}</p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Address not listed.</p>
          )}
        </section>
        </div>
      </div>

      <div className="fixed bottom-[calc(var(--tab-nav-track-height)+env(safe-area-inset-bottom,0px))] left-1/2 z-[45] w-full max-w-[430px] -translate-x-1/2 border-t border-border bg-background/95 px-4 pt-3 backdrop-blur supports-[backdrop-filter]:bg-background/90 pb-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
        {campaign.campaign_type === "grab" ? (
          <Button className="w-full" onClick={() => void onGrab()} disabled={claim.isPending}>
            {claim.isPending ? "Claiming…" : "Grab offer"}
          </Button>
        ) : (
          <Button className="w-full" onClick={() => navigate("/hunts/scan")}>
            Scan hunt QR
          </Button>
        )}
      </div>
    </>
  );
}
