import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type LogCoffeeNavButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  /** Defaults to "log your coffee". Use "+ log" for compact calendar-style CTA. */
  label?: string;
};

export function LogCoffeeNavButton({
  onClick,
  className,
  disabled,
  label = 'log your coffee',
}: LogCoffeeNavButtonProps) {
  const compact = label === '+ log';
  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'h-auto shrink-0 gap-1 rounded-full bg-primary font-semibold text-primary-foreground shadow-sm hover:bg-primary/90',
        compact ? 'px-3 py-2 text-xs' : 'px-4 py-2.5 text-sm',
        className
      )}
    >
      <Plus className={cn('shrink-0', compact ? 'h-3.5 w-3.5' : 'h-4 w-4')} strokeWidth={2.5} aria-hidden />
      {label}
    </Button>
  );
}
