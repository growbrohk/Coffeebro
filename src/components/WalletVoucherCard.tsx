import { useState } from 'react';
import { ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QrCodeDialog } from '@/components/QrCodeDialog';
import { VoucherDetailDialog } from '@/components/VoucherDetailDialog';
import { cn } from '@/lib/utils';
import type { MyVoucher } from '@/hooks/useMyVouchers';
import { formatVoucherRedemptionPeriod } from '@/hooks/useMyVouchers';

function inactiveLabel(status: MyVoucher['status']): string {
  if (status === 'redeemed') return 'redeemed';
  if (status === 'expired') return 'expired';
  if (status === 'refunded') return 'refunded';
  return 'inactive';
}

export interface WalletVoucherCardProps {
  voucher: MyVoucher;
}

export function WalletVoucherCard({ voucher }: WalletVoucherCardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const isActive = voucher.status === 'active';
  const redemption = formatVoucherRedemptionPeriod(voucher.expires_at, voucher.event_date ?? null);

  return (
    <>
      <div
        className={cn(
          'tap-card flex gap-3 rounded-2xl bg-card p-4 shadow-soft transition-[transform,box-shadow] duration-200 ease-out',
          !isActive && 'opacity-50'
        )}
      >
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
          {voucher.org_logo_url ? (
            <img
              src={voucher.org_logo_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : voucher.thumbnail_url ? (
            <img
              src={voucher.thumbnail_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ImageIcon className="h-7 w-7 text-muted-foreground/50" strokeWidth={1.5} />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-foreground">{voucher.org_name || 'Partner'}</p>
          <p className="truncate text-sm font-bold text-foreground">{voucher.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">Code: {voucher.code}</p>
          <p className="text-xs text-muted-foreground">Redemption period: {redemption}</p>
        </div>

        <div className="flex shrink-0 flex-col justify-center gap-1.5 border-l border-dashed border-border pl-3">
          {isActive ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-w-[4.5rem] border-primary/80 text-primary hover:bg-primary/10"
                onClick={() => setDetailsOpen(true)}
              >
                details
              </Button>
              <Button
                type="button"
                size="sm"
                className="min-w-[4.5rem] bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => setQrOpen(true)}
              >
                show QR
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled
              className="min-w-[4.5rem] border-primary/50 text-primary"
            >
              {inactiveLabel(voucher.status)}
            </Button>
          )}
        </div>
      </div>

      <VoucherDetailDialog
        vouchers={[voucher]}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />

      <QrCodeDialog code={voucher.code} open={qrOpen} onOpenChange={setQrOpen} />
    </>
  );
}
