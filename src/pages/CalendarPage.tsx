import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LogCoffeeNavButton } from '@/components/LogCoffeeNavButton';
import { LogCoffeeEntryModals } from '@/components/LogCoffeeEntryModals';
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

const MONTHS_LOWER = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

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
  if (row.coffee_type === 'Other') {
    return row.coffee_type_other?.trim() || 'Coffee';
  }
  return row.coffee_type?.trim() || 'Coffee';
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-lg font-semibold">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="container px-4 py-6">
        <div className="mb-5 rounded-xl bg-muted px-4 py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm lowercase text-muted-foreground">
                in {MONTHS_LOWER[month]}, you drank
              </p>
              <p className="text-3xl font-bold tracking-tight text-foreground">
                {viewMonthCoffeeTotal} coffee
              </p>
            </div>
            <LogCoffeeNavButton
              onClick={logCoffee.startLogCoffee}
              disabled={logCoffee.addCoffeePending}
            />
          </div>
          <div className="mt-3 flex items-center gap-2 text-sm text-foreground">
            <CoffeeCupIcon fill={COFFEE_CUP_FILL_1} className="h-5 w-5 shrink-0" />
            <span>You have {streak} coffee streaks!</span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card px-3 pb-4 pt-3">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" onClick={goToPrevMonth}>
              <ChevronLeft size={24} />
            </Button>

            <button
              type="button"
              onClick={goToToday}
              className="text-xl font-bold uppercase tracking-tight"
            >
              {MONTHS[month]} {year}
            </button>

            <Button variant="ghost" size="icon" onClick={goToNextMonth}>
              <ChevronRight size={24} />
            </Button>
          </div>

          <div className="grid grid-cols-7 mb-1.5">
            {DAYS.map((day, i) => (
              <div
                key={i}
                className="py-1 text-center text-sm font-bold text-primary"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="space-y-0">
            {weeks.map((week, wi) => (
              <div
                key={wi}
                className="grid grid-cols-7 gap-0.5 overflow-visible calendar-tracking-week-row"
              >
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
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-nowrap items-center justify-center gap-2.5 text-xs">
            <div className="flex shrink-0 items-center gap-1">
              <CoffeeCupIcon fill={COFFEE_CUP_FILL_1} className="h-6 w-6" />
              <span className="text-foreground">1 coffee</span>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <CoffeeCupIcon fill={COFFEE_CUP_FILL_2} className="h-6 w-6" />
              <span className="text-foreground">2 coffee</span>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <CoffeeCupIcon fill={COFFEE_CUP_FILL_3} className="h-6 w-6" />
              <span className="text-foreground">3+ coffee</span>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-muted px-4 py-2">
          {coffeesForSelectedDay.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No coffees logged this day.
            </p>
          ) : (
            coffeesForSelectedDay.map((entry) => {
              const t = new Date(entry.created_at).toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              });
              const noteText = entry.note?.trim();
              const diaryFallback = entry.diary?.trim();
              return (
                <div
                  key={entry.id}
                  className="flex gap-3 border-b border-border/60 py-4 last:border-b-0"
                >
                  <CoffeeCupIcon fill={COFFEE_CUP_FILL_3} className="mt-0.5 h-8 w-8 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs text-muted-foreground">{t}</p>
                    <p className="font-bold text-foreground">{drinkLabel(entry)}</p>
                    {entry.place?.trim() ? (
                      <p className="text-sm capitalize text-foreground">{entry.place.trim()}</p>
                    ) : null}
                    {noteText ? (
                      <p className="mt-1 text-sm text-muted-foreground">{noteText}</p>
                    ) : diaryFallback ? (
                      <p className="mt-1 text-sm text-muted-foreground">{diaryFallback}</p>
                    ) : null}
                    {entry.beans?.trim() ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Beans: {entry.beans.trim()}
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <LogCoffeeEntryModals
        detailsSheetOpen={logCoffee.detailsSheetOpen}
        onDetailsSheetOpenChange={logCoffee.setDetailsSheetOpen}
        celebrationOpen={logCoffee.celebrationOpen}
        onCelebrationOpenChange={logCoffee.setCelebrationOpen}
        onDetailsSave={logCoffee.handleDetailsSave}
        addCoffeePending={logCoffee.addCoffeePending}
        percentBeat={logCoffee.percentBeat}
      />
    </div>
  );
}
