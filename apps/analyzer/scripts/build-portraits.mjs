/**
 * Character portraits for the analyzer: 96px WebP cuts of the Calculator's
 * 512px in-game face icons, written to public/portraits/<id>.webp.
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
// and the output size: 96px serves a 48px slot at 2x.
const CROP = { x: 96, y: 28, size: 320 };
const OUT_PX = 96;

const ids = fs.readFileSync(REF, 'utf8').replace(/^﻿/, '').split(/\r?\n/).slice(1)
  .map(l => l.slice(l.lastIndexOf(',') + 1).trim())
  .filter(id => /^\d{4}_\d{2}$/.test(id));

fs.mkdirSync(OUT, { recursive: true });
const browser = await launch();
const missing = [];
let written = 0;
try {
  for (const id of ids) {
    const file = path.join(THUMBS, sourceFor(id));
    if (!fs.existsSync(file)) { missing.push(id); continue; }
    const dataUrl = await browser.evaluate(`new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = c.height = ${OUT_PX};
        const g = c.getContext('2d');
        g.imageSmoothingQuality = 'high';
        g.drawImage(img, ${CROP.x}, ${CROP.y}, ${CROP.size}, ${CROP.size}, 0, 0, ${OUT_PX}, ${OUT_PX});
        resolve(c.toDataURL('image/webp', 0.82));
      };
      img.onerror = () => reject(new Error('decode failed'));
      img.src = ${JSON.stringify('data:image/png;base64,' + fs.readFileSync(file).toString('base64'))};
    })`);
    fs.writeFileSync(path.join(OUT, id + '.webp'), Buffer.from(dataUrl.split(',')[1], 'base64'));
    written++;
  }
} finally {
  await browser.close();
}
const kb = Math.round(fs.readdirSync(OUT).reduce((a, f) => a + fs.statSync(path.join(OUT, f)).size, 0) / 1024);
console.log(`wrote ${written} portraits to public/portraits/ (${kb} KB total)`);
if (missing.length) console.log(`no Calculator icon for: ${missing.join(', ')}`);
