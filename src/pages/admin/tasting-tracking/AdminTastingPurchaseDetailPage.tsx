import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import {
  useTastingPurchaseVouchers,
  useTastingPurchases,
} from '@/hooks/useTastingTracking';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatTrackingDateShort, tastingTierLabel } from '@/lib/tastingTrackingLabels';
import { formatTastingPrice } from '@/types/tastingPackage';

export default function AdminTastingPurchaseDetailPage() {
  const { purchaseId } = useParams<{ purchaseId: string }>();
  const navigate = useNavigate();
  const { isSuperAdmin, isLoading: roleLoading } = useUserRole();

  const { data: purchases = [], isLoading: purchaseLoading } = useTastingPurchases(
    { purchase_id: purchaseId },
    Boolean(purchaseId && isSuperAdmin),
  );
  const purchase = purchases[0];

  const { data: vouchers = [], isLoading: vouchersLoading, error } = useTastingPurchaseVouchers(purchaseId);

  if (roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-sm font-semibold">Loading…</div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <p className="text-muted-foreground">Super admin only.</p>
        <Button className="mt-4" variant="outline" onClick={() => navigate('/settings')}>
          Back
        </Button>
      </div>
    );
  }

  if (!purchaseId) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <p className="text-muted-foreground">Purchase not found.</p>
      </div>
    );
  }

  const backToPackage = purchase
    ? `/admin/tasting-tracking/packages/${purchase.package_id}?tier=${purchase.tier}`
    : '/admin/tasting-tracking';

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 border-b border-border bg-background">
        <div className="relative flex items-center justify-center px-4 py-4">
          <button
            type="button"
            onClick={() => navigate(backToPackage)}
            className="absolute left-0 p-2"
            aria-label="Back"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="font-heading text-xl font-bold">Purchase detail</h1>
        </div>
      </div>

      <div className="container max-w-4xl space-y-6 px-4 py-6">
        {purchaseLoading ? (
          <p className="text-sm text-muted-foreground">Loading purchase…</p>
        ) : purchase ? (
          <div className="space-y-1 rounded-xl border border-border bg-muted/30 p-4">
            <h2 className="text-lg font-semibold">
              {purchase.buyer_name}&apos;s {tastingTierLabel(purchase.tier)}
            </h2>
            <p className="text-sm text-muted-foreground">{purchase.package_title}</p>
            <p className="text-sm text-muted-foreground">
              {formatTastingPrice(purchase.amount_cents)} · {purchase.payment_status} ·{' '}
              {purchase.purchase_status}
            </p>
            {purchase.buyer_email ? (
              <p className="text-xs text-muted-foreground">{purchase.buyer_email}</p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Purchase record not found.</p>
        )}

        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Vouchers</h2>
          {error ? (
            <p className="text-sm text-destructive">{(error as Error).message}</p>
          ) : vouchersLoading ? (
            <p className="text-sm text-muted-foreground">Loading vouchers…</p>
          ) : vouchers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No vouchers minted yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shop</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Redeemed</TableHead>
                  <TableHead>Scanned by</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vouchers.map((v) => (
                  <TableRow key={v.voucher_id}>
                    <TableCell>{v.shop_name}</TableCell>
                    <TableCell>{v.item_name}</TableCell>
                    <TableCell className="capitalize">{v.status}</TableCell>
                    <TableCell className="text-xs">
                      {v.redeemed_at ? formatTrackingDateShort(v.redeemed_at) : '—'}
                    </TableCell>
                    <TableCell className="text-xs">{v.redeemed_by_name ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
