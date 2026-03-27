import { useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import type { HuntMapTreasure } from '@/types/huntMapTreasure';
import type { HuntMapPinKind } from '@/lib/huntMapPinKind';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import huntPinStar from '@/assets/hunt-pin-star.svg';
import huntPinGrab from '@/assets/hunt-pin-grab.svg';
import coffeeShopPin from '@/assets/coffee-shop-pin.svg';

const TILE_LAYERS = {
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
} as const;

/** Pin glyph size on the map (Leaflet icon box matches this exactly). */
const PIN_SIZE = 32;
const CUP_W = 36;
const CUP_H = 20;

function createSvgIcon(
  src: string,
  iconWidth: number,
  iconHeight: number,
  scanned: boolean
): L.DivIcon {
  const opacity = scanned ? 0.35 : 1;
  const w = iconWidth;
  const h = iconHeight;
  return L.divIcon({
    className: 'hunt-map-svg-marker',
    html: `<div class="hunt-map-svg-marker-inner" style="opacity:${opacity};width:${w}px;height:${h}px;box-sizing:border-box;overflow:hidden;display:flex;align-items:flex-end;justify-content:center">
      <img src="${src}" alt="" width="${w}" height="${h}" draggable="false" style="display:block;width:${w}px;height:${h}px;max-width:${w}px;max-height:${h}px;object-fit:contain;pointer-events:auto" />
    </div>`,
    iconSize: [w, h],
    iconAnchor: [w / 2, h],
  });
}

const iconCache = {
  coffee: { active: null as L.DivIcon | null, scanned: null as L.DivIcon | null },
  grab: { active: null as L.DivIcon | null, scanned: null as L.DivIcon | null },
  hunt: { active: null as L.DivIcon | null, scanned: null as L.DivIcon | null },
};

function iconForPinKind(kind: HuntMapPinKind, scanned: boolean): L.DivIcon {
  if (kind === 'coffee_shop') {
    if (scanned) {
      iconCache.coffee.scanned ??= createSvgIcon(coffeeShopPin, CUP_W, CUP_H, true);
      return iconCache.coffee.scanned;
    }
    iconCache.coffee.active ??= createSvgIcon(coffeeShopPin, CUP_W, CUP_H, false);
    return iconCache.coffee.active;
  }
  if (kind === 'grab') {
    if (scanned) {
      iconCache.grab.scanned ??= createSvgIcon(huntPinGrab, PIN_SIZE, PIN_SIZE, true);
      return iconCache.grab.scanned;
    }
    iconCache.grab.active ??= createSvgIcon(huntPinGrab, PIN_SIZE, PIN_SIZE, false);
    return iconCache.grab.active;
  }
  if (scanned) {
    iconCache.hunt.scanned ??= createSvgIcon(huntPinStar, PIN_SIZE, PIN_SIZE, true);
    return iconCache.hunt.scanned;
  }
  iconCache.hunt.active ??= createSvgIcon(huntPinStar, PIN_SIZE, PIN_SIZE, false);
  return iconCache.hunt.active;
}

interface HuntMapProps {
  treasures: HuntMapTreasure[];
  onSelectTreasure?: (treasure: HuntMapTreasure) => void;
  emptyMessage?: string;
}

/** Only refit when pin locations / set membership change — not on unrelated re-renders (e.g. closing popup). */
function fitBoundsSignature(treasures: HuntMapTreasure[]): string {
  return treasures
    .filter((t) => t.lat != null && t.lng != null && Number.isFinite(t.lat) && Number.isFinite(t.lng))
    .map((t) => `${t.id}:${t.lat},${t.lng}`)
    .sort()
    .join('|');
}

function FitBounds({ treasures }: { treasures: HuntMapTreasure[] }) {
  const map = useMap();
  const signature = useMemo(() => fitBoundsSignature(treasures), [treasures]);

  useEffect(() => {
    const withCoords = treasures.filter(
      (t) =>
        t.lat != null &&
        t.lng != null &&
        Number.isFinite(t.lat) &&
        Number.isFinite(t.lng)
    );
    if (withCoords.length === 0) return;
    if (withCoords.length === 1) {
      map.setView([withCoords[0].lat!, withCoords[0].lng!], 15);
      return;
    }
    const bounds = L.latLngBounds(
      withCoords.map((t) => [t.lat!, t.lng!] as [number, number])
    );
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 16 });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only when visible pin geometry changes
  }, [map, signature]);
  return null;
}

export function HuntMap({ treasures, onSelectTreasure, emptyMessage }: HuntMapProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const tileUrl = isDark ? TILE_LAYERS.dark : TILE_LAYERS.light;

  const treasuresWithCoords = useMemo(
    () =>
      treasures.filter(
        (t) =>
          t.lat != null &&
          t.lng != null &&
          Number.isFinite(t.lat) &&
          Number.isFinite(t.lng)
      ),
    [treasures]
  );

  const hasCoords = treasuresWithCoords.length > 0;

  if (treasures.length === 0) {
    return (
      <div className="w-full h-full min-h-[200px] bg-muted/30 flex items-center justify-center">
        <p className="text-muted-foreground">
          {emptyMessage ?? 'No treasures on this hunt yet.'}
        </p>
      </div>
    );
  }

  if (!hasCoords) {
    return (
      <div className="w-full min-h-[200px] p-4 space-y-2 bg-muted/30">
        <p className="text-sm font-semibold">Locations</p>
        {treasures.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-2 p-3 rounded-lg border ${
              t.scanned ? 'bg-muted/20 opacity-75' : 'bg-background'
            }`}
          >
            <div className="text-xs font-medium text-muted-foreground w-16 shrink-0 capitalize">
              {t.pinKind.replace('_', ' ')}
            </div>
            <div>
              <p className={`font-medium ${t.scanned ? 'text-muted-foreground' : ''}`}>
                {t.scanned && (
                  <span className="mr-2 text-[10px] font-medium uppercase text-muted-foreground">
                    Claimed
                  </span>
                )}
                {t.name}
              </p>
              {t.address && <p className="text-sm text-muted-foreground">{t.address}</p>}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const [centerLat, centerLng] = useMemo(() => {
    if (treasuresWithCoords.length === 0) return [22.3193, 114.1694] as const;
    const lat =
      treasuresWithCoords.reduce((a, t) => a + t.lat!, 0) / treasuresWithCoords.length;
    const lng =
      treasuresWithCoords.reduce((a, t) => a + t.lng!, 0) / treasuresWithCoords.length;
    return [lat, lng] as const;
  }, [treasuresWithCoords]);

  return (
    <div className="hunt-map-wrapper h-full w-full min-h-0 overflow-hidden rounded-none">
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={13}
        className="h-full w-full min-h-0"
        scrollWheelZoom={true}
        zoomControl={false}
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
            icon={iconForPinKind(t.pinKind, t.scanned)}
            interactive={!t.scanned}
            zIndexOffset={t.scanned ? -1000 : 0}
            eventHandlers={
              t.scanned || !onSelectTreasure
                ? undefined
                : { click: () => onSelectTreasure(t) }
            }
          />
        ))}
      </MapContainer>
    </div>
  );
}
