/**
 * Checks referencedata/teams.json, the league's team list.
 *
 * FAILS the build on a list that would break links: a missing field, a tag or
 * slug used twice, or a slug that is not plain URL text (a team's slug is its
 * /analyzer/teams/<slug> path, and these links get pasted into Discord).
 *
 * WARNS, without failing, about what only looks worse: a team tag in the match
 * data with no entry (the analyzer then shows the raw tag), and a team without
 * a logo in public/team-logos/ (it shows its initial). The fix for the second
 * is `npm run build-team-logos`.
 *
 * Usage: node scripts/verify-teams.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(__dirname, '..');
const teams = JSON.parse(fs.readFileSync(path.resolve(APP, '..', '..', 'referencedata', 'teams.json'), 'utf8'));

const errors = [];
const seen = { tag: new Map(), slug: new Map() };
for (const [i, t] of teams.entries()) {
  for (const f of ['tag', 'name', 'slug', 'websiteSlug']) if (!t[f]) errors.push(`entry ${i}: no ${f}`);
  if (t.slug && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(t.slug)) errors.push(`${t.tag}: slug "${t.slug}" is not plain lowercase-and-hyphens`);
  for (const f of ['tag', 'slug']) {
    if (!t[f]) continue;
    if (seen[f].has(t[f])) errors.push(`${f} "${t[f]}" is used by both ${seen[f].get(t[f])} and ${t.tag}`);
    seen[f].set(t[f], t.tag);
  }
}
if (errors.length) {
  console.error('verify-teams: referencedata/teams.json has problems:');
  for (const e of errors) console.error('  ' + e);
  process.exit(1);
}

const tagsFile = path.join(APP, 'public', 'br-data-tags.json');
const inData = new Set();
if (fs.existsSync(tagsFile)) {
  for (const tags of Object.values(JSON.parse(fs.readFileSync(tagsFile, 'utf8')))) {
    for (const t of [].concat(tags && tags.team || [])) if (t) inData.add(t);
  }
}
const unknown = [...inData].filter(t => !seen.tag.has(t)).sort();
if (unknown.length) {
  console.warn(`verify-teams: ${unknown.length} team tag(s) in the match data have no entry in teams.json (shown as the raw tag):`);
  for (const t of unknown) console.warn('  ' + t);
}
const noLogo = teams.filter(t => !fs.existsSync(path.join(APP, 'public', 'team-logos', t.slug + '.webp')));
if (noLogo.length) {
  console.warn(`verify-teams: ${noLogo.length} team(s) have no logo in public/team-logos/ (they show an initial): ${noLogo.map(t => t.name).join(', ')}`);
  console.warn('  Run `npm run build-team-logos` in apps/analyzer.');
}
if (!unknown.length && !noLogo.length) console.log(`verify-teams: all ${teams.length} teams listed, with logos; every team in the match data is known`);
