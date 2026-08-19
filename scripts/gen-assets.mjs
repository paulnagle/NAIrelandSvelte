/**
 * Generates the five master assets in assets/ from static/web_hi_res_512.png.
 * Run once, then commit assets/ and run `npm run assets` to push into ios/android.
 */
import sharp from '../node_modules/sharp/lib/index.js';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = resolve(root, 'static/web_hi_res_512.png');

async function make(outPath, width, height, opts = {}) {
  const { markSize, bg = { r: 255, g: 255, b: 255, alpha: 1 } } = opts;

  const base = sharp({ create: { width, height, channels: 4, background: bg } });

  if (markSize) {
    const mark = await sharp(src)
      .resize(markSize, markSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();
    await base
      .composite([{ input: mark, gravity: 'center' }])
      .png()
      .toFile(outPath);
  } else {
    await base.png().toFile(outPath);
  }

  console.log(`✓ ${outPath}`);
}

const white = { r: 255, g: 255, b: 255, alpha: 1 };
const black = { r: 0, g: 0, b: 0, alpha: 1 };

await make(`${root}/assets/icon.png`, 1024, 1024, { markSize: 1024, bg: white });
await make(`${root}/assets/icon-foreground.png`, 1024, 1024, { markSize: 840, bg: { r: 0, g: 0, b: 0, alpha: 0 } });
await make(`${root}/assets/icon-background.png`, 1024, 1024, { bg: white });
await make(`${root}/assets/splash.png`, 2732, 2732, { markSize: 900, bg: white });
await make(`${root}/assets/splash-dark.png`, 2732, 2732, { markSize: 900, bg: black });
