import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { QuizLanding } from '@/components/quiz/QuizLanding';
import { QuizQuestions } from '@/components/quiz/QuizQuestions';
import { QuizResultBlurred } from '@/components/quiz/QuizResultBlurred';
import { QuizResultFull } from '@/components/quiz/QuizResultFull';
import { QUESTIONS, FROG_NAMES, FROG_DESCRIPTIONS } from '@/lib/quiz/constants';
import { calculateScores, frogScorePercentages, resolveResultType } from '@/lib/quiz/scoring';
import { useQuizSession, getSessionToken } from '@/hooks/useQuizSession';
import type { FrogType } from '@/lib/quiz/types';

type QuizStep = 'landing' | 'questions' | 'blurred' | 'full';

const DEFAULT_STORE = 'default';

export default function QuizPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const storeId = searchParams.get('s') ?? DEFAULT_STORE;
  const claimParam = searchParams.get('claim');

  const { user, loading: authLoading } = useAuth();
  const { startQuiz, completeQuiz, claimResult, fetchResultBySession } = useQuizSession();

  const [step, setStep] = useState<QuizStep>('landing');
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [resultType, setResultType] = useState<FrogType | null>(null);
  const [scores, setScores] = useState<Record<FrogType, number> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCheckedSession, setHasCheckedSession] = useState(false);

  // Handle claim flow (return from signup/login)
  useEffect(() => {
    if (!claimParam || authLoading) return;
    const run = async () => {
      setIsLoading(true);
      setError(null);
      const res = await fetchResultBySession();
      if (!res) {
        setError('Result not found');
        setIsLoading(false);
        return;
      }
      if (res.user_id && user?.id && res.user_id === user.id) {
        setResultType(res.result_type);
        setScores(res.scores ?? null);
        setStep('full');
      } else if (res.user_id) {
        setError('Already claimed by another account');
      } else if (user) {
        const { ok, error: claimErr } = await claimResult();
        if (ok) {
          setResultType(res.result_type);
          setScores(res.scores ?? null);
          setStep('full');
        } else {
          setError(claimErr ?? 'Failed to claim');
        }
      } else {
        setResultType(res.result_type);
        setScores(res.scores ?? null);
        setStep('blurred');
      }
      setIsLoading(false);
    };
    run();
  }, [claimParam, user?.id, authLoading, fetchResultBySession, claimResult]);

  // On mount: check for existing result (refresh on blurred)
  useEffect(() => {
    if (step !== 'landing' || claimParam) return;
    const token = getSessionToken();
    if (!token) {
      setHasCheckedSession(true);
      return;
    }
    const run = async () => {
      const res = await fetchResultBySession();
      setHasCheckedSession(true);
      if (!res) return;
      setResultType(res.result_type);
      setScores(res.scores ?? null);
      if (res.user_id && user?.id && res.user_id === user.id) {
        setStep('full');
      } else {
        setStep('blurred');
      }
    };
    run();
  }, [step, claimParam, user?.id, fetchResultBySession]);

  const handleStart = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const { ok, error: err } = await startQuiz(storeId);
    if (ok) {
      setStep('questions');
      setCurrentQuestionIndex(0);
      setAnswers({});
      setScores(null);
    } else {
      setError(err ?? 'Failed to start');
    }
    setIsLoading(false);
  }, [storeId, startQuiz]);

  const handleAnswer = useCallback((value: string) => {
    const q = QUESTIONS[currentQuestionIndex];
    if (q) setAnswers((prev) => ({ ...prev, [q.id]: value }));
  }, [currentQuestionIndex]);

  const handleBack = useCallback(() => {
    setCurrentQuestionIndex((i) => (i > 0 ? i - 1 : i));
  }, []);

  const handleNext = useCallback(async () => {
    const q = QUESTIONS[currentQuestionIndex];
    const value = answers[q.id];
    if (!value) return;

    if (currentQuestionIndex < QUESTIONS.length - 1) {
      setCurrentQuestionIndex((i) => i + 1);
      return;
    }

    // Last question: compute, persist, show result
    const computedScores = calculateScores(answers);
    const computedType = resolveResultType(computedScores, answers, getSessionToken());
    setScores(computedScores);
    setResultType(computedType);

    setIsLoading(true);
    setError(null);
    const { ok, error: err } = await completeQuiz(storeId, answers, computedScores, computedType);
    if (!ok) {
      setError(err ?? 'Failed to save');
      setIsLoading(false);
      return;
    }

    if (user) {
      const { ok: claimOk } = await claimResult();
      if (claimOk) {
        setStep('full');
      } else {
        setStep('blurred');
      }
    } else {
      setStep('blurred');
    }
    setIsLoading(false);
  }, [currentQuestionIndex, answers, storeId, user, completeQuiz, claimResult]);

  const handleSignUp = useCallback(() => {
    const token = getSessionToken();
    navigate(`/profile?msg=quiz${token ? `&claim=${token}` : ''}`);
  }, [navigate]);

  const handleShare = useCallback(() => {
    if (!resultType) return;
    const desc = FROG_DESCRIPTIONS[resultType];
    const bestMatchName = FROG_NAMES[desc.bestMatch];
    const text = `I'm a ${FROG_NAMES[resultType]} 🐸\nBest Match: ${bestMatchName} ☕\nWhat are you?\n\nTake the quiz: ${window.location.origin}/q`;
    const shareData: ShareData = {
      title: 'CoffeeBro Coffee Quiz',
      text,
      url: `${window.location.origin}/q?r=${resultType}`,
    };
    if (navigator.share) {
      navigator.share(shareData).catch(() => {
        navigator.clipboard?.writeText(text);
      });
    } else {
      navigator.clipboard?.writeText(text);
    }
  }, [resultType]);

  if (error) {
    return (
      <div className="quiz-flow flex min-h-dvh flex-col items-center justify-center px-6">
        <p className="text-center font-medium text-[var(--quiz-fg)]">{error}</p>
        <Button
          variant="outline"
          className="mt-6 border-white/80 bg-transparent text-[var(--quiz-fg)] hover:bg-white/10 hover:text-[var(--quiz-fg)]"
          onClick={() => setStep('landing')}
        >
          Start over
        </Button>
      </div>
    );
  }

  if (isLoading && step === 'landing' && claimParam) {
    return (
      <div className="quiz-flow flex min-h-dvh items-center justify-center px-6">
        <p className="animate-pulse text-[var(--quiz-fg)]">Loading your result…</p>
      </div>
    );
  }

  if (step === 'landing' && !claimParam) {
    const token = getSessionToken();
    if (token && !hasCheckedSession) {
      return (
        <div className="quiz-flow flex min-h-dvh items-center justify-center px-6">
          <p className="animate-pulse text-[var(--quiz-fg)]">Loading…</p>
        </div>
      );
    }
    return <QuizLanding onStart={handleStart} isLoading={isLoading} />;
  }

  if (step === 'questions') {
    const question = QUESTIONS[currentQuestionIndex];
    return (
      <QuizQuestions
        question={question}
        totalQuestions={QUESTIONS.length}
        currentIndex={currentQuestionIndex}
        value={answers[question.id] ?? null}
        onValueChange={handleAnswer}
        onNext={handleNext}
        onBack={currentQuestionIndex > 0 ? handleBack : undefined}
        canProceed={!!answers[question.id]}
      />
    );
  }

  if (step === 'blurred' && resultType) {
    return (
      <QuizResultBlurred resultType={resultType} onSignUp={handleSignUp} />
    );
  }

  if (step === 'full' && resultType) {
    const scorePercentages = scores ? frogScorePercentages(scores) : null;
    return (
      <QuizResultFull
        resultType={resultType}
        scorePercentages={scorePercentages}
        onShare={handleShare}
      />
    );
  }

  return (
    <div className="quiz-flow flex min-h-dvh items-center justify-center px-6">
      <p className="animate-pulse text-[var(--quiz-fg)]">Loading…</p>
    </div>
  );
}
