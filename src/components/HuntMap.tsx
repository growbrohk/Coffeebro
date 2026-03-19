import { useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import type { Treasure } from '@/hooks/useHunts';
import { MapPin } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const TILE_LAYERS = {
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
} as const;

function createMarkerIcon(scanned = false): L.DivIcon {
  const pinClass = scanned
    ? 'hunt-map-marker-pin hunt-map-marker-pin-scanned'
    : 'hunt-map-marker-pin';
  const markerClass = scanned ? 'hunt-map-marker hunt-map-marker-scanned' : 'hunt-map-marker';
  return L.divIcon({
    className: markerClass,
    html: `<div class="${pinClass}"></div>`,
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
  const markerIcon = useMemo(() => createMarkerIcon(false), []);
  const markerIconScanned = useMemo(() => createMarkerIcon(true), []);

  const hasCoords = treasures.some((t) => t.lat != null && t.lng != null);
  const treasuresWithCoords = treasures.filter((t) => t.lat != null && t.lng != null);

  if (treasures.length === 0) {
    return (
      <div className="w-full h-full min-h-[200px] bg-muted/30 flex items-center justify-center">
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
            className={`flex items-start gap-2 p-3 rounded-lg border ${
              t.scanned
                ? 'bg-muted/20 opacity-75'
                : 'bg-background'
            }`}
          >
            <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
            <div>
              <p className={`font-medium ${t.scanned ? 'text-muted-foreground' : ''}`}>
                {t.scanned && (
                  <span className="mr-2 text-[10px] font-medium uppercase text-muted-foreground">
                    Scanned
                  </span>
                )}
                {t.name}
              </p>
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
    <div className="hunt-map-wrapper w-full h-full min-h-[200px] rounded-lg overflow-hidden">
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={13}
        className="w-full h-full min-h-[200px]"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
          url={tileUrl}
        />
        <FitBounds treasures={treasuresWithCoords} />
        {treasuresWithCoords.map((t) => (
          <Marker
            key={t.id}
            position={[t.lat!, t.lng!]}
            icon={t.scanned ? markerIconScanned : markerIcon}
            zIndexOffset={t.scanned ? -1000 : 0}
            eventHandlers={t.scanned ? { click: () => {} } : undefined}
          >
            {!t.scanned && (
              <>
                <Tooltip
                  permanent
                  direction="right"
                  offset={[8, 0]}
                  className="hunt-map-marker-tooltip"
                >
                  {t.name}
                </Tooltip>
                <Popup>
                  <div className="font-medium">{t.name}</div>
                  {t.address && (
                    <div className="text-sm text-muted-foreground">{t.address}</div>
                  )}
                </Popup>
              </>
            )}
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
