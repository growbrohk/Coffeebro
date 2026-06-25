import { HK_DISTRICTS, type HKDistrict } from '@/data/hkDistricts';

export const HK_AREA_OPTIONS = [
  { value: 'hk_island', label: 'HK Island' },
  { value: 'kowloon', label: 'Kowloon' },
  { value: 'new_territories', label: 'New Territories' },
] as const;

export type HkArea = (typeof HK_AREA_OPTIONS)[number]['value'];

export const DISTRICTS_BY_HK_AREA: Record<HkArea, readonly HKDistrict[]> = {
  hk_island: ['Central & Western', 'Wan Chai', 'Eastern', 'Southern'],
  kowloon: ['Yau Tsim Mong', 'Sham Shui Po', 'Kowloon City', 'Wong Tai Sin', 'Kwun Tong'],
  new_territories: [
    'Islands',
    'Kwai Tsing',
    'Tsuen Wan',
    'Tuen Mun',
    'Yuen Long',
    'North',
    'Tai Po',
    'Sha Tin',
    'Sai Kung',
  ],
};

export function getDistrictsForAreas(areas: string[]): HKDistrict[] {
  if (areas.length === 0) return [...HK_DISTRICTS];
  const seen = new Set<string>();
  const result: HKDistrict[] = [];
  for (const area of areas) {
    const districts = DISTRICTS_BY_HK_AREA[area as HkArea];
    if (!districts) continue;
    for (const d of districts) {
      if (!seen.has(d)) {
        seen.add(d);
        result.push(d);
      }
    }
  }
  return result;
}
