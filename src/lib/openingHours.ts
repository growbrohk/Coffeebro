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

function openingDayKeyFromDate(dateStr: string): OpeningDayKey {
  const d = new Date(`${dateStr}T12:00:00`);
  const jsDay = d.getDay();
  const keys: OpeningDayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return keys[jsDay] ?? 'mon';
}

function compactTime(isoTime: string): string {
  return isoTime.replace(':', '').replace(/\D/g, '').slice(0, 4);
}

export function dayLineForDate(openingHours: unknown, dateStr: string): string {
  const weekly = weeklyFromJson(openingHours);
  const key = openingDayKeyFromDate(dateStr);
  const h = weekly[key];
  if (h.closed) return 'Closed';
  return `${compactTime(h.open)}-${compactTime(h.close)}`;
}

function hktTimeParts(at: Date): { dateKey: string; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Hong_Kong',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(at);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const dateKey = `${get('year')}-${get('month')}-${get('day')}`;
  const minutes = Number(get('hour')) * 60 + Number(get('minute'));
  return { dateKey, minutes };
}

function parseHm(value: string): number {
  const [h, m] = value.slice(0, 5).split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Whether an org is open at `at` on calendar date `dateStr` (YYYY-MM-DD, HKT). */
export function isOrgOpenAt(openingHours: unknown, at: Date, dateStr: string): boolean {
  const { dateKey, minutes } = hktTimeParts(at);
  if (dateKey !== dateStr) return false;

  const weekly = weeklyFromJson(openingHours);
  const key = openingDayKeyFromDate(dateStr);
  const h = weekly[key];
  if (h.closed) return false;

  const openMin = parseHm(h.open);
  const closeMin = parseHm(h.close);
  return minutes >= openMin && minutes <= closeMin;
}
