import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ProgressBar';
import { useAuth } from '@/contexts/AuthContext';
import { useMonthlyCoffees, useCurrentMonthProgress } from '@/hooks/useCoffees';
import { useMonthlyEvents, groupEventsByDate, type RunClubEvent } from '@/hooks/useEvents';
import { useUserEventRegistrations } from '@/hooks/useEventRegistrations';
import { CalendarDayCell } from '@/components/CalendarDayCell';
import { EventDetailModal } from '@/components/EventDetailModal';
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
  
  const { data: progress } = useCurrentMonthProgress();
  const { data: coffees = [] } = useMonthlyCoffees(viewDate.getFullYear(), viewDate.getMonth());
  const { data: events = [] } = useMonthlyEvents(viewDate.getFullYear(), viewDate.getMonth());
  const { data: registrations = [] } = useUserEventRegistrations();

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  // Get first day of month and total days
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Create coffee dates set for quick lookup (only if user is logged in)
  const coffeeDates = user ? new Set(coffees.map(c => new Date(c.coffee_date).getDate())) : new Set<number>();
  
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
      <ProgressBar 
        current={user ? (progress?.completed || 0) : 0} 
        total={progress?.total || 30} 
      />

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
            const hasCoffee = coffeeDates.has(day);
            const isToday = isCurrentMonth && today.getDate() === day;
            const dayEvents = eventsByDate.get(day) || [];

            return (
              <CalendarDayCell
                key={day}
                day={day}
                hasRun={hasCoffee}
                isToday={isToday}
                events={dayEvents}
                registeredEventIds={registeredEventIds}
                onEventClick={handleEventClick}
              />
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-8 flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-foreground flex items-center justify-center text-background text-xs">
              ✓
            </div>
            <span className="text-muted-foreground">Coffee day</span>
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
              <span className="text-muted-foreground">777RC Event</span>
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
