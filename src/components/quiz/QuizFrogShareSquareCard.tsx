import { forwardRef } from 'react';
import { FROG_AVATAR_PATH, FROG_DESCRIPTIONS } from '@/lib/quiz/constants';
import { narrativeTextBlockForShare } from '@/lib/quiz/narrativePreview';
import { QUIZ_SHARE_SQUARE_PX } from '@/lib/quiz/share';
import type { FrogType } from '@/lib/quiz/types';

const BG = '#f38132';

type QuizFrogShareSquareCardProps = {
  resultType: FrogType;
};

/**
 * Square share image: matches in-quiz look (orange shell, frog, name, first 3 lines of narrative).
 */
export const QuizFrogShareSquareCard = forwardRef<HTMLDivElement, QuizFrogShareSquareCardProps>(
  function QuizFrogShareSquareCard({ resultType }, ref) {
    const desc = FROG_DESCRIPTIONS[resultType];
    const bodyText = narrativeTextBlockForShare(resultType);

    return (
      <div
        ref={ref}
        className="flex flex-col items-center justify-start text-white"
        style={{
          width: QUIZ_SHARE_SQUARE_PX,
          height: QUIZ_SHARE_SQUARE_PX,
          boxSizing: 'border-box',
          padding: 64,
          backgroundColor: BG,
          fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <p
          className="text-center font-black uppercase tracking-tight text-white"
          style={{ fontSize: 44, lineHeight: 1.15, margin: 0 }}
        >
          Your Coffee Frog
        </p>
        <img
          src={FROG_AVATAR_PATH[resultType]}
          alt=""
          width={320}
          height={320}
          style={{ marginTop: 40, width: 320, height: 320, objectFit: 'contain' }}
        />
        <p
          className="text-center font-bold text-white"
          style={{ fontSize: 52, lineHeight: 1.2, marginTop: 28, marginBottom: 0 }}
        >
          {desc.name}
        </p>
        <div
          className="w-full rounded-[32px] bg-white/15 px-10 py-8"
          style={{ marginTop: 36, maxWidth: 920 }}
        >
          <p
            className="text-center font-medium text-white/95"
            style={{
              fontSize: 30,
              lineHeight: 1.35,
              margin: 0,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical' as const,
              overflow: 'hidden',
              wordBreak: 'break-word' as const,
            }}
          >
            {bodyText}
          </p>
        </div>
      </div>
    );
  },
);
