import { describe, it, expect } from 'vitest';
import { calculateScores, resolveResultType } from './scoring';
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
    const winner = (Object.entries(scores) as [FrogType, number][]).find(
      ([, v]) => v === maxScore
    )?.[0];
    expect(winner).toBe('ESP');
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
    const winner = (Object.entries(scores) as [FrogType, number][]).find(
      ([, v]) => v === maxScore
    )?.[0];
    expect(winner).toBe('LAT');
  });

  it('all C answers yields MOC as highest', () => {
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
    const winner = (Object.entries(scores) as [FrogType, number][]).find(
      ([, v]) => v === maxScore
    )?.[0];
    expect(winner).toBe('MOC');
  });

  it('all D answers yields MAT as highest', () => {
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
    const winner = (Object.entries(scores) as [FrogType, number][]).find(
      ([, v]) => v === maxScore
    )?.[0];
    expect(winner).toBe('MAT');
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
    const scores = { ...zeroScores(), ESP: 5, HDR: 5 };
    const answers: Record<number, string> = { 4: 'B', 5: 'D', 7: 'B' };
    const result = resolveResultType(scores, answers, 'any-session');
    expect(result).toBe('ESP');
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
