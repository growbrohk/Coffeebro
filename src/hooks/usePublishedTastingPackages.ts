import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { TastingPackage, TastingPackageRedemptionDate, TastingPackageShop, TastingPackageTier } from "@/types/tastingPackage";

const PACKAGE_SELECT = `
  *,
  tasting_package_shops (
    id,
    org_id,
    tier,
    sort_order,
    orgs ( org_name, logo_url, preview_photo_url, lat, lng, location ),
    tasting_package_items (
      id,
      menu_item_id,
      portion_index,
      menu_items ( id, item_name )
    )
  )
`;

function mapPackageRow(row: Record<string, unknown>): TastingPackage {
  const rawShops = row.tasting_package_shops;
  const shopRows = (Array.isArray(rawShops) ? rawShops : []) as Record<string, unknown>[];

  const shops: TastingPackageShop[] = shopRows.map((s) => {
    const rawOrg = s.orgs;
    const org = (Array.isArray(rawOrg) ? rawOrg[0] : rawOrg) as Record<string, unknown> | null;
    const rawItems = s.tasting_package_items;
    const itemRows = (Array.isArray(rawItems) ? rawItems : []) as Record<string, unknown>[];

    const items = itemRows
      .map((it) => {
        const rawMenu = it.menu_items;
        const menu = (Array.isArray(rawMenu) ? rawMenu[0] : rawMenu) as { id: string; item_name: string } | null;
        return {
          id: it.id as string,
          item_name: menu?.item_name ?? "Drink",
          portion_index: it.portion_index as number,
        };
      })
      .sort((a, b) => a.portion_index - b.portion_index);

    return {
      id: s.id as string,
      org_id: s.org_id as string,
      tier: s.tier as TastingPackageTier,
      sort_order: s.sort_order as number,
      org_name: (org?.org_name as string) ?? null,
      org_logo_url: (org?.logo_url as string) ?? null,
      org_preview_photo_url: (org?.preview_photo_url as string) ?? null,
      lat: (org?.lat as number) ?? null,
      lng: (org?.lng as number) ?? null,
      location: (org?.location as string) ?? null,
      items,
    };
  });

  shops.sort((a, b) => a.sort_order - b.sort_order);

  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) ?? null,
    hk_areas: (row.hk_areas as string[]) ?? [],
    districts: (row.districts as string[]) ?? [],
    mtr_stations: (row.mtr_stations as string[]) ?? [],
    cover_image_url: (row.cover_image_url as string) ?? null,
    status: row.status as string,
    is_active: (row.is_active as boolean | undefined) ?? true,
    single_price_cents: row.single_price_cents as number,
    duo_price_cents: row.duo_price_cents as number,
    redeem_valid_days: row.redeem_valid_days as number,
    created_by: (row.created_by as string) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    shops,
  };
}

export const publishedTastingPackagesQueryKey = ["tasting-packages", "published"] as const;

export function usePublishedTastingPackages() {
  return useQuery({
    queryKey: publishedTastingPackagesQueryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasting_packages")
        .select(PACKAGE_SELECT)
        .eq("status", "published")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []).map((row) => mapPackageRow(row as Record<string, unknown>));
    },
    staleTime: 30_000,
  });
}

export function useTastingPackage(id: string | undefined) {
  return useQuery({
    queryKey: ["tasting-package", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("tasting_packages")
        .select(PACKAGE_SELECT)
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      return mapPackageRow(data as Record<string, unknown>);
    },
    enabled: Boolean(id),
  });
}

export function useAllTastingPackages() {
  return useQuery({
    queryKey: ["tasting-packages", "admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasting_packages")
        .select(PACKAGE_SELECT)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return (data ?? []).map((row) => mapPackageRow(row as Record<string, unknown>));
    },
  });
}

export function useTastingPackageRedemptionDates(packageId: string | undefined) {
  return useQuery({
    queryKey: ["tasting-package-redemption-dates", packageId],
    queryFn: async () => {
      if (!packageId) return [];
      const { data, error } = await supabase.rpc("get_tasting_package_redemption_dates", {
        p_package_id: packageId,
      });
      if (error) throw error;
      return (data ?? []) as TastingPackageRedemptionDate[];
    },
    enabled: Boolean(packageId),
    staleTime: 15_000,
  });
}

export function useMyTastingPackagePurchases() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["tasting-package-purchases", "my", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("tasting_package_purchases")
        .select("id, package_id, tier, status, mint_error, tasting_packages ( id, title )")
        .eq("user_id", user.id)
        .in("status", ["pending", "paid", "minted", "failed"]);

      if (error) throw error;
      return data ?? [];
    },
    enabled: Boolean(user),
  });
}

export function useTastingPackagePurchaseBySession(sessionId: string | null | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["tasting-package-purchase", "session", user?.id, sessionId],
    queryFn: async () => {
      if (!user || !sessionId) return null;

      const { data, error } = await supabase
        .from("tasting_package_purchases")
        .select("id, package_id, tier, status, mint_error, tasting_packages ( id, title )")
        .eq("stripe_checkout_session_id", sessionId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: Boolean(user && sessionId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "minted" || status === "failed") return false;
      return 1500;
    },
  });
}
