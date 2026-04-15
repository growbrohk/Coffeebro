import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useDiscoveryOrgs } from "@/hooks/useDiscoveryOrgs";
import { discoveryOrgToCafeTreasure } from "@/lib/discoveryOrgToMapTreasure";
import { publishedCampaignToMapItem } from "@/lib/campaignToMapItem";
import { usePublishedCampaigns } from "@/hooks/usePublishedCampaigns";
import { useMyClaimedCampaignIds } from "@/hooks/useMyClaimedCampaigns";
import type { CampaignMapItem } from "@/types/campaignMapItem";
import { VoucherCarouselRow } from "@/components/VoucherCarouselCards";
import { huntMapVoucherCarouselItems } from "@/lib/huntMapVoucherCarouselItems";

export default function ExplorePage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: campaigns = [], isLoading: campaignsLoading } = usePublishedCampaigns();
  const { data: claimedIds = new Set<string>() } = useMyClaimedCampaignIds();
  const { data: discoveryOrgs = [], isPending: discoveryOrgsLoading } = useDiscoveryOrgs();

  const campaignItems: CampaignMapItem[] = useMemo(() => {
    const out: CampaignMapItem[] = [];
    for (const c of campaigns) {
      const m = publishedCampaignToMapItem(c, claimedIds);
      if (m) out.push(m);
    }
    return out;
  }, [campaigns, claimedIds]);

  const discoveryItems = useMemo(
    () => discoveryOrgs.map(discoveryOrgToCafeTreasure),
    [discoveryOrgs],
  );

  const huntGrabCarouselItems = useMemo(
    () => huntMapVoucherCarouselItems(campaignItems, searchQuery),
    [campaignItems, searchQuery],
  );

  const filteredDiscovery = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return discoveryItems.filter((t) => {
      if (!q) return true;
      const hay = [t.name, t.address, t.orgName].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [discoveryItems, searchQuery]);

  const voucherTreasures = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const matches = (t: CampaignMapItem) => {
      if (!q) return true;
      const hay = [t.name, t.address, t.offerTitle, t.orgName, t.campaignTitle]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    };
    return campaignItems.filter((t) => !t.scanned && matches(t));
  }, [campaignItems, searchQuery]);

  const loading = authLoading || campaignsLoading || discoveryOrgsLoading;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 border-b border-border bg-background px-4 py-4">
        <h1 className="font-heading text-center text-2xl font-bold tracking-normal">Explore</h1>
      </div>

      <div className="container max-w-lg space-y-6 px-4 py-6">
        <div className="relative flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search cafés and campaigns…"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            autoComplete="off"
          />
        </div>

        {loading ? (
          <p className="text-center text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <section className="space-y-3">
              <h2 className="text-lg font-semibold tracking-normal text-muted-foreground">Campaigns</h2>
              {huntGrabCarouselItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">No matching campaigns.</p>
              ) : (
                <VoucherCarouselRow
                  items={huntGrabCarouselItems}
                  onCta={(t) => {
                    if (t.campaign_id) navigate(`/campaigns/${t.campaign_id}`);
                  }}
                  showRedemptionPeriod
                  className="pl-0 pr-0"
                />
              )}
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold tracking-normal text-muted-foreground">Cafés</h2>
              {filteredDiscovery.length === 0 ? (
                <p className="text-sm text-muted-foreground">No matching cafés.</p>
              ) : (
                <VoucherCarouselRow
                  items={filteredDiscovery}
                  variant="cafe"
                  onCta={() => navigate("/hunts")}
                  showRedemptionPeriod={false}
                  className="pl-0 pr-0"
                />
              )}
            </section>

            {user && voucherTreasures.length > 0 ? (
              <section className="space-y-3">
                <h2 className="text-lg font-semibold tracking-normal text-muted-foreground">For you</h2>
                <VoucherCarouselRow
                  items={voucherTreasures}
                  onCta={(t) => {
                    if (t.campaign_id) navigate(`/campaigns/${t.campaign_id}`);
                  }}
                  showRedemptionPeriod
                  className="pl-0 pr-0"
                />
              </section>
            ) : null}

            <p className="text-center text-sm text-muted-foreground">
              <Link to="/hunts" className="underline">
                Open map
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
