import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LogCoffeeNavButton } from '@/components/LogCoffeeNavButton';
import { ProgressBar } from '@/components/ProgressBar';
import { LogCoffeeEntryModals } from '@/components/LogCoffeeEntryModals';
import { useAuth } from '@/contexts/AuthContext';
import { useMonthCoffeeCount, useMonthCoffeeDayCounts } from '@/hooks/useCoffees';
import { useLogCoffeeEntry } from '@/hooks/useLogCoffeeEntry';
import { useMonthlyCoffeeOffers, groupCoffeeOffersByDate, type CoffeeOffer } from '@/hooks/useCoffeeOffers';
import { CalendarDayCell } from '@/components/CalendarDayCell';
import { CoffeeOfferDetailModal } from '@/components/CoffeeOfferDetailModal';
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
  const [selectedCoffeeOffer, setSelectedCoffeeOffer] = useState<CoffeeOffer | null>(null);
  const [coffeeOfferModalOpen, setCoffeeOfferModalOpen] = useState(false);
  
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  
  const monthCount = useMonthCoffeeCount();
  const { data: coffeeDayCounts = {}, isLoading: coffeeCountsLoading } = useMonthCoffeeDayCounts(year, month);
  const { data: coffeeOffers = [] } = useMonthlyCoffeeOffers(year, month);

  // Get first day of month and total days
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Group coffee offers by date
  const coffeeOffersByDate = groupCoffeeOffersByDate(coffeeOffers);

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
      <div className="sticky top-0 z-10 bg-background py-4 px-4 border-b border-border">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div />
          <h1 className="text-2xl font-black uppercase tracking-tight text-center truncate min-w-0">
            Calendar
          </h1>
          <div className="flex justify-end">
            <LogCoffeeNavButton
              onClick={logCoffee.startLogCoffee}
              disabled={logCoffee.addCoffeePending}
            />
          </div>
        </div>
      </div>

      <div className="container px-4 py-6">
        {/* Month Navigation */}
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

        {/* Day Headers */}
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

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for days before first of month */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[60px]" />
          ))}

          {/* Days of month */}
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
                coffeeOffers={dayCoffeeOffers}
                onCoffeeOfferClick={handleCoffeeOfferClick}
              />
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-8 flex items-center justify-center gap-6 text-sm flex-wrap">
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
          <div className="flex items-center gap-2">
            <div className="w-6 h-4 bg-orange-500 text-white text-[8px] flex items-center justify-center font-medium">
              $17
            </div>
            <span className="text-muted-foreground">$17coffee</span>
          </div>
        </div>
      </div>

      <ProgressBar placement="bottom" monthCount={monthCount.data || 0} />

      <LogCoffeeEntryModals
        detailsSheetOpen={logCoffee.detailsSheetOpen}
        onDetailsSheetOpenChange={logCoffee.setDetailsSheetOpen}
        celebrationOpen={logCoffee.celebrationOpen}
        onCelebrationOpenChange={logCoffee.setCelebrationOpen}
        onDetailsSave={logCoffee.handleDetailsSave}
        addCoffeePending={logCoffee.addCoffeePending}
        percentBeat={logCoffee.percentBeat}
      />

      {/* Coffee Offer Detail Modal */}
      <CoffeeOfferDetailModal
        offer={selectedCoffeeOffer}
        open={coffeeOfferModalOpen}
        onOpenChange={setCoffeeOfferModalOpen}
      />
    </div>
  );
}
