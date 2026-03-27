import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ClaimTreasureResult {
  status: string;
  message: string;
  voucher_data: Array<{ id: string; code: string }> | null;
}

export function useClaimTreasure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (qrCodeId: string): Promise<ClaimTreasureResult> => {
      const { data, error } = await (supabase as any).rpc('claim_treasure_atomic', {
        p_qr_code_id: qrCodeId.trim(),
      });

      if (error) throw error;

      const rows = Array.isArray(data) ? data : [];
      if (rows.length === 0) {
        throw new Error('No response from claim_treasure_atomic');
      }

      const row = rows[0];
      return {
        status: row.status,
        message: row.message || '',
        voucher_data: row.voucher_data || null,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vouchers', 'my'] });
      queryClient.invalidateQueries({ queryKey: ['voucher-hunter-top-percent'] });
      queryClient.invalidateQueries({ queryKey: ['hunt'] });
      queryClient.invalidateQueries({ queryKey: ['treasures'] });
      queryClient.invalidateQueries({ queryKey: ['hunt-claims'] });
      queryClient.invalidateQueries({ queryKey: ['all-treasures'] });
    },
  });
}
