import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RedeemCodeCard } from '@/components/RedeemCodeCard';
import { Gift } from 'lucide-react';

interface ScanSuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vouchers: Array<{ id: string; code: string }>;
  onViewVouchers?: () => void;
}

export function ScanSuccessModal({
  open,
  onOpenChange,
  vouchers,
  onViewVouchers,
}: ScanSuccessModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background border border-foreground/20">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Treasure Claimed!
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground text-left">
            You unlocked {vouchers.length} {vouchers.length === 1 ? 'voucher' : 'vouchers'}:
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-3">
            {vouchers.map((v) => (
              <RedeemCodeCard
                key={v.id}
                title="Your code"
                code={v.code}
                status="active"
                variant="voucher"
              />
            ))}
          </div>
          {onViewVouchers && (
            <Button className="w-full btn-run" onClick={onViewVouchers}>
              View My Vouchers
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
