import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { localYMD } from '@/lib/date';

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

export interface CoffeeDetails {
  rating?: number | null;
  coffee_type?: string | null;
  coffee_type_other?: string | null;
  place?: string | null;
  diary?: string | null;
}

// A) useAddCoffee() - INSERT mutation (NOT upsert)
export function useAddCoffee() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const today = localYMD();

  return useMutation({
    mutationFn: async (details: CoffeeDetails) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('daily_coffees')
        .insert({
          user_id: user.id,
          coffee_date: today,
          rating: details.rating ?? null,
          coffee_type: details.coffee_type ?? null,
          coffee_type_other: details.coffee_type_other ?? null,
          place: details.place ?? null,
          diary: details.diary ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['today-coffees'] });
      queryClient.invalidateQueries({ queryKey: ['month-coffee-count'] });
      queryClient.invalidateQueries({ queryKey: ['month-coffee-day-counts'] });
      queryClient.invalidateQueries({ queryKey: ['coffees'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['today-percentage'] });
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
