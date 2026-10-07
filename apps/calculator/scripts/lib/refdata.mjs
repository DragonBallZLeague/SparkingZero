/**
 * Loads the repo's shared reference data and the website's team pools for the
 * calculator data build. Read-only: nothing here writes to referencedata/.
 *
 *   characters     referencedata/characters.csv: canonical id, name and order
 *   transformations referencedata/transformations.json: forms and fusions by id
 *   capsules       referencedata/capsules.csv rows of Type "Capsule"
 *   rules          referencedata/capsule-rules.yaml: rulesets (cost cap, bans, group caps)
 *   teamNames      referencedata/teams.json: display name by website slug
 *   season         apps/website/public/content/teams/<season>.yaml: team pools (master_list)
 */
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { readCsv } from './csv.mjs';

export function repoRoot(fromDir) {
  return path.resolve(fromDir, '..', '..', '..');
}

export function loadRefdata(root, teamsSeason) {
  const ref = (f) => path.join(root, 'referencedata', f);

  const characters = readCsv(ref('characters.csv')).rows
    .map(r => ({ id: r.ID.trim(), name: r['CHARACTER NAME'].trim() }))
    .filter(r => r.id && r.name);

  const transformations = JSON.parse(fs.readFileSync(ref('transformations.json'), 'utf8'));
  delete transformations._comment;

  const capsules = readCsv(ref('capsules.csv')).rows
    .filter(r => r.Type.trim() === 'Capsule')
    .map(r => ({
      id: r.ID.trim(),
      name: r['Item Names'].trim(),
      cost: Number(r.Cost),
      exclusiveTo: r['Exclusive To'].trim() || null,
      description: r.Effect.replace(/\s*\r?\n\s*/g, ' ').trim(),
    }));

  const rules = yaml.load(fs.readFileSync(ref('capsule-rules.yaml'), 'utf8'));

  const teamsJson = JSON.parse(fs.readFileSync(ref('teams.json'), 'utf8'));
  const teamNames = new Map();
  for (const t of teamsJson) { teamNames.set(t.websiteSlug, t.name); teamNames.set(t.slug, t.name); }

  const seasonFile = path.join(root, 'apps', 'website', 'public', 'content', 'teams', `${teamsSeason}.yaml`);
  const seasonDoc = yaml.load(fs.readFileSync(seasonFile, 'utf8'));
  const season = (seasonDoc.teams || []).map(t => ({
    name: teamNames.get(t.slug) || String(t.name).trim(),
    slug: t.slug,
    masterList: (t.master_list || []).map(n => String(n)),
  }));

  return { characters, transformations, capsules, rules, season, seasonFile: path.relative(root, seasonFile).replace(/\\/g, '/') };
}

/** Lowercase alphanumerics only: joins "Goku (DAIMA) Super Saiyan 4" to "Goku (Daima) Super Saiyan 4". */
export function normName(s) {
  return String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}
