import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { FrogType } from '@/lib/quiz/types';

export function useUserQuizResult(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-quiz-result', userId],
    queryFn: async (): Promise<FrogType | null> => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('quiz_results')
        .select('result_type')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data?.result_type as FrogType) ?? null;
    },
    enabled: !!userId,
  });
}
