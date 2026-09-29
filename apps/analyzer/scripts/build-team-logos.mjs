/**
 * Team logos for the analyzer: 96px WebP copies of the website's team logos,
 * written to public/team-logos/<slug>.webp for every team in
 * referencedata/teams.json.
 *
 * The analyzer shows the website's names and logos ("Team names" in
 * docs/ANALYZER_REDESIGN_PLAN.md). The originals are 1000px PNGs of 20-70 KB,
 * shown here at 22-48px; a copy is ~3 KB. Each logo is fitted whole into the
 * square, not cropped, and keeps its transparency.
 *
 * Committed, like the portraits (scripts/build-portraits.mjs), so the deploy
 * never needs a browser: this uses headless Edge/Chrome (scripts/dev/browser.mjs)
 * to scale and encode. Re-run it when teams.json gains a team or a logo
 * changes; scripts/verify-teams.mjs (in prebuild) warns until you do, and the
 * <TeamLogo> component falls back to the team's initial.
 *
 * Usage (from apps/analyzer): npm run build-team-logos
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { launch } from './dev/browser.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(__dirname, '..');
const TEAMS = JSON.parse(fs.readFileSync(path.resolve(APP, '..', '..', 'referencedata', 'teams.json'), 'utf8'));
const IMAGES = path.resolve(APP, '..', 'website', 'public', 'images');
const OUT = path.join(APP, 'public', 'team-logos');
const OUT_PX = 96;

fs.mkdirSync(OUT, { recursive: true });
const browser = await launch();
const missing = [];
let written = 0;
try {
  for (const team of TEAMS) {
    const file = team.logo && path.join(IMAGES, team.logo);
    if (!file || !fs.existsSync(file)) { missing.push(team.name); continue; }
    const dataUrl = await browser.evaluate(`new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = c.height = ${OUT_PX};
        const g = c.getContext('2d');
        g.imageSmoothingQuality = 'high';
        const k = ${OUT_PX} / Math.max(img.width, img.height);
        const w = img.width * k, h = img.height * k;
        g.drawImage(img, (${OUT_PX} - w) / 2, (${OUT_PX} - h) / 2, w, h);
        resolve(c.toDataURL('image/webp', 0.86));
      };
      img.onerror = () => reject(new Error('decode failed'));
      img.src = ${JSON.stringify('data:image/png;base64,' + fs.readFileSync(file).toString('base64'))};
    })`);
    fs.writeFileSync(path.join(OUT, team.slug + '.webp'), Buffer.from(dataUrl.split(',')[1], 'base64'));
    written++;
  }
} finally {
  await browser.close();
}
const kb = Math.round(fs.readdirSync(OUT).reduce((a, f) => a + fs.statSync(path.join(OUT, f)).size, 0) / 1024);
console.log(`wrote ${written} team logos to public/team-logos/ (${kb} KB total)`);
if (missing.length) console.log(`no logo file for: ${missing.join(', ')}`);
