import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type LogCoffeeNavButtonProps = {
  onClick: () => void;
  className?: string;
  disabled?: boolean;
};

export function LogCoffeeNavButton({ onClick, className, disabled }: LogCoffeeNavButtonProps) {
  return (
    <Button
      type="button"
      size="sm"
      className={cn(
        'shrink-0 rounded-full bg-primary px-4 py-2 h-auto text-primary-foreground font-semibold shadow-none hover:bg-primary/90',
        className
      )}
      onClick={onClick}
      disabled={disabled}
      aria-busy={disabled || undefined}
    >
      + log your coffee
    </Button>
  );
}
