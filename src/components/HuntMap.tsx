import type { Treasure } from '@/hooks/useHunts';
import { MapPin } from 'lucide-react';

interface HuntMapProps {
  treasures: Treasure[];
}

export function HuntMap({ treasures }: HuntMapProps) {
  const hasCoords = treasures.some((t) => t.lat != null && t.lng != null);

  if (treasures.length === 0) {
    return (
      <div className="w-full h-full min-h-[300px] bg-muted/30 flex items-center justify-center">
        <p className="text-muted-foreground">No treasures on this hunt yet.</p>
      </div>
    );
  }

  if (!hasCoords) {
    return (
      <div className="w-full min-h-[200px] p-4 space-y-2 bg-muted/30">
        <p className="text-sm font-semibold">Treasures</p>
        {treasures.map((t) => (
          <div
            key={t.id}
            className="flex items-start gap-2 p-3 bg-background rounded-lg border"
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
    );
  }

  const lats = treasures.map((t) => t.lat).filter((v): v is number => v != null);
  const lngs = treasures.map((t) => t.lng).filter((v): v is number => v != null);
  const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
  const centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;

  return (
    <div className="w-full h-full min-h-[300px] relative bg-muted/30">
      <iframe
        title="Map"
        width="100%"
        height="100%"
        style={{ border: 0, minHeight: 300 }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${centerLng - 0.02}%2C${centerLat - 0.02}%2C${centerLng + 0.02}%2C${centerLat + 0.02}&layer=mapnik&marker=${centerLat}%2C${centerLng}`}
      />
      <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-2">
        {treasures.map((t) =>
          t.lat != null && t.lng != null ? (
            <a
              key={t.id}
              href={`https://www.openstreetmap.org/?mlat=${t.lat}&mlon=${t.lng}#map=17/${t.lat}/${t.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-1 bg-background/90 rounded text-xs font-medium"
            >
              <MapPin className="h-3 w-3" />
              {t.name}
            </a>
          ) : null
        )}
      </div>
    </div>
  );
}
