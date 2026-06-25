import { formatTastingPrice } from '@/types/tastingPackage';

export function tastingTierLabel(tier: string, priceCents?: number | null): string {
  if (tier === 'single') {
    return priceCents != null ? `${formatTastingPrice(priceCents)} Single Pass` : 'Single Pass';
  }
  if (tier === 'duo') {
    return priceCents != null ? `${formatTastingPrice(priceCents)} Pair Pass` : 'Pair Pass';
  }
  return tier;
}

export function formatRedemptionRate(rate: number): string {
  return `${Number(rate).toFixed(1)}%`;
}

export function formatTrackingDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTrackingDateShort(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
