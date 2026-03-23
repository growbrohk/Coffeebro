/** Single source of truth for offer types */
export const OFFER_TYPES = [
  { value: 'free', label: 'Free' },
  { value: '$17coffee', label: '$17 Coffee' },
  { value: 'buy1get1free', label: 'Buy 1 Get 1 Free' },
] as const;

export type OfferTypeValue = (typeof OFFER_TYPES)[number]['value'];

/** Display labels for offer types (e.g. "Buy 1 Get 1 Free" not "B1G1") */
export const OFFER_TYPE_LABELS: Record<string, string> = {
  free: 'Free',
  $17coffee: '$17 Coffee',
  buy1get1free: 'Buy 1 Get 1 Free',
};
