export type ReturnVoucherRedemptionMode = "days_after_claim" | "fixed_period";

export function returnVoucherRedemptionMode(row: {
  redeem_starts_on?: string | null;
}): ReturnVoucherRedemptionMode {
  return row.redeem_starts_on ? "fixed_period" : "days_after_claim";
}

export function formatPresetCalendarDate(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatReturnVoucherPeriodLabel(row: {
  redeem_valid_days: number;
  redeem_starts_on?: string | null;
  redeem_ends_on?: string | null;
}): string {
  if (row.redeem_starts_on && row.redeem_ends_on) {
    return `${formatPresetCalendarDate(row.redeem_starts_on)} – ${formatPresetCalendarDate(row.redeem_ends_on)}`;
  }
  const n = row.redeem_valid_days;
  return `${n} day${n === 1 ? "" : "s"} after claim`;
}

export function todayInHongKong(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Hong_Kong" });
}

export function isFixedPeriodEnded(endsOn: string | null | undefined): boolean {
  if (!endsOn) return false;
  return endsOn < todayInHongKong();
}
