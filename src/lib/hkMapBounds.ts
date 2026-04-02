/** Rough bounding box for Hong Kong + immediate area (map pin hints / fitBounds). */
export const HK_MAP_REGION = {
  latMin: 21.9,
  latMax: 22.65,
  lngMin: 113.72,
  lngMax: 114.55,
} as const;

export function isNearHongKong(lat: number, lng: number): boolean {
  return (
    lat >= HK_MAP_REGION.latMin &&
    lat <= HK_MAP_REGION.latMax &&
    lng >= HK_MAP_REGION.lngMin &&
    lng <= HK_MAP_REGION.lngMax
  );
}

/** When lat/lng span exceeds this (degrees), fitBounds may ignore far outliers (see HuntMap). */
export const MAP_FIT_SPAN_OUTLIER_DEG = 0.85;
