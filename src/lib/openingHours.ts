export const OPENING_DAY_KEYS = [
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
  'sun',
] as const;

export type OpeningDayKey = (typeof OPENING_DAY_KEYS)[number];

export type DayHours = {
  closed: boolean;
  open: string;
  close: string;
};

export type WeeklyOpeningHours = Partial<Record<OpeningDayKey, DayHours>>;

export const OPENING_DAY_LABELS: Record<OpeningDayKey, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

export function closedDay(): DayHours {
  return { closed: true, open: '09:00', close: '18:00' };
}

export function defaultWeeklyOpeningHours(): Record<OpeningDayKey, DayHours> {
  const day: DayHours = { closed: false, open: '09:00', close: '18:00' };
  return {
    mon: { ...day },
    tue: { ...day },
    wed: { ...day },
    thu: { ...day },
    fri: { ...day },
    sat: { ...day },
    sun: { ...closedDay() },
  };
}

/** Normalize JSON from DB into editor shape (missing days filled as closed). */
export function weeklyFromJson(value: unknown): Record<OpeningDayKey, DayHours> {
  const base = defaultWeeklyOpeningHours();
  if (!value || typeof value !== 'object' || Array.isArray(value)) return base;
  const obj = value as Record<string, unknown>;
  for (const key of OPENING_DAY_KEYS) {
    const raw = obj[key];
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    const closed = Boolean((raw as { closed?: unknown }).closed);
    const open = String((raw as { open?: unknown }).open ?? '09:00').slice(0, 5);
    const close = String((raw as { close?: unknown }).close ?? '18:00').slice(0, 5);
    base[key] = { closed, open, close };
  }
  return base;
}

/** Strip to JSON for DB: only include days that differ from default, or full object — store full for simplicity. */
export function weeklyToJson(hours: Record<OpeningDayKey, DayHours>): WeeklyOpeningHours {
  const out: WeeklyOpeningHours = {};
  for (const key of OPENING_DAY_KEYS) {
    const h = hours[key];
    if (h) out[key] = { closed: h.closed, open: h.open, close: h.close };
  }
  return out;
}
