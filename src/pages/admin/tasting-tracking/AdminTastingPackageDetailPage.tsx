import { useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import {
  useTastingPackageTrackingSummary,
  useTastingPurchases,
} from '@/hooks/useTastingTracking';
import { StatCard, StatCardGrid } from '@/components/admin/tasting-tracking/StatCards';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatTastingPrice } from '@/types/tastingPackage';
import {
  formatRedemptionRate,
  formatTrackingDateShort,
  tastingTierLabel,
} from '@/lib/tastingTrackingLabels';

const ALL_TIERS = 'all';

export default function AdminTastingPackageDetailPage() {
  const { packageId } = useParams<{ packageId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isSuperAdmin, isLoading: roleLoading } = useUserRole();

  const tierParam = searchParams.get('tier');
  const tierFilter = tierParam === 'single' || tierParam === 'duo' ? tierParam : null;

  const { data: summary, isLoading: summaryLoading, error: summaryError } =
    useTastingPackageTrackingSummary(packageId, tierFilter);

  const purchaseFilters = useMemo(
    () => ({
      package_id: packageId,
      ...(tierFilter ? { tier: tierFilter } : {}),
    }),
    [packageId, tierFilter],
  );

  const { data: purchases = [], isLoading: purchasesLoading, error: purchasesError } =
    useTastingPurchases(purchaseFilters, Boolean(packageId && isSuperAdmin));

  const setTierFilter = (value: string) => {
    if (value === ALL_TIERS) {
      searchParams.delete('tier');
    } else {
      searchParams.set('tier', value);
    }
    setSearchParams(searchParams, { replace: true });
  };

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

  if (!packageId) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <p className="text-muted-foreground">Package not found.</p>
      </div>
    );
  }

  const statusLabel = summary
    ? summary.package_status === 'published' && summary.is_active
      ? 'Active'
      : summary.package_status === 'published'
        ? 'Published · inactive'
        : 'Draft'
    : '—';

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 border-b border-border bg-background">
        <div className="relative flex items-center justify-center px-4 py-4">
          <button
            type="button"
            onClick={() => navigate('/admin/tasting-tracking')}
            className="absolute left-0 p-2"
            aria-label="Back"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="font-heading text-xl font-bold">Package detail</h1>
        </div>
      </div>

      <div className="container max-w-4xl space-y-6 px-4 py-6">
        <div className="flex items-center gap-3">
          <Select value={tierFilter ?? ALL_TIERS} onValueChange={setTierFilter}>
            <SelectTrigger className="w-44" aria-label="Pass tier">
              <SelectValue placeholder="All tiers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_TIERS}>All tiers</SelectItem>
              <SelectItem value="single">Single pass</SelectItem>
              <SelectItem value="duo">Pair pass</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {summaryError ? (
          <p className="text-sm text-destructive">{(summaryError as Error).message}</p>
        ) : summaryLoading || !summary ? (
          <p className="text-sm text-muted-foreground">Loading summary…</p>
        ) : (
          <>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">{summary.package_title}</h2>
              <p className="text-sm text-muted-foreground">
                Status: {statusLabel}
                {tierFilter ? ` · ${tastingTierLabel(tierFilter)}` : ''}
              </p>
            </div>
            <StatCardGrid>
              <StatCard label="Sold" value={String(summary.sold)} />
              <StatCard label="Revenue" value={formatTastingPrice(summary.revenue_cents)} />
              <StatCard
                label="Vouchers per purchase"
                value={summary.vouchers_per_purchase != null ? String(summary.vouchers_per_purchase) : '—'}
              />
              <StatCard label="Vouchers issued" value={String(summary.vouchers_created)} />
              <StatCard label="Redeemed" value={String(summary.vouchers_redeemed)} />
              <StatCard label="Unredeemed" value={String(summary.vouchers_unredeemed)} />
              <StatCard label="Redemption rate" value={formatRedemptionRate(summary.redemption_rate)} />
            </StatCardGrid>
          </>
        )}

        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Buyers</h2>
          {purchasesError ? (
            <p className="text-sm text-destructive">{(purchasesError as Error).message}</p>
          ) : purchasesLoading ? (
            <p className="text-sm text-muted-foreground">Loading buyers…</p>
          ) : purchases.length === 0 ? (
            <p className="text-sm text-muted-foreground">No purchases yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Purchase time</TableHead>
                  <TableHead>Pass</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Vouchers</TableHead>
                  <TableHead>Redeemed</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases.map((row) => (
                  <TableRow
                    key={row.purchase_id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/admin/tasting-tracking/purchases/${row.purchase_id}`)}
                  >
                    <TableCell>{row.buyer_name}</TableCell>
                    <TableCell className="text-xs">{formatTrackingDateShort(row.created_at)}</TableCell>
                    <TableCell className="text-xs">{tastingTierLabel(row.tier)}</TableCell>
                    <TableCell className="text-xs capitalize">{row.payment_status}</TableCell>
                    <TableCell>{row.voucher_count}</TableCell>
                    <TableCell>{row.redeemed_count}</TableCell>
                    <TableCell>{row.purchase_status}</TableCell>
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
