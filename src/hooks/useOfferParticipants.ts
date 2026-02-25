import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OfferParticipant {
  voucher_id: string;
  owner_id: string;
  owner_name: string;
  owner_handle: string;
  selected_coffee_type: string | null;
  status: string;
  created_at: string;
  redeemed_at: string | null;
}

export function useOfferParticipants(offerId: string | null) {
  return useQuery({
    queryKey: ['offer-participants', offerId],
    queryFn: async () => {
      if (!offerId) return [];

      const { data, error } = await supabase.rpc('list_offer_participants', {
        p_offer_id: offerId,
      });

      if (error) {
        // Check if error is authorization-related
        if (error.message?.includes('NOT_AUTHORIZED') || error.code === 'P0001') {
          throw new Error('NOT_AUTHORIZED');
        }
        throw error;
      }

      return (data || []) as OfferParticipant[];
    },
    enabled: !!offerId,
  });
}
