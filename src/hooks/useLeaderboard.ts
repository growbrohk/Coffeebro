import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface LeaderboardEntry {
  id: string;
  user_id: string;
  username: string;
  created_at: string;
  run_count: number;
}

export function useLeaderboard() {
  return useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leaderboard')
        .select('*')
        .order('run_count', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as LeaderboardEntry[];
    },
  });
}

export function useUserRank(userId: string | undefined) {
  const { data: leaderboard } = useLeaderboard();

  if (!userId || !leaderboard) return null;

  const index = leaderboard.findIndex(entry => 
    entry.user_id === userId
  );

  return index >= 0 ? index + 1 : null;
}
