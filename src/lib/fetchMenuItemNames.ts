import { supabase } from "@/integrations/supabase/client";

export function collectMenuItemIds(
  rows: Array<{ menu_item_id?: string | null; menu_item_ids?: string[] | null }>,
): string[] {
  const ids = new Set<string>();
  for (const row of rows) {
    if (row.menu_item_id) ids.add(row.menu_item_id);
    for (const id of row.menu_item_ids ?? []) ids.add(id);
  }
  return [...ids];
}

export async function fetchMenuItemDetails(
  ids: string[],
  signal?: AbortSignal,
): Promise<{
  names: Record<string, string>;
  prices: Record<string, number>;
}> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return { names: {}, prices: {} };
  let query = supabase
    .from("menu_items")
    .select("id, item_name, base_price")
    .in("id", unique);
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;
  if (error) throw error;
  const names: Record<string, string> = {};
  const prices: Record<string, number> = {};
  for (const row of data ?? []) {
    names[row.id] = row.item_name;
    prices[row.id] = Number(row.base_price);
  }
  return { names, prices };
}

export async function fetchMenuItemNames(
  ids: string[],
  signal?: AbortSignal,
): Promise<Record<string, string>> {
  const { names } = await fetchMenuItemDetails(ids, signal);
  return names;
}
