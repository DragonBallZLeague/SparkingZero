// The demo's state lives in the URL hash, so a reload or a copied link keeps the view, both fighters, their
// builds, skills, Sparking and conditions, and the ruleset:
//   #/<view>?a=<id>&ac=<capsule ids>&as=<active skills>&ag=<stages>&ap=1&ah=<health %>&ak=<ki>&aq=<skill gauge>&am=<map>&ae=<events>
//            &b=... (the same for the other fighter)&rs=<ruleset>&d=full (Quick or Full)&vl=match (Versus: Side by side or Matchup)
//            &cl=a|b (trials for the Command list: A without its sub-headers, B as three sections)
// The views are roster, fighter and versus (round 23); the old ones still open: #/sheet and #/stats the Fighter page
// (Quick, Full), #/compare and #/vs Versus (Side by side, Matchup), with cm=all / vm=all as Full.
// The rebuild keeps this shape on real routes (REDESIGN-STATUS.md, build-out 2).
import { meta, byId } from './model.js';

export const VIEWS = ['roster', 'fighter', 'versus'];
const OLD = { sheet: ['fighter'], stats: ['fighter', 'full'], compare: ['versus', null, 'side', 'cm'], vs: ['versus', null, 'match', 'vm'] };

const DEFAULTS = {
  view: 'fighter',
  A: { id: '0000_00', caps: ['00_0_0005', '00_0_0026'], skills: {}, stage: {}, sparking: false, sit: null },
  B: { id: '0040_00', caps: [], skills: {}, stage: {}, sparking: false, sit: null },
  rs: meta.defaultRuleset,
  d: 'quick',
  vl: 'side',
};

function readSpec(q, p, fallback) {
  const id = q.get(p);
  if (!id || !byId.has(id)) return { ...fallback, skills: { ...fallback.skills }, stage: { ...fallback.stage } };
  const list = (k) => (q.get(p + k) || '').split('.').filter(Boolean);
  const skills = {};
  for (const s of list('s')) skills[s] = true;
  const stage = {};
  for (const s of list('g')) { const [slot, n] = s.split(':'); stage[slot] = +n; }
  const sit = {};
  if (q.has(p + 'h')) sit.hp = Math.max(0, Math.min(100, +q.get(p + 'h'))) / 100;
  if (q.has(p + 'k')) sit.ki = +q.get(p + 'k');
  if (q.has(p + 'q')) sit.skill = +q.get(p + 'q');
  if (q.has(p + 'm')) sit.map = q.get(p + 'm');
  if (q.has(p + 'e')) sit.events = Object.fromEntries(list('e').map(e => [e, true]));
  return { id, caps: list('c'), skills, stage, sparking: q.get(p + 'p') === '1', sit: Object.keys(sit).length ? sit : null };
}

export function parse(hash = location.hash) {
  const h = hash.replace(/^#\/?/, '');
  const [path, qs = ''] = h.split('?');
  const q = new URLSearchParams(qs);
  const old = OLD[path];
  const view = old ? old[0] : VIEWS.includes(path) ? path : DEFAULTS.view;
  const fresh = !qs;
  const d = q.get('d') === 'full' || old?.[1] === 'full' || (old?.[3] && q.get(old[3]) === 'all') ? 'full' : 'quick';
  const vl = old?.[2] || (q.get('vl') === 'match' ? 'match' : 'side');
  return {
    view,
    A: fresh ? DEFAULTS.A : readSpec(q, 'a', { ...DEFAULTS.A, caps: [] }),
    B: fresh ? DEFAULTS.B : readSpec(q, 'b', DEFAULTS.B),
    rs: meta.rulesets.some(r => r.name === q.get('rs')) ? q.get('rs') : DEFAULTS.rs,
    d,
    vl,
    cl: ['a', 'b'].includes(q.get('cl')) ? q.get('cl') : null,
  };
}

function writeSpec(q, p, s) {
  q.set(p, s.id);
  if (s.caps.length) q.set(p + 'c', s.caps.join('.'));
  const on = Object.entries(s.skills || {}).filter(([, v]) => v).map(([k]) => k);
  if (on.length) q.set(p + 's', on.join('.'));
  const st = Object.entries(s.stage || {}).filter(([, v]) => v).map(([k, v]) => `${k}:${v}`);
  if (st.length) q.set(p + 'g', st.join('.'));
  if (s.sparking) q.set(p + 'p', '1');
  const sit = s.sit || {};
  if (sit.hp != null && sit.hp < 1) q.set(p + 'h', String(Math.round(sit.hp * 100)));
  if (sit.ki != null) q.set(p + 'k', String(sit.ki));
  if (sit.skill != null) q.set(p + 'q', String(sit.skill));
  if (sit.map) q.set(p + 'm', sit.map);
  const ev = Object.entries(sit.events || {}).filter(([, v]) => v).map(([k]) => k);
  if (ev.length) q.set(p + 'e', ev.join('.'));
}

export function serialize(st) {
  const q = new URLSearchParams();
  writeSpec(q, 'a', st.A);
  writeSpec(q, 'b', st.B);
  if (st.rs !== meta.defaultRuleset) q.set('rs', st.rs);
  if (st.d === 'full') q.set('d', 'full');
  if (st.vl === 'match') q.set('vl', 'match');
  if (st.cl) q.set('cl', st.cl);
  return `#/${st.view}?${q.toString().replace(/%3A/g, ':')}`;
}
