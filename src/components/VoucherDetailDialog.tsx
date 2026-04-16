import { Link } from 'react-router-dom';
import { Navigation } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { MyVoucher } from '@/hooks/useMyVouchers';
import { formatVoucherRedemptionPeriod } from '@/hooks/useMyVouchers';
import QRCode from 'react-qr-code';

function VoucherDetailFields({ voucher }: { voucher: MyVoucher }) {
  const redemption = formatVoucherRedemptionPeriod(voucher.expires_at, voucher.event_date ?? null);
  const showQr = voucher.status === 'active' && Boolean(voucher.code?.trim());

  return (
    <div className="space-y-2 text-xs text-foreground">
      {showQr ? (
        <div className="flex justify-center pb-1">
          <div className="rounded-xl bg-white p-2.5 shadow-sm ring-1 ring-border/40">
            <QRCode value={voucher.code} size={160} />
          </div>
        </div>
      ) : null}
      <p>
        <span className="font-semibold text-muted-foreground">Code: </span>
        <span className="font-mono font-semibold">{voucher.code}</span>
      </p>
      <p>
        <span className="font-semibold text-muted-foreground">Redemption period: </span>
        {redemption}
      </p>
      {voucher.campaign_details?.trim() ? (
        <p>
          <span className="font-semibold text-muted-foreground">Voucher campaign details: </span>
          <span className="text-foreground">{voucher.campaign_details.trim()}</span>
        </p>
      ) : null}
      {voucher.description ? (
        <p className="pt-1 leading-relaxed text-muted-foreground">{voucher.description}</p>
      ) : null}
      {voucher.offer_type ? (
        <p className="text-muted-foreground">Offer type: {voucher.offer_type}</p>
      ) : null}
    </div>
  );
}

function VoucherRedeemFooter({ voucher }: { voucher: MyVoucher }) {
  const url = voucher.redeem_directions_url ?? null;
  const address = voucher.location?.trim() ?? '';
  if (!address && !url) return null;

  return (
    <div className="mt-2 space-y-2 border-t border-border pt-2">
      <p className="text-xs font-semibold text-muted-foreground">Redeem address & directions</p>
      {address ? (
        <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground">{address}</p>
      ) : null}
      <Button
        type="button"
        className="h-10 w-full rounded-full bg-[#F27A24] text-white hover:bg-[#e06d1c]"
        disabled={!url}
        aria-label="Open directions in Google Maps"
        onClick={() => {
          if (!url) return;
          const win = window.open(url, '_blank', 'noopener,noreferrer');
          if (!win) window.location.href = url;
        }}
      >
        <Navigation className="mr-2 size-4 shrink-0" aria-hidden />
        directions
      </Button>
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
              <DialogDescription asChild className="text-left text-xs text-muted-foreground">
                {first.org_id ? (
                  <Link to={`/orgs/${first.org_id}`} className="text-muted-foreground underline-offset-4 hover:underline">
                    {first.org_name}
                  </Link>
                ) : (
                  <span>{first.org_name}</span>
                )}
              </DialogDescription>
            </DialogHeader>
            <VoucherDetailFields voucher={first} />
            <VoucherRedeemFooter voucher={first} />
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
                    <p className="text-left text-xs text-muted-foreground">
                      {voucher.org_id ? (
                        <Link
                          to={`/orgs/${voucher.org_id}`}
                          className="text-muted-foreground underline-offset-4 hover:underline"
                        >
                          {voucher.org_name}
                        </Link>
                      ) : (
                        voucher.org_name
                      )}
                    </p>
                  ) : null}
                  <VoucherDetailFields voucher={voucher} />
                  <VoucherRedeemFooter voucher={voucher} />
                </div>
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
