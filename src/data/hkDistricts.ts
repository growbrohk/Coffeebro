/** Hong Kong’s 18 districts — official administrative names (English). */
export const HK_DISTRICTS = [
  'Central & Western',
  'Wan Chai',
  'Eastern',
  'Southern',
  'Yau Tsim Mong',
  'Sham Shui Po',
  'Kowloon City',
  'Wong Tai Sin',
  'Kwun Tong',
  'Islands',
  'Kwai Tsing',
  'Tsuen Wan',
  'Tuen Mun',
  'Yuen Long',
  'North',
  'Tai Po',
  'Sha Tin',
  'Sai Kung',
] as const;

export type HKDistrict = (typeof HK_DISTRICTS)[number];
