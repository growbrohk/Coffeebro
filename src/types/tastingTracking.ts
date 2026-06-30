export type TastingPurchaseFilters = {
  package_id?: string;
  tier?: string;
  date_from?: string;
  date_to?: string;
  buyer_search?: string;
  limit?: number;
  cursor_created_at?: string;
  cursor_id?: string;
};

export type TastingPurchaseRow = {
  purchase_id: string;
  buyer_id: string;
  buyer_name: string;
  buyer_email: string | null;
  package_id: string;
  package_title: string;
  tier: string;
  amount_cents: number;
  payment_status: string;
  purchase_status: string;
  created_at: string;
  voucher_count: number;
  redeemed_count: number;
};

export type TastingRedemptionFilters = {
  package_id?: string;
  tier?: string;
  org_id?: string;
  menu_item_id?: string;
  date_from?: string;
  date_to?: string;
  buyer_search?: string;
  limit?: number;
  cursor_redeemed_at?: string;
  cursor_id?: string;
};

export type TastingRedemptionRow = {
  voucher_id: string;
  voucher_code: string;
  buyer_id: string;
  buyer_name: string;
  buyer_email: string | null;
  package_id: string;
  package_title: string;
  tier: string;
  org_id: string;
  shop_name: string;
  menu_item_id: string | null;
  item_name: string;
  status: string;
  created_at: string;
  redeemed_at: string;
  scanned_by_name: string | null;
};

export type HostTastingRedemptionFilters = {
  package_id?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  cursor_redeemed_at?: string;
  cursor_id?: string;
};

export type HostTastingRedemptionRow = {
  voucher_id: string;
  redeemed_at: string;
  buyer_name: string;
  package_title: string;
  tier: string;
  item_name: string;
  status: string;
  scanned_by_name: string | null;
};

export type HostTastingDashboardRow = {
  package_id: string;
  package_title: string;
  tier: string;
  org_id: string;
  org_name: string;
  expected_vouchers: number;
  redeemed: number;
  remaining: number;
  item_name: string;
};

export const TASTING_TRACKING_PAGE_SIZE = 10;

export type PurchaseCursor = { created_at: string; id: string } | null;
export type RedemptionCursor = { redeemed_at: string; id: string } | null;
