import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { fetchVoucherLogPrefill, type VoucherLogPrefill } from '@/lib/fetchVoucherLogPrefill';
import { toast } from '@/hooks/use-toast';
import type { MyVoucher } from '@/hooks/useMyVouchers';

type Props = {
  onVoucherRedeemed: (prefill: VoucherLogPrefill) => void;
};

const TOASTED_CAP = 500;
const INVALIDATE_DEBOUNCE_MS = 200;
const PREFILL_RETRY_MS = 400;

/**
 * Subscribes to voucher rows for the current user; when status becomes redeemed,
 * toasts + optimistically flips the wallet card + opens the log-coffee flow.
 */
export function useVoucherRedemptionNotifier({ onVoucherRedeemed }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const toastedRef = useRef<Set<string>>(new Set());
  const openedRef = useRef<{ id: string; at: number } | null>(null);
  const invalidateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    toastedRef.current = new Set();
    openedRef.current = null;

    const userId = user.id;
    const walletKey: ['vouchers', 'my', string] = ['vouchers', 'my', userId];

    const scheduleInvalidate = () => {
      if (invalidateTimerRef.current) return;
      invalidateTimerRef.current = setTimeout(() => {
        invalidateTimerRef.current = null;
        void queryClient.invalidateQueries({ queryKey: walletKey });
      }, INVALIDATE_DEBOUNCE_MS);
    };

    const optimisticFlipToRedeemed = (voucherId: string) => {
      queryClient.setQueryData<MyVoucher[] | undefined>(
        walletKey,
        (old) => {
          if (!old) return old;
          let changed = false;
          const next = old.map((v) => {
            if (v.id !== voucherId || v.status === 'redeemed') return v;
            changed = true;
            return {
              ...v,
              status: 'redeemed' as const,
              redeemed_at: v.redeemed_at ?? new Date().toISOString(),
            };
          });
          return changed ? next : old;
        },
      );
    };

    const maybeOpen = async (voucherId: string) => {
      const now = Date.now();
      const last = openedRef.current;
      if (last?.id === voucherId && now - last.at < 2500) return;

      const { data: existing } = await supabase
        .from('daily_coffees')
        .select('id')
        .eq('voucher_id', voucherId)
        .maybeSingle();

      if (existing) return;

      let prefill = await fetchVoucherLogPrefill(voucherId);
      if (!prefill) {
        await new Promise((r) => setTimeout(r, PREFILL_RETRY_MS));
        prefill = await fetchVoucherLogPrefill(voucherId);
      }

      if (!prefill) {
        toast({
          title: 'Could not open review',
          description: 'Please try again from your wallet.',
          variant: 'destructive',
        });
        return;
      }

      openedRef.current = { id: voucherId, at: Date.now() };
      onVoucherRedeemed(prefill);
    };

    const channel = supabase
      .channel(`vouchers_owner_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'vouchers',
          filter: `owner_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as { id?: string; status?: string };
          if (row.status !== 'redeemed' || !row.id) return;
          if (toastedRef.current.has(row.id)) return;

          if (toastedRef.current.size >= TOASTED_CAP) {
            toastedRef.current = new Set();
          }
          toastedRef.current.add(row.id);

          toast({ title: 'Voucher redeemed' });

          optimisticFlipToRedeemed(row.id);
          scheduleInvalidate();

          void maybeOpen(row.id);
        },
      )
      .subscribe();

    return () => {
      if (invalidateTimerRef.current) {
        clearTimeout(invalidateTimerRef.current);
        invalidateTimerRef.current = null;
      }
      toastedRef.current = new Set();
      openedRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [user?.id, onVoucherRedeemed, queryClient]);
}
