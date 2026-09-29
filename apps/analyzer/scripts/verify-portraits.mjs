/**
 * Warns about any character in referencedata/characters.csv without a portrait
 * in public/portraits/. It never fails the build: <Portrait> falls back to a
 * placeholder, and a new character can reach match data before anyone has cut
 * its icon. The fix is `npm run build-portraits` (see that script's header).
 *
 * Usage: node scripts/verify-portraits.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(__dirname, '..');
const csv = fs.readFileSync(path.resolve(APP, '..', '..', 'referencedata', 'characters.csv'), 'utf8');
const dir = path.join(APP, 'public', 'portraits');

const rows = csv.replace(/^﻿/, '').split(/\r?\n/).slice(1).filter(Boolean).map(l => {
  const i = l.lastIndexOf(',');
  return { name: l.slice(0, i).trim(), id: l.slice(i + 1).trim() };
}).filter(r => /^\d{4}_\d{2}$/.test(r.id));

const missing = rows.filter(r => !fs.existsSync(path.join(dir, r.id + '.webp')));
if (missing.length) {
  console.warn(`verify-portraits: ${missing.length} of ${rows.length} characters have no portrait (they show a placeholder):`);
  for (const r of missing) console.warn(`  ${r.id}  ${r.name}`);
  console.warn('  Run `npm run build-portraits` in apps/analyzer to cut them from the Calculator icons.');
} else {
  console.log(`verify-portraits: all ${rows.length} characters have a portrait`);
}
