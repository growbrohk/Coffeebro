import type { FrogType, QuizQuestion, FrogDescription, FrogProfileCard } from './types';

export const FROG_TYPES: FrogType[] = ['ESP', 'LAT', 'AME', 'MOC', 'CLD', 'MAT', 'DIR'];

export const FROG_NAMES: Record<FrogType, string> = {
  ESP: 'Espresso Frog',
  LAT: 'Latte Frog',
  AME: 'Americano Frog',
  MOC: 'Mocha Frog',
  CLD: 'Cold Brew Frog',
  MAT: 'Matcha Frog',
  DIR: 'Dirty Frog',
};

// Legacy mapping for old DB rows (OAT, DRP from previous 11-question quiz).
// Apply when reading result_type from DB for display.
export const LEGACY_FROG_MAP: Record<string, FrogType> = {
  OAT: 'MAT',
  DRP: 'DIR',
};

/** Profile card: short archetype line + illustrative population % (not live analytics). */
export const FROG_PROFILE_CARD: Record<FrogType, FrogProfileCard> = {
  ESP: { archetype: 'idealistic thinker', populationPercent: 15 },
  LAT: { archetype: 'social connector', populationPercent: 14 },
  AME: { archetype: 'steady planner', populationPercent: 14 },
  MOC: { archetype: 'feeling-led romantic', populationPercent: 14 },
  CLD: { archetype: 'independent trailblazer', populationPercent: 14 },
  MAT: { archetype: 'mindful observer', populationPercent: 14 },
  DIR: { archetype: 'curious experimenter', populationPercent: 15 },
};

// Q1–Q7, answer A/B/C/D → { FrogType: points }
export const SCORING_MATRIX: Record<number, Record<string, Partial<Record<FrogType, number>>>> = {
  1: { A: { ESP: 2, AME: 1 }, B: { LAT: 2, MOC: 1 }, C: { MAT: 2, DIR: 1 }, D: { AME: 2, MAT: 1 } },
  2: { A: { ESP: 2, DIR: 1 }, B: { CLD: 2, LAT: 1 }, C: { DIR: 2, MAT: 1 }, D: { MOC: 2, AME: 1 } },
  3: { A: { AME: 2, ESP: 1 }, B: { DIR: 2, MAT: 1 }, C: { CLD: 2, ESP: 1 }, D: { MOC: 2, LAT: 1 } },
  4: { A: { ESP: 2, AME: 1 }, B: { CLD: 2, LAT: 1 }, C: { DIR: 2, MAT: 1 }, D: { MOC: 2, AME: 1 } },
  5: { A: { AME: 2, ESP: 1 }, B: { LAT: 2, MOC: 1 }, C: { MAT: 2, LAT: 1 }, D: { DIR: 2, CLD: 1 } },
  6: { A: { ESP: 2, AME: 1 }, B: { LAT: 2, MAT: 1 }, C: { CLD: 2, DIR: 1 }, D: { MAT: 2, MOC: 1 } },
  7: { A: { AME: 2, ESP: 1 }, B: { LAT: 2, MOC: 1 }, C: { MAT: 2, DIR: 1 }, D: { MOC: 2, AME: 1 } },
};

export const QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    text: "You step into a café that's busier than expected. First thing you do…",
    options: [
      { value: 'A', label: 'Grab the closest seat and settle.' },
      { value: 'B', label: 'Look for a table where conversation could happen.' },
      { value: 'C', label: 'Search a table beside the best crowd.' },
      { value: 'D', label: "Find your ‘Do not Disturb Me’ corner." },
    ],
  },
  {
    id: 2,
    text: 'The moment you walk in, you notice…',
    options: [
      { value: 'A', label: 'Coffee Scent' },
      { value: 'B', label: 'Energy of the room.' },
      { value: 'C', label: 'The interior design and details.' },
      { value: 'D', label: 'The most quiet spot.' },
    ],
  },
  {
    id: 3,
    text: "The barista recommends today's special drink. You…",
    options: [
      { value: 'A', label: 'Stick with your usual order.' },
      { value: 'B', label: 'Get curious about the ingredients.' },
      { value: 'C', label: 'Try it immediately.' },
      { value: 'D', label: '50/50, depending on your mood.' },
    ],
  },
  {
    id: 4,
    text: 'Your drink tastes slightly different than expected. You…',
    options: [
      { value: 'A', label: 'Accept it and keep drinking.' },
      { value: 'B', label: 'Laugh it off.' },
      { value: 'C', label: 'Figure out what changed.' },
      { value: 'D', label: 'Complain.' },
    ],
  },
  {
    id: 5,
    text: 'You discover a new café because…',
    options: [
      { value: 'A', label: "It's along your normal route." },
      { value: 'B', label: 'A friend brought you there.' },
      { value: 'C', label: 'You saw because someone promoted it.' },
      { value: 'D', label: 'You actively searched for somewhere new.' },
    ],
  },
  {
    id: 6,
    text: 'An hour alone in a café usually looks like…',
    options: [
      { value: 'A', label: '100% lock in.' },
      { value: 'B', label: 'Just yapping and doom scrolling.' },
      { value: 'C', label: 'People watching.' },
      { value: 'D', label: 'Getting deep with your thoughts.' },
    ],
  },
  {
    id: 7,
    text: 'You return to the same café mainly because…',
    options: [
      { value: 'A', label: 'The vibe/ambiance of the environment' },
      { value: 'B', label: 'The connection with the people.' },
      { value: 'C', label: 'Good food/drinks.' },
      { value: 'D', label: 'Convenient.' },
    ],
  },
];

export const FROG_DESCRIPTIONS: Record<FrogType, FrogDescription> = {
  ESP: {
    name: 'Espresso Frog',
    narrative:
      'Moves fast; Coffee is your destress remedy; You take your coffee very seriously so you can slow down and calm down.',
    bestMatch: 'LAT',
    wildcard: 'MOC',
  },
  LAT: {
    name: 'Latte Frog',
    narrative: 'Coffee is your connection to the environment and people.',
    bestMatch: 'ESP',
    wildcard: 'DIR',
  },
  AME: {
    name: 'Americano Frog',
    narrative: 'Clean, consistent, intentional; simple reliable coffee.',
    bestMatch: 'MAT',
    wildcard: 'CLD',
  },
  MOC: {
    name: 'Mocha Frog',
    narrative: 'Mood-led, comfort-led, attracted to good vibes.',
    bestMatch: 'CLD',
    wildcard: 'ESP',
  },
  CLD: {
    name: 'Cold Brew Frog',
    narrative:
      'Innovative and inspiring, risk taker and enjoy a fresh and modern drinks.',
    bestMatch: 'MOC',
    wildcard: 'AME',
  },
  MAT: {
    name: 'Matcha Frog',
    narrative: 'Calm, detail-aware; ritual for clarity and reset.',
    bestMatch: 'AME',
    wildcard: 'DIR',
  },
  DIR: {
    name: 'Dirty Frog',
    narrative:
      'Curiosity and enjoy a bit of abstract mixed with complexity and mystery.',
    bestMatch: 'MAT',
    wildcard: 'AME',
  },
};
