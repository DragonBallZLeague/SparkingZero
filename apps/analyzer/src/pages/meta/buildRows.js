import { characterBuilds } from '../character/overview/characterBuilds.js';
import { slugifyCharacterName } from '../../utils/characterSlug.js';

/**
 * The Meta page's Builds table: its rows, its URL params, and its filters. No
 * React, so a verifier can import it.
 *
 * A build is the leaderboard's definition, a character's exact capsules plus
 * AI strategy (utils/buildKey.js). Each one comes from characterBuilds(), the
 * code behind the Character page's build picker, so a build's score here is
 * the one its character page shows under `?build=`.
 */

/** Every build of every character in `aggregated` (the scope's raw rows). */
export function leagueBuilds(aggregated, charMap = {}) {
  const out = [];
  for (const r of aggregated || []) {
    for (const b of characterBuilds(r, charMap)) {
      const row = b.row || {};
      out.push({
        id: out.length,
        name: r.name,
        charSlug: slug(r.name),
        code: b.code,
        uses: b.count,
        score: Number.isFinite(b.score) ? b.score : null,
        provisional: b.provisional,
        dmg: row.avgDamage || 0,
        eff: row.efficiency || 0,
        win: row.winRate || 0,
        label: b.label,
        aiName: b.aiName,
        aiSlug: slug(b.aiName),
        capsules: b.capsules.map(c => ({ ...c, slug: slug(c.name) })),
      });
    }
  }
  return out;
}

/** A readable URL value for a name: `Attack Strategy: Ultimate Blasts` -> `attack-strategy-ultimate-blasts`. */
export const slug = slugifyCharacterName;

// ---- URL params ------------------------------------------------------------------
// tab=ai | capsules | (builds)
// uses=<floor>, char / ai / cap = comma-separated slugs, group=best | (all),
// sort=uses | dmg | eff | win | (score), dir=asc | (desc)

export const META_TABS = [
  { id: 'builds', label: 'Builds' },
  { id: 'ai', label: 'AI strategies' },
  { id: 'capsules', label: 'Capsules' },
];
export const readMetaTab = params => (META_TABS.some(t => t.id === params.get('tab')) ? params.get('tab') : 'builds');

/**
 * The "Used N+ times" floor. 5 is the default: below 5 uses a build's score is a
 * thin sample (the same cutoff as a provisional tier), and it is what keeps a
 * league-wide list short - 47 builds in the default scope instead of 368. It is
 * a visible chip, never a hidden rule.
 */
export const FLOORS = [1, 2, 3, 5, 10];
export const DEFAULT_FLOOR = 5;

/**
 * Sortable columns. Win % is last and never the default: it is a team
 * measure. (The Character page's Builds tab also sorts by `transform`, in
 * its own local sort: Meta's builds have no such figure.)
 */
export const BUILD_SORTS = ['uses', 'dmg', 'eff', 'score', 'win'];

const list = (params, key) => [...new Set((params.get(key) || '').split(',').map(s => s.trim()).filter(Boolean))];

/** `defaultFloor` is 1 in the Sandbox, where a handful of uploads rarely reuse a build five times. */
export function readBuildFilters(params, defaultFloor = DEFAULT_FLOOR) {
  const n = parseInt(params.get('uses'), 10);
  const sort = BUILD_SORTS.includes(params.get('sort')) ? params.get('sort') : 'score';
  return {
    floor: FLOORS.includes(n) ? n : defaultFloor,
    chars: list(params, 'char'),
    ais: list(params, 'ai'),
    caps: list(params, 'cap'),
    group: params.get('group') === 'best' ? 'best' : 'all',
    sort,
    dir: params.get('dir') === 'asc' ? 'asc' : 'desc',
  };
}

/**
 * The rows the table shows. OR within the character and AI filters; a build
 * must contain EVERY capsule picked, since that is what someone planning a
 * build means. "Best per character" keeps each character's top-scoring build.
 */
export function filterBuilds(builds, f) {
  let rows = builds.filter(b => b.uses >= f.floor);
  if (f.chars.length) rows = rows.filter(b => f.chars.includes(b.charSlug));
  if (f.ais.length) rows = rows.filter(b => f.ais.includes(b.aiSlug));
  if (f.caps.length) rows = rows.filter(b => f.caps.every(c => b.capsules.some(x => x.slug === c)));
  if (f.group === 'best') {
    const best = new Map();
    for (const b of rows) {
      const cur = best.get(b.name);
      if (!cur || (b.score ?? -1) > (cur.score ?? -1)) best.set(b.name, b);
    }
    rows = [...best.values()];
  }
  const sign = f.dir === 'asc' ? 1 : -1;
  const k = f.sort;
  return rows.sort((a, b) => sign * ((a[k] ?? -1) - (b[k] ?? -1)) || b.uses - a.uses || (b.score ?? 0) - (a.score ?? 0));
}

/**
 * A build's capsules grouped by type, biggest share of the cost first, so the
 * list reads in the same order as its cost bar.
 */
export function capsuleBreakdown(capsules) {
  const byType = {};
  for (const c of capsules) byType[c.type] = (byType[c.type] || 0) + c.cost;
  const order = Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([t]) => t);
  const caps = [...capsules].sort((a, b) =>
    order.indexOf(a.type) - order.indexOf(b.type) || b.cost - a.cost || a.name.localeCompare(b.name));
  const cost = Object.values(byType).reduce((a, x) => a + x, 0);
  return { caps, byType, order, cost };
}
