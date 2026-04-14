import { forwardRef } from 'react';
import {
  FROG_AVATAR_PATH,
  FROG_DESCRIPTIONS,
  FROG_NAMES,
  FROG_PROFILE_CARD,
  FROG_SHARE_CARD_THEME,
  QUIZ_SHARE_CARD_HEIGHT,
  QUIZ_SHARE_CARD_WIDTH,
} from '@/lib/quiz/constants';
import type { FrogType } from '@/lib/quiz/types';

type QuizFrogShareCardProps = {
  resultType: FrogType;
};

/**
 * Fixed-size card for PNG export (off-screen). Theme matches frog type.
 */
export const QuizFrogShareCard = forwardRef<HTMLDivElement, QuizFrogShareCardProps>(
  function QuizFrogShareCard({ resultType }, ref) {
    const desc = FROG_DESCRIPTIONS[resultType];
    const theme = FROG_SHARE_CARD_THEME[resultType];
    const bestMatchName = FROG_NAMES[desc.bestMatch];
    const wildcardName = FROG_NAMES[desc.wildcard];
    const oneLiner = FROG_PROFILE_CARD[resultType].oneLiner;

    return (
      <div
        ref={ref}
        className="box-border flex flex-col items-center overflow-hidden px-6 pb-8 pt-10 text-center text-white"
        style={{
          width: QUIZ_SHARE_CARD_WIDTH,
          height: QUIZ_SHARE_CARD_HEIGHT,
          background: theme.background,
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        }}
      >
        <p className="mb-3 text-[11px] font-black uppercase tracking-[0.2em] text-white/90">
          Your Coffee Frog
        </p>
        <img
          src={FROG_AVATAR_PATH[resultType]}
          alt=""
          width={200}
          height={200}
          className="h-[200px] w-[200px] object-contain"
        />
        <p className="mt-3 text-[26px] font-bold leading-tight">{desc.name}</p>
        <p className="mt-4 line-clamp-4 max-w-full text-[13px] font-medium leading-snug text-white/95">
          {oneLiner}
        </p>
        <div className="mt-auto w-full space-y-1.5 border-t border-white/25 pt-4 text-left text-[13px] text-white/95">
          <p>
            <span className="font-semibold">Best Match:</span> {bestMatchName}
          </p>
          <p>
            <span className="font-semibold">Wildcard:</span> {wildcardName}
          </p>
        </div>
        <p className="mt-5 text-[11px] font-semibold uppercase tracking-wide text-white/75">CoffeeBro</p>
      </div>
    );
  },
);
