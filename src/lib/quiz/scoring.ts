import type { FrogType } from './types';
import { FROG_TYPES, FROG_SCORE_SOFTMAX_TEMPERATURE, SCORING_MATRIX } from './constants';

/**
 * Softmax over raw frog totals → percentages 0–100 (sum ≈ 100).
 * Uses FROG_SCORE_SOFTMAX_TEMPERATURE; all-zero scores → uniform 100/7 each.
 */
export function frogScorePercentages(scores: Record<FrogType, number>): Record<FrogType, number> {
  const T = FROG_SCORE_SOFTMAX_TEMPERATURE;
  const raw = FROG_TYPES.map((t) => scores[t]);
  const sum = raw.reduce((a, b) => a + b, 0);
  if (sum === 0) {
    const u = 100 / FROG_TYPES.length;
    return Object.fromEntries(FROG_TYPES.map((t) => [t, u])) as Record<FrogType, number>;
  }
  const exps = raw.map((s) => Math.exp(s / T));
  const expSum = exps.reduce((a, b) => a + b, 0);
  const pct = FROG_TYPES.map((_, i) => (exps[i]! / expSum) * 100);
  const out = Object.fromEntries(FROG_TYPES.map((t, i) => [t, pct[i]!])) as Record<FrogType, number>;
  const total = pct.reduce((a, b) => a + b, 0);
  const drift = 100 - total;
  if (Math.abs(drift) > 1e-9) {
    out[FROG_TYPES[FROG_TYPES.length - 1]!] += drift;
  }
  return out;
}

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

  // Tie-break: Q4 → Q5 → Q7 (taste difference, discover café, why love coffee)
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
