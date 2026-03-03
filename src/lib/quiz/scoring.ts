import type { FrogType } from './types';
import { FROG_TYPES, SCORING_MATRIX, TIE_BREAK_PRIORITY } from './constants';

export function calculateScores(answers: Record<number, string>): Record<FrogType, number> {
  const scores: Record<FrogType, number> = {
    ESP: 0,
    LAT: 0,
    OAT: 0,
    AME: 0,
    MOC: 0,
    CLD: 0,
    DRP: 0,
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

export function resolveResultType(scores: Record<FrogType, number>, answers: Record<number, string>): FrogType {
  const maxScore = Math.max(...Object.values(scores));
  const tied = FROG_TYPES.filter((t) => scores[t] === maxScore);

  if (tied.length === 1) return tied[0];

  // Tie-break: Q4 → Q9 → Q11 → fallback priority
  const tieBreakQuestions = [4, 9, 11] as const;
  for (const q of tieBreakQuestions) {
    const qScores = tied.map((t) => {
      const ans = answers[q];
      const m = SCORING_MATRIX[q]?.[ans];
      return { type: t, points: m?.[t] ?? 0 };
    });
    const maxTie = Math.max(...qScores.map((x) => x.points));
    const stillTied = qScores.filter((x) => x.points === maxTie).map((x) => x.type);
    if (stillTied.length === 1) return stillTied[0];
    if (stillTied.length > 0) {
      // Multiple still tied, use fallback order
      for (const p of TIE_BREAK_PRIORITY) {
        if (stillTied.includes(p)) return p;
      }
    }
  }

  // Fallback
  for (const p of TIE_BREAK_PRIORITY) {
    if (tied.includes(p)) return p;
  }
  return tied[0];
}
