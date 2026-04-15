import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
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

  const loading = campaignsLoading || discoveryOrgsLoading;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="container max-w-lg px-4 pb-6 pt-6">
        <h1 className="mb-4 font-heading text-2xl font-bold leading-tight tracking-normal text-foreground">
          Ready to hunt some hidden gem?
        </h1>

        <div className="relative mb-6 flex items-center gap-2 rounded-full border border-border/60 bg-muted/50 px-3 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search where you wanna explore today..."
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            autoComplete="off"
          />
        </div>

        {loading ? (
          <p className="text-center text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-bold leading-snug tracking-normal text-foreground">
                Current campaign
              </h2>
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

            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-bold leading-snug tracking-normal text-foreground">
                Recommended Cafes
              </h2>
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
          </div>
        )}
      </div>
    </div>
  );
}
