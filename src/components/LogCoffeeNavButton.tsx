import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type LogCoffeeNavButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
};

export function LogCoffeeNavButton({ onClick, className, disabled }: LogCoffeeNavButtonProps) {
  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'h-auto shrink-0 gap-1 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90',
        className
      )}
    >
      <Plus className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden />
      log your coffee
    </Button>
  );
}
