import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';

export type HostRedeemSuccessDetail = {
  orgName: string | null;
  campaignTitle: string | null;
  itemName: string | null;
  offerType: string | null;
  voucherCode: string | null;
  ownerUsername: string | null;
};

interface HostRedeemSuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detail: HostRedeemSuccessDetail | null;
}

export function HostRedeemSuccessModal({
  open,
  onOpenChange,
  detail,
}: HostRedeemSuccessModalProps) {
  const itemName = detail?.itemName?.trim() || 'Reward';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border border-foreground/20 bg-background">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Voucher redeemed
          </DialogTitle>
          <DialogDescription className="sr-only">
            Redemption successful for {itemName}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <p className="text-xl font-bold text-foreground">{itemName}</p>
          <div className="space-y-1 text-sm text-muted-foreground">
            {detail?.orgName?.trim() ? <p>{detail.orgName.trim()}</p> : null}
            {detail?.campaignTitle?.trim() ? <p>{detail.campaignTitle.trim()}</p> : null}
            {detail?.offerType?.trim() ? <p>{detail.offerType.trim()}</p> : null}
          </div>
          <div className="space-y-2 text-sm text-foreground">
            {detail?.voucherCode?.trim() ? (
              <p>
                <span className="font-semibold text-muted-foreground">Code: </span>
                <span className="font-mono font-semibold">{detail.voucherCode.trim()}</span>
              </p>
            ) : null}
            {detail?.ownerUsername?.trim() ? (
              <p>
                <span className="font-semibold text-muted-foreground">Username: </span>
                <span className="font-semibold">{detail.ownerUsername.trim()}</span>
              </p>
            ) : null}
          </div>
          <Button className="w-full" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
