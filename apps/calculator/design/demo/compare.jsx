// Compare: two fighters side by side, each with its own build. Summary pairs the main stats; All stats
// pairs every Full stats row. Also the pieces Vs opponent shares: the two-fighter header, paired rows,
// All stats and a side's build panel.
import React, { useState } from 'react';
import {
  artUrl, faceUrl, nameParts, isGiant, figHeight, gameMoves, moveset, chainTypes, armorBreaks, fiveHitTaken, volley, perceptionName,
  similarFighters, skillOf, blastsOf, blastDamage, toggleable, typeClass, capsuleById, buildCheck, emptySpec, exchange, rosterPos,
} from './model.js';
import { Tap, Modes, Name, Switch, PhoneSectionNav, usePhone, usePair } from './ui.jsx';
import { Conditions, InEffect } from './conditions.jsx';
import { ClassChip, CapsuleRows, traitChips, ChangeButton, SkillSwitches } from './sheet.jsx';
import { Hits } from './moves.jsx';
import { F } from './format.js';

/* ------------------------------------------------------------------ the two-fighter header */
export function VsHead({ pair, chipsA, chipsB, actionsA, actionsB, changeA = null, changeB = null }) {
  const phone = usePhone();
  const fig = (side) => (
    <div className={`vfig${phone ? ' c' : ''}`}>
      <img src={artUrl(side.c.id)} alt="" className={isGiant(side.c) ? 'giant' : ''} style={{ '--fh': figHeight(side.c) }} />
    </div>
  );
  // the Change button sits beside each name, on its inner side (the right side's mirrored)
  return (
    <div className="vshead">
      <div className="vside l">{fig(pair.A)}<div className="who"><div className="nm"><Name parts={nameParts(pair.A.c.name)} br={!phone} />{changeA}</div>{!phone && <div className="chips">{chipsA}</div>}{actionsA}</div></div>
      <div className="vside r">{fig(pair.B)}<div className="who"><div className="nmrow r"><div className="nm"><Name parts={nameParts(pair.B.c.name)} br={!phone} /></div>{changeB}</div>{!phone && <div className="chips" style={{ justifyContent: 'flex-end' }}>{chipsB}</div>}{actionsB}</div></div>
      <div className="vsmid"><b>VS</b></div>
    </div>
  );
}

/** Chips under a fighter's name: class, DP, the build in short, skills on, Sparking. */
export function buildChips(side) {
  const out = [<ClassChip key="cls" c={side.c} />, <span key="dp" className="chip dp">DP {side.c.dp}</span>];
  const caps = side.caps;
  if (caps.length === 1) out.push(<span key="c" className="chip ghost">{caps[0].name}</span>);
  else if (caps.length > 1) out.push(<span key="c" className="chip ghost">{caps.length} capsules</span>);
  for (const slot of [1, 2]) {
    const s = skillOf(side.c, slot);
    if (s && side.spec.skills?.[slot] && toggleable(s)) out.push(<span key={`s${slot}`} className="chip sk">{s.name} on</span>);
  }
  if (side.spec.sparking) out.push(<span key="sp" className="chip sp">Sparking</span>);
  return out;
}

/* ------------------------------------------------------------------ paired rows */
/**
 * A row of the pair: { label, small, get(side) -> number, fmt, kind, less, score }. The better value is
 * green; bars grow from the middle, sized to the larger.
 */
/** A row's value for side k: `get(side)`, or `vs(side, opponent)` for what it does against the other side (Vs opponent). */
export const valOf = (row, sides, k) => (row.vs ? row.vs(sides[k], sides[k === 'A' ? 'B' : 'A']) : row.get(sides[k]));

/**
 * Where a row's value sits in the whole roster's range (0..1, fuller is better), as on the Sheet, so a bar
 * reads the same in every matchup. The range comes from every fighter with no build: `rget(view, c)` when the
 * row gives one (Vs rows give the plain stat behind what they deal), else the row's own getter. Null: no bar.
 */
export function rosterFill(row, value) {
  if (typeof value !== 'number') return null;
  const get = row.rget || (!row.vs && ((v, c) => row.get({ c, view: v, spec: emptySpec(c.id), caps: [], applied: [] })));
  if (!get) return null;
  return rosterPos(`pair:${row.label}`, get, value, !!row.less || row.kind === 'def');
}

export function Pair({ row, sides = ['A', 'B'] }) {
  const pc = usePair();
  const [ka, kb] = sides;
  const a = valOf(row, pc.pair, ka), b = valOf(row, pc.pair, kb);
  const score = row.score || ((x) => (row.less ? (x ? 1 / x : 0) : x));
  const sa = typeof a === 'number' ? score(a) : 0, sb = typeof b === 'number' ? score(b) : 0;
  const better = sa === sb ? null : sa > sb ? 'a' : 'b';
  // bars fill by the roster's range and stay muted; only the better side's lights up
  const fa = rosterFill(row, a), fb = rosterFill(row, b);
  const bar = (f) => (f == null ? null : { width: `${Math.max(3, f * 100)}%` });
  const fmt = row.fmt || F.int;
  const cell = (k, v) => (row.text ? row.text(pc.pair[k]) : typeof v === 'number'
    ? <Tap title={`${row.label}, ${nameParts(pc.pair[k].c.name)[0]}`} get={(s) => valOf(row, s, k)} fmt={fmt} kind={row.kind || 'int'} lessIsBetter={row.less} mark={false} />
    : (v ?? '–'));
  if (typeof a !== 'number' && typeof b !== 'number' && !row.text) {
    // words on both sides (skill names, "No armor"): no bars, the words get the room
    return <div className="pair txt"><span className="a">{a ?? '–'}</span><span className="n">{row.label}{row.small && <small>{row.small}</small>}</span><span className="b">{b ?? '–'}</span></div>;
  }
  return (
    <div className="pair">
      <span className={`a${better === 'a' ? ' w' : ''}`}>{cell(ka, a)}</span>
      <span className={`pb l${better === 'a' ? ' w' : ''}${fa == null ? ' none' : ''}`}>{fa != null && <i style={bar(fa)} />}</span>
      <span className="n">{row.label}{row.small && <small>{row.small}</small>}</span>
      <span className={`pb r${better === 'b' ? ' w' : ''}${fb == null ? ' none' : ''}`}>{fb != null && <i style={bar(fb)} />}</span>
      <span className={`b${better === 'b' ? ' w' : ''}`}>{cell(kb, b)}</span>
    </div>
  );
}

/** The phone's row: value | stat | value. */
export function PRow({ row }) {
  const pc = usePair();
  const a = valOf(row, pc.pair, 'A'), b = valOf(row, pc.pair, 'B');
  const score = row.score || ((x) => (row.less ? (x ? 1 / x : 0) : x));
  const better = typeof a === 'number' && typeof b === 'number' && a !== b ? (score(a) > score(b) ? 'a' : 'b') : null;
  const fmt = row.fmt || F.int;
  const cell = (k, v) => (row.text ? row.text(pc.pair[k]) : typeof v === 'number' ? <Tap title={row.label} get={(s) => valOf(row, s, k)} fmt={fmt} kind={row.kind || 'int'} lessIsBetter={row.less} mark={false} /> : (v ?? '–'));
  return <div className="prow"><span className={`a${better === 'a' ? ' w' : ''}`}>{cell('A', a)}</span><span className="n">{row.label}{row.small && <small>{row.small}</small>}</span><span className={`b${better === 'b' ? ' w' : ''}`}>{cell('B', b)}</span></div>;
}

const V = (get) => (s) => get(s.view, s);
const defRow = (label, get) => ({ label, get: V(get), fmt: F.def, kind: 'def', score: (x) => 1 / x });

/* ------------------------------------------------------------------ All stats: every Full stats row, paired */
const D = (pick) => (me, them) => pick(exchange(me, them));   // what a side deals to the other (Vs opponent)
const breaksOn = (me, them) => {
  if (!(them.view.armor > 0)) return 'No armor';
  const i = exchange(me, them).combo.perHit.findIndex(h => !h.armorReduced);
  return i < 0 ? 'Holds all 5' : `Hit ${i + 1}`;
};

/**
 * The sections Compare's and Vs opponent's All stats share, in one order. With `vs`, a damage row gives what
 * each side deals to the other (after its defenses and armor; `deal`), 5-hit taken is the other side's rush,
 * and the armor rows become where each side breaks the other's armor. The bars still fill by the
 * plain stat's place in the roster (`rget`).
 */
export function statSections({ vs = false, pair = null } = {}) {
  const dealt = (row, deal) => (vs ? { ...row, vs: deal, rget: (v, c) => row.get({ c, view: v, spec: emptySpec(c.id), caps: [], applied: [] }) } : row);
  const armored = vs && pair && (pair.A.view.armor > 0 || pair.B.view.armor > 0);
  const rush = armored
    // (a side without that hit, e.g. a giant's 5th, shows none rather than 0)
    ? [0, 1, 2, 3, 4].map(i => dealt({ label: `Rush hit ${i + 1}`, get: V(x => [x.rush, x.hit2, x.hit3, x.hit4, x.hit5][i]) },
      (me, them) => ([me.view.rush, me.view.hit2, me.view.hit3, me.view.hit4, me.view.hit5][i] ? exchange(me, them).combo.perHit[i]?.damage : null)))
    : [dealt({ label: 'Rush hits 1-3', get: V(x => x.rush) }, D(x => x.combo.perHit[0]?.damage)), dealt({ label: 'Rush hit 4', get: V(x => x.hit4) }, D(x => x.combo.perHit[3]?.damage)),
      dealt({ label: 'Rush hit 5', get: V(x => x.hit5) }, D(x => x.combo.perHit[4]?.damage))];
  return [
    { id: 'tough', title: 'Toughness', cls: '', small: vs ? 'against their attacks' : null, rows: [
      { label: 'HP', get: V(x => x.health) },
      vs ? { label: '5-hit taken', small: 'their rush, less is better', vs: (me, them) => exchange(them, me).combo.rush5Hit, rget: (v) => fiveHitTaken(v), less: true }
        : { label: '5-hit taken', small: 'less is better', get: V(fiveHitTaken), less: true },
      defRow('Melee defense', x => x.meleeDefenseStat), defRow('Blast defense', x => x.blastDefense), defRow('Ki-blast defense', x => x.energy),
      { label: 'Armor', get: V(x => x.armor), fmt: F.armor }, { label: 'Switch', get: V(x => x.switch), fmt: F.secs, less: true },
    ] },
    { id: 'melee', title: 'Melee', cls: 'off', small: vs ? 'dealt to them' : null, rows: [
      ...rush,
      dealt({ label: 'Rush 5-hit', get: V(x => x.rush5Hit) }, D(x => x.combo.rush5Hit)),
      ...(vs ? [] : [{ label: 'Rush 5-hit into armor', get: V(x => x.fiveHitAfterArmor) }]),
      ...[0, 1, 2].map(i => dealt({ label: `Smash, Charge Lv.${i + 1}`, get: (s) => gameMoves(s).smash[i] }, D(x => x.smash[i]?.v))),
      ...[0, 1, 2].map(i => dealt({ label: `Heavy Finish, Lv.${i + 1}`, get: (s) => gameMoves(s).heavyFinish[i] }, D(x => x.heavyFinish[i]?.v))),
      dealt({ label: 'Throw', get: V(x => x.throw) }, D(x => x.throw.v)),
      dealt({ label: 'Vanishing Attack', get: V(x => x.vanishingAttack) }, D(x => x.vanishingAttack)),
      dealt({ label: 'Dragon Smash', get: V(x => x.dragonSmash) }, D(x => x.dragonSmash)),
      dealt({ label: 'Lightning Attack', get: V(x => x.lightningAttack) }, D(x => x.lightningAttack)),
      vs ? { label: 'Breaks their armor on', vs: breaksOn } : { label: 'Armor break', small: 'hits, less is better', get: V(x => x.armorBreak), fmt: F.hits, less: true },
    ] },
    { id: 'chains', title: 'Rush Chains', cls: 'mov', custom: 'chains', vs, small: vs ? 'dealt to them' : 'full charge' },
    { id: 'kib', title: 'Ki blasts', cls: 'kib', small: vs ? 'dealt to them' : null, rows: [
      dealt({ label: 'Ki blast', get: V(x => x.kiBlastDmg) }, D(x => x.kiBlast.v)), { label: 'Ki blast limit', get: V(x => Math.min(x.kiBlastLimit, 999)), fmt: F.count },
      dealt({ label: 'Full volley', get: V(x => volley(x)) }, D(x => x.volley)), { label: 'Cost per shot', small: 'bars, less is better', get: V(x => x.kiBlastCost), fmt: F.bars, kind: 'dec', less: true },
      ...[0, 1, 2].map(i => dealt({ label: `Charged, Lv.${i + 1}`, get: (s) => gameMoves(s).charged?.damage[i] }, D(x => x.charged[i]?.v))),
      dealt({ label: 'Jump ki blast', get: (s) => gameMoves(s).jump?.damage }, D(x => x.jump)), dealt({ label: 'Dash ki blast', get: (s) => gameMoves(s).dash?.damage }, D(x => x.dash)),
    ] },
    { id: 'armor', title: 'Breaking armor', cls: 'armp', custom: vs ? 'vsarmor' : 'armor', small: vs ? 'as they stand now' : null },
    { id: 'res', title: 'Resources', cls: 'res', col: 2, rows: [
      { label: 'Starting ki', get: V(x => x.startingKi), fmt: (x) => `${+x.toFixed(2)} bars`, kind: 'dec' },
      { label: 'Ki charge', small: 'bars/s', get: V(x => x.kiCharge), fmt: F.dec2, kind: 'dec' }, { label: 'Ki regen', small: 'bars/s', get: V(x => x.kiRegen), fmt: F.dec, kind: 'dec' },
      { label: 'Ki refills to', get: V(x => x.kiRegenRange), fmt: (x) => `${x} bars` }, { label: 'Ki from hits', get: V(x => x.attackKiGain), fmt: F.dec, kind: 'dec' },
      { label: 'Skill gauge limit', get: V(x => x.skillLimit), fmt: String }, { label: 'Skill gauge per minute', get: V(x => parseFloat(x.skillRegen)), fmt: F.dec, kind: 'dec' },
    ] },
    { id: 'limits', title: 'Combat limits', cls: 'new', col: 2, rows: [
      { label: 'Follow-ups', get: (s) => s.c.moveset?.pursuits?.limit ?? 0, fmt: String },
      // each pursuit's uses with the build (Vanishing Break, Dragon Break); No where the fighter can't
      ...[['Vanishing Attack', 'vanishingAttack'], ['Lightning Attack', 'lightningAttack'], ['Dragon Homing', 'dragonHoming']].map(([l, k]) => ({ label: `${l} uses`, get: V(x => x.pursuitLimit[k]), fmt: (x) => (x ? String(x) : 'No') })),
      { label: 'Jump ki blasts', get: (s) => gameMoves(s).jump?.count, fmt: String }, { label: 'Dash ki blasts', get: (s) => gameMoves(s).dash?.count, fmt: String },
    ] },
    { id: 'spk', title: 'Sparking! Mode', cls: 'spk', col: 2, rows: [
      dealt({ label: 'Hyper Smash', get: (s) => gameMoves(s).hyperSmash }, D(x => x.hyperSmash.v)),
      { label: 'Violent Rush', get: (s) => (s.c.moveset?.unavailable?.includes('Violent Rush') ? 0 : 1), fmt: (x) => (x ? 'Yes' : 'No') },
      { label: 'Extra follow-ups', get: (s) => s.c.moveset?.pursuits?.sparkingAdd ?? 0, fmt: (x) => `+${x}` },
      { label: 'Sparking armor', get: (s) => (s.c.armor?.sparking ? 1 - s.c.armor.sparking.damageRate : 0), fmt: F.armor },
    ] },
    { id: 'cmd', title: 'Command list', cls: 'cmd', col: 2, custom: 'cmd', vs, small: vs ? 'dealt to them' : null },
    { id: 'mob', title: 'Mobility', cls: 'mob', col: 2, small: 'ki bars, less is better', rows: [
      { label: 'Short Dash', get: V(x => x.shortDashCost), fmt: F.bars, kind: 'dec', less: true },
      { label: 'Step-cancel dash', get: (s) => s.c.mobility?.stepCancelCost, fmt: F.bars, kind: 'dec', less: true },
      { label: 'Dragon Dash, per sec', get: (s) => s.c.mobility?.dragonDash?.perSecond, fmt: F.bars, kind: 'dec', less: true },
      { label: 'High-Speed Dragon Dash, per sec', get: (s) => s.c.mobility?.dragonDash?.highSpeedPerSecond, fmt: F.bars, kind: 'dec', less: true },
      { label: 'Z-Burst Dash', get: (s) => s.c.mobility?.zBurstDash?.start, fmt: F.bars, kind: 'dec', less: true },
      { label: 'Dragon Homing, per sec', get: (s) => s.c.mobility?.dragonHoming?.perSecond, fmt: F.bars, kind: 'dec', less: true },
    ] },
    { id: 'traits', title: 'Traits', cls: 'neutral', col: 2, custom: 'traits' },
  ];
}

/**
 * A mirrored row for moves that differ by side (Rush Chains, the Command list): each side's name with its
 * number on the inner edge, next to the centre label, so the two numbers read straight across; the better
 * number is green. `a`/`b`: { name, value (a node), n (number to compare), lines: [[name, value]] }.
 */
function Mirror({ label, sub = null, a, b }) {
  const better = typeof a?.n === 'number' && typeof b?.n === 'number' && a.n !== b.n ? (a.n > b.n ? 'a' : 'b') : null;
  const side = (x, k) => (!x ? <span className="no">None</span> : (
    <>
      <div className="mm"><span className="mn">{x.name}</span>{x.value != null && <b className={better === k ? 'w' : ''}>{x.value}</b>}</div>
      {(x.lines || []).map(([n, v]) => <div className="ml" key={n}><span>▸ {n}</span>{v != null && <b>{v}</b>}</div>)}
    </>
  ));
  return (
    <div className="mir">
      <div className="ma">{side(a, 'a')}</div>
      <div className="mc">{label}{sub}</div>
      <div className="mb">{side(b, 'b')}</div>
    </div>
  );
}

/** Rush Chains side by side; with `vs`, each side's damage after the other's melee defense. */
export function ChainsCmp({ vs = false }) {
  const pc = usePair();
  const A = moveset(pc.pair.A), B = moveset(pc.pair.B);
  const adj = { A: vs ? exchange(pc.pair.A, pc.pair.B).chain : (x) => x, B: vs ? exchange(pc.pair.B, pc.pair.A).chain : (x) => x };
  const of = (ch, k) => {
    if (!ch?.type) return null;
    const full = ch.dmg ? adj[k](ch.dmg.damage.at(-1)) : null;
    const fus = ch.dmg ? ch.dmg.followUps.filter(f => ch.followUps.includes(f.name)) : [];
    return { name: ch.type, n: full, value: full != null ? F.int(full) : null, lines: fus.map(f => [f.name + (f.flurry ? ' + ki blasts' : ''), F.int(f.hits.reduce((s, h) => s + adj[k](h), 0))]) };
  };
  const text = (x) => (x ? { name: x } : null);
  return (
    <>
      {[0, 1, 2, 3].map(i => <Mirror key={i} label={`Chain ${i + 1}`} sub={<Hits n={i + 1} />} a={of(A.chains[i], 'A')} b={of(B.chains[i], 'B')} />)}
      <Mirror label="Step-In" a={text(A.stepIn)} b={text(B.stepIn)} />
      <Mirror label="Perception" a={text(perceptionName(A.counter))} b={text(perceptionName(B.counter))} />
      <Mirror label="Grand Slash" a={A.grand ? { name: A.grand.allowed.length ? A.grand.allowed.join(', ') : 'No follow-ups' } : null} b={B.grand ? { name: B.grand.allowed.length ? B.grand.allowed.join(', ') : 'No follow-ups' } : null} />
      {(A.unavailable.length > 0 || B.unavailable.length > 0) && <Mirror label="Can't use" a={text(A.unavailable.join(', ') || 'Nothing')} b={text(B.unavailable.join(', ') || 'Nothing')} />}
    </>
  );
}

function ArmorCmp() {
  const pc = usePair();
  const [tab, setTab] = useState('n');
  const at = (s) => { const up = s.c.sparking?.armorBreakLevel ?? 3; return armorBreaks(s.view, (tab === 'sp' ? up : 0) - (s.spec.sparking ? up : 0)) || []; };
  const ra = at(pc.pair.A), rb = at(pc.pair.B);
  const sh = (r) => ['hyper', 'sparking', 'hyperSparking'].map(k => <i key={k} className={`arm${r?.[k] ? ' brk' : ''}`} />);
  return (
    <>
      <div className="abtabs"><button className={tab === 'n' ? 'on' : ''} onClick={() => setTab('n')}>Normal</button><button className={`sp${tab === 'sp' ? ' on' : ''}`} onClick={() => setTab('sp')}>In Sparking!</button></div>
      <div className="abcmp h"><span>Shields: Hyper Armor, Sparking Armor, Hyper in Sparking</span><span>{nameParts(pc.pair.A.c.name)[0]}</span><span>{nameParts(pc.pair.B.c.name)[0]}</span></div>
      {ra.map((r, i) => <div className="abcmp" key={r.label}><span>{r.label}</span><span>{sh(r)}</span><span>{sh(rb[i])}</span></div>)}
      <div className="abnote">Cracked: the attack breaks that armor. Grey: the armor holds and takes its share off.</div>
    </>
  );
}

/**
 * Vs opponent's Breaking armor: only these two fighters, as they stand (Sparking, skills): each side's attacks
 * against the other's armor right now, the rush as the hit that breaks it. Shown in the Exchange and All stats.
 */
export function VsArmor() {
  const pc = usePair();
  const { A, B } = pc.pair;
  const armorOf = (s) => (s.view.armor > 0 ? `${s.spec.sparking && s.c.armor?.sparking ? 'Sparking Armor' : s.c.armor?.base?.type || 'Armor'} (${Math.round(s.view.armor * 100)}% off)` : null);
  // the Exchange's marks: a cracked green shield breaks the armor, a grey one is held by it
  const brk = (b) => (b ? <span className="ok"><i className="arm brk" />Breaks</span> : <span className="no"><i className="arm" />Holds</span>);
  const block = (att, def, title) => {
    const arm = armorOf(def);
    const nD = nameParts(def.c.name)[0];
    if (!arm) return <div className="vab"><div className="vabh">{title}</div><div className="vabn">{nD} has no armor now: every hit lands in full.</div></div>;
    const x = exchange(att, def);
    const i = x.combo.perHit.findIndex(h => !h.armorReduced);
    const rows = [
      ['Rush combo', i < 0 ? <span className="no"><i className="arm" />Holds every hit</span> : <span className="ok"><i className="arm brk" />Breaks on hit {i + 1}</span>],
      ['Smash Lv.1', x.smash[0] ? brk(!x.smash[0].held) : '–'],
      ['Ki blast', brk(!x.kiBlast.held)],
      ['Charged ki blast', x.charged.length ? brk(!(x.charged[2] || x.charged.at(-1)).held) : '–'],
    ];
    return (
      <div className="vab">
        <div className="vabh">{title}<em>{nD}: {arm}</em></div>
        {rows.map(([l, v]) => <div className="vabr" key={l}><span>{l}</span>{v}</div>)}
      </div>
    );
  };
  return (
    <>
      <div className="vabs">{block(A, B, 'Your attacks')}{block(B, A, 'Their attacks')}</div>
      <div className="abnote">Higher smash charges, rush hit 5, throws, blasts and ultimates always break armor. Sparking gives 25% armor.</div>
    </>
  );
}

/** The Command list side by side: B1, B2, the ultimate (with `vs`, damage dealt to the other side), then the skills. */
function CmdCmp({ vs = false }) {
  const pc = usePair();
  const other = { A: 'B', B: 'A' };
  const rows = ['Super 1', 'Super 2', 'Ultimate'].map(slot => {
    const find = (s) => blastsOf(s.c).find(x => x.slot === slot && !x.variant);
    const get = (k) => (s) => (!find(s[k]) ? null : vs ? exchange(s[k], s[other[k]]).blasts.find(y => y.b.slot === slot && !y.b.variant)?.deal : blastDamage(s[k], find(s[k])).damage);
    const side = (k) => { const b = find(pc.pair[k]); return b ? { name: b.name, n: get(k)(pc.pair), value: <Tap title={b.name} get={get(k)} mark={false} /> } : null; };
    return { slot, lab: slot === 'Ultimate' ? 'ULT' : slot === 'Super 1' ? 'B1' : 'B2', a: side('A'), b: side('B') };
  });
  const skill = (s, n) => { const k = skillOf(s.c, n); return k ? { name: k.name, value: `${k.stockCost} pts` } : null; };
  return (
    <>
      {rows.map(r => <Mirror key={r.slot} label={<span className={`slot ${r.lab === 'ULT' ? 'u' : 'b'}`}>{r.lab}</span>} a={r.a} b={r.b} />)}
      {[1, 2].map(n => <Mirror key={n} label={<span className="slot s">S{n}</span>} a={skill(pc.pair.A, n)} b={skill(pc.pair.B, n)} />)}
    </>
  );
}

function TraitsCmp() {
  const pc = usePair();
  const t = (s) => { const x = [...traitChips(s.c).map(([n]) => n), ...(s.c.moveset?.abilities || []).filter(a => a !== 'Hyper armor')]; return x.length ? <span className="tags">{x.map(n => <span key={n}>{n}</span>)}</span> : <span className="no">None</span>; };
  const kt = (s) => { const tags = [...(s.c.kiBlasts?.normal?.tags || []), ...(s.c.kiBlasts?.charged?.standing?.tags || []).map(x => `charged ${x}`)]; return tags.length ? <span className="tags">{[...new Set(tags)].map(n => <span key={n}>{n}</span>)}</span> : <span className="no">Standard</span>; };
  return (<><div className="mvcmp h"><span></span><span>{nameParts(pc.pair.A.c.name)[0]}</span><span>{nameParts(pc.pair.B.c.name)[0]}</span></div><div className="mvcmp"><span>Traits</span><span>{t(pc.pair.A)}</span><span>{t(pc.pair.B)}</span></div><div className="mvcmp"><span>Ki blasts</span><span>{kt(pc.pair.A)}</span><span>{kt(pc.pair.B)}</span></div></>);
}

function sectionBody(s, phone) {
  if (s.custom === 'chains') return <ChainsCmp vs={s.vs} />;
  if (s.custom === 'armor') return <ArmorCmp />;
  if (s.custom === 'vsarmor') return <VsArmor />;
  if (s.custom === 'cmd') return <CmdCmp vs={s.vs} />;
  if (s.custom === 'traits') return <TraitsCmp />;
  return s.rows.map(r => <Pair key={r.label} row={r} />);
}

/** Leads: how many paired stats each side is better on. */
export function leads(pair) {
  let a = 0, b = 0;
  const ea = [], eb = [];
  for (const s of statSections()) for (const r of s.rows || []) {
    const x = r.get(pair.A), y = r.get(pair.B);
    if (typeof x !== 'number' || typeof y !== 'number' || x === y) continue;
    const score = r.score || ((v) => (r.less ? (v ? 1 / v : 0) : v));
    const gap = Math.abs(score(x) - score(y)) / (Math.max(Math.abs(score(x)), Math.abs(score(y))) || 1);
    if (score(x) > score(y)) { a++; ea.push([r.label, gap]); } else { b++; eb.push([r.label, gap]); }
  }
  const top = (l) => l.sort((p, q) => q[1] - p[1]).slice(0, 5).map(([n]) => n);
  return { a, b, edgeA: top(ea), edgeB: top(eb) };
}

export function AllStats({ phone, sections = null }) {
  const pc = usePair();
  const [only, setOnly] = useState(true);
  const secs = sections || statSections();
  if (phone) {
    return (
      <>
        <PhoneSectionNav items={secs} prefix="cmp-" onJump={(id) => document.getElementById(`cmp-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          extra={<span className="only">Only differences<Switch on={only} onChange={setOnly} label="Only differences" /></span>} />
        <div className="pstack">
          {secs.map(s => {
            if (s.custom) return <div className={`plate ${s.cls}`} key={s.id} id={`cmp-${s.id}`}><h5>{s.title}</h5>{sectionBody(s, true)}</div>;
            const diff = s.rows.filter(r => !only || valOf(r, pc.pair, 'A') !== valOf(r, pc.pair, 'B'));
            const same = s.rows.filter(r => !diff.includes(r));
            const show = (r) => { const v = valOf(r, pc.pair, 'A'); return typeof v === 'number' ? (r.fmt || F.int)(v) : (v ?? '–'); };
            return (
              <div className={`plate ${s.cls}`} key={s.id} id={`cmp-${s.id}`}>
                <h5>{s.title}{s.small && <small className="h5s">{s.small}</small>}</h5>
                {diff.map(r => <PRow key={r.label} row={r} />)}
                {same.length > 0 && <div className="same">Same for both: {same.map((r, i) => <b key={r.label}>{i ? ', ' : ''}{r.label} {show(r)}</b>)}</div>}
              </div>
            );
          })}
        </div>
      </>
    );
  }
  const col = (n) => secs.filter(s => (s.col || 1) === n).map(s => (
    <div className={`plate ${s.cls}`} key={s.id}><h5>{s.title}{s.small && <small className="h5s">{s.small}</small>}</h5>{sectionBody(s, false)}</div>
  ));
  return <div className="cmpall"><div>{col(1)}</div><div>{col(2)}</div></div>;
}

/* ------------------------------------------------------------------ a side's build panel (Compare, Vs opponent) */
export function SideBuild({ side, title, ruleset, onChange, onEditCaps, other, onClose, cls = '' }) {
  const lb = side.c.leagueBuilds;
  const chk = buildCheck(side.spec.caps, ruleset);
  const same = (ids) => ids.length === side.spec.caps.length && ids.every(id => side.spec.caps.includes(id));
  return (
    <div className={`plate opp sidebuild ${cls}`}>
      <h5>{title}{onClose && <button className="x" onClick={onClose}>Done</button>}</h5>
      <div className="sublbl"><span>Skills and Sparking</span></div>
      <SkillSwitches side={side} onChange={onChange} />
      <div className="caps-wrap"><CapsuleRows side={side} ruleset={ruleset} onEdit={onEditCaps} /></div>
      {lb?.top?.length > 0 && (
        <>
          <div className="sublbl" style={{ marginTop: 12 }}><span>League builds</span><em>top {lb.top.length} of {lb.builds}, from {lb.lineups} lineups</em></div>
          <div className="lb">
            {lb.top.map((b, i) => {
              const caps = b.capsules.map(id => capsuleById.get(id)).filter(Boolean);
              const byType = new Map();
              for (const x of caps) byType.set(x.type, (byType.get(x.type) || 0) + x.cost);
              const on = same(b.capsules);
              return (
                <button key={i} className={on ? 'on' : ''} onClick={() => onChange({ ...side.spec, caps: [...b.capsules] })} aria-pressed={on}>
                  <div className="lbh"><span>{b.teams.join(', ')}</span><em>{b.uses} lineup{b.uses === 1 ? '' : 's'}, Season {b.season}</em></div>
                  <div className="catbar">{[...byType].map(([t, n]) => <i key={t} className={typeClass(t)} style={{ flex: n }} />)}</div>
                  {!on && <div className="tags">{caps.map(x => <span key={x.id} className={`cm ${typeClass(x.type)}`}>{x.name}</span>)}</div>}
                </button>
              );
            })}
          </div>
        </>
      )}
      <div className="fl" style={{ marginTop: 8 }}><small>Or</small><button onClick={() => onChange({ ...side.spec, caps: [] })}>No capsules</button>{other && <button onClick={() => onChange({ ...side.spec, caps: [...other.spec.caps] })}>Same as {nameParts(other.c.name)[0]}'s</button>}</div>
      {chk.problems.length > 0 && <div className="bdhint">Leave a rule broken to see the numbers anyway; the ruleset only warns.</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ the two-fighter controls (Compare, Vs opponent) */
/**
 * One bar for both fighters, under the view switch: Loadout (skills, Sparking, capsules) and Conditions, each opening a panel for both sides at once
 * (side by side on a desktop; on a phone, one fighter at a time with a switch between the two).
 */
export function PairControls({ pair, setSpec, openPicker, ruleset, resetSits }) {
  const phone = usePhone();
  const [setup, setSetup] = useState(false);
  const [cond, setCond] = useState(!!(pair.A.spec.sit || pair.B.spec.sit));
  const [k, setK] = useState('A');
  const name = (s) => nameParts(pair[s].c.name)[0];
  const build = (s) => (
    <SideBuild key={s} side={pair[s]} other={pair[s === 'A' ? 'B' : 'A']} title={name(s)} cls={s === 'A' ? 'sa' : 'sb'} ruleset={ruleset}
      onChange={setSpec(s)} onEditCaps={() => openPicker('caps', s)} />
  );
  return (
    <>
      <div className="condbar">
        <button className={`chip ghost${setup ? ' on' : ''}`} aria-expanded={setup} onClick={() => setSetup(!setup)}>Loadout {setup ? '▴' : '▾'}</button>
        <button className={`chip ghost cnd${cond ? ' on' : ''}`} aria-expanded={cond} onClick={() => setCond(!cond)}>Conditions {cond ? '▴' : '▾'}</button>
        <InEffect sides={[[pair.A.c.name, pair.A], [pair.B.c.name, pair.B]]} />
      </div>
      {setup && (phone ? (
        <div className="setup">
          <div className="sidesw">{['A', 'B'].map(s => <button key={s} className={`${s === 'A' ? 'sa' : 'sb'}${k === s ? ' on' : ''}`} onClick={() => setK(s)}>{name(s)}</button>)}</div>
          {build(k)}
        </div>
      ) : <div className="setup two">{build('A')}{build('B')}</div>)}
      {cond && (
        <div className="sit">
          <Conditions side={pair.A} onChange={setSpec('A')} who={name('A')} />
          {!phone && <div className="sitmid"><button className="resetb" onClick={resetSits}>Reset both to full</button><em>The map and events show here only when an equipped capsule needs them.</em></div>}
          <Conditions side={pair.B} onChange={setSpec('B')} who={name('B')} right />
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ similar fighters */
function Similar({ id, name, onPick }) {
  const { same, other } = similarFighters(id);
  const row = (o) => (
    <button className="simrow" key={o.c.id} onClick={() => onPick(o.c.id)}>
      <img src={faceUrl(o.c)} alt="" />
      <div><div className="snm">{o.c.name}<i>{o.c.dp}</i></div><div className="tags">{o.diffs.length ? o.diffs.slice(0, 3).map(d => <span key={d.label}>{d.label} {d.kind === 'def' ? F.def(d.value) : d.kind === 'rate' ? F.dec2(d.value) : d.kind === 'hits' ? F.hits(d.value) : F.int(d.value)}</span>) : <span className="same0">Same core stats</span>}</div></div>
      <span className="act">Compare</span>
    </button>
  );
  return (
    <div className="plate new">
      <h5>Fighters like {name}</h5>
      <div className="sublbl"><span>Same DP, nearly the same stats</span><em>differs in</em></div>
      {same.map(row)}
      <div className="sublbl" style={{ marginTop: 12 }}><span>Closest at other DPs</span><em>differs in</em></div>
      {other.map(row)}
      <div className="bdhint" style={{ marginTop: 8 }}>Tap one to put them on the right side. Values are without capsules.</div>
    </div>
  );
}

/* ------------------------------------------------------------------ the view */
const SUMMARY = (pair) => [
  { title: 'Toughness', cls: '', rows: [{ label: '5-hit taken', small: 'less is better', get: V(fiveHitTaken), less: true }, defRow('Melee defense', x => x.meleeDefenseStat)], hp: true },
  { title: 'Offense', cls: 'off', rows: [{ label: 'Rush 5-hit', get: V(x => x.rush5Hit) }, { label: 'Smash', get: V(x => x.smash) }, { label: 'Throw', get: V(x => x.throw) }, { label: 'Full ki volley', get: V(x => volley(x)) }] },
  { title: 'Resources', cls: 'res', rows: [{ label: 'Ki charge', get: V(x => x.kiCharge), fmt: F.dec2, kind: 'dec' }, { label: 'Ki regen', get: V(x => x.kiRegen), fmt: F.dec, kind: 'dec' }, { label: 'Skill gauge limit', get: V(x => x.skillLimit), fmt: String }] },
];

export function HpPair() {
  const pc = usePair();
  const bars = (h) => { const n = Math.max(5, Math.ceil(h / 10000)); return Array.from({ length: n }, (_, i) => <i key={i} className={i < Math.floor(h / 10000) ? 'f' : i === Math.floor(h / 10000) && h % 10000 ? 'part' : 'cap'} style={i === Math.floor(h / 10000) && h % 10000 ? { '--p': `${(h % 10000) / 100}%` } : undefined} />); };
  const a = pc.pair.A.view.health, b = pc.pair.B.view.health;
  return <div className="hpair"><span className="bars hp l">{bars(a)}</span><span style={{ textAlign: 'center', fontSize: 12 }}>HP<br /><b>{a === b ? `${F.int(a)} each` : `${F.int(a)} | ${F.int(b)}`}</b></span><span className="bars hp">{bars(b)}</span></div>;
}

export function CompareView({ pair, mode, setMode, setSpec, openPicker, ruleset, swapIn, resetSits, qp = () => null }) {
  const phone = usePhone();
  const L = leads(pair);
  const nA = nameParts(pair.A.c.name)[0], nB = nameParts(pair.B.c.name)[0];
  const change = (k) => <ChangeButton onClick={() => openPicker('char', k)} title={k === 'B' ? 'Change the right side' : 'Change fighter'} />;
  return (
    <>
      {phone ? (
        <>
          <div className="cbar">
            <span className="l"><span className="cav"><img src={faceUrl(pair.A.c)} alt="" /></span><span><Name parts={nameParts(pair.A.c.name)} /></span></span>
            <span className="r"><span className="cav"><img src={faceUrl(pair.B.c)} alt="" /></span><span><Name parts={nameParts(pair.B.c.name)} /></span></span>
            <span className="cvs" aria-hidden="true"><b>VS</b></span>
          </div>
          <div className="cbar-acts">{change('A')}{change('B')}</div>
        </>
      ) : <VsHead pair={pair} chipsA={buildChips(pair.A)} chipsB={buildChips(pair.B)} changeA={change('A')} changeB={change('B')} />}
      <div className="qpanchor">{qp('A')}{qp('B')}</div>
      <Modes value={mode} options={[['summary', 'Summary'], ['all', 'All stats']]} onChange={setMode}>
        <em>{nA} leads on <b>{L.a}</b>, {nB} on <b>{L.b}</b></em>
      </Modes>
      <PairControls pair={pair} setSpec={setSpec} openPicker={openPicker} ruleset={ruleset} resetSits={resetSits} />
      {mode === 'all' ? (
        <div className={phone ? '' : 'cmpwrap'}><AllStats phone={phone} /></div>
      ) : (
        <div className="cmpgrid">
          <div className="cmpcol">
            {SUMMARY(pair).map(s => (
              <div className={`plate ${s.cls}`} key={s.title}><h5>{s.title}</h5>{s.hp && <HpPair />}{s.rows.map(r => <Pair key={r.label} row={r} />)}</div>
            ))}
            <div className="plate cmd"><h5>Command list</h5><CmdCmp phone={phone} /></div>
          </div>
          <div className="cmpcol">
            <div className="plate neutral">
              <h5>Verdict</h5>
              <div className="verdict">{nA} leads on <b>{L.a}</b> stats, {nB} on <b>{L.b}</b>.</div>
              <div className="strong">
                <div><small>{nA}'s edge</small><div className="tags">{L.edgeA.map(x => <span key={x}>{x}</span>)}</div></div>
                <div><small>{nB}'s edge</small><div className="tags">{L.edgeB.map(x => <span key={x}>{x}</span>)}</div></div>
              </div>
            </div>
            <Similar id={pair.A.c.id} name={pair.A.c.name} onPick={swapIn} />
          </div>
        </div>
      )}
    </>
  );
}
