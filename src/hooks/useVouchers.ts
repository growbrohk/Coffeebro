import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Voucher {
  id: string;
  offer_id: string;
  org_id: string;
  owner_id: string;
  code: string;
  selected_coffee_type: string | null;
  status: 'active' | 'redeemed' | 'expired' | 'refunded';
  created_at: string;
  redeemed_at: string | null;
  expires_at: string | null;
}

export interface MintVoucherResult {
  voucher_id: string;
  code: string;
  remaining: number | null;
  total: number;
}

/**
 * Hook to get the current user's voucher for a specific offer
 */
export function useMyVoucherForOffer(offerId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['voucher', 'my', offerId],
    queryFn: async () => {
      if (!offerId || !user) return null;

      const { data, error } = await supabase
        .from('vouchers')
        .select('*')
        .eq('offer_id', offerId)
        .eq('owner_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return (data as Voucher) || null;
    },
    enabled: !!offerId && !!user,
  });
}

/**
 * Hook to get the count of vouchers minted for an offer
 */
export function useVoucherCountForOffer(offerId: string | null) {
  return useQuery({
    queryKey: ['voucher', 'count', offerId],
    queryFn: async () => {
      if (!offerId) return 0;

      const { count, error } = await supabase
        .from('vouchers')
        .select('*', { count: 'exact', head: true })
        .eq('offer_id', offerId)
        .in('status', ['active', 'redeemed']);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!offerId,
  });
}

/** "Top X%" among voucher holders (see my_voucher_hunter_top_percent RPC). Null if user has no qualifying vouchers. */
export function useMyVoucherTopPercent() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['voucher-hunter-top-percent', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase.rpc('my_voucher_hunter_top_percent');

      if (error) throw error;
      return data as number | null;
    },
    enabled: !!user,
  });
}

/**
 * Hook to mint a voucher (call RPC)
 */
export function useMintVoucher() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      offerId,
      selectedCoffeeType,
    }: {
      offerId: string;
      selectedCoffeeType: string | null;
    }): Promise<MintVoucherResult> => {
      const { data, error } = await supabase.rpc('mint_voucher_atomic', {
        p_offer_id: offerId,
        p_selected_coffee_type: selectedCoffeeType,
      });

      if (error) {
        // Map error codes to user-friendly messages
        const errorMessage = error.message || 'Failed to mint voucher';
        throw new Error(errorMessage);
      }

      if (!data || data.length === 0) {
        throw new Error('No data returned from mint_voucher_atomic');
      }

      return data[0] as MintVoucherResult;
    },
    onSuccess: (result, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['voucher', 'my', variables.offerId] });
      queryClient.invalidateQueries({ queryKey: ['voucher', 'count', variables.offerId] });
      queryClient.invalidateQueries({ queryKey: ['vouchers', 'my'] });
      queryClient.invalidateQueries({ queryKey: ['voucher-hunter-top-percent'] });
    },
  });
}
