export type ReceiptLineItem = {
  name?: string;
  qty?: number;
  unit_price_cents?: number;
};

export function formatHkd(cents: unknown): string {
  const value = Number(cents);
  if (!Number.isFinite(value)) return '';
  return new Intl.NumberFormat('en-HK', { style: 'currency', currency: 'HKD' }).format(value / 100);
}

export function parseReceiptLineItems(items: unknown): ReceiptLineItem[] {
  if (!items) return [];
  if (Array.isArray(items)) return items as ReceiptLineItem[];
  if (typeof items === 'string') {
    try {
      const parsed = JSON.parse(items) as unknown;
      if (Array.isArray(parsed)) return parsed as ReceiptLineItem[];
    } catch {
      return [];
    }
  }
  if (typeof items === 'object' && items !== null && 'line_items' in items) {
    const nested = (items as { line_items?: unknown }).line_items;
    if (Array.isArray(nested)) return nested as ReceiptLineItem[];
  }
  return [];
}

export function formatReceiptItemSummary(item: ReceiptLineItem): string {
  const name = item.name?.trim() || 'Item';
  return item.qty != null ? `${name} ×${item.qty}` : name;
}

export function formatReceiptItemsSummary(items: unknown): string {
  return parseReceiptLineItems(items).map(formatReceiptItemSummary).join(', ');
}
