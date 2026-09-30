import { filterAggregatedData } from '../../utils/aggregation/filterAggregated.js';
import { slugifyCharacterName } from '../../utils/characterSlug.js';

/**
 * Meta's Capsules tab: a row per capsule in scope, its URL params and its
 * chips' data. No React, so a verifier can import it.
 *
 * As the AI strategies tab does (aiRows.js), a capsule's row is the
 * leaderboard's own filter over every match a character equipped it in, as if
 * they were one character's, so it reads with the Characters table's columns.
 * A match counts toward every capsule it equipped. It replaced
 * utils/capsuleSynergyCalculator.js and its composite score, which no other
 * page shared.
 */

export const slug = slugifyCharacterName;

/** The capsule types, in the cost bar's colour order. `ctype` in the URL is their slug. */
export const CAPSULE_TYPES = ['Melee', 'Blast', 'Ki Blast', 'Skill', 'Defense', 'Ki Efficiency', 'Utility'];
const typeOf = c => (c.capsule && c.capsule.buildType) || 'Unknown';
const costOf = c => (c.capsule && c.capsule.cost) || 0;

/**
 * Every capsule in `aggregated` (the scope's character rows), after the chips:
 * `f.chars` keeps those characters' matches, `f.ais` the matches run with
 * those AI strategies (slugs, the Builds tab's `ai`), `f.types` those capsule
 * types, `f.costs` those costs (strings, as in the URL). Each row is filterAggregatedData's for the pooled matches plus
 * { id (slug), name, type, cost, effect, characters, byCharacter, pairs (the
 * capsules most often equipped with it), matches }. Sorted by uses.
 */
export function capsuleRows(aggregated, f = { chars: [], types: [], ais: [], costs: [] }, charMap = {}) {
  const costs = f.costs || [];
  const pools = new Map();
  for (const c of aggregated || []) {
    if (f.chars.length && !f.chars.includes(slug(c.name))) continue;
    for (const m of c.matches || []) {
      if (f.ais.length && !f.ais.includes(slug(m.aiStrategy || 'Default'))) continue;
      const caps = m.equippedCapsules || [];
      for (const cap of caps) {
        const type = typeOf(cap);
        if (f.types.length && !f.types.includes(slug(type))) continue;
        if (costs.length && !costs.includes(String(costOf(cap)))) continue;
        if (!pools.has(cap.id)) {
          pools.set(cap.id, {
            name: cap.name, type, cost: costOf(cap), effect: (cap.capsule && cap.capsule.effect) || '',
            matches: [], by: new Map(), pairs: new Map(),
          });
        }
        const p = pools.get(cap.id);
        p.matches.push(m);
        p.by.set(c.name, (p.by.get(c.name) || 0) + 1);
        for (const other of caps) {
          if (other.id === cap.id) continue;
          const e = p.pairs.get(other.id) || { name: other.name, type: typeOf(other), n: 0 };
          e.n++;
          p.pairs.set(other.id, e);
        }
      }
    }
  }
  const rows = [];
  for (const [, p] of pools) {
    // No match ceiling: the filter's default (999) suits one character.
    const row = filterAggregatedData([{ name: p.name, matches: p.matches }], { charMap, maxMatches: Infinity })[0];
    if (!row) continue;
    rows.push({
      ...row,
      id: slug(p.name),
      name: p.name,
      type: p.type,
      cost: p.cost,
      effect: p.effect,
      characters: p.by.size,
      byCharacter: [...p.by].map(([n, uses]) => ({ name: n, uses })).sort((a, b) => b.uses - a.uses || a.name.localeCompare(b.name)),
      pairs: [...p.pairs.values()].sort((a, b) => b.n - a.n || a.name.localeCompare(b.name)),
      matches: p.matches,
    });
  }
  return rows.sort((a, b) => b.matches.length - a.matches.length || a.name.localeCompare(b.name));
}

/** A search over the rows: the capsule's name, type and effect. */
export function capsuleMatchesQuery(r, q) {
  if (!q) return true;
  return [r.name, r.type, r.effect].some(v => String(v || '').toLowerCase().includes(q));
}

// ---- URL params (on /meta?tab=capsules) --------------------------------------------
// ctype=<type slugs>, cost=<costs>, and the Builds tab's char= and ai= (slugs); the sort is the AI
// strategies tab's (readAiSort, sortAiRows): the same columns.

const list = (params, key) => [...new Set((params.get(key) || '').split(',').map(s => s.trim()).filter(Boolean))];

export function readCapsuleFilters(params) {
  const known = CAPSULE_TYPES.map(slug);
  const types = list(params, 'ctype').filter(t => known.includes(t));
  const costs = list(params, 'cost').filter(c => /^\d+$/.test(c));
  return { chars: list(params, 'char'), ais: list(params, 'ai'), types: types.length === known.length ? [] : types, costs };
}
