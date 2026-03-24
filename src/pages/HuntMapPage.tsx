import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { useToast } from '@/hooks/use-toast';
import { HuntFilter } from '@/components/HuntFilter';
import { HuntMap } from '@/components/HuntMap';
import { TreasurePopupCard } from '@/components/TreasurePopupCard';
import { useGeolocation, haversineDistance } from '@/hooks/useGeolocation';
import type { Treasure } from '@/hooks/useHunts';
import { MapPin, Camera, Loader2 } from 'lucide-react';

export default function HuntMapPage() {
  const { huntId } = useParams<{ huntId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { canHostEvent } = useUserRole();
  const initialTabFromState = (location.state as { initialTab?: 'map' | 'list' })?.initialTab;
  const [activeTab, setActiveTab] = useState<'map' | 'list'>(
    initialTabFromState ?? 'map'
  );
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [selectedTreasure, setSelectedTreasure] = useState<Treasure | null>(null);

  const isGlobalMode = !huntId;

  const { data: hunts = [], isLoading: huntsLoading, isError: huntsError, refetch: refetchHunts } = useHunts();
  const { data: hunt, isLoading: huntLoading } = useHunt(huntId ?? null);
  const isCreator = !!user && !!hunt && hunt.created_by === user.id;
  const { data: singleTreasures = [] } = useTreasures(
    huntId ?? null,
    !isCreator
  );
  const { data: allTreasures = [], isLoading: allTreasuresLoading, isError: allTreasuresError, refetch: refetchAllTreasures } = useAllTreasures(
    isGlobalMode ? selectedCampaignId : null,
    isGlobalMode && !!user
  );
  const { data: isParticipant } = useIsParticipant(huntId ?? null);
  const { data: claimedIds } = useMyClaimedTreasureIds();
  const joinHunt = useJoinHunt();
  const hasTriedJoin = useRef(false);
  const { toast } = useToast();
  const { position: userPosition } = useGeolocation();

  const rawTreasures = isGlobalMode ? allTreasures : singleTreasures;
  const treasures = rawTreasures.map((t) => ({
    ...t,
    scanned: claimedIds?.has(t.id) ?? false,
  }));
  const treasuresLoading = isGlobalMode ? allTreasuresLoading : false;

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
      state: { fromTab: activeTab },
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

  // Global mode: show map with all treasures and campaign filter
  if (isGlobalMode) {
    if (huntsLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="animate-pulse text-lg font-semibold">Loading...</div>
        </div>
      );
    }

    if (huntsError || allTreasuresError) {
      const handleRetry = () => {
        refetchHunts();
        if (user) refetchAllTreasures();
      };
      return (
        <div className="min-h-screen bg-background pb-24 flex flex-col items-center justify-center gap-4 px-4">
          <p className="text-muted-foreground text-center">Failed to load hunts. Please try again.</p>
          <Button variant="outline" onClick={handleRetry}>
            Retry
          </Button>
        </div>
      );
    }

    if (!user) {
      return (
        <div className="min-h-screen bg-background pb-24">
          <div className="sticky top-0 z-10 bg-background py-4 px-4 border-b border-border">
            <h1 className="text-2xl font-black uppercase tracking-tight text-center">
              Hunt
            </h1>
          </div>
          <div className="container px-4 py-8 text-center">
            <p className="text-muted-foreground">Sign in to browse hunts.</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/profile')}>
              Go to Profile
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="h-screen bg-background flex flex-col overflow-hidden">
        <div className="shrink-0 bg-background py-4 px-4 border-b border-border">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <div />
            <h1 className="text-xl font-black uppercase tracking-tight">
              Hunt
            </h1>
            <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => {
                const targetHuntId = selectedCampaignId ?? hunts[0]?.id;
                if (targetHuntId) {
                  navigate(`/hunts/${targetHuntId}/scan`);
                } else {
                  toast({ title: 'Select a campaign to scan', variant: 'destructive' });
                }
              }}
            >
              <Camera className="h-4 w-4 mr-1" />
              Scan
            </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0 px-4 pt-4 pb-24">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as 'map' | 'list')}
            className="flex-1 flex flex-col min-h-0"
          >
            <TabsList className="grid w-full grid-cols-2 shrink-0">
              <TabsTrigger value="map">Map</TabsTrigger>
              <TabsTrigger value="list">List</TabsTrigger>
            </TabsList>
            <div className="flex-1 min-h-0 mt-4 overflow-hidden flex flex-col relative">
              {activeTab === 'map' ? (
                <div className="flex-1 min-h-0 relative">
                  {treasuresLoading ? (
                    <div className="absolute inset-0 bg-muted/30 flex items-center justify-center">
                      <div className="animate-pulse text-muted-foreground">Loading map...</div>
                    </div>
                  ) : (
                    <div className="absolute inset-0">
                      <HuntMap
                        treasures={treasures}
                        onSelectTreasure={(t) => setSelectedTreasure(t)}
                        emptyMessage={hunts.length === 0 ? 'No active hunts right now. Check back later or create one as a host.' : undefined}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2">
                  <p className="text-sm font-semibold">{treasures.length} treasures</p>
                  {treasures.length === 0 && hunts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
                      <p className="text-muted-foreground">No active hunts right now. Check back later or create one as a host.</p>
                      {canHostEvent && (
                        <Button variant="outline" onClick={() => navigate('/host/offer-campaign/create?mode=hunt')}>
                          Create Hunt
                        </Button>
                      )}
                    </div>
                  ) : (
                  <div className="space-y-2">
                    {treasures.map((t) =>
                      t.scanned ? (
                        <div
                          key={t.id}
                          className="w-full flex items-start gap-2 p-3 bg-muted/20 rounded-lg border border-border text-left opacity-75"
                        >
                          <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-muted-foreground">
                              <span className="mr-2 text-[10px] font-medium uppercase">
                                Scanned
                              </span>
                              {t.name}
                            </p>
                            {t.address && (
                              <p className="text-sm text-muted-foreground">{t.address}</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <button
                          key={t.id}
                          onClick={() => setSelectedTreasure(t)}
                          className="w-full flex items-start gap-2 p-3 bg-muted/30 rounded-lg border border-border text-left hover:bg-muted transition-colors"
                        >
                          <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{t.name}</p>
                            {t.address && (
                              <p className="text-sm text-muted-foreground">{t.address}</p>
                            )}
                          </div>
                        </button>
                      )
                    )}
                  </div>
                  )}
                </div>
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
              <HuntFilter
                hunts={hunts}
                selectedCampaignId={selectedCampaignId}
                onCampaignChange={setSelectedCampaignId}
                className="absolute top-2 right-2 z-[1000] h-8 w-8 rounded-md shadow-md"
              />
            </div>
          </Tabs>
        </div>
      </div>
    );
  }

  // Single-hunt mode: existing behavior
  if (huntLoading || !hunt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-lg font-semibold">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="container px-4 py-8 text-center">
          <p className="text-muted-foreground">Sign in to view this hunt.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/hunts')}>
            Back to Hunts
          </Button>
        </div>
      </div>
    );
  }

  if (!isParticipant && !joinHunt.isPending) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="container px-4 py-8 text-center">
          <p className="text-muted-foreground">Could not join hunt.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/hunts')}>
            Back to Hunts
          </Button>
        </div>
      </div>
    );
  }

  if (!isParticipant && joinHunt.isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <div className="shrink-0 bg-background py-4 px-4 border-b border-border">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="flex">
            <button onClick={() => navigate('/hunts')} className="p-2 -ml-2">
              <span className="text-lg font-bold">←</span>
            </button>
          </div>
          <h1 className="text-xl font-black uppercase tracking-tight truncate text-center min-w-0">
            {hunt.name}
          </h1>
          <div className="flex items-center gap-1 justify-end">
            {canHostEvent && hunt.created_by === user?.id && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/host/hunts/${huntId}`)}
              >
                Manage
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/hunts/${huntId}/scan`)}
            >
              <Camera className="h-4 w-4 mr-1" />
              Scan
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 px-4 pt-4 pb-24">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as 'map' | 'list')}
          className="flex-1 flex flex-col min-h-0"
        >
          <TabsList className="grid w-full grid-cols-2 shrink-0">
            <TabsTrigger value="map">Map</TabsTrigger>
            <TabsTrigger value="list">List</TabsTrigger>
          </TabsList>
          <div className="flex-1 min-h-0 mt-4 overflow-hidden flex flex-col relative">
            {activeTab === 'map' ? (
              <div className="flex-1 min-h-0 relative">
                <div className="absolute inset-0">
                  <HuntMap
                    treasures={treasures}
                    onSelectTreasure={(t) => setSelectedTreasure(t)}
                  />
                </div>
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2">
                <p className="text-sm font-semibold">{treasures.length} treasures</p>
                <div className="space-y-2">
                  {treasures.map((t) =>
                    t.scanned ? (
                      <div
                        key={t.id}
                        className="flex items-start gap-2 p-3 rounded-lg border border-border bg-muted/20 opacity-75"
                      >
                        <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-muted-foreground">
                            <span className="mr-2 text-[10px] font-medium uppercase">
                              Scanned
                            </span>
                            {t.name}
                          </p>
                          {t.address && (
                            <p className="text-sm text-muted-foreground">{t.address}</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTreasure(t)}
                        className="w-full flex items-start gap-2 p-3 rounded-lg border border-border bg-muted/30 text-left hover:bg-muted transition-colors"
                      >
                        <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{t.name}</p>
                          {t.address && (
                            <p className="text-sm text-muted-foreground">{t.address}</p>
                          )}
                        </div>
                      </button>
                    )
                  )}
                </div>
              </div>
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
        </Tabs>
      </div>
    </div>
  );
}
