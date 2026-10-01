import { filterAggregatedData } from '../../utils/aggregation/filterAggregated.js';
import { buildKeyOf, buildCode } from '../../utils/buildKey.js';
import { slugifyCharacterName } from '../../utils/characterSlug.js';

/**
 * The Character page's own cuts, each set by clicking the thing it keeps and
 * cleared by clicking it again (or the strip at the top of the page):
 *   pos    `pos=1|2|3`, a Usage tab position row
 *   build  `build=<code>`, a Builds tab row or the Overview's build picker
 *   form   `form=<form name slug>`, a form on the Transformations tab
 * The team (`for=`, a Usage tab team row or the scope bar's Played for chip)
 * is applied before the page gets its row, by App, since it also changes what
 * the rank is counted among.
 */
export function readCharacterCuts(params) {
  const pos = Number(params.get('pos'));
  return {
    pos: [1, 2, 3].includes(pos) ? pos : null,
    build: params.get('build') || null,
    form: params.get('form') || null,
  };
}

/** A form's URL name: its name as a slug ("super-saiyan-3"). */
export const formSlug = name => slugifyCharacterName(name || '');

/** The forms of match `m` that are `form` (a slug); a form can be taken twice. */
const formsOf = (m, form) => (Array.isArray(m.forms) ? m.forms.filter(f => f.stats && formSlug(f.name) === form) : []);

/** Whether match `m` reached `form` and its file gives that form's own figures. */
export const reachedForm = (m, form) => formsOf(m, form).length > 0;

/**
 * `row` for only the matches that pass `cuts` ({ pos, build, team, form }: a
 * position, a build code, a team tag, a form slug), recomputed by the
 * leaderboard's own filter, as the Characters table would show that cut. The
 * build test is the filter's (`activeBuildFilters`): the exact build key. A
 * form keeps the matches that reached it, whole (formSlices() gives the
 * form's own figures). Null when no match passes. With no cuts the row comes
 * back as it is.
 */
export function cutCharacter(row, { pos = null, build = null, team = null, form = null } = {}, charMap = {}) {
  if (!row) return null;
  if (!pos && !build && !team && !form) return row;
  const matches = (row.matches || []).filter(m =>
    (!pos || Number(m.position) === pos)
    && (!team || m.team === team)
    && (!build || buildCode(buildKeyOf(m)) === build)
    && (!form || reachedForm(m, form)));
  if (!matches.length) return null;
  return filterAggregatedData([{ ...row, matches }], { charMap })[0] || null;
}

/** Amounts a form's share is shown for: what all of a match's forms add up to. */
export const SHARE_KEYS = ['damageDone', 'damageTaken', 'battleTime', 'shotEnergyBulletCount', 'exa1Count', 'exa2Count'];
const RUNNING_MAX = ['maxComboNum', 'maxComboDamage'];
const LAST = ['hPGaugeValue', 'hPGaugeValueMax', 'hasAdditionalCounts'];

/**
 * Each of `matches` as `form` alone: the match row with the form's own
 * figures (matchForms()'s `stats`) in place of the match's, as the Match page
 * shows a picked form, so the Overview's code reads them unchanged. A form
 * taken twice in a match adds up (its best combo is the higher, its HP the
 * later). A file without hit counts loses the hit fields, so a hit rate is
 * unknown rather than 0%. Matches that did not reach it are left out.
 *
 *   { slices, shares: { <SHARE_KEYS>: the form's share of all its forms'
 *     total over these matches, 0-1, or null when they total 0 } }
 *
 * A fused form's figures are the fusion's whole output, and its shares are of
 * all the forms' whole output, as on the Match page.
 */
export function formSlices(matches, form) {
  const slices = [];
  const mine = Object.fromEntries(SHARE_KEYS.map(k => [k, 0]));
  const all = Object.fromEntries(SHARE_KEYS.map(k => [k, 0]));
  for (const m of matches || []) {
    const own = formsOf(m, form);
    if (!own.length) continue;
    const merged = {};
    for (const f of own) {
      const { name: _name, ...stats } = f.stats;
      for (const [k, v] of Object.entries(stats)) {
        if (LAST.includes(k)) merged[k] = v;
        else if (RUNNING_MAX.includes(k)) merged[k] = v === null ? (merged[k] ?? null) : Math.max(merged[k] ?? 0, v);
        else merged[k] = (merged[k] || 0) + (Number(v) || 0);
      }
    }
    const slice = { ...m, ...merged };
    if (!merged.hasAdditionalCounts) { delete slice.s1HitBlast; delete slice.s2HitBlast; delete slice.uLTHitBlast; }
    slices.push(slice);
    for (const k of SHARE_KEYS) {
      mine[k] += Number(merged[k]) || 0;
      for (const f of m.forms) if (f.stats) all[k] += Number(f.stats[k]) || 0;
    }
  }
  const shares = Object.fromEntries(SHARE_KEYS.map(k => [k, all[k] > 0 ? mine[k] / all[k] : null]));
  return { slices, shares };
}
