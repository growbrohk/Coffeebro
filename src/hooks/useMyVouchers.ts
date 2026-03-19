import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const OFFER_TYPE_LABELS: Record<string, string> = {
  free: 'Free',
  $17coffee: '$17 Coffee',
  buy1get1free: 'Buy 1 Get 1 Free',
};

export interface MyVoucher {
  id: string;
  code: string;
  status: 'active' | 'redeemed' | 'expired' | 'refunded';
  source_type: 'coffee_offer' | 'hunt_stop';
  created_at: string;
  redeemed_at: string | null;
  expires_at: string | null;
  // Display info
  title: string;
  org_name?: string;
  offer_type?: string;
}

export function useMyVouchers() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['vouchers', 'my', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Note: Regenerate Supabase types after migrations to get full type support
      const { data: vouchers, error } = await (supabase as any)
        .from('vouchers')
        .select(`
          id,
          code,
          status,
          source_type,
          created_at,
          redeemed_at,
          expires_at,
          coffee_offer_id,
          treasure_reward_id,
          org_id,
          orgs(org_name),
          coffee_offers(name, offer_type),
          treasure_reward(title, offer_type)
        `)
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const result: MyVoucher[] = (vouchers || []).map((v: any) => {
        let title = 'Voucher';
        let offerType: string | undefined;
        if (v.source_type === 'coffee_offer' && v.coffee_offers) {
          title = v.coffee_offers.name || title;
          offerType = v.coffee_offers.offer_type;
        } else if (v.source_type === 'hunt_stop' && v.treasure_reward) {
          title = v.treasure_reward.title || title;
          offerType = v.treasure_reward.offer_type;
        }
        return {
          id: v.id,
          code: v.code,
          status: v.status,
          source_type: v.source_type,
          created_at: v.created_at,
          redeemed_at: v.redeemed_at,
          expires_at: v.expires_at,
          title,
          org_name: v.orgs?.org_name,
          offer_type: offerType ? OFFER_TYPE_LABELS[offerType] ?? offerType : undefined,
        };
      });

      return result;
    },
    enabled: !!user,
  });
}
