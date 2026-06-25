export type TastingTrackingDashboard = {
  packages_sold: number;
  total_revenue_cents: number;
  vouchers_created: number;
  vouchers_redeemed: number;
  vouchers_unredeemed: number;
  redemption_rate: number;
};

export type TastingPackageSaleRow = {
  package_id: string;
  package_title: string;
  tier: string;
  sold: number;
  revenue_cents: number;
  vouchers_created: number;
  vouchers_redeemed: number;
  redemption_rate: number;
};

export type TastingPurchaseFilters = {
  package_id?: string;
  tier?: string;
  status?: string;
  purchase_id?: string;
  date_from?: string;
  date_to?: string;
  buyer_search?: string;
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

export type TastingPurchaseVoucherRow = {
  voucher_id: string;
  voucher_code: string;
  shop_name: string;
  item_name: string;
  status: string;
  redeemed_at: string | null;
  redeemed_by_name: string | null;
};

export type TastingRedemptionFilters = {
  package_id?: string;
  tier?: string;
  org_id?: string;
  menu_item_id?: string;
  redemption_status?: 'redeemed' | 'unredeemed';
  date_from?: string;
  date_to?: string;
  buyer_search?: string;
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
  redeemed_at: string | null;
  scanned_by_name: string | null;
};

export type TastingShopSummaryRow = {
  org_id: string;
  shop_name: string;
  assigned_vouchers: number;
  redeemed: number;
  unredeemed: number;
  redemption_rate: number;
};

export type TastingShopItemRow = {
  menu_item_id: string;
  item_name: string;
  issued: number;
  redeemed: number;
  remaining: number;
};

export type TastingPackageTrackingSummary = {
  package_id: string;
  package_title: string;
  package_status: string;
  is_active: boolean;
  sold: number;
  revenue_cents: number;
  vouchers_per_purchase: number | null;
  vouchers_created: number;
  vouchers_redeemed: number;
  vouchers_unredeemed: number;
  redemption_rate: number;
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

export type HostTastingRedemptionRow = {
  voucher_id: string;
  redeemed_at: string;
  buyer_name: string;
  package_title: string;
  tier: string;
  item_name: string;
  status: string;
};
