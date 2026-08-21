export const ANY_MENU_ITEM = "__any__";

export const FIXED_PRICE_TIERS = [
  "fixed_price_7",
  "fixed_price_17",
  "fixed_price_20",
  "fixed_price_27",
] as const;

export const BASE_OFFER_TYPES = ["free", "b1g1", ...FIXED_PRICE_TIERS] as const;

export type OfferKind =
  | "free"
  | "b1g1"
  | "fixed"
  | "percent_discount"
  | "dollar_discount";

export type DiscountOfferKind = "percent_discount" | "dollar_discount";

const PERCENT_DISCOUNT_RE = /^percent_discount_([1-9][0-9]?)$/;
const DOLLAR_DISCOUNT_RE = /^dollar_discount_([1-9][0-9]*)$/;

export function isFixedOfferType(offerType: string): offerType is (typeof FIXED_PRICE_TIERS)[number] {
  return (FIXED_PRICE_TIERS as readonly string[]).includes(offerType);
}

export function fixedTierFromOfferType(offerType: string): (typeof FIXED_PRICE_TIERS)[number] {
  if (isFixedOfferType(offerType)) return offerType;
  return "fixed_price_17";
}

export function parseDiscountOffer(
  offerType: string,
): { kind: DiscountOfferKind; amount: number } | null {
  const raw = offerType.trim();
  const pct = raw.match(PERCENT_DISCOUNT_RE);
  if (pct) {
    const amount = Number(pct[1]);
    if (amount >= 1 && amount <= 99) return { kind: "percent_discount", amount };
    return null;
  }
  const dollar = raw.match(DOLLAR_DISCOUNT_RE);
  if (dollar) {
    const amount = Number(dollar[1]);
    if (amount >= 1) return { kind: "dollar_discount", amount };
    return null;
  }
  return null;
}

export function composeDiscountOffer(kind: DiscountOfferKind, amount: number): string {
  const n = Math.trunc(amount);
  if (kind === "percent_discount") {
    return `percent_discount_${Math.min(99, Math.max(1, n))}`;
  }
  return `dollar_discount_${Math.max(1, n)}`;
}

export function isDiscountOffer(offerType: string): boolean {
  return parseDiscountOffer(offerType) != null;
}

export function isValidOfferType(offerType: string): boolean {
  const raw = offerType.trim();
  if ((BASE_OFFER_TYPES as readonly string[]).includes(raw)) return true;
  return parseDiscountOffer(raw) != null;
}

export function offerKindOf(offerType: string): OfferKind {
  if (isFixedOfferType(offerType)) return "fixed";
  const discount = parseDiscountOffer(offerType);
  if (discount) return discount.kind;
  if (offerType === "free" || offerType === "b1g1") return offerType;
  return "free";
}

/** UI sentinel / empty string → DB null */
export function menuItemIdToDb(menuItemId: string | null | undefined): string | null {
  if (!menuItemId || menuItemId === ANY_MENU_ITEM) return null;
  return menuItemId;
}

/** DB null → UI sentinel */
export function menuItemIdFromDb(menuItemId: string | null | undefined): string {
  if (!menuItemId) return ANY_MENU_ITEM;
  return menuItemId;
}

/** Whether this offer can be used without a specific menu item */
export function allowsAnyMenuItem(offerType: string): boolean {
  return isDiscountOffer(offerType);
}

export function isRandomPoolAllowedOffer(offerType: string): boolean {
  return offerType === "free" || isDiscountOffer(offerType);
}

export function maxDollarDiscountForPrice(basePrice: number | null | undefined): number | null {
  if (basePrice == null || !Number.isFinite(Number(basePrice))) return null;
  const max = Math.ceil(Number(basePrice)) - 1;
  return max >= 1 ? max : null;
}
