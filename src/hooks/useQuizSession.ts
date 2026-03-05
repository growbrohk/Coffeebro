import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LEGACY_FROG_MAP } from '@/lib/quiz/constants';
import type { FrogType } from '@/lib/quiz/types';

const SESSION_TOKEN_KEY = 'coffeebro_quiz_session';

export function getOrCreateSessionToken(): string {
  let token = sessionStorage.getItem(SESSION_TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    sessionStorage.setItem(SESSION_TOKEN_KEY, token);
  }
  return token;
}

export function getSessionToken(): string | null {
  return sessionStorage.getItem(SESSION_TOKEN_KEY);
}

export function useQuizSession() {
  const startQuiz = useCallback(async (storeId: string): Promise<{ ok: boolean; error?: string }> => {
    const token = getOrCreateSessionToken();
    const { data, error } = await supabase.rpc('start_quiz_anon', {
      p_session_token: token,
      p_store_id: storeId,
    });
    const row = data?.[0];
    if (error) return { ok: false, error: error.message };
    if (row?.status !== 'OK') return { ok: false, error: row?.message ?? 'Failed to start' };
    return { ok: true };
  }, []);

  const completeQuiz = useCallback(
    async (
      storeId: string,
      answers: Record<number, string>,
      scores: Record<FrogType, number>,
      resultType: FrogType
    ): Promise<{ ok: boolean; error?: string }> => {
      const token = getSessionToken();
      if (!token) return { ok: false, error: 'No session' };
      const { data, error } = await supabase.rpc('complete_quiz_anon', {
        p_session_token: token,
        p_store_id: storeId,
        p_answers: answers,
        p_scores: scores,
        p_result_type: resultType,
      });
      const row = data?.[0];
      if (error) return { ok: false, error: error.message };
      if (row?.status !== 'OK') return { ok: false, error: row?.message ?? 'Failed to complete' };
      return { ok: true };
    },
    []
  );

  const claimResult = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    const token = getSessionToken();
    if (!token) return { ok: false, error: 'No session' };
    const { data, error } = await supabase.rpc('claim_quiz_result', {
      p_session_token: token,
    });
    const row = data?.[0];
    if (error) return { ok: false, error: error.message };
    if (row?.status !== 'OK' && row?.status !== 'Already claimed')
      return { ok: false, error: row?.message ?? 'Failed to claim' };
    return { ok: true };
  }, []);

  const fetchResultBySession = useCallback(async () => {
    const token = getSessionToken();
    if (!token) return null;
    const { data, error } = await supabase.rpc('get_quiz_result_by_session', {
      p_session_token: token,
    });
    if (error || !data?.[0]) return null;
    const row = data[0] as {
      id: string;
      user_id: string | null;
      store_id: string;
      answers: Record<number, string>;
      scores: Record<FrogType, number>;
      result_type: string;
      created_at: string;
    };
    const resultType =
      (LEGACY_FROG_MAP[row.result_type] as FrogType) ?? (row.result_type as FrogType);
    return { ...row, result_type: resultType };
  }, []);

  return { startQuiz, completeQuiz, claimResult, fetchResultBySession };
}
