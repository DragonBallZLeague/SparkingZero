// Compare: two fighters side by side, each with its own build. Summary pairs the main stats; All stats
// pairs every Full stats row. Also the pieces Vs opponent shares: the two-fighter header, paired rows,
// All stats and a side's build panel.
import React, { useState } from 'react';
import {
  artUrl, faceUrl, nameParts, isGiant, figHeight, gameMoves, moveset, chainTypes, armorBreaks, fiveHitTaken, volley, perceptionName,
  similarFighters, skillOf, blastsOf, blastDamage, toggleable, typeClass, capsuleById, buildCheck, emptySpec, exchange,
} from './model.js';
import { Tap, Modes, Name, Switch, usePhone, usePair } from './ui.jsx';
import { ClassChip, CapsuleRows, traitChips, ChangeButton } from './sheet.jsx';
import { Hits } from './moves.jsx';
import { F } from './format.js';

/* ------------------------------------------------------------------ the two-fighter header */
export function VsHead({ pair, chipsA, chipsB, actionsA, actionsB }) {
  const phone = usePhone();
  const fig = (side) => (
    <div className={`vfig${phone ? ' c' : ''}`}>
      <img src={artUrl(side.c.id)} alt="" className={isGiant(side.c) ? 'giant' : ''} style={{ '--fh': figHeight(side.c) }} />
    </div>
  );
  return (
    <div className="vshead">
      <div className="vside l">{fig(pair.A)}<div className="who"><div className="nm"><Name parts={nameParts(pair.A.c.name)} br={!phone} /></div>{!phone && <div className="chips">{chipsA}</div>}{actionsA}</div></div>
      <div className="vside r">{fig(pair.B)}<div className="who"><div className="nm"><Name parts={nameParts(pair.B.c.name)} br={!phone} /></div>{!phone && <div className="chips" style={{ justifyContent: 'flex-end' }}>{chipsB}</div>}{actionsB}</div></div>
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

export function Pair({ row, sides = ['A', 'B'] }) {
  const pc = usePair();
  const [ka, kb] = sides;
  const a = valOf(row, pc.pair, ka), b = valOf(row, pc.pair, kb);
  const score = row.score || ((x) => (row.less ? (x ? 1 / x : 0) : x));
  const sa = typeof a === 'number' ? score(a) : 0, sb = typeof b === 'number' ? score(b) : 0;
  const top = Math.max(sa, sb) || 1;
  const better = sa === sb ? null : sa > sb ? 'a' : 'b';
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
      <span className="pb l"><i style={{ width: `${(sa / top) * 80}%` }} /></span>
      <span className="n">{row.label}{row.small && <small>{row.small}</small>}</span>
      <span className="pb r"><i style={{ width: `${(sb / top) * 80}%` }} /></span>
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
export function statSections() {
  return [
    { id: 'tough', title: 'Toughness', cls: '', rows: [
      { label: 'HP', get: V(x => x.health) }, { label: '5-hit taken', small: 'less is better', get: V(fiveHitTaken), less: true },
      defRow('Melee defense', x => x.meleeDefenseStat), defRow('Blast defense', x => x.blastDefense), defRow('Ki-blast defense', x => x.energy),
      { label: 'Armor', get: V(x => x.armor), fmt: F.armor }, { label: 'Switch', get: V(x => x.switch), fmt: F.secs, less: true },
    ] },
    { id: 'melee', title: 'Melee', cls: 'off', rows: [
      { label: 'Rush hits 1-3', get: V(x => x.rush) }, { label: 'Rush hit 4', get: V(x => x.hit4) }, { label: 'Rush hit 5', get: V(x => x.hit5) },
      { label: 'Rush 5-hit', get: V(x => x.rush5Hit) }, { label: 'Rush 5-hit into armor', get: V(x => x.fiveHitAfterArmor) },
      ...[0, 1, 2].map(i => ({ label: `Smash, Charge Lv.${i + 1}`, get: (s) => gameMoves(s).smash[i] })),
      ...[0, 1, 2].map(i => ({ label: `Heavy Finish, Lv.${i + 1}`, get: (s) => gameMoves(s).heavyFinish[i] })),
      { label: 'Throw', get: V(x => x.throw) }, { label: 'Pursuit', get: V(x => x.pursuit) },
      { label: 'Armor break', small: 'hits, less is better', get: V(x => x.armorBreak), fmt: F.hits, less: true },
    ] },
    { id: 'chains', title: 'Rush Chains', cls: 'mov', custom: 'chains' },
    { id: 'kib', title: 'Ki blasts', cls: 'kib', rows: [
      { label: 'Ki blast', get: V(x => x.kiBlastDmg) }, { label: 'Ki blast limit', get: V(x => Math.min(x.kiBlastLimit, 999)), fmt: F.count },
      { label: 'Full volley', get: V(x => volley(x)) }, { label: 'Cost per shot', small: 'bars, less is better', get: V(x => x.kiBlastCost), fmt: F.bars, kind: 'dec', less: true },
      ...[0, 1, 2].map(i => ({ label: `Charged, Lv.${i + 1}`, get: (s) => gameMoves(s).charged?.damage[i], text: null, shots: true })),
      { label: 'Jump ki blast', get: (s) => gameMoves(s).jump?.damage }, { label: 'Dash ki blast', get: (s) => gameMoves(s).dash?.damage },
    ] },
    { id: 'armor', title: 'Breaking armor', cls: 'armp', custom: 'armor' },
    { id: 'res', title: 'Resources', cls: 'res', col: 2, rows: [
      { label: 'Starting ki', get: V(x => x.startingKi), fmt: (x) => `${+x.toFixed(2)} bars`, kind: 'dec' },
      { label: 'Ki charge', small: 'bars/s', get: V(x => x.kiCharge), fmt: F.dec2, kind: 'dec' }, { label: 'Ki regen', small: 'bars/s', get: V(x => x.kiRegen), fmt: F.dec, kind: 'dec' },
      { label: 'Ki refills to', get: V(x => x.kiRegenRange), fmt: (x) => `${x} bars` }, { label: 'Ki from hits', get: V(x => x.attackKiGain), fmt: F.dec, kind: 'dec' },
      { label: 'Skill gauge limit', get: V(x => x.skillLimit), fmt: String }, { label: 'Skill gauge per minute', get: V(x => parseFloat(x.skillRegen)), fmt: F.dec, kind: 'dec' },
    ] },
    { id: 'limits', title: 'Combat limits', cls: 'new', col: 2, rows: [
      { label: 'Follow-ups', get: (s) => s.c.moveset?.pursuits?.limit ?? 0, fmt: String },
      ...[['Vanishing Attack', 'vanishingAttack'], ['Lightning Attack', 'lightningAttack'], ['Dragon Homing', 'dragonHoming']].map(([l, k]) => ({ label: l, get: (s) => (s.c.moveset?.pursuits?.[k] === false ? 0 : 1), fmt: (x) => (x ? 'Yes' : 'No') })),
      { label: 'Jump ki blasts', get: (s) => gameMoves(s).jump?.count, fmt: String }, { label: 'Dash ki blasts', get: (s) => gameMoves(s).dash?.count, fmt: String },
    ] },
    { id: 'spk', title: 'Sparking! Mode', cls: 'spk', col: 2, rows: [
      { label: 'Hyper Smash', get: (s) => gameMoves(s).hyperSmash },
      { label: 'Violent Rush', get: (s) => (s.c.moveset?.unavailable?.includes('Violent Rush') ? 0 : 1), fmt: (x) => (x ? 'Yes' : 'No') },
      { label: 'Extra follow-ups', get: (s) => s.c.moveset?.pursuits?.sparkingAdd ?? 0, fmt: (x) => `+${x}` },
      { label: 'Sparking armor', get: (s) => (s.c.armor?.sparking ? 1 - s.c.armor.sparking.damageRate : 0), fmt: F.armor },
    ] },
    { id: 'cmd', title: 'Command list', cls: 'cmd', col: 2, custom: 'cmd' },
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

/** Rush Chains side by side; with `vs`, each side's damage after the other's melee defense. */
export function ChainsCmp({ vs = false }) {
  const pc = usePair();
  const A = moveset(pc.pair.A), B = moveset(pc.pair.B);
  const nA = nameParts(pc.pair.A.c.name)[0], nB = nameParts(pc.pair.B.c.name)[0];
  const adj = { A: vs ? exchange(pc.pair.A, pc.pair.B).chain : (x) => x, B: vs ? exchange(pc.pair.B, pc.pair.A).chain : (x) => x };
  const cellOf = (ch, k) => (!ch?.type ? <span className="no">None</span> : (
    <>
      <span className="ctype">{ch.type}</span>
      {ch.dmg && <b className="cd">{ch.dmg.damage.length > 1 && <em>Lv.{ch.dmg.damage.length}</em>}{F.int(adj[k](ch.dmg.damage.at(-1)))}</b>}
      {ch.dmg && <span className="fu">{ch.dmg.followUps.filter(f => ch.followUps.includes(f.name)).map(f => <span key={f.name}>{f.name}<b>{F.int(f.hits.reduce((s, h) => s + adj[k](h), 0))}</b>{f.flurry && <small>+ ki blasts</small>}</span>)}</span>}
    </>
  ));
  return (
    <>
      <div className="mvcmp h"><span>{vs ? 'Full charge, dealt' : 'Full charge'}</span><span>{nA}</span><span>{nB}</span></div>
      {[0, 1, 2, 3].map(i => (
        <div className="mvcmp" key={i}><span>Chain {i + 1}<Hits n={i + 1} /></span><span>{cellOf(A.chains[i], 'A')}</span><span>{cellOf(B.chains[i], 'B')}</span></div>
      ))}
      <div className="mvcmp"><span>Step-In</span><span><span className="ctype">{A.stepIn || 'None'}</span></span><span><span className="ctype">{B.stepIn || 'None'}</span></span></div>
      <div className="mvcmp"><span>Perception</span><span><span className="ctype">{perceptionName(A.counter)}</span></span><span><span className="ctype">{perceptionName(B.counter)}</span></span></div>
      <div className="mvcmp"><span>Grand Slash</span>{[A, B].map((m, i) => <span key={i}>{m.grand && m.grand.allowed.length ? <span className="fu">{m.grand.allowed.map(f => <span key={f}>{f}</span>)}</span> : <span className="no">No follow-ups</span>}</span>)}</div>
      {(A.unavailable.length > 0 || B.unavailable.length > 0) && <div className="mvcmp"><span>Can't use</span>{[A, B].map((m, i) => <span key={i}>{m.unavailable.length ? <span className="tags">{m.unavailable.map(x => <span key={x}>{x}</span>)}</span> : <span className="no">None</span>}</span>)}</div>}
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

function CmdCmp({ phone }) {
  const pc = usePair();
  const nA = nameParts(pc.pair.A.c.name)[0], nB = nameParts(pc.pair.B.c.name)[0];
  const rows = ['Super 1', 'Super 2', 'Ultimate'].map(slot => {
    const ba = blastsOf(pc.pair.A.c).find(b => b.slot === slot && !b.variant), bb = blastsOf(pc.pair.B.c).find(b => b.slot === slot && !b.variant);
    const get = (k, b) => (s) => (b ? blastDamage(s[k], blastsOf(s[k].c).find(x => x.slot === slot && !x.variant)).damage : null);
    const da = ba && get('A', ba)(pc.pair), db = bb && get('B', bb)(pc.pair);
    return { slot, lab: slot === 'Ultimate' ? 'ULT' : slot === 'Super 1' ? 'B1' : 'B2', ba, bb, da, db, ga: get('A', ba), gb: get('B', bb) };
  });
  const skills = [1, 2].map(n => ({ n, a: skillOf(pc.pair.A.c, n), b: skillOf(pc.pair.B.c, n) }));
  if (phone) {
    return (
      <>
        {rows.map(r => <div className="pcmd" key={r.slot}><span className={`slot ${r.lab === 'ULT' ? 'u' : 'b'}`}>{r.lab}</span><span>{r.ba?.name}<Tap title={r.ba?.name} get={r.ga} className={r.da > r.db ? 'w' : ''} mark={false} /></span><span>{r.bb?.name}<Tap title={r.bb?.name} get={r.gb} className={r.db > r.da ? 'w' : ''} mark={false} /></span></div>)}
        {skills.map(s => <div className="pcmd" key={s.n}><span className="slot s">S{s.n}</span><span>{s.a?.name}</span><span>{s.b?.name}</span></div>)}
      </>
    );
  }
  return (
    <>
      <div className="mvhead"><span></span><span>Move</span><span>{nA}</span><span>{nB}</span></div>
      {rows.map(r => (
        <div className="mvpair" key={r.slot}><span className={`slot ${r.lab === 'ULT' ? 'u' : 'b'}`}>{r.lab}</span><span>{r.ba?.name}<small>{r.bb?.name}</small></span>
          <span style={r.da > r.db ? { color: 'var(--win)' } : undefined}><Tap title={r.ba?.name} get={r.ga} mark={false} /></span>
          <span style={r.db > r.da ? { color: 'var(--win)' } : undefined}><Tap title={r.bb?.name} get={r.gb} mark={false} /></span></div>
      ))}
      {skills.map(s => <div className="mvpair" key={s.n}><span className="slot s">S{s.n}</span><span>{s.a?.name}<small>{s.b?.name}</small></span><span>{s.a?.stockCost} pts</span><span>{s.b?.stockCost} pts</span></div>)}
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
  if (s.custom === 'cmd') return <CmdCmp phone={phone} />;
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
        <div className="onlybar"><span className="only">Only differences<Switch on={only} onChange={setOnly} label="Only differences" /></span></div>
        <div className="jump">{secs.map(s => <button key={s.id} onClick={() => document.getElementById(`cmp-${s.id}`)?.scrollIntoView({ behavior: 'smooth' })}>{s.title.replace('! Mode', '!')}</button>)}</div>
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
export function SideBuild({ side, title, ruleset, onChange, onEditCaps, other, onClose }) {
  const lb = side.c.leagueBuilds;
  const chk = buildCheck(side.spec.caps, ruleset);
  const same = (ids) => ids.length === side.spec.caps.length && ids.every(id => side.spec.caps.includes(id));
  return (
    <div className="plate opp sidebuild">
      <h5>{title}{onClose && <button className="x" onClick={onClose}>Done</button>}</h5>
      <div className="sublbl"><span>Skills and Sparking</span></div>
      {[1, 2].map(slot => {
        const s = skillOf(side.c, slot);
        if (!s) return null;
        const can = toggleable(s);
        return <div className="tgl" key={slot}><span className="slot s">S{slot}</span>{s.name}{can ? <Switch on={!!side.spec.skills?.[slot]} label={s.name} onChange={(on) => onChange({ ...side.spec, skills: { ...side.spec.skills, [slot]: on } })} /> : <em className="na">No stat effect</em>}</div>;
      })}
      <div className="tgl"><span className="slot u">SP</span>Sparking!<Switch sp on={side.spec.sparking} label="Sparking" onChange={(on) => onChange({ ...side.spec, sparking: on })} /></div>
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

export function CompareView({ pair, mode, setMode, setSpec, openPicker, ruleset, swapIn, qp = () => null }) {
  const phone = usePhone();
  const [edit, setEdit] = useState(null); // 'A' | 'B'
  const L = leads(pair);
  const nA = nameParts(pair.A.c.name)[0], nB = nameParts(pair.B.c.name)[0];
  const actions = (k) => (
    <div className="vacts">
      <ChangeButton cls="editb" onClick={() => openPicker('char', k)} label={phone ? 'Change' : 'Change fighter'} />
      <button className="editb" onClick={() => setEdit(edit === k ? null : k)}>{edit === k ? 'Build ▴' : 'Build ▾'}</button>
    </div>
  );
  const panel = edit && (
    <SideBuild side={pair[edit]} other={pair[edit === 'A' ? 'B' : 'A']} title={`${nameParts(pair[edit].c.name)[0]}'s build`} ruleset={ruleset}
      onChange={setSpec(edit)} onEditCaps={() => openPicker('caps', edit)} onClose={() => setEdit(null)} />
  );
  return (
    <>
      {phone ? (
        <div className="cbar">
          <span className="l"><span className="cav"><img src={faceUrl(pair.A.c)} alt="" /></span><span><Name parts={nameParts(pair.A.c.name)} /></span></span>
          <span className="r"><span className="cav"><img src={faceUrl(pair.B.c)} alt="" /></span><span><Name parts={nameParts(pair.B.c.name)} /></span></span>
        </div>
      ) : <VsHead pair={pair} chipsA={buildChips(pair.A)} chipsB={buildChips(pair.B)} actionsA={actions('A')} actionsB={actions('B')} />}
      {phone && <div className="cbar-acts">{actions('A')}{actions('B')}</div>}
      <div className="qpanchor">{qp('A')}{qp('B')}</div>
      <Modes value={mode} options={[['summary', 'Summary'], ['all', 'All stats']]} onChange={setMode}>
        <em>{nA} leads on <b>{L.a}</b>, {nB} on <b>{L.b}</b></em>
      </Modes>
      {phone && panel && <div className="cmpgrid">{panel}</div>}
      {mode === 'all' ? (
        <div className={phone ? '' : 'cmpwrap'}>{!phone && panel && <div className="cmpgrid">{panel}</div>}<AllStats phone={phone} /></div>
      ) : (
        <div className="cmpgrid">
          <div className="cmpcol">
            {SUMMARY(pair).map(s => (
              <div className={`plate ${s.cls}`} key={s.title}><h5>{s.title}</h5>{s.hp && <HpPair />}{s.rows.map(r => <Pair key={r.label} row={r} />)}</div>
            ))}
            <div className="plate cmd"><h5>Command list</h5><CmdCmp phone={phone} /></div>
          </div>
          <div className="cmpcol">
            {!phone && panel}
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
