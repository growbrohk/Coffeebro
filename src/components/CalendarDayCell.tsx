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
        isTracking && getCoffeeDayClass(coffeeCount),
        isToday && 'calendar-day-today',
        isVouchers && onSelectDay && 'cursor-pointer rounded-md transition-colors',
        isVouchers && isSelected && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
      )}
    >
      <div className="calendar-day-number relative">
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
            <span className="text-[8px] font-black tabular-nums text-emerald-800 dark:text-emerald-300 leading-none">
              G{grabCount}
            </span>
          )}
          {huntCount > 0 && (
            <span className="text-[8px] font-black tabular-nums text-violet-900 dark:text-violet-300 leading-none">
              H{huntCount}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
