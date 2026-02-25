import type { CoffeeOffer } from '@/hooks/useCoffeeOffers';
import { cn } from '@/lib/utils';

interface CalendarDayCellProps {
  day: number;
  coffeeCount: number;
  isToday: boolean;
  coffeeOffers: CoffeeOffer[];
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
  coffeeOffers,
  onCoffeeOfferClick,
}: CalendarDayCellProps) {
  const MAX_VISIBLE_ITEMS = 2;
  const visibleItems = coffeeOffers.slice(0, MAX_VISIBLE_ITEMS);
  const remainingCount = coffeeOffers.length - MAX_VISIBLE_ITEMS;

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

      {/* Coffee offers */}
      {coffeeOffers.length > 0 && (
        <div className="calendar-day-events">
          {visibleItems.map((offer) => (
            <button
              key={`offer-${offer.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onCoffeeOfferClick(offer);
              }}
              className="calendar-event-label calendar-event-coffee"
              title={offer.name}
            >
              <span className="truncate max-w-full">{offer.name}</span>
            </button>
          ))}

          {remainingCount > 0 && (
            <span className="calendar-event-more">+{remainingCount} more</span>
          )}
        </div>
      )}
    </div>
  );
}