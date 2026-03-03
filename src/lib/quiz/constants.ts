import type { FrogType, QuizQuestion, FrogDescription } from './types';

export const FROG_TYPES: FrogType[] = ['ESP', 'LAT', 'OAT', 'AME', 'MOC', 'CLD', 'DRP'];

export const FROG_NAMES: Record<FrogType, string> = {
  ESP: 'Espresso Frog',
  LAT: 'Latte Frog',
  OAT: 'Oat Frog',
  AME: 'Americano Frog',
  MOC: 'Mocha Frog',
  CLD: 'Cold Brew Frog',
  DRP: 'Drip Explorer Frog',
};

// Q1–Q11, answer A/B/C/D → { FrogType: points }
export const SCORING_MATRIX: Record<number, Record<string, Partial<Record<FrogType, number>>>> = {
  1: { A: { ESP: 2, AME: 1 }, B: { LAT: 2 }, C: { OAT: 2, DRP: 1 }, D: { MOC: 2, CLD: 1 } },
  2: { A: { ESP: 2, AME: 1 }, B: { LAT: 1, OAT: 1 }, C: { OAT: 2, DRP: 1 }, D: { AME: 2, DRP: 1 } },
  3: { A: { DRP: 2 }, B: { LAT: 1, CLD: 2 }, C: { OAT: 2 }, D: { AME: 2, MOC: 1 } },
  4: { A: { ESP: 2, CLD: 1 }, B: { LAT: 2, AME: 1 }, C: { DRP: 2, OAT: 1 }, D: { MOC: 2, LAT: 1 } },
  5: { A: { ESP: 2, AME: 1 }, B: { LAT: 1, CLD: 1 }, C: { CLD: 2, OAT: 1 }, D: { DRP: 1, MOC: 2 } },
  6: { A: { ESP: 2 }, B: { LAT: 1, CLD: 1 }, C: { OAT: 1, CLD: 1 }, D: { AME: 2 } },
  7: { A: { AME: 2, ESP: 1 }, B: { DRP: 2 }, C: { OAT: 1, CLD: 2 }, D: { MOC: 2 } },
  8: { A: { AME: 1, ESP: 1 }, B: { LAT: 1, CLD: 1 }, C: { DRP: 2 }, D: { MOC: 2, CLD: 1 } },
  9: { A: { AME: 1, LAT: 1 }, B: { LAT: 2 }, C: { OAT: 2 }, D: { DRP: 2 } },
  10: { A: { ESP: 2, AME: 1 }, B: { LAT: 2 }, C: { OAT: 2, CLD: 1 }, D: { DRP: 1, MOC: 2 } },
  11: { A: { AME: 2, ESP: 1 }, B: { LAT: 2 }, C: { LAT: 1, OAT: 1 }, D: { CLD: 2, DRP: 1 } },
};

export const TIE_BREAK_PRIORITY: FrogType[] = ['AME', 'ESP', 'OAT', 'CLD', 'MOC', 'LAT', 'DRP'];

export const QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    text: '8:30am. You walk into your regular café. Your energy is:',
    options: [
      { value: 'A', label: 'Locked in.' },
      { value: 'B', label: 'Open and easy.' },
      { value: 'C', label: 'Curious.' },
      { value: 'D', label: 'Slow and steady.' },
    ],
  },
  {
    id: 2,
    text: 'The café is busy. You instinctively choose…',
    options: [
      { value: 'A', label: 'Counter seat — quick exit.' },
      { value: 'B', label: 'Big table — better conversation.' },
      { value: 'C', label: 'Window seat — best light.' },
      { value: 'D', label: 'Corner — minimal distraction.' },
    ],
  },
  {
    id: 3,
    text: "The moment you step inside, you notice…",
    options: [
      { value: 'A', label: 'The coffee aroma.' },
      { value: 'B', label: "The room's energy." },
      { value: 'C', label: 'The design details.' },
      { value: 'D', label: 'The quiet zones.' },
    ],
  },
  {
    id: 4,
    text: 'First sip. What matters most?',
    options: [
      { value: 'A', label: 'Intensity.' },
      { value: 'B', label: 'Balance.' },
      { value: 'C', label: 'Aroma.' },
      { value: 'D', label: 'Comfort.' },
    ],
  },
  {
    id: 5,
    text: 'It starts raining outside. You feel…',
    options: [
      { value: 'A', label: 'Productive.' },
      { value: 'B', label: 'Social.' },
      { value: 'C', label: 'Inspired.' },
      { value: 'D', label: 'Reflective.' },
    ],
  },
  {
    id: 6,
    text: 'The café gets louder. You…',
    options: [
      { value: 'A', label: 'Finish fast.' },
      { value: 'B', label: 'Lean into it.' },
      { value: 'C', label: 'Watch the scene.' },
      { value: 'D', label: 'Relocate quietly.' },
    ],
  },
  {
    id: 7,
    text: 'The barista suggests a limited drink. You…',
    options: [
      { value: 'A', label: 'Stay with your usual.' },
      { value: 'B', label: 'Ask what makes it special.' },
      { value: 'C', label: 'Try it immediately.' },
      { value: 'D', label: 'Think about it… then maybe.' },
    ],
  },
  {
    id: 8,
    text: "Your drink isn't exactly what you expected. You…",
    options: [
      { value: 'A', label: 'Accept it and move on.' },
      { value: 'B', label: 'Laugh it off.' },
      { value: 'C', label: 'Analyze what changed.' },
      { value: 'D', label: 'Feel slightly off.' },
    ],
  },
  {
    id: 9,
    text: 'You usually discover new cafés through…',
    options: [
      { value: 'A', label: "Routine — it's on my path." },
      { value: 'B', label: 'Friends.' },
      { value: 'C', label: 'Instagram / online.' },
      { value: 'D', label: 'Active searching.' },
    ],
  },
  {
    id: 10,
    text: 'An hour alone in a café looks like…',
    options: [
      { value: 'A', label: 'Deep work.' },
      { value: 'B', label: 'Messaging someone.' },
      { value: 'C', label: 'People-watching.' },
      { value: 'D', label: 'Thinking quietly.' },
    ],
  },
  {
    id: 11,
    text: 'Most of your café visits are…',
    options: [
      { value: 'A', label: 'Solo.' },
      { value: 'B', label: 'One-on-one.' },
      { value: 'C', label: 'Small group.' },
      { value: 'D', label: 'Mixed — depends on mood.' },
    ],
  },
];

export const FROG_DESCRIPTIONS: Record<FrogType, FrogDescription> = {
  ESP: {
    name: 'Espresso Frog',
    narrative:
      'You move fast. You decide quickly. Cafés are reset points, not destinations. You tend to reach for sharp intensity when clarity is needed. When you\'re calm, smoother cups may feel unexpectedly different. You likely drink coffee for performance rather than mood — but how often does that "performance mode" actually show up?',
    bestMatch: 'LAT',
    wildcard: 'MOC',
  },
  LAT: {
    name: 'Latte Frog',
    narrative:
      'For you, coffee is connection. Atmosphere matters. Conversation matters. You often reach for something familiar when meeting someone, but alone you may lean toward something stronger than expected. Your habits shift subtly with the people around you.',
    bestMatch: 'ESP',
    wildcard: 'DRP',
  },
  OAT: {
    name: 'Oat Frog',
    narrative:
      'You experience coffee as culture. You notice lighting, textures, design. In new spaces, you gravitate toward something creative. In familiar ones, classics feel refreshing. Environment shapes how flavor feels for you.',
    bestMatch: 'AME',
    wildcard: 'CLD',
  },
  AME: {
    name: 'Americano Frog',
    narrative:
      'Clean. Consistent. Intentional. You prefer clarity over complexity. When focused, you stick to what works. But restlessness may pull you toward something new. Your routine is likely more predictable than you realize.',
    bestMatch: 'OAT',
    wildcard: 'LAT',
  },
  MOC: {
    name: 'Mocha Frog',
    narrative:
      'Coffee mirrors your mood. You absorb atmosphere deeply and lean toward warmth when you need grounding. When steady, lighter cups may feel surprisingly clear. Comfort and ritual are closely linked for you.',
    bestMatch: 'CLD',
    wildcard: 'ESP',
  },
  CLD: {
    name: 'Cold Brew Frog',
    narrative:
      'You move differently. Your rhythm isn\'t traditional. When creativity hits, smooth energy fits. When structure is needed, classics ground you. Your caffeine timing may be more fluid than typical.',
    bestMatch: 'MOC',
    wildcard: 'OAT',
  },
  DRP: {
    name: 'Drip Explorer Frog',
    narrative:
      'You care about nuance. Coffee is experience, not fuel. In discovery mode, you gravitate toward detail. In reflection, simplicity can feel profound. Your preferences evolve naturally.',
    bestMatch: 'LAT',
    wildcard: 'AME',
  },
};
