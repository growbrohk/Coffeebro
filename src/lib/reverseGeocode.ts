/** OpenStreetMap Nominatim reverse geocoding (usage policy: https://operations.osmfoundation.org/policies/nominatim/) */

const NOMINATIM_REVERSE = "https://nominatim.openstreetmap.org/reverse";

const MAX_ADDRESS_LEN = 500;
const MAX_AREA_LEN = 200;

export type ReverseGeocodeResult = {
  address: string | null;
  areaName: string | null;
};

function truncate(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return t.slice(0, max);
}

type NominatimAddress = Record<string, string | undefined>;

function buildAddressLine(addr: NominatimAddress | undefined, displayName: string | undefined): string | null {
  if (!addr) {
    return displayName ? truncate(displayName, MAX_ADDRESS_LEN) : null;
  }
  const house = addr.house_number?.trim();
  const road = addr.road?.trim();
  const pedestrian = addr.pedestrian?.trim();
  const parts: string[] = [];
  if (house) parts.push(house);
  if (road) parts.push(road);
  if (parts.length > 0) return truncate(parts.join(" "), MAX_ADDRESS_LEN);
  if (pedestrian) return truncate(pedestrian, MAX_ADDRESS_LEN);
  if (addr.amenity?.trim()) return truncate(addr.amenity.trim(), MAX_ADDRESS_LEN);
  return displayName ? truncate(displayName, MAX_ADDRESS_LEN) : null;
}

function buildAreaName(addr: NominatimAddress | undefined): string | null {
  if (!addr) return null;
  const keys = [
    "suburb",
    "neighbourhood",
    "city_district",
    "quarter",
    "village",
    "town",
    "city",
    "county",
  ] as const;
  for (const k of keys) {
    const v = addr[k];
    if (v && typeof v === "string" && v.trim()) return truncate(v.trim(), MAX_AREA_LEN);
  }
  return null;
}

/**
 * Reverse geocode coordinates to a display address and area label suitable for treasure fields.
 * Returns null fields on failure (caller may still persist lat/lng).
 */
export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: "jsonv2",
    "accept-language": "en",
  });
  const url = `${NOMINATIM_REVERSE}?${params.toString()}`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });
  } catch {
    return { address: null, areaName: null };
  }

  if (!res.ok) return { address: null, areaName: null };

  let data: { address?: NominatimAddress; display_name?: string };
  try {
    data = (await res.json()) as { address?: NominatimAddress; display_name?: string };
  } catch {
    return { address: null, areaName: null };
  }

  const addr = data.address;
  const displayName = typeof data.display_name === "string" ? data.display_name : undefined;
  return {
    address: buildAddressLine(addr, displayName),
    areaName: buildAreaName(addr),
  };
}
