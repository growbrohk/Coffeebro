import { describe, it, expect } from 'vitest';
import { calculateScores, frogScorePercentages, resolveResultType } from './scoring';
import { FROG_TYPES } from './constants';
import type { FrogType } from './types';

function zeroScores(): Record<FrogType, number> {
  return Object.fromEntries(FROG_TYPES.map((t) => [t, 0])) as Record<FrogType, number>;
}

describe('calculateScores', () => {
  it('all A answers yields ESP as highest', () => {
    const answers: Record<number, string> = {
      1: 'A',
      2: 'A',
      3: 'A',
      4: 'A',
      5: 'A',
      6: 'A',
      7: 'A',
    };
    const scores = calculateScores(answers);
    const maxScore = Math.max(...Object.values(scores));
    const winners = FROG_TYPES.filter((t) => scores[t] === maxScore);
    expect(winners).toEqual(['ESP']);
  });

  it('all B answers yields LAT as highest', () => {
    const answers: Record<number, string> = {
      1: 'B',
      2: 'B',
      3: 'B',
      4: 'B',
      5: 'B',
      6: 'B',
      7: 'B',
    };
    const scores = calculateScores(answers);
    const maxScore = Math.max(...Object.values(scores));
    const winners = FROG_TYPES.filter((t) => scores[t] === maxScore);
    expect(winners).toEqual(['LAT']);
  });

  it('all C answers yields MAT as highest', () => {
    const answers: Record<number, string> = {
      1: 'C',
      2: 'C',
      3: 'C',
      4: 'C',
      5: 'C',
      6: 'C',
      7: 'C',
    };
    const scores = calculateScores(answers);
    const maxScore = Math.max(...Object.values(scores));
    const winners = FROG_TYPES.filter((t) => scores[t] === maxScore);
    expect(winners).toEqual(['MAT']);
  });

  it('all D answers yields DIR as highest', () => {
    const answers: Record<number, string> = {
      1: 'D',
      2: 'D',
      3: 'D',
      4: 'D',
      5: 'D',
      6: 'D',
      7: 'D',
    };
    const scores = calculateScores(answers);
    const maxScore = Math.max(...Object.values(scores));
    const winners = FROG_TYPES.filter((t) => scores[t] === maxScore);
    expect(winners).toEqual(['DIR']);
  });
});

describe('frogScorePercentages', () => {
  it('sums to 100 for a full quiz path', () => {
    const answers: Record<number, string> = {
      1: 'A',
      2: 'B',
      3: 'C',
      4: 'D',
      5: 'A',
      6: 'B',
      7: 'C',
    };
    const scores = calculateScores(answers);
    const p = frogScorePercentages(scores);
    const sum = FROG_TYPES.reduce((acc, t) => acc + p[t], 0);
    expect(sum).toBeCloseTo(100, 5);
  });

  it('is uniform when all raw scores are zero', () => {
    const p = frogScorePercentages(zeroScores());
    const u = 100 / FROG_TYPES.length;
    FROG_TYPES.forEach((t) => {
      expect(p[t]).toBeCloseTo(u, 5);
    });
  });

  it('is uniform when all raw scores are equal', () => {
    const s = Object.fromEntries(FROG_TYPES.map((t) => [t, 12])) as Record<FrogType, number>;
    const p = frogScorePercentages(s);
    const u = 100 / FROG_TYPES.length;
    FROG_TYPES.forEach((t) => {
      expect(p[t]).toBeCloseTo(u, 5);
    });
  });
});

describe('resolveResultType', () => {
  it('returns clear winner when no tie', () => {
    const answers: Record<number, string> = {
      1: 'B',
      2: 'B',
      3: 'B',
      4: 'B',
      5: 'B',
      6: 'B',
      7: 'B',
    };
    const scores = calculateScores(answers);
    const result = resolveResultType(scores, answers);
    expect(result).toBe('LAT');
  });

  it('breaks ties by primary hits (+2 count) when totals are tied', () => {
    const answers: Record<number, string> = {
      1: 'A',
      2: 'A',
      3: 'A',
      4: 'A',
      5: 'A',
      6: 'A',
      7: 'A',
    };
    const scores = { ...zeroScores(), ESP: 13, HDR: 13 };
    const result = resolveResultType(scores, answers);
    expect(result).toBe('ESP');
  });

  it('breaks ties by Q7 points when totals and primary hits match', () => {
    const answers: Record<number, string> = {
      1: 'A',
      2: 'C',
      3: 'D',
      4: 'D',
      5: 'B',
      6: 'B',
      7: 'A',
    };
    const scores = calculateScores(answers);
    expect(FROG_TYPES.filter((t) => scores[t] === Math.max(...Object.values(scores))).sort()).toEqual(
      ['ESP', 'LAT', 'MAT'].sort()
    );
    const result = resolveResultType(scores, answers);
    expect(result).toBe('ESP');
  });

  it('breaks ties by fixed frog priority when totals, primaries, and Q7 points match', () => {
    const answers: Record<number, string> = {
      1: 'B',
      2: 'A',
      3: 'C',
      4: 'A',
      5: 'C',
      6: 'A',
      7: 'D',
    };
    const scores = calculateScores(answers);
    const max = Math.max(...Object.values(scores));
    const tied = FROG_TYPES.filter((t) => scores[t] === max).sort();
    expect(tied).toEqual(['ESP', 'HDR']);
    const result = resolveResultType(scores, answers);
    expect(result).toBe('ESP');
  });
});
