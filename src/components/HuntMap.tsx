import { useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import type { CampaignMapItem } from "@/types/campaignMapItem";
import type { HuntMapPinKind } from '@/lib/huntMapPinKind';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import huntPinStar from '@/assets/hunt-pin-star.svg';
import huntPinGrab from '@/assets/hunt-pin-grab.svg';
import coffeeShopPin from '@/assets/coffee-shop-pin.svg';
import { isNearHongKong, MAP_FIT_SPAN_OUTLIER_DEG } from '@/lib/hkMapBounds';

const TILE_LAYERS = {
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
} as const;

/** Pin glyph size on the map (Leaflet icon box matches this exactly). */
const PIN_SIZE = 24;
const CUP_W = 27;
const CUP_H = 15;

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

/** Pixel insets so fitBounds clears floating search (top) and tab bar / voucher sheet (bottom). */
export type HuntMapOverlayPadding = { top: number; bottom: number };

const DEFAULT_MAP_OVERLAY_PADDING: HuntMapOverlayPadding = { top: 140, bottom: 96 };

interface HuntMapProps {
  treasures: CampaignMapItem[];
  onSelectTreasure?: (treasure: CampaignMapItem) => void;
  emptyMessage?: string;
  mapOverlayPadding?: HuntMapOverlayPadding;
}

/** Only refit when pin locations / set membership change — not on unrelated re-renders (e.g. closing popup). */
function fitBoundsSignature(treasures: CampaignMapItem[]): string {
  return treasures
    .filter((t) => t.lat != null && t.lng != null && Number.isFinite(t.lat) && Number.isFinite(t.lng))
    .map((t) => `${t.id}:${t.lat},${t.lng}`)
    .sort()
    .join('|');
}

/** When the full set spans very wide (bad coordinate), fit the HK-area cluster so local pins stay visible. */
function treasuresForFitBounds(withCoords: CampaignMapItem[]): CampaignMapItem[] {
  if (withCoords.length <= 1) return withCoords;
  const lats = withCoords.map((t) => t.lat!);
  const lngs = withCoords.map((t) => t.lng!);
  const latSpan = Math.max(...lats) - Math.min(...lats);
  const lngSpan = Math.max(...lngs) - Math.min(...lngs);
  const verySpread = latSpan > MAP_FIT_SPAN_OUTLIER_DEG || lngSpan > MAP_FIT_SPAN_OUTLIER_DEG;
  if (!verySpread) return withCoords;
  const nearHk = withCoords.filter((t) => isNearHongKong(t.lat!, t.lng!));
  if (nearHk.length >= 1) return nearHk;
  return withCoords;
}

const FIT_H_PADDING = 24;

function FitBounds({
  treasures,
  mapOverlayPadding,
}: {
  treasures: CampaignMapItem[];
  mapOverlayPadding: HuntMapOverlayPadding;
}) {
  const map = useMap();
  const signature = useMemo(() => fitBoundsSignature(treasures), [treasures]);
  const { top: padTop, bottom: padBottom } = mapOverlayPadding;

  useEffect(() => {
    const withCoords = treasures.filter(
      (t) =>
        t.lat != null &&
        t.lng != null &&
        Number.isFinite(t.lat) &&
        Number.isFinite(t.lng)
    );
    if (withCoords.length === 0) return;
    const forFit = treasuresForFitBounds(withCoords);
    const fitOptions: L.FitBoundsOptions = {
      paddingTopLeft: L.point(FIT_H_PADDING, padTop),
      paddingBottomRight: L.point(FIT_H_PADDING, padBottom),
      maxZoom: 16,
    };
    if (forFit.length === 1) {
      const lat = forFit[0].lat!;
      const lng = forFit[0].lng!;
      const bounds = L.latLngBounds([lat, lng], [lat, lng]).pad(0.008);
      map.fitBounds(bounds, fitOptions);
      return;
    }
    const bounds = L.latLngBounds(
      forFit.map((t) => [t.lat!, t.lng!] as [number, number])
    );
    map.fitBounds(bounds, fitOptions);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only when visible pin geometry / chrome insets change
  }, [map, signature, padTop, padBottom]);
  return null;
}

export function HuntMap({
  treasures,
  onSelectTreasure,
  emptyMessage,
  mapOverlayPadding,
}: HuntMapProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const tileUrl = isDark ? TILE_LAYERS.dark : TILE_LAYERS.light;
  const overlayPad = mapOverlayPadding ?? DEFAULT_MAP_OVERLAY_PADDING;

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

  const [centerLat, centerLng] = useMemo(() => {
    if (treasuresWithCoords.length === 0) return [22.3193, 114.1694] as const;
    const lat =
      treasuresWithCoords.reduce((a, t) => a + t.lat!, 0) / treasuresWithCoords.length;
    const lng =
      treasuresWithCoords.reduce((a, t) => a + t.lng!, 0) / treasuresWithCoords.length;
    return [lat, lng] as const;
  }, [treasuresWithCoords]);

  const hasCoords = treasuresWithCoords.length > 0;

  if (treasures.length > 0 && !hasCoords) {
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

  const emptyHint = emptyMessage ?? 'No treasures on this hunt yet.';

  return (
    <div className="relative hunt-map-wrapper h-full w-full min-h-0 overflow-hidden rounded-none">
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
        <FitBounds treasures={treasuresWithCoords} mapOverlayPadding={overlayPad} />
        {treasuresWithCoords.map((t) => (
          <Marker
            key={t.id}
            position={[t.lat!, t.lng!]}
            icon={iconForPinKind(t.pinKind, t.scanned)}
            interactive={Boolean(onSelectTreasure)}
            zIndexOffset={t.scanned ? -1000 : 0}
            eventHandlers={
              onSelectTreasure ? { click: () => onSelectTreasure(t) } : undefined
            }
          />
        ))}
      </MapContainer>
      {treasures.length === 0 ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-24 z-[500] flex justify-center px-4">
          <p className="max-w-sm rounded-xl border border-border/60 bg-card/95 px-4 py-3 text-center text-sm text-muted-foreground shadow-md backdrop-blur-md">
            {emptyHint}
          </p>
        </div>
      ) : null}
    </div>
  );
}
