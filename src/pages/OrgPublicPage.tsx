import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ImageIcon, Navigation, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { usePublishedCampaigns } from "@/hooks/usePublishedCampaigns";
import { useMyClaimedCampaignIds } from "@/hooks/useMyClaimedCampaigns";
import { publishedCampaignToMapItem } from "@/lib/campaignToMapItem";
import { mergePoolRowsIntoCampaignMapItems } from "@/lib/campaignVoucherPoolsMerge";
import { usePublishedCampaignVoucherPools } from "@/hooks/usePublishedCampaignVoucherPools";
import type { CampaignMapItem } from "@/types/campaignMapItem";
import { VoucherCarouselRow } from "@/components/VoucherCarouselCards";
import { weeklyOpeningHoursDisplayRows } from "@/lib/openingHoursCustomerDisplay";
import { orgDirectionsUrl } from "@/lib/orgDirectionsUrl";
import { cn } from "@/lib/utils";
import { OrgPublicCoffeeNotes } from "@/components/OrgPublicCoffeeNotes";

export type PublicOrgProfileRow = {
  id: string;
  org_name: string;
  location: string | null;
  lat: number | null;
  lng: number | null;
  preview_photo_url: string | null;
  logo_url: string | null;
  opening_hours: unknown | null;
  google_maps_url: string | null;
  district: string | null;
  mtr_station: string | null;
  hk_area: string | null;
  description: string | null;
  shop_type: "physical" | "online" | null;
};

export default function OrgPublicPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const orgQuery = useQuery({
    queryKey: ["public-org", orgId],
    enabled: Boolean(orgId),
    queryFn: async (): Promise<PublicOrgProfileRow | null> => {
      if (!orgId) return null;
      const { data, error } = await supabase.rpc("get_public_org_by_id", { p_org_id: orgId });
      if (error) throw error;
      const rows = (data ?? []) as PublicOrgProfileRow[];
      return rows[0] ?? null;
    },
  });

  const { data: campaigns = [], isLoading: campaignsLoading } = usePublishedCampaigns();
  const { data: claimedIds = new Set<string>() } = useMyClaimedCampaignIds();

  const baseOrgCampaignItems: CampaignMapItem[] = useMemo(() => {
    if (!orgId) return [];
    const out: CampaignMapItem[] = [];
    for (const c of campaigns) {
      if (c.org_id !== orgId) continue;
      const m = publishedCampaignToMapItem(c, claimedIds);
      if (m) out.push(m);
    }
    return out;
  }, [campaigns, claimedIds, orgId]);

  const orgCampaignIdsForPools = useMemo(
    () => baseOrgCampaignItems.map((i) => i.campaign_id).filter((id): id is string => Boolean(id)),
    [baseOrgCampaignItems],
  );

  const orgPoolsQuery = usePublishedCampaignVoucherPools(orgCampaignIdsForPools);

  const orgCampaignItems: CampaignMapItem[] = useMemo(
    () =>
      mergePoolRowsIntoCampaignMapItems(
        baseOrgCampaignItems,
        orgPoolsQuery.data,
        orgPoolsQuery.isSuccess,
      ),
    [baseOrgCampaignItems, orgPoolsQuery.data, orgPoolsQuery.isSuccess],
  );

  const isOnlineOrg = orgQuery.data?.shop_type === "online";
  const directionsUrl = orgQuery.data && !isOnlineOrg ? orgDirectionsUrl(orgQuery.data) : null;

  const sharePage = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) {
        await navigator.share({
          title: orgQuery.data?.org_name ?? "Coffeebro",
          url,
        });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied" });
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        toast({ title: "Link copied" });
      } catch {
        toast({ title: "Could not share", variant: "destructive" });
      }
    }
  };

  const openingRows = orgQuery.data && !isOnlineOrg
    ? weeklyOpeningHoursDisplayRows(orgQuery.data.opening_hours)
    : [];

  if (orgQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FFFCF8]">
        <div className="animate-pulse text-lg font-semibold text-foreground">Loading…</div>
      </div>
    );
  }

  if (orgQuery.isError) {
    return (
      <div className="min-h-screen bg-[#FFFCF8] px-4 py-8 pb-40">
        <p className="text-center text-muted-foreground">Could not load this organization.</p>
        <Button className="mx-auto mt-4 block" variant="outline" onClick={() => navigate("/hunts")}>
          Back to map
        </Button>
      </div>
    );
  }

  if (!orgQuery.data) {
    return (
      <div className="min-h-screen bg-[#FFFCF8] px-4 py-8 pb-40">
        <p className="text-center text-muted-foreground">Organization not found.</p>
        <Button className="mx-auto mt-4 block" variant="outline" onClick={() => navigate("/hunts")}>
          Back to map
        </Button>
      </div>
    );
  }

  const org = orgQuery.data;
  const heroUrl = org.preview_photo_url?.trim() || org.logo_url?.trim() || null;

  return (
    <>
      <div className="min-h-screen bg-[#FFFCF8] pb-40">
        <div className="relative aspect-[4/3] w-full max-w-[430px] bg-muted">
          {heroUrl ? (
            <img src={heroUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full min-h-[200px] items-center justify-center bg-muted">
              <ImageIcon className="h-16 w-16 text-muted-foreground/35" strokeWidth={1.25} />
            </div>
          )}
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="absolute left-3 top-[max(0.75rem,env(safe-area-inset-top))] flex h-10 w-10 items-center justify-center rounded-full bg-card/90 text-foreground shadow-md backdrop-blur-sm"
            aria-label="Back"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
        </div>

        <div className="mx-auto max-w-lg space-y-6 px-4 py-6">
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-normal text-[#2e1a14]">{org.org_name}</h1>
            {!isOnlineOrg && org.location?.trim() ? (
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{org.location.trim()}</p>
            ) : null}
            <p className="mt-1 text-sm text-muted-foreground">
              {isOnlineOrg ? "Online shop" : "Coffee shop"}
            </p>
          </div>

          {org.description?.trim() ? (
            <p className="text-sm leading-relaxed text-[#2e1a14]">{org.description.trim()}</p>
          ) : null}

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-bold leading-snug tracking-normal text-[#2e1a14]">Current campaign</h2>
            {campaignsLoading ? (
              <p className="text-sm text-muted-foreground">Loading campaigns…</p>
            ) : orgCampaignItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No published campaigns right now.</p>
            ) : (
              <VoucherCarouselRow
                items={orgCampaignItems}
                onCta={(t) => {
                  if (t.campaign_id) navigate(`/campaigns/${t.campaign_id}`);
                }}
                className="pl-0 pr-0"
              />
            )}
          </section>

          {orgId ? <OrgPublicCoffeeNotes orgId={orgId} /> : null}

          {!isOnlineOrg ? (
            <section>
              <h2 className="text-lg font-bold leading-snug tracking-normal text-[#2e1a14]">Opening Hours</h2>
              <ul className="mt-3 space-y-2">
                {openingRows.map(({ day, line }) => (
                  <li key={day} className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-foreground">{day}</span>
                    <span className={cn("tabular-nums", line === "Closed" && "text-muted-foreground")}>{line}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>

      <div
        className="fixed bottom-[calc(var(--tab-nav-track-height)+env(safe-area-inset-bottom,0px))] left-1/2 z-[45] w-full max-w-[430px] -translate-x-1/2 border-t border-border/80 bg-[#FFFCF8]/95 px-4 pt-3 backdrop-blur supports-[backdrop-filter]:bg-[#FFFCF8]/90 pb-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]"
      >
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-12 flex-1 rounded-full border-[#F27A24] bg-transparent text-[#F27A24] hover:bg-[#F27A24]/10 hover:text-[#F27A24]"
            onClick={() => void sharePage()}
          >
            <Share2 className="mr-2 h-4 w-4" aria-hidden />
            share
          </Button>
          {!isOnlineOrg ? (
            <Button
              type="button"
              className="h-12 flex-1 rounded-full bg-[#F27A24] text-white hover:bg-[#e06d1c]"
              disabled={!directionsUrl}
              onClick={() => {
                if (!directionsUrl) return;
                const win = window.open(directionsUrl, "_blank", "noopener,noreferrer");
                if (!win) window.location.href = directionsUrl;
              }}
            >
              <Navigation className="mr-2 h-4 w-4 shrink-0" aria-hidden />
              directions
            </Button>
          ) : null}
        </div>
      </div>
    </>
  );
}
