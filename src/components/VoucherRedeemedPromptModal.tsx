import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { voucherNameFromOfferAndMenu } from '@/lib/voucherOfferLabels';

export type VoucherRedeemedPromptDetail = {
  title: string | null;
  orgName: string | null;
  menuItemName: string | null;
  returnVoucherSent?: boolean;
  returnVoucherOfferType?: string | null;
  returnVoucherItemName?: string | null;
};

interface VoucherRedeemedPromptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detail: VoucherRedeemedPromptDetail | null;
  onReview: () => void;
  reviewLoading?: boolean;
}

export function VoucherRedeemedPromptModal({
  open,
  onOpenChange,
  detail,
  onReview,
  reviewLoading = false,
}: VoucherRedeemedPromptModalProps) {
  const headline = detail?.title?.trim() || detail?.menuItemName?.trim() || 'Your voucher';
  const returnVoucherLabel = detail?.returnVoucherSent
    ? voucherNameFromOfferAndMenu(detail.returnVoucherOfferType, detail.returnVoucherItemName)
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border border-foreground/20 bg-background z-[60]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Voucher redeemed
          </DialogTitle>
          <DialogDescription className="sr-only">
            Your voucher was redeemed. You can review your visit now or later.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {returnVoucherLabel ? (
            <p className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-foreground">
              Return voucher sent to your wallet:{' '}
              <span className="font-semibold">{returnVoucherLabel}</span>
            </p>
          ) : null}
          <p className="text-sm text-muted-foreground">
            Your voucher has been scanned and redeemed.
          </p>
          <div className="space-y-1">
            <p className="text-xl font-bold text-foreground">{headline}</p>
            {detail?.orgName?.trim() ? (
              <p className="text-sm text-muted-foreground">{detail.orgName.trim()}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            <Button className="w-full" onClick={onReview} disabled={reviewLoading}>
              {reviewLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Opening…
                </>
              ) : (
                'Review'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => onOpenChange(false)}
              disabled={reviewLoading}
            >
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
