import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/** Receipt rows for one org — spend and visit times for insights. */
export function useShopReceiptLogs(
  orgId: string | undefined,
  year: number,
  monthIndex: number,
) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["shop-receipt-logs", user?.id, orgId, year, monthIndex],
    queryFn: async () => {
      if (!user || !orgId) return [];

      const pad = (n: number) => String(n).padStart(2, "0");
      const start = `${year}-${pad(monthIndex + 1)}-01`;
      const last = new Date(year, monthIndex + 1, 0).getDate();
      const end = `${year}-${pad(monthIndex + 1)}-${pad(last)}`;

      const { data, error } = await supabase
        .from("daily_coffees")
        .select(
          "id, receipt_amount_cents, receipt_line_items, created_at, coffee_date",
        )
        .eq("user_id", user.id)
        .eq("org_id", orgId)
        .eq("log_type", "receipt")
        .gte("coffee_date", start)
        .lte("coffee_date", end);

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user && !!orgId,
  });
}

export type LineAgg = { name: string; count: number; spendCents: number };

export function aggregateReceiptLogs(
  rows: {
    receipt_amount_cents: number | null;
    receipt_line_items: unknown;
    created_at: string;
  }[],
) {
  const totalSpendCents = rows.reduce(
    (s, r) => s + (r.receipt_amount_cents ?? 0),
    0,
  );
  const visitCount = rows.length;
  const aovCents = visitCount > 0 ? Math.round(totalSpendCents / visitCount) : 0;

  const drinkCounts = new Map<string, { count: number; spendCents: number }>();
  for (const r of rows) {
    const raw = r.receipt_line_items;
    if (raw == null || typeof raw !== "object") continue;
    const items = Array.isArray(raw) ? raw : (raw as { line_items?: unknown }).line_items;
    const list = Array.isArray(items) ? items : [];
    for (const it of list as { name?: string; qty?: number; unit_price_cents?: number }[]) {
      const name = String(it?.name ?? "").trim() || "Item";
      const qty = Math.max(1, Math.round(Number(it?.qty ?? 1)));
      const lineCents = Math.round(Number(it?.unit_price_cents ?? 0)) * qty;
      const cur = drinkCounts.get(name) ?? { count: 0, spendCents: 0 };
      cur.count += qty;
      cur.spendCents += lineCents;
      drinkCounts.set(name, cur);
    }
  }

  let topName = "—";
  let topCount = 0;
  for (const [name, v] of drinkCounts) {
    if (v.count > topCount) {
      topCount = v.count;
      topName = name;
    }
  }

  const heat = new Array(24).fill(0);
  for (const r of rows) {
    const d = new Date(r.created_at);
    const h = d.getHours();
    heat[h] += 1;
  }

  return {
    totalSpendCents,
    visitCount,
    aovCents,
    topItemLabel: topCount > 0 ? topName : "—",
    hourBuckets: heat,
  };
}

export function useShopInsightsAggregate(
  orgId: string | undefined,
  year: number,
  monthIndex: number,
) {
  const q = useShopReceiptLogs(orgId, year, monthIndex);
  const agg = useMemo(
    () => aggregateReceiptLogs(q.data ?? []),
    [q.data],
  );
  return { ...q, agg };
}
