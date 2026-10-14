/**
 * The published data (public/data/*.json, schema 2: data/README.md), loaded once before the app renders: a
 * top-level await, so app/model.js builds its indexes at module level as the demo did.
 *
 * meta.json is fetched with no-cache and carries a content hash (dataVersion); every other file is fetched with
 * ?v=<dataVersion>, so a data update reaches browsers on the next visit instead of whenever their HTTP cache expires.
 * If loading fails, main.jsx shows the error instead of the app.
 */
const base = import.meta.env.BASE_URL;
const json = (r) => {
  if (!r.ok) throw new Error(`${r.url}: HTTP ${r.status}`);
  return r.json();
};
const meta = await fetch(`${base}data/meta.json`, { cache: 'no-cache' }).then(json);
const get = (f) => fetch(`${base}${f}?v=${meta.dataVersion}`).then(json);
const [characters, skillsById, blastsById, capsules, teams, artSizes] = await Promise.all([
  'data/characters.json', 'data/skills.json', 'data/blasts.json', 'data/capsules.json', 'data/teams.json', 'char_art/sizes.json',
].map(get));

export { characters, skillsById, blastsById, capsules, teams, meta, artSizes };
