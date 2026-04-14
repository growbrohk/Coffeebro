/**
 * Writes public/og-quiz/<slug>.png (1200×630) and public/q/share/<slug>.html (OG meta + redirect).
 * Set SITE_ORIGIN for absolute og:image / og:url (default: https://coffeebro.com).
 * Run: node scripts/generate-quiz-og-assets.mjs
 */
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const SITE_ORIGIN = (process.env.SITE_ORIGIN || 'https://coffeebro.com').replace(/\/$/, '');

/** Must stay aligned with src/lib/quiz/constants.ts (FROG_SHARE_SLUG + captureBackgroundColor + FROG_NAMES + narratives for OG). */
const FROGS = [
  {
    type: 'ESP',
    slug: 'espresso',
    svg: 'espresso.svg',
    bg: '#2a1810',
    title: 'Espresso Frog',
    description:
      'No bullshit, just get it done — discover your CoffeeBro frog and who matches you best.',
  },
  {
    type: 'LAT',
    slug: 'latte',
    svg: 'latte.svg',
    bg: '#6b4423',
    title: 'Latte Frog',
    description:
      'Life is better with people — take the CoffeeBro quiz to find your coffee frog.',
  },
  {
    type: 'MOC',
    slug: 'mocha',
    svg: 'mocha.svg',
    bg: '#4a3020',
    title: 'Mocha Frog',
    description:
      'Sweet, soft, and unbothered — find your CoffeeBro frog personality.',
  },
  {
    type: 'MAT',
    slug: 'matcha',
    svg: 'matcha.svg',
    bg: '#163529',
    title: 'Matcha Frog',
    description:
      'Looks good, feels good — take the quiz and meet your coffee match.',
  },
  {
    type: 'CLD',
    slug: 'cold-brew',
    svg: 'cold-brew.svg',
    bg: '#243447',
    title: 'Cold Brew Frog',
    description:
      'Quiet, sensitive, and deeper than you think — discover your CoffeeBro frog.',
  },
  {
    type: 'DIR',
    slug: 'dirty',
    svg: 'dirty.svg',
    bg: '#4a1424',
    title: 'Dirty Frog',
    description:
      'Loud, bold, and unpredictable — find your CoffeeBro frog and best match.',
  },
  {
    type: 'HDR',
    slug: 'hand-drip',
    svg: 'hand-drip.svg',
    bg: '#3a3220',
    title: 'Hand Drip Frog',
    description:
      "It's not just coffee, it's the process — take the CoffeeBro quiz.",
  },
];

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
    alpha: 1,
  };
}

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function main() {
  const ogDir = join(root, 'public/og-quiz');
  const shareDir = join(root, 'public/q/share');
  mkdirSync(ogDir, { recursive: true });
  mkdirSync(shareDir, { recursive: true });

  const ogW = 1200;
  const ogH = 630;

  for (const f of FROGS) {
    const svgPath = join(root, 'public/quiz-frogs', f.svg);
    const frogBuf = await sharp(svgPath)
      .resize(480, 480, { fit: 'inside' })
      .png()
      .toBuffer();
    const meta = await sharp(frogBuf).metadata();
    const fw = meta.width ?? 480;
    const fh = meta.height ?? 480;
    const left = Math.floor((ogW - fw) / 2);
    const top = Math.floor((ogH - fh) / 2);

    const png = await sharp({
      create: {
        width: ogW,
        height: ogH,
        channels: 4,
        background: hexToRgb(f.bg),
      },
    })
      .composite([{ input: frogBuf, left, top }])
      .png({ compressionLevel: 9 })
      .toBuffer();

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
