import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useHunt, useTreasures, useIsParticipant } from '@/hooks/useHunts';
import { HuntMap } from '@/components/HuntMap';
import { MapPin, QrCode } from 'lucide-react';

export default function HuntMapPage() {
  const { huntId } = useParams<{ huntId: string }>();
  const navigate = useNavigate();
  const { data: hunt, isLoading } = useHunt(huntId ?? null);
  const { data: treasures = [] } = useTreasures(huntId ?? null);
  const { data: isParticipant } = useIsParticipant(huntId ?? null);

  if (isLoading || !hunt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-lg font-semibold">Loading...</div>
      </div>
    );
  }

  if (!isParticipant) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="container px-4 py-8 text-center">
          <p className="text-muted-foreground">Join the hunt first to view the map.</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate(`/hunts/${huntId}`)}
          >
            Back to Hunt
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <div className="shrink-0 bg-background py-4 px-4 border-b border-border">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <span className="text-lg font-bold">←</span>
          </button>
          <h1 className="text-xl font-black uppercase tracking-tight">
            {hunt.name}
          </h1>
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

      <div className="flex-1 flex flex-col min-h-0 px-4 pt-4 pb-24">
        <Tabs defaultValue="map" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2 shrink-0">
            <TabsTrigger value="map">Map</TabsTrigger>
            <TabsTrigger value="list">List</TabsTrigger>
          </TabsList>
          <TabsContent value="map" className="flex-1 min-h-0 mt-4 p-0 overflow-hidden flex flex-col">
            <div className="flex-1 min-h-0 relative">
              <div className="absolute inset-0">
                <HuntMap treasures={treasures} />
              </div>
            </div>
          </TabsContent>
          <TabsContent value="list" className="flex-1 min-h-0 mt-4 p-0 overflow-hidden">
            <div className="h-full overflow-y-auto p-4 space-y-2">
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
