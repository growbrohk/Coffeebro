import { cn } from '@/lib/utils';

interface ProgressBarProps {
  monthCount: number;
  placement?: 'top' | 'bottom';
}

export function ProgressBar({ monthCount, placement = 'top' }: ProgressBarProps) {
  return (
    <div
      className={cn(
        'bg-background py-4 px-4',
        placement === 'top' && 'sticky top-0 z-10 border-b border-border',
        placement === 'bottom' && 'border-t border-border'
      )}
    >
      <div className="flex items-center justify-center">
        <span className="text-lg font-bold tracking-normal">
          {monthCount} {monthCount === 1 ? 'coffee' : 'coffees'} this month
        </span>
      </div>
    </div>
  );
}
