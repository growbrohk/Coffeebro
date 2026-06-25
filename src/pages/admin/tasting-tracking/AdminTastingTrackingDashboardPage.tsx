import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import {
  useTastingPackageSales,
  useTastingTrackingDashboard,
} from '@/hooks/useTastingTracking';
import { StatCard, StatCardGrid } from '@/components/admin/tasting-tracking/StatCards';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatTastingPrice } from '@/types/tastingPackage';
import { formatRedemptionRate, tastingTierLabel } from '@/lib/tastingTrackingLabels';

export default function AdminTastingTrackingDashboardPage() {
  const navigate = useNavigate();
  const { isSuperAdmin, isLoading: roleLoading } = useUserRole();
  const { data: dashboard, isLoading: dashLoading, error: dashError } = useTastingTrackingDashboard();
  const { data: sales = [], isLoading: salesLoading, error: salesError } = useTastingPackageSales();

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

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 border-b border-border bg-background">
        <div className="relative flex items-center justify-center px-4 py-4">
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="absolute left-0 p-2"
            aria-label="Back"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="font-heading text-xl font-bold">Tasting tracking</h1>
        </div>
      </div>

      <div className="container max-w-4xl space-y-6 px-4 py-6">
        {dashError ? (
          <p className="text-sm text-destructive">{(dashError as Error).message}</p>
        ) : dashLoading || !dashboard ? (
          <p className="text-sm text-muted-foreground">Loading summary…</p>
        ) : (
          <StatCardGrid>
            <StatCard label="Packages sold" value={String(dashboard.packages_sold)} />
            <StatCard label="Total revenue" value={formatTastingPrice(dashboard.total_revenue_cents)} />
            <StatCard label="Vouchers created" value={String(dashboard.vouchers_created)} />
            <StatCard label="Redeemed" value={String(dashboard.vouchers_redeemed)} />
            <StatCard label="Unredeemed" value={String(dashboard.vouchers_unredeemed)} />
            <StatCard label="Redemption rate" value={formatRedemptionRate(dashboard.redemption_rate)} />
          </StatCardGrid>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => navigate('/admin/tasting-tracking/redemptions')}>
            Redemption log
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/admin/tasting-tracking/shops')}>
            Shop summary
          </Button>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Package breakdown</h2>
          {salesError ? (
            <p className="text-sm text-destructive">{(salesError as Error).message}</p>
          ) : salesLoading ? (
            <p className="text-sm text-muted-foreground">Loading packages…</p>
          ) : sales.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sales yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Package</TableHead>
                  <TableHead>Sold</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Vouchers</TableHead>
                  <TableHead>Redeemed</TableHead>
                  <TableHead>Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((row) => (
                  <TableRow
                    key={`${row.package_id}-${row.tier}`}
                    className="cursor-pointer"
                    onClick={() =>
                      navigate(`/admin/tasting-tracking/packages/${row.package_id}?tier=${row.tier}`)
                    }
                  >
                    <TableCell>
                      <div className="font-medium">{row.package_title}</div>
                      <div className="text-xs text-muted-foreground">{tastingTierLabel(row.tier)}</div>
                    </TableCell>
                    <TableCell>{row.sold}</TableCell>
                    <TableCell>{formatTastingPrice(row.revenue_cents)}</TableCell>
                    <TableCell>{row.vouchers_created}</TableCell>
                    <TableCell>{row.vouchers_redeemed}</TableCell>
                    <TableCell>{formatRedemptionRate(row.redemption_rate)}</TableCell>
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
