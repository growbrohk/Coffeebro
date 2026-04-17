import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { localYMD } from '@/lib/date';
import { computeCoffeeStreakFromToday } from '@/lib/coffeeStreak';

export function useMonthlyCoffees(year: number, month: number) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['coffees', user?.id, year, month],
    queryFn: async () => {
      if (!user) return [];

      const startDate = localYMD(new Date(year, month, 1));
      const endDate = localYMD(new Date(year, month + 1, 0));

      const { data, error } = await supabase
        .from('daily_coffees')
        .select('*')
        .eq('user_id', user.id)
        .gte('coffee_date', startDate)
        .lte('coffee_date', endDate);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
}

/** Total coffees logged in a specific calendar month (local). */
export function useCalendarMonthCoffeeCount(year: number, month: number) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['month-coffee-count', user?.id, year, month],
    queryFn: async () => {
      if (!user) return 0;

      const startDate = localYMD(new Date(year, month, 1));
      const endDate = localYMD(new Date(year, month + 1, 0));

      const { count, error } = await supabase
        .from('daily_coffees')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('coffee_date', startDate)
        .lte('coffee_date', endDate);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });
}

export function useCoffeeStreak() {
  const { user } = useAuth();
  const today = localYMD();
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  const windowStart = localYMD(twoYearsAgo);

  return useQuery({
    queryKey: ['coffee-streak', user?.id, today],
    queryFn: async () => {
      if (!user) return 0;

      const { data, error } = await supabase
        .from('daily_coffees')
        .select('coffee_date')
        .eq('user_id', user.id)
        .lte('coffee_date', today)
        .gte('coffee_date', windowStart);

      if (error) throw error;
      const logged = new Set((data || []).map((r) => r.coffee_date));
      return computeCoffeeStreakFromToday(logged, today);
    },
    enabled: !!user,
  });
}

export type CoffeeLocationKind = 'home' | 'coffee_shop' | 'other';

/** Payload for inserting a daily coffee log (matches `daily_coffees` after restructure). */
export interface CoffeeDetails {
  location_kind: CoffeeLocationKind | null;
  org_id: string | null;
  place: string | null;
  log_item: string | null;
  log_item_other: string | null;
  tasting_notes: string | null;
  /** Present for post-voucher redemption logs — uses `log_coffee_for_voucher` RPC. */
  voucher_id?: string | null;
  /** Local calendar date (YYYY-MM-DD); voucher flow uses redemption day */
  coffee_date?: string | null;
  share_publicly?: boolean | null;
  /** When set, PATCH the existing voucher-linked daily_coffees row instead of inserting. */
  review_id?: string | null;
}

// A) useAddCoffee() - INSERT mutation (NOT upsert)
export function useAddCoffee() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const today = localYMD();

  return useMutation({
    mutationFn: async (details: CoffeeDetails) => {
      if (!user) throw new Error('Not authenticated');

      if (details.voucher_id && details.review_id) {
        const { data, error } = await supabase
          .from('daily_coffees')
          .update({
            log_item: details.log_item ?? null,
            log_item_other: details.log_item_other ?? null,
            tasting_notes: details.tasting_notes ?? null,
            share_publicly: details.share_publicly ?? false,
          })
          .eq('id', details.review_id)
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      }

      if (details.voucher_id) {
        const coffeeDate = details.coffee_date ?? today;
        const { data, error } = await supabase.rpc('log_coffee_for_voucher', {
          p_voucher_id: details.voucher_id,
          p_org_id: details.org_id ?? (() => {
            throw new Error('org_id required for voucher log');
          })(),
          p_place: details.place,
          p_log_item: details.log_item,
          p_log_item_other: details.log_item_other,
          p_tasting_notes: details.tasting_notes,
          p_share_publicly: details.share_publicly ?? false,
          p_coffee_date: coffeeDate,
        });

        if (error) throw error;
        const row = data as Record<string, unknown> | Record<string, unknown>[] | null;
        if (Array.isArray(row)) return row[0] ?? null;
        return row;
      }

      const { data, error } = await supabase
        .from('daily_coffees')
        .insert({
          user_id: user.id,
          coffee_date: details.coffee_date ?? today,
          location_kind: details.location_kind ?? null,
          org_id: details.org_id ?? null,
          place: details.place ?? null,
          log_item: details.log_item ?? null,
          log_item_other: details.log_item_other ?? null,
          tasting_notes: details.tasting_notes ?? null,
          log_type: 'normal',
          share_publicly: false,
          voucher_id: null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['today-coffees'] });
      queryClient.invalidateQueries({ queryKey: ['month-coffee-count'] });
      queryClient.invalidateQueries({ queryKey: ['month-coffee-day-counts'] });
      queryClient.invalidateQueries({ queryKey: ['coffees'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['today-percentage'] });
      queryClient.invalidateQueries({ queryKey: ['coffee-streak'] });
      queryClient.invalidateQueries({ queryKey: ['lifetime-coffee-count'] });
      queryClient.invalidateQueries({ queryKey: ['coffee-profile-stats'] });
      if (variables.voucher_id) {
        queryClient.invalidateQueries({ queryKey: ['vouchers', 'my', user?.id] });
      }
    },
  });
}

// B) useTodayCoffees() - Return array of coffee rows for today
export function useTodayCoffees() {
  const { user } = useAuth();
  const today = localYMD();

  return useQuery({
    queryKey: ['today-coffees', user?.id, today],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('daily_coffees')
        .select('*')
        .eq('user_id', user.id)
        .eq('coffee_date', today)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
}

function drinkLabelFromRow(row: {
  log_item: string | null;
  log_item_other: string | null;
}): string {
  const t = (row.log_item || '').trim();
  if (!t) return '';
  if (t === 'Other') return (row.log_item_other || '').trim();
  return t;
}

export interface CoffeeProfileRankedItem {
  label: string;
  count: number;
}

function topNEntriesFromCounts(
  counts: Map<string, number>,
  n: number,
): CoffeeProfileRankedItem[] {
  return [...counts.entries()]
    .filter(([k]) => k.length > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([label, count]) => ({ label, count }));
}

/** All-time coffee entry count for the current user. */
export function useLifetimeCoffeeCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['lifetime-coffee-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;

      const { count, error } = await supabase
        .from('daily_coffees')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });
}

/** Top places and drink labels from logged coffees (lifetime). */
export function useCoffeeProfileStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['coffee-profile-stats', user?.id],
    queryFn: async () => {
      if (!user)
        return { topPlaces: [] as CoffeeProfileRankedItem[], topDrinks: [] as CoffeeProfileRankedItem[] };

      const { data, error } = await supabase
        .from('daily_coffees')
        .select('place, log_item, log_item_other')
        .eq('user_id', user.id);

      if (error) throw error;

      const placeCounts = new Map<string, number>();
      const drinkCounts = new Map<string, number>();

      for (const row of data || []) {
        const place = (row.place || '').trim();
        if (place) {
          placeCounts.set(place, (placeCounts.get(place) || 0) + 1);
        }
        const drink = drinkLabelFromRow(row);
        if (drink) {
          drinkCounts.set(drink, (drinkCounts.get(drink) || 0) + 1);
        }
      }

      return {
        topPlaces: topNEntriesFromCounts(placeCounts, 3),
        topDrinks: topNEntriesFromCounts(drinkCounts, 3),
      };
    },
    enabled: !!user,
  });
}

// C) useMonthCoffeeCount() - Return total number of coffees in current month
export function useMonthCoffeeCount() {
  const { user } = useAuth();
  const now = new Date();

  return useQuery({
    queryKey: ['month-coffee-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;

      const startDate = localYMD(new Date(now.getFullYear(), now.getMonth(), 1));
      const endDate = localYMD(new Date(now.getFullYear(), now.getMonth() + 1, 0));

      const { count, error } = await supabase
        .from('daily_coffees')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('coffee_date', startDate)
        .lte('coffee_date', endDate);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });
}

// D) useMonthCoffeeDayCounts() - Return map of date -> count for calendar
export function useMonthCoffeeDayCounts(year?: number, month?: number) {
  const { user } = useAuth();
  const now = new Date();
  const targetYear = year ?? now.getFullYear();
  const targetMonth = month ?? now.getMonth();

  return useQuery({
    queryKey: ['month-coffee-day-counts', user?.id, targetYear, targetMonth],
    queryFn: async () => {
      if (!user) return {} as Record<string, number>;

      const startDate = localYMD(new Date(targetYear, targetMonth, 1));
      const endDate = localYMD(new Date(targetYear, targetMonth + 1, 0));

      const { data, error } = await supabase
        .from('daily_coffees')
        .select('coffee_date')
        .eq('user_id', user.id)
        .gte('coffee_date', startDate)
        .lte('coffee_date', endDate);

      if (error) throw error;

      // Group by date and count
      const counts: Record<string, number> = {};
      (data || []).forEach((row) => {
        const date = row.coffee_date;
        counts[date] = (counts[date] || 0) + 1;
      });

      return counts;
    },
    enabled: !!user,
  });
}

// Legacy hook for backward compatibility (deprecated - use useMonthCoffeeCount instead)
export function useCurrentMonthProgress() {
  const { user } = useAuth();
  const now = new Date();

  return useQuery({
    queryKey: ['current-month-progress', user?.id],
    queryFn: async () => {
      if (!user) return { completed: 0, total: now.getDate() };

      const startDate = localYMD(new Date(now.getFullYear(), now.getMonth(), 1));
      const today = localYMD(now);

      const { count, error } = await supabase
        .from('daily_coffees')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('coffee_date', startDate)
        .lte('coffee_date', today);

      if (error) throw error;

      return {
        completed: count || 0,
        total: new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(),
      };
    },
    enabled: !!user,
  });
}

// Legacy hook for backward compatibility (deprecated - use useTodayCoffees instead)
export function useTodayCoffee() {
  const { user } = useAuth();
  const today = localYMD();

  return useQuery({
    queryKey: ['today-coffee', user?.id, today],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('daily_coffees')
        .select('*')
        .eq('user_id', user.id)
        .eq('coffee_date', today)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

// Legacy hook for backward compatibility (deprecated - use useAddCoffee instead)
export function useCoffeeCheckIn() {
  return useAddCoffee();
}

export function useTodayPercentage() {
  return useQuery({
    queryKey: ['today-percentage'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_today_coffee_percentage');
      if (error) throw error;
      return Number(data) || 0;
    },
  });
}
