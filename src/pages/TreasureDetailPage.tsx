import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, MapPin, Navigation } from 'lucide-react';
import { useTreasure } from '@/hooks/useHunts';

export default function TreasureDetailPage() {
  const { huntId, treasureId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const fromTab = (location.state as { fromTab?: 'map' | 'list' })?.fromTab ?? 'map';

  const { data: treasure, isLoading } = useTreasure(treasureId ?? '', huntId ?? undefined);

  const hasLocation =
    treasure &&
    treasure.lat != null &&
    treasure.lng != null &&
    Number.isFinite(treasure.lat) &&
    Number.isFinite(treasure.lng);

  const openInMaps = () => {
    if (!treasure || !hasLocation) return;

    const url = `https://www.google.com/maps/search/?api=1&query=${treasure.lat},${treasure.lng}`;

    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isIOS) {
      window.location.href = url;
      return;
    }

    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (!win) {
      window.location.href = url;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!treasure) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Treasure not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header with Back Button */}
      <div className="sticky top-0 z-10 bg-white border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() =>
              navigate(`/hunts/${huntId}/map`, {
                state: { initialTab: fromTab },
              })
            }
            className="p-2 -ml-2 text-foreground/70 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="px-4">
        {/* Clue image */}
        <div className="aspect-video rounded-2xl overflow-hidden mb-6 bg-muted animate-fade-in mt-4">
          {(treasure as { clue_image?: string | null }).clue_image ? (
            <img
              src={(treasure as { clue_image?: string | null }).clue_image!}
              alt={`Clue for ${treasure.name}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <MapPin className="w-12 h-12 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Treasure info */}
        <div className="animate-fade-in" style={{ animationDelay: '100ms' }}>
          <h2 className="text-2xl font-bold mb-2">{treasure.name}</h2>

          {treasure.address && (
            <p className="text-sm text-muted-foreground mb-4">{treasure.address}</p>
          )}

          {treasure.description && (
            <p className="text-sm text-foreground mb-6">{treasure.description}</p>
          )}

          {hasLocation ? (
            <button
              onClick={openInMaps}
              className="w-full flex items-center justify-center gap-2 py-4 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-colors"
            >
              <Navigation className="w-5 h-5" />
              Open in Google Maps
            </button>
          ) : (
            <div className="w-full flex items-center justify-center gap-2 py-4 bg-muted text-muted-foreground rounded-full font-medium">
              <MapPin className="w-5 h-5" />
              Location unavailable
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
