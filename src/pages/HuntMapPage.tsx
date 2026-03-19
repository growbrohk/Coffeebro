import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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
    <div className="min-h-screen bg-background pb-24 flex flex-col">
      <div className="sticky top-0 z-10 bg-background py-4 px-4 border-b border-border">
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

      <div className="flex-1 min-h-[300px]">
        <HuntMap treasures={treasures} />
      </div>

      <div className="p-4 border-t border-border space-y-2">
        <p className="text-sm font-semibold">{treasures.length} treasures</p>
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {treasures.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <MapPin className="h-3 w-3 shrink-0" />
              <span>{t.name}</span>
              {t.address && <span className="truncate">· {t.address}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
