import { cn } from '@/lib/utils';

export type CalendarDayCellVariant = 'vouchers' | 'tracking';

interface CalendarDayCellProps {
  day: number;
  coffeeCount: number;
  isToday: boolean;
  variant: CalendarDayCellVariant;
  /** Grab (calendar) campaign count; vouchers tab only */
  grabCount?: number;
  /** Hunt campaign count; vouchers tab only */
  huntCount?: number;
  isSelected?: boolean;
  onSelectDay?: () => void;
}

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
  variant,
  grabCount = 0,
  huntCount = 0,
  isSelected,
  onSelectDay,
}: CalendarDayCellProps) {
  const isTracking = variant === 'tracking';
  const isVouchers = variant === 'vouchers';
  const showVoucherCounts = isVouchers && (grabCount > 0 || huntCount > 0);

  return (
    <div
      role={isVouchers && onSelectDay ? 'button' : undefined}
      tabIndex={isVouchers && onSelectDay ? 0 : undefined}
      onClick={isVouchers && onSelectDay ? onSelectDay : undefined}
      onKeyDown={
        isVouchers && onSelectDay
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectDay();
              }
            }
          : undefined
      }
      className={cn(
        'calendar-day-cell',
        isVouchers && 'calendar-vouchers-cell',
        showVoucherCounts && 'calendar-vouchers-has-offers',
        isTracking && getCoffeeDayClass(coffeeCount),
        isToday && 'calendar-day-today',
        isVouchers &&
          onSelectDay &&
          'cursor-pointer rounded-2xl transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background'
      )}
    >
      <div
        className={cn(
          'calendar-day-number relative z-0',
          isVouchers &&
            isSelected &&
            'bg-primary text-primary-foreground ring-0 border-0 shadow-soft',
          isVouchers && isToday && !isSelected && 'ring-2 ring-primary/60 ring-offset-2 ring-offset-background border-0'
        )}
      >
        {day}
        {isTracking && coffeeCount > 0 && (
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

      {showVoucherCounts && (
        <div className="flex flex-wrap items-center justify-center gap-x-1 gap-y-0.5 mt-0.5 px-0.5 w-full">
          {grabCount > 0 && (
            <span className="rounded-full bg-primary/20 px-1 text-[8px] font-bold tabular-nums leading-none text-primary">
              G{grabCount}
            </span>
          )}
          {huntCount > 0 && (
            <span className="rounded-full bg-accent/25 px-1 text-[8px] font-bold tabular-nums leading-none text-accent">
              H{huntCount}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
