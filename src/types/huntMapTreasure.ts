import type { Treasure } from '@/hooks/useHunts';
import type { HuntMapPinKind } from '@/lib/huntMapPinKind';

export type HuntMapTreasure = Treasure & {
  scanned: boolean;
  pinKind: HuntMapPinKind;
  offerTitle: string | null;
  offerDescription: string | null;
  offerType: string | null;
  orgName: string | null;
  orgLogoUrl: string | null;
  orgPreviewPhotoUrl: string | null;
  quantityLimit: number | null;
  campaignTitle: string | null;
  /** Recommended-café row from discovery org: treasure id for detail URL (list `id` stays org id). */
  cafeDetailTreasureId?: string | null;
  /** Calendar campaign (`source_type = calendar`); real offer id for navigation. */
  calendarOfferId?: string | null;
  /** Calendar offer event day (YYYY-MM-DD). */
  eventDate?: string | null;
};
