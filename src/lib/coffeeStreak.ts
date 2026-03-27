import { localYMD } from '@/lib/date';

/** Consecutive days with at least one log, counting backward from todayYmd (inclusive). */
export function computeCoffeeStreakFromToday(loggedDays: Set<string>, todayYmd: string): number {
  const d = new Date(`${todayYmd}T12:00:00`);
  let streak = 0;
  while (loggedDays.has(localYMD(d))) {
    streak += 1;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}
