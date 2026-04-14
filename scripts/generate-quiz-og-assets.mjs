/**
 * Writes public/og-quiz/<slug>.png (1200×630) and public/q/share/<slug>.html (OG meta + redirect).
 * Preview art: brand orange, frog, frog type ×2, 4 lines of narrative + …
 * Set SITE_ORIGIN for absolute og:image / og:url (default: https://coffee-bro.com).
 * Run: node scripts/generate-quiz-og-assets.mjs
 */
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const SITE_ORIGIN = (process.env.SITE_ORIGIN || 'https://www.coffee-bro.com').replace(/\/$/, '');
const OG_IMAGE_W = 1200;
const OG_IMAGE_H = 630;
/** Matches .quiz-flow in src/index.css */
const BRAND_ORANGE = '#f38132';

/** Align narratives with src/lib/quiz/constants.ts FROG_DESCRIPTIONS */
const FROGS = [
  {
    type: 'ESP',
    slug: 'espresso',
    svg: 'espresso.svg',
    title: 'Espresso Frog',
    description:
      'No bullshit, just get it done — discover your CoffeeBro frog and who matches you best.',
    narrative:
      '“The realest gangster frog. No bullshit. Just get it done.”\n\n' +
      'This is the “boring” frog, get-shit-done frog — no bullshit, no nothing. The man-out-of-man frog. The frog you can trust the most even if they don’t talk much. Consistent, disciplined — the big bro, usually the caretaker. Simple, straightforward, knowing what they want and getting what they need. You know them, you know them; you don’t know them, you think they’re super boring.',
  },
  {
    type: 'LAT',
    slug: 'latte',
    svg: 'latte.svg',
    title: 'Latte Frog',
    description:
      'Life is better with people — take the CoffeeBro quiz to find your coffee frog.',
    narrative:
      '“Bro, it’s the milk. Milk makes everything better, just like friends.”\n\n' +
      'Bro, it’s the creamy milk — I like milk. I love how balanced the coffee is. Other people drink coffee; I drink coffee because I like milk. The milk is everything! No milk, coffee is nothing. Just like friends — without companionship, life is boring. I need milk; I need friends. It’s happier that way! Oh, and latte art too — milk makes rainbow!',
  },
  {
    type: 'MOC',
    slug: 'mocha',
    svg: 'mocha.svg',
    title: 'Mocha Frog',
    description: 'Sweet, soft, and unbothered — find your CoffeeBro frog personality.',
    narrative:
      '“I like sweet. I like comfort. I’m happy.”\n\n' +
      'The most peaceful, chill, happy, most loved frog — I like sweet; I don’t follow trends; I don’t care if you judge me. I love sugar; I like comfort — the marshmallow frog everyone loves and wants to keep around. They are the SUGAR!',
  },
  {
    type: 'MAT',
    slug: 'matcha',
    svg: 'matcha.svg',
    title: 'Matcha Frog',
    description: 'Looks good, feels good — take the quiz and meet your coffee match.',
    narrative:
      '“It looks good. That’s enough.”\n\n' +
      'The matcha frog is always the trendy one — usually the best-looking frog out there. The center of attention; the 1000-likes-on-their-matcha-post kind of frog. The cool frog, the fashion frog. Some are real matcha fans; some can’t tell green tea from matcha. Being a matcha frog can be a double-edged sword — even if you’re deep, sometimes you get judged just for looking good, and copied by “I want to look good too” frogs.',
  },
  {
    type: 'CLD',
    slug: 'cold-brew',
    svg: 'cold-brew.svg',
    title: 'Cold Brew Frog',
    description: 'Quiet, sensitive, and deeper than you think — discover your CoffeeBro frog.',
    narrative:
      '“The unorthodox frog. The highest sensitive frogs that get misunderstood most of the time.”\n\n' +
      'They do it different; they do it their way, subtly. They don’t care to be different; they don’t care if people like them or if they’re comfortable. They want the real taste; they want the truth. They care but don’t show it. The ultimate elegant frog, often mistaken for boring or basic — but they’re highly sensitive and can taste the super detailed differences in cold brew.',
  },
  {
    type: 'DIR',
    slug: 'dirty',
    svg: 'dirty.svg',
    title: 'Dirty Frog',
    description: 'Loud, bold, and unpredictable — find your CoffeeBro frog and best match.',
    narrative:
      '“These frogs are DIRTY! Dirty is the way of keeping clean clean, no mixing.”\n\n' +
      'They’re just different — the troublemakers. They like seeing milk mess with coffee; they like drama; they like testing boundaries — theirs and others’. They like people and hate people at the same time; they’re super REAL in how they present. The boldest, loudest, coolest, tattooed ones — the cool kids. YOLO frog: mood swings; you love them or hate them. The smartest frog and sometimes the dumbest. Gemini energy — all milk or all espresso; they don’t mix.',
  },
  {
    type: 'HDR',
    slug: 'hand-drip',
    svg: 'hand-drip.svg',
    title: 'Hand Drip Frog',
    description: "It's not just coffee, it's the process — take the CoffeeBro quiz.",
    narrative:
      '“Bro, it’s not the coffee itself, it’s the process.”\n\n' +
      'That’s what you hear from them most. They’re REAL coffee lovers (gear-wise): the best gear. They can walk to school with empty pockets but invest in coffee gear without a blink. Coffee (gear) is life; making coffee is meditation. Super focused on what they’re into, with the superpower of ignoring everything else. Hand-drip frogs are rare — if you’ve got one around you, cherish them. Usually the highest EQ and they know their shit, even if you don’t understand a single thought of how they think.',
  },
];

const MAX_CHARS_PER_LINE = 52;

/**
 * First three lines fill by word wrap; fourth line holds remainder or truncates with …
 */
function narrativeToFourLines(narrative) {
  const text = narrative.replace(/\s+/g, ' ').trim();
  const words = text.split(/\s+/);
  const lines = ['', '', '', ''];
  let wi = 0;
  for (let L = 0; L < 3; L++) {
    while (wi < words.length) {
      const w = words[wi];
      const next = lines[L] ? `${lines[L]} ${w}` : w;
      if (next.length <= MAX_CHARS_PER_LINE) {
        lines[L] = next;
        wi++;
      } else break;
    }
  }
  while (wi < words.length) {
    const next = lines[3] ? `${lines[3]} ${words[wi]}` : words[wi];
    if (next.length <= MAX_CHARS_PER_LINE - 1) {
      lines[3] = next;
      wi++;
    } else break;
  }
  if (wi < words.length) {
    if (lines[3]) {
      const t = lines[3].trim();
      lines[3] =
        t.length > MAX_CHARS_PER_LINE - 1
          ? `${t.slice(0, MAX_CHARS_PER_LINE - 2).trimEnd()}…`
          : `${t}…`;
    } else {
      const rest = words.slice(wi).join(' ');
      lines[3] =
        rest.length <= MAX_CHARS_PER_LINE - 1
          ? `${rest}…`
          : `${rest.slice(0, MAX_CHARS_PER_LINE - 2).trimEnd()}…`;
    }
  }
  return lines;
}

function escapeXml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function buildOgPng(f) {
  const svgPath = join(root, 'public/quiz-frogs', f.svg);
  const frogBuf = await sharp(svgPath).resize(200, 200, { fit: 'inside' }).png().toBuffer();
  const b64 = frogBuf.toString('base64');
  const lines = narrativeToFourLines(f.narrative);
  const cx = OG_IMAGE_W / 2;
  const title = f.title;

  const lineTs = lines
    .map((line, i) => {
      const y = 418 + i * 24;
      return `<tspan x="${cx}" y="${y}" text-anchor="middle">${escapeXml(line)}</tspan>`;
    })
    .join('\n          ');

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${OG_IMAGE_W}" height="${OG_IMAGE_H}" viewBox="0 0 ${OG_IMAGE_W} ${OG_IMAGE_H}">
  <rect width="${OG_IMAGE_W}" height="${OG_IMAGE_H}" fill="${BRAND_ORANGE}"/>
  <text x="${cx}" y="40" text-anchor="middle" fill="#ffffff" font-family="system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif" font-size="26" font-weight="800" letter-spacing="0.06em">YOUR COFFEE FROG</text>
  <image xlink:href="data:image/png;base64,${b64}" href="data:image/png;base64,${b64}" x="${cx - 100}" y="62" width="200" height="200" preserveAspectRatio="xMidYMid meet"/>
  <text x="${cx}" y="292" text-anchor="middle" fill="#ffffff" font-family="system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif" font-size="34" font-weight="700">${escapeXml(title)}</text>
  <text x="${cx}" y="334" text-anchor="middle" fill="#ffffff" font-family="system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif" font-size="26" font-weight="600" opacity="0.95">${escapeXml(title)}</text>
  <rect x="72" y="358" width="${OG_IMAGE_W - 144}" height="248" rx="24" ry="24" fill="#ffffff" fill-opacity="0.16"/>
  <text x="${cx}" y="392" text-anchor="middle" fill="#ffffff" font-family="system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif" font-size="17" font-weight="500">
          ${lineTs}
  </text>
</svg>`;

  return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
}

async function main() {
  const ogDir = join(root, 'public/og-quiz');
  const shareDir = join(root, 'public/q/share');
  mkdirSync(ogDir, { recursive: true });
  mkdirSync(shareDir, { recursive: true });

  for (const f of FROGS) {
    const png = await buildOgPng(f);
    writeFileSync(join(ogDir, `${f.slug}.png`), png);

    const pageUrl = `${SITE_ORIGIN}/q/share/${f.slug}.html`;
    const imageUrl = `${SITE_ORIGIN}/og-quiz/${f.slug}.png`;
    const ogTitle = `${f.title} — CoffeeBro Quiz`;
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(ogTitle)}</title>
  <meta name="description" content="${escapeHtml(f.description)}" />
  <meta property="og:title" content="${escapeHtml(ogTitle)}" />
  <meta property="og:description" content="${escapeHtml(f.description)}" />
  <meta property="og:image" content="${escapeHtml(imageUrl)}" />
  <meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}" />
  <meta property="og:image:width" content="${OG_IMAGE_W}" />
  <meta property="og:image:height" content="${OG_IMAGE_H}" />
  <meta property="og:image:type" content="image/png" />
  <meta property="og:image:alt" content="${escapeHtml(ogTitle)}" />
  <meta property="og:url" content="${escapeHtml(pageUrl)}" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(ogTitle)}" />
  <meta name="twitter:description" content="${escapeHtml(f.description)}" />
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />
  <link rel="canonical" href="${escapeHtml(pageUrl)}" />
  <meta http-equiv="refresh" content="0;url=/q?r=${f.type}" />
</head>
<body>
  <p><a href="/q?r=${f.type}">Continue to CoffeeBro quiz</a></p>
</body>
</html>
`;
    writeFileSync(join(shareDir, `${f.slug}.html`), html, 'utf8');
  }

  console.log(`Wrote ${FROGS.length} files to public/og-quiz/*.png and public/q/share/*.html`);
  console.log(`SITE_ORIGIN=${SITE_ORIGIN} (override with SITE_ORIGIN=https://your.domain)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
