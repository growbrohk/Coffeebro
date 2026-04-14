import type { FrogType, QuizQuestion, FrogDescription, FrogProfileCard } from './types';

export const FROG_TYPES: FrogType[] = ['ESP', 'LAT', 'MOC', 'MAT', 'CLD', 'DIR', 'HDR'];

export const FROG_NAMES: Record<FrogType, string> = {
  ESP: 'Espresso Frog',
  LAT: 'Latte Frog',
  MOC: 'Mocha Frog',
  MAT: 'Matcha Frog',
  CLD: 'Cold Brew Frog',
  DIR: 'Dirty Frog',
  HDR: 'Hand Drip Frog',
};

export const FROG_AVATAR_PATH: Record<FrogType, string> = {
  ESP: '/quiz-frogs/espresso.svg',
  LAT: '/quiz-frogs/latte.svg',
  MOC: '/quiz-frogs/mocha.svg',
  MAT: '/quiz-frogs/matcha.svg',
  CLD: '/quiz-frogs/cold-brew.svg',
  DIR: '/quiz-frogs/dirty.svg',
  HDR: '/quiz-frogs/hand-drip.svg',
};

// Legacy mapping for old DB rows (OAT, DRP from previous 11-question quiz; AME from pre-HDR quiz).
// Apply when reading result_type from DB for display.
export const LEGACY_FROG_MAP: Record<string, FrogType> = {
  OAT: 'MAT',
  DRP: 'DIR',
  AME: 'HDR',
};

/** Profile card: CoffeeBro frog one-liner + illustrative population % (not live analytics). */
export const FROG_PROFILE_CARD: Record<FrogType, FrogProfileCard> = {
  ESP: {
    oneLiner:
      'No bullshit, just get it done — quiet, consistent, and always reliable.',
    populationPercent: 15,
  },
  LAT: {
    oneLiner: 'Life is better with people — warm, social, and here for the vibes.',
    populationPercent: 14,
  },
  MOC: {
    oneLiner:
      'Sweet, soft, and unbothered — just here to feel good and stay happy.',
    populationPercent: 14,
  },
  MAT: {
    oneLiner:
      'Looks good, feels good — the vibe, the aesthetic, the main character.',
    populationPercent: 14,
  },
  CLD: {
    oneLiner:
      "Quiet, sensitive, and deeper than you think — you won't get it unless you get it.",
    populationPercent: 14,
  },
  DIR: {
    oneLiner:
      'Loud, bold, and unpredictable — chaos, confidence, and no filter.',
    populationPercent: 15,
  },
  HDR: {
    oneLiner:
      "It's not just coffee, it's the process — focused, intentional, and lowkey intense.",
    populationPercent: 14,
  },
};

/** Temperature for softmax over raw frog scores → display percentages. Higher = flatter distribution. */
export const FROG_SCORE_SOFTMAX_TEMPERATURE = 3;

// Q1–Q7, answer A/B/C/D → { FrogType: points } (balanced 7-question matrix)
export const SCORING_MATRIX: Record<number, Record<string, Partial<Record<FrogType, number>>>> = {
  1: {
    A: { ESP: 2, HDR: 2 },
    B: { LAT: 4, DIR: 2, MOC: 2 },
    C: { CLD: 2, MAT: 4 },
    D: { DIR: 3, MOC: 2 },
  },
  2: {
    A: { ESP: 4 },
    B: { LAT: 4 },
    C: { MOC: 4 },
    D: { MAT: 4 },
  },
  3: {
    A: { DIR: 3, MAT: 2 },
    B: { HDR: 2, CLD: 2 },
    C: { ESP: 4, MAT: 2, DIR: 1 },
    D: { LAT: 3, MOC: 3 },
  },
  4: {
    A: { ESP: 2 },
    B: { LAT: 3, MOC: 2 },
    C: { CLD: 2, HDR: 2 },
    D: { DIR: 3 },
  },
  5: {
    A: { DIR: 3, CLD: 2 },
    B: { LAT: 2, MOC: 3 },
    C: { MAT: 2 },
    D: { ESP: 2, HDR: 2 },
  },
  6: {
    A: { MAT: 2, DIR: 3 },
    B: { ESP: 3, CLD: 2 },
    C: { DIR: 3, HDR: 2 },
    D: { CLD: 3, LAT: 3 },
  },
  7: {
    A: { HDR: 2, CLD: 2 },
    B: { LAT: 2, MOC: 3 },
    C: { MAT: 2, DIR: 4 },
    D: { ESP: 2, HDR: 3 },
  },
};

export const QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    text: 'You really want a coffee, but you got $0 in your pocket',
    options: [
      { value: 'A', label: 'I go back home and make coffee myself' },
      { value: 'B', label: '“bro u around?” 👀' },
      { value: 'C', label: 'I use CoffeeBro “grab” campaign to hunt free coffee' },
      { value: 'D', label: 'Order first, pay later (run home first lol)' },
    ],
  },
  {
    id: 2,
    text: 'Your coffee arrives. First reaction?',
    options: [
      { value: 'A', label: 'Drink. Why are we wasting time' },
      { value: 'B', label: '“wait wait cheers first!!”' },
      { value: 'C', label: '“this looks so comforting omg” 🥹' },
      { value: 'D', label: 'adjust lighting, take 10 photos' },
    ],
  },
  {
    id: 3,
    text: 'The barista recommends today’s special drink',
    options: [
      { value: 'A', label: '“Thx bro, give me one of those shit”' },
      { value: 'B', label: '“tell me more…” (talk 1 hr)' },
      { value: 'C', label: '“did i ask?” but secretly observe others' },
      { value: 'D', label: 'follow friend’s order' },
    ],
  },
  {
    id: 4,
    text: 'Your drink tastes slightly different',
    options: [
      { value: 'A', label: 'I dun taste, I just drink' },
      { value: 'B', label: 'laugh it off' },
      { value: 'C', label: 'analyze the taste deeply' },
      { value: 'D', label: 'complain / refund mode' },
    ],
  },
  {
    id: 5,
    text: 'You discover a new café because…',
    options: [
      { value: 'A', label: 'new cafes discover me' },
      { value: 'B', label: 'friends choose, I follow' },
      { value: 'C', label: 'ASK THE FOODIES' },
      { value: 'D', label: 'I stick to one spot' },
    ],
  },
  {
    id: 6,
    text: 'A new café pops up nearby — you…',
    options: [
      { value: 'A', label: 'post, never go back' },
      { value: 'B', label: 'try if cheap, stay if good' },
      { value: 'C', label: '“evil capitalist…” (in your head)' },
      { value: 'D', label: 'wait → observe → attack with friends' },
    ],
  },
  {
    id: 7,
    text: 'Why u love coffee — one word',
    options: [
      { value: 'A', label: 'aroma / process' },
      { value: 'B', label: 'taste / comfort' },
      { value: 'C', label: 'looks good' },
      { value: 'D', label: 'routine / fuel' },
    ],
  },
];

export const FROG_DESCRIPTIONS: Record<FrogType, FrogDescription> = {
  ESP: {
    name: 'Espresso Frog',
    narrative:
      '“The realest gangster frog. No bullshit. Just get it done.”\n\n' +
      'This is the “boring” frog, get-shit-done frog — no bullshit, no nothing. The man-out-of-man frog. The frog you can trust the most even if they don’t talk much. Consistent, disciplined — the big bro, usually the caretaker. Simple, straightforward, knowing what they want and getting what they need. You know them, you know them; you don’t know them, you think they’re super boring.',
    bestMatch: 'LAT',
    wildcard: 'MAT',
  },
  LAT: {
    name: 'Latte Frog',
    narrative:
      '“Bro, it’s the milk. Milk makes everything better, just like friends.”\n\n' +
      'Bro, it’s the creamy milk — I like milk. I love how balanced the coffee is. Other people drink coffee; I drink coffee because I like milk. The milk is everything! No milk, coffee is nothing. Just like friends — without companionship, life is boring. I need milk; I need friends. It’s happier that way! Oh, and latte art too — milk makes rainbow!',
    bestMatch: 'ESP',
    wildcard: 'CLD',
  },
  MOC: {
    name: 'Mocha Frog',
    narrative:
      '“I like sweet. I like comfort. I’m happy.”\n\n' +
      'The most peaceful, chill, happy, most loved frog — I like sweet; I don’t follow trends; I don’t care if you judge me. I love sugar; I like comfort — the marshmallow frog everyone loves and wants to keep around. They are the SUGAR!',
    bestMatch: 'HDR',
    wildcard: 'DIR',
  },
  MAT: {
    name: 'Matcha Frog',
    narrative:
      '“It looks good. That’s enough.”\n\n' +
      'The matcha frog is always the trendy one — usually the best-looking frog out there. The center of attention; the 1000-likes-on-their-matcha-post kind of frog. The cool frog, the fashion frog. Some are real matcha fans; some can’t tell green tea from matcha. Being a matcha frog can be a double-edged sword — even if you’re deep, sometimes you get judged just for looking good, and copied by “I want to look good too” frogs.',
    bestMatch: 'CLD',
    wildcard: 'ESP',
  },
  CLD: {
    name: 'Cold Brew Frog',
    narrative:
      '“The unorthodox frog. The highest sensitive frogs that get misunderstood most of the time.”\n\n' +
      'They do it different; they do it their way, subtly. They don’t care to be different; they don’t care if people like them or if they’re comfortable. They want the real taste; they want the truth. They care but don’t show it. The ultimate elegant frog, often mistaken for boring or basic — but they’re highly sensitive and can taste the super detailed differences in cold brew.',
    bestMatch: 'MAT',
    wildcard: 'LAT',
  },
  DIR: {
    name: 'Dirty Frog',
    narrative:
      '“These frogs are DIRTY! Dirty is the way of keeping clean clean, no mixing.”\n\n' +
      'They’re just different — the troublemakers. They like seeing milk mess with coffee; they like drama; they like testing boundaries — theirs and others’. They like people and hate people at the same time; they’re super REAL in how they present. The boldest, loudest, coolest, tattooed ones — the cool kids. YOLO frog: mood swings; you love them or hate them. The smartest frog and sometimes the dumbest. Gemini energy — all milk or all espresso; they don’t mix.',
    bestMatch: 'MOC',
    wildcard: 'HDR',
  },
  HDR: {
    name: 'Hand Drip Frog',
    narrative:
      '“Bro, it’s not the coffee itself, it’s the process.”\n\n' +
      'That’s what you hear from them most. They’re REAL coffee lovers (gear-wise): the best gear. They can walk to school with empty pockets but invest in coffee gear without a blink. Coffee (gear) is life; making coffee is meditation. Super focused on what they’re into, with the superpower of ignoring everything else. Hand-drip frogs are rare — if you’ve got one around you, cherish them. Usually the highest EQ and they know their shit, even if you don’t understand a single thought of how they think.',
    bestMatch: 'DIR',
    wildcard: 'MOC',
  },
};
