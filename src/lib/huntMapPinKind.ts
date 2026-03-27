export type HuntMapPinKind = 'coffee_shop' | 'grab' | 'hunt';

export function pinKindFromOfferType(offerType: string | null | undefined): HuntMapPinKind | null {
  if (!offerType) return null;
  if (offerType === 'buy1get1free') return 'grab';
  if (offerType === '$17coffee' || offerType === 'free') return 'hunt';
  return 'hunt';
}

export function pinKindForTreasure(primaryOfferType: string | null | undefined): HuntMapPinKind {
  const k = pinKindFromOfferType(primaryOfferType);
  return k ?? 'coffee_shop';
}
