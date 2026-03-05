import type { FrogType, QuizQuestion, FrogDescription } from './types';

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
    text: "You step into a café that's busier than expected. You instinctively…",
    options: [
      { value: 'A', label: 'Find the fastest seat and settle quickly.' },
      { value: 'B', label: 'Look for a table where conversation could happen.' },
      { value: 'C', label: 'Scan the room for the best atmosphere.' },
      { value: 'D', label: 'Search for the quietest corner.' },
    ],
  },
  {
    id: 2,
    text: 'The moment you walk in, you notice…',
    options: [
      { value: 'A', label: 'The smell of coffee.' },
      { value: 'B', label: 'The energy of the room.' },
      { value: 'C', label: 'The interior design and details.' },
      { value: 'D', label: 'Where the calm spots are.' },
    ],
  },
  {
    id: 3,
    text: "The barista recommends today's special drink. You…",
    options: [
      { value: 'A', label: 'Stay with your usual order.' },
      { value: 'B', label: 'Ask what makes it interesting.' },
      { value: 'C', label: 'Try it immediately.' },
      { value: 'D', label: 'Consider it, but might stick with your mood.' },
    ],
  },
  {
    id: 4,
    text: 'Your drink tastes slightly different than expected. You…',
    options: [
      { value: 'A', label: 'Accept it and keep drinking.' },
      { value: 'B', label: 'Laugh it off.' },
      { value: 'C', label: 'Try to figure out what changed.' },
      { value: 'D', label: 'Feel slightly thrown off.' },
    ],
  },
  {
    id: 5,
    text: 'You discover a new café because…',
    options: [
      { value: 'A', label: "It's along your normal route." },
      { value: 'B', label: 'A friend brought you there.' },
      { value: 'C', label: 'You saw it online and saved it.' },
      { value: 'D', label: 'You actively searched for somewhere new.' },
    ],
  },
  {
    id: 6,
    text: 'An hour alone in a café usually looks like…',
    options: [
      { value: 'A', label: 'Deep focus or work.' },
      { value: 'B', label: 'Messaging people or light tasks.' },
      { value: 'C', label: 'Watching the room and observing people.' },
      { value: 'D', label: 'Sitting quietly with your thoughts.' },
    ],
  },
  {
    id: 7,
    text: 'You return to the same café mainly because…',
    options: [
      { value: 'A', label: "It's reliable and consistent." },
      { value: 'B', label: 'You associate it with people.' },
      { value: 'C', label: 'It feels inspiring or interesting.' },
      { value: 'D', label: 'It gives you a grounding feeling.' },
    ],
  },
];

export const FROG_DESCRIPTIONS: Record<FrogType, FrogDescription> = {
  ESP: {
    name: 'Espresso Frog',
    narrative:
      "You move fast. You decide quickly. Coffee is a switch that puts you into clarity-mode. You prefer direct flavors and direct outcomes. When you slow down, you may be surprised how much you enjoy calmer cups.",
    bestMatch: 'LAT',
    wildcard: 'MOC',
  },
  LAT: {
    name: 'Latte Frog',
    narrative:
      "For you, coffee is connection. Atmosphere and people matter. You're the type who makes a place feel warmer just by being there. Your drink choice often shifts depending on who you're with.",
    bestMatch: 'ESP',
    wildcard: 'DIR',
  },
  AME: {
    name: 'Americano Frog',
    narrative:
      "Clean. Consistent. Intentional. You like coffee that works — simple, reliable, and clear. You don't chase noise. When you do try something new, it's usually because it fits into your structure.",
    bestMatch: 'MAT',
    wildcard: 'CLD',
  },
  MOC: {
    name: 'Mocha Frog',
    narrative:
      "Coffee mirrors your mood. You're comfort-led and sensitive to tiny shifts in vibe. You don't just drink coffee — you use it to ground yourself. When things feel off, you feel it fast.",
    bestMatch: 'CLD',
    wildcard: 'ESP',
  },
  CLD: {
    name: 'Cold Brew Frog',
    narrative:
      "You move differently. Your rhythm isn't traditional, and that's your edge. You're bold in your choices and okay with a little chaos. You like drinks that feel fresh, modern, and slightly unexpected.",
    bestMatch: 'MOC',
    wildcard: 'AME',
  },
  MAT: {
    name: 'Matcha Frog',
    narrative:
      "You're calm but not passive. You notice details, lighting, and the feeling of a space. Coffee (or matcha) is ritual for you — something you return to when you want clarity, beauty, and reset energy.",
    bestMatch: 'AME',
    wildcard: 'DIR',
  },
  DIR: {
    name: 'Dirty Frog',
    narrative:
      "You're driven by curiosity and contrast. You like unusual combinations, limited specials, and 'why not?' decisions. Your taste evolves, and you're usually the first in your circle to discover something new.",
    bestMatch: 'MAT',
    wildcard: 'AME',
  },
};
