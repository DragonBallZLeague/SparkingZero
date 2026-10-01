import transformationsData from '../../../../referencedata/transformations.json';
import { getFusionPartnerFamilyForms } from './fusionSplit.js';

/**
 * TRANSFORMATIONS: how the analyzer counts them, in one place (settled with
 * the league, 2026-09-30). Participants read them to pick the AI strategy and
 * capsules that get a character to transform, so every page that shows one
 * (Meta's AI strategies, the Character page's Transformations tab, the Builds
 * tables, the Performances table, the workbook) reads it through this file.
 * No React, so the verifiers can import it.
 *
 * WHAT COUNTS
 *
 * - A transformation is any form change a character makes itself, FUSIONS
 *   INCLUDED. The AI treats the two as one behaviour: both spend the skill
 *   gauge (1 count for most transformations, 2 or 3 for some, almost always 3
 *   for a fusion), and the capsules that act on them say "Transformations and
 *   Fusions". A fusion counts for the character that started it, whose record
 *   holds it; the partner takes half the fusion's stats (THE FUSION RULE,
 *   fusionSplit.js) but not the transformation. Form changes after a fusion
 *   are the fusion's (Fused Zamasu -> Half-Corrupted is not Goku Black's).
 *
 * - The rate is over the matches it COULD have transformed in, the counted
 *   matches: it fought (battle time over 0), it was not fused in from the
 *   bench as a teammate's partner (`absorbed`: it never fought as itself), it
 *   did not carry Broly's Ring (which blocks transforming: 0 of 132 matches
 *   with it did), and a character that can only fuse (Goku Black Super Saiyan
 *   Rosé, Zamasu, Vegeta (GT) Super Saiyan 4) had its partner on its team. A
 *   match it did transform in always counts, so a move transformations.json is
 *   missing still shows (scripts/verify-transformations.mjs reports those).
 *   The lineup check is as good as the file: a teammate that never entered
 *   often has no record, so a fusion-only character's match whose partner sat
 *   out the whole match is left out with the ones where it was not fielded.
 *
 * - Reverting is not transforming. transformations.json lists the move back
 *   to a family's base form beside the moves up (Goku (Z - End) Super Saiyan 3
 *   -> Goku (Z - End)). No match file records one, and a character whose only
 *   move is back down (Trunks (Kid) Super Saiyan, 0 of 227) cannot transform:
 *   counting it would bury every rate it is pooled into. isRevert() says which.
 *
 * - A match whose file lost its AI strategy reads as "Default" (UNKNOWN_AI).
 *   A bug, since fixed, that transforming set off, so every one of those 30
 *   matches transformed. They count for the character, never in an AI
 *   comparison.
 */

/** Blocks transformations and fusions; its matches are not counted. */
export const BROLYS_RING = '00_0_0155';

/**
 * Capsules that act on the skill gauge transformations spend, shown with and
 * without on the Character page and in Meta's Capsules detail. League-wide none
 * moves the rate past what unrelated capsules swing by (CAPSULE_NOISE):
 * Super Transformation cannot lower a 1-count transformation, most of them,
 * so its effect is per character.
 */
export const SKILL_GAUGE_CAPSULES = [
  '00_0_0066', // Super Transformation: 1 fewer Skill Count to transform or fuse (minimum 1)
  '00_0_0138', // Secret Measures: 1 more Skill Count
  '00_0_0055', // Dragon Spirit: skill gauge recovers 25% faster
  '00_0_0149', // Dragon Heart: recovers 25% of the gauge after dodging a blast with high-speed movement
];

/**
 * A capsule's change in the transform rate smaller than this (10 points) is
 * within what unrelated capsules swing by, so it is shown uncoloured.
 * Measured 2026-10-01 on the last two seasons, Ultra, comparing the same
 * character on the same AI with and without each capsule (heldComparison()):
 * the 33 capsules with Medium+ data moved the rate by a median 5.8 points,
 * 80% of them within 10.5, and the largest moves were capsules unrelated to
 * transforming (Ki Blast Attack Boost 3 −28, Style of the Strong +16). Super
 * Transformation −4, Secret Measures +6, Dragon Spirit +6.
 */
export const CAPSULE_NOISE = 0.10;

/** The AI strategy a match reads as when its file lost it (see above). */
export const UNKNOWN_AI = 'Default';

const entry = id => (id && id !== '_comment' ? transformationsData[id] : null) || null;
const movesOf = id => (Array.isArray(entry(id)?.transformsTo) ? entry(id).transformsTo : []);
const nameOf = id => entry(id)?.name || id || '';

/** True when `to` is a fusion that `from` starts (it is one of `to`'s partners). */
export function isFusionStep(from, to) {
  const parts = entry(to)?.fusionOf;
  return Array.isArray(parts) && parts.includes(from);
}

/**
 * True when `from` -> `to` is a move back down, not a transformation: the two
 * list each other, and `to` is the family's base. The base is the one whose
 * name the other's contains (Goku (Z - End) in "Goku (Z - End) Super Saiyan
 * 3", Vegito in "Super Vegito"), else the family's hub, the form with more
 * moves (Trunks (Melee), which Super Trunks reverts to).
 */
export function isRevert(from, to) {
  if (!movesOf(to).includes(from)) return false;
  return nameOf(from).includes(nameOf(to)) || movesOf(to).length > movesOf(from).length;
}

/** The forms `id` can transform up into: no reverts, no fusions. */
export function upwardMoves(id) {
  return movesOf(id).filter(to => !isFusionStep(id, to) && !isRevert(id, to));
}

/** Whether transformations.json gives `id` a transformation of its own. */
export const canTransform = id => upwardMoves(id).length > 0;

const partnerCache = new Map();
/** Each fusion pair `id` is in: { partner (the form listed), family (the forms it can be fielded in) }. */
function pairsOf(id) {
  if (!id) return [];
  if (partnerCache.has(id)) return partnerCache.get(id);
  const mine = getFusionPartnerFamilyForms(id, transformationsData);
  const out = [];
  for (const [key, e] of Object.entries(transformationsData)) {
    if (key === '_comment' || !Array.isArray(e?.fusionOf)) continue;
    e.fusionOf.forEach((part, i) => {
      const partner = e.fusionOf[i ^ 1];
      if (partner && mine.has(part)) out.push({ partner, family: getFusionPartnerFamilyForms(partner, transformationsData) });
    });
  }
  partnerCache.set(id, out);
  return out;
}

/**
 * The partners `id` can fuse with, each as the set of forms that partner can be
 * fielded in, for a lineup check. A fusion's partners are listed in pairs
 * (fusionOf [a, b, c, d] is a + b or c + d), and a character is in a pair when
 * a form it can reach is (Goku Black reaches Super Saiyan Rosé, which fuses).
 */
export const fusionPartners = id => pairsOf(id).map(p => p.family);

/** The forms `id`'s fusion partners are listed as, once each (Zamasu for Goku Black Super Saiyan Rosé). */
export const fusionPartnerIds = id => [...new Set(pairsOf(id).map(p => p.partner))];

/** Whether `id` has no transformation of its own and can only fuse (Goku Black Super Saiyan Rosé, Zamasu). */
export const onlyFuses = id => !canTransform(id) && pairsOf(id).length > 0;

/** Whether the reference gives `id` a transformation or a fusion. */
export const canTransformOrFuse = id => canTransform(id) || pairsOf(id).length > 0;

/**
 * Who was on each side of each match, for the fusion check: a Map of
 * "fileName|side" -> Set of starting-form ids. `rows` are aggregated
 * character rows; `idOf(name)` gives a character's id (App's charIdFor).
 */
export function lineupIndex(rows, idOf) {
  const index = new Map();
  for (const r of rows || []) {
    const id = idOf(r.name);
    if (!id) continue;
    for (const m of r.matches || []) {
      const key = `${m.fileName}|${m.side}`;
      if (!index.has(key)) index.set(key, new Set());
      index.get(key).add(id);
    }
  }
  return index;
}

const capsuleIds = m => (m.equippedCapsules || []).map(c => c && c.id).filter(Boolean);

/**
 * One match of character `id` (an aggregated match row):
 *
 *   { counted, reason, transformed, fused, seconds }
 *
 * `counted` is whether the match is in the rate; when it is not, `reason` says
 * why: 'unfought', 'absorbed' (fused in from the bench by a teammate),
 * 'brolys-ring', 'no-partner' (it can only fuse, and its partner was not on
 * its team) or 'cannot' (no transformation, no fusion).
 * `transformed` is any form change it made itself, a fusion included; `fused`
 * that one of them was a fusion. `seconds` is its time on the field before the
 * first one, when the file gives per-form figures (null otherwise).
 */
export function matchTransformation(m, { id, lineups = null } = {}) {
  const ids = m.formIds || [];
  let transformed = false;
  let fused = false;
  for (let i = 1; i < ids.length; i++) {
    transformed = true;
    if (isFusionStep(ids[i - 1], ids[i])) { fused = true; break; }
  }
  const first = transformed && Array.isArray(m.forms) && m.forms.length > 1 ? m.forms[0].seconds : null;
  const seconds = first > 0 ? first : null;
  const result = (counted, reason = null) => ({ counted, reason, transformed: counted && transformed, fused: counted && fused, seconds: counted ? seconds : null });

  if (!(m.battleTime > 0)) return result(false, 'unfought');
  if (m.absorbed) return result(false, 'absorbed');
  if (capsuleIds(m).includes(BROLYS_RING)) return result(false, 'brolys-ring');
  if (transformed || canTransform(id)) return result(true);
  const partners = fusionPartners(id);
  if (!partners.length) return result(false, 'cannot');
  const mates = (lineups && lineups.get(`${m.fileName}|${m.side}`)) || new Set();
  const partnerHere = partners.some(family => [...mates].some(x => x !== id && family.has(x)));
  return partnerHere ? result(true) : result(false, 'no-partner');
}

/**
 * How many transformations one match row holds: the form changes the
 * character made itself, up to and including a fusion (after it, they are
 * the fusion's). 0 for a partner fused in from the bench. The Performances
 * table's count beside the forms path.
 */
export function transformCount(m) {
  if (m.absorbed) return 0;
  const ids = m.formIds || [];
  let n = 0;
  for (let i = 1; i < ids.length; i++) {
    n++;
    if (isFusionStep(ids[i - 1], ids[i])) break;
  }
  return n;
}

const median = values => {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

/**
 * The transform rate with something against without it, HELD WITHIN GROUPS:
 * per group, its counted matches with it against its counted matches there
 * without it (`minOther`+ of them), weighted by the matches with it. The
 * skill gauge capsules are compared this way, grouped by AI strategy for one
 * character (the Character page) or by character and AI strategy (Meta's
 * Capsules detail): the AI moves the rate far more than any capsule, and
 * teams pair capsules with particular AIs, so an ungrouped with / without
 * said mostly which AI ran them (21 points off on average, measured
 * 2026-10-01).
 *
 * `items`: { group, on (with it), t (matchTransformation(), counted only) }.
 *   { compared (matches with it that have a group to compare in), groups
 *     (those groups' keys), with, usual (rates, null when nothing compares),
 *     gain (with - usual), seconds: { with, usual } (the first
 *     transformation's median, weighted by matches timed on both sides) or null }
 */
export function heldComparison(items, minOther) {
  const byGroup = new Map();
  for (const x of items) {
    if (!byGroup.has(x.group)) byGroup.set(x.group, { with: [], without: [] });
    byGroup.get(x.group)[x.on ? 'with' : 'without'].push(x.t);
  }
  const rate = ts => ts.filter(t => t.transformed).length / ts.length;
  const times = ts => ts.map(t => t.seconds).filter(s => s != null);
  let n = 0, a = 0, b = 0, tn = 0, ta = 0, tb = 0;
  const groups = [];
  for (const [key, p] of byGroup) {
    if (!p.with.length || p.without.length < minOther) continue;
    groups.push(key);
    n += p.with.length; a += p.with.length * rate(p.with); b += p.with.length * rate(p.without);
    const tw = times(p.with), to = times(p.without);
    const k = Math.min(tw.length, to.length);
    if (k) { tn += k; ta += k * median(tw); tb += k * median(to); }
  }
  return {
    compared: n,
    groups,
    with: n ? a / n : null,
    usual: n ? b / n : null,
    gain: n ? (a - b) / n : null,
    seconds: tn ? { with: ta / tn, usual: tb / tn } : null,
  };
}

/**
 * A set of one character's matches (all of them, one build's, one AI's...):
 *
 *   { able, matches, transformed, fused, rate, seconds, timed, left }
 *
 * `able` is whether it can transform or fuse at all (from the reference, or
 * because it did here); a character that cannot gets no Transformations tab.
 * `matches` is the counted matches, `rate` transformed / matches (null with
 * none), `seconds` the median time on the field before the first
 * transformation over the `timed` matches that give it, and `left` how many
 * matches were not counted, by reason.
 */
export function transformationSummary(matches, { id, lineups = null } = {}) {
  const left = { unfought: 0, absorbed: 0, 'brolys-ring': 0, 'no-partner': 0, cannot: 0 };
  let counted = 0, transformed = 0, fused = 0;
  const times = [];
  for (const m of matches || []) {
    const t = matchTransformation(m, { id, lineups });
    if (!t.counted) { left[t.reason]++; continue; }
    counted++;
    if (t.transformed) transformed++;
    if (t.fused) fused++;
    if (t.seconds != null) times.push(t.seconds);
  }
  const able = transformed > 0 || canTransformOrFuse(id);
  return {
    able,
    matches: counted,
    transformed,
    fused,
    rate: counted ? transformed / counted : null,
    seconds: median(times),
    timed: times.length,
    left,
  };
}
