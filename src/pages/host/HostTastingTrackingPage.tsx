import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrg, useOrgs } from '@/hooks/useOrgs';
import { useUserRole } from '@/hooks/useUserRole';
import {
  useHostTastingDashboard,
  useHostTastingRedemptionsInfinite,
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
import { StatCard, StatCardGrid } from '@/components/admin/tasting-tracking/StatCards';
import { PillarTabs } from '@/components/tasting-tracking/PillarTabs';
import {
  DEFAULT_FILTER_VALUES,
  filtersToRpc,
  TastingTrackingFilters,
  type TastingTrackingFilterValues,
} from '@/components/tasting-tracking/TastingTrackingFilters';
import { InfiniteScrollList } from '@/components/tasting-tracking/InfiniteScrollList';
import { formatTrackingDateShort, tastingTierLabel } from '@/lib/tastingTrackingLabels';

type TabId = 'redemptions' | 'outstanding';

export default function HostTastingTrackingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedOrgId = searchParams.get('orgId');
  const { user, loading: authLoading } = useAuth();
  const { isSuperAdmin, isStaffUser, isLoading: roleLoading } = useUserRole();
  const { data: orgs = [], isLoading: orgsLoading } = useOrgs();

  const defaultOrgId = useMemo(() => {
    if (preselectedOrgId && orgs.some((o) => o.id === preselectedOrgId)) {
      return preselectedOrgId;
    }
    return orgs[0]?.id ?? null;
  }, [orgs, preselectedOrgId]);

  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>('redemptions');
  const [filters, setFilters] = useState<TastingTrackingFilterValues>(DEFAULT_FILTER_VALUES);

  useEffect(() => {
    if (defaultOrgId) {
      setSelectedOrgId(defaultOrgId);
    }
  }, [defaultOrgId]);

  const effectiveOrgId = selectedOrgId ?? defaultOrgId;
  const { data: org } = useOrg(effectiveOrgId ?? undefined);

  const rpcFilters = useMemo(() => filtersToRpc(filters), [filters]);

  const { data: dashboardRows = [], isLoading: dashLoading, error: dashError } =
    useHostTastingDashboard(effectiveOrgId ?? undefined);

  const packageOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const row of dashboardRows) {
      if (!seen.has(row.package_id)) seen.set(row.package_id, row.package_title);
    }
    return Array.from(seen.entries()).map(([id, title]) => ({ id, title }));
  }, [dashboardRows]);

  const redemptionsQuery = useHostTastingRedemptionsInfinite(
    effectiveOrgId ?? undefined,
    rpcFilters,
    Boolean(effectiveOrgId),
  );

  const redemptionRows = redemptionsQuery.data?.pages.flat() ?? [];

  const canAccess = Boolean(user && (isSuperAdmin || isStaffUser));

  if (authLoading || roleLoading || orgsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-sm font-semibold">Loading…</div>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <p className="text-center text-muted-foreground">Host access required.</p>
        <Button className="mx-auto mt-4 block" variant="outline" onClick={() => navigate('/settings')}>
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
              { id: 'redemptions', label: 'Redemptions' },
              { id: 'outstanding', label: 'Outstanding' },
            ]}
            activeId={tab}
            onChange={(id) => setTab(id as TabId)}
          />
          {tab === 'redemptions' ? (
            <TastingTrackingFilters
              values={filters}
              onChange={setFilters}
              packages={packageOptions}
            />
          ) : null}
        </div>
      </div>

      <div className="container max-w-4xl space-y-4 px-4 py-6">
        {orgs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No organizations assigned yet.</p>
        ) : (
          <>
            {orgs.length > 1 ? (
              <Select
                value={effectiveOrgId ?? undefined}
                onValueChange={(v) => setSelectedOrgId(v)}
              >
                <SelectTrigger aria-label="Organization">
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {orgs.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.org_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground">{org?.org_name ?? 'Shop'}</p>
            )}

            {tab === 'redemptions' ? (
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
            ) : dashError ? (
              <p className="text-sm text-destructive">{(dashError as Error).message}</p>
            ) : dashLoading ? (
              <p className="text-sm text-muted-foreground">Loading summary…</p>
            ) : dashboardRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tasting packages assigned to this shop.</p>
            ) : (
              <div className="space-y-4">
                {dashboardRows.map((row) => (
                  <div
                    key={`${row.package_id}-${row.tier}`}
                    className="space-y-3 rounded-xl border border-border bg-card p-4"
                  >
                    <div>
                      <p className="font-semibold">{row.package_title}</p>
                      <p className="text-xs text-muted-foreground">
                        {tastingTierLabel(row.tier)} · {row.item_name}
                      </p>
                    </div>
                    <StatCardGrid className="grid-cols-3">
                      <StatCard label="Expected" value={String(row.expected_vouchers)} />
                      <StatCard label="Redeemed" value={String(row.redeemed)} />
                      <StatCard label="Remaining" value={String(row.remaining)} />
                    </StatCardGrid>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
