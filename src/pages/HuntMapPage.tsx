import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  useHunt,
  useHunts,
  useTreasures,
  useAllTreasures,
  useIsParticipant,
  useJoinHunt,
  useMyClaimedTreasureIds,
} from '@/hooks/useHunts';
import { useAuth } from '@/contexts/AuthContext';
import { HuntFilter } from '@/components/HuntFilter';
import { HuntMap } from '@/components/HuntMap';
import { TreasurePopupCard } from '@/components/TreasurePopupCard';
import { useGeolocation, haversineDistance } from '@/hooks/useGeolocation';
import {
  primaryOfferByTreasureId,
  useTreasuresPrimaryOffers,
} from '@/hooks/useTreasuresPrimaryOffers';
import { pinKindForTreasure } from '@/lib/huntMapPinKind';
import type { HuntMapTreasure } from '@/types/huntMapTreasure';
import { Loader2, Search, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

import coffeeShopPin from '@/assets/coffee-shop-pin.svg';
import huntPinGrab from '@/assets/hunt-pin-grab.svg';
import huntPinStar from '@/assets/hunt-pin-star.svg';

type PillarId = 'all' | 'coffee_shop' | 'grab' | 'hunt';

export default function HuntMapPage() {
  const { huntId } = useParams<{ huntId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [selectedTreasure, setSelectedTreasure] = useState<HuntMapTreasure | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [pillar, setPillar] = useState<PillarId>('all');

  const isGlobalMode = !huntId;

  const { data: hunts = [], isLoading: huntsLoading, isError: huntsError, refetch: refetchHunts } =
    useHunts();
  const { data: hunt, isLoading: huntLoading } = useHunt(huntId ?? null);
  const isCreator = !!user && !!hunt && hunt.created_by === user.id;
  const {
    data: singleTreasures = [],
    isLoading: singleTreasuresLoading,
  } = useTreasures(huntId ?? null, !isCreator);
  const {
    data: allTreasures = [],
    isLoading: allTreasuresLoading,
    isError: allTreasuresError,
    refetch: refetchAllTreasures,
  } = useAllTreasures(isGlobalMode ? selectedCampaignId : null, isGlobalMode && !!user);
  const { data: isParticipant } = useIsParticipant(huntId ?? null);
  const { data: claimedIds } = useMyClaimedTreasureIds();
  const joinHunt = useJoinHunt();
  const hasTriedJoin = useRef(false);
  const { position: userPosition } = useGeolocation();

  const rawTreasures = isGlobalMode ? allTreasures : singleTreasures;
  const treasureIds = useMemo(() => rawTreasures.map((t) => t.id), [rawTreasures]);
  const { data: offerRows = [] } = useTreasuresPrimaryOffers(treasureIds);
  const offerByTreasure = useMemo(() => primaryOfferByTreasureId(offerRows), [offerRows]);

  const enrichedTreasures: HuntMapTreasure[] = useMemo(() => {
    return rawTreasures.map((t) => {
      const po = offerByTreasure.get(t.id);
      return {
        ...t,
        scanned: claimedIds?.has(t.id) ?? false,
        pinKind: pinKindForTreasure(po?.offer_type ?? null),
        offerTitle: po?.name ?? null,
        offerDescription: po?.description ?? null,
        offerType: po?.offer_type ?? null,
      };
    });
  }, [rawTreasures, offerByTreasure, claimedIds]);

  const filteredTreasures = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return enrichedTreasures.filter((t) => {
      if (pillar !== 'all' && t.pinKind !== pillar) return false;
      if (!q) return true;
      const hay = [t.name, t.address, t.offerTitle].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [enrichedTreasures, searchQuery, pillar]);

  const treasuresLoading = isGlobalMode ? allTreasuresLoading : singleTreasuresLoading;

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
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (!win) window.location.href = url;
  };

  const handleDetailsClick = () => {
    if (!selectedTreasure) return;
    const targetHuntId = selectedTreasure.hunt_id;
    navigate(`/hunts/${targetHuntId}/treasures/${selectedTreasure.id}`, {
      state: { fromTab: 'map' as const },
    });
    setSelectedTreasure(null);
  };

  const distanceToSelected =
    selectedTreasure &&
    userPosition &&
    selectedTreasure.lat != null &&
    selectedTreasure.lng != null &&
    Number.isFinite(selectedTreasure.lat) &&
    Number.isFinite(selectedTreasure.lng)
      ? haversineDistance(
          userPosition.lat,
          userPosition.lng,
          selectedTreasure.lat,
          selectedTreasure.lng
        )
      : null;

  useEffect(() => {
    if (user && huntId && !isParticipant && !hasTriedJoin.current) {
      hasTriedJoin.current = true;
      joinHunt.mutate(huntId);
    }
  }, [user, huntId, isParticipant, joinHunt]);

  const mapChrome = (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-background">
      <div className="absolute inset-0 z-0 min-h-0">
        {treasuresLoading ? (
          <div className="flex h-full w-full items-center justify-center bg-muted/30">
            <div className="animate-pulse text-sm text-muted-foreground">Loading map…</div>
          </div>
        ) : (
          <HuntMap
            treasures={filteredTreasures}
            onSelectTreasure={(t) => setSelectedTreasure(t)}
            emptyMessage={
              isGlobalMode && hunts.length === 0
                ? 'No active hunts right now. Check back later or create one as a host.'
                : filteredTreasures.length === 0 && enrichedTreasures.length > 0
                  ? 'Nothing matches your search or filter.'
                  : undefined
            }
          />
        )}
      </div>

      <div
        className="pointer-events-none absolute left-0 right-0 top-0 z-[1000] px-3 pb-2"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <div className="pointer-events-auto space-y-2">
          {huntId ? (
            <button
              type="button"
              onClick={() => navigate('/hunts')}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-card/95 text-foreground shadow-md backdrop-blur-sm"
              aria-label="Back"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          ) : null}
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
              onClick={() => setPillar('all')}
              className={cn(
                'shrink-0 rounded-full px-3 py-2 text-sm font-medium transition-colors',
                pillar === 'all'
                  ? 'bg-foreground text-background'
                  : 'border border-border bg-card text-foreground'
              )}
            >
              all
            </button>
            <button
              type="button"
              onClick={() => setPillar('coffee_shop')}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors',
                pillar === 'coffee_shop'
                  ? 'bg-foreground text-background'
                  : 'border border-border bg-card text-foreground'
              )}
            >
              <img
                src={coffeeShopPin}
                alt=""
                className={cn('h-5 w-5 object-contain', pillar === 'coffee_shop' && 'brightness-0 invert')}
              />
              coffee shops
            </button>
            <button
              type="button"
              onClick={() => setPillar('grab')}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors',
                pillar === 'grab'
                  ? 'bg-foreground text-background'
                  : 'border border-border bg-card text-foreground'
              )}
            >
              <img src={huntPinGrab} alt="" className="h-5 w-5 object-contain" />
              grab
            </button>
            <button
              type="button"
              onClick={() => setPillar('hunt')}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors',
                pillar === 'hunt'
                  ? 'bg-foreground text-background'
                  : 'border border-border bg-card text-foreground'
              )}
            >
              <img src={huntPinStar} alt="" className="h-5 w-5 object-contain" />
              hunt
            </button>
            {isGlobalMode && (
              <HuntFilter
                hunts={hunts}
                selectedCampaignId={selectedCampaignId}
                onCampaignChange={setSelectedCampaignId}
                className="ml-1"
              />
            )}
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
      ) : null}
    </div>
  );

  if (isGlobalMode) {
    if (huntsLoading) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background pb-24">
          <div className="animate-pulse text-lg font-semibold">Loading…</div>
        </div>
      );
    }

    if (huntsError || allTreasuresError) {
      const handleRetry = () => {
        refetchHunts();
        if (user) refetchAllTreasures();
      };
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 pb-24">
          <p className="text-center text-muted-foreground">Failed to load hunts. Please try again.</p>
          <Button variant="outline" onClick={handleRetry}>
            Retry
          </Button>
        </div>
      );
    }

    if (!user) {
      return (
        <div className="flex min-h-screen flex-col bg-background pb-24">
          <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 text-center">
            <p className="text-muted-foreground">Sign in to browse hunts.</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/profile')}>
              Go to Profile
            </Button>
          </div>
        </div>
      );
    }

    return mapChrome;
  }

  if (huntLoading || !hunt) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background pb-24">
        <div className="animate-pulse text-lg font-semibold">Loading…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col bg-background pb-24">
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 text-center">
          <p className="text-muted-foreground">Sign in to view this hunt.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/hunts')}>
            Back
          </Button>
        </div>
      </div>
    );
  }

  if (!isParticipant && !joinHunt.isPending) {
    return (
      <div className="flex min-h-screen flex-col bg-background pb-24">
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 text-center">
          <p className="text-muted-foreground">Could not join hunt.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/hunts')}>
            Back
          </Button>
        </div>
      </div>
    );
  }

  if (!isParticipant && joinHunt.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background pb-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return mapChrome;
}

