import { ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatVoucherRedemptionPeriod } from '@/hooks/useMyVouchers';
import type { PublicVoucher } from '@/hooks/usePublicUserVouchers';

function inactiveLabel(status: PublicVoucher['status']): string {
  if (status === 'redeemed') return 'redeemed';
  if (status === 'expired') return 'expired';
  if (status === 'refunded') return 'refunded';
  return 'inactive';
}

export function PublicWalletVoucherCard({ voucher }: { voucher: PublicVoucher }) {
  const isActive = voucher.status === 'active';
  const redemption = formatVoucherRedemptionPeriod(voucher.expires_at, voucher.event_date ?? null);

  return (
    <div
      className={cn(
        'tap-card flex gap-3 rounded-2xl bg-card p-4 shadow-soft',
        !isActive && 'opacity-50',
      )}
    >
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
        {voucher.org_logo_url ? (
          <img src={voucher.org_logo_url} alt="" className="h-full w-full object-cover" />
        ) : voucher.thumbnail_url ? (
          <img src={voucher.thumbnail_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon className="h-7 w-7 text-muted-foreground/50" strokeWidth={1.5} />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-foreground">{voucher.org_name || 'Partner'}</p>
        <p className="truncate text-sm font-bold text-foreground">{voucher.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">Redemption period: {redemption}</p>
        {!isActive ? (
          <p className="mt-1 text-xs font-medium text-muted-foreground">{inactiveLabel(voucher.status)}</p>
        ) : null}
      </div>
    </div>
  );
}
