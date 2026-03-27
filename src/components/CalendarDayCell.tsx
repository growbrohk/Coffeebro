import { cn } from '@/lib/utils';
import { CoffeeCupMark } from '@/components/CoffeeCupMark';

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
        'calendar-day-cell',
        isTracking && 'calendar-tracking',
        isVouchers && 'calendar-vouchers-cell',
        showVoucherCounts && 'calendar-vouchers-has-offers',
        isToday && 'calendar-day-today',
        isVouchers &&
          interactive &&
          'cursor-pointer rounded-2xl transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        isTracking &&
          interactive &&
          'cursor-pointer rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background'
      )}
    >
      <div className="relative flex min-h-[58px] w-full flex-col items-center justify-center px-0.5 pb-1.5 pt-0.5">
        {isTracking && <CoffeeCupMark coffeeCount={coffeeCount} />}
        <div
          className={cn(
            'calendar-day-number relative z-[1]',
            isVouchers &&
              isSelected &&
              'bg-primary text-primary-foreground ring-0 border-0 shadow-soft',
            isVouchers && isToday && !isSelected && 'ring-2 ring-primary/60 ring-offset-2 ring-offset-background border-0',
            isTracking && coffeeCount > 0 && 'text-white font-semibold [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]'
          )}
        >
          {day}
        </div>
        {isTracking && isSelected ? (
          <span
            className="pointer-events-none absolute bottom-1 left-1/2 h-[3px] w-5 -translate-x-1/2 rounded-sm bg-primary"
            aria-hidden
          />
        ) : null}
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
