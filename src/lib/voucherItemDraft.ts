import {
  ALL_FULFILLMENT_RULES,
  ALL_TEMPERATURE_RULES,
  allowedFulfillmentRules,
  allowedTemperatureRules,
  unionFulfillmentRules,
  unionTemperatureRules,
  type FulfillmentRule,
  type MenuItemRuleSource,
  type TemperatureRule,
} from "./campaignVoucherRules";
import {
  ANY_MENU_ITEM,
  CUSTOM_MENU_TEXT,
  MULTI_MENU_ITEMS,
  maxDollarDiscountForPrice,
} from "./voucherOfferType";

export type VoucherItemDraft = {
  menu_item_id: string;
  menu_item_ids: string[];
  custom_item_text: string;
};

export function selectedMenuItems<T extends { id: string }>(
  draft: VoucherItemDraft,
  menuItems: T[],
): T[] {
  if (draft.menu_item_id === MULTI_MENU_ITEMS) {
    return menuItems.filter((item) => draft.menu_item_ids.includes(item.id));
  }
  if (!draft.menu_item_id || draft.menu_item_id === ANY_MENU_ITEM || draft.menu_item_id === CUSTOM_MENU_TEXT) {
    return [];
  }
  return menuItems.filter((item) => item.id === draft.menu_item_id);
}

export function resolveVoucherItemRules(
  draft: VoucherItemDraft,
  menuItems: MenuItemRuleSource & { id: string }[],
): {
  tempOpts: readonly TemperatureRule[];
  fulfillOpts: readonly FulfillmentRule[];
  rulesEnabled: boolean;
} {
  if (draft.menu_item_id === CUSTOM_MENU_TEXT) {
    return {
      tempOpts: ALL_TEMPERATURE_RULES,
      fulfillOpts: ALL_FULFILLMENT_RULES,
      rulesEnabled: true,
    };
  }
  if (draft.menu_item_id === MULTI_MENU_ITEMS) {
    const selected = selectedMenuItems(draft, menuItems);
    return {
      tempOpts: unionTemperatureRules(selected),
      fulfillOpts: unionFulfillmentRules(selected),
      rulesEnabled: true,
    };
  }
  const menu = selectedMenuItems(draft, menuItems)[0];
  if (!menu) {
    return { tempOpts: [], fulfillOpts: [], rulesEnabled: false };
  }
  return {
    tempOpts: allowedTemperatureRules(menu),
    fulfillOpts: allowedFulfillmentRules(menu),
    rulesEnabled: true,
  };
}

export function dollarMaxForDraft(
  draft: VoucherItemDraft,
  menuItems: { id: string; base_price: number }[],
): number | null {
  const prices = selectedMenuItems(draft, menuItems).map((item) => item.base_price);
  if (prices.length === 0) return null;
  return maxDollarDiscountForPrice(Math.min(...prices.map(Number)));
}

export function menuItemModePatch(
  nextId: string,
  _current: VoucherItemDraft,
): Partial<VoucherItemDraft> & { temperature_rule?: string; fulfillment_rule?: string } {
  if (nextId === ANY_MENU_ITEM) {
    return {
      menu_item_id: nextId,
      menu_item_ids: [],
      custom_item_text: "",
      temperature_rule: "all_supported",
      fulfillment_rule: "all_supported",
    };
  }
  if (nextId === MULTI_MENU_ITEMS) {
    return {
      menu_item_id: nextId,
      custom_item_text: "",
      temperature_rule: "all_supported",
      fulfillment_rule: "all_supported",
    };
  }
  if (nextId === CUSTOM_MENU_TEXT) {
    return {
      menu_item_id: nextId,
      menu_item_ids: [],
      temperature_rule: "all_supported",
      fulfillment_rule: "all_supported",
    };
  }
  return {
    menu_item_id: nextId,
    menu_item_ids: [],
    custom_item_text: "",
  };
}

export function emptyVoucherItemDraft(): VoucherItemDraft {
  return {
    menu_item_id: "",
    menu_item_ids: [],
    custom_item_text: "",
  };
}
