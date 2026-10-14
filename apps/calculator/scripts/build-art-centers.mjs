/**
 * Where each figure's body is across its art (public/char_art/<id>.webp), so the pages can center the body rather
 * than the picture. A cut is trimmed to everything drawn, so an outstretched arm (Tien), a tail (Frieza) or big
 * hair (Yajirobe) pulls the picture's middle away from the body.
 *
 * The pages show a figure from the head down, so this looks at the top part of each picture: per column, how much
 * of it is drawn (alpha above ALPHA_FLOOR). The head and torso stack up in the same columns, while an arm or a tail
 * covers only a short stretch of each, so the body is where that coverage is high: the coverage-weighted middle of
 * the columns at CORE or more of the best (smoothed) column.
 *
 * Writes public/char_art/centers.json: { id: x } with x the body's middle as a fraction of the picture's width
 * (0.5 = the picture's middle). The art CSS shifts each picture by (0.5 - x) of its width (`--cx`).
 *
 * Like build-art it decodes in headless Edge/Chrome (no image library is installed), so its output is committed.
 * Re-run it after build-art.
 *
 * Usage (from the repo root): node apps/calculator/scripts/build-art-centers.mjs [id ...]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from '../../analyzer/scripts/dev/browser.mjs';

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(APP, 'public', 'char_art');
const ALPHA_FLOOR = 40;  // as build-art: fainter than this is the outer glow
const TOP = 0.5;         // the part of the figure the pages show (head down to about the waist)
const CORE = 0.7;        // columns at 70% or more of the best column's coverage are the body

const only = process.argv.slice(2);
const ids = only.length ? only : fs.readdirSync(DIR).filter(f => f.endsWith('.webp')).map(f => f.slice(0, -5)).sort();
const file = path.join(DIR, 'centers.json');
const centers = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
const browser = await launch();
try {
  for (const id of ids) {
    const b64 = fs.readFileSync(path.join(DIR, `${id}.webp`)).toString('base64');
    centers[id] = await browser.evaluate(`new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const w = img.width, h = Math.round(img.height * ${TOP});
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        const g = c.getContext('2d'); g.drawImage(img, 0, 0);
        const a = g.getImageData(0, 0, w, h).data;
        const col = new Float64Array(w);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (a[(y * w + x) * 4 + 3] > ${ALPHA_FLOOR}) col[x]++;
        // smooth over 4% of the width, so a gap between arm and body doesn't split the body
        const r = Math.max(2, Math.round(w * 0.02)), sm = new Float64Array(w);
        for (let x = 0; x < w; x++) { let s = 0, n = 0; for (let i = x - r; i <= x + r; i++) if (i >= 0 && i < w) { s += col[i]; n++; } sm[x] = s / n; }
        const best = Math.max(...sm);
        let sw = 0, sx = 0;
        for (let x = 0; x < w; x++) if (sm[x] >= best * ${CORE}) { sw += sm[x]; sx += sm[x] * (x + 0.5); }
        resolve(sw ? +(sx / sw / w).toFixed(3) : 0.5);
      };
      img.onerror = () => reject(new Error('decode failed: ${id}'));
      img.src = 'data:image/webp;base64,${b64}';
    })`);
  }
} finally {
  await browser.close();
}
fs.writeFileSync(file, JSON.stringify(Object.fromEntries(Object.entries(centers).sort())) + '\n');
const off = Object.entries(centers).filter(([, x]) => Math.abs(x - 0.5) >= 0.08).map(([id, x]) => `${id} ${x}`);
console.log(`centers for ${ids.length} figures in public/char_art/centers.json; ${off.length} sit 8% or more off their picture's middle${off.length ? ': ' + off.join(', ') : ''}`);
