import { supabase } from '@/integrations/supabase/client';

export type VoucherLogPrefill = {
  voucherId: string;
  orgId: string;
  orgName: string | null;
  menuItemId: string | null;
  menuItemName: string | null;
  redeemedAt: string;
};

/**
 * Loads org + menu item for a voucher via a security-definer RPC so the UI gets
 * an org name even when the caller can't select `orgs` directly (e.g. campaigns
 * that are no longer published).
 */
export async function fetchVoucherLogPrefill(voucherId: string): Promise<VoucherLogPrefill | null> {
  const { data, error } = await supabase.rpc('get_voucher_log_prefill', {
    p_voucher_id: voucherId,
  });

  if (error || !data) return null;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;

  return {
    voucherId: row.voucher_id,
    orgId: row.org_id,
    orgName: row.org_name?.trim() || null,
    menuItemId: row.menu_item_id ?? null,
    menuItemName: row.menu_item_name?.trim() || null,
    redeemedAt: row.redeemed_at ?? new Date().toISOString(),
  };
}
