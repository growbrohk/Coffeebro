export const ANY_MENU_ITEM = "__any__";
export const MULTI_MENU_ITEMS = "__multi__";
export const CUSTOM_MENU_TEXT = "__custom__";
export const CUSTOM_ITEM_TEXT_MAX = 80;

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

export function isMenuItemSentinel(menuItemId: string | null | undefined): boolean {
  return (
    !menuItemId ||
    menuItemId === ANY_MENU_ITEM ||
    menuItemId === MULTI_MENU_ITEMS ||
    menuItemId === CUSTOM_MENU_TEXT
  );
}

/** UI sentinel / empty string → DB null */
export function menuItemIdToDb(menuItemId: string | null | undefined): string | null {
  if (isMenuItemSentinel(menuItemId)) return null;
  return menuItemId;
}

/** DB null → UI sentinel */
export function menuItemIdFromDb(menuItemId: string | null | undefined): string {
  if (!menuItemId) return ANY_MENU_ITEM;
  return menuItemId;
}

export type VoucherItemScopeRow = {
  menu_item_id?: string | null;
  menu_item_ids?: string[] | null;
  custom_item_text?: string | null;
};

/** Restore the editor mode from stored columns. */
export function menuItemModeFromDb(row: VoucherItemScopeRow): string {
  const text = row.custom_item_text?.trim();
  if (text) return CUSTOM_MENU_TEXT;
  if (row.menu_item_ids && row.menu_item_ids.length > 0) return MULTI_MENU_ITEMS;
  return menuItemIdFromDb(row.menu_item_id);
}

export type VoucherItemScopeDb = {
  menu_item_id: string | null;
  menu_item_ids: string[];
  custom_item_text: string | null;
};

export function menuItemScopeToDb(draft: {
  menu_item_id: string;
  menu_item_ids?: string[];
  custom_item_text?: string;
}): VoucherItemScopeDb {
  if (draft.menu_item_id === CUSTOM_MENU_TEXT) {
    const text = draft.custom_item_text?.trim() ?? "";
    return { menu_item_id: null, menu_item_ids: [], custom_item_text: text || null };
  }
  if (draft.menu_item_id === MULTI_MENU_ITEMS) {
    return { menu_item_id: null, menu_item_ids: draft.menu_item_ids ?? [], custom_item_text: null };
  }
  return {
    menu_item_id: menuItemIdToDb(draft.menu_item_id),
    menu_item_ids: [],
    custom_item_text: null,
  };
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
