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
