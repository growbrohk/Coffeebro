export type ReturnVoucherRedemptionMode = "days_after_claim" | "fixed_period";

export type RedemptionPeriodDraft = {
  redemption_mode?: ReturnVoucherRedemptionMode;
  redeem_valid_days: number;
  redeem_starts_at?: string | null;
  redeem_ends_at?: string | null;
};

export function returnVoucherRedemptionMode(row: {
  redeem_starts_at?: string | null;
}): ReturnVoucherRedemptionMode {
  return row.redeem_starts_at ? "fixed_period" : "days_after_claim";
}

function parsePeriodInstant(value: string): number | null {
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : null;
}

export function formatPeriodInstant(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatReturnVoucherPeriodLabel(row: {
  redeem_valid_days: number;
  redeem_starts_at?: string | null;
  redeem_ends_at?: string | null;
}): string {
  if (row.redeem_starts_at && row.redeem_ends_at) {
    return `${formatPeriodInstant(row.redeem_starts_at)} – ${formatPeriodInstant(row.redeem_ends_at)}`;
  }
  const n = row.redeem_valid_days;
  return `${n} day${n === 1 ? "" : "s"} after claim`;
}

export function isFixedPeriodEnded(endsAt: string | null | undefined): boolean {
  if (!endsAt) return false;
  const t = parsePeriodInstant(endsAt);
  return t != null && t <= Date.now();
}

export function validateRedemptionPeriod(draft: RedemptionPeriodDraft): string | null {
  const mode = draft.redemption_mode ?? returnVoucherRedemptionMode(draft);
  if (mode === "fixed_period") {
    if (!draft.redeem_starts_at || !draft.redeem_ends_at) {
      return "Start and end time are required";
    }
    const start = parsePeriodInstant(draft.redeem_starts_at);
    const end = parsePeriodInstant(draft.redeem_ends_at);
    if (start == null || end == null || end <= start) {
      return "End must be after start";
    }
    return null;
  }
  if (!Number.isFinite(draft.redeem_valid_days) || draft.redeem_valid_days < 1 || draft.redeem_valid_days > 90) {
    return "Valid days must be between 1 and 90";
  }
  return null;
}
