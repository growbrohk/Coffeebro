import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { HuntMap } from "@/components/HuntMap";
import { TreasurePopupCard } from "@/components/TreasurePopupCard";
import { HuntMapVoucherCarouselSheet } from "@/components/HuntMapVoucherCarouselSheet";
import { useGeolocation, haversineDistance } from "@/hooks/useGeolocation";
import { useDiscoveryOrgs } from "@/hooks/useDiscoveryOrgs";
import { discoveryOrgToCafeTreasure } from "@/lib/discoveryOrgToMapTreasure";
import { publishedCampaignToMapItem } from "@/lib/campaignToMapItem";
import { mergePoolRowsIntoCampaignMapItems } from "@/lib/campaignVoucherPoolsMerge";
import { usePublishedCampaigns } from "@/hooks/usePublishedCampaigns";
import { usePublishedCampaignVoucherPools } from "@/hooks/usePublishedCampaignVoucherPools";
import { useMyClaimedCampaignIds } from "@/hooks/useMyClaimedCampaigns";
import type { CampaignMapItem } from "@/types/campaignMapItem";
import { Loader2, LocateFixed, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { huntMapVoucherCarouselItems } from "@/lib/huntMapVoucherCarouselItems";

import coffeeShopPin from "@/assets/coffee-shop-pin.svg";
import huntPinGrab from "@/assets/hunt-pin-grab.svg";
import huntPinStar from "@/assets/hunt-pin-star.svg";

type PillarId = "hunt_grab" | "coffee_shop";

export default function HuntMapPage() {
  const { huntId } = useParams<{ huntId: string }>();
  const navigate = useNavigate();

  const [selectedTreasure, setSelectedTreasure] = useState<CampaignMapItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [pillar, setPillar] = useState<PillarId>("hunt_grab");
  const [voucherSheetDismissed, setVoucherSheetDismissed] = useState(false);
  const [userPin, setUserPin] = useState<{ lat: number; lng: number } | null>(null);
  const [locateFlyNonce, setLocateFlyNonce] = useState(0);
  const [refitNonce, setRefitNonce] = useState(0);
  const [locating, setLocating] = useState(false);
  const prevSelectedTreasureRef = useRef<CampaignMapItem | null>(null);
  const { toast } = useToast();

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

  const baseCampaignItems = useMemo(() => {
    const out: CampaignMapItem[] = [];
    for (const c of campaigns) {
      const m = publishedCampaignToMapItem(c, claimedIds);
      if (m) out.push(m);
    }
    return out;
  }, [campaigns, claimedIds]);

  const campaignIdsForPools = useMemo(
    () => baseCampaignItems.map((i) => i.campaign_id).filter((id): id is string => Boolean(id)),
    [baseCampaignItems],
  );

  const poolsQuery = usePublishedCampaignVoucherPools(campaignIdsForPools);

  const campaignItems = useMemo(
    () =>
      mergePoolRowsIntoCampaignMapItems(
        baseCampaignItems,
        poolsQuery.data,
        poolsQuery.isSuccess,
      ),
    [baseCampaignItems, poolsQuery.data, poolsQuery.isSuccess],
  );

  const discoveryItems = useMemo(
    () =>
      discoveryOrgs
        .filter((o) => o.shop_type !== "online" && o.lat != null && o.lng != null)
        .map(discoveryOrgToCafeTreasure),
    [discoveryOrgs],
  );

  const filteredCampaigns = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return campaignItems.filter((t) => {
      if (pillar === "hunt_grab") {
        if (t.pinKind !== "grab" && t.pinKind !== "hunt") return false;
      } else if (t.pinKind !== "coffee_shop") {
        return false;
      }
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
      if (pillar !== "coffee_shop") return false;
      if (!q) return true;
      const hay = [t.name, t.address, t.orgName].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [discoveryItems, searchQuery, pillar]);

  const mapTreasures = useMemo(
    () => [...filteredCampaigns, ...filteredDiscovery],
    [filteredCampaigns, filteredDiscovery],
  );

  const voucherTreasures = useMemo(
    () => huntMapVoucherCarouselItems(campaignItems, searchQuery),
    [campaignItems, searchQuery],
  );

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

  const handleCampaignCta = (t: CampaignMapItem) => {
    if (t.pinKind === "coffee_shop") {
      if (t.org_id) {
        navigate(`/orgs/${t.org_id}`);
        setSelectedTreasure(null);
        return;
      }
      navigate("/explore");
      setSelectedTreasure(null);
      return;
    }
    if (t.campaign_id) {
      navigate(`/campaigns/${t.campaign_id}`);
      setSelectedTreasure(null);
      return;
    }
    navigate("/profile");
  };

  const handleDetailsClick = () => {
    if (!selectedTreasure) return;
    if (selectedTreasure.pinKind === "coffee_shop" && selectedTreasure.org_id) {
      navigate(`/orgs/${selectedTreasure.org_id}`);
      setSelectedTreasure(null);
      return;
    }
    if (selectedTreasure.campaign_id) {
      navigate(`/campaigns/${selectedTreasure.campaign_id}`);
      setSelectedTreasure(null);
      return;
    }
    navigate("/explore");
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

  const applyUserLocation = useCallback((lat: number, lng: number) => {
    setUserPin({ lat, lng });
    setLocateFlyNonce((n) => n + 1);
  }, []);

  const handleMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast({
        title: "Location unavailable",
        description: "Geolocation is not supported.",
        variant: "destructive",
      });
      return;
    }
    if (
      userPosition &&
      Number.isFinite(userPosition.lat) &&
      Number.isFinite(userPosition.lng)
    ) {
      applyUserLocation(userPosition.lat, userPosition.lng);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        applyUserLocation(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
      },
      (err: GeolocationPositionError) => {
        const msg =
          err.code === 1
            ? "Location permission denied."
            : err.code === 2
              ? "Position unavailable."
              : err.code === 3
                ? "Location request timed out."
                : err.message || "Could not get location.";
        toast({
          title: "Could not use your location",
          description: msg,
          variant: "destructive",
        });
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }, [userPosition, applyUserLocation, toast]);

  useEffect(() => {
    const prev = prevSelectedTreasureRef.current;
    if (prev !== null && selectedTreasure === null) {
      setVoucherSheetDismissed(false);
    }
    prevSelectedTreasureRef.current = selectedTreasure;
  }, [selectedTreasure]);

  const voucherCarouselOpen =
    pillar === "hunt_grab" &&
    !voucherSheetDismissed &&
    voucherTreasures.length > 0 &&
    selectedTreasure === null;

  const mapOverlayPadding = useMemo(
    () => ({
      top: 140,
      bottom: voucherCarouselOpen ? 280 : 96,
    }),
    [voucherCarouselOpen],
  );

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
            mapOverlayPadding={mapOverlayPadding}
            userLocation={userPin}
            locateFlyNonce={locateFlyNonce}
            refitNonce={refitNonce}
            onSelectTreasure={(t) => {
              if (t.scanned && t.campaign_id) {
                navigate(`/campaigns/${t.campaign_id}`);
                return;
              }
              setSelectedTreasure(t);
            }}
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
          <div className="flex items-center gap-2 pb-0.5">
            <div className="min-w-0 flex-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex w-max min-w-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRefitNonce((n) => n + 1);
                    setPillar("hunt_grab");
                  }}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors",
                    pillar === "hunt_grab"
                      ? "bg-foreground text-background"
                      : "border border-border bg-card text-foreground",
                  )}
                >
                  <span className="inline-flex items-center gap-1 whitespace-nowrap">
                    <img src={huntPinStar} alt="" className="h-5 w-5 shrink-0 object-contain" />
                    <span>hunt</span>
                    <span className={cn(pillar === "hunt_grab" ? "opacity-80" : "text-muted-foreground")}>&</span>
                    <img src={huntPinGrab} alt="" className="h-5 w-5 shrink-0 object-contain" />
                    <span>grab</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRefitNonce((n) => n + 1);
                    setPillar("coffee_shop");
                  }}
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
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleMyLocation()}
              disabled={locating}
              aria-label="Center on my location"
              className={cn(
                "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/60 bg-card/95 text-foreground shadow-md backdrop-blur-md transition-opacity",
                locating && "cursor-wait opacity-80",
              )}
            >
              {locating ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
              ) : (
                <LocateFixed className="h-5 w-5" strokeWidth={2} aria-hidden />
              )}
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
          onHunt={() => {
            navigate("/hunts/scan");
            setSelectedTreasure(null);
          }}
          distance={distanceToSelected}
        />
      ) : pillar === "hunt_grab" && !voucherSheetDismissed && voucherTreasures.length > 0 ? (
        <HuntMapVoucherCarouselSheet
          items={voucherTreasures}
          onClose={() => setVoucherSheetDismissed(true)}
          onCta={(t) => void handleCampaignCta(t)}
          onCardPress={(t) => void handleCampaignCta(t)}
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
