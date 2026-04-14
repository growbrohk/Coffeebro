import { QuizCoffeebroLogo, QuizCupCta } from '@/components/quiz/QuizVisualElements';

interface QuizLandingProps {
  onStart: () => void;
  isLoading?: boolean;
}

export function QuizLanding({ onStart, isLoading }: QuizLandingProps) {
  return (
    <div className="quiz-flow flex min-h-dvh flex-col px-8 pt-[max(2.5rem,env(safe-area-inset-top))]">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-start pt-[min(18vh,8rem)] text-center">
        <div className="mb-12 flex justify-center md:mb-14">
          <QuizCoffeebroLogo />
        </div>
        <p className="mb-10 text-lg font-medium text-[var(--quiz-fg)]/95 md:mb-12">
          Your coffee type is your cafe instinct.
        </p>
        <p className="mb-14 max-w-[22rem] text-base leading-relaxed text-[var(--quiz-fg)]/90 md:mb-16">
          Answer 6 quick questions to discover your coffee frog — and see who matches you best!
        </p>
        <QuizCupCta
          variant="startGraphic"
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
