import { HK_DISTRICTS, type HKDistrict } from '@/data/hkDistricts';
import { HK_MTR_STATIONS } from '@/data/hkMtrStations';

/**
 * MTR stations (English names matching HK_MTR_STATIONS) associated with each
 * Hong Kong district for admin discovery. Stations may appear under multiple
 * districts when they sit on boundaries or serve both areas.
 */
export const MTR_STATIONS_BY_DISTRICT = {
  'Central & Western': [
    'Admiralty',
    'Central',
    'HKU',
    'Hong Kong',
    'Kennedy Town',
    'Sai Ying Pun',
    'Sheung Wan',
  ],
  'Wan Chai': ['Admiralty', 'Causeway Bay', 'Exhibition Centre', 'Wan Chai'],
  Eastern: [
    'Chai Wan',
    'Heng Fa Chuen',
    'North Point',
    'Quarry Bay',
    'Sai Wan Ho',
    'Tai Koo',
    'Tin Hau',
  ],
  Southern: ['Lei Tung', 'South Horizons'],
  'Yau Tsim Mong': [
    'Austin',
    'East Tsim Sha Tsui',
    'Hung Hom',
    'Kowloon',
    'Mong Kok',
    'Mong Kok East',
    'Olympic',
    'Prince Edward',
    'Tsim Sha Tsui',
    'Yau Ma Tei',
  ],
  'Sham Shui Po': [
    'Cheung Sha Wan',
    'Lai Chi Kok',
    'Mei Foo',
    'Nam Cheong',
    'Prince Edward',
    'Sham Shui Po',
    'Shek Kip Mei',
  ],
  'Kowloon City': [
    'Ho Man Tin',
    'Hung Hom',
    'Kai Tak',
    'Kowloon Tong',
    'Mong Kok East',
    'Sung Wong Toi',
    'To Kwa Wan',
    'Whampoa',
  ],
  'Wong Tai Sin': ['Choi Hung', 'Diamond Hill', 'Kowloon Tong', 'Wong Tai Sin'],
  'Kwun Tong': ['Kowloon Bay', 'Lam Tin'],
  Islands: ['Airport', 'AsiaWorld-Expo', 'Disneyland Resort', 'Sunny Bay', 'Tung Chung'],
  'Kwai Tsing': ['Kwai Fong', 'Kwai Hing', 'Lai King', 'Tsing Yi'],
  'Tsuen Wan': ['Kam Sheung Road', 'Lai King', 'Tsuen Wan'],
  'Tuen Mun': ['Tuen Mun'],
  'Yuen Long': ['Kam Sheung Road', 'Tin Shui Wai', 'Yuen Long'],
  North: ['Fanling', 'Kwu Tung', 'Lok Ma Chau', 'Lo Wu', 'Sheung Shui'],
  'Tai Po': ['Tai Po Market'],
  'Sha Tin': [
    'Che Kung Temple',
    'City One',
    'Fo Tan',
    'Heng On',
    'Hin Keng',
    'Racecourse',
    'Sha Tin',
    'Sha Tin Wai',
    'Shui Chuen O',
    'Tai Shui Hang',
    'Tai Wai',
    'University',
    'Wu Kai Sha',
  ],
  'Sai Kung': ['Hang Hau', 'Po Lam', 'Tiu Keng Leng', 'Tseung Kwan O'],
} as const satisfies Record<HKDistrict, readonly string[]>;

const STATION_NAME_SET = new Set<string>(HK_MTR_STATIONS);

for (const d of HK_DISTRICTS) {
  for (const s of MTR_STATIONS_BY_DISTRICT[d]) {
    if (!STATION_NAME_SET.has(s)) {
      throw new Error(`mtrStationsByDistrict: unknown station "${s}" for ${d}`);
    }
  }
}

export function getMtrStationsForDistrict(district: string): readonly string[] {
  if (!district || !(district in MTR_STATIONS_BY_DISTRICT)) return [];
  return MTR_STATIONS_BY_DISTRICT[district as HKDistrict];
}
