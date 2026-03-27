/**
 * Returns local date as YYYY-MM-DD string.
 * Use this instead of toISOString() for daily logic to avoid UTC timezone issues.
 */
export function localYMD(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Local midnight to end-of-day timestamps for a calendar day (month 0-indexed). */
export function localDayBoundsMs(year: number, month: number, day: number): { start: number; end: number } {
  const start = new Date(year, month, day, 0, 0, 0, 0).getTime();
  const end = new Date(year, month, day, 23, 59, 59, 999).getTime();
  return { start, end };
}

/** First moment to last moment of a calendar month (month 0-indexed). */
export function localMonthBoundsMs(year: number, month: number): { start: number; end: number } {
  const start = new Date(year, month, 1, 0, 0, 0, 0).getTime();
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();
  return { start, end };
}

/**
 * Whether [intervalStart, intervalEnd] (treasure claim window; null = unbounded) overlaps [rangeStart, rangeEnd] inclusive.
 */
export function instantIntervalOverlapsMs(
  rangeStart: number,
  rangeEnd: number,
  intervalStartIso: string | null | undefined,
  intervalEndIso: string | null | undefined
): boolean {
  const a = intervalStartIso != null ? new Date(intervalStartIso).getTime() : -Infinity;
  const b = intervalEndIso != null ? new Date(intervalEndIso).getTime() : Infinity;
  return !(b < rangeStart || a > rangeEnd);
}
