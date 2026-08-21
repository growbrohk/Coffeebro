import { parseDiscountOffer } from "./voucherOfferType";

export const VOUCHER_OFFER_LABELS = {
  free: "free",
  b1g1: "buy1get1free",
  fixed_price_7: "$7",
  fixed_price_17: "$17",
  fixed_price_20: "$20",
  fixed_price_27: "$27",
} as const;

export type VoucherOfferType = keyof typeof VOUCHER_OFFER_LABELS;

/** Legacy customer-facing tokens (pre–fixed-price tiers). */
const LEGACY_OFFER_LABELS: Record<string, string> = {
  $17coffee: "$17",
  $7coffee: "$7",
  $27coffee: "$27",
};

export const ANY_ITEM_LABEL = "Any item";

export function voucherOfferLabel(offerType: string): string {
  const raw = offerType.trim();
  const discount = parseDiscountOffer(raw);
  if (discount) {
    if (discount.kind === "percent_discount") return `${discount.amount}% off`;
    return `$${discount.amount} off`;
  }
  if (raw in VOUCHER_OFFER_LABELS) {
    return VOUCHER_OFFER_LABELS[raw as VoucherOfferType];
  }
  const legacy = LEGACY_OFFER_LABELS[raw.toLowerCase()];
  if (legacy) return legacy;
  return raw;
}

/** Customer-facing line: labeled offer + menu item (fixed and random vouchers). */
export function voucherNameFromOfferAndMenu(
  offerType: string | null | undefined,
  itemName: string | null | undefined,
): string | null {
  const raw = offerType?.trim();
  if (!raw) return null;
  const offer = voucherOfferLabel(raw);
  const name = itemName?.trim() || ANY_ITEM_LABEL;
  return `${offer} · ${name}`;
}

export function menuItemDisplayName(itemName: string | null | undefined): string {
  return itemName?.trim() || ANY_ITEM_LABEL;
}
