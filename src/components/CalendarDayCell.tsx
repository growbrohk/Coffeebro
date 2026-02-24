import type { RunClubEvent } from '@/hooks/useEvents';
import type { CoffeeOffer } from '@/hooks/useCoffeeOffers';
import { cn } from '@/lib/utils';

interface CalendarDayCellProps {
  day: number;
  coffeeCount: number;
  isToday: boolean;
  events: RunClubEvent[];
  coffeeOffers: CoffeeOffer[];
  registeredEventIds: Set<string>;
  onEventClick: (event: RunClubEvent) => void;
  onCoffeeOfferClick: (offer: CoffeeOffer) => void;
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
  coffeeOffers,
  registeredEventIds,
  onEventClick,
  onCoffeeOfferClick,
}: CalendarDayCellProps) {
  const MAX_VISIBLE_ITEMS = 2;
  const allItems: Array<
    { type: 'offer'; data: CoffeeOffer } | { type: 'event'; data: RunClubEvent }
  > = [
    ...coffeeOffers.map((o) => ({ type: 'offer' as const, data: o })),
    ...events.map((e) => ({ type: 'event' as const, data: e })),
  ];
  const visibleItems = allItems.slice(0, MAX_VISIBLE_ITEMS);
  const remainingCount = allItems.length - MAX_VISIBLE_ITEMS;

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
          <span
            className={cn(
              'absolute -top-1 -right-1 text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center',
              coffeeCount >= 3
                ? 'bg-foreground text-background'
                : 'bg-muted text-foreground'
            )}
          >
            {coffeeCount}
          </span>
        )}
      </div>

      {/* Coffee offers (orange) + Events (muted) */}
      {allItems.length > 0 && (
        <div className="calendar-day-events">
          {visibleItems.map((item) =>
            item.type === 'offer' ? (
              <button
                key={`offer-${item.data.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onCoffeeOfferClick(item.data);
                }}
                className="calendar-event-label calendar-event-coffee"
                title={item.data.name}
              >
                <span className="truncate max-w-full">{item.data.name}</span>
              </button>
            ) : (
              <button
                key={`event-${item.data.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onEventClick(item.data);
                }}
                className={`calendar-event-label ${
                  registeredEventIds.has(item.data.id)
                    ? 'calendar-event-registered'
                    : ''
                }`}
                title={item.data.name}
              >
                {item.data.name}
              </button>
            )
          )}

          {remainingCount > 0 && (
            <span className="calendar-event-more">+{remainingCount} more</span>
          )}
        </div>
      )}
    </div>
  );
}