import { filterAggregatedData } from '../../utils/aggregation/filterAggregated.js';
import { slugifyCharacterName } from '../../utils/characterSlug.js';
import { overviewFromMatches } from '../../utils/characterOverview.js';
import { buildTypeColor } from '../../utils/overviewPalette.js';
import { dataQuality, MIN_OTHER, weighted } from './aiShift.js';
import { USES_STAT } from './aiRows.js';

/**
 * Meta's Capsules tab: a row per capsule in scope, its URL params and its
 * chips' data. No React, so a verifier can import it.
 *
 * WHAT A ROW SAYS (the league's review, 2026-09-30). A capsule is one of about
 * seven in a build, so its pooled figures, and even the same character with
 * and without it, mostly describe the build around it; how builds use it is
 * what the data knows for sure (pick rates agree between two random halves of
 * Season 0 at r = 0.94). So a row leads with FIT: the share of each build
 * type's builds that run it (the table's columns). The pooled figures (the
 * leaderboard's own filter over every match it was equipped in, as if one
 * character's) stay for the detail's tiles, and its change is measured with
 * the build type held: the same character, the same build type, builds
 * without it (capsuleChange).
 *
 * A match counts toward every capsule it equipped. It replaced
 * utils/capsuleSynergyCalculator.js and its composite score, which no other
 * page shared; the score column went on 2026-09-30 (casual readers would take
 * a capsule's pooled score, mostly its builds', for how good it is).
 */

export const slug = slugifyCharacterName;

/** The capsule types, in the cost bar's colour order. `ctype` in the URL is their slug. */
export const CAPSULE_TYPES = ['Melee', 'Blast', 'Ki Blast', 'Skill', 'Defense', 'Ki Efficiency', 'Utility'];
/**
 * The build types a build is filed under: its buildComposition's primary, or
 * Hybrid for a Balanced Hybrid. The table's columns.
 */
export const BUILD_TYPES = ['Melee', 'Blast', 'Ki Blast', 'Defense', 'Skill', 'Ki Efficiency', 'Hybrid'];
/** "Goes with": paired at least this often, and in at least this share of its builds. */
export const PAIR_MIN = 5;
export const PAIR_SHARE = 0.1;

const typeOf = c => (c.capsule && c.capsule.buildType) || 'Unknown';
const costOf = c => (c.capsule && c.capsule.cost) || 0;
const buildTypeOf = m => (m.buildComposition && m.buildComposition.primary) || 'No Build';
const bump = (map, key, n = 1) => map.set(key, (map.get(key) || 0) + n);
const has = (m, id) => (m.equippedCapsules || []).some(c => c.id === id);

/** A capsule family and tier: "Blast Attack Boost 3" is tier 3 of "Blast Attack Boost". */
export function familyOf(name) {
  const m = String(name || '').match(/^(.*\S) (\d)$/);
  return m ? { base: m[1], tier: Number(m[2]) } : null;
}

/** The scope's builds (matches with capsules) after the Character and AI strategy chips. */
function* builds(aggregated, f) {
  for (const c of aggregated || []) {
    if (f.chars.length && !f.chars.includes(slug(c.name))) continue;
    for (const m of c.matches || []) {
      if (f.ais.length && !f.ais.includes(slug(m.aiStrategy || 'Default'))) continue;
      if ((m.equippedCapsules || []).length) yield [c, m];
    }
  }
}

/**
 * Every capsule in `aggregated` (the scope's character rows), after the chips:
 * `f.chars` keeps those characters' matches, `f.ais` the matches run with
 * those AI strategies (slugs, the Builds tab's `ai`), `f.types` those capsule
 * types, `f.costs` those costs (strings, as in the URL). The last two only
 * pick rows: every share is of the scope's builds whatever they keep.
 *
 * Each row is filterAggregatedData's for the pooled matches plus
 *   id (slug), capsuleId, name, type, cost, effect, matches
 *   characters, byCharacter   who equipped it, most first
 *   fit        { [build type]: { n, of, share } }: of that type's `of` builds
 *              in scope, `n` run it; null where the type has none
 *   ais        [{ name, n, share, usual }]: its uses by AI strategy, against
 *              the share of all builds on that AI (`usual`), most first
 *   positions  [{ pos, n, share, usual }] for Starter, Middle, Anchor
 *   pairs      [{ id, name, type, n, share, usual, lift }]: the capsules
 *              equipped with it, most first: in `share` of its builds, against
 *              `usual`, their share of all builds; `lift` = share / usual, how
 *              many times as often as chance
 *   goesWith   pairs with PAIR_MIN+ together and PAIR_SHARE+ of its builds,
 *              by lift: the combos, where raw counts list popular capsules
 *   tiers      its family's tiers in scope, by tier, when 2+ are used
 *   comparable uses whose character has MIN_OTHER+ builds of the same type
 *              without it (what capsuleChange can compare)
 *   quality    dataQuality(uses, characters), as the AI strategies rows
 * Sorted by uses.
 */
export function capsuleRows(aggregated, f = { chars: [], types: [], ais: [], costs: [] }, charMap = {}) {
  const types = f.types || [];
  const costs = f.costs || [];
  const scope = { n: 0, byType: new Map(), byAi: new Map(), byPos: new Map(), byCharType: new Map() };
  const pools = new Map();
  for (const [c, m] of builds(aggregated, { chars: f.chars || [], ais: f.ais || [] })) {
    const caps = m.equippedCapsules;
    const bt = buildTypeOf(m);
    const ai = m.aiStrategy || 'Default';
    const pos = Number(m.position) || 0;
    const ct = `${c.name}|${bt}`;
    scope.n++;
    bump(scope.byType, bt);
    bump(scope.byAi, ai);
    bump(scope.byPos, pos);
    bump(scope.byCharType, ct);
    for (const cap of caps) {
      if (!pools.has(cap.id)) {
        pools.set(cap.id, {
          name: cap.name, type: typeOf(cap), cost: costOf(cap), effect: (cap.capsule && cap.capsule.effect) || '',
          matches: [], by: new Map(), byType: new Map(), byAi: new Map(), byPos: new Map(), byCharType: new Map(), pairs: new Map(),
        });
      }
      const p = pools.get(cap.id);
      p.matches.push(m);
      bump(p.by, c.name);
      bump(p.byType, bt);
      bump(p.byAi, ai);
      bump(p.byPos, pos);
      bump(p.byCharType, ct);
      for (const other of caps) {
        if (other.id === cap.id) continue;
        const e = p.pairs.get(other.id) || { name: other.name, type: typeOf(other), n: 0 };
        e.n++;
        p.pairs.set(other.id, e);
      }
    }
  }

  // Families, over every capsule in scope (a tier the chips leave out still counts).
  const families = new Map();
  for (const [id, p] of pools) {
    const fam = familyOf(p.name);
    if (!fam) continue;
    if (!families.has(fam.base)) families.set(fam.base, []);
    families.get(fam.base).push({ capsuleId: id, id: slug(p.name), name: p.name, tier: fam.tier, cost: p.cost, effect: p.effect, uses: p.matches.length });
  }
  for (const list of families.values()) list.sort((a, b) => a.tier - b.tier);

  const onSides = [1, 2, 3].reduce((n, pos) => n + (scope.byPos.get(pos) || 0), 0);
  const rows = [];
  for (const [capsuleId, p] of pools) {
    if (types.length && !types.includes(slug(p.type))) continue;
    if (costs.length && !costs.includes(String(p.cost))) continue;
    // No match ceiling: the filter's default (999) suits one character.
    const row = filterAggregatedData([{ name: p.name, matches: p.matches }], { charMap, maxMatches: Infinity })[0];
    if (!row) continue;
    const uses = p.matches.length;
    const placed = [1, 2, 3].reduce((n, pos) => n + (p.byPos.get(pos) || 0), 0);
    const pairs = [...p.pairs].map(([id, e]) => ({
      id, ...e, share: e.n / uses, usual: pools.get(id).matches.length / scope.n,
      lift: (e.n * scope.n) / (uses * pools.get(id).matches.length),
    })).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
    let comparable = 0;
    for (const [ct, n] of p.byCharType) if ((scope.byCharType.get(ct) || 0) - n >= MIN_OTHER) comparable += n;
    const fam = familyOf(p.name);
    const tiers = fam && families.get(fam.base).length >= 2 ? families.get(fam.base) : null;
    rows.push({
      ...row,
      id: slug(p.name),
      capsuleId,
      name: p.name,
      type: p.type,
      cost: p.cost,
      effect: p.effect,
      characters: p.by.size,
      byCharacter: [...p.by].map(([n, u]) => ({ name: n, uses: u })).sort((a, b) => b.uses - a.uses || a.name.localeCompare(b.name)),
      fit: Object.fromEntries(BUILD_TYPES.map(t => {
        const of = scope.byType.get(t) || 0;
        return [t, of ? { n: p.byType.get(t) || 0, of, share: (p.byType.get(t) || 0) / of } : null];
      })),
      ais: [...p.byAi].map(([name, n]) => ({ name, n, share: n / uses, usual: scope.byAi.get(name) / scope.n }))
        .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name)),
      positions: [1, 2, 3].map(pos => ({
        pos,
        n: p.byPos.get(pos) || 0,
        share: placed ? (p.byPos.get(pos) || 0) / placed : 0,
        usual: onSides ? (scope.byPos.get(pos) || 0) / onSides : 0,
      })),
      pairs,
      goesWith: pairs.filter(x => x.n >= PAIR_MIN && x.share >= PAIR_SHARE).sort((a, b) => b.lift - a.lift || b.n - a.n),
      tiers,
      comparable,
      quality: dataQuality(uses, p.by.size),
      matches: p.matches,
    });
  }
  return rows.sort((a, b) => b.matches.length - a.matches.length || a.name.localeCompare(b.name));
}

/**
 * What a capsule changes, for its detail: each character's builds with it
 * against their builds of the SAME build type without it (MIN_OTHER+ of
 * those), weighted by uses, so the build around it is held as far as the data
 * allows. Measured on the whole corpus, the halves of a random split agree at
 * about r = 0.6; within one season few capsules have enough, hence `quality`
 * (dataQuality of the compared uses and characters), which the detail needs
 * above Low before it shows a change.
 *   { compared, characters, quality, dmg, taken, eff }, each figure
 *   aiShift.js weighted()'s { with, usual, shift }
 */
export function capsuleChange(aggregated, capsuleId, f = { chars: [], ais: [] }) {
  const byCharType = new Map();
  for (const [c, m] of builds(aggregated, { chars: f.chars || [], ais: f.ais || [] })) {
    const key = `${c.name}|${buildTypeOf(m)}`;
    if (!byCharType.has(key)) byCharType.set(key, { name: c.name, with: [], without: [] });
    byCharType.get(key)[has(m, capsuleId) ? 'with' : 'without'].push(m);
  }
  const pairs = [...byCharType.values()].filter(p => p.with.length && p.without.length >= MIN_OTHER);
  const compared = pairs.reduce((n, p) => n + p.with.length, 0);
  const characters = new Set(pairs.map(p => p.name)).size;
  const ov = new Map();
  const overview = ms => { if (!ov.has(ms)) ov.set(ms, overviewFromMatches(ms)); return ov.get(ms); };
  return {
    compared,
    characters,
    quality: dataQuality(compared, characters),
    dmg: weighted(pairs, ms => overview(ms).avgDealt),
    taken: weighted(pairs, ms => overview(ms).avgTaken),
    eff: weighted(pairs, ms => overview(ms).efficiency),
  };
}

/** A search over the rows: the capsule's name, type and effect. */
export function capsuleMatchesQuery(r, q) {
  if (!q) return true;
  return [r.name, r.type, r.effect].some(v => String(v || '').toLowerCase().includes(q));
}

// ---- The table's columns ------------------------------------------------------------
// Uses, then a column per build type: the share of that type's builds that
// run the capsule, sortable to find what a build type runs (the league,
// 2026-09-30). Bars wear the build type's colour and no rank colour: a
// capsule a type seldom runs is not a bad one.

const SHORT = { 'Ki Blast': 'Ki Bl', Defense: 'Def', 'Ki Efficiency': 'Ki Eff' };
/** A build type's colour, as its build pill draws it (Hybrid a light slate). */
export const fitColor = t => buildTypeColor(t);
/** A share as a whole percent; under 1% (but some) reads "<1%". */
export const share = v => (v === 0 ? '0%' : v < 0.01 ? '<1%' : `${Math.round(v * 100)}%`);

export const FIT_STATS = BUILD_TYPES.map(t => ({
  key: `fit_${slug(t)}`, label: t, short: SHORT[t] || t, dir: 0, tint: fitColor(t), fmt: share,
  title: `Share of ${t} builds that run it`,
  get: r => (r.fit && r.fit[t] ? r.fit[t].share : null),
}));
/** The table's stat columns: Uses, then the build types. */
export const CAPSULE_COLUMNS = [USES_STAT, ...FIT_STATS];
export const capsuleStatByKey = key => CAPSULE_COLUMNS.find(c => c.key === key) || null;
/** A phone's two columns before anyone picks. */
export const CAPSULE_PHONE_DEFAULTS = ['fit_blast', 'fit_melee'];

// ---- URL params (on /meta?tab=capsules) --------------------------------------------
// ctype=<type slugs>, cost=<costs>, and the Builds tab's char= and ai= (slugs); the sort
// is read by the AI strategies tab's readers with these columns (readAiSort, sortAiRows).

const list = (params, key) => [...new Set((params.get(key) || '').split(',').map(s => s.trim()).filter(Boolean))];

export function readCapsuleFilters(params) {
  const known = CAPSULE_TYPES.map(slug);
  const types = list(params, 'ctype').filter(t => known.includes(t));
  const costs = list(params, 'cost').filter(c => /^\d+$/.test(c));
  return { chars: list(params, 'char'), ais: list(params, 'ai'), types: types.length === known.length ? [] : types, costs };
}
