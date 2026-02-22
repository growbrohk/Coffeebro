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
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export interface CoffeeCheckInDetails {
  rating?: number | null;
  coffee_type?: string | null;
  coffee_type_other?: string | null;
  place?: string | null;
  diary?: string | null;
}

export function useCoffeeCheckIn() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const today = localYMD();

  return useMutation({
    mutationFn: async (details?: CoffeeCheckInDetails) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('daily_coffees')
        .upsert({
          user_id: user.id,
          coffee_date: today,
          rating: details?.rating ?? null,
          coffee_type: details?.coffee_type ?? null,
          coffee_type_other: details?.coffee_type_other ?? null,
          place: details?.place ?? null,
          diary: details?.diary ?? null,
        }, {
          onConflict: 'user_id,coffee_date',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['today-coffee'] });
      queryClient.invalidateQueries({ queryKey: ['current-month-progress'] });
      queryClient.invalidateQueries({ queryKey: ['coffees'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['today-percentage'] });
    },
  });
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
