import { FROG_DESCRIPTIONS } from '@/lib/quiz/constants';
import type { FrogType } from '@/lib/quiz/types';

/** Collapse whitespace for a single block of narrative text in the share card. */
export function narrativeTextBlockForShare(resultType: FrogType): string {
  const raw = FROG_DESCRIPTIONS[resultType].narrative;
  return raw.replace(/\s+/g, ' ').trim();
}
