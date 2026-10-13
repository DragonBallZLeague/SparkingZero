// Versus: Compare and Vs opponent as one page (round 23). Its Quick form (round 24) is one layout for both lenses,
// in the Fighter page's sections, order and rows: Side by side shows each fighter as they are; the Matchup the same
// rows as each side's damage after the other's defenses and armor (a shield on a hit the armor reduces, a cracked
// one on the hit that breaks it) and toughness as taken from the other side. Switching lens keeps every section
// and row in place; only the numbers change. Full is All stats (compare.jsx).
import React, { createContext, useContext, useMemo, useState } from 'react';
import { nameParts, exchange, evaluatePair, gameMoves, volley, fiveHitTaken, emptySpec, rosterPos, blastsOf, blastDamage } from './model.js';
import { Tap, Modes, usePhone, useWide, usePair } from './ui.jsx';
import { VsHead, buildChips, AllStats, PairControls, statSections, VsArmor, SideBuild, PhoneVsBar, leads, Mirror, SkillsCmp, ChainsCmp, Similar, useBlastSlots, sameBlast, slotLabel, blastName, AltPick } from './compare.jsx';
import { Conditions, InEffect } from './conditions.jsx';
import { ChangeButton } from './sheet.jsx';
import { F } from './format.js';

/** What the tints compare against: the opponent without capsules, both sides without conditions (what the panels edit). */
const RefCtx = createContext(null);
function useChanged(get) {
  const pc = usePair();
  const ref = useContext(RefCtx);
  try { const v = get(pc.pair), b = get(ref || pc.base); return typeof v === 'number' && typeof b === 'number' && Math.abs(v - b) > 1e-9 ? b : null; } catch { return null; }
}

/** One value: a shield when armor reduces it (Matchup), old → new when a build or condition changes it. */
function XVal({ title, get, held = false, brk = false, cls, suffix = '', fmt = F.int, kind = 'int', less = false }) {
  const was = useChanged(get);
  return (
    <span className={`${cls}${held ? ' held' : ''}${was != null ? ' chg' : ''}`}>
      {held && <i className="arm" title="Armor holds" />}{brk && <i className="arm brk" title="Breaks the armor" />}
      {was != null && <s>{fmt(was)}</s>}<Tap title={title} get={get} fmt={fmt} kind={kind} lessIsBetter={less} mark={false} />{suffix}
    </span>
  );
}

/* ------------------------------------------------------------------ Versus Quick: the rows */
const V = (f) => (s) => f(s.view, s);
const ex = (f) => (me, them) => f(exchange(me, them));
const other = (k) => (k === 'A' ? 'B' : 'A');
/** A side's value of a row: in the Matchup its `deal(me, them)` when it has one, else the plain stat `get(side)`. */
const sideGet = (row, k, match) => (s) => (match && row.deal ? row.deal(s[k], s[other(k)]) : row.get(s[k]));
const num = (f, p) => { try { const v = f(p); return typeof v === 'number' ? v : null; } catch { return null; } };

/**
 * One row of Versus Quick, the same in both lenses: A's value | bar | the stat | bar | B's value. The bars fill by
 * the roster's range of the plain stat (`get`, or `rget(view)`), as on every paired row, muted with the better
 * side's lit; `bar: false` for stats the community knows the average of, and words.
 */
function QRow({ row, match }) {
  const pc = usePair();
  const ga = sideGet(row, 'A', match), gb = sideGet(row, 'B', match);
  const changed = [useChanged(ga), useChanged(gb)].some(x => x != null);
  const a = num(ga, pc.pair), b = num(gb, pc.pair);
  // a multi-shot attack compares by its total (Janemba's charged ki blast fires 3)
  const tot = (v, k) => (v == null ? null : v * ((row.shots && row.shots(pc.pair[k])) || 1));
  const score = (v) => (row.less ? (v ? 1 / v : 0) : v);
  const ta = tot(a, 'A'), tb = tot(b, 'B');
  const better = ta != null && tb != null && ta !== tb ? (score(ta) > score(tb) ? 'a' : 'b') : null;
  const rget = row.rget || ((vw, c) => row.get({ c, view: vw, spec: emptySpec(c.id), caps: [], applied: [] }));
  const fill = (v) => (row.bar === false || v == null ? null : rosterPos(`q:${row.key || row.label}`, rget, row.rval ? row.rval(v) : v, !!row.less));
  const bar = (f, k) => <span className={`pb ${k === 'a' ? 'l' : 'r'}${better === k ? ' w' : ''}${f == null ? ' none' : ''}`}>{f != null && <i style={{ width: `${Math.max(3, f * 100)}%` }} />}</span>;
  const cell = (k, g) => {
    const me = pc.pair[k], them = pc.pair[other(k)];
    const shots = row.shots ? row.shots(me) : 0;
    return (
      <XVal cls="xv" title={`${row.label}, ${nameParts(me.c.name)[0]}`} get={g} fmt={row.fmt || F.int} kind={row.kind || 'int'} less={!!row.less}
        held={!!(match && row.held?.(me, them))} brk={!!(match && row.brk?.(me, them))} suffix={shots > 1 ? ` ×${shots}` : ''} />
    );
  };
  const small = match && row.matchSmall !== undefined ? row.matchSmall : row.small;
  return (
    <div className={`pair xp${changed ? ' chgd' : ''}`}>
      <span className={`a${better === 'a' ? ' w' : ''}`}>{a == null ? '–' : cell('A', ga)}</span>
      {bar(fill(a), 'a')}
      <span className="n">{row.label}{small && <small>{small}</small>}</span>
      {bar(fill(b), 'b')}
      <span className={`b${better === 'b' ? ' w' : ''}`}>{b == null ? '–' : cell('B', gb)}</span>
    </div>
  );
}

/**
 * Versus Quick's sections, the Fighter page's Quick in its order: Toughness (health above), Resources, Skills,
 * Blasts, Melee, Rush Chains, Ki blasts, Sparking!. A row with `deal` reads as dealt to the other side in the
 * Matchup (`held` / `brk`: its armor marks); without one it is the same in both lenses.
 */
function quickRows(pair) {
  const nA = nameParts(pair.A.c.name)[0], nB = nameParts(pair.B.c.name)[0];
  // where each side's rush breaks the other's armor, if the other has armor now
  const breakNote = (me, them, n) => {
    if (!(them.view.armor > 0)) return null;
    const ph = exchange(me, them).combo.perHit;
    const at = ph.findIndex((h, i) => !h.armorReduced && (i === 0 || ph[i - 1].armorReduced));
    return at >= 0 ? `${n} breaks it on hit ${at + 1}` : `${n}'s rush is held`;
  };
  const notes = [breakNote(pair.A, pair.B, nA), breakNote(pair.B, pair.A, nB)].filter(Boolean);
  const def = (label, key, f) => ({ label, key, get: V(x => 1 - f(x)), fmt: (x) => F.def(1 - x), kind: 'def' });
  return {
    tough: [
      { label: '5-hit taken', key: 'taken', get: V(fiveHitTaken), deal: (me, them) => exchange(them, me).combo.rush5Hit, less: true, small: 'less is better', matchSmall: "the other side's rush" },
      def('Melee defense', 'mdef', x => x.meleeDefenseStat), def('Blast defense', 'bdef', x => x.blastDefense), def('Ki-blast defense', 'edef', x => x.energy),
      { label: 'Armor', get: V(x => x.armor), fmt: F.armor, kind: 'def', bar: false },
    ],
    res: [
      { label: 'Starting ki', get: V(x => x.startingKi), fmt: (x) => `${+x.toFixed(2)} bars`, kind: 'dec', bar: false },
      { label: 'Ki charge', small: 'bars/s', get: V(x => x.kiCharge), fmt: F.dec2, kind: 'dec' },
      { label: 'Ki regen', small: 'bars/s', get: V(x => x.kiRegen), fmt: F.dec, kind: 'dec' },
      { label: 'Skill gauge limit', get: V(x => x.skillLimit), fmt: String },
      { label: 'Skill gauge per minute', get: V(x => parseFloat(x.skillRegen)), fmt: F.dec, kind: 'dec' },
    ],
    melee: [
      { label: 'Rush 5-hit', get: V(x => x.rush5Hit), deal: ex(x => x.combo.rush5Hit), matchSmall: notes.length ? notes.join(', ') : null },
      { label: 'Smash', key: 'smash3', small: 'Lv.3', get: (s) => gameMoves(s).smash.at(-1), deal: ex(x => x.smash.at(-1)?.v), held: ex(x => x.smash.at(-1)?.held) },
      { label: 'Throw', get: V(x => x.throw), deal: ex(x => x.throw.v), held: ex(x => x.throw.held) },
      { label: 'Pursuit', small: 'Vanishing Attack', get: V(x => x.vanishingAttack ?? x.pursuit), deal: ex(x => x.vanishingAttack ?? x.pursuit) },
      { label: 'Armor break', small: 'hits, fewer is better', get: V(x => x.armorBreak), fmt: F.hits, kind: 'dec', less: true },
    ],
    kib: [
      { label: 'Ki blast', get: V(x => x.kiBlastDmg), deal: ex(x => x.kiBlast.v), held: ex(x => x.kiBlast.held) },
      { label: 'Ki blast limit', get: V(x => x.kiBlastLimit), fmt: F.count, rget: (x) => Math.min(x.kiBlastLimit, 20), rval: (v) => Math.min(v, 20) },
      { label: 'Ki blast cost', small: 'less is better', get: V(x => x.kiBlastCost), fmt: (x) => `${F.bars(x)} bars`, kind: 'dec', less: true },
      { label: 'Full volley', get: V(x => volley(x)), deal: ex(x => x.volley), held: ex(x => x.kiBlast.held) },
      { label: 'Charged ki blast', key: 'charged3', small: 'Lv.3', get: (s) => gameMoves(s).charged?.damage.at(-1), deal: ex(x => x.charged.at(-1)?.v), held: ex(x => x.charged.at(-1)?.held), shots: (s) => gameMoves(s).charged?.shots },
    ],
    spk: [
      { label: 'Charge speed', key: 'spkc', get: V(x => x.sparkCharge), fmt: F.rel, kind: 'rel' },
      { label: 'Duration', key: 'spkd', get: V(x => x.sparkDuration), fmt: F.rel, kind: 'rel' },
      { label: 'Hyper Smash', get: (s) => gameMoves(s).hyperSmash, deal: ex(x => x.hyperSmash.v), held: ex(x => x.hyperSmash.held) },
      { label: 'Violent Rush', get: (s) => (s.c.moveset?.unavailable?.includes('Violent Rush') ? 0 : 1), fmt: (x) => (x ? 'Yes' : 'No'), bar: false },
      { label: 'Extra follow-ups', small: 'in Sparking!', get: (s) => s.c.moveset?.pursuits?.sparkingAdd ?? 0, fmt: (x) => `+${x}`, bar: false },
    ],
  };
}

/** A plate's first line in the Matchup: whose damage each side is. */
const XHead = ({ nA, nB }) => <div className="xph"><span className="sa">{nA} deals</span><span /><span className="sb">{nB} deals</span></div>;

/** Blasts as mirrored rows, each side's move by name (alternates one switch away), as they are or as dealt (Matchup). */
function BlastRows({ match }) {
  const pc = usePair();
  return useBlastSlots().map(r => {
    const side = (x, k) => {
      if (!x.b) return null;
      const get = match
        ? (s) => exchange(s[k], s[other(k)]).blasts.find(y => sameBlast(y.b, x.b))?.deal
        : (s) => { const m = blastsOf(s[k].c).find(y => sameBlast(y, x.b)); return m ? blastDamage(s[k], m).damage : null; };
      return { name: blastName(x, k), n: num(get, pc.pair), value: <XVal cls="xv" title={x.b.name} get={get} /> };
    };
    return <Mirror key={r.slot} label={slotLabel(r)} a={side(r.A, 'A')} b={side(r.B, 'B')} />;
  });
}

/** Both health bars mirrored; in the Matchup each shows one rush 5-hit from the other side in red. */
function HpBars({ match }) {
  const pc = usePair();
  const { A, B } = pc.pair;
  const strip = (side, dmg, now, l) => {
    const max = side.view.health;
    const hp = now ?? max;
    const n = Math.max(5, Math.ceil(max / 10000));
    const lastFull = Math.ceil(hp / 10000) - 1;
    return (
      <span className={`bars hp${l ? ' l' : ''}`}>{Array.from({ length: n }, (_, i) => {
        const fillPct = i < Math.floor(hp / 10000) ? 100 : i === Math.floor(hp / 10000) ? ((hp % 10000) / 100) : 0;
        const cap = i * 10000 >= max;
        const hit = dmg && i === lastFull ? Math.min(100, (dmg / 10000) * 100) : 0;
        if (cap) return <i key={i} className="cap" />;
        if (fillPct === 100) return <i key={i} className={`f${hit ? ' hit' : ''}`} style={hit ? { '--w': `${hit}%` } : undefined} />;
        if (fillPct > 0) return <i key={i} className={`part${hit ? ' hit' : ''}`} style={{ '--p': `${fillPct}%`, ...(hit ? { '--w': `${Math.min(fillPct, hit)}%` } : {}) }} />;
        return <i key={i} />;
      })}</span>
    );
  };
  const hpOf = (s) => (s.spec.sit?.hp != null ? Math.round(s.spec.sit.hp * s.view.health) : null);
  const val = (s) => <b>{hpOf(s) != null ? `${F.int(hpOf(s))} of ` : ''}{F.int(s.view.health)}</b>;
  const hitA = match ? exchange(B, A).combo.rush5Hit : 0, hitB = match ? exchange(A, B).combo.rush5Hit : 0;
  return (
    <>
      <div className="hpair">{strip(A, hitA, hpOf(A), true)}<span className="hpn">HP</span>{strip(B, hitB, hpOf(B), false)}</div>
      <div className="hpvals"><span>{val(A)}</span><span>{match ? 'Red: one rush 5-hit from the other side' : ''}</span><span>{val(B)}</span></div>
    </>
  );
}

/** The Matchup's verdict: on how many attacks each side out-damages the other (by total, a multi-shot attack's shots counted). */
function matchVerdict(pair, rows) {
  const att = [...rows.melee, ...rows.kib, ...rows.spk].filter(r => r.deal);
  let a = 0, b = 0;
  const ea = [], eb = [];
  for (const r of att) {
    const x = num(sideGet(r, 'A', true), pair), y = num(sideGet(r, 'B', true), pair);
    if (x == null || y == null || x === y) continue;
    const tx = x * ((r.shots && r.shots(pair.A)) || 1), ty = y * ((r.shots && r.shots(pair.B)) || 1);
    if (tx > ty) { a++; ea.push(r.label); } else { b++; eb.push(r.label); }
  }
  return { a, b, n: a + b, edgeA: ea, edgeB: eb };
}

/**
 * Versus Quick (round 24): the same sections and rows in both lenses, the right column the verdict and then
 * Fighters like the left one (Side by side) or Breaking armor (Matchup).
 */
function VersusQuick({ pair, match, phone, swapIn }) {
  const rows = quickRows(pair);
  const nA = nameParts(pair.A.c.name)[0], nB = nameParts(pair.B.c.name)[0];
  const head = match ? <XHead nA={nA} nB={nB} /> : null;
  const armorOf = (s) => (s.view.armor > 0 ? (s.spec.sparking && s.c.armor?.sparking ? 'Sparking Armor' : s.c.armor?.base?.type || 'Armor') : null);
  const legend = match && (armorOf(pair.A) || armorOf(pair.B)) && (
    <div className="xlegend">
      {armorOf(pair.B) && <span><b>{nB}'s {armorOf(pair.B)}</b> takes {Math.round(pair.B.view.armor * 100)}% off {nA}'s hits until one breaks it.</span>}
      {armorOf(pair.A) && <span><b>{nA}'s {armorOf(pair.A)}</b> takes {Math.round(pair.A.view.armor * 100)}% off {nB}'s hits until one breaks it.</span>}
      {!phone && <><span><i className="arm" />Armor holds</span><span><i className="arm brk" />Breaks it</span><span>No mark: full damage</span></>}
    </div>
  );
  // the "deals" heading only over attacks (Toughness's matchup rows are taken, not dealt)
  const plate = (cls, title, list, extra = null, top = null) => (
    <div className={`plate ${cls}`}><h5>{title}</h5>{top}{!top && list.some(r => r.deal) && head}{extra}{list.map(r => <QRow key={r.label} row={r} match={match} />)}</div>
  );
  const L = match ? matchVerdict(pair, rows) : leads(pair);
  return (
    <div className="cmpgrid xgrid">
      <div className="cmpcol">
        {plate('', 'Toughness', rows.tough, null, <HpBars match={match} />)}
        {plate('res', 'Resources', rows.res)}
        <div className="plate skl"><h5>Skills{match && <small className="h5s">damage before their defenses</small>}</h5><SkillsCmp /></div>
        <div className="plate cmd"><h5>Blasts</h5>{head}<BlastRows match={match} /></div>
        {plate('off', 'Melee', rows.melee, legend)}
        <div className="plate mov"><h5>Rush Chains</h5>{head}<ChainsCmp vs={match} /></div>
        {plate('kib', 'Ki blasts', rows.kib)}
        {plate('spk', 'Sparking! Mode', rows.spk)}
      </div>
      <div className="cmpcol">
        <div className="plate neutral">
          <h5>Verdict</h5>
          {/* one line per fighter, in the side's colour */}
          <div className="verdict vl">
            {[['sa', nA, L.a], ['sb', nB, L.b]].map(([cls, n, x]) => (
              <div key={cls}><span className={cls}>{n}</span>{match ? <> deals more on <b>{x}</b> of {L.n} attacks</> : <> leads on <b>{x}</b> stats</>}</div>
            ))}
          </div>
          <div className="strong">
            <div><small>{nA}'s edge</small><div className="tags">{L.edgeA.slice(0, 6).map(x => <span key={x}>{x}</span>)}</div></div>
            <div><small>{nB}'s edge</small><div className="tags">{L.edgeB.slice(0, 6).map(x => <span key={x}>{x}</span>)}</div></div>
          </div>
        </div>
        {match ? <div className="plate armp"><h5>Breaking armor</h5><VsArmor /></div> : <Similar id={pair.A.c.id} name={pair.A.c.name} onPick={swapIn} />}
      </div>
    </div>
  );
}

/** A side's rail on a wide screen: its build (skills, Sparking, capsules, league builds) and conditions, or its docked capsule picker. */
function Rail({ k, pair, setSpec, openPicker, ruleset, dock }) {
  const side = pair[k], other = pair[k === 'A' ? 'B' : 'A'];
  return (
    <aside className={`vrail ${k === 'A' ? 'sa' : 'sb'}${dock ? ' dock' : ''}`}>
      {dock || (
        <>
          <SideBuild side={side} other={other} title={`${nameParts(side.c.name)[0]}'s loadout`} cls={k === 'A' ? 'sa' : 'sb'} ruleset={ruleset}
            onChange={setSpec(k)} onEditCaps={() => openPicker('caps', k)} conditions={<Conditions side={side} onChange={setSpec(k)} compact />} />
        </>
      )}
    </aside>
  );
}

/**
 * Versus (round 23): Compare and Vs opponent as one page. Side by side shows each fighter as they are; Matchup
 * each one's damage after the other's defenses and armor. Quick and Full as on the Fighter page (Summary or
 * Exchange; All stats). On a wide screen each fighter's build is a rail on its own side, where its capsule
 * picker docks; narrower, the Loadout and Conditions bar (PairControls) and a bottom sheet.
 */
export function VersusView({ pair, lens, setLens, depth, setDepth, setSpec, openPicker, ruleset, resetSits, swapIn, onSwap, qp = () => null, docks = {} }) {
  const phone = usePhone();
  const wide = useWide();
  const match = lens === 'match';
  // which version of each blast slot each side compares (main or a costume's alternate), across both lenses and depths
  const altPick = useState({});
  const ref = useMemo(() => (match ? evaluatePair({ ...pair.A.spec, sit: null }, { ...pair.B.spec, caps: [], sit: null }, { exchange: true }) : null), [pair, match]);
  const L = useMemo(() => leads(pair), [pair]);
  const nA = nameParts(pair.A.c.name)[0], nB = nameParts(pair.B.c.name)[0];
  const change = (k) => <ChangeButton onClick={() => openPicker('char', k)} title={k === 'B' ? (match ? 'Change opponent' : 'Change the right side') : 'Change fighter'} />;
  // the lens and depth change only the stats, so they sit right on top of them (between the rails on a wide screen)
  const modes = (
    <div className="vmodes">
      <Modes value={lens} options={[['side', 'Side by side'], ['match', 'Matchup']]} onChange={setLens} />
      <Modes value={depth} options={[['quick', 'Quick'], ['full', 'Full']]} onChange={setDepth} />
      <em>{match ? 'Each side\'s damage after the other\'s defenses and armor' : <>{nA} leads on <b>{L.a}</b>, {nB} on <b>{L.b}</b></>}</em>
    </div>
  );
  let body;
  if (depth === 'full') body = <div className={phone ? '' : 'cmpwrap'}><AllStats phone={phone} sections={match ? statSections({ vs: true, pair }) : null} /></div>;
  else body = <RefCtx.Provider value={ref}><VersusQuick pair={pair} match={match} phone={phone} swapIn={swapIn} /></RefCtx.Provider>;
  return (
    <AltPick.Provider value={altPick}>
      {phone ? <PhoneVsBar pair={pair} change={change} onSwap={onSwap} /> : <VsHead pair={pair} chipsA={buildChips(pair.A)} chipsB={buildChips(pair.B)} changeA={change('A')} changeB={change('B')} onSwap={onSwap} />}
      <div className="qpanchor">{qp('A')}{qp('B')}</div>
      {wide ? (
        <>
          <div className="vineff"><InEffect sides={[[pair.A.c.name, pair.A], [pair.B.c.name, pair.B]]} /></div>
          <div className="vsl">
            <Rail k="A" pair={pair} setSpec={setSpec} openPicker={openPicker} ruleset={ruleset} dock={docks.A} />
            <div className="vsc">{modes}{body}</div>
            <Rail k="B" pair={pair} setSpec={setSpec} openPicker={openPicker} ruleset={ruleset} dock={docks.B} />
          </div>
        </>
      ) : (
        <>
          <PairControls pair={pair} setSpec={setSpec} openPicker={openPicker} ruleset={ruleset} resetSits={resetSits} />
          {modes}
          {body}
        </>
      )}
    </AltPick.Provider>
  );
}
