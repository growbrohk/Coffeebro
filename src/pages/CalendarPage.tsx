import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogCoffeeNavButton } from '@/components/LogCoffeeNavButton';
import { ProgressBar } from '@/components/ProgressBar';
import { LogCoffeeEntryModals } from '@/components/LogCoffeeEntryModals';
import { CalendarVoucherOfferCard } from '@/components/CalendarVoucherOfferCard';
import { useAuth } from '@/contexts/AuthContext';
import { useMonthCoffeeCount, useMonthCoffeeDayCounts } from '@/hooks/useCoffees';
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

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

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
  
  const monthCount = useMonthCoffeeCount();
  const { data: coffeeDayCounts = {} } = useMonthCoffeeDayCounts(year, month);
  const { data: coffeeOffers = [] } = useMonthlyCoffeeOffers(year, month);
  const { data: huntOffersMonth = [] } = useMonthlyHuntOffersForVoucherCalendar(year, month);

  const firstDay = new Date(year, month, 1).getDay();

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
            <div className="flex justify-end">
              {calendarTab === 'tracking' && (
                <LogCoffeeNavButton
                  onClick={logCoffee.startLogCoffee}
                  disabled={logCoffee.addCoffeePending}
                />
              )}
            </div>
          </div>
          <TabsList className="w-full grid grid-cols-2 mt-3 h-10">
            <TabsTrigger value="vouchers">Vouchers</TabsTrigger>
            <TabsTrigger value="tracking">Tracking</TabsTrigger>
          </TabsList>
        </div>

        <div className="container px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" size="icon" onClick={goToPrevMonth}>
              <ChevronLeft size={24} />
            </Button>
            
            <button 
              onClick={goToToday}
              className="text-xl font-bold uppercase tracking-tight"
            >
              {MONTHS[month]} {year}
            </button>
            
            <Button variant="ghost" size="icon" onClick={goToNextMonth}>
              <ChevronRight size={24} />
            </Button>
          </div>

          <div className="grid grid-cols-7 mb-2">
            {DAYS.map((day, i) => (
              <div 
                key={i} 
                className="text-center text-sm font-semibold text-muted-foreground py-2"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[60px]" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateKey = localYMD(new Date(year, month, day));
              const coffeeCount = coffeeDayCounts[dateKey] || 0;
              const isToday = isCurrentMonth && today.getDate() === day;
              const dayCoffeeOffers = coffeeOffersByDate.get(day) || [];

              return (
                <CalendarDayCell
                  key={day}
                  day={day}
                  coffeeCount={coffeeCount}
                  isToday={isToday}
                  variant={calendarTab}
                  grabCount={dayCoffeeOffers.length}
                  huntCount={huntCountByDay.get(day) ?? 0}
                  isSelected={calendarTab === 'vouchers' && selectedDay === day}
                  onSelectDay={
                    calendarTab === 'vouchers' ? () => setSelectedDay(day) : undefined
                  }
                />
              );
            })}
          </div>

          <TabsContent value="vouchers" className="mt-8 focus-visible:ring-0 focus-visible:ring-offset-0">
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

          <TabsContent value="tracking" className="mt-8 focus-visible:ring-0 focus-visible:ring-offset-0">
            <div className="flex items-center justify-center gap-6 text-sm flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-muted/30 border border-border" />
                <span className="text-muted-foreground">1 coffee</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-muted/60 border border-border" />
                <span className="text-muted-foreground">2 coffees</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-foreground text-background text-[10px] flex items-center justify-center font-bold">
                  3+
                </div>
                <span className="text-muted-foreground">3+ coffees</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 border-2 border-foreground" />
                <span className="text-muted-foreground">Today</span>
              </div>
            </div>
          </TabsContent>
        </div>

        {calendarTab === 'tracking' && (
          <ProgressBar placement="bottom" monthCount={monthCount.data || 0} />
        )}
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
