import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type LeaderboardKind = 'coffee' | 'voucher';
export type LeaderboardPeriod = 'day' | 'week' | 'month';

export interface LeaderboardEntry {
  id: string;
  user_id: string;
  username: string;
  created_at: string;
  run_count: number;
}

export function useLeaderboard(
  kind: LeaderboardKind = 'voucher',
  period: LeaderboardPeriod = 'day',
) {
  return useQuery({
    queryKey: ['leaderboard', kind, period],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_public_leaderboard', {
        p_kind: kind,
        p_period: period,
      });

      if (error) throw error;
      return (data || []) as LeaderboardEntry[];
    },
  });
}

export function useUserRank(
  userId: string | undefined,
  kind: LeaderboardKind = 'voucher',
  period: LeaderboardPeriod = 'day',
) {
  const { data: leaderboard } = useLeaderboard(kind, period);

  if (!userId || !leaderboard) return null;

  const index = leaderboard.findIndex((entry) => entry.user_id === userId);

  return index >= 0 ? index + 1 : null;
}
