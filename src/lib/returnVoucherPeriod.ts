export type ReturnVoucherRedemptionMode = "days_after_claim" | "fixed_period";
export type PeriodBound = "start" | "end";

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

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatYmd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function isLocalMidnight(d: Date): boolean {
  return d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0 && d.getMilliseconds() === 0;
}

const DATETIME_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function splitPeriodBound(value: string | null | undefined): { date: string; time: string } {
  if (!value) return { date: "", time: "" };
  const [date, time] = value.split("T");
  return { date: date ?? "", time: time ?? "" };
}

export function joinPeriodBound(date: string, time: string): string {
  if (!date) return "";
  if (!time) return date;
  return `${date}T${time}`;
}

export function periodBoundToInstant(
  value: string | null | undefined,
  bound: PeriodBound,
): Date | null {
  if (!value) return null;
  const datetime = DATETIME_RE.exec(value);
  if (datetime) {
    const [, y, m, d, h, min] = datetime;
    return new Date(Number(y), Number(m) - 1, Number(d), Number(h), Number(min));
  }
  const dateOnly = DATE_RE.exec(value);
  if (dateOnly) {
    const [, y, m, d] = dateOnly;
    if (bound === "end") return new Date(Number(y), Number(m) - 1, Number(d) + 1);
    return new Date(Number(y), Number(m) - 1, Number(d));
  }
  return null;
}

export function periodBoundFromSaved(
  iso: string | null | undefined,
  bound: PeriodBound,
): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  if (isLocalMidnight(d)) {
    const display = bound === "end" ? new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1) : d;
    return formatYmd(display);
  }
  return `${formatYmd(d)}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function formatPeriodBound(
  iso: string | null | undefined,
  bound: PeriodBound,
): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  if (isLocalMidnight(d)) {
    const display = bound === "end" ? new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1) : d;
    return display.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
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
    const start = formatPeriodBound(row.redeem_starts_at, "start");
    const end = formatPeriodBound(row.redeem_ends_at, "end");
    if (start && end) return `${start} – ${end}`;
    if (start) return start;
  }
  const n = row.redeem_valid_days;
  return `${n} day${n === 1 ? "" : "s"} after claim`;
}

export function isFixedPeriodEnded(endsAt: string | null | undefined): boolean {
  if (!endsAt) return false;
  const end = periodBoundToInstant(endsAt, "end");
  return end != null && end.getTime() <= Date.now();
}

export function validateRedemptionPeriod(draft: RedemptionPeriodDraft): string | null {
  const mode = draft.redemption_mode ?? returnVoucherRedemptionMode(draft);
  if (mode === "fixed_period") {
    const startDate = splitPeriodBound(draft.redeem_starts_at).date;
    const endDate = splitPeriodBound(draft.redeem_ends_at).date;
    if (!startDate || !endDate) {
      return "Start and end date are required";
    }
    const start = periodBoundToInstant(draft.redeem_starts_at, "start");
    const end = periodBoundToInstant(draft.redeem_ends_at, "end");
    if (start == null || end == null || end.getTime() <= start.getTime()) {
      return "End must be after start";
    }
    return null;
  }
  if (!Number.isFinite(draft.redeem_valid_days) || draft.redeem_valid_days < 1 || draft.redeem_valid_days > 90) {
    return "Valid days must be between 1 and 90";
  }
  return null;
}
