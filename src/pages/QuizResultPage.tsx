import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserQuizResult } from '@/hooks/useUserQuizResult';
import { QuizResultFull } from '@/components/quiz/QuizResultFull';
import { Button } from '@/components/ui/button';
import { frogScorePercentages } from '@/lib/quiz/scoring';
import type { FrogType } from '@/lib/quiz/types';

export default function QuizResultPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: quizRow, isLoading: resultLoading } = useUserQuizResult(user?.id);
  const quizResultType = quizRow?.resultType ?? null;
  const scorePercentages =
    quizRow?.scores != null ? frogScorePercentages(quizRow.scores) : null;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/profile?msg=quiz');
    }
  }, [authLoading, user, navigate]);

  if (authLoading || (user && resultLoading)) {
    return (
      <div className="quiz-flow flex min-h-dvh items-center justify-center px-6">
        <p className="animate-pulse text-[var(--quiz-fg)]">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!quizResultType) {
    return (
      <div className="quiz-flow flex min-h-dvh flex-col items-center justify-center p-6">
        <div className="mx-auto w-full max-w-md space-y-6 text-center">
          <p className="text-4xl">🐸</p>
          <h1 className="font-heading text-2xl font-bold tracking-normal text-[var(--quiz-fg)]">
            Discover Your Coffee Frog
          </h1>
          <p className="text-[var(--quiz-fg)]/85">
            Take the CoffeeBro quiz to find out your cafe personality — and who matches you best.
          </p>
          <Button
            className="h-12 w-full border-0 bg-[var(--quiz-fg)] font-semibold text-[var(--quiz-bg)] hover:bg-white/90"
            onClick={() => navigate('/q')}
          >
            Take the quiz
          </Button>
        </div>
      </div>
    );
  }

  return (
    <QuizResultFull
      resultType={quizResultType as FrogType}
      scorePercentages={scorePercentages}
    />
  );
}
