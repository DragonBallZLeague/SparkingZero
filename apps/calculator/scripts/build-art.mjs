/**
 * Full-body character art for the calculator: WebP cuts of the game's 2048px "favorite
 * character" cards (an FModel export, SS/UI/PCard/OBJ/Texture/PCard_FavoriteCh, files
 * T_UI_FavoriteCH_<id>.png in the folder and its DownLoadContents subfolders).
 *
 * Each card is trimmed to its figure (the transparent margin around it, ignoring the faintest
 * glow), then scaled so the longer side is SIZE px, and saved as public/char_art/<id>.webp with
 * its transparency. The originals are ~1.1 MB each (254 MB for 241); a cut is far smaller.
 *
 * The cards draw every character on one 2048px canvas, children smaller than adults, so the
 * figure's height on its card is a relative size: public/char_art/sizes.json records it per id
 * (card px), and the pages stand figures side by side at that scale. The cards shrink giants
 * (Janemba, the Great Apes) to fit, so those need a factor on top (to be curated).
 *
 * Like the Analyzer's build-portraits, it uses headless Edge/Chrome to decode and encode (no
 * image library is installed), so its output is committed rather than made in prebuild.
 * Re-run it when the game adds characters.
 *
 * Usage (from the repo root):
 *   node apps/calculator/scripts/build-art.mjs "<...>/PCard_FavoriteCh" [id ...]
 * With ids, only those characters are cut (for trying sizes).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from '../../analyzer/scripts/dev/browser.mjs';

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(APP, 'public', 'char_art');
const SIZE = 720;          // longer side of the cut, px
const QUALITY = 0.8;
const ALPHA_FLOOR = 40;    // trim pixels fainter than this (0-255): the outer glow

const [src, ...only] = process.argv.slice(2);
if (!src || !fs.existsSync(src)) {
  console.error('usage: node apps/calculator/scripts/build-art.mjs <PCard_FavoriteCh folder> [id ...]');
  process.exit(1);
}
const files = new Map();
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else {
      const m = /^T_UI_FavoriteCh_(\d{4}_\d{2})\.png$/i.exec(e.name);
      if (m) files.set(m[1], p);
    }
  }
};
walk(src);
const ids = JSON.parse(fs.readFileSync(path.join(APP, 'public', 'data', 'characters.json'), 'utf8')).map(c => c.id);
const todo = only.length ? only : ids;

fs.mkdirSync(OUT, { recursive: true });
const sizesFile = path.join(OUT, 'sizes.json');
const sizes = fs.existsSync(sizesFile) ? JSON.parse(fs.readFileSync(sizesFile, 'utf8')) : {};
const browser = await launch();
const missing = [];
let bytes = 0;
try {
  for (const id of todo) {
    const file = files.get(id);
    if (!file) { missing.push(id); continue; }
    const { url, h } = await browser.evaluate(`new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        // find the figure on a 256px copy, then cut it from the full image
        const s = 256, k = img.width / s;
        const t = document.createElement('canvas'); t.width = t.height = s;
        const tg = t.getContext('2d'); tg.drawImage(img, 0, 0, s, s);
        const a = tg.getImageData(0, 0, s, s).data;
        let x0 = s, y0 = s, x1 = -1, y1 = -1;
        for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) if (a[(y * s + x) * 4 + 3] > ${ALPHA_FLOOR}) {
          if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
        if (x1 < 0) { x0 = y0 = 0; x1 = y1 = s - 1; }
        const pad = 2;
        const sx = Math.max(0, (x0 - pad) * k), sy = Math.max(0, (y0 - pad) * k);
        const sw = Math.min(img.width, (x1 + 1 + pad) * k) - sx, sh = Math.min(img.height, (y1 + 1 + pad) * k) - sy;
        const f = ${SIZE} / Math.max(sw, sh);
        const c = document.createElement('canvas'); c.width = Math.round(sw * f); c.height = Math.round(sh * f);
        const g = c.getContext('2d'); g.imageSmoothingQuality = 'high';
        g.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
        resolve({ url: c.toDataURL('image/webp', ${QUALITY}), h: Math.round(sh) });
      };
      img.onerror = () => reject(new Error('decode failed'));
      img.src = ${JSON.stringify('data:image/png;base64,' + '__B64__')};
    })`.replace('__B64__', fs.readFileSync(file).toString('base64')));
    const buf = Buffer.from(url.split(',')[1], 'base64');
    fs.writeFileSync(path.join(OUT, `${id}.webp`), buf);
    bytes += buf.length;
    sizes[id] = h;
  }
} finally {
  await browser.close();
}
fs.writeFileSync(sizesFile, JSON.stringify(Object.fromEntries(Object.entries(sizes).sort())) + '\n');
const n = todo.length - missing.length;
console.log(`cut ${n} characters to public/char_art/ (${Math.round(bytes / 1024)} KB, ${n ? Math.round(bytes / n / 1024) : 0} KB each on average)`);
if (missing.length) console.log(`no card for: ${missing.join(', ')}`);
