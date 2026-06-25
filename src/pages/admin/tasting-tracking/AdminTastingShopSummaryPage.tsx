import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { useAllTastingPackages } from '@/hooks/usePublishedTastingPackages';
import {
  useTastingShopItems,
  useTastingShopSummary,
} from '@/hooks/useTastingTracking';
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
import { formatRedemptionRate, tastingTierLabel } from '@/lib/tastingTrackingLabels';

const ALL_TIERS = 'all';

export default function AdminTastingShopSummaryPage() {
  const navigate = useNavigate();
  const { isSuperAdmin, isLoading: roleLoading } = useUserRole();
  const { data: packages = [], isLoading: packagesLoading } = useAllTastingPackages();

  const [packageId, setPackageId] = useState<string>('');
  const [tierFilter, setTierFilter] = useState(ALL_TIERS);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  const effectivePackageId = packageId || packages[0]?.id || '';
  const tier = tierFilter === ALL_TIERS ? null : tierFilter;

  const { data: shops = [], isLoading: shopsLoading, error: shopsError } = useTastingShopSummary(
    effectivePackageId || undefined,
    tier,
  );

  const { data: shopItems = [], isLoading: itemsLoading } = useTastingShopItems(
    effectivePackageId || undefined,
    selectedOrgId ?? undefined,
    tier,
  );

  const selectedShop = useMemo(
    () => shops.find((s) => s.org_id === selectedOrgId) ?? null,
    [shops, selectedOrgId],
  );

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
            onClick={() => navigate('/admin/tasting-tracking')}
            className="absolute left-0 p-2"
            aria-label="Back"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="font-heading text-xl font-bold">Shop summary</h1>
        </div>
      </div>

      <div className="container max-w-4xl space-y-6 px-4 py-6">
        <div className="flex flex-wrap gap-3">
          <Select
            value={effectivePackageId}
            onValueChange={(v) => {
              setPackageId(v);
              setSelectedOrgId(null);
            }}
            disabled={packagesLoading || packages.length === 0}
          >
            <SelectTrigger className="min-w-[12rem]" aria-label="Package">
              <SelectValue placeholder="Select package" />
            </SelectTrigger>
            <SelectContent>
              {packages.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger className="w-36" aria-label="Pass tier">
              <SelectValue placeholder="All tiers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_TIERS}>All tiers</SelectItem>
              <SelectItem value="single">Single pass</SelectItem>
              <SelectItem value="duo">Pair pass</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {shopsError ? (
          <p className="text-sm text-destructive">{(shopsError as Error).message}</p>
        ) : shopsLoading ? (
          <p className="text-sm text-muted-foreground">Loading shops…</p>
        ) : shops.length === 0 ? (
          <p className="text-sm text-muted-foreground">No shop data for this package.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shop</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead>Redeemed</TableHead>
                <TableHead>Unredeemed</TableHead>
                <TableHead>Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shops.map((row) => (
                <TableRow
                  key={row.org_id}
                  className="cursor-pointer"
                  data-state={selectedOrgId === row.org_id ? 'selected' : undefined}
                  onClick={() => setSelectedOrgId(row.org_id)}
                >
                  <TableCell className="font-medium">{row.shop_name}</TableCell>
                  <TableCell>{row.assigned_vouchers}</TableCell>
                  <TableCell>{row.redeemed}</TableCell>
                  <TableCell>{row.unredeemed}</TableCell>
                  <TableCell>{formatRedemptionRate(row.redemption_rate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {selectedOrgId && selectedShop ? (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">
              {selectedShop.shop_name}
              {tier ? ` · ${tastingTierLabel(tier)}` : ''}
            </h2>
            {itemsLoading ? (
              <p className="text-sm text-muted-foreground">Loading items…</p>
            ) : shopItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No item breakdown.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Issued</TableHead>
                    <TableHead>Redeemed</TableHead>
                    <TableHead>Remaining</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shopItems.map((item) => (
                    <TableRow key={item.menu_item_id}>
                      <TableCell>{item.item_name}</TableCell>
                      <TableCell>{item.issued}</TableCell>
                      <TableCell>{item.redeemed}</TableCell>
                      <TableCell>{item.remaining}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
