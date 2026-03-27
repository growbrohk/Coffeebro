import { Button } from '@/components/ui/button';
import { QuizFrogAvatar } from '@/components/quiz/QuizFrogAvatar';
import { FROG_NAMES, FROG_DESCRIPTIONS } from '@/lib/quiz/constants';
import type { FrogType } from '@/lib/quiz/types';
import { useNavigate } from 'react-router-dom';

interface QuizResultFullProps {
  resultType: FrogType;
  onShare?: () => void;
}

export function QuizResultFull({ resultType, onShare }: QuizResultFullProps) {
  const navigate = useNavigate();
  const desc = FROG_DESCRIPTIONS[resultType];
  const bestMatchName = FROG_NAMES[desc.bestMatch];
  const wildcardName = FROG_NAMES[desc.wildcard];

  return (
    <div className="quiz-flow min-h-dvh px-6 pt-[max(2rem,env(safe-area-inset-top))]">
      <div className="mx-auto max-w-md space-y-6">
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-black uppercase tracking-tight text-[var(--quiz-fg)]">
            Your Coffee Frog
          </h1>
          <QuizFrogAvatar resultType={resultType} />
          <p className="mt-2 text-xl font-bold text-[var(--quiz-fg)]">{desc.name}</p>
        </div>

        <div className="rounded-2xl border border-white/25 bg-white/10 p-5">
          <p className="text-sm font-medium leading-relaxed text-[var(--quiz-fg)]/95">{desc.narrative}</p>
          <div className="mt-4 space-y-2 border-t border-white/20 pt-4 text-sm text-[var(--quiz-fg)]">
            <p>
              <span className="font-semibold">Best Match:</span> {bestMatchName}
            </p>
            <p>
              <span className="font-semibold">Wildcard:</span> {wildcardName}
            </p>
          </div>
        </div>

        <p className="text-center text-sm text-[var(--quiz-fg)]/85">
          This is your cafe instinct.
          <br />
          Your real coffee pattern might tell a deeper story.
        </p>

        <div className="space-y-3">
          <p className="text-center text-sm font-medium text-[var(--quiz-fg)]">
            Start logging your coffee and let us map your actual behavior.
          </p>
          <Button
            className="h-12 w-full border-0 bg-[var(--quiz-fg)] font-semibold text-[var(--quiz-bg)] hover:bg-white/90"
            onClick={() => navigate('/')}
          >
            Start Logging My Coffee
          </Button>

          {onShare && (
            <Button
              variant="outline"
              className="w-full border-white/80 bg-transparent text-[var(--quiz-fg)] hover:bg-white/10 hover:text-[var(--quiz-fg)]"
              onClick={onShare}
            >
              Share My Coffee Frog
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
