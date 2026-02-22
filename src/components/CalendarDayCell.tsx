import type { RunClubEvent } from '@/hooks/useEvents';
import { cn } from '@/lib/utils';

interface CalendarDayCellProps {
  day: number;
  coffeeCount: number;
  isToday: boolean;
  events: RunClubEvent[];
  registeredEventIds: Set<string>;
  onEventClick: (event: RunClubEvent) => void;
}

// Helper function to get coffee day class based on count
export function getCoffeeDayClass(count: number): string {
  if (count === 0) return '';
  if (count === 1) return 'calendar-day-coffee-1';
  if (count === 2) return 'calendar-day-coffee-2';
  return 'calendar-day-coffee-3';
}

export function CalendarDayCell({ 
  day, 
  coffeeCount, 
  isToday, 
  events,
  registeredEventIds,
  onEventClick 
}: CalendarDayCellProps) {
  const MAX_VISIBLE_EVENTS = 2;
  const visibleEvents = events.slice(0, MAX_VISIBLE_EVENTS);
  const remainingCount = events.length - MAX_VISIBLE_EVENTS;

  return (
    <div
      className={cn(
        'calendar-day-cell',
        getCoffeeDayClass(coffeeCount),
        isToday && 'calendar-day-today'
      )}
    >
      {/* Day number with coffee count badge */}
      <div className="calendar-day-number relative">
        {day}
        {coffeeCount > 0 && (
          <span className={cn(
            'absolute -top-1 -right-1 text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center',
            coffeeCount >= 3 ? 'bg-foreground text-background' : 'bg-muted text-foreground'
          )}>
            {coffeeCount}
          </span>
        )}
      </div>
      
      {/* Events */}
      {events.length > 0 && (
        <div className="calendar-day-events">
          {visibleEvents.map((event) => {
            const isRegistered = registeredEventIds.has(event.id);
            return (
              <button
                key={event.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onEventClick(event);
                }}
                className={`calendar-event-label ${isRegistered ? 'calendar-event-registered' : ''}`}
                title={event.name}
              >
                {event.name}
              </button>
            );
          })}
          {remainingCount > 0 && (
            <span className="calendar-event-more">
              +{remainingCount} more
            </span>
          )}
        </div>
      )}
    </div>
  );
}
