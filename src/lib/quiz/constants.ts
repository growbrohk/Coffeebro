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

/** Profile card: short archetype line + illustrative population % (not live analytics). */
export const FROG_PROFILE_CARD: Record<FrogType, FrogProfileCard> = {
  ESP: { archetype: 'idealistic thinker', populationPercent: 15 },
  LAT: { archetype: 'social connector', populationPercent: 14 },
  MOC: { archetype: 'feeling-led romantic', populationPercent: 14 },
  MAT: { archetype: 'mindful observer', populationPercent: 14 },
  CLD: { archetype: 'independent trailblazer', populationPercent: 14 },
  DIR: { archetype: 'curious experimenter', populationPercent: 15 },
  HDR: { archetype: 'ritual brewer', populationPercent: 14 },
};

// Q1–Q6, answer A/B/C/D → { FrogType: points }
export const SCORING_MATRIX: Record<number, Record<string, Partial<Record<FrogType, number>>>> = {
  1: {
    A: { ESP: 1, HDR: 2 },
    B: { LAT: 4 },
    C: { CLD: 2, MAT: 5 },
    D: { DIR: 1, MOC: 2 },
  },
  2: {
    A: { DIR: 2, MAT: 2 },
    B: { HDR: 2, CLD: 1 },
    C: { ESP: 5, MAT: 2, DIR: 1 },
    D: { LAT: 3, MOC: 4 },
  },
  3: {
    A: { ESP: 2 },
    B: { LAT: 4, MOC: 2 },
    C: { CLD: 2, HDR: 2 },
    D: { DIR: 1 },
  },
  4: {
    A: { DIR: 3, CLD: 2 },
    B: { LAT: 1, MOC: 4 },
    C: { MAT: 1 },
    D: { ESP: 1, HDR: 2 },
  },
  5: {
    A: { MAT: 2, DIR: 1 },
    B: { ESP: 4, CLD: 3 },
    C: { DIR: 1 },
    D: { CLD: 3, LAT: 3 },
  },
  6: {
    A: { HDR: 2, CLD: 2 },
    B: { LAT: 2, MOC: 3 },
    C: { MAT: 2, DIR: 4 },
    D: { ESP: 2, HDR: 3 },
  },
};

export const QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    text: 'You really want a coffee, but you got $0 in your pocket.',
    options: [
      { value: 'A', label: 'I go back home and make coffee myself.' },
      { value: 'B', label: 'I call my bros/sis out and let them pay.' },
      { value: 'C', label: 'I use CoffeeBro “grab” campaign to hunt free coffee.' },
      {
        value: 'D',
        label:
          'Find a coffee shop I can order first, pay later (run home first, pay when I have money).',
      },
    ],
  },
  {
    id: 2,
    text: 'The barista recommends today’s special drink. You most likely:',
    options: [
      {
        value: 'A',
        label:
          'Detail-scan the barista’s tattoos to see if they’re lit; if yes: “Thx bro, give me one of those.”',
      },
      { value: 'B', label: 'Tell me more about the drink! Then bother the barista for another hour.' },
      {
        value: 'C',
        label: 'Bro, did I ask you? …Looks around to see if a lot of people are ordering that anyway.',
      },
      {
        value: 'D',
        label:
          'Turn to your friend: “Yeah yeah, it’s really good!” (You never tried — you just want to order with them.)',
      },
    ],
  },
  {
    id: 3,
    text: 'Your drink tastes slightly different than expected. You…',
    options: [
      { value: 'A', label: 'What taste? I don’t taste! I chuck it!' },
      { value: 'B', label: 'Hahahahaha, it’s different, hahahaha.' },
      { value: 'C', label: 'Oh wow, it’s different — wait, is it the aftertaste or the…' },
      { value: 'D', label: 'Waiter! What did you do to my coffee?! Refund! Redo! Recycle…' },
    ],
  },
  {
    id: 4,
    text: 'You discover a new café because…',
    options: [
      { value: 'A', label: 'I don’t discover new cafés — new cafés discover me.' },
      { value: 'B', label: 'Ask my friend — they choose, I follow.' },
      { value: 'C', label: 'ASK THE FOODIES!!!' },
      { value: 'D', label: 'I don’t — I just go to THE ONE.' },
    ],
  },
  {
    id: 5,
    text: 'A new café pops up nearby — what do you do?',
    options: [
      { value: 'A', label: 'Post on social media, never go back.' },
      { value: 'B', label: 'If the price is good I try; if the taste is good I stay!' },
      {
        value: 'C',
        label: 'New cafés = evil capitalist — let me post some shitty threads! (Just thinking, not posting.)',
      },
      {
        value: 'D',
        label: 'I wait and observe like a hunter — if they have a CoffeeBro hunt campaign, I attack (with friends).',
      },
    ],
  },
  {
    id: 6,
    text: 'Why do you love coffee — one word?',
    options: [
      { value: 'A', label: 'Bro, it’s the aroma, the process.' },
      { value: 'B', label: 'The taste, the balance & the comfort.' },
      { value: 'C', label: 'It just feels good looking at them.' },
      { value: 'D', label: 'It’s my routine, my fuel, my engine.' },
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
