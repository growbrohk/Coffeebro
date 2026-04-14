import type { FrogType } from './types';
import { FROG_TYPES, SCORING_MATRIX } from './constants';

export function calculateScores(answers: Record<number, string>): Record<FrogType, number> {
  const scores: Record<FrogType, number> = {
    ESP: 0,
    LAT: 0,
    MOC: 0,
    MAT: 0,
    CLD: 0,
    DIR: 0,
    HDR: 0,
  };

  for (const [qStr, answer] of Object.entries(answers)) {
    const q = parseInt(qStr, 10);
    const matrix = SCORING_MATRIX[q]?.[answer];
    if (matrix) {
      for (const [type, points] of Object.entries(matrix)) {
        scores[type as FrogType] += points;
      }
    }
  }

  return scores;
}

function hashSessionToken(sessionToken: string): number {
  return (
    sessionToken.split('').reduce((h, c) => (h << 5) - h + c.charCodeAt(0), 0) | 0
  );
}

export function resolveResultType(
  scores: Record<FrogType, number>,
  answers: Record<number, string>,
  sessionToken: string | null
): FrogType {
  const maxScore = Math.max(...Object.values(scores));
  const tied = FROG_TYPES.filter((t) => scores[t] === maxScore);

  if (tied.length === 1) return tied[0];

  // Tie-break: Q4 → Q5 → Q7 (barista special, discover café, what matters most)
  const tieBreakQuestions = [4, 5, 7] as const;
  let stillTied = [...tied];

  for (const q of tieBreakQuestions) {
    const qScores = stillTied.map((t) => {
      const ans = answers[q];
      const m = SCORING_MATRIX[q]?.[ans];
      return { type: t, points: m?.[t] ?? 0 };
    });
    const maxTie = Math.max(...qScores.map((x) => x.points));
    stillTied = qScores.filter((x) => x.points === maxTie).map((x) => x.type);
    if (stillTied.length === 1) return stillTied[0];
  }

  // Still tied: use stable tie-break based on session_token
  if (sessionToken) {
    const stableIndex =
      Math.abs(hashSessionToken(sessionToken)) % stillTied.length;
    return stillTied[stableIndex];
  }

  return stillTied[0];
}
