import { FROG_AVATAR_PATH, FROG_NAMES } from '@/lib/quiz/constants';
import type { FrogType } from '@/lib/quiz/types';
import { cn } from '@/lib/utils';

type QuizFrogAvatarProps = {
  resultType: FrogType;
  className?: string;
};

export function QuizFrogAvatar({ resultType, className }: QuizFrogAvatarProps) {
  return (
    <img
      src={FROG_AVATAR_PATH[resultType]}
      alt={FROG_NAMES[resultType]}
      className={cn('mx-auto h-36 w-36 object-contain', className)}
      width={144}
      height={144}
      decoding="async"
    />
  );
}
