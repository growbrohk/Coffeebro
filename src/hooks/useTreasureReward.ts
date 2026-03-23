import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TreasureRewardInfo {
  id: string;
  title: string;
  offer_type: string;
  org_name: string | null;
}

export function useTreasureReward(treasureId: string | null) {
  return useQuery({
    queryKey: ['treasure-reward', treasureId],
    queryFn: async (): Promise<TreasureRewardInfo[]> => {
      if (!treasureId) return [];

      const { data, error } = await (supabase as any)
        .from('treasure_reward')
        .select('id, title, offer_type, orgs(org_name)')
        .eq('treasure_id', treasureId)
        .order('sort_order');

      if (error) throw error;

      return (data || []).map((r: any) => ({
        id: r.id,
        title: r.title || 'Reward',
        offer_type: r.offer_type || 'free',
        org_name: r.orgs?.org_name ?? null,
      }));
    },
    enabled: !!treasureId,
  });
}
