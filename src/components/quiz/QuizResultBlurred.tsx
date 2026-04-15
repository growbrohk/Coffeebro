import { Button } from '@/components/ui/button';
import { QuizFrogAvatar } from '@/components/quiz/QuizFrogAvatar';
import { FROG_NAMES } from '@/lib/quiz/constants';
import type { FrogType } from '@/lib/quiz/types';

interface QuizResultBlurredProps {
  resultType: FrogType;
  onSignUp: () => void;
}

export function QuizResultBlurred({ resultType, onSignUp }: QuizResultBlurredProps) {
  const name = FROG_NAMES[resultType];

  return (
    <div className="quiz-flow flex min-h-dvh flex-col px-6 pt-[max(2rem,env(safe-area-inset-top))]">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center space-y-8">
        <div className="text-center">
          <h1 className="font-heading mb-2 text-2xl font-bold tracking-normal text-[var(--quiz-fg)]">
            Your Coffee Frog
          </h1>
          <p className="text-[var(--quiz-fg)]/85">Sign up to unlock your full result</p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-white/25 bg-white/10">
          <div className="absolute inset-0 z-10 flex items-center justify-center backdrop-blur-md bg-[var(--quiz-bg)]/70 px-4">
            <Button
              size="lg"
              onClick={onSignUp}
              className="z-20 border-0 bg-[var(--quiz-fg)] font-semibold text-[var(--quiz-bg)] hover:bg-white/90"
            >
              Sign up to unlock
            </Button>
          </div>
          <div className="p-6 pt-8">
            <QuizFrogAvatar resultType={resultType} />
            <p className="mt-2 text-center text-xl font-bold text-[var(--quiz-fg)] blur-sm select-none">
              {name}
            </p>
            <p className="mt-4 text-center text-sm text-[var(--quiz-fg)]/90 blur-md select-none line-clamp-3">
              Your narrative and best match are hidden. Sign up to reveal your full Coffee Frog identity.
            </p>
          </div>
        </div>

        <p className="text-center text-sm text-[var(--quiz-fg)]/80">
          Your coffee type is your cafe instinct.
          <br />
          Your real coffee pattern might tell a deeper story.
        </p>
      </div>
    </div>
  );
}
