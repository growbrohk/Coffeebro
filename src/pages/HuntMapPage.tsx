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
import { useUserRole } from '@/hooks/useUserRole';
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
  const { canHostEvent } = useUserRole();
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
    <>
      <div className="shrink-0 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 space-y-2 bg-background">
        <div className="relative flex items-center gap-2 rounded-full border border-border/60 bg-white px-3 py-2.5 shadow-md">
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
                : 'bg-white text-foreground border border-border'
            )}
          >
            all
          </button>
          <button
            type="button"
            onClick={() => setPillar('coffee_shop')}
            className={cn(
              'shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors',
              pillar === 'coffee_shop'
                ? 'bg-[#1a1a1a] text-white'
                : 'bg-white text-foreground border border-border'
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
              'shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors',
              pillar === 'grab'
                ? 'bg-[#1a1a1a] text-white'
                : 'bg-white text-foreground border border-border'
            )}
          >
            <img src={huntPinGrab} alt="" className="h-5 w-5 object-contain" />
            grab
          </button>
          <button
            type="button"
            onClick={() => setPillar('hunt')}
            className={cn(
              'shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors',
              pillar === 'hunt'
                ? 'bg-[#1a1a1a] text-white'
                : 'bg-white text-foreground border border-border'
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

      <div className="relative flex-1 min-h-0 min-h-[200px]">
        {huntId && (
          <button
            type="button"
            onClick={() => navigate('/hunts')}
            className="absolute left-3 top-3 z-[1000] flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-foreground shadow-md"
            aria-label="Back"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}
        {treasuresLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/30">
            <div className="animate-pulse text-muted-foreground text-sm">Loading map…</div>
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
        {selectedTreasure && (
          <TreasurePopupCard
            treasure={selectedTreasure}
            onClose={() => setSelectedTreasure(null)}
            onDirections={openInMaps}
            onDetails={handleDetailsClick}
            distance={distanceToSelected}
          />
        )}
      </div>
    </>
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

    return (
      <div className="flex h-[100dvh] flex-col overflow-hidden bg-background pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
        {mapChrome}
      </div>
    );
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

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-background pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
      {canHostEvent && hunt.created_by === user?.id && (
        <button
          type="button"
          onClick={() => navigate(`/host/hunts/${huntId}`)}
          className="absolute right-3 top-[max(5.5rem,env(safe-area-inset-top)+4rem)] z-[1000] rounded-full border border-border bg-white/95 px-3 py-1.5 text-xs font-semibold shadow-md"
        >
          Manage
        </button>
      )}
      {mapChrome}
    </div>
  );
}

