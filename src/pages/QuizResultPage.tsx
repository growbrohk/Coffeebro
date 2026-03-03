import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserQuizResult } from '@/hooks/useUserQuizResult';
import { QuizResultFull } from '@/components/quiz/QuizResultFull';
import { Button } from '@/components/ui/button';
import { FROG_NAMES, FROG_DESCRIPTIONS } from '@/lib/quiz/constants';
import type { FrogType } from '@/lib/quiz/types';

export default function QuizResultPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: quizResultType, isLoading: resultLoading } = useUserQuizResult(user?.id);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/profile?msg=quiz');
    }
  }, [authLoading, user, navigate]);

  const handleShare = () => {
    if (!quizResultType) return;
    const desc = FROG_DESCRIPTIONS[quizResultType];
    const bestMatchName = FROG_NAMES[desc.bestMatch];
    const text = `I'm a ${FROG_NAMES[quizResultType]} 🐸\nBest Match: ${bestMatchName} ☕\nWhat are you?\n\nTake the quiz: ${window.location.origin}/q`;
    const shareData: ShareData = {
      title: '7 Frogs Coffee Quiz',
      text,
      url: `${window.location.origin}/q?r=${quizResultType}`,
    };
    if (navigator.share) {
      navigator.share(shareData).catch(() => {
        navigator.clipboard?.writeText(text);
      });
    } else {
      navigator.clipboard?.writeText(text);
    }
  };

  if (authLoading || (user && resultLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="animate-pulse">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!quizResultType) {
    return (
      <div className="min-h-screen bg-background p-4 flex flex-col items-center justify-center">
        <div className="max-w-md w-full text-center space-y-6">
          <p className="text-4xl">🐸</p>
          <h1 className="text-2xl font-black uppercase tracking-tight">
            Discover Your Coffee Frog
          </h1>
          <p className="text-muted-foreground">
            Take the 7 Frogs quiz to find out your café personality — and who matches you best.
          </p>
          <Button
            className="w-full h-12"
            onClick={() => navigate('/q')}
          >
            Take the quiz
          </Button>
        </div>
      </div>
    );
  }

  return (
    <QuizResultFull resultType={quizResultType as FrogType} onShare={handleShare} />
  );
}
