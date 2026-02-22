import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { localYMD } from '@/lib/date';

export function useMonthlyRuns(year: number, month: number) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['runs', user?.id, year, month],
    queryFn: async () => {
      if (!user) return [];

      const startDate = localYMD(new Date(year, month, 1));
      const endDate = localYMD(new Date(year, month + 1, 0));

      const { data, error } = await supabase
        .from('daily_runs')
        .select('*')
        .eq('user_id', user.id)
        .gte('run_date', startDate)
        .lte('run_date', endDate);

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
        .from('daily_runs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('run_date', startDate)
        .lte('run_date', today);

      if (error) throw error;

      return {
        completed: count || 0,
        total: new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(),
      };
    },
    enabled: !!user,
  });
}

export function useTodayRun() {
  const { user } = useAuth();
  const today = localYMD();

  return useQuery({
    queryKey: ['today-run', user?.id, today],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('daily_runs')
        .select('*')
        .eq('user_id', user.id)
        .eq('run_date', today)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export interface CheckInDetails {
  duration_minutes?: number | null;
  run_type?: 'easy' | 'tempo' | 'long_slow_distance' | 'interval' | null;
  tiredness_score?: number | null;
}

export function useCheckIn() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const today = localYMD();

  return useMutation({
    mutationFn: async (details?: CheckInDetails) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('daily_runs')
        .insert({
          user_id: user.id,
          run_date: today,
          duration_minutes: details?.duration_minutes ?? null,
          run_type: details?.run_type ?? null,
          tiredness_score: details?.tiredness_score ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['today-run'] });
      queryClient.invalidateQueries({ queryKey: ['current-month-progress'] });
      queryClient.invalidateQueries({ queryKey: ['runs'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['today-percentage'] });
    },
  });
}

export function useTodayPercentage() {
  return useQuery({
    queryKey: ['today-percentage'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_today_run_percentage');
      if (error) throw error;
      return Number(data) || 0;
    },
  });
}
