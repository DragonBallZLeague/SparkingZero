/**
 * Loads the calculator's data (schema 2, see apps/calculator/data/README.md).
 *
 * meta.json is fetched with no-cache and carries a content hash (dataVersion); every
 * other file is fetched with ?v=<dataVersion>, so a data update reaches browsers on
 * the next visit instead of whenever their HTTP cache expires.
 *
 * Returns the raw schema-2 data, the old shapes the components read (toLegacy), and
 * the alias -> id map the share-link decoder uses.
 */
import { toLegacy } from './adapter.js';
import { APPLIED_KEYS } from '../utils/engine.js';

export async function loadData(base = import.meta.env.BASE_URL) {
  const url = (f) => `${base}data/${f}`;
  const json = (r) => {
    if (!r.ok) throw new Error(`${r.url}: HTTP ${r.status}`);
    return r.json();
  };
  const meta = await fetch(url('meta.json'), { cache: 'no-cache' }).then(json);
  const get = (f) => fetch(`${url(f)}?v=${meta.dataVersion}`).then(json);
  const [characters, skills, blasts, capsules, teams] = await Promise.all(
    ['characters.json', 'skills.json', 'blasts.json', 'capsules.json', 'teams.json'].map(get),
  );
  const data = { characters, skills, blasts, capsules, teams, meta };

  // Every capsule (with bannedIn); the app filters by the selected ruleset.
  const legacy = toLegacy(data, { ultimateVariants: true, appliedKeys: APPLIED_KEYS });

  const aliases = {};
  for (const c of characters) for (const a of c.aliases || []) aliases[a] = c.id;

  return { data, legacy, aliases };
}
