const cartoBasemapsApiKey = import.meta.env.VITE_CARTO_BASEMAPS_API_KEY?.trim() ?? '';

function cartoRasterTileUrl(style: 'light_all' | 'dark_all'): string {
  const base = `https://{s}.basemaps.cartocdn.com/${style}/{z}/{x}/{y}.png`;
  if (!cartoBasemapsApiKey) return base;
  return `${base}?key=${encodeURIComponent(cartoBasemapsApiKey)}`;
}

export const CARTO_TILE_LAYERS = {
  light: cartoRasterTileUrl('light_all'),
  dark: cartoRasterTileUrl('dark_all'),
} as const;

export const CARTO_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>';

export const CARTO_TILE_LAYER_OPTIONS = {
  subdomains: 'abcd',
  maxZoom: 20,
} as const;
