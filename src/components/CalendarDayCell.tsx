import { cn } from '@/lib/utils';
import { CoffeeCupMark } from '@/components/CoffeeCupMark';

interface CalendarDayCellProps {
  day: number;
  coffeeCount: number;
  isToday: boolean;
  isSelected?: boolean;
  onSelectDay?: () => void;
}

export function CalendarDayCell({
  day,
  coffeeCount,
  isToday,
  isSelected,
  onSelectDay,
}: CalendarDayCellProps) {
  const interactive = !!onSelectDay;

  return (
    <div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? onSelectDay : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectDay?.();
              }
            }
          : undefined
      }
      className={cn(
        'calendar-day-cell calendar-tracking w-full min-h-0 overflow-visible',
        isToday && 'calendar-day-today',
        interactive &&
          'cursor-pointer rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background'
      )}
    >
      <div className="relative flex aspect-square w-full min-h-0 flex-col items-center justify-center overflow-visible px-0.5 pb-1.5 pt-0.5">
        <CoffeeCupMark coffeeCount={coffeeCount} />
        <div
          className={cn(
            'calendar-day-number relative z-[1]',
            coffeeCount > 0 && 'text-white font-semibold [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]'
          )}
        >
          {day}
        </div>
        {isSelected ? (
          <span
            className="pointer-events-none absolute bottom-1 left-1/2 h-[3px] w-5 -translate-x-1/2 rounded-sm bg-primary"
            aria-hidden
          />
        ) : null}
      </div>
    </div>
  );
}
