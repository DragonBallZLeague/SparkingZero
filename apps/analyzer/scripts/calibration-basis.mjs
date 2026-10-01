/**
 * The calibration basis: which matches the frozen league references are built from.
 *
 * Shared by generate-performance-bands.mjs (the Z/S/A/B/C tier cutoffs) and
 * generate-style-baseline.mjs (the Character page's league ranks and medians), so
 * a tier and a rank are always judged against the same league. The rationale for
 * the window - rolling, two seasons, Ultra only, no minimum match count - is in
 * generate-performance-bands.mjs.
 */
import fs from 'fs';
import path from 'path';

/** How many seasons the rolling window keeps. */
export const SEASON_WINDOW = 2;
/** Matches at any other difficulty are a different ruleset and never calibrate. */
export const REQUIRED_DIFFICULTY = 'Ultra';

/**
 * Loads the basis matches from the compact corpus.
 * Returns { files: [{ name, content }], seasons: ['0', '1'], difficulty }, or
 * exits the process with `label` in the message when the inputs are missing.
 */
export function loadCalibrationBasis(appDir, label) {
  const tagsPath = path.join(appDir, 'public', 'br-data-tags.json');
  const aggregatesDir = path.join(appDir, 'public', 'br-aggregates');
  if (!fs.existsSync(tagsPath) || !fs.existsSync(aggregatesDir)) {
    console.error(`${label}: run the tag and aggregate generators first.`);
    process.exit(1);
  }

  const tags = JSON.parse(fs.readFileSync(tagsPath, 'utf8'));

  // Newest SEASON_WINDOW seasons present in the data.
  const seasons = [...new Set(Object.values(tags)
    .map(v => v && v.seasonNumber)
    .filter(s => s !== undefined && s !== null && s !== '')
    .map(String))].sort((a, b) => Number(a) - Number(b));
  const window = new Set(seasons.slice(-SEASON_WINDOW));

  const wanted = new Set(Object.entries(tags)
    .filter(([, v]) => v && window.has(String(v.seasonNumber)) && v.difficulty === REQUIRED_DIFFICULTY)
    .map(([name]) => name));

  // Pull those matches out of the compact corpus.
  const files = [];
  for (const f of fs.readdirSync(aggregatesDir)) {
    if (f === 'index.json' || !f.endsWith('.json')) continue;
    const shard = JSON.parse(fs.readFileSync(path.join(aggregatesDir, f), 'utf8'));
    for (const rec of Object.values(shard.files || {})) {
      if (wanted.has(rec.name)) files.push({ name: rec.name, content: rec.content });
    }
  }

  if (!files.length) {
    console.error(`${label}: no matches matched the basis (seasons ${[...window].join(', ')}, difficulty ${REQUIRED_DIFFICULTY}). Refusing to write.`);
    process.exit(1);
  }

  return { files, seasons: [...window].sort((a, b) => Number(a) - Number(b)), difficulty: REQUIRED_DIFFICULTY };
}
