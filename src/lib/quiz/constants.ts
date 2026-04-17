import type { FrogType, QuizQuestion, FrogDescription, FrogProfileCard } from './types';

export const FROG_TYPES: FrogType[] = ['ESP', 'LAT', 'MOC', 'MAT', 'CLD', 'DIR', 'HDR'];

/** Final tie-break when totals, primary hits, and Q7 points are equal: first listed wins. */
export const TIE_BREAK_FROG_PRIORITY: readonly FrogType[] = [
  'LAT',
  'ESP',
  'MAT',
  'HDR',
  'DIR',
  'CLD',
  'MOC',
];

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

/** Profile hero when the user has not taken the quiz (all frogs — not a single type). */
export const FROG_DEFAULT_GROUP_AVATAR_PATH = '/quiz-frogs/seven-frogs.svg';

/** URL path segment for `/q/share/<slug>.html` and `/og-quiz/<slug>.png`. */
export const FROG_SHARE_SLUG: Record<FrogType, string> = {
  ESP: 'espresso',
  LAT: 'latte',
  MOC: 'mocha',
  MAT: 'matcha',
  CLD: 'cold-brew',
  DIR: 'dirty',
  HDR: 'hand-drip',
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

// Q1–Q7: each answer → primary +2, secondary +1
export const SCORING_MATRIX: Record<number, Record<string, Partial<Record<FrogType, number>>>> = {
  1: {
    A: { ESP: 2, HDR: 1 },
    B: { LAT: 2, MOC: 1 },
    C: { MAT: 2, CLD: 1 },
    D: { DIR: 2, LAT: 1 },
  },
  2: {
    A: { HDR: 2, ESP: 1 },
    B: { LAT: 2, DIR: 1 },
    C: { MAT: 2, CLD: 1 },
    D: { DIR: 2, MOC: 1 },
  },
  3: {
    A: { ESP: 2, HDR: 1 },
    B: { LAT: 2, MOC: 1 },
    C: { HDR: 2, MAT: 1 },
    D: { CLD: 2, DIR: 1 },
  },
  4: {
    A: { ESP: 2, LAT: 1 },
    B: { LAT: 2, MOC: 1 },
    C: { CLD: 2, DIR: 1 },
    D: { MAT: 2, HDR: 1 },
  },
  5: {
    A: { ESP: 2, HDR: 1 },
    B: { LAT: 2, MOC: 1 },
    C: { MAT: 2, CLD: 1 },
    D: { DIR: 2, ESP: 1 },
  },
  6: {
    A: { ESP: 2, HDR: 1 },
    B: { LAT: 2, MOC: 1 },
    C: { MAT: 2, CLD: 1 },
    D: { DIR: 2, LAT: 1 },
  },
  7: {
    A: { ESP: 2, HDR: 1 },
    B: { LAT: 2, DIR: 1 },
    C: { MAT: 2, CLD: 1 },
    D: { MOC: 2, LAT: 1 },
  },
};

export const QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    text: 'You wake up and see your day is already a bit messy. What do you do first?',
    options: [
      { value: 'A', label: 'Sort out what matters most first' },
      { value: 'B', label: 'Message someone and ease into the day' },
      { value: 'C', label: 'Sit with it for a bit before deciding' },
      { value: 'D', label: 'Pretend it’s fine and free-style the day' },
    ],
  },
  {
    id: 2,
    text: 'Your friend cancels a plan one hour before. You:',
    options: [
      { value: 'A', label: 'Keep the plan and go alone' },
      { value: 'B', label: 'Ask someone else out straight away' },
      { value: 'C', label: 'Turn it into a quiet solo reset' },
      { value: 'D', label: 'Change the whole vibe and do something random' },
    ],
  },
  {
    id: 3,
    text: 'At a café or restaurant, your seat choice is usually:',
    options: [
      { value: 'A', label: 'Practical spot, easy in and out' },
      { value: 'B', label: 'Cozy seat where people can gather' },
      { value: 'C', label: 'Somewhere calm with a bit of space' },
      { value: 'D', label: 'Window seat / corner seat with a vibe' },
    ],
  },
  {
    id: 4,
    text: 'Someone gives you a sudden free afternoon. You’d rather:',
    options: [
      { value: 'A', label: 'Clear something from your to-do list' },
      { value: 'B', label: 'Meet someone and catch up' },
      { value: 'C', label: 'Walk around and see where the day goes' },
      { value: 'D', label: 'Stay in your own world and recharge slowly' },
    ],
  },
  {
    id: 5,
    text: 'When trying something new, your instinct is:',
    options: [
      { value: 'A', label: 'Test if it works and keep it efficient' },
      { value: 'B', label: 'See if it feels good and easy to enjoy' },
      { value: 'C', label: 'Explore it properly and understand the vibe' },
      { value: 'D', label: 'Push it a bit just to see what happens' },
    ],
  },
  {
    id: 6,
    text: 'Your friends would probably say you are:',
    options: [
      { value: 'A', label: 'dependable and pretty switched on' },
      { value: 'B', label: 'easy to be around' },
      { value: 'C', label: 'thoughtful but a bit hard to read' },
      { value: 'D', label: 'fun when you’re in the mood, but unpredictable' },
    ],
  },
  {
    id: 7,
    text: 'You walk into a new place with no plan. What happens next?',
    options: [
      { value: 'A', label: 'I quickly figure out the layout and best option' },
      { value: 'B', label: 'I look for people / energy first' },
      { value: 'C', label: 'I observe first and get a feel for the place' },
      { value: 'D', label: 'I follow whatever catches my attention' },
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
