/**
 * The data scope: which matches every page is computed from.
 *
 * Scope is a tag filter over public/br-data-tags.json ({ path: tags }), kept in
 * the query string so a scoped view can be linked, refreshed and shared. The
 * URL format is the one TagFilterSelector used before the scope bar replaced
 * it - one param per tag, values comma-separated (`?seasonNumber=0&matchType=Season`)
 * - so links shared before the redesign still open on the same data.
 *
 * Semantics: OR within a dimension, AND between dimensions. An array-valued tag
 * (a match's two teams) matches when any of its values is chosen. A dimension
 * with nothing chosen does not filter.
 *
 * Pure, so build scripts and verifiers can import it (with
 * scripts/json-import-hook.mjs, for the team list).
 */
import { teamName } from '../utils/teams.js';

const TYPE_LABELS = { Season: 'Season matches', Test: 'Tests', Event: 'Events' };

/**
 * The dimensions, in bar order. `primary` ones always show as a chip; the
 * others are offered by "+ Filter" and show once set.
 */
export const SCOPE_DIMS = [
  { key: 'seasonNumber', name: 'Season', all: 'All seasons', primary: true, format: v => `Season ${v}` },
  { key: 'matchType', name: 'Match type', all: 'All match types', primary: true, format: v => TYPE_LABELS[v] || v, order: ['Season', 'Test', 'Event'] },
  { key: 'difficulty', name: 'Difficulty', all: 'Any difficulty', primary: true },
  // The URL keeps the team's tag ("Master and Student"); the chip shows its
  // name ("Master & Student"), from referencedata/teams.json.
  { key: 'team', name: 'Team', all: 'All teams', primary: true, format: teamName },
  { key: 'seasonPhase', name: 'Season phase', all: 'All phases', primary: false },
  { key: 'matchSize', name: 'Match size', all: 'All sizes', primary: false },
];
export const SCOPE_KEYS = SCOPE_DIMS.map(d => d.key);
export const dimByKey = key => SCOPE_DIMS.find(d => d.key === key);
export const formatValue = (key, v) => {
  const d = dimByKey(key);
  return d && d.format ? d.format(v) : String(v);
};

/**
 * Written when every dimension is cleared. Without it a URL with no scope
 * params is indistinguishable from a first visit, and a shared "everything"
 * link would reopen on the current-season default.
 */
export const ALL_MARKER = 'scope';

/** URLSearchParams -> { key: string[] } for the dimensions that are set. */
export function parseScope(params) {
  const scope = {};
  for (const key of SCOPE_KEYS) {
    const raw = params.get(key);
    if (!raw) continue;
    const vals = raw.split(',').map(v => v.trim()).filter(Boolean);
    if (vals.length) scope[key] = vals;
  }
  return scope;
}

/** Whether the URL says anything about scope (a set dimension or the all marker). */
export function hasScopeParams(params) {
  return params.get(ALL_MARKER) === 'all' || SCOPE_KEYS.some(k => params.get(k));
}

/**
 * A copy of `params` with its scope replaced by `scope`. Params owned by other
 * parts of the app (sort, view, build ...) are left alone.
 */
export function writeScope(params, scope) {
  const next = new URLSearchParams(params);
  let any = false;
  for (const key of SCOPE_KEYS) {
    const vals = scope[key] || [];
    if (vals.length) { next.set(key, vals.join(',')); any = true; } else next.delete(key);
  }
  if (any) next.delete(ALL_MARKER); else next.set(ALL_MARKER, 'all');
  return next;
}

/**
 * The scope a first visit gets: league (Season-type) matches of the newest
 * season that has any. The redesign plan's principle 2 - the newest season is
 * the most reliable data, since the game and the league's rules both change
 * between seasons. It is a visible tag filter, never a silent pre-selection.
 * No Season-type matches at all means no default, rather than an empty view.
 */
export function defaultScope(tagsIndex) {
  let latest = null;
  for (const tags of Object.values(tagsIndex || {})) {
    if (!tags || tags.matchType !== 'Season') continue;
    const n = parseInt(tags.seasonNumber, 10);
    if (!Number.isNaN(n) && (latest === null || n > latest)) latest = n;
  }
  return latest === null ? {} : { matchType: ['Season'], seasonNumber: [String(latest)] };
}

function matchesDim(tags, key, vals) {
  const v = tags[key];
  if (Array.isArray(v)) return v.some(x => vals.includes(String(x)));
  return v !== undefined && v !== null && vals.includes(String(v));
}

function matchesScope(tags, scope, skipKey = null) {
  for (const [key, vals] of Object.entries(scope)) {
    if (key === skipKey || !vals.length) continue;
    if (!tags || !matchesDim(tags, key, vals)) return false;
  }
  return true;
}

/** The match paths in scope. */
export function scopePaths(tagsIndex, scope) {
  return Object.entries(tagsIndex || {}).filter(([, tags]) => matchesScope(tags, scope)).map(([p]) => p);
}

/** Every value a dimension takes in the index: in the dimension's own order if it has one, else naturally sorted. */
export function dimValues(tagsIndex, key) {
  const set = new Set();
  for (const tags of Object.values(tagsIndex || {})) {
    const v = tags && tags[key];
    if (Array.isArray(v)) v.forEach(x => x && set.add(String(x)));
    else if (v !== undefined && v !== null && v !== '') set.add(String(v));
  }
  const order = (dimByKey(key) || {}).order || [];
  const rank = v => (order.includes(v) ? order.indexOf(v) : order.length);
  return [...set].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
}

/**
 * For each value of one dimension: how many matches it would give on its own,
 * with every OTHER dimension as it is now. That is the number worth showing
 * beside an option - "Tests 2,023" means picking Tests alone gives 2,023.
 */
export function valueCounts(tagsIndex, scope, key) {
  const counts = new Map();
  for (const tags of Object.values(tagsIndex || {})) {
    if (!tags || !matchesScope(tags, scope, key)) continue;
    const v = tags[key];
    for (const x of Array.isArray(v) ? v : [v]) {
      if (x === undefined || x === null || x === '') continue;
      counts.set(String(x), (counts.get(String(x)) || 0) + 1);
    }
  }
  return counts;
}

/** A one-line description of a scope, for page headers and share text. */
export function describeScope(scope) {
  const parts = [];
  for (const d of SCOPE_DIMS) {
    const vals = scope[d.key];
    if (vals && vals.length) parts.push(vals.map(v => formatValue(d.key, v)).join(' or '));
  }
  return parts.length ? parts.join(', ') : 'All match data';
}
