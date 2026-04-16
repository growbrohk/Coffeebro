/** Google Maps directions URL for an org (matches hunt / campaign detail behavior). */
export function orgDirectionsUrl(org: {
  lat: number | null;
  lng: number | null;
  location: string | null;
  google_maps_url: string | null;
}): string | null {
  const g = org.google_maps_url?.trim();
  if (g) return g;
  const lat = org.lat;
  const lng = org.lng;
  if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }
  const loc = org.location?.trim();
  if (loc) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(loc)}`;
  }
  return null;
}
