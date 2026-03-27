import { Hand } from 'lucide-react';
import { QuizCupCta } from '@/components/quiz/QuizVisualElements';

interface QuizLandingProps {
  onStart: () => void;
  isLoading?: boolean;
}

export function QuizLanding({ onStart, isLoading }: QuizLandingProps) {
  return (
    <div className="quiz-flow flex min-h-dvh flex-col px-8 pb-12 pt-[max(2.5rem,env(safe-area-inset-top))]">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-start pt-[min(18vh,8rem)] text-center">
        <div className="mb-3 flex items-center justify-center gap-2">
          <span className="text-3xl font-bold lowercase tracking-tight text-[var(--quiz-fg)] md:text-4xl">
            coffeebro
          </span>
          <Hand
            className="size-8 shrink-0 text-[var(--quiz-fg)]"
            strokeWidth={1.75}
            aria-hidden
          />
        </div>
        <p className="mb-4 text-lg font-medium text-[var(--quiz-fg)]/95">
          Your coffee type is your cafe instinct.
        </p>
        <p className="mb-12 max-w-[22rem] text-base leading-relaxed text-[var(--quiz-fg)]/90">
          Answer 7 quick questions to discover your coffee frog - and see who matches you best!
        </p>
        <QuizCupCta
          onClick={onStart}
          disabled={isLoading}
          aria-label={isLoading ? 'Starting quiz' : 'Start quiz'}
        >
          {isLoading ? 'Starting…' : 'Start quiz'}
        </QuizCupCta>
      </div>
    </div>
  );
}
