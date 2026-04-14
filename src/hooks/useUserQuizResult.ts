import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LEGACY_FROG_MAP } from '@/lib/quiz/constants';
import type { FrogType } from '@/lib/quiz/types';

export interface UserQuizResultData {
  resultType: FrogType;
  /** Present for newer quiz rows; older rows may omit. */
  scores: Record<FrogType, number> | null;
}

export function useUserQuizResult(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-quiz-result', userId],
    queryFn: async (): Promise<UserQuizResultData | null> => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('quiz_results')
        .select('result_type, scores')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      const raw = data?.result_type as string | undefined;
      if (!raw) return null;
      const resultType = (LEGACY_FROG_MAP[raw] as FrogType) ?? (raw as FrogType);
      const rawScores = data?.scores as Record<string, number> | null | undefined;
      const scores =
        rawScores && typeof rawScores === 'object'
          ? (rawScores as Record<FrogType, number>)
          : null;
      return { resultType, scores };
    },
    enabled: !!userId,
  });
}
