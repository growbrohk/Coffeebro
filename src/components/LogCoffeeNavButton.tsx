import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Coffee } from 'lucide-react';

type LogCoffeeNavButtonProps = {
  onClick: () => void;
  className?: string;
  disabled?: boolean;
};

export function LogCoffeeNavButton({ onClick, className, disabled }: LogCoffeeNavButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn('shrink-0', className)}
      onClick={onClick}
      disabled={disabled}
      aria-busy={disabled || undefined}
    >
      <Coffee className="h-4 w-4 mr-1" />
      Log coffee
    </Button>
  );
}
