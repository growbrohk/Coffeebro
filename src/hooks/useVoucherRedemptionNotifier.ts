import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { MyVoucher } from '@/hooks/useMyVouchers';

type Props = {
  onVoucherRedeemedDetected: (voucherId: string) => void;
};

const PROMPTED_CAP = 500;
const PROMPT_DEBOUNCE_MS = 2500;
const POLL_INTERVAL_MS = 3000;

/**
 * Subscribes to voucher rows for the current user; when status becomes redeemed,
 * flips the wallet cache and shows the redeem prompt (Review opens log flow later).
 */
export function useVoucherRedemptionNotifier({ onVoucherRedeemedDetected }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const promptedRef = useRef<Set<string>>(new Set());
  const lastPromptRef = useRef<{ id: string; at: number } | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    promptedRef.current = new Set();
    lastPromptRef.current = null;

    const userId = user.id;
    const walletKey: ['vouchers', 'my', string] = ['vouchers', 'my', userId];

    const refreshWallet = () => {
      void queryClient.invalidateQueries({ queryKey: walletKey });
      void queryClient.refetchQueries({ queryKey: walletKey, type: 'active' });
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

    const maybeShowPrompt = async (voucherId: string) => {
      const now = Date.now();
      const last = lastPromptRef.current;
      if (last?.id === voucherId && now - last.at < PROMPT_DEBOUNCE_MS) return;

      const { data: existing } = await supabase
        .from('daily_coffees')
        .select('id')
        .eq('voucher_id', voucherId)
        .maybeSingle();

      if (existing) return;

      lastPromptRef.current = { id: voucherId, at: Date.now() };
      onVoucherRedeemedDetected(voucherId);
    };

    const handleRedeemed = (voucherId: string) => {
      if (promptedRef.current.has(voucherId)) return;

      if (promptedRef.current.size >= PROMPTED_CAP) {
        promptedRef.current = new Set();
      }
      promptedRef.current.add(voucherId);

      optimisticFlipToRedeemed(voucherId);
      refreshWallet();
      void maybeShowPrompt(voucherId);
    };

    const startPollFallback = () => {
      if (pollTimerRef.current) return;
      pollTimerRef.current = setInterval(() => {
        refreshWallet();
      }, POLL_INTERVAL_MS);
    };

    const stopPollFallback = () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
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
          handleRedeemed(row.id);
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          stopPollFallback();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          startPollFallback();
        }
      });

    return () => {
      stopPollFallback();
      promptedRef.current = new Set();
      lastPromptRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [user?.id, onVoucherRedeemedDetected, queryClient]);
}
