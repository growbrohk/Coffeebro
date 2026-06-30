import { useEffect, useRef, useState } from 'react';
import { Filter, Search } from 'lucide-react';
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

const ALL = 'all';

export type TastingTrackingFilterValues = {
  packageId: string;
  dateFrom: string;
  dateTo: string;
  buyerSearch: string;
};

type PackageOption = { id: string; title: string };

type TastingTrackingFiltersProps = {
  values: TastingTrackingFilterValues;
  onChange: (values: TastingTrackingFilterValues) => void;
  packages: PackageOption[];
  showBuyerSearch?: boolean;
  searchPlaceholder?: string;
};

export function TastingTrackingFilters({
  values,
  onChange,
  packages,
  showBuyerSearch = false,
  searchPlaceholder = 'Search buyer name or email…',
}: TastingTrackingFiltersProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(values.buyerSearch);
  const valuesRef = useRef(values);
  valuesRef.current = values;

  useEffect(() => {
    setSearchInput(values.buyerSearch);
  }, [values.buyerSearch]);

  useEffect(() => {
    if (!showBuyerSearch) return;
    const timer = window.setTimeout(() => {
      if (searchInput === valuesRef.current.buyerSearch) return;
      onChange({ ...valuesRef.current, buyerSearch: searchInput });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput, showBuyerSearch, onChange]);

  const filtersActive =
    values.packageId !== ALL || Boolean(values.dateFrom) || Boolean(values.dateTo);

  return (
    <div className="relative flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-2">
      {showBuyerSearch ? (
        <>
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={searchPlaceholder}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            autoComplete="off"
            aria-label="Search"
          />
        </>
      ) : (
        <span className="flex-1 text-sm text-muted-foreground">Filters</span>
      )}
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
            <Select
              value={values.packageId}
              onValueChange={(v) => onChange({ ...values, packageId: v })}
            >
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
            <label className="text-xs font-medium text-muted-foreground" htmlFor="tt-date-from">
              From
            </label>
            <Input
              id="tt-date-from"
              type="date"
              value={values.dateFrom}
              onChange={(e) => onChange({ ...values, dateFrom: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="tt-date-to">
              To
            </label>
            <Input
              id="tt-date-to"
              type="date"
              value={values.dateTo}
              onChange={(e) => onChange({ ...values, dateTo: e.target.value })}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function filtersToRpc(values: TastingTrackingFilterValues) {
  const f: {
    package_id?: string;
    date_from?: string;
    date_to?: string;
    buyer_search?: string;
  } = {};
  if (values.packageId !== ALL) f.package_id = values.packageId;
  if (values.dateFrom) f.date_from = new Date(values.dateFrom).toISOString();
  if (values.dateTo) f.date_to = new Date(`${values.dateTo}T23:59:59`).toISOString();
  const q = values.buyerSearch.trim();
  if (q) f.buyer_search = q;
  return f;
}

export const DEFAULT_FILTER_VALUES: TastingTrackingFilterValues = {
  packageId: ALL,
  dateFrom: '',
  dateTo: '',
  buyerSearch: '',
};
