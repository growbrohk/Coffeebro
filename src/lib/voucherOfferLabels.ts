export const VOUCHER_OFFER_LABELS = {
  free: "free",
  b1g1: "buy1get1free",
  fixed_price_7: "$7",
  fixed_price_17: "$17",
  fixed_price_27: "$27",
} as const;

export type VoucherOfferType = keyof typeof VOUCHER_OFFER_LABELS;

/** Legacy customer-facing tokens (pre–fixed-price tiers). */
const LEGACY_OFFER_LABELS: Record<string, string> = {
  $17coffee: "$17",
  $7coffee: "$7",
  $27coffee: "$27",
};

export function voucherOfferLabel(offerType: string): string {
  if (offerType in VOUCHER_OFFER_LABELS) {
    return VOUCHER_OFFER_LABELS[offerType as VoucherOfferType];
  }
  const legacy = LEGACY_OFFER_LABELS[offerType.trim().toLowerCase()];
  if (legacy) return legacy;
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
