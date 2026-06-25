import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  HostTastingDashboardRow,
  HostTastingRedemptionRow,
  TastingPackageSaleRow,
  TastingPackageTrackingSummary,
  TastingPurchaseFilters,
  TastingPurchaseRow,
  TastingPurchaseVoucherRow,
  TastingRedemptionFilters,
  TastingRedemptionRow,
  TastingShopItemRow,
  TastingShopSummaryRow,
  TastingTrackingDashboard,
} from '@/types/tastingTracking';

export function useTastingTrackingDashboard(packageId?: string | null) {
  return useQuery({
    queryKey: ['tasting-tracking-dashboard', packageId ?? null],
    queryFn: async (): Promise<TastingTrackingDashboard | null> => {
      const { data, error } = await supabase.rpc('get_tasting_tracking_dashboard', {
        p_package_id: packageId ?? undefined,
      });
      if (error) throw error;
      const row = data?.[0];
      if (!row) return null;
      return {
        packages_sold: Number(row.packages_sold),
        total_revenue_cents: Number(row.total_revenue_cents),
        vouchers_created: Number(row.vouchers_created),
        vouchers_redeemed: Number(row.vouchers_redeemed),
        vouchers_unredeemed: Number(row.vouchers_unredeemed),
        redemption_rate: Number(row.redemption_rate),
      };
    },
  });
}

export function useTastingPackageSales(packageId?: string | null) {
  return useQuery({
    queryKey: ['tasting-package-sales', packageId ?? null],
    queryFn: async (): Promise<TastingPackageSaleRow[]> => {
      const { data, error } = await supabase.rpc('list_tasting_package_sales', {
        p_package_id: packageId ?? undefined,
      });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        package_id: row.package_id,
        package_title: row.package_title,
        tier: row.tier,
        sold: Number(row.sold),
        revenue_cents: Number(row.revenue_cents),
        vouchers_created: Number(row.vouchers_created),
        vouchers_redeemed: Number(row.vouchers_redeemed),
        redemption_rate: Number(row.redemption_rate),
      }));
    },
  });
}

export function useTastingPurchases(filters: TastingPurchaseFilters, enabled = true) {
  return useQuery({
    queryKey: ['tasting-purchases', filters],
    queryFn: async (): Promise<TastingPurchaseRow[]> => {
      const { data, error } = await supabase.rpc('list_tasting_purchases', {
        p_filters: filters,
      });
      if (error) throw error;
      return (data ?? []).map((row) => ({
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
      }));
    },
    enabled,
  });
}

export function useTastingPurchaseVouchers(purchaseId?: string) {
  return useQuery({
    queryKey: ['tasting-purchase-vouchers', purchaseId],
    queryFn: async (): Promise<TastingPurchaseVoucherRow[]> => {
      const { data, error } = await supabase.rpc('list_tasting_purchase_vouchers', {
        p_purchase_id: purchaseId!,
      });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        voucher_id: row.voucher_id,
        voucher_code: row.voucher_code,
        shop_name: row.shop_name,
        item_name: row.item_name,
        status: row.status,
        redeemed_at: row.redeemed_at,
        redeemed_by_name: row.redeemed_by_name,
      }));
    },
    enabled: Boolean(purchaseId),
  });
}

export function useTastingRedemptions(filters: TastingRedemptionFilters, enabled = true) {
  return useQuery({
    queryKey: ['tasting-redemptions', filters],
    queryFn: async (): Promise<TastingRedemptionRow[]> => {
      const { data, error } = await supabase.rpc('list_tasting_redemptions', {
        p_filters: filters,
      });
      if (error) throw error;
      return (data ?? []).map((row) => ({
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
      }));
    },
    enabled,
  });
}

export function useTastingShopSummary(packageId?: string, tier?: string | null) {
  return useQuery({
    queryKey: ['tasting-shop-summary', packageId, tier ?? null],
    queryFn: async (): Promise<TastingShopSummaryRow[]> => {
      const { data, error } = await supabase.rpc('list_tasting_shop_summary', {
        p_package_id: packageId!,
        p_tier: tier ?? undefined,
      });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        org_id: row.org_id,
        shop_name: row.shop_name,
        assigned_vouchers: Number(row.assigned_vouchers),
        redeemed: Number(row.redeemed),
        unredeemed: Number(row.unredeemed),
        redemption_rate: Number(row.redemption_rate),
      }));
    },
    enabled: Boolean(packageId),
  });
}

export function useTastingShopItems(packageId?: string, orgId?: string, tier?: string | null) {
  return useQuery({
    queryKey: ['tasting-shop-items', packageId, orgId, tier ?? null],
    queryFn: async (): Promise<TastingShopItemRow[]> => {
      const { data, error } = await supabase.rpc('list_tasting_shop_items', {
        p_package_id: packageId!,
        p_org_id: orgId!,
        p_tier: tier ?? undefined,
      });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        menu_item_id: row.menu_item_id,
        item_name: row.item_name,
        issued: Number(row.issued),
        redeemed: Number(row.redeemed),
        remaining: Number(row.remaining),
      }));
    },
    enabled: Boolean(packageId && orgId),
  });
}

export function useTastingPackageTrackingSummary(packageId?: string, tier?: string | null) {
  return useQuery({
    queryKey: ['tasting-package-tracking-summary', packageId, tier ?? null],
    queryFn: async (): Promise<TastingPackageTrackingSummary | null> => {
      const { data, error } = await supabase.rpc('get_tasting_package_tracking_summary', {
        p_package_id: packageId!,
        p_tier: tier ?? undefined,
      });
      if (error) throw error;
      const row = data?.[0];
      if (!row) return null;
      return {
        package_id: row.package_id,
        package_title: row.package_title,
        package_status: row.package_status,
        is_active: row.is_active,
        sold: Number(row.sold),
        revenue_cents: Number(row.revenue_cents),
        vouchers_per_purchase: row.vouchers_per_purchase,
        vouchers_created: Number(row.vouchers_created),
        vouchers_redeemed: Number(row.vouchers_redeemed),
        vouchers_unredeemed: Number(row.vouchers_unredeemed),
        redemption_rate: Number(row.redemption_rate),
      };
    },
    enabled: Boolean(packageId),
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

export function useHostTastingRedemptions(
  orgId?: string,
  packageId?: string | null,
  dateFrom?: string | null,
  dateTo?: string | null,
) {
  return useQuery({
    queryKey: ['host-tasting-redemptions', orgId, packageId ?? null, dateFrom ?? null, dateTo ?? null],
    queryFn: async (): Promise<HostTastingRedemptionRow[]> => {
      const { data, error } = await supabase.rpc('list_host_tasting_redemptions', {
        p_org_id: orgId!,
        p_package_id: packageId ?? undefined,
        p_date_from: dateFrom ?? undefined,
        p_date_to: dateTo ?? undefined,
      });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        voucher_id: row.voucher_id,
        redeemed_at: row.redeemed_at,
        buyer_name: row.buyer_name,
        package_title: row.package_title,
        tier: row.tier,
        item_name: row.item_name,
        status: row.status,
      }));
    },
    enabled: Boolean(orgId),
  });
}
