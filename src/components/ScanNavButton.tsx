import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Camera } from 'lucide-react';

type ScanNavButtonProps = {
  onClick: () => void;
  className?: string;
};

export function ScanNavButton({ onClick, className }: ScanNavButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      className={cn('shrink-0', className)}
      onClick={onClick}
    >
      <Camera className="h-4 w-4 mr-1" />
      Scan
    </Button>
  );
}
