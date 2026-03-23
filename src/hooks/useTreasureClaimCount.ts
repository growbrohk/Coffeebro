import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useTreasureClaimCount(treasureId: string | null) {
  return useQuery({
    queryKey: ['treasure-claim-count', treasureId],
    queryFn: async (): Promise<number> => {
      if (!treasureId) return 0;

      const { count, error } = await (supabase as any)
        .from('hunt_claims')
        .select('*', { count: 'exact', head: true })
        .eq('treasure_id', treasureId);

      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!treasureId,
  });
}
