/**
 * Builds public/br-recent-uploads.json: the newest test and event matches, for
 * the Tests and Events switches in Home's "Latest results", so a participant
 * finds the test they just uploaded (and anyone the last event) without the
 * page loading every team's tests (each team's shard is ~1 MB; this file is a
 * few KB). Neither is in the default scope, which is season matches.
 *
 * WHEN A MATCH WAS UPLOADED comes from git. The files carry no date, and their
 * names only order a team's own tests, so "newest" is when each file entered
 * the repo: the author date of the newest commit that added it, which for a
 * submission is its upload. That needs history, so the deploy workflow checks
 * out the full history (blobless, so it stays small). Without it (a shallow
 * clone, no git) the script falls back to the names' order
 * (utils/matchOrder.js), says so, and writes `dated: false`, so Home shows no
 * dates rather than wrong ones. A match not yet committed counts as newest.
 *
 * Each entry is the Matches list's summary of the match (matchSummary: teams,
 * result, lineups, map), not the match: a few hundred bytes each.
 *
 * Run order: after generate-br-data-tags.js (it reads the tags index). Writes
 * only on a change, like generate-br-aggregates.js, so git stays quiet.
 */
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { matchSummary } from '../src/utils/matchRecord.js';
import { parseCharacterCSV } from '../src/utils/statCalculations.js';
import { compareMatchTime } from '../src/utils/matchOrder.js';

/** How many of each kind the file holds: Home shows 6, and "Show more" the rest. */
const COUNT = 30;
/** The lists, by the match type (tags) each holds. */
const KINDS = { tests: 'Test', events: 'Event' };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(__dirname, '..');
const brDataDir = path.join(appDir, 'BR_Data');
const refData = path.resolve(appDir, '..', '..', 'referencedata');
const outFile = path.join(appDir, 'public', 'br-recent-uploads.json');

const tagsIndex = JSON.parse(fs.readFileSync(path.join(appDir, 'public', 'br-data-tags.json'), 'utf8'));

/** { 'tests/team/x.json': ISO date } (lower case) from git, or { dates: null, why } without history. */
function uploadDates() {
  const git = args => execFileSync('git', args, { cwd: appDir, encoding: 'utf8', maxBuffer: 256 << 20, stdio: ['ignore', 'pipe', 'ignore'] });
  let out;
  try {
    if (git(['rev-parse', '--is-shallow-repository']).trim() === 'true') return { dates: null, why: 'the clone is shallow' };
    // --no-renames: a file moved into place counts from its move.
    out = git(['-c', 'core.quotepath=off', 'log', '--no-renames', '--diff-filter=A', '--format=@%aI', '--name-only', '--', 'BR_Data']);
  } catch (e) {
    return { dates: null, why: `git is unavailable (${String(e.message).split('\n')[0]})` };
  }
  const dates = {};
  let when = null;
  for (const line of out.split('\n')) {
    if (line.startsWith('@')) { when = new Date(line.slice(1)).toISOString(); continue; }
    const i = line.indexOf('BR_Data/');
    if (i < 0 || !line.endsWith('.json')) continue;
    // Keyed in lower case: on a case-insensitive disk (Windows) a file can be
    // listed as "Cold Kingdom" while git tracks it as "Cold kingdom".
    const p = line.slice(i + 'BR_Data/'.length).toLowerCase();
    if (!(p in dates)) dates[p] = when; // newest first: the latest add wins
  }
  return { dates };
}

const { dates, why } = uploadDates();
if (!dates) console.warn(`generate-recent-uploads: no upload dates, since ${why}; ordering by name instead.`);
const now = new Date().toISOString();

const charMap = parseCharacterCSV(fs.readFileSync(path.join(refData, 'characters.csv'), 'utf8'));
const mapsMap = {};
for (const line of fs.readFileSync(path.join(refData, 'maps.csv'), 'utf8').trim().split('\n').slice(1)) {
  const [name, id] = line.split(',').map(s => s.trim());
  if (id && name) mapsMap[id] = name;
}

/** The newest COUNT matches of one match type, as { path, uploaded, tags, summary }. */
function newest(matchType) {
  const paths = Object.keys(tagsIndex).filter(p => tagsIndex[p] && tagsIndex[p].matchType === matchType);
  const order = dates
    // Newest upload first; one upload's matches (the same commit) in play order.
    ? paths.map(p => ({ p, at: dates[p.toLowerCase()] || now }))
      .sort((a, b) => b.at.localeCompare(a.at) || compareMatchTime(a.p, b.p))
    : paths.map(p => ({ p, at: null })).sort((a, b) => compareMatchTime(b.p, a.p));
  const picked = [];
  for (const { p, at } of order) {
    if (picked.length >= COUNT) break;
    let content;
    try {
      content = JSON.parse(fs.readFileSync(path.join(brDataDir, p), 'utf8').replace(/^﻿/, ''));
    } catch {
      continue; // unreadable: the aggregates step reports these
    }
    const summary = matchSummary(content, { charMap, mapsMap });
    if (summary) picked.push({ path: p, uploaded: at, tags: tagsIndex[p], summary });
  }
  return { picked, of: paths.length };
}

const lists = Object.fromEntries(Object.entries(KINDS).map(([k, type]) => [k, newest(type)]));
const body = JSON.stringify({ version: 1, dated: !!dates, ...Object.fromEntries(Object.entries(lists).map(([k, l]) => [k, l.picked])) });
const before = fs.existsSync(outFile) ? fs.readFileSync(outFile, 'utf8') : null;
if (before !== body) fs.writeFileSync(outFile, body);
console.log(`generate-recent-uploads: ${Object.entries(lists).map(([k, l]) => `${l.picked.length} newest of ${l.of} ${k}`).join(', ')}` +
  `${dates ? ', by upload date' : ''}${before === body ? ' (unchanged)' : ''}.`);
