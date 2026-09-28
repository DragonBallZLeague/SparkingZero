// Small WebP portraits for the demo, cut from the Calculator's 512x512 face
// icons in headless Edge (no image library is installed). Writes
// portraits.json: { [characterId]: dataUrl }. Run demo-data.mjs first.
//
// This is the demo's stand-in for the build step the plan calls for
// ("Visual direction", decision 10). The crop and size are what the demo is
// judging, not how production will make them.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { launch } from '../../scripts/dev/browser.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const THUMBS = path.resolve(HERE, '..', '..', '..', 'calculator', 'public', 'char_thumbnails');

// Every id is T_UI_FaceP1_<id>_00.png except this one (see the plan).
const OVERRIDES = { '0080_01': 'T_UI_FaceP1_0080_00_01.png' };
const fileFor = id => OVERRIDES[id] || `T_UI_FaceP1_${id}_00.png`;

// The square taken from the 512px source: the head sits in the upper middle.
const CROP = { x: 96, y: 28, size: 320 };
const OUT_PX = 96;

// The league emblem for the mock navbar (558 KB as shipped).
const LOGO = path.resolve(HERE, '..', '..', '..', 'website', 'public', 'images', 'SZLEmblem.png');

const data = JSON.parse(fs.readFileSync(path.join(HERE, 'demo-data.json'), 'utf8'));
const browser = await launch();
const out = {};
const missing = [];

/** A PNG file -> a resized WebP data URL; crop is [sx, sy, sw, sh] or null for the whole image. */
const shrink = (file, px, crop) => browser.evaluate(`new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => {
    const [sx, sy, sw, sh] = ${JSON.stringify(crop)} || [0, 0, img.naturalWidth, img.naturalHeight];
    const c = document.createElement('canvas');
    c.width = ${px};
    c.height = Math.round(${px} * sh / sw);
    const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
    resolve(c.toDataURL('image/webp', 0.82));
  };
  img.onerror = () => reject(new Error('decode failed'));
  img.src = ${JSON.stringify('data:image/png;base64,' + fs.readFileSync(file).toString('base64'))};
})`);

try {
  for (const { id, name } of data.chars) {
    const file = id && path.join(THUMBS, fileFor(id));
    if (!file || !fs.existsSync(file)) { missing.push(`${name} (${id})`); continue; }
    out[id] = await shrink(file, OUT_PX, [CROP.x, CROP.y, CROP.size, CROP.size]);
  }
  if (fs.existsSync(LOGO)) out.__logo = await shrink(LOGO, 96, null);
} finally {
  await browser.close();
}
fs.writeFileSync(path.join(HERE, 'portraits.json'), JSON.stringify(out));
const kb = Math.round(fs.statSync(path.join(HERE, 'portraits.json')).size / 1024);
console.log(`wrote portraits.json: ${Object.keys(out).length} portraits, ${kb} KB` + (missing.length ? `; missing: ${missing.join(', ')}` : ''));
