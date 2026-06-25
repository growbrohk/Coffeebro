import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Filter, Search } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { useAllTastingPackages } from '@/hooks/usePublishedTastingPackages';
import { useTastingRedemptions } from '@/hooks/useTastingTracking';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
import { downloadCsv, rowsToCsv } from '@/lib/exportCsv';
import {
  formatTrackingDate,
  formatTrackingDateShort,
  tastingTierLabel,
} from '@/lib/tastingTrackingLabels';
import type { TastingRedemptionFilters } from '@/types/tastingTracking';

const ALL = 'all';

export default function AdminTastingRedemptionsPage() {
  const navigate = useNavigate();
  const { isSuperAdmin, isLoading: roleLoading } = useUserRole();
  const { data: packages = [] } = useAllTastingPackages();

  const [searchQuery, setSearchQuery] = useState('');
  const [packageFilter, setPackageFilter] = useState(ALL);
  const [tierFilter, setTierFilter] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);

  const filters = useMemo((): TastingRedemptionFilters => {
    const f: TastingRedemptionFilters = {};
    if (packageFilter !== ALL) f.package_id = packageFilter;
    if (tierFilter !== ALL) f.tier = tierFilter;
    if (statusFilter === 'redeemed' || statusFilter === 'unredeemed') {
      f.redemption_status = statusFilter;
    }
    if (dateFrom) f.date_from = new Date(dateFrom).toISOString();
    if (dateTo) f.date_to = new Date(`${dateTo}T23:59:59`).toISOString();
    const q = searchQuery.trim();
    if (q) f.buyer_search = q;
    return f;
  }, [packageFilter, tierFilter, statusFilter, dateFrom, dateTo, searchQuery]);

  const filtersActive =
    packageFilter !== ALL ||
    tierFilter !== ALL ||
    statusFilter !== ALL ||
    Boolean(dateFrom) ||
    Boolean(dateTo);

  const { data: rows = [], isLoading, error } = useTastingRedemptions(filters, isSuperAdmin);

  const handleExport = () => {
    const csv = rowsToCsv(
      [
        'Time',
        'Buyer',
        'Email',
        'Package',
        'Pass',
        'Shop',
        'Item',
        'Status',
        'Scanned by',
        'Code',
      ],
      rows.map((r) => ({
        time: r.redeemed_at ? formatTrackingDate(r.redeemed_at) : formatTrackingDate(r.created_at),
        buyer: r.buyer_name,
        email: r.buyer_email ?? '',
        package: r.package_title,
        pass: tastingTierLabel(r.tier),
        shop: r.shop_name,
        item: r.item_name,
        status: r.status,
        scanned_by: r.scanned_by_name ?? '',
        code: r.voucher_code,
      })),
      ['time', 'buyer', 'email', 'package', 'pass', 'shop', 'item', 'status', 'scanned_by', 'code'],
    );
    downloadCsv(`tasting-redemptions-${new Date().toISOString().slice(0, 10)}.csv`, csv);
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
            onClick={() => navigate('/admin/tasting-tracking')}
            className="absolute left-0 p-2"
            aria-label="Back"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="font-heading text-xl font-bold">Redemptions</h1>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0"
            onClick={handleExport}
            disabled={rows.length === 0}
            aria-label="Export CSV"
          >
            <Download className="h-5 w-5" />
          </Button>
        </div>
        <div className="border-t border-border px-4 pb-3 pt-2">
          <div className="relative flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search buyer name or email…"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              autoComplete="off"
              aria-label="Search redemptions"
            />
            <Popover open={filterOpen} onOpenChange={setFilterOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="relative h-8 w-8 shrink-0 rounded-full"
                  aria-label="Open filters"
                >
                  <Filter className="h-4 w-4" />
                  {filtersActive ? (
                    <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" aria-hidden />
                  ) : null}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 space-y-3">
                <p className="text-sm font-semibold">Filters</p>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Package</label>
                  <Select value={packageFilter} onValueChange={setPackageFilter}>
                    <SelectTrigger aria-label="Package">
                      <SelectValue placeholder="All packages" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>All packages</SelectItem>
                      {packages.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Pass tier</label>
                  <Select value={tierFilter} onValueChange={setTierFilter}>
                    <SelectTrigger aria-label="Pass tier">
                      <SelectValue placeholder="All tiers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>All tiers</SelectItem>
                      <SelectItem value="single">Single pass</SelectItem>
                      <SelectItem value="duo">Pair pass</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger aria-label="Redemption status">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>All</SelectItem>
                      <SelectItem value="redeemed">Redeemed</SelectItem>
                      <SelectItem value="unredeemed">Unredeemed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground" htmlFor="date-from">
                    From
                  </label>
                  <Input id="date-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground" htmlFor="date-to">
                    To
                  </label>
                  <Input id="date-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      <div className="container max-w-5xl space-y-4 px-4 py-6">
        {error ? (
          <p className="text-sm text-destructive">{(error as Error).message}</p>
        ) : isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No matching vouchers.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Shop</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Scanned by</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.voucher_id}>
                  <TableCell className="text-xs whitespace-nowrap">
                    {r.redeemed_at
                      ? formatTrackingDateShort(r.redeemed_at)
                      : formatTrackingDateShort(r.created_at)}
                  </TableCell>
                  <TableCell>{r.buyer_name}</TableCell>
                  <TableCell className="text-xs">
                    <div>{r.package_title}</div>
                    <div className="text-muted-foreground">{tastingTierLabel(r.tier)}</div>
                  </TableCell>
                  <TableCell>{r.shop_name}</TableCell>
                  <TableCell>{r.item_name}</TableCell>
                  <TableCell className="capitalize">{r.status}</TableCell>
                  <TableCell className="text-xs">{r.scanned_by_name ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
