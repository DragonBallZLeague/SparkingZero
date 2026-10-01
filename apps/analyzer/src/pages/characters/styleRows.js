import baseline from '../../config/style-baseline.json';
import { overviewFromMatches, placeOverview, defenseRaw } from '../../utils/characterOverview.js';

/**
 * The Characters table's Styles view (2026-09-30): each character's fighting
 * styles as its Overview measures them, so Home's style boards (Top Brawlers,
 * Spammers, Tanks) open into a table that goes on. No React, so a verifier can
 * import it.
 *
 * Each column shows and sorts by the style's own figure: a rate a minute, or
 * for Defense its rating (0-100: where its guards, counters, time on the
 * field, tags and survival sit in the league, blended; 50 is the league's
 * middle). Its league rank against the frozen reference (style-baseline.json,
 * #1 = does it most) is kept for the tooltip: shown beside a list ranked in
 * the scope, it read as a second, different ranking (the league, 2026-09-30).
 * A `key` is what the URL's `sort` says, so do not rename one.
 *
 * Spam is the league's "spammer": blasts and ultimates thrown a minute, each
 * throw counting once, so volume decides (10 blasts out-spam 5 blasts and 2
 * ultimates; see characterOverview.js). The first three are Home's boards.
 */
const oneDp = v => v.toFixed(1);
const twoDp = v => v.toFixed(2);
const rateOf = (key, what, fmt, rest) => ({
  what, fmt, unit: '/min', median: `r_${key}`, raw: o => o.rate[key], never: o => !o.rate[key], title: `${what[0].toUpperCase()}${what.slice(1)}`, ...rest,
});
export const STYLE_STATS = [
  { key: 'melee', label: 'Melee', short: 'Melee', ...rateOf('melee', 'rush and heavy hits a minute', oneDp) },
  { key: 'spam', label: 'Spam', short: 'Spam', ...rateOf('spam', 'blasts and ultimates thrown a minute', twoDp) },
  { key: 'defense', label: 'Defense', short: 'Def', what: 'defense rating, 0-100 against the league (50 its middle)',
    title: 'Defense rating, 0-100: its guards and counters, then time on the field, tags and survival, each against the league',
    fmt: v => String(Math.round(v)), unit: '/100', median: null, raw: (o, p) => defenseRaw(p.pct), never: () => false },
  { key: 'ki', label: 'Ki blasts', short: 'Ki', ...rateOf('ki', 'ki blasts fired a minute', oneDp) },
  { key: 'blast', label: 'Blasts', short: 'Blast', ...rateOf('blast', 'blasts thrown a minute', twoDp) },
  { key: 'ult', label: 'Ultimates', short: 'Ult', ...rateOf('ult', 'ultimates thrown a minute', twoDp) },
  { key: 'skill', label: 'Skills', short: 'Skill', ...rateOf('skill', 'skills used a minute', twoDp) },
].map(s => ({
  ...s,
  // The sort value; a style never used is 0, below everyone who used it.
  get: r => (r.styles && r.styles[s.key] ? r.styles[s.key].raw : null),
  dir: 1,
}));
export const styleByKey = key => STYLE_STATS.find(s => s.key === key) || null;

/** The league's middle for a style's figure (the reference's median), or null for Defense (50 by its make). */
export const styleMedian = stat => (stat.median && baseline.medians[stat.median] != null ? baseline.medians[stat.median] : null);

/**
 * A style figure's tooltip: the figure, what it counts, and where it sits in
 * the league (its rank against the reference, and the league's middle).
 */
export function styleTip(stat, f) {
  if (!f) return '';
  if (f.never) return `${stat.label}: never`;
  const med = styleMedian(stat);
  const league = [f.rank != null ? `#${f.rank} of ${f.pool} in the league` : null, med != null ? `league middle ${stat.fmt(med)}` : null]
    .filter(Boolean).join(', ');
  return `${stat.label}: ${stat.fmt(f.raw)} ${stat.what}${league ? `. ${league[0].toUpperCase()}${league.slice(1)}` : ''}.`;
}

/** The styles a compact table shows before anyone picks (a phone the first two, a tablet all four). */
export const DEFAULT_PHONE_STYLES = ['melee', 'spam', 'defense', 'ki'];

/**
 * Each row with `styles`: { [key]: { raw, rank, pool, never } }, from its
 * matches as the Overview computes them. `never` is a style it never used,
 * which reads "Never" with no rank (a tied last place would say more than
 * nothing happened).
 */
export function withStyles(rows) {
  return (rows || []).map(r => {
    const o = overviewFromMatches(r.matches);
    const place = placeOverview(o, baseline);
    const styles = {};
    for (const s of STYLE_STATS) {
      const never = s.never(o);
      styles[s.key] = {
        raw: never ? 0 : s.raw(o, place),
        rank: never ? null : place.rank[`style_${s.key}`] ?? null,
        pool: place.pool[`style_${s.key}`] ?? null,
        never,
      };
    }
    return { ...r, styles };
  });
}
