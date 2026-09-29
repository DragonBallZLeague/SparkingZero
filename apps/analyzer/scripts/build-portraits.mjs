/**
 * Character portraits for the analyzer: WebP cuts of the Calculator's 512px
 * in-game face icons, in two sizes from the same crop:
 *   public/portraits/<id>.webp      96px, sharp up to a 48px slot on a 2x screen
 *                                   (tables, lineups, the tier list)
 *   public/portraits/192/<id>.webp  192px, for anything larger (the Character
 *                                   page header). <Portrait> offers it through
 *                                   srcset above 48px, so a browser fetches it
 *                                   only on a screen that needs it.
 *
 * The league approved reusing the Calculator's icons ("Visual direction",
 * decision 10, in docs/ANALYZER_REDESIGN_PLAN.md). The originals average
 * 190 KB, so a table of 62 would pull ~12 MB; a cut is ~5 KB.
 *
 * WHY THE OUTPUT IS COMMITTED rather than made in prebuild: no image library is
 * installed, and this uses headless Edge/Chrome (scripts/dev/browser.mjs) to
 * crop and encode. Keeping a browser out of the deploy build is worth a
 * megabyte of checked-in images that only change when a character is added.
 * Re-run it when characters.csv gains a character; scripts/verify-portraits.mjs
 * (in prebuild) warns about any id in the match data without one, and the
 * <Portrait> component falls back to a placeholder, so a missing file is never
 * an error.
 *
 * Usage (from apps/analyzer): npm run build-portraits
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { launch } from './dev/browser.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(__dirname, '..');
const REF = path.resolve(APP, '..', '..', 'referencedata', 'characters.csv');
const THUMBS = path.resolve(APP, '..', 'calculator', 'public', 'char_thumbnails');
const OUT = path.join(APP, 'public', 'portraits');

/** Every id's icon is T_UI_FaceP1_<id>_00.png, except this one. */
export const PORTRAIT_FILE_OVERRIDES = { '0080_01': 'T_UI_FaceP1_0080_00_01.png' };
const sourceFor = id => PORTRAIT_FILE_OVERRIDES[id] || `T_UI_FaceP1_${id}_00.png`;

// The square taken from the 512px source (the head sits in the upper middle),
// and the sizes cut from it. verify-portraits.mjs checks both folders.
const CROP = { x: 96, y: 28, size: 320 };
const SIZES = [
  { px: 96, dir: OUT },
  { px: 192, dir: path.join(OUT, '192') },
];

const ids = fs.readFileSync(REF, 'utf8').replace(/^﻿/, '').split(/\r?\n/).slice(1)
  .map(l => l.slice(l.lastIndexOf(',') + 1).trim())
  .filter(id => /^\d{4}_\d{2}$/.test(id));

for (const s of SIZES) fs.mkdirSync(s.dir, { recursive: true });
const browser = await launch();
const missing = [];
let written = 0;
try {
  for (const id of ids) {
    const file = path.join(THUMBS, sourceFor(id));
    if (!fs.existsSync(file)) { missing.push(id); continue; }
    const cuts = await browser.evaluate(`new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(${JSON.stringify(SIZES.map(s => s.px))}.map(px => {
        const c = document.createElement('canvas');
        c.width = c.height = px;
        const g = c.getContext('2d');
        g.imageSmoothingQuality = 'high';
        g.drawImage(img, ${CROP.x}, ${CROP.y}, ${CROP.size}, ${CROP.size}, 0, 0, px, px);
        return c.toDataURL('image/webp', 0.82);
      }));
      img.onerror = () => reject(new Error('decode failed'));
      img.src = ${JSON.stringify('data:image/png;base64,' + fs.readFileSync(file).toString('base64'))};
    })`);
    SIZES.forEach((s, i) => fs.writeFileSync(path.join(s.dir, id + '.webp'), Buffer.from(cuts[i].split(',')[1], 'base64')));
    written++;
  }
} finally {
  await browser.close();
}
for (const s of SIZES) {
  const files = fs.readdirSync(s.dir).filter(f => f.endsWith('.webp'));
  const kb = Math.round(files.reduce((a, f) => a + fs.statSync(path.join(s.dir, f)).size, 0) / 1024);
  console.log(`${s.px}px: ${files.length} portraits in ${path.relative(APP, s.dir).split(path.sep).join('/')}/ (${kb} KB total)`);
}
console.log(`cut ${written} characters`);
if (missing.length) console.log(`no Calculator icon for: ${missing.join(', ')}`);
