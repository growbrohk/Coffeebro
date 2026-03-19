import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useHunt, useTreasures, useIsParticipant, useJoinHunt } from '@/hooks/useHunts';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { HuntMap } from '@/components/HuntMap';
import { MapPin, QrCode, Loader2 } from 'lucide-react';

export default function HuntMapPage() {
  const { huntId } = useParams<{ huntId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canHostEvent } = useUserRole();
  const [activeTab, setActiveTab] = useState<'map' | 'list'>('map');
  const { data: hunt, isLoading } = useHunt(huntId ?? null);
  const { data: treasures = [] } = useTreasures(huntId ?? null);
  const { data: isParticipant } = useIsParticipant(huntId ?? null);
  const joinHunt = useJoinHunt();
  const hasTriedJoin = useRef(false);

  useEffect(() => {
    if (user && huntId && !isParticipant && !hasTriedJoin.current) {
      hasTriedJoin.current = true;
      joinHunt.mutate(huntId);
    }
  }, [user, huntId, isParticipant]);

  if (isLoading || !hunt) {
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
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
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
