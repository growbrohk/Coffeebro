import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useHunt,
  useHunts,
  useTreasures,
  useAllTreasures,
  useIsParticipant,
  useJoinHunt,
} from '@/hooks/useHunts';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';
import { HuntMap } from '@/components/HuntMap';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { MapPin, QrCode, Loader2, Filter } from 'lucide-react';

export default function HuntMapPage() {
  const { huntId } = useParams<{ huntId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canHostEvent } = useUserRole();
  const [activeTab, setActiveTab] = useState<'map' | 'list'>('map');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  const isGlobalMode = !huntId;

  const { data: hunts = [], isLoading: huntsLoading } = useHunts();
  const { data: hunt, isLoading: huntLoading } = useHunt(huntId ?? null);
  const { data: singleTreasures = [] } = useTreasures(huntId ?? null);
  const { data: allTreasures = [], isLoading: allTreasuresLoading } = useAllTreasures(
    isGlobalMode ? selectedCampaignId : null,
    isGlobalMode
  );
  const { data: isParticipant } = useIsParticipant(huntId ?? null);
  const joinHunt = useJoinHunt();
  const hasTriedJoin = useRef(false);
  const { toast } = useToast();

  const treasures = isGlobalMode ? allTreasures : singleTreasures;
  const treasuresLoading = isGlobalMode ? allTreasuresLoading : false;

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
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-xl font-black uppercase tracking-tight truncate flex-1 text-center">
              Hunt
            </h1>
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
              <QrCode className="h-4 w-4 mr-1" />
              Scan
            </Button>
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
            <div className="flex-1 min-h-0 mt-4 overflow-hidden flex flex-col">
              {activeTab === 'map' ? (
                <div className="flex-1 min-h-0 relative">
                  {treasuresLoading ? (
                    <div className="absolute inset-0 bg-muted/30 flex items-center justify-center">
                      <div className="animate-pulse text-muted-foreground">Loading map...</div>
                    </div>
                  ) : (
                    <div className="absolute inset-0">
                      <HuntMap treasures={treasures} />
                    </div>
                  )}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        size="icon"
                        variant="secondary"
                        className="absolute top-2 right-2 h-8 w-8 rounded-md shadow-md"
                      >
                        <Filter className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-2" align="end">
                      <Select
                        value={selectedCampaignId ?? 'all'}
                        onValueChange={(v) => setSelectedCampaignId(v === 'all' ? null : v)}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Campaign" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          {hunts.map((h) => (
                            <SelectItem key={h.id} value={h.id}>
                              {h.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </PopoverContent>
                  </Popover>
                </div>
              ) : (
                <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2">
                  <p className="text-sm font-semibold">{treasures.length} treasures</p>
                  <div className="space-y-2">
                    {treasures.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => navigate(`/hunts/${t.hunt_id}/map`)}
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
                    ))}
                  </div>
                </div>
              )}
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
        <div className="flex items-center justify-between gap-2">
          <button onClick={() => navigate('/hunts')} className="p-2 -ml-2">
            <span className="text-lg font-bold">←</span>
          </button>
          <h1 className="text-xl font-black uppercase tracking-tight truncate flex-1">
            {hunt.name}
          </h1>
          <div className="flex items-center gap-1 shrink-0">
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
              <QrCode className="h-4 w-4 mr-1" />
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
          <div className="flex-1 min-h-0 mt-4 overflow-hidden flex flex-col">
            {activeTab === 'map' ? (
              <div className="flex-1 min-h-0 relative">
                <div className="absolute inset-0">
                  <HuntMap treasures={treasures} />
                </div>
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2">
                <p className="text-sm font-semibold">{treasures.length} treasures</p>
                <div className="space-y-2">
                  {treasures.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-start gap-2 p-3 bg-muted/30 rounded-lg border border-border"
                    >
                      <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{t.name}</p>
                        {t.address && (
                          <p className="text-sm text-muted-foreground">{t.address}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Tabs>
      </div>
    </div>
  );
}
