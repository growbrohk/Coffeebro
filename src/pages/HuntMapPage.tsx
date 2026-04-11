import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { HuntMap } from "@/components/HuntMap";
import { TreasurePopupCard } from "@/components/TreasurePopupCard";
import { HuntMapVoucherCarouselSheet } from "@/components/HuntMapVoucherCarouselSheet";
import { useGeolocation, haversineDistance } from "@/hooks/useGeolocation";
import { useDiscoveryOrgs } from "@/hooks/useDiscoveryOrgs";
import { discoveryOrgToCafeTreasure } from "@/lib/discoveryOrgToMapTreasure";
import { publishedCampaignToMapItem } from "@/lib/campaignToMapItem";
import { usePublishedCampaigns } from "@/hooks/usePublishedCampaigns";
import { useMyClaimedCampaignIds } from "@/hooks/useMyClaimedCampaigns";
import { useClaimCampaign } from "@/hooks/useClaimCampaign";
import { useAuth } from "@/contexts/AuthContext";
import type { CampaignMapItem } from "@/types/campaignMapItem";
import { Search, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

import coffeeShopPin from "@/assets/coffee-shop-pin.svg";
import huntPinGrab from "@/assets/hunt-pin-grab.svg";
import huntPinStar from "@/assets/hunt-pin-star.svg";

type PillarId = "all" | "coffee_shop" | "grab" | "hunt";

export default function HuntMapPage() {
  const { huntId } = useParams<{ huntId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const claim = useClaimCampaign();

  const [selectedTreasure, setSelectedTreasure] = useState<CampaignMapItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [pillar, setPillar] = useState<PillarId>("all");
  const [voucherSheetDismissed, setVoucherSheetDismissed] = useState(false);
  const prevSelectedTreasureRef = useRef<CampaignMapItem | null>(null);

  useEffect(() => {
    if (huntId) {
      navigate("/hunts", { replace: true });
    }
  }, [huntId, navigate]);

  const { data: campaigns = [], isLoading: campaignsLoading, isError: campaignsError, refetch } =
    usePublishedCampaigns();
  const { data: claimedIds = new Set<string>(), isLoading: claimedLoading } = useMyClaimedCampaignIds();
  const { data: discoveryOrgs = [], isLoading: discoveryLoading } = useDiscoveryOrgs();
  const { position: userPosition } = useGeolocation();

  const campaignItems = useMemo(() => {
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

  const filteredCampaigns = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return campaignItems.filter((t) => {
      if (pillar !== "all" && t.pinKind !== pillar) return false;
      if (!q) return true;
      const hay = [t.name, t.address, t.offerTitle, t.orgName, t.campaignTitle]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [campaignItems, searchQuery, pillar]);

  const filteredDiscovery = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return discoveryItems.filter((t) => {
      if (pillar !== "all" && pillar !== "coffee_shop") return false;
      if (!q) return true;
      const hay = [t.name, t.address, t.orgName].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [discoveryItems, searchQuery, pillar]);

  const mapTreasures = useMemo(
    () => [...filteredCampaigns, ...filteredDiscovery],
    [filteredCampaigns, filteredDiscovery],
  );

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

  const loading = campaignsLoading || discoveryLoading || claimedLoading;

  const hasLocation =
    selectedTreasure &&
    selectedTreasure.lat != null &&
    selectedTreasure.lng != null &&
    Number.isFinite(selectedTreasure.lat) &&
    Number.isFinite(selectedTreasure.lng);

  const openInMaps = () => {
    if (!selectedTreasure || !hasLocation) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${selectedTreasure.lat},${selectedTreasure.lng}`;
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isIOS) {
      window.location.href = url;
      return;
    }
    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (!win) window.location.href = url;
  };

  const handleCampaignCta = async (t: CampaignMapItem) => {
    if (t.pinKind === "coffee_shop") {
      navigate("/check");
      setSelectedTreasure(null);
      return;
    }
    if (!user) {
      navigate("/profile");
      return;
    }
    if (t.campaign_type === "grab" && t.campaign_id) {
      try {
        await claim.mutateAsync(t.campaign_id);
        toast({ title: "Claimed!", description: "Check your wallet." });
      } catch (e) {
        toast({
          title: "Could not claim",
          description: e instanceof Error ? e.message : "Try again later",
          variant: "destructive",
        });
      }
      setSelectedTreasure(null);
      return;
    }
    if (t.campaign_id) {
      navigate(`/campaigns/${t.campaign_id}`);
      setSelectedTreasure(null);
    }
  };

  const handleDetailsClick = () => {
    if (!selectedTreasure) return;
    if (selectedTreasure.campaign_id) {
      navigate(`/campaigns/${selectedTreasure.campaign_id}`);
      setSelectedTreasure(null);
      return;
    }
    navigate("/check");
    setSelectedTreasure(null);
  };

  const distanceToSelected =
    selectedTreasure &&
    userPosition &&
    selectedTreasure.lat != null &&
    selectedTreasure.lng != null &&
    Number.isFinite(selectedTreasure.lat) &&
    Number.isFinite(selectedTreasure.lng)
      ? haversineDistance(userPosition.lat, userPosition.lng, selectedTreasure.lat, selectedTreasure.lng)
      : null;

  useEffect(() => {
    const prev = prevSelectedTreasureRef.current;
    if (prev !== null && selectedTreasure === null) {
      setVoucherSheetDismissed(false);
    }
    prevSelectedTreasureRef.current = selectedTreasure;
  }, [selectedTreasure]);

  const mapChrome = (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-background">
      <div className="absolute inset-0 z-0 min-h-0">
        {loading ? (
          <div className="flex h-full w-full items-center justify-center bg-muted/30">
            <div className="animate-pulse text-sm text-muted-foreground">Loading map…</div>
          </div>
        ) : (
          <HuntMap
            treasures={mapTreasures}
            onSelectTreasure={(t) => setSelectedTreasure(t)}
            emptyMessage={
              mapTreasures.length === 0 && (campaignItems.length > 0 || discoveryItems.length > 0)
                ? "Nothing matches your search or filter."
                : mapTreasures.length === 0
                  ? "No published campaigns nearby yet."
                  : undefined
            }
          />
        )}
      </div>

      <div
        className="pointer-events-none absolute left-0 right-0 top-0 z-[1000] px-3 pb-2"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <div className="pointer-events-auto space-y-2">
          <div className="relative flex items-center gap-2 rounded-full border border-border/60 bg-card/95 px-3 py-2.5 shadow-md backdrop-blur-md">
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
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => setPillar("all")}
              className={cn(
                "shrink-0 rounded-full px-3 py-2 text-sm font-medium transition-colors",
                pillar === "all" ? "bg-foreground text-background" : "border border-border bg-card text-foreground",
              )}
            >
              all
            </button>
            <button
              type="button"
              onClick={() => setPillar("coffee_shop")}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors",
                pillar === "coffee_shop"
                  ? "bg-foreground text-background"
                  : "border border-border bg-card text-foreground",
              )}
            >
              <img
                src={coffeeShopPin}
                alt=""
                className={cn("h-5 w-5 object-contain", pillar === "coffee_shop" && "brightness-0 invert")}
              />
              coffee shops
            </button>
            <button
              type="button"
              onClick={() => setPillar("grab")}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors",
                pillar === "grab"
                  ? "bg-foreground text-background"
                  : "border border-border bg-card text-foreground",
              )}
            >
              <img src={huntPinGrab} alt="" className="h-5 w-5 object-contain" />
              grab
            </button>
            <button
              type="button"
              onClick={() => setPillar("hunt")}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors",
                pillar === "hunt"
                  ? "bg-foreground text-background"
                  : "border border-border bg-card text-foreground",
              )}
            >
              <img src={huntPinStar} alt="" className="h-5 w-5 object-contain" />
              hunt
            </button>
          </div>
        </div>
      </div>

      {selectedTreasure ? (
        <TreasurePopupCard
          treasure={selectedTreasure}
          onClose={() => setSelectedTreasure(null)}
          onDirections={openInMaps}
          onDetails={handleDetailsClick}
          distance={distanceToSelected}
        />
      ) : !voucherSheetDismissed && voucherTreasures.length > 0 ? (
        <HuntMapVoucherCarouselSheet
          items={voucherTreasures}
          onClose={() => setVoucherSheetDismissed(true)}
          onCta={(t) => void handleCampaignCta(t)}
          onCardPress={(t) => setSelectedTreasure(t)}
        />
      ) : null}
    </div>
  );

  if (campaignsError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 pb-24">
        <p className="text-center text-muted-foreground">Failed to load campaigns.</p>
        <Button variant="outline" onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return mapChrome;
}
