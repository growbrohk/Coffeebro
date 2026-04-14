import type { FrogType } from './types';
import {
  FROG_TYPES,
  FROG_SCORE_SOFTMAX_TEMPERATURE,
  SCORING_MATRIX,
  TIE_BREAK_FROG_PRIORITY,
} from './constants';

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

function primaryHitsForFrog(answers: Record<number, string>, frog: FrogType): number {
  let n = 0;
  for (let q = 1; q <= 7; q++) {
    const pts = SCORING_MATRIX[q]?.[answers[q]!]?.[frog];
    if (pts === 2) n++;
  }
  return n;
}

function q7PointsForFrog(answers: Record<number, string>, frog: FrogType): number {
  return SCORING_MATRIX[7]?.[answers[7]!]?.[frog] ?? 0;
}

/**
 * Winner: highest total score.
 * Tie-break: more primary (+2) hits → higher Q7 points for tied frogs → TIE_BREAK_FROG_PRIORITY.
 */
export function resolveResultType(scores: Record<FrogType, number>, answers: Record<number, string>): FrogType {
  const maxScore = Math.max(...Object.values(scores));
  let tied = FROG_TYPES.filter((t) => scores[t] === maxScore);
  if (tied.length === 1) return tied[0]!;

  const maxPrimary = Math.max(...tied.map((t) => primaryHitsForFrog(answers, t)));
  tied = tied.filter((t) => primaryHitsForFrog(answers, t) === maxPrimary);
  if (tied.length === 1) return tied[0]!;

  const maxQ7 = Math.max(...tied.map((t) => q7PointsForFrog(answers, t)));
  tied = tied.filter((t) => q7PointsForFrog(answers, t) === maxQ7);
  if (tied.length === 1) return tied[0]!;

  for (const t of TIE_BREAK_FROG_PRIORITY) {
    if (tied.includes(t)) return t;
  }
  return tied[0]!;
}
