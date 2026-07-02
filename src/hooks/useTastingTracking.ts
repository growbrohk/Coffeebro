import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  TASTING_TRACKING_PAGE_SIZE as PAGE_SIZE,
  type HostTastingDashboardRow,
  type HostTastingRedemptionFilters,
  type HostTastingRedemptionRow,
  type PurchaseCursor,
  type RedemptionCursor,
  type TastingPurchaseFilters,
  type TastingPurchaseRow,
  type TastingRedemptionFilters,
  type TastingRedemptionRow,
  type TastingTrackingSummary,
  type TastingTrackingTab,
} from '@/types/tastingTracking';

function mapPurchaseRow(row: {
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
  affiliate_user_id: string | null;
  affiliate_username: string | null;
}): TastingPurchaseRow {
  return {
    purchase_id: row.purchase_id,
    buyer_id: row.buyer_id,
    buyer_name: row.buyer_name,
    buyer_email: row.buyer_email,
    package_id: row.package_id,
    package_title: row.package_title,
    tier: row.tier,
    amount_cents: row.amount_cents,
    payment_status: row.payment_status,
    purchase_status: row.purchase_status,
    created_at: row.created_at,
    voucher_count: Number(row.voucher_count),
    redeemed_count: Number(row.redeemed_count),
    affiliate_user_id: row.affiliate_user_id,
    affiliate_username: row.affiliate_username,
  };
}

function mapRedemptionRow(row: {
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
  shop_split_cents: number | null;
}): TastingRedemptionRow {
  return {
    voucher_id: row.voucher_id,
    voucher_code: row.voucher_code,
    buyer_id: row.buyer_id,
    buyer_name: row.buyer_name,
    buyer_email: row.buyer_email,
    package_id: row.package_id,
    package_title: row.package_title,
    tier: row.tier,
    org_id: row.org_id,
    shop_name: row.shop_name,
    menu_item_id: row.menu_item_id,
    item_name: row.item_name,
    status: row.status,
    created_at: row.created_at,
    redeemed_at: row.redeemed_at,
    scanned_by_name: row.scanned_by_name,
    shop_split_cents: Number(row.shop_split_cents ?? 0),
  };
}

function mapHostRedemptionRow(row: {
  voucher_id: string;
  redeemed_at: string;
  buyer_name: string;
  package_title: string;
  tier: string;
  item_name: string;
  status: string;
  scanned_by_name: string | null;
}): HostTastingRedemptionRow {
  return {
    voucher_id: row.voucher_id,
    redeemed_at: row.redeemed_at,
    buyer_name: row.buyer_name,
    package_title: row.package_title,
    tier: row.tier,
    item_name: row.item_name,
    status: row.status,
    scanned_by_name: row.scanned_by_name,
  };
}

export function useTastingPurchasesInfinite(
  filters: Omit<TastingPurchaseFilters, 'limit' | 'cursor_created_at' | 'cursor_id'>,
  enabled = true,
) {
  return useInfiniteQuery({
    queryKey: ['tasting-purchases-infinite', filters],
    queryFn: async ({ pageParam }) => {
      const cursor = pageParam as PurchaseCursor;
      const rpcFilters: TastingPurchaseFilters = {
        ...filters,
        limit: PAGE_SIZE,
        ...(cursor
          ? { cursor_created_at: cursor.created_at, cursor_id: cursor.id }
          : {}),
      };
      const { data, error } = await supabase.rpc('list_tasting_purchases', {
        p_filters: rpcFilters,
      });
      if (error) throw error;
      return (data ?? []).map(mapPurchaseRow);
    },
    initialPageParam: null as PurchaseCursor,
    getNextPageParam: (lastPage): PurchaseCursor | undefined => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      const last = lastPage[lastPage.length - 1];
      return { created_at: last.created_at, id: last.purchase_id };
    },
    enabled,
  });
}

export function useTastingRedemptionsInfinite(
  filters: Omit<TastingRedemptionFilters, 'limit' | 'cursor_redeemed_at' | 'cursor_id'>,
  enabled = true,
) {
  return useInfiniteQuery({
    queryKey: ['tasting-redemptions-infinite', filters],
    queryFn: async ({ pageParam }) => {
      const cursor = pageParam as RedemptionCursor;
      const rpcFilters: TastingRedemptionFilters = {
        ...filters,
        limit: PAGE_SIZE,
        ...(cursor
          ? { cursor_redeemed_at: cursor.redeemed_at, cursor_id: cursor.id }
          : {}),
      };
      const { data, error } = await supabase.rpc('list_tasting_redemptions', {
        p_filters: rpcFilters,
      });
      if (error) throw error;
      return (data ?? []).map(mapRedemptionRow);
    },
    initialPageParam: null as RedemptionCursor,
    getNextPageParam: (lastPage): RedemptionCursor | undefined => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      const last = lastPage[lastPage.length - 1];
      return { redeemed_at: last.redeemed_at, id: last.voucher_id };
    },
    enabled,
  });
}

export function useHostTastingRedemptionsInfinite(
  orgId?: string,
  filters: Omit<HostTastingRedemptionFilters, 'limit' | 'cursor_redeemed_at' | 'cursor_id'> = {},
  enabled = true,
) {
  return useInfiniteQuery({
    queryKey: ['host-tasting-redemptions-infinite', orgId, filters],
    queryFn: async ({ pageParam }) => {
      const cursor = pageParam as RedemptionCursor;
      const { data, error } = await supabase.rpc('list_host_tasting_redemptions', {
        p_org_id: orgId!,
        p_package_id: filters.package_id ?? undefined,
        p_date_from: filters.date_from ?? undefined,
        p_date_to: filters.date_to ?? undefined,
        p_limit: PAGE_SIZE,
        p_cursor_redeemed_at: cursor?.redeemed_at ?? undefined,
        p_cursor_id: cursor?.id ?? undefined,
      });
      if (error) throw error;
      return (data ?? []).map(mapHostRedemptionRow);
    },
    initialPageParam: null as RedemptionCursor,
    getNextPageParam: (lastPage): RedemptionCursor | undefined => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      const last = lastPage[lastPage.length - 1];
      return { redeemed_at: last.redeemed_at, id: last.voucher_id };
    },
    enabled: Boolean(orgId) && enabled,
  });
}

export function useHostTastingDashboard(orgId?: string, packageId?: string | null) {
  return useQuery({
    queryKey: ['host-tasting-dashboard', orgId, packageId ?? null],
    queryFn: async (): Promise<HostTastingDashboardRow[]> => {
      const { data, error } = await supabase.rpc('get_host_tasting_dashboard', {
        p_org_id: orgId!,
        p_package_id: packageId ?? undefined,
      });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        package_id: row.package_id,
        package_title: row.package_title,
        tier: row.tier,
        org_id: row.org_id,
        org_name: row.org_name,
        expected_vouchers: Number(row.expected_vouchers),
        redeemed: Number(row.redeemed),
        remaining: Number(row.remaining),
        item_name: row.item_name,
      }));
    },
    enabled: Boolean(orgId),
  });
}

export function useTastingTrackingSummary(
  filters: Omit<TastingPurchaseFilters, 'limit' | 'cursor_created_at' | 'cursor_id'>,
  tab: TastingTrackingTab,
  enabled = true,
) {
  return useQuery({
    queryKey: ['tasting-tracking-summary', tab, filters],
    queryFn: async (): Promise<TastingTrackingSummary> => {
      const { data, error } = await supabase.rpc('get_tasting_tracking_summary', {
        p_filters: filters,
        p_tab: tab,
      });
      if (error) throw error;
      const row = (data ?? [])[0];
      return {
        packages_sold: Number(row?.packages_sold ?? 0),
        revenue_cents: Number(row?.revenue_cents ?? 0),
        profit_cents: Number(row?.profit_cents ?? 0),
        vouchers_total: Number(row?.vouchers_total ?? 0),
        vouchers_redeemed: Number(row?.vouchers_redeemed ?? 0),
      };
    },
    enabled,
  });
}
