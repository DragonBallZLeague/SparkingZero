import { filterAggregatedData } from '../../utils/aggregation/filterAggregated.js';
import { slugifyCharacterName } from '../../utils/characterSlug.js';
import { statByKey } from '../characters/characterRows.js';
import { styleByKey } from '../characters/styleRows.js';
import { STYLES } from '../../utils/characterOverview.js';
import { dataQuality, MIN_OTHER, strategyPairs, styleRanks, transformShift } from './aiShift.js';
import { actionByKey, actionRates, fmtPair, fmtRate, fmtRateChange } from './aiActions.js';
import { UNKNOWN_AI } from '../../utils/transformation.js';

/**
 * Meta's AI strategies tab: a row per AI strategy in scope, its URL params and
 * its chips' data. No React, so a verifier can import it.
 *
 * A strategy's row is the leaderboard's own filter (filterAggregatedData) run
 * over every match any character played with it, as if they were one
 * character's: so its damage, efficiency, survival, score and the rest are on
 * the Characters table's scales and read with its columns (CHAR_STATS). It
 * replaced utils/aiStrategyCalculator.js, a separate 1,100-line calculator
 * with a score formula of its own (damage ratio, win rate and survival) that
 * no other page shared.
 *
 * What it changes, the detail's subject, is meta/aiShift.js: the same
 * characters with it against their other strategies.
 */

/** The strategy family, from its name ("Attack Strategy: Barrage" is Attack). */
export function aiType(name) {
  const n = String(name || '').toLowerCase();
  if (n.includes('attack strategy')) return 'Attack';
  if (n.includes('defense strategy')) return 'Defense';
  if (n.includes('balanced strategy')) return 'Balanced';
  return 'Other';
}
export const AI_TYPES = ['Attack', 'Defense', 'Balanced', 'Other'];

export const slug = slugifyCharacterName;

/**
 * Every strategy in `aggregated` (the scope's raw character rows), after the
 * chips: `f.chars` keeps only those characters' matches, `f.types` those
 * families. Each row is filterAggregatedData's row for the pooled matches plus
 * { id (slug), name, type, characters, byCharacter: [{ name, uses }] most used
 * first, matches, comparable (uses whose character also has MIN_OTHER matches
 * on other strategies, what meta/aiShift.js can compare), quality (its
 * dataQuality()), styles (aiShift.js styleRanks(): each style's places
 * gained, the table's style columns), transform (aiShift.js transformShift(),
 * the Transform column; null without `ctx` = { idFor, lineups }, or when none
 * of its characters can transform) }. Sorted by uses.
 *
 * "Default" is not a strategy: the files whose AI was lost (UNKNOWN_AI) have
 * no row, and count on neither side of a comparison.
 */
export function aiStrategyRows(aggregated, f = { chars: [], types: [] }, charMap = {}, ctx = null) {
  const pools = new Map();
  // Each character's matches on any strategy, whatever the Type chip keeps.
  const totals = new Map();
  for (const c of aggregated || []) {
    if (f.chars.length && !f.chars.includes(slug(c.name))) continue;
    totals.set(c.name, (c.matches || []).filter(m => (m.aiStrategy || UNKNOWN_AI) !== UNKNOWN_AI).length);
    for (const m of c.matches || []) {
      const name = m.aiStrategy || UNKNOWN_AI;
      if (name === UNKNOWN_AI) continue;
      if (f.types.length && !f.types.includes(aiType(name))) continue;
      if (!pools.has(name)) pools.set(name, { matches: [], by: new Map() });
      const p = pools.get(name);
      p.matches.push(m);
      p.by.set(c.name, (p.by.get(c.name) || 0) + 1);
    }
  }
  const rows = [];
  for (const [name, p] of pools) {
    // No match ceiling: the filter's default (999) suits one character, and a
    // strategy pools thousands across the whole corpus.
    const row = filterAggregatedData([{ name, matches: p.matches }], { charMap, maxMatches: Infinity })[0];
    if (!row) continue;
    const { paired } = strategyPairs(aggregated, name, f);
    rows.push({
      ...row,
      id: slug(name),
      name,
      type: aiType(name),
      characters: p.by.size,
      byCharacter: [...p.by].map(([n, uses]) => ({ name: n, uses })).sort((a, b) => b.uses - a.uses || a.name.localeCompare(b.name)),
      matches: p.matches,
      comparable: [...p.by].reduce((s, [n, uses]) => s + ((totals.get(n) || 0) - uses >= MIN_OTHER ? uses : 0), 0),
      quality: dataQuality(p.matches.length, p.by.size),
      styles: styleRanks(paired),
      transform: transformShift(paired, ctx),
    });
  }
  return rows.sort((a, b) => b.matches.length - a.matches.length || a.name.localeCompare(b.name));
}

// ---- The table's columns ------------------------------------------------------------
// The AI strategies table ranks strategies by what they do to their
// characters' styles (the league, 2026-09-30): a column per style, the places
// it moves its characters in the league's ranking for it. Uses stays; the
// pooled figures (damage to battle time, win %) are in the detail.

const SHORT = { melee: 'Melee', ki: 'Ki', blast: 'Blast', ult: 'Ult', skill: 'Skill', defense: 'Def' };
const signed = v => `${v >= 0 ? '+' : '−'}${Math.round(Math.abs(v))}`;
export const styleOf = (r, key) => (r.styles || []).find(x => x.key === key) || null;

/**
 * What a style column's header tooltip says the style counts: the Characters
 * table's Styles view's words for a rate (characters/styleRows.js), and for
 * Defense what its rating is made of.
 */
const measures = st => (st.key === 'defense'
  ? 'a 0-100 rating from guards and counters, then time on the field, tags and survival'
  : styleByKey(st.key).what);

export const AI_STYLE_STATS = STYLES.map(st => ({
  key: `style_${st.key}`, label: st.name, short: SHORT[st.key], dir: 1, diverge: true, fmt: signed,
  // The header's tooltip says what the style counts, and only that (the league, 2026-10-01): the footnote says what the figure is.
  title: `${st.name}: ${measures(st)}`,
  get: r => { const x = styleOf(r, st.key); return x && x.gain !== null ? x.gain : null; },
}));
/**
 * Uses: every build run with it, fought or not, as the Builds tab counts and
 * the detail's counts are (the Characters table's Matches counts only matches
 * fought, which disagreed with the detail by a few). Shared by the Capsules tab.
 */
export const USES_STAT = { ...statByKey('matches'), label: 'Uses', short: 'Uses', get: r => r.matches.length, title: 'Builds run with it in scope' };
/**
 * How much more (or less) often its characters transform on it, fusions
 * included: the same characters' rate on this AI minus on their other AIs, in
 * points (aiShift.js transformShift). Participants read it to pick the AI that
 * gets a character to transform; with the Character chip on one character it
 * is that character's own.
 */
export const TRANSFORM_STAT = {
  key: 'transform', label: 'Transform', short: 'Trans', dir: 1, diverge: true, fmt: signed,
  title: 'Points more (or less) often its characters transform or fuse on it, against the same characters on their other AI strategies',
  get: r => (r.transform && r.transform.gain !== null ? r.transform.gain * 100 : null),
  // Its own sample is smaller than the row's (aiShift.js transformShift quality).
  thin: r => !!(r.transform && r.transform.quality === 'Low'),
  cellTitle: r => {
    const t = r.transform;
    if (!t) return 'None of its characters can transform or fuse';
    if (t.gain === null) return 'No character that transforms has enough matches on other AI strategies to compare';
    return `Transformed or fused in ${Math.round(t.with * 100)}% of matches on this AI, ${Math.round(t.usual * 100)}% on other AIs: `
      + `${t.compared} matches over ${t.characters} character${t.characters === 1 ? '' : 's'} (${t.quality} data)`;
  },
};
/** The table's stat columns: Uses, the six styles, then Transform (action columns go after Uses). */
export const AI_COLUMNS = [USES_STAT, ...AI_STYLE_STATS, TRANSFORM_STAT];

// ---- Action columns (`act=`) ------------------------------------------------------
// Any single action can join the table as a column (the league, 2026-10-01:
// "which AI makes my character spark most"), several at once for actions that
// go together (sparking and ultimates). Picked from the control row or by
// tapping a row of the detail's All actions box (aiActions.js).

/** Up to this many at once: with them, the full table still fits a laptop. */
export const MAX_ACTION_COLUMNS = 4;

/**
 * Each row with `actions` added, the figures behind the action columns:
 * { [key]: { raw, cmp } }, `raw` the rates a minute on this AI over every
 * character that ran it, `cmp` the same characters against their other AIs
 * (aiActions.js actionRates). Apart from aiStrategyRows so the table pays for
 * it only while an action column is shown.
 */
export function withActionRates(rows, aggregated, f = { chars: [] }) {
  return rows.map(r => {
    const { all, paired } = strategyPairs(aggregated, r.name, f);
    const raw = actionRates(all, { compare: false });
    const cmp = actionRates(paired);
    return { ...r, actions: Object.fromEntries(raw.map((a, i) => [a.key, { raw: a, cmp: cmp[i] }])) };
  });
}

const partName = a => (a.partWord === 'hit' ? ' (hits/thrown)' : a.partWord === 'won' ? ' (won/fought)' : '');

/**
 * An action as a table column, `a_<key>` in the URL's `sort`. With the
 * Character chip on one character: its rate a minute on each AI, which finds
 * the AI that makes it do something most. Otherwise the change a minute
 * against the same characters on their other AIs, as the style columns are,
 * since a pooled rate mostly says which characters run the AI. Its header's
 * tooltip says what it counts; the footnote says which figure it is. Its
 * header's second line ("/min", "±/min") keeps "Ults" from reading as the
 * Ultimates style column beside it.
 */
export function actionColumn(key, one) {
  const a = actionByKey(key);
  const fig = r => (r.actions ? r.actions[key] : null);
  const base = {
    key: `a_${key}`, label: a.short, short: a.short, unit: one ? '/min' : '±/min', dir: 1,
    title: `${a.label} a minute on the field${partName(a)}`,
  };
  if (one) {
    return {
      ...base,
      fmt: fmtRate,
      get: r => { const x = fig(r); return x ? x.raw.with : null; },
      text: r => { const x = fig(r); return x ? fmtPair(x.raw.with, x.raw.partWith) : '–'; },
      cellTitle: r => {
        const x = fig(r);
        if (!x || x.raw.with === null) return undefined;
        const mine = `${a.label} a minute${partName(a)}: ${fmtPair(x.raw.with, x.raw.partWith)} on this AI`;
        return x.cmp.usual === null ? mine : `${mine}, ${fmtPair(x.cmp.usual, x.cmp.partUsual)} on its other AIs`;
      },
    };
  }
  return {
    ...base,
    diverge: true,
    fmt: fmtRateChange,
    get: r => { const x = fig(r); return x && x.cmp.with !== null ? x.cmp.with - x.cmp.usual : null; },
    cellTitle: r => {
      const x = fig(r);
      if (!x || x.cmp.with === null) return 'No character has enough matches on other AI strategies to compare';
      return `${a.label} a minute${partName(a)}: ${fmtPair(x.cmp.with, x.cmp.partWith)} on this AI, `
        + `${fmtPair(x.cmp.usual, x.cmp.partUsual)} on their other AIs (${x.cmp.characters} character${x.cmp.characters === 1 ? '' : 's'} on average)`;
    },
  };
}
export const aiStatByKey = key => AI_COLUMNS.find(c => c.key === key) || null;
/** A compact table's columns before anyone picks (a phone the first two, a tablet all four). */
export const AI_PHONE_DEFAULTS = ['style_melee', 'style_blast', 'style_ult', 'style_defense'];

// ---- URL params (on /meta?tab=ai) --------------------------------------------------
// type=Attack,Defense, char=<character slugs> (shared with the Builds tab),
// act=<action keys> (the action columns), sort=<a column key | score | chars |
// name>, dir=asc | desc. The Capsules tab
// uses the same two readers with its own columns (capsuleRows.js
// CAPSULE_COLUMNS) and no score column (`{ score: false }`).

const list = (params, key) => [...new Set((params.get(key) || '').split(',').map(s => s.trim()).filter(Boolean))];

/** The action columns picked (`act=sparking,ult`): known keys, at most MAX_ACTION_COLUMNS. */
export function readAiActions(params) {
  return list(params, 'act').filter(k => actionByKey(k)).slice(0, MAX_ACTION_COLUMNS);
}

export function readAiFilters(params) {
  const types = list(params, 'type').filter(t => AI_TYPES.includes(t));
  return { chars: list(params, 'char'), types: types.length === AI_TYPES.length ? [] : types };
}

export function readAiSort(params, statFor = statByKey, { score = true } = {}) {
  const key = params.get('sort');
  const valid = (score && key === 'score') || key === 'chars' || key === 'name' || !!statFor(key);
  const sort = valid ? key : 'matches';
  const byDefault = sort === 'name' ? 'asc' : 'desc';
  const dir = params.get('dir') === 'asc' ? 'asc' : params.get('dir') === 'desc' ? 'desc' : byDefault;
  return { sort, dir };
}

export function sortAiRows(rows, { sort, dir }, statFor = statByKey) {
  const sign = dir === 'asc' ? 1 : -1;
  const get = sort === 'score' ? r => r.combatPerformanceScore || 0
    : sort === 'chars' ? r => r.characters
      : statFor(sort) ? statFor(sort).get : null;
  // A row without the figure (no character to compare) goes last either way.
  const has = r => get(r) !== null && get(r) !== undefined;
  return [...rows].sort((a, b) => (sort === 'name'
    ? sign * a.name.localeCompare(b.name)
    : (has(b) - has(a)) || sign * (get(a) - get(b)) || b.matches.length - a.matches.length));
}
