import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LogCoffeeNavButton } from '@/components/LogCoffeeNavButton';
import { CoffeeCupIcon, COFFEE_CUP_FILL_1, COFFEE_CUP_FILL_2, COFFEE_CUP_FILL_3 } from '@/components/CoffeeCupMark';
import { useAuth } from '@/contexts/AuthContext';
import {
  useMonthCoffeeDayCounts,
  useMonthlyCoffees,
  useCalendarMonthCoffeeCount,
  useCoffeeStreak,
} from '@/hooks/useCoffees';
import { useLogCoffeeEntry } from '@/hooks/useLogCoffeeEntry';
import { CalendarDayCell } from '@/components/CalendarDayCell';
import { localYMD } from '@/lib/date';
import type { Database } from '@/integrations/supabase/types';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** 9-column grid: spacer | 7 days | spacer — matches `week` row layout */
const WEEK_GRID = 'grid grid-cols-[2.25rem_repeat(7,minmax(0,1fr))_2.25rem] gap-x-1 gap-y-0';

type DailyCoffeeRow = Database['public']['Tables']['daily_coffees']['Row'];

function buildMonthWeeks(daysInMonth: number, firstDay: number): (number | null)[][] {
  const weeks: (number | null)[][] = [];
  let row: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) row.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    row.push(d);
    if (row.length === 7) {
      weeks.push(row);
      row = [];
    }
  }
  if (row.length > 0) {
    while (row.length < 7) row.push(null);
    weeks.push(row);
  }
  return weeks;
}

function drinkLabel(row: DailyCoffeeRow): string {
  if (row.log_item === 'Other') {
    return row.log_item_other?.trim() || 'Coffee';
  }
  return row.log_item?.trim() || 'Coffee';
}

/** Third row of the grid when there are ≥3 weeks; otherwise last row. */
function showMonthChevronsOnWeek(weekIndex: number, weekCount: number): boolean {
  if (weekCount <= 0) return false;
  if (weekCount > 2) return weekIndex === 2;
  return weekIndex === weekCount - 1;
}

export default function CalendarPage() {
  const { loading } = useAuth();
  const logCoffee = useLogCoffeeEntry();
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(() => new Date().getDate());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const { data: viewMonthCoffeeTotal = 0 } = useCalendarMonthCoffeeCount(year, month);
  const { data: streak = 0 } = useCoffeeStreak();
  const { data: coffeeDayCounts = {} } = useMonthCoffeeDayCounts(year, month);
  const { data: monthCoffees = [] } = useMonthlyCoffees(year, month);

  const firstDay = new Date(year, month, 1).getDay();
  const weeks = useMemo(() => buildMonthWeeks(daysInMonth, firstDay), [daysInMonth, firstDay]);

  useEffect(() => {
    const now = new Date();
    const viewingCurrentMonth = now.getFullYear() === year && now.getMonth() === month;
    if (viewingCurrentMonth) {
      setSelectedDay(Math.min(now.getDate(), daysInMonth));
    } else {
      setSelectedDay(1);
    }
  }, [year, month, daysInMonth]);

  const selectedYmd = localYMD(new Date(year, month, selectedDay));

  const coffeesForSelectedDay = useMemo(() => {
    const rows = monthCoffees.filter((r) => r.coffee_date === selectedYmd);
    return [...rows].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [monthCoffees, selectedYmd]);

  const goToPrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setViewDate(new Date());
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-calendar-cream">
        <div className="animate-pulse text-lg font-semibold">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-calendar-cream pb-24">
      <div className="container px-4 pt-6">
        {/* Header — #F9F6F1 (page bg) */}
        <div className="mb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-foreground">
                <span className="text-4xl font-bold tabular-nums tracking-normal">
                  {viewMonthCoffeeTotal}
                </span>
                <span className="text-2xl font-bold"> coffee</span>
              </p>
            </div>
            <LogCoffeeNavButton
              label="log a coffee"
              onClick={logCoffee.startLogCoffee}
              disabled={logCoffee.addCoffeePending}
            />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            You have {streak} coffee streaks!
          </p>
        </div>

        {/* Calendar + legend — #FFFFFF */}
        <div className="-mx-4 bg-white px-4 pb-5 pt-1">
          <div className="min-w-0">
          {/* Month label — mb-3, compact like reference */}
          <button
            type="button"
            onClick={goToToday}
            className="mb-3 block w-full text-left font-heading text-lg font-bold tracking-normal text-foreground"
          >
            {MONTHS[month]}
          </button>

          {/* Weekday row + calendar grid — mb-4 to legend */}
          <div className="mb-4">
            <div className={`${WEEK_GRID} mb-1.5`}>
              <div className="min-h-0 w-9 shrink-0" aria-hidden />
              {DAYS.map((day, i) => (
                <div
                  key={i}
                  className="py-1 text-center text-xs font-bold uppercase tracking-wide text-primary"
                >
                  {day}
                </div>
              ))}
              <div className="min-h-0 w-9 shrink-0" aria-hidden />
            </div>

            <div className="space-y-0">
              {weeks.map((week, wi) => {
                const showChevrons = showMonthChevronsOnWeek(wi, weeks.length);
                return (
                  <div
                    key={wi}
                    className={`${WEEK_GRID} overflow-visible calendar-tracking-week-row items-stretch`}
                  >
                    {showChevrons ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 self-center text-foreground"
                        onClick={goToPrevMonth}
                        aria-label="Previous month"
                      >
                        <ChevronLeft size={22} strokeWidth={2} />
                      </Button>
                    ) : (
                      <div className="h-9 w-9 shrink-0 self-center" aria-hidden />
                    )}
                    {week.map((day, di) =>
                      day == null ? (
                        <div key={`e-${wi}-${di}`} className="aspect-square w-full min-h-0" />
                      ) : (
                        <CalendarDayCell
                          key={day}
                          day={day}
                          coffeeCount={coffeeDayCounts[localYMD(new Date(year, month, day))] || 0}
                          isToday={isCurrentMonth && today.getDate() === day}
                          isSelected={selectedDay === day}
                          onSelectDay={() => setSelectedDay(day)}
                        />
                      )
                    )}
                    {showChevrons ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 self-center text-foreground"
                        onClick={goToNextMonth}
                        aria-label="Next month"
                      >
                        <ChevronRight size={22} strokeWidth={2} />
                      </Button>
                    ) : (
                      <div className="h-9 w-9 shrink-0 self-center" aria-hidden />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend — mt-5 to log list (outside card) */}
          <div className="flex flex-nowrap items-center justify-center gap-2.5 text-xs text-muted-foreground">
            <div className="flex shrink-0 items-center gap-1">
              <CoffeeCupIcon fill={COFFEE_CUP_FILL_1} className="h-5 w-5 shrink-0 opacity-90" />
              <span>1 coffee</span>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <CoffeeCupIcon fill={COFFEE_CUP_FILL_2} className="h-5 w-5 shrink-0 opacity-90" />
              <span>2 coffee</span>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <CoffeeCupIcon fill={COFFEE_CUP_FILL_3} className="h-5 w-5 shrink-0 opacity-90" />
              <span>3+ coffee</span>
            </div>
          </div>
          </div>
        </div>

        {/* Log list — #F9F6F1 (page bg) */}
        <div className="mt-5 min-w-0">
          {coffeesForSelectedDay.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No coffees logged this day.
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-border/60">
              {coffeesForSelectedDay.map((entry) => {
                const t = new Date(entry.created_at).toLocaleTimeString(undefined, {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                });
                const tastingText = entry.tasting_notes?.trim();
                return (
                  <div
                    key={entry.id}
                    className="flex items-start gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <CoffeeCupIcon
                      fill={COFFEE_CUP_FILL_3}
                      className="mt-0.5 h-8 w-8 shrink-0"
                    />
                    <p className="shrink-0 pt-0.5 text-sm font-normal tabular-nums leading-tight text-foreground">
                      {t}
                    </p>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 truncate text-base font-bold leading-snug text-foreground">
                        {entry.log_type === 'voucher' ? (
                          <Ticket className="h-4 w-4 shrink-0 text-primary" aria-label="Voucher" />
                        ) : null}
                        <span className="truncate">{drinkLabel(entry)}</span>
                        {entry.log_type === 'voucher' ? (
                          <span className="shrink-0 text-xs font-normal text-muted-foreground">Voucher</span>
                        ) : null}
                      </p>
                      {entry.place?.trim() ? (
                        <p className="mt-0.5 truncate text-sm font-normal leading-snug text-muted-foreground">
                          {entry.place.trim()}
                        </p>
                      ) : null}
                      {tastingText ? (
                        <p className="mt-1 text-sm font-normal leading-snug text-muted-foreground">
                          {tastingText}
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
