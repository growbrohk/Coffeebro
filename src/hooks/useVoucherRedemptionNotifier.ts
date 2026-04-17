import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { fetchVoucherLogPrefill, type VoucherLogPrefill } from '@/lib/fetchVoucherLogPrefill';

type Props = {
  onVoucherRedeemed: (prefill: VoucherLogPrefill) => void;
};

/**
 * Subscribes to voucher rows for the current user; when status becomes redeemed,
 * opens the log-coffee flow with org + menu prefill (after verifying no log exists yet).
 */
export function useVoucherRedemptionNotifier({ onVoucherRedeemed }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const debounceRef = useRef<{ id: string; at: number } | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const maybeOpen = async (voucherId: string) => {
      const now = Date.now();
      const d = debounceRef.current;
      if (d?.id === voucherId && now - d.at < 2500) return;
      debounceRef.current = { id: voucherId, at: now };

      const { data: existing } = await supabase
        .from('daily_coffees')
        .select('id')
        .eq('voucher_id', voucherId)
        .maybeSingle();

      if (existing) return;

      const prefill = await fetchVoucherLogPrefill(voucherId);
      if (!prefill) return;

      onVoucherRedeemed(prefill);
    };

    const channel = supabase
      .channel(`vouchers_owner_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'vouchers',
          filter: `owner_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as { id?: string; status?: string };
          if (row.status !== 'redeemed' || !row.id) return;
          void queryClient.invalidateQueries({ queryKey: ['vouchers', 'my', user.id] });
          void maybeOpen(row.id);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id, onVoucherRedeemed, queryClient]);
}
