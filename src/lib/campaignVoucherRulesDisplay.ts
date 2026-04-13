const TEMP_LABELS: Record<string, string> = {
  all_supported: "Hot or iced (where applicable)",
  hot_only: "Hot only",
  iced_only: "Iced only",
  n_a: "Temperature not specified",
};

const FULFILL_LABELS: Record<string, string> = {
  all_supported: "Dine-in or takeaway",
  dine_in_only: "Dine-in only",
  takeaway_only: "Takeaway only",
};

export function temperatureRuleDisplay(rule: string): string {
  return TEMP_LABELS[rule] ?? rule.replace(/_/g, " ");
}

export function fulfillmentRuleDisplay(rule: string): string {
  return FULFILL_LABELS[rule] ?? rule.replace(/_/g, " ");
}

/** Compact segment for customer-facing combined line (not for n_a). */
const TEMP_SEGMENT: Record<string, string> = {
  all_supported: "Hot or iced",
  hot_only: "Hot only",
  iced_only: "Iced only",
};

const FULFILL_SEGMENT: Record<string, string> = {
  all_supported: "dine-in or takeaway",
  dine_in_only: "Dine-in only",
  takeaway_only: "Takeaway only",
};

/**
 * One line for voucher temperature + fulfillment. Omits temperature when `n_a`.
 * When both apply, joins with " | " (e.g. "Hot or iced | dine-in or takeaway").
 */
export function temperatureAndFulfillmentCustomerLine(
  temperatureRule: string,
  fulfillmentRule: string,
): string | null {
  const temp =
    temperatureRule === "n_a" ? null : (TEMP_SEGMENT[temperatureRule] ?? temperatureRuleDisplay(temperatureRule));
  const fulfill =
    FULFILL_SEGMENT[fulfillmentRule] ?? fulfillmentRuleDisplay(fulfillmentRule).toLowerCase();

  if (temp && fulfill) {
    return `${temp} | ${fulfill}`;
  }
  if (fulfill) {
    return fulfill;
  }
  if (temp) {
    return temp;
  }
  return null;
}
