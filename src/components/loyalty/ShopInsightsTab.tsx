import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useShopInsightsAggregate } from "@/hooks/useShopLoyaltyInsights";

const HKD = (cents: number) =>
  new Intl.NumberFormat("en-HK", { style: "currency", currency: "HKD" }).format(cents / 100);

function HeatCell({ hour, n, max }: { hour: number; n: number; max: number }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={cn(
          "h-10 w-full rounded-md border border-white/10",
          n === 0 ? "bg-white/5" : "bg-primary",
        )}
        style={{
          opacity: n === 0 ? 0.2 : 0.25 + (0.75 * n) / max,
        }}
        title={`${hour}:00 — ${n} visit(s)`}
      />
      {hour % 4 === 0 ? (
        <span className="text-[9px] text-muted-foreground">{hour}</span>
      ) : (
        <span className="text-[9px] opacity-0">·</span>
      )}
    </div>
  );
}

export function VisitHeatmap({ buckets }: { buckets: number[] }) {
  const max = useMemo(() => Math.max(1, ...buckets), [buckets]);
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Visits by hour
      </p>
      <div className="space-y-1">
        <div className="grid grid-cols-12 gap-1">
          {buckets.slice(0, 12).map((n, i) => (
            <HeatCell key={i} hour={i} n={n} max={max} />
          ))}
        </div>
        <div className="grid grid-cols-12 gap-1">
          {buckets.slice(12, 24).map((n, i) => (
            <HeatCell key={i + 12} hour={i + 12} n={n} max={max} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ShopInsightsTab({
  orgId,
  orgName,
}: {
  orgId: string;
  orgName: string;
}) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [monthIndex, setMonthIndex] = useState(now.getMonth());

  const { data: rows, isLoading, agg } = useShopInsightsAggregate(orgId, year, monthIndex);

  const label = new Date(year, monthIndex, 1).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{orgName}</p>
        <div className="flex items-center gap-2">
          <input
            type="month"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={`${year}-${String(monthIndex + 1).padStart(2, "0")}`}
            onChange={(e) => {
              const [y, m] = e.target.value.split("-").map(Number);
              setYear(y);
              setMonthIndex(m - 1);
            }}
          />
        </div>
      </div>

      <p className="text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </p>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading insights…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/15 to-background p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Total spend
              </p>
              <p className="mt-1 font-heading text-2xl font-bold tabular-nums">
                {HKD(agg.totalSpendCents)}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/15 to-background p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Visits
              </p>
              <p className="mt-1 font-heading text-2xl font-bold tabular-nums">{agg.visitCount}</p>
            </div>
            <div className="col-span-2 rounded-2xl border border-border bg-gradient-to-br from-primary/20 to-background p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                AOV
              </p>
              <p className="mt-1 font-heading text-2xl font-bold tabular-nums">{HKD(agg.aovCents)}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-primary/30 bg-foreground p-4 text-background shadow-md">
            <p className="text-[10px] font-bold uppercase tracking-widest text-background/70">
              Top ordered
            </p>
            <p className="mt-2 font-heading text-xl font-bold leading-tight">{agg.topItemLabel}</p>
            <p className="mt-1 text-sm text-background/80">
              From receipt line items this month.
            </p>
          </div>

          <VisitHeatmap buckets={agg.hourBuckets} />
          {rows?.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">
              No receipt visits this month — scan a receipt at this café to see insights.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
