import type { CampaignMapItem } from "@/types/campaignMapItem";

export type CampaignVoucherPoolRow = {
  campaign_id: string;
  campaign_voucher_id: string;
  quantity: number;
  minted_count: number;
  remaining: number;
};

/** Sum `remaining` across all voucher lines per campaign. */
export function sumRemainingByCampaignId(rows: CampaignVoucherPoolRow[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    m.set(r.campaign_id, (m.get(r.campaign_id) ?? 0) + r.remaining);
  }
  return m;
}

/**
 * Attach `vouchersRemaining` from pool RPC rows. When `poolFetchSuccess` is false (loading or
 * disabled), keeps `vouchersRemaining` null so UI does not flash stale totals.
 */
export function mergePoolRowsIntoCampaignMapItems(
  items: CampaignMapItem[],
  poolRows: CampaignVoucherPoolRow[] | undefined,
  poolFetchSuccess: boolean,
): CampaignMapItem[] {
  if (!poolFetchSuccess) {
    return items.map((i) => ({ ...i, vouchersRemaining: null }));
  }
  const byCampaign = sumRemainingByCampaignId(poolRows ?? []);
  return items.map((item) => {
    const cid = item.campaign_id;
    if (!cid) {
      return { ...item, vouchersRemaining: null };
    }
    const sum = byCampaign.get(cid);
    return {
      ...item,
      vouchersRemaining: sum !== undefined ? sum : 0,
    };
  });
}
