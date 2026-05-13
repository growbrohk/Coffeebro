import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLoyaltyActivityFeed, type LoyaltyActivityRow } from "@/hooks/useLoyaltyPoints";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const HKD = (cents: number) =>
  new Intl.NumberFormat("en-HK", { style: "currency", currency: "HKD" }).format(cents / 100);

function formatTime(iso: string | undefined) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

/** Purchase date on the receipt (OCR), not scan time. */
function parseCoffeeDate(value: unknown): Date | null {
  if (value == null) return null;
  const s = String(value).trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function activitySectionLabel(row: LoyaltyActivityRow): string {
  if (row.kind === "receipt_scan") {
    const receiptDay = parseCoffeeDate(row.detail_json?.coffee_date);
    if (receiptDay) {
      return receiptDay.toLocaleDateString(undefined, { dateStyle: "full" });
    }
  }
  return new Date(row.occurred_at).toLocaleDateString(undefined, { dateStyle: "full" });
}

/** List line under title: receipt purchase date vs redeem time. */
function listRowSubtitle(row: LoyaltyActivityRow): string {
  if (row.kind === "catalog_redeem") {
    return `Redeemed · ${formatTime(row.occurred_at)}`;
  }
  const receiptDay = parseCoffeeDate(row.detail_json?.coffee_date);
  if (receiptDay) {
    return `Receipt · ${receiptDay.toLocaleDateString(undefined, {
      dateStyle: "medium",
    })}`;
  }
  return `Receipt · ${formatTime(row.occurred_at)}`;
}

function ReceiptLineItems({ items }: { items: unknown }) {
  if (!items) return null;
  let parsed: { name?: string; qty?: number; unit_price_cents?: number }[] = [];
  if (Array.isArray(items)) {
    parsed = items as typeof parsed;
  } else if (typeof items === "string") {
    try {
      const j = JSON.parse(items) as unknown;
      if (Array.isArray(j)) parsed = j as typeof parsed;
    } catch {
      return null;
    }
  }
  if (parsed.length === 0) return null;
  return (
    <ul className="mt-2 space-y-1 text-sm">
      {parsed.map((li, i) => (
        <li key={i} className="flex justify-between gap-2 border-b border-border/60 py-1 last:border-0">
          <span className="min-w-0 flex-1">{li.name ?? "Item"}</span>
          <span className="shrink-0 tabular-nums text-muted-foreground">
            {li.qty != null ? `×${li.qty} ` : ""}
            {li.unit_price_cents != null ? HKD(li.unit_price_cents) : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function ShopPointsActivityPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const { data: rows = [], isLoading } = useLoyaltyActivityFeed(orgId);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<LoyaltyActivityRow | null>(null);

  const { data: org } = useQuery({
    queryKey: ["org-name", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase
        .from("orgs")
        .select("org_name")
        .eq("id", orgId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const grouped = useMemo(() => {
    const map = new Map<string, LoyaltyActivityRow[]>();
    for (const r of rows) {
      const label = activitySectionLabel(r);
      const list = map.get(label) ?? [];
      list.push(r);
      map.set(label, list);
    }
    return map;
  }, [rows]);

  if (!orgId) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <p className="text-center text-muted-foreground">Missing café.</p>
      </div>
    );
  }

  const orgName = org?.org_name ?? "Café";

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 flex items-center justify-center border-b border-border bg-background px-4 py-4">
        <button
          type="button"
          onClick={() => navigate(`/loyalty/orgs/${orgId}`)}
          className="absolute left-0 p-2"
          aria-label="Back"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="font-heading text-xl font-bold tracking-normal">Points history</h1>
      </div>

      <div className="px-4 py-4">
        <p className="text-sm text-muted-foreground">{orgName}</p>
      </div>

      <div className="px-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading activity…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No points activity yet.</p>
        ) : (
          <div className="space-y-8">
            {[...grouped.entries()].map(([dateLabel, list]) => (
              <section key={dateLabel} className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {dateLabel}
                </p>
                <ul className="space-y-2">
                  {list.map((row) => {
                    const earn = row.kind === "receipt_scan";
                    const deltaStr = `${row.delta > 0 ? "+" : ""}${row.delta}`;
                    return (
                      <li key={row.ledger_id}>
                        <button
                          type="button"
                          className="flex w-full items-start justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-muted/40"
                          onClick={() => {
                            setSelected(row);
                            setOpen(true);
                          }}
                        >
                          <div className="min-w-0">
                            <p className="font-medium leading-snug">{row.title}</p>
                            <p className="text-xs text-muted-foreground">{listRowSubtitle(row)}</p>
                          </div>
                          <span
                            className={cn(
                              "shrink-0 tabular-nums text-sm font-semibold",
                              earn ? "text-emerald-600 dark:text-emerald-400" : "text-destructive",
                            )}
                          >
                            {deltaStr} pts
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="flex max-h-[90vh] flex-col overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{selected?.kind === "receipt_scan" ? "Receipt" : "Reward"}</SheetTitle>
          </SheetHeader>
          {selected && selected.kind === "receipt_scan" && (() => {
            const rd = parseCoffeeDate(selected.detail_json?.coffee_date);
            const rawCoffeeDate = selected.detail_json?.coffee_date;
            return (
            <div className="mt-4 space-y-3 text-sm">
              <p className="text-lg font-semibold tabular-nums">
                {typeof selected.detail_json?.receipt_amount_cents === "number"
                  ? HKD(selected.detail_json.receipt_amount_cents)
                  : "—"}
              </p>
              {typeof selected.detail_json?.place === "string" && selected.detail_json.place ? (
                <p>
                  <span className="text-muted-foreground">Place</span>
                  <br />
                  {selected.detail_json.place}
                </p>
              ) : null}
              {(typeof selected.detail_json?.org_location === "string" &&
                selected.detail_json.org_location) ||
              (typeof selected.detail_json?.org_district === "string" &&
                selected.detail_json.org_district) ? (
                <p>
                  <span className="text-muted-foreground">Address</span>
                  <br />
                  {[selected.detail_json.org_location, selected.detail_json.org_district]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              ) : null}
              {typeof selected.detail_json?.order_no === "string" &&
              selected.detail_json.order_no.trim() ? (
                <p>
                  <span className="text-muted-foreground">Order</span>
                  <br />
                  {selected.detail_json.order_no}
                </p>
              ) : null}
              <p>
                <span className="text-muted-foreground">Receipt date</span>
                <br />
                {rd
                  ? rd.toLocaleDateString(undefined, { dateStyle: "long" })
                  : rawCoffeeDate != null && String(rawCoffeeDate).trim() !== ""
                    ? String(rawCoffeeDate)
                    : "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Logged at</span>
                <br />
                {formatTime(
                  typeof selected.detail_json?.created_at === "string"
                    ? selected.detail_json.created_at
                    : selected.occurred_at,
                )}
              </p>
              <div>
                <span className="text-muted-foreground">Items</span>
                <ReceiptLineItems items={selected.detail_json?.receipt_line_items} />
              </div>
              <p className="pt-2 text-xs text-muted-foreground">
                +{selected.delta} points from this receipt
              </p>
            </div>
            );
          })()}
          {selected && selected.kind === "catalog_redeem" && (
            <div className="mt-4 space-y-3 text-sm">
              <p className="font-medium">{selected.title}</p>
              <p className="tabular-nums text-destructive">{selected.delta} pts</p>
              {typeof selected.detail_json?.voucher_code === "string" ? (
                <p>
                  <span className="text-muted-foreground">Code</span>
                  <br />
                  <span className="font-mono text-base font-semibold">
                    {selected.detail_json.voucher_code}
                  </span>
                </p>
              ) : null}
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            className="mt-6"
            onClick={() => setOpen(false)}
          >
            Close
          </Button>
        </SheetContent>
      </Sheet>
    </div>
  );
}
