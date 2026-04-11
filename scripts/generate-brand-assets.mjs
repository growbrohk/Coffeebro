/**
 * Regenerates favicon, PWA icons, OG image, and quiz mark from public/brand/logo-source.png
 * Run: node scripts/generate-brand-assets.mjs
 */
import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const src = join(root, 'public/brand/logo-source.png');
const BRAND = { r: 243, g: 129, b: 50, alpha: 1 }; // #f38132

/** Truecolor PNG for consistent favicon / PWA decoding. */
async function pngResize(w, h) {
  return sharp(src)
    .resize(w, h, { fit: 'cover' })
    .png({ palette: false, compressionLevel: 9 })
    .toBuffer();
}

async function squareOnBrand(size, innerRatio = 1) {
  const inner = Math.round(size * innerRatio);
  const tile = await sharp(src).resize(inner, inner, { fit: 'cover' }).png().toBuffer();
  const left = Math.floor((size - inner) / 2);
  const top = Math.floor((size - inner) / 2);
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BRAND,
    },
  })
    .composite([{ input: tile, left, top }])
    .png()
    .toBuffer();
}

async function main() {
  mkdirSync(join(root, 'public/icons'), { recursive: true });

  const buf48 = await pngResize(48, 48);
  const faviconPngPath = join(root, 'public/favicon.png');
  writeFileSync(faviconPngPath, buf48);

  const ico = await pngToIco(faviconPngPath);
  writeFileSync(join(root, 'public/favicon.ico'), ico);

  writeFileSync(join(root, 'public/apple-touch-icon.png'), await pngResize(180, 180));

  writeFileSync(join(root, 'public/icons/icon-192.png'), await pngResize(192, 192));
  writeFileSync(join(root, 'public/icons/icon-512.png'), await pngResize(512, 512));

  writeFileSync(join(root, 'public/icons/icon-maskable-192.png'), await squareOnBrand(192, 0.7));
  writeFileSync(join(root, 'public/icons/icon-maskable-512.png'), await squareOnBrand(512, 0.7));

  // Quiz / high-DPI in-app mark
  writeFileSync(join(root, 'public/brand/app-mark.png'), await pngResize(1024, 1024));

  // OG 1200×630: brand background + centered square art (~62% of short edge)
  const ogW = 1200;
  const ogH = 630;
  const art = Math.round(Math.min(ogW, ogH) * 0.62);
  const artBuf = await sharp(src).resize(art, art, { fit: 'cover' }).png().toBuffer();
  const left = Math.floor((ogW - art) / 2);
  const top = Math.floor((ogH - art) / 2);
  const og = await sharp({
    create: {
      width: ogW,
      height: ogH,
      channels: 4,
      background: BRAND,
    },
  })
    .composite([{ input: artBuf, left, top }])
    .png({ compressionLevel: 9 })
    .toBuffer();
  writeFileSync(join(root, 'public/og-image.png'), og);

  console.log('Wrote public/favicon.png, favicon.ico (from PNG), apple-touch-icon.png, og-image.png');
  console.log('Wrote public/icons/icon-{192,512}.png, icon-maskable-{192,512}.png');
  console.log('Wrote public/brand/app-mark.png');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
