/**
 * Calibrates the Z/A/B/C/D performance tier cutoffs and writes them to
 * src/config/performance-bands.json.
 *
 * WHY THIS IS A BUILD ARTEFACT AND NOT A RUNTIME CALCULATION
 *
 * Tiers used to be percentiles computed against whatever the viewer had filtered
 * to, which made them self-referential - deselecting a tier re-ranked everyone
 * left, so a character changed tier without their score changing. A tier that
 * moves when you toggle a filter is not a tier. Freezing the cutoffs at build
 * time makes a tier an absolute, comparable fact: the same score means the same
 * tier for every viewer, in every view, and in a shared link.
 *
 * The file is committed, so a recalibration shows up as a reviewable diff rather
 * than silently shifting every character's tier between deploys.
 *
 * THE CALIBRATION BASIS
 *
 * A ROLLING window of the last two seasons, Ultra difficulty only, all match
 * types. Rolling rather than "season N onward" because the game has changed
 * substantially over two years of updates and DLC, and the league has changed its
 * own rules - old data actively misleads. Two seasons rather than one so that a
 * newly started season, which may have almost no matches yet, is carried by the
 * previous one.
 *
 * Ultra-only is a hard rule. The league's early difficulty change splits Season 0
 * into roughly 1,155 Strong and 980 Ultra matches; mixing them would rank
 * characters across two different rulesets.
 *
 * The basis is deliberately NOT filtered by match count. That was tested, not
 * assumed: low-sample characters skew LOW, not high (median 46-49 for 1-9 matches
 * versus 62.0 for 10+), so they do not inflate the top. The Z cutoff is identical
 * whether the basis requires 1, 3 or 5 matches - only the lower boundaries move -
 * and filtering would push weak-but-rarely-played characters into D, conflating
 * "poor" with "barely played". Low confidence is communicated by marking a badge
 * provisional instead, which is honest about uncertainty without bending the scale
 * everyone else is measured against.
 *
 * Usage: node --import ./scripts/json-import-hook.mjs scripts/generate-performance-bands.mjs
 * (the hook is needed because the aggregation modules import a .json file the way
 * Vite allows but plain Node does not)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getAggregatedCharacterData } from '../src/utils/aggregation/characterAggregation.js';
import { parseCharacterCSV } from '../src/utils/statCalculations.js';
import { TIERS, TIER_PERCENTILES } from '../src/utils/tierScale.js';
import { loadCalibrationBasis, SEASON_WINDOW, REQUIRED_DIFFICULTY } from './calibration-basis.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(__dirname, '..');
const refData = path.resolve(appDir, '..', '..', 'referencedata');

const outPath = path.join(appDir, 'src', 'config', 'performance-bands.json');
const charMap = parseCharacterCSV(fs.readFileSync(path.join(refData, 'characters.csv'), 'utf8'));

// The window itself is shared with generate-style-baseline.mjs (calibration-basis.mjs),
// so a tier and a Character-page rank are judged against the same league.
const { files, seasons: basisSeasons } = loadCalibrationBasis(appDir, 'generate-performance-bands');

const rows = getAggregatedCharacterData(files, charMap, {}, {}, {});
const scores = rows.map(r => r.combatPerformanceScore).filter(Number.isFinite).sort((a, b) => a - b);

if (scores.length < 20) {
  console.error('generate-performance-bands: only ' + scores.length +
    ' scored characters in the basis - too few to calibrate. Refusing to write bands.');
  process.exit(1);
}

const quantile = p => {
  const i = Math.floor(p * (scores.length - 1));
  return Math.round(scores[i] * 10) / 10;
};

const cutoffs = {};
for (const tier of TIERS) {
  const p = TIER_PERCENTILES[tier];
  if (p === undefined) continue; // the bottom tier has no cutoff
  cutoffs[tier] = quantile(p);
}

// Report the resulting spread so a bad calibration is obvious in the build log.
const distribution = Object.fromEntries(TIERS.map(t => [t, 0]));
for (const s of scores) {
  const tier = TIERS.find(t => cutoffs[t] !== undefined && s >= cutoffs[t]) || TIERS[TIERS.length - 1];
  distribution[tier]++;
}

const bands = {
  version: 1,
  generated: new Date().toISOString(),
  basis: {
    rule: 'rolling last ' + SEASON_WINDOW + ' seasons, ' + REQUIRED_DIFFICULTY +
      ' difficulty only, all match types, no minimum match count',
    seasonWindow: SEASON_WINDOW,
    seasons: basisSeasons,
    difficulty: REQUIRED_DIFFICULTY,
    matches: files.length,
    characters: scores.length,
  },
  percentiles: TIER_PERCENTILES,
  cutoffs,
  distribution,
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });

// Only rewrite when the CALIBRATION actually changed.
//
// The point of committing this file is that a recalibration shows up as a
// reviewable diff. A 'generated' timestamp that moves on every build defeats
// that: it dirties the working tree on every build and buries the one diff
// that matters. So the timestamp is compared out, and carried over from the
// existing file when nothing else differs.
const existing = fs.existsSync(outPath)
  ? (() => { try { return JSON.parse(fs.readFileSync(outPath, 'utf8')); } catch { return null; } })()
  : null;
const unchanged = existing &&
  JSON.stringify({ ...existing, generated: null }) ===
  JSON.stringify({ ...bands, generated: null });

if (unchanged) {
  bands.generated = existing.generated;
  console.log('generate-performance-bands: calibration unchanged, file left alone');
} else {
  fs.writeFileSync(outPath, JSON.stringify(bands, null, 2) + '\n');
}

console.log('generate-performance-bands: seasons ' + bands.basis.seasons.join('+') +
  ', ' + REQUIRED_DIFFICULTY + ' only -> ' + files.length + ' matches, ' + scores.length + ' characters');
console.log('  cutoffs  ' + TIERS.map(t => t + (cutoffs[t] !== undefined ? ' >=' + cutoffs[t] : ' (rest)')).join('   '));
console.log('  spread   ' + TIERS.map(t => t + ':' + distribution[t]).join('  '));
