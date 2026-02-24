import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ProgressBar';
import { useAuth } from '@/contexts/AuthContext';
import { useMonthCoffeeCount, useMonthCoffeeDayCounts } from '@/hooks/useCoffees';
import { useMonthlyEvents, groupEventsByDate, type RunClubEvent } from '@/hooks/useEvents';
import { useUserEventRegistrations } from '@/hooks/useEventRegistrations';
import { CalendarDayCell } from '@/components/CalendarDayCell';
import { EventDetailModal } from '@/components/EventDetailModal';
import { localYMD } from '@/lib/date';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function CalendarPage() {
  const { user, loading } = useAuth();
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<RunClubEvent | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  
  const monthCount = useMonthCoffeeCount();
  const { data: coffeeDayCounts = {}, isLoading: coffeeCountsLoading } = useMonthCoffeeDayCounts(year, month);
  const { data: events = [] } = useMonthlyEvents(year, month);
  const { data: registrations = [] } = useUserEventRegistrations();

  // Get first day of month and total days
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Group events by date
  const eventsByDate = groupEventsByDate(events);
  
  // Create set of registered event IDs for quick lookup
  const registeredEventIds = useMemo(() => {
    return new Set(registrations.map(r => r.event_id));
  }, [registrations]);

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

  const handleEventClick = (event: RunClubEvent) => {
    setSelectedEvent(event);
    setModalOpen(true);
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
      <ProgressBar monthCount={monthCount.data || 0} />

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
            const dayEvents = eventsByDate.get(day) || [];

            return (
              <CalendarDayCell
                key={day}
                day={day}
                coffeeCount={coffeeCount}
                isToday={isToday}
                events={dayEvents}
                registeredEventIds={registeredEventIds}
                onEventClick={handleEventClick}
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
          {events.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-6 h-4 bg-muted text-[8px] flex items-center justify-center">
                Event
              </div>
              <span className="text-muted-foreground">Event</span>
            </div>
          )}
        </div>
      </div>

      {/* Event Detail Modal */}
      <EventDetailModal 
        event={selectedEvent} 
        open={modalOpen} 
        onOpenChange={setModalOpen} 
      />
    </div>
  );
}
