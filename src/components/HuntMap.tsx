import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { useTheme } from 'next-themes';
import type { CampaignMapItem } from "@/types/campaignMapItem";
import type { HuntMapPinKind } from '@/lib/huntMapPinKind';
import { MapContainer, TileLayer, Marker, Tooltip, useMap, useMapEvent } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

import huntPinStar from '@/assets/hunt-pin-star.svg';
import huntPinGrab from '@/assets/hunt-pin-grab.svg';
import coffeeShopPin from '@/assets/coffee-shop-pin.svg';
import { isNearHongKong, MAP_FIT_SPAN_OUTLIER_DEG } from '@/lib/hkMapBounds';

const TILE_LAYERS = {
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
} as const;

/** Leaflet default blue pin (same as treasure map picker). */
const leafletDefaultUserIcon = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

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

const LABEL_MIN_ZOOM = 14;

function shouldShowOrgLabel(t: CampaignMapItem, zoom: number): boolean {
  return Boolean(t.orgName?.trim()) && !t.scanned && zoom >= LABEL_MIN_ZOOM;
}

/** Negative Y nudges tooltip up so text sits near the pin’s visual center (icon anchor is at tip). */
function pinLabelYOffsetForKind(kind: HuntMapPinKind): number {
  return kind === 'coffee_shop' ? -CUP_H / 2 : -PIN_SIZE / 2;
}

function ZoomTracker({ setZoom }: { setZoom: Dispatch<SetStateAction<number>> }) {
  const map = useMap();

  useEffect(() => {
    setZoom(map.getZoom());
  }, [map, setZoom]);

  useMapEvent('zoomend', () => {
    setZoom(map.getZoom());
  });

  return null;
}

/** Pixel insets so fitBounds clears floating search (top) and tab bar / voucher sheet (bottom). */
export type HuntMapOverlayPadding = { top: number; bottom: number };

const DEFAULT_MAP_OVERLAY_PADDING: HuntMapOverlayPadding = { top: 140, bottom: 96 };

export type HuntMapUserLocation = { lat: number; lng: number };

interface HuntMapProps {
  treasures: CampaignMapItem[];
  onSelectTreasure?: (treasure: CampaignMapItem) => void;
  emptyMessage?: string;
  mapOverlayPadding?: HuntMapOverlayPadding;
  /** Shown after user taps “my location”; not included in fit-bounds. */
  userLocation?: HuntMapUserLocation | null;
  /** Increments on each locate tap so the map re-centers every time. */
  locateFlyNonce?: number;
  /** Increments when filter pills are tapped to re-run fitBounds even if the treasure set is unchanged. */
  refitNonce?: number;
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
const FIT_H_PADDING_WITH_LABELS = 96;

function FitBounds({
  treasures,
  mapOverlayPadding,
  horizontalPadding,
  refitNonce,
}: {
  treasures: CampaignMapItem[];
  mapOverlayPadding: HuntMapOverlayPadding;
  horizontalPadding: number;
  refitNonce: number;
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
      paddingTopLeft: L.point(horizontalPadding, padTop),
      paddingBottomRight: L.point(horizontalPadding, padBottom),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only when visible pin geometry / chrome insets / explicit refit change
  }, [map, signature, padTop, padBottom, horizontalPadding, refitNonce]);
  return null;
}

function FlyToUserLocation({
  userLocation,
  locateFlyNonce,
}: {
  userLocation: HuntMapUserLocation | null | undefined;
  locateFlyNonce: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!userLocation || locateFlyNonce === 0) return;
    const { lat, lng } = userLocation;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    map.flyTo([lat, lng], 16);
  }, [map, locateFlyNonce, userLocation?.lat, userLocation?.lng]);

  return null;
}

export function HuntMap({
  treasures,
  onSelectTreasure,
  emptyMessage,
  mapOverlayPadding,
  userLocation = null,
  locateFlyNonce = 0,
  refitNonce = 0,
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

  const hasUnscannedOrgLabels = useMemo(
    () =>
      treasuresWithCoords.some(
        (t) => Boolean(t.orgName?.trim()) && !t.scanned
      ),
    [treasuresWithCoords]
  );

  const fitHorizontalPadding = hasUnscannedOrgLabels
    ? FIT_H_PADDING_WITH_LABELS
    : FIT_H_PADDING;

  const [mapZoom, setMapZoom] = useState(13);

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
                  <span className="mr-2 text-xs font-medium tracking-normal text-muted-foreground">
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
        <ZoomTracker setZoom={setMapZoom} />
        <FitBounds
          treasures={treasuresWithCoords}
          mapOverlayPadding={overlayPad}
          horizontalPadding={fitHorizontalPadding}
          refitNonce={refitNonce}
        />
        <FlyToUserLocation userLocation={userLocation} locateFlyNonce={locateFlyNonce} />
        {userLocation &&
        Number.isFinite(userLocation.lat) &&
        Number.isFinite(userLocation.lng) ? (
          <Marker
            position={[userLocation.lat, userLocation.lng]}
            icon={leafletDefaultUserIcon}
            interactive={false}
            zIndexOffset={1000}
          />
        ) : null}
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
          >
            {shouldShowOrgLabel(t, mapZoom) ? (
              <Tooltip
                permanent
                direction="right"
                offset={[6, pinLabelYOffsetForKind(t.pinKind)]}
                className="hunt-map-org-label"
              >
                {t.orgName}
              </Tooltip>
            ) : null}
          </Marker>
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
