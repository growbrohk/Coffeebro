/** Menu row shape needed for voucher rule compatibility checks */
export type MenuItemRuleSource = {
  category: string;
  temperature_option: string;
  fulfillment_option: string;
};

const TEMP_RULES = ["all_supported", "hot_only", "iced_only", "n_a"] as const;
const FULFILL_RULES = ["all_supported", "dine_in_only", "takeaway_only"] as const;

export const ALL_TEMPERATURE_RULES = TEMP_RULES;
export const ALL_FULFILLMENT_RULES = FULFILL_RULES;

export type TemperatureRule = (typeof TEMP_RULES)[number];
export type FulfillmentRule = (typeof FULFILL_RULES)[number];

export function allowedTemperatureRules(menu: MenuItemRuleSource): TemperatureRule[] {
  switch (menu.temperature_option) {
    case "hot":
      return ["hot_only", "n_a"];
    case "iced":
      return ["iced_only", "n_a"];
    case "both":
      return ["all_supported", "hot_only", "iced_only", "n_a"];
    case "n_a":
    default:
      return ["n_a"];
  }
}

export function allowedFulfillmentRules(menu: MenuItemRuleSource): FulfillmentRule[] {
  switch (menu.fulfillment_option) {
    case "dine_in":
      return ["dine_in_only", "all_supported"];
    case "takeaway":
      return ["takeaway_only", "all_supported"];
    case "both":
    default:
      return ["all_supported", "dine_in_only", "takeaway_only"];
  }
}

export function isTemperatureRuleAllowed(menu: MenuItemRuleSource, rule: string): boolean {
  return allowedTemperatureRules(menu).includes(rule as TemperatureRule);
}

export function isFulfillmentRuleAllowed(menu: MenuItemRuleSource, rule: string): boolean {
  return allowedFulfillmentRules(menu).includes(rule as FulfillmentRule);
}

export function unionTemperatureRules(menus: MenuItemRuleSource[]): TemperatureRule[] {
  if (menus.length === 0) return [...TEMP_RULES];
  const allowed = new Set<TemperatureRule>();
  for (const menu of menus) {
    for (const rule of allowedTemperatureRules(menu)) allowed.add(rule);
  }
  return TEMP_RULES.filter((rule) => allowed.has(rule));
}

export function unionFulfillmentRules(menus: MenuItemRuleSource[]): FulfillmentRule[] {
  if (menus.length === 0) return [...FULFILL_RULES];
  const allowed = new Set<FulfillmentRule>();
  for (const menu of menus) {
    for (const rule of allowedFulfillmentRules(menu)) allowed.add(rule);
  }
  return FULFILL_RULES.filter((rule) => allowed.has(rule));
}
