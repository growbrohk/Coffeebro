import type { RunClubEvent } from '@/hooks/useEvents';

interface CalendarDayCellProps {
  day: number;
  hasRun: boolean;
  isToday: boolean;
  events: RunClubEvent[];
  registeredEventIds: Set<string>;
  onEventClick: (event: RunClubEvent) => void;
}

export function CalendarDayCell({ 
  day, 
  hasRun, 
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
      className={`calendar-day-cell ${hasRun ? 'calendar-day-run' : ''} ${isToday ? 'calendar-day-today' : ''}`}
    >
      {/* Day number or checkmark */}
      <div className="calendar-day-number">
        {hasRun ? '✓' : day}
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
