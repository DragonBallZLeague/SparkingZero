/**
 * Freezes the league reference the Character page Overview ranks against, and
 * writes it to src/config/style-baseline.json.
 *
 * WHY THIS IS A BUILD ARTEFACT
 *
 * Same reasoning as the tier cutoffs (generate-performance-bands.mjs): a rank
 * computed against whatever the viewer has filtered to is self-referential - it
 * moves when a filter changes although the character did not. Freezing the
 * reference makes "#12/126 for damage" an absolute fact: the same number for every
 * viewer, in every view, and in a shared link. A single build is ranked against
 * this same reference - where it would place among the characters.
 *
 * THE BASIS
 *
 * The tier cutoffs' window exactly (calibration-basis.mjs): last two seasons,
 * Ultra only. The pool is characters with 5+ appearances, so a character seen
 * twice cannot anchor the top or bottom of a ranking.
 *
 * WHAT IS STORED
 *
 * For each figure in OVERVIEW_METRICS, every pooled character's value, sorted
 * (a rank needs the whole distribution, not just quartiles), plus the medians the
 * page shows as "League" and the 95th percentiles that scale its volume circles.
 * Values are computed by src/utils/characterOverview.js - the page's own code - so
 * a character and the league are measured identically.
 *
 * Committed, and only rewritten when the reference actually changes, so a
 * recalibration shows up as a reviewable diff rather than as churn.
 *
 * Usage: npm run build-style-baseline
 * (the JSON import hook is needed because the aggregation imports a .json file)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getAggregatedCharacterData } from '../src/utils/aggregation/characterAggregation.js';
import { parseCharacterCSV } from '../src/utils/statCalculations.js';
import {
  overviewFromMatches, OVERVIEW_METRICS, DEFENSE_WEIGHTS, round4, percentileIn, defenseRaw,
} from '../src/utils/characterOverview.js';
import { loadCalibrationBasis, SEASON_WINDOW, REQUIRED_DIFFICULTY } from './calibration-basis.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(__dirname, '..');
const refData = path.resolve(appDir, '..', '..', 'referencedata');
const outPath = path.join(appDir, 'src', 'config', 'style-baseline.json');

/** Minimum appearances for a character to be part of the reference. */
const POOL_MIN = 5;
/** Refuse to write a reference too thin to rank against. */
const MIN_POOL = 40;

const LABEL = 'generate-style-baseline';
const charMap = parseCharacterCSV(fs.readFileSync(path.join(refData, 'characters.csv'), 'utf8'));
const { files, seasons } = loadCalibrationBasis(appDir, LABEL);

const rows = getAggregatedCharacterData(files, charMap, {}, {}, {});
const pool = rows.filter(r => (r.matchCount || 0) >= POOL_MIN && (r.totalBattleTime || 0) > 0);
if (pool.length < MIN_POOL) {
  console.error(`${LABEL}: only ${pool.length} characters with ${POOL_MIN}+ appearances - too few to rank against. Refusing to write.`);
  process.exit(1);
}

const overviews = pool.map(r => overviewFromMatches(r.matches));

// Every figure's sorted distribution.
const metrics = {};
for (const [key, get] of Object.entries(OVERVIEW_METRICS)) {
  metrics[key] = overviews.map(o => round4(get(o))).filter(v => v !== null).sort((a, b) => a - b);
}

// Defensive Fighter is a blend of percentiles, so it is placed and blended per
// character, then that blend gets its own distribution.
const defense = overviews.map(o => {
  const pct = {};
  for (const k of Object.keys(DEFENSE_WEIGHTS)) pct[k] = percentileIn(metrics[k], round4(OVERVIEW_METRICS[k](o)));
  return round4(defenseRaw(pct));
}).sort((a, b) => a - b);

const at = (arr, q) => (arr.length ? arr[Math.floor(q * (arr.length - 1))] : null);
const medians = Object.fromEntries(Object.entries(metrics).map(([k, arr]) => [k, arr.length ? arr[Math.floor(arr.length / 2)] : null]));
const p95 = Object.fromEntries(['skill1', 'skill2', 'kiFired'].map(k => [k, at(metrics[k], 0.95)]));

const baseline = {
  version: 1,
  generated: new Date().toISOString(),
  basis: {
    rule: `rolling last ${SEASON_WINDOW} seasons, ${REQUIRED_DIFFICULTY} difficulty only, characters with ${POOL_MIN}+ appearances`,
    seasonWindow: SEASON_WINDOW,
    seasons,
    difficulty: REQUIRED_DIFFICULTY,
    matches: files.length,
    poolMin: POOL_MIN,
    characters: pool.length,
  },
  defenseWeights: DEFENSE_WEIGHTS,
  medians,
  p95,
  metrics,
  defense,
};

// Only rewrite when the REFERENCE changed (the timestamp is compared out), so a
// build that recalibrates nothing leaves the committed file untouched.
fs.mkdirSync(path.dirname(outPath), { recursive: true });
const existing = fs.existsSync(outPath)
  ? (() => { try { return JSON.parse(fs.readFileSync(outPath, 'utf8')); } catch { return null; } })()
  : null;
const unchanged = existing &&
  JSON.stringify({ ...existing, generated: null }) === JSON.stringify({ ...baseline, generated: null });
if (unchanged) {
  console.log(`${LABEL}: reference unchanged, file left alone`);
} else {
  // One line per metric keeps the committed diff readable when it does change.
  const body = JSON.stringify({ ...baseline, metrics: '__METRICS__' }, null, 2)
    .replace('"__METRICS__"', '{\n' + Object.entries(metrics).map(([k, arr]) => `    "${k}": ${JSON.stringify(arr)}`).join(',\n') + '\n  }')
    .replace(/"defense": \[[\s\S]*?\]/, `"defense": ${JSON.stringify(defense)}`);
  fs.writeFileSync(outPath, body + '\n');
}
console.log(`${LABEL}: seasons ${seasons.join('+')}, ${REQUIRED_DIFFICULTY} only -> ${files.length} matches, ${pool.length} characters (${POOL_MIN}+ appearances)`);
console.log(`  medians  damage ${Math.round(medians.avgDealt)}  melee ${medians.r_melee}/min  ki blasts ${medians.kiFired}/match  super 1 hit ${Math.round(medians.s1Rate * 100)}%`);
