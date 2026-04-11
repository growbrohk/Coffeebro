export const VOUCHER_OFFER_LABELS = {
  free: "free",
  b1g1: "buy1get1free",
  fixed_price_17: "$17coffee",
} as const;

export type VoucherOfferType = keyof typeof VOUCHER_OFFER_LABELS;

export function voucherOfferLabel(offerType: string): string {
  if (offerType in VOUCHER_OFFER_LABELS) {
    return VOUCHER_OFFER_LABELS[offerType as VoucherOfferType];
  }
  return offerType;
}
