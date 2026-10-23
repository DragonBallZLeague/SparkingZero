/**
 * The calculator's addresses (settled by the league on 2026-10-13). Every state is in the URL, so a reload or a
 * copied link (the Copy link button copies location.href) keeps the view, both fighters, their builds and the ruleset:
 *
 *   /calculator/                            Characters
 *   /calculator/goku-z-early                Fighter
 *   /calculator/goku-z-early/vs/janemba     Versus
 *
 * A fighter is its name slug (characters.json `slug`, the Analyzer's rule: apps/analyzer/src/utils/characterSlug.js)
 * or its raw id, kept as a permanent alias (0000_00). Ids hold an underscore and slugs never do, so the two can't be
 * mixed up; verify-data checks that and that every slug is unique.
 *
 * The query carries the build, readable on purpose (links are pasted in Discord):
 *   caps=rush-attack-boost-1,blast-burst     capsule slugs (capsule ids accepted, for Match Builder later)
 *   skills=kaioken,give-me-your-energy:2     active skills by name slug (or slot 1 / 2), a stage after ':'
 *   sparking                                 Sparking! on
 *   hp=40  ki=3  gauge=2  map=namek  events=knockout,emote  time=60    conditions: health %, ki bars, skill stocks, battle seconds
 * The right-hand fighter's are the same with `vs-` in front (vs-caps, vs-sparking, ...). Then
 *   rules=standard-soft (only when not the default), full (Full stats), lens=matchup (Versus's Matchup).
 *
 * Old links (`#<base64>`: the live calculator's share links and the website Teams page's) are read by
 * utils/shareLink.js and rewritten to this form in main.jsx.
 *
 * Pure (no data imports), so scripts/verify-data.mjs runs the same code over every character.
 */

export const VIEWS = ['roster', 'fighter', 'versus'];

const slugify = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** Lookups over the loaded data for reading and writing links. */
export function linkIndex({ characters, capsules, skillsById, rulesets, defaultRuleset }) {
  const charBy = new Map();
  for (const c of characters) { charBy.set(c.id, c); charBy.set(c.slug || slugify(c.name), c); }
  const capBy = new Map();
  for (const c of capsules) { capBy.set(c.id, c); capBy.set(c.slug || slugify(c.name), c); }
  const ruleBy = new Map(rulesets.map(r => [slugify(r.name), r.name]));
  /** A fighter's skills by slot: [{ slot, slug }] */
  const skillsOf = (c) => (c.skills || []).map(k => skillsById[k]).filter(Boolean).map(s => ({ slot: s.slot, slug: slugify(s.name) }));
  return {
    character: (ref) => charBy.get(String(ref ?? '').toLowerCase()) || charBy.get(String(ref ?? '')) || null,
    capsule: (ref) => capBy.get(String(ref ?? '').toLowerCase()) || capBy.get(String(ref ?? '')) || null,
    slugOf: (id) => { const c = charBy.get(id); return c ? c.slug || slugify(c.name) : id; },
    capSlug: (id) => { const c = capBy.get(id); return c ? c.slug || slugify(c.name) : id; },
    skillsOf,
    ruleset: (slug) => ruleBy.get(slug) || null,
    rulesetSlug: (name) => slugify(name),
    defaultRuleset,
  };
}

const list = (v) => (v || '').split(',').map(s => s.trim()).filter(Boolean);

function readSide(q, p, id, ix) {
  const c = ix.character(id);
  if (!c) return null;
  const caps = list(q.get(p + 'caps')).map(ix.capsule).filter(Boolean).map(x => x.id);
  const skills = {}, stage = {};
  const mine = ix.skillsOf(c);
  for (const item of list(q.get(p + 'skills'))) {
    const [name, n] = item.split(':');
    const s = mine.find(x => x.slug === name || String(x.slot) === name);
    if (!s) continue;
    skills[s.slot] = true;
    if (+n > 0) stage[s.slot] = +n;
  }
  const sit = {};
  if (q.has(p + 'hp')) sit.hp = Math.max(0, Math.min(100, +q.get(p + 'hp') || 0)) / 100;
  if (q.has(p + 'ki')) sit.ki = +q.get(p + 'ki') || 0;
  if (q.has(p + 'gauge')) sit.skill = +q.get(p + 'gauge') || 0;
  if (q.get(p + 'map')) sit.map = q.get(p + 'map');
  if (q.has(p + 'events')) sit.events = Object.fromEntries(list(q.get(p + 'events')).map(e => [e, true]));
  if (q.has(p + 'time')) sit.time = Math.max(0, +q.get(p + 'time') || 0);
  return { id: c.id, caps, skills, stage, sparking: q.has(p + 'sparking'), sit: Object.keys(sit).length ? sit : null };
}

/**
 * Reads a path (below the app's base) and query.
 * @returns {{ view, A, B, rs, d, vl, unknown? }} A or B is null when the address doesn't name one.
 */
export function readLink(path, search, ix) {
  const parts = path.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean).map(decodeURIComponent);
  const q = new URLSearchParams(search);
  const out = {
    view: 'roster', A: null, B: null,
    rs: ix.ruleset(q.get('rules')) || ix.defaultRuleset,
    d: q.has('full') ? 'full' : 'quick',
    vl: q.get('lens') === 'matchup' ? 'match' : 'side',
  };
  if (!parts.length) return out;
  out.A = readSide(q, '', parts[0], ix);
  if (!out.A) return { ...out, unknown: parts[0] };
  out.view = 'fighter';
  if (parts[1] === 'vs' && parts[2]) {
    out.B = readSide(q, 'vs-', parts[2], ix);
    if (out.B) out.view = 'versus';
  }
  return out;
}

function writeSide(add, p, s, ix) {
  if (s.caps?.length) add(p + 'caps', s.caps.map(ix.capSlug).join(','));
  const c = ix.character(s.id);
  const mine = c ? ix.skillsOf(c) : [];
  const on = mine.filter(x => s.skills?.[x.slot]).map(x => (s.stage?.[x.slot] ? `${x.slug}:${s.stage[x.slot]}` : x.slug));
  if (on.length) add(p + 'skills', on.join(','));
  if (s.sparking) add(p + 'sparking');
  const sit = s.sit || {};
  if (sit.hp != null && sit.hp < 1) add(p + 'hp', String(Math.round(sit.hp * 100)));
  if (sit.ki != null) add(p + 'ki', String(sit.ki));
  if (sit.skill != null) add(p + 'gauge', String(sit.skill));
  if (sit.map) add(p + 'map', sit.map);
  const ev = Object.entries(sit.events || {}).filter(([, v]) => v).map(([k]) => k);
  if (ev.length) add(p + 'events', ev.join(','));
  if (sit.time) add(p + 'time', String(sit.time));
}

/** The address (below the app's base, no leading slash) for a state. */
export function writeLink(st, ix) {
  if (st.view === 'roster' || !st.A) return '';
  const q = [];
  // written by hand, not with URLSearchParams, so commas and colons stay readable
  const add = (k, v) => q.push(v == null ? k : `${k}=${encodeURIComponent(v).replace(/%2C/g, ',').replace(/%3A/g, ':')}`);
  writeSide(add, '', st.A, ix);
  const two = st.view === 'versus' && st.B;
  if (two) writeSide(add, 'vs-', st.B, ix);
  if (st.rs && st.rs !== ix.defaultRuleset) add('rules', ix.rulesetSlug(st.rs));
  if (st.d === 'full') add('full');
  if (two && st.vl === 'match') add('lens', 'matchup');
  const path = ix.slugOf(st.A.id) + (two ? `/vs/${ix.slugOf(st.B.id)}` : '');
  return path + (q.length ? `?${q.join('&')}` : '');
}
