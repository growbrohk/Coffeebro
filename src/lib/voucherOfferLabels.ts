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

/** Customer-facing line: labeled offer + menu item (fixed and random vouchers). */
export function voucherNameFromOfferAndMenu(
  offerType: string | null | undefined,
  itemName: string | null | undefined,
): string | null {
  const raw = offerType?.trim();
  if (!raw) return null;
  const offer = voucherOfferLabel(raw);
  const name = itemName?.trim() || "Reward";
  return `${offer} · ${name}`;
}
