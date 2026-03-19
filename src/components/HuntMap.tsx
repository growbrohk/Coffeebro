import { useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import type { Treasure } from '@/hooks/useHunts';
import { MapPin } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const TILE_LAYERS = {
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
} as const;

function createMarkerIcon(): L.DivIcon {
  return L.divIcon({
    className: 'hunt-map-marker',
    html: '<div class="hunt-map-marker-pin"></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 20],
  });
}

interface HuntMapProps {
  treasures: Treasure[];
}

function FitBounds({ treasures }: { treasures: Treasure[] }) {
  const map = useMap();
  useEffect(() => {
    const withCoords = treasures.filter((t) => t.lat != null && t.lng != null);
    if (withCoords.length === 0) return;
    if (withCoords.length === 1) {
      map.setView([withCoords[0].lat!, withCoords[0].lng!], 15);
      return;
    }
    const bounds = L.latLngBounds(
      withCoords.map((t) => [t.lat!, t.lng!] as [number, number])
    );
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 16 });
  }, [map, treasures]);
  return null;
}

export function HuntMap({ treasures }: HuntMapProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const tileUrl = isDark ? TILE_LAYERS.dark : TILE_LAYERS.light;
  const markerIcon = useMemo(() => createMarkerIcon(), []);

  const hasCoords = treasures.some((t) => t.lat != null && t.lng != null);
  const treasuresWithCoords = treasures.filter((t) => t.lat != null && t.lng != null);

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

  const centerLat =
    treasuresWithCoords.reduce((a, t) => a + t.lat!, 0) / treasuresWithCoords.length;
  const centerLng =
    treasuresWithCoords.reduce((a, t) => a + t.lng!, 0) / treasuresWithCoords.length;

  return (
    <div className="w-full h-full min-h-[300px] rounded-lg overflow-hidden">
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={13}
        className="w-full h-full min-h-[300px]"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
          url={tileUrl}
        />
        <FitBounds treasures={treasuresWithCoords} />
        {treasuresWithCoords.map((t) => (
          <Marker key={t.id} position={[t.lat!, t.lng!]} icon={markerIcon}>
            <Popup>
              <div className="font-medium">{t.name}</div>
              {t.address && (
                <div className="text-sm text-muted-foreground">{t.address}</div>
              )}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
