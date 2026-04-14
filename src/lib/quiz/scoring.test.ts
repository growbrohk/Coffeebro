import { describe, it, expect } from 'vitest';
import { calculateScores, frogScorePercentages, resolveResultType } from './scoring';
import { FROG_TYPES } from './constants';
import type { FrogType } from './types';

function zeroScores(): Record<FrogType, number> {
  return Object.fromEntries(FROG_TYPES.map((t) => [t, 0])) as Record<FrogType, number>;
}

describe('calculateScores', () => {
  it('all A answers yields DIR as highest (balanced matrix)', () => {
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
    expect(winners).toEqual(['DIR']);
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

  it('all D answers yields LAT and DIR tied for highest', () => {
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
    expect(winners).toEqual(['LAT', 'DIR']);
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
    const result = resolveResultType(scores, answers, 'any-session');
    expect(result).toBe('LAT');
  });

  it('uses Q4 tie-break when two frogs tied', () => {
    const scores = { ...zeroScores(), ESP: 5, HDR: 5 };
    const answers: Record<number, string> = { 4: 'A', 5: 'B', 7: 'B' };
    const result = resolveResultType(scores, answers, 'any-session');
    expect(result).toBe('ESP');
  });

  it('uses Q5 tie-break when Q4 does not resolve', () => {
    const scores = { ...zeroScores(), CLD: 8, HDR: 8 };
    const answers: Record<number, string> = { 4: 'B', 5: 'A', 7: 'B' };
    const result = resolveResultType(scores, answers, 'any-session');
    expect(result).toBe('CLD');
  });

  it('uses Q7 tie-break when Q4 and Q5 do not resolve', () => {
    const scores = { ...zeroScores(), ESP: 5, HDR: 5 };
    const answers: Record<number, string> = { 4: 'B', 5: 'B', 7: 'A' };
    const result = resolveResultType(scores, answers, 'any-session');
    expect(result).toBe('HDR');
  });

  it('uses stable session_token tie-break when Q4/Q5/Q7 do not resolve', () => {
    const scores = { ...zeroScores(), ESP: 5, HDR: 5 };
    const answers: Record<number, string> = { 4: 'B', 5: 'B', 7: 'B' };
    const result1 = resolveResultType(scores, answers, 'session-aaa');
    const result2 = resolveResultType(scores, answers, 'session-aaa');
    expect(result1).toBe(result2);
    expect(['ESP', 'HDR']).toContain(result1);
  });

  it('returns deterministic result for same session_token', () => {
    const scores = { ...zeroScores(), ESP: 5, HDR: 5 };
    const answers: Record<number, string> = { 4: 'B', 5: 'B', 7: 'B' };
    const results = Array.from({ length: 10 }, () =>
      resolveResultType(scores, answers, 'stable-token-123')
    );
    expect(results.every((r) => r === results[0])).toBe(true);
  });

  it('falls back to first tied when session_token is null', () => {
    const scores = { ...zeroScores(), ESP: 5, HDR: 5 };
    const answers: Record<number, string> = { 4: 'B', 5: 'B', 7: 'B' };
    const result = resolveResultType(scores, answers, null);
    expect(['ESP', 'HDR']).toContain(result);
  });
});
