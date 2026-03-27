import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogCoffeeNavButton } from '@/components/LogCoffeeNavButton';
import { LogCoffeeEntryModals } from '@/components/LogCoffeeEntryModals';
import { CalendarVoucherOfferCard } from '@/components/CalendarVoucherOfferCard';
import { CoffeeCupIcon, COFFEE_CUP_FILL_1, COFFEE_CUP_FILL_2, COFFEE_CUP_FILL_3 } from '@/components/CoffeeCupMark';
import { useAuth } from '@/contexts/AuthContext';
import {
  useMonthCoffeeDayCounts,
  useMonthlyCoffees,
  useCalendarMonthCoffeeCount,
  useCoffeeStreak,
} from '@/hooks/useCoffees';
import { useLogCoffeeEntry } from '@/hooks/useLogCoffeeEntry';
import {
  useMonthlyCoffeeOffers,
  useMonthlyHuntOffersForVoucherCalendar,
  groupCoffeeOffersByDate,
  huntOfferActiveOnLocalDay,
  buildHuntOfferCountsByDay,
  normalizeHuntTreasure,
  type CoffeeOffer,
} from '@/hooks/useCoffeeOffers';
import { CalendarDayCell, type CalendarDayCellVariant } from '@/components/CalendarDayCell';
import { CoffeeOfferDetailModal } from '@/components/CoffeeOfferDetailModal';
import { TreasureDetailModal } from '@/components/TreasureDetailModal';
import { localYMD } from '@/lib/date';
import { cn } from '@/lib/utils';
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
  const [calendarTab, setCalendarTab] = useState<CalendarDayCellVariant>('vouchers');
  const [selectedDay, setSelectedDay] = useState(() => new Date().getDate());
  const [selectedCoffeeOffer, setSelectedCoffeeOffer] = useState<CoffeeOffer | null>(null);
  const [coffeeOfferModalOpen, setCoffeeOfferModalOpen] = useState(false);
  const [treasureModalTarget, setTreasureModalTarget] = useState<{
    huntId: string;
    treasureId: string;
  } | null>(null);
  const [voucherSubTab, setVoucherSubTab] = useState<'grab' | 'hunt'>('grab');

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const { data: viewMonthCoffeeTotal = 0 } = useCalendarMonthCoffeeCount(year, month);
  const { data: streak = 0 } = useCoffeeStreak();
  const { data: coffeeDayCounts = {} } = useMonthCoffeeDayCounts(year, month);
  const { data: monthCoffees = [] } = useMonthlyCoffees(year, month);
  const { data: coffeeOffers = [] } = useMonthlyCoffeeOffers(year, month);
  const { data: huntOffersMonth = [] } = useMonthlyHuntOffersForVoucherCalendar(year, month);

  const firstDay = new Date(year, month, 1).getDay();
  const weeks = useMemo(() => buildMonthWeeks(daysInMonth, firstDay), [daysInMonth, firstDay]);

  const coffeeOffersByDate = groupCoffeeOffersByDate(coffeeOffers);

  const huntCountByDay = useMemo(
    () => buildHuntOfferCountsByDay(huntOffersMonth, year, month, daysInMonth),
    [huntOffersMonth, year, month, daysInMonth]
  );

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

  const calendarOffersForSelectedDay = useMemo(
    () => coffeeOffers.filter((o) => o.event_date === selectedYmd),
    [coffeeOffers, selectedYmd]
  );

  const huntOffersForSelectedDay = useMemo(
    () => huntOffersMonth.filter((row) => huntOfferActiveOnLocalDay(row, year, month, selectedDay)),
    [huntOffersMonth, year, month, selectedDay]
  );

  const totalOffersForSelectedDay =
    calendarOffersForSelectedDay.length + huntOffersForSelectedDay.length;

  const grabCountSelected = calendarOffersForSelectedDay.length;
  const huntCountSelected = huntOffersForSelectedDay.length;

  useEffect(() => {
    if (voucherSubTab === 'grab' && grabCountSelected === 0 && huntCountSelected > 0) {
      setVoucherSubTab('hunt');
    } else if (voucherSubTab === 'hunt' && huntCountSelected === 0 && grabCountSelected > 0) {
      setVoucherSubTab('grab');
    }
  }, [selectedYmd, voucherSubTab, grabCountSelected, huntCountSelected]);

  const offersHeading = useMemo(() => {
    const d = new Date(year, month, selectedDay);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, [year, month, selectedDay]);

  const isLoading = loading;

  const goToPrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setViewDate(new Date());
  };

  const handleCoffeeOfferClick = (offer: CoffeeOffer) => {
    setSelectedCoffeeOffer(offer);
    setCoffeeOfferModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-lg font-semibold">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Tabs
        value={calendarTab}
        onValueChange={(v) => setCalendarTab(v as CalendarDayCellVariant)}
        className="flex flex-col"
      >
        <div className="sticky top-0 z-10 bg-background py-4 px-4 border-b border-border">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <div />
            <h1 className="text-2xl font-black uppercase tracking-tight text-center truncate min-w-0">
              Calendar
            </h1>
            <div />
          </div>
          <TabsList className="w-full grid grid-cols-2 mt-3 h-10">
            <TabsTrigger value="vouchers">Vouchers</TabsTrigger>
            <TabsTrigger value="tracking">Tracking</TabsTrigger>
          </TabsList>
        </div>

        <div className="container px-4 py-6">
          {calendarTab === 'tracking' && (
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
                <CoffeeCupIcon fill={COFFEE_CUP_FILL_1} className="h-5 w-5" />
                <span>You have {streak} coffee streaks!</span>
              </div>
            </div>
          )}

          <div
            className={cn(
              calendarTab === 'tracking' && 'rounded-xl border border-border bg-card px-3 pb-4 pt-3'
            )}
          >
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
                  className={cn(
                    'py-1 text-center text-sm font-semibold',
                    calendarTab === 'tracking'
                      ? 'font-bold text-primary'
                      : 'text-muted-foreground'
                  )}
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="space-y-0">
              {weeks.map((week, wi) => (
                <div
                  key={wi}
                  className={cn(
                    'grid grid-cols-7 gap-0.5',
                    calendarTab === 'tracking' && 'calendar-tracking-week-row'
                  )}
                >
                  {week.map((day, di) =>
                    day == null ? (
                      <div key={`e-${wi}-${di}`} className="min-h-[52px]" />
                    ) : (
                      <CalendarDayCell
                        key={day}
                        day={day}
                        coffeeCount={coffeeDayCounts[localYMD(new Date(year, month, day))] || 0}
                        isToday={isCurrentMonth && today.getDate() === day}
                        variant={calendarTab}
                        grabCount={coffeeOffersByDate.get(day)?.length ?? 0}
                        huntCount={huntCountByDay.get(day) ?? 0}
                        isSelected={selectedDay === day}
                        onSelectDay={() => setSelectedDay(day)}
                      />
                    )
                  )}
                </div>
              ))}
            </div>

            {calendarTab === 'tracking' && (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <CoffeeCupIcon fill={COFFEE_CUP_FILL_1} className="h-6 w-6" />
                  <span className="text-foreground">1 coffee</span>
                </div>
                <div className="flex items-center gap-2">
                  <CoffeeCupIcon fill={COFFEE_CUP_FILL_2} className="h-6 w-6" />
                  <span className="text-foreground">2 coffee</span>
                </div>
                <div className="flex items-center gap-2">
                  <CoffeeCupIcon fill={COFFEE_CUP_FILL_3} className="h-6 w-6" />
                  <span className="text-foreground">3+ coffee</span>
                </div>
              </div>
            )}
          </div>

          <TabsContent value="vouchers" className="mt-4 focus-visible:ring-0 focus-visible:ring-offset-0">
            <h2 className="text-sm font-semibold text-foreground mb-3">
              {totalOffersForSelectedDay}{' '}
              {totalOffersForSelectedDay === 1 ? 'offer' : 'offers'} for {offersHeading}
            </h2>
            {grabCountSelected === 0 && huntCountSelected === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No offers this day.</p>
            ) : (
              <Tabs
                value={voucherSubTab}
                onValueChange={(v) => setVoucherSubTab(v as 'grab' | 'hunt')}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2 h-auto p-1 gap-1">
                  <TabsTrigger
                    value="grab"
                    className="flex flex-col gap-0.5 py-2 px-2 h-auto min-h-0 whitespace-normal text-center data-[state=active]:text-foreground"
                  >
                    <span className="text-sm font-medium leading-tight">
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">G</span>
                      {` Grab Mode (${grabCountSelected})`}
                    </span>
                    <span className="text-xs text-muted-foreground leading-tight">Grab in-app</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="hunt"
                    className="flex flex-col gap-0.5 py-2 px-2 h-auto min-h-0 whitespace-normal text-center data-[state=active]:text-foreground"
                  >
                    <span className="text-sm font-medium leading-tight">
                      <span className="font-semibold text-orange-700 dark:text-orange-400">H</span>
                      {` Hunt Mode (${huntCountSelected})`}
                    </span>
                    <span className="text-xs text-muted-foreground leading-tight">Hunt in-life</span>
                  </TabsTrigger>
                </TabsList>
                <TabsContent
                  value="grab"
                  className="mt-4 flex flex-col gap-4 focus-visible:ring-0 focus-visible:ring-offset-0"
                >
                  {grabCountSelected === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No Grab offers this day.</p>
                  ) : (
                    calendarOffersForSelectedDay.map((offer) => (
                      <CalendarVoucherOfferCard
                        key={`cal-${offer.id}`}
                        kind="calendar"
                        offer={offer}
                        onDetails={() => handleCoffeeOfferClick(offer)}
                      />
                    ))
                  )}
                </TabsContent>
                <TabsContent
                  value="hunt"
                  className="mt-4 flex flex-col gap-4 focus-visible:ring-0 focus-visible:ring-offset-0"
                >
                  {huntCountSelected === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No Hunt offers this day.</p>
                  ) : (
                    huntOffersForSelectedDay.map((row) => {
                      const tr = normalizeHuntTreasure(row.treasures);
                      if (!tr) return null;
                      return (
                        <CalendarVoucherOfferCard
                          key={`hunt-${row.id}`}
                          kind="hunt"
                          row={row}
                          treasure={tr}
                          onDetails={() =>
                            setTreasureModalTarget({
                              huntId: tr.hunt_id,
                              treasureId: tr.id,
                            })
                          }
                        />
                      );
                    })
                  )}
                </TabsContent>
              </Tabs>
            )}
          </TabsContent>

          <TabsContent value="tracking" className="mt-4 focus-visible:ring-0 focus-visible:ring-offset-0">
            <div className="rounded-xl bg-muted px-4 py-2">
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
          </TabsContent>
        </div>
      </Tabs>

      <LogCoffeeEntryModals
        detailsSheetOpen={logCoffee.detailsSheetOpen}
        onDetailsSheetOpenChange={logCoffee.setDetailsSheetOpen}
        celebrationOpen={logCoffee.celebrationOpen}
        onCelebrationOpenChange={logCoffee.setCelebrationOpen}
        onDetailsSave={logCoffee.handleDetailsSave}
        addCoffeePending={logCoffee.addCoffeePending}
        percentBeat={logCoffee.percentBeat}
      />

      <CoffeeOfferDetailModal
        offer={selectedCoffeeOffer}
        open={coffeeOfferModalOpen}
        onOpenChange={setCoffeeOfferModalOpen}
      />

      <TreasureDetailModal
        huntId={treasureModalTarget?.huntId ?? ''}
        treasureId={treasureModalTarget?.treasureId ?? ''}
        open={!!treasureModalTarget}
        onOpenChange={(open) => {
          if (!open) setTreasureModalTarget(null);
        }}
      />
    </div>
  );
}
