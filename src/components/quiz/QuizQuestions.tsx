import { ArrowRight } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { QuizCoffeeBean, QuizCupCta } from '@/components/quiz/QuizVisualElements';
import { cn } from '@/lib/utils';
import type { QuizQuestion } from '@/lib/quiz/types';

interface QuizQuestionsProps {
  question: QuizQuestion;
  totalQuestions: number;
  currentIndex: number;
  value: string | null;
  onValueChange: (value: string) => void;
  onNext: () => void;
  canProceed: boolean;
}

export function QuizQuestions({
  question,
  totalQuestions,
  currentIndex,
  value,
  onValueChange,
  onNext,
  canProceed,
}: QuizQuestionsProps) {
  const isLast = currentIndex >= totalQuestions - 1;

  return (
    <div className="quiz-flow flex min-h-dvh flex-col px-8 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
        <div className="mb-8 flex gap-1.5" role="progressbar" aria-valuenow={currentIndex + 1} aria-valuemin={1} aria-valuemax={totalQuestions}>
          {Array.from({ length: totalQuestions }, (_, i) => (
            <div
              key={i}
              className={cn(
                'h-1 flex-1 rounded-full transition-colors',
                i === currentIndex ? 'bg-[var(--quiz-segment-active)]' : 'bg-[var(--quiz-fg)]',
              )}
            />
          ))}
        </div>

        <h2
          id="quiz-question-heading"
          className="mb-3 text-left text-xl font-bold leading-snug text-[var(--quiz-fg)] sm:text-2xl"
        >
          {question.text}
        </h2>
        <p
          id="quiz-question-hint"
          className="mb-5 text-left text-sm font-medium text-[var(--quiz-fg)]/85"
        >
          Choose one answer
        </p>

        <RadioGroup
          value={value ?? ''}
          onValueChange={onValueChange}
          aria-labelledby="quiz-question-heading"
          aria-describedby="quiz-question-hint"
          className="flex flex-col gap-3"
        >
          {question.options.map((opt) => {
            const id = `q${question.id}-${opt.value}`;
            const selected = value === opt.value;
            return (
              <div
                key={opt.value}
                className={cn(
                  'rounded-xl border border-white/30 border-l-4 border-l-transparent bg-white/5 pl-1 transition-all active:scale-[0.99]',
                  selected &&
                    'border-white/80 bg-white/15 ring-2 ring-white/40 border-l-[var(--quiz-fg)]',
                )}
              >
                <Label
                  htmlFor={id}
                  className="flex min-h-[3rem] cursor-pointer items-center gap-3 px-3 py-2.5 pr-2"
                >
                  <QuizCoffeeBean className="shrink-0 self-start mt-0.5" />
                  <span className="flex-1 text-left text-base font-normal leading-snug text-[var(--quiz-fg)]">
                    {opt.label}
                  </span>
                  <RadioGroupItem
                    value={opt.value}
                    id={id}
                    className={cn(
                      'mt-0.5 h-5 w-5 shrink-0 self-center border-2 border-white/70 text-[var(--quiz-fg)]',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
                      'focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--quiz-bg)]',
                    )}
                  />
                </Label>
              </div>
            );
          })}
        </RadioGroup>

        <div className="mt-auto flex justify-end pt-10">
          {isLast ? (
            <QuizCupCta
              onClick={onNext}
              disabled={!canProceed}
              aria-label="See my result"
            >
              my result
            </QuizCupCta>
          ) : (
            <button
              type="button"
              onClick={onNext}
              disabled={!canProceed}
              aria-label="Next question"
              className={cn(
                'touch-manipulation p-2 text-[var(--quiz-fg)] transition-opacity',
                'outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--quiz-bg)] rounded-md',
                !canProceed && 'pointer-events-none opacity-35',
              )}
            >
              <ArrowRight className="size-12" strokeWidth={1.15} aria-hidden />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
