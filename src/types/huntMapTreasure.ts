import type { Treasure } from '@/hooks/useHunts';
import type { HuntMapPinKind } from '@/lib/huntMapPinKind';

export type HuntMapTreasure = Treasure & {
  scanned: boolean;
  pinKind: HuntMapPinKind;
  offerTitle: string | null;
  offerDescription: string | null;
  offerType: string | null;
  orgName: string | null;
  orgPreviewPhotoUrl: string | null;
  quantityLimit: number | null;
  campaignTitle: string | null;
  /** Recommended-café stub: open hunt map instead of a treasure detail URL. */
  openHuntMapOnly?: boolean;
};
