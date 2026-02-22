import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useMaxStreak() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['max-streak', user?.id],
    queryFn: async () => {
      if (!user) return 0;

      const { data, error } = await supabase
        .from('daily_runs')
        .select('run_date')
        .eq('user_id', user.id)
        .order('run_date', { ascending: true });

      if (error) throw error;
      if (!data || data.length === 0) return 0;

      const dates = data.map(d => new Date(d.run_date));
      let maxStreak = 1;
      let currentStreak = 1;

      for (let i = 1; i < dates.length; i++) {
        const prevDate = dates[i - 1];
        const currDate = dates[i];
        const diffTime = currDate.getTime() - prevDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          currentStreak++;
          maxStreak = Math.max(maxStreak, currentStreak);
        } else if (diffDays > 1) {
          currentStreak = 1;
        }
      }

      return maxStreak;
    },
    enabled: !!user,
  });
}
