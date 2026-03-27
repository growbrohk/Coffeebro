import { localYMD } from '@/lib/date';

/** Consecutive local days with ≥1 log, counting backward from `todayYmd` (inclusive). */
export function computeCoffeeStreakFromToday(loggedDays: Set<string>, todayYmd: string): number {
  let streak = 0;
  let cur = todayYmd;
  while (loggedDays.has(cur)) {
    streak += 1;
    const [y, m, d] = cur.split('-').map(Number);
    const prev = new Date(y, m - 1, d - 1);
    cur = localYMD(prev);
  }
  return streak;
}
