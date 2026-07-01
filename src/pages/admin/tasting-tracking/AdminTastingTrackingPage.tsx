import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { useAllTastingPackages } from '@/hooks/usePublishedTastingPackages';
import {
  useTastingPurchasesInfinite,
  useTastingRedemptionsInfinite,
  useTastingTrackingSummary,
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
import { PillarTabs } from '@/components/tasting-tracking/PillarTabs';
import {
  DEFAULT_FILTER_VALUES,
  filtersToRpc,
  TastingTrackingFilters,
  type TastingTrackingFilterValues,
} from '@/components/tasting-tracking/TastingTrackingFilters';
import { InfiniteScrollList } from '@/components/tasting-tracking/InfiniteScrollList';
import { StatCard, StatCardGrid } from '@/components/admin/tasting-tracking/StatCards';
import { formatTastingPrice } from '@/types/tastingPackage';
import { formatTrackingDateShort, tastingTierLabel } from '@/lib/tastingTrackingLabels';

type TabId = 'purchases' | 'redemptions';

export default function AdminTastingTrackingPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isSuperAdmin, isLoading: roleLoading } = useUserRole();
  const { data: packages = [] } = useAllTastingPackages();

  const initialTab = searchParams.get('tab') === 'redemptions' ? 'redemptions' : 'purchases';
  const [tab, setTab] = useState<TabId>(initialTab);
  const [purchaseFilters, setPurchaseFilters] =
    useState<TastingTrackingFilterValues>(DEFAULT_FILTER_VALUES);
  const [redemptionFilters, setRedemptionFilters] =
    useState<TastingTrackingFilterValues>(DEFAULT_FILTER_VALUES);

  const packageOptions = useMemo(
    () => packages.map((p) => ({ id: p.id, title: p.title })),
    [packages],
  );

  const purchaseRpcFilters = useMemo(() => filtersToRpc(purchaseFilters), [purchaseFilters]);
  const redemptionRpcFilters = useMemo(() => filtersToRpc(redemptionFilters), [redemptionFilters]);

  const purchasesQuery = useTastingPurchasesInfinite(purchaseRpcFilters, isSuperAdmin);
  const redemptionsQuery = useTastingRedemptionsInfinite(redemptionRpcFilters, isSuperAdmin);

  const purchaseSummary = useTastingTrackingSummary(
    purchaseRpcFilters,
    'purchases',
    isSuperAdmin && tab === 'purchases',
  );
  const redemptionSummary = useTastingTrackingSummary(
    redemptionRpcFilters,
    'redemptions',
    isSuperAdmin && tab === 'redemptions',
  );

  const purchaseRows = purchasesQuery.data?.pages.flat() ?? [];
  const redemptionRows = redemptionsQuery.data?.pages.flat() ?? [];

  const handleTabChange = (id: string) => {
    const next = id as TabId;
    setTab(next);
    if (next === 'redemptions') {
      setSearchParams({ tab: 'redemptions' }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
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
        <div className="space-y-3 border-t border-border px-4 pb-3 pt-3">
          <PillarTabs
            tabs={[
              { id: 'purchases', label: 'Purchases' },
              { id: 'redemptions', label: 'Redemptions' },
            ]}
            activeId={tab}
            onChange={handleTabChange}
          />
          {tab === 'purchases' ? (
            <StatCardGrid>
              <StatCard
                label="Packages sold"
                value={String(purchaseSummary.data?.packages_sold ?? '—')}
              />
              <StatCard
                label="Revenue"
                value={
                  purchaseSummary.isLoading
                    ? '…'
                    : formatTastingPrice(purchaseSummary.data?.revenue_cents ?? 0)
                }
              />
              <StatCard
                label="Profit"
                value={
                  purchaseSummary.isLoading
                    ? '…'
                    : formatTastingPrice(purchaseSummary.data?.profit_cents ?? 0)
                }
              />
            </StatCardGrid>
          ) : (
            <StatCardGrid className="grid-cols-2">
              <StatCard
                label="Total vouchers"
                value={String(redemptionSummary.data?.vouchers_total ?? '—')}
              />
              <StatCard
                label="Redeemed vouchers"
                value={String(redemptionSummary.data?.vouchers_redeemed ?? '—')}
              />
            </StatCardGrid>
          )}
          {tab === 'purchases' ? (
            <TastingTrackingFilters
              values={purchaseFilters}
              onChange={setPurchaseFilters}
              packages={packageOptions}
            />
          ) : (
            <TastingTrackingFilters
              values={redemptionFilters}
              onChange={setRedemptionFilters}
              packages={packageOptions}
              showBuyerSearch
            />
          )}
        </div>
      </div>

      <div className="container max-w-4xl space-y-4 px-4 py-6">
        {tab === 'purchases' ? (
          <InfiniteScrollList
            isLoading={purchasesQuery.isLoading}
            isFetchingNextPage={purchasesQuery.isFetchingNextPage}
            hasNextPage={Boolean(purchasesQuery.hasNextPage)}
            fetchNextPage={() => void purchasesQuery.fetchNextPage()}
            isEmpty={purchaseRows.length === 0}
            emptyMessage="No purchases yet."
            error={purchasesQuery.error as Error | null}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseRows.map((row) => (
                  <TableRow key={row.purchase_id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {formatTrackingDateShort(row.created_at)}
                    </TableCell>
                    <TableCell>{row.buyer_name}</TableCell>
                    <TableCell className="max-w-[12rem] text-xs">
                      <div>{row.package_title}</div>
                      <div className="text-muted-foreground">{tastingTierLabel(row.tier)}</div>
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap tabular-nums">
                      {formatTastingPrice(row.amount_cents)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </InfiniteScrollList>
        ) : (
          <InfiniteScrollList
            isLoading={redemptionsQuery.isLoading}
            isFetchingNextPage={redemptionsQuery.isFetchingNextPage}
            hasNextPage={Boolean(redemptionsQuery.hasNextPage)}
            fetchNextPage={() => void redemptionsQuery.fetchNextPage()}
            isEmpty={redemptionRows.length === 0}
            emptyMessage="No redemptions yet."
            error={redemptionsQuery.error as Error | null}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Org</TableHead>
                  <TableHead>Split</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Scan user</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {redemptionRows.map((row) => (
                  <TableRow key={row.voucher_id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {formatTrackingDateShort(row.redeemed_at)}
                    </TableCell>
                    <TableCell>{row.buyer_name}</TableCell>
                    <TableCell className="max-w-[10rem] text-xs">{row.item_name}</TableCell>
                    <TableCell>{row.shop_name}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap tabular-nums">
                      {formatTastingPrice(row.shop_split_cents)}
                    </TableCell>
                    <TableCell className="max-w-[12rem] text-xs">
                      <div>{row.package_title}</div>
                      <div className="text-muted-foreground">{tastingTierLabel(row.tier)}</div>
                    </TableCell>
                    <TableCell className="text-xs">{row.scanned_by_name ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </InfiniteScrollList>
        )}
      </div>
    </div>
  );
}
