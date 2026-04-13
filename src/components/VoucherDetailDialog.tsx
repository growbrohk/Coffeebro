import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { MyVoucher } from '@/hooks/useMyVouchers';
import { formatVoucherRedemptionPeriod } from '@/hooks/useMyVouchers';

function VoucherDetailFields({ voucher }: { voucher: MyVoucher }) {
  const redemption = formatVoucherRedemptionPeriod(voucher.expires_at, voucher.event_date ?? null);

  return (
    <div className="space-y-2 text-xs text-foreground">
      <p>
        <span className="font-semibold text-muted-foreground">Code: </span>
        <span className="font-mono font-semibold">{voucher.code}</span>
      </p>
      <p>
        <span className="font-semibold text-muted-foreground">Redemption period: </span>
        {redemption}
      </p>
      {voucher.location ? (
        <p>
          <span className="font-semibold text-muted-foreground">Location: </span>
          {voucher.location}
        </p>
      ) : null}
      {voucher.description ? (
        <p className="pt-1 leading-relaxed text-muted-foreground">{voucher.description}</p>
      ) : null}
      {voucher.offer_type ? (
        <p className="text-muted-foreground">Offer type: {voucher.offer_type}</p>
      ) : null}
      {voucher.campaign_details ? (
        <div className="space-y-1 border-t border-border pt-3">
          <p className="font-semibold text-muted-foreground">Voucher campaign details</p>
          <p className="leading-relaxed text-foreground">{voucher.campaign_details}</p>
        </div>
      ) : null}
    </div>
  );
}

export interface VoucherDetailDialogProps {
  vouchers: MyVoucher[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VoucherDetailDialog({ vouchers, open, onOpenChange }: VoucherDetailDialogProps) {
  if (vouchers.length === 0) return null;

  const first = vouchers[0]!;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] max-w-sm overflow-y-auto rounded-2xl border-0 shadow-soft">
        {vouchers.length === 1 ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-left text-lg font-bold">{first.title}</DialogTitle>
              <DialogDescription className="text-left text-xs text-muted-foreground">
                {first.org_name}
              </DialogDescription>
            </DialogHeader>
            <VoucherDetailFields voucher={first} />
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-left text-lg font-bold">My vouchers</DialogTitle>
              <DialogDescription className="text-left text-xs text-muted-foreground">
                {vouchers.length} items for this campaign
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-0">
              {vouchers.map((voucher, i) => (
                <div
                  key={voucher.id}
                  className={i > 0 ? 'mt-4 space-y-2 border-t border-border pt-4' : 'space-y-2'}
                >
                  <p className="text-left text-lg font-bold leading-snug text-foreground">{voucher.title}</p>
                  {voucher.org_name ? (
                    <p className="text-left text-xs text-muted-foreground">{voucher.org_name}</p>
                  ) : null}
                  <VoucherDetailFields voucher={voucher} />
                </div>
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
