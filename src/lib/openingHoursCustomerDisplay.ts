import {
  OPENING_DAY_KEYS,
  OPENING_DAY_LABELS,
  weeklyFromJson,
  type DayHours,
  type OpeningDayKey,
} from "@/lib/openingHours";

function compactTime(isoTime: string): string {
  return isoTime.replace(":", "").replace(/\D/g, "").slice(0, 4);
}

function dayLine(h: DayHours): string {
  if (h.closed) return "Closed";
  return `${compactTime(h.open)}-${compactTime(h.close)}`;
}

/** Rows for Mon–Sun with labels suitable for a consumer-facing list. */
export function weeklyOpeningHoursDisplayRows(openingHours: unknown): { day: string; line: string }[] {
  const weekly = weeklyFromJson(openingHours);
  return OPENING_DAY_KEYS.map((key: OpeningDayKey) => ({
    day: OPENING_DAY_LABELS[key],
    line: dayLine(weekly[key]),
  }));
}
