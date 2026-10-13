// Versus: Compare and Vs opponent as one page (round 23). The Matchup's Quick form is the Exchange, laid out as
// Side by side's Quick: what each attack deals to the other side after its defenses and armor, mirrored around
// the attack (a shield on a hit the armor reduces, a cracked one on the hit that breaks it); its Full form is the same sections as Side by side's, as dealt to and taken
// from the other side. Side by side's own pieces are in compare.jsx.
import React, { createContext, useContext, useMemo } from 'react';
import { nameParts, exchange, evaluatePair } from './model.js';
import { Tap, Modes, usePhone, useWide, usePair } from './ui.jsx';
import { VsHead, buildChips, AllStats, PairControls, statSections, VsArmor, SideBuild, CompareSummary, PhoneVsBar, leads, Mirror } from './compare.jsx';
import { Conditions, InEffect } from './conditions.jsx';
import { ChangeButton } from './sheet.jsx';
import { F } from './format.js';

const X = (pick) => (s) => pick(exchange(s.A, s.B));   // you deal
const T = (pick) => (s) => pick(exchange(s.B, s.A));   // you take

/** What the tints compare against: the opponent without capsules, both sides without conditions (what the panels edit). */
const RefCtx = createContext(null);
function useChanged(get) {
  const pc = usePair();
  const ref = useContext(RefCtx);
  try { const v = get(pc.pair), b = get(ref || pc.base); return typeof v === 'number' && typeof b === 'number' && Math.abs(v - b) > 1e-9 ? b : null; } catch { return null; }
}

/** One value of the exchange: a shield when armor reduces it, old → new when a build or condition changes it. */
function XVal({ title, get, held = false, brk = false, cls, suffix = '' }) {
  const was = useChanged(get);
  return (
    <span className={`${cls}${held ? ' held' : ''}${was != null ? ' chg' : ''}`}>
      {held && <i className="arm" title="Armor holds" />}{brk && <i className="arm brk" title="Breaks the armor" />}
      {was != null && <s>{F.int(was)}</s>}<Tap title={title} get={get} mark={false} />{suffix}
    </span>
  );
}

/**
 * One attack of the matchup in Side by side's look: what you deal | the attack | what they deal. The bars are
 * sized to the larger of the two and only the bigger hitter's lights up (the matchup compares the two sides, not
 * the roster); blasts and the ultimate get no bars.
 */
function XPair({ name, small, deal, take, sub = false, bars = true }) {
  const pc = usePair();
  const changed = [useChanged(deal?.get || (() => null)), useChanged(take?.get || (() => null))].some(x => x != null);
  // a multi-shot attack compares by its total (Janemba's charged ki blast: 3 shots)
  const num = (x) => { try { const v = x?.get(pc.pair); return typeof v === 'number' ? v * (x.shots || 1) : null; } catch { return null; } };
  const a = num(deal), b = num(take);
  const better = a != null && b != null && a !== b ? (a > b ? 'a' : 'b') : null;
  const max = Math.max(a || 0, b || 0);
  const bar = (v, k) => (
    <span className={`pb ${k === 'a' ? 'l' : 'r'}${better === k ? ' w' : ''}${!bars || v == null ? ' none' : ''}`}>
      {bars && v != null && max > 0 && <i style={{ width: `${Math.max(3, (v / max) * 100)}%` }} />}
    </span>
  );
  return (
    <div className={`pair xp${sub ? ' sub' : ''}${changed ? ' chgd' : ''}`}>
      <span className={`a${better === 'a' ? ' w' : ''}`}>{deal ? <XVal cls="xv" {...deal} /> : '–'}</span>
      {bar(a, 'a')}
      <span className="n">{name}{small && <small>{small}</small>}</span>
      {bar(b, 'b')}
      <span className={`b${better === 'b' ? ' w' : ''}`}>{take ? <XVal cls="xv" {...take} /> : '–'}</span>
    </div>
  );
}

/** A plate's first line in the matchup: whose damage each side is. */
const XHead = ({ nA, nB }) => <div className="xph"><span className="sa">{nA} deals</span><span /><span className="sb">{nB} deals</span></div>;

/**
 * The Matchup's Quick form, laid out like Side by side's: a plate per kind of attack (Health, Melee, Ki blasts,
 * the Command list; Sparking! and Breaking armor beside them), each row the two sides' damage after the other's
 * defenses and armor, mirrored around the attack's name.
 */
function Exchange({ phone }) {
  const pc = usePair();
  const { A, B } = pc.pair;
  const you = exchange(A, B), them = exchange(B, A);
  const nA = nameParts(A.c.name)[0], nB = nameParts(B.c.name)[0];
  const armorOf = (s) => (s.view.armor > 0 ? (s.spec.sparking && s.c.armor?.sparking ? 'Sparking Armor' : s.c.armor?.base?.type || 'Armor') : null);
  const armorA = armorOf(A), armorB = armorOf(B);
  const ph = you.combo.perHit;
  const breakAt = B.view.armor > 0 ? ph.findIndex((h, i) => !h.armorReduced && (i === 0 || ph[i - 1].armorReduced)) : -1;
  const theirHits = them.combo.perHit;
  const lv = (n, i) => `${n} Lv.${i + 1}`;
  const melee = [
    { name: 'Rush 5-hit', small: armorB ? (breakAt >= 0 ? `breaks armor on hit ${breakAt + 1}` : 'armor holds every hit') : null, deal: { title: 'Rush 5-hit', get: X(x => x.combo.rush5Hit) }, take: { title: 'Rush 5-hit taken', get: T(x => x.combo.rush5Hit) } },
    ...(phone ? [] : ph.map((h, i) => ({ sub: true, name: `Hit ${i + 1}`, deal: { title: `Rush hit ${i + 1}`, get: X(x => x.combo.perHit[i].damage), held: h.armorReduced, brk: i === breakAt }, take: theirHits[i] && B.view[['rush', 'hit2', 'hit3', 'hit4', 'hit5'][i]] ? { title: `Rush hit ${i + 1} taken`, get: T(x => x.combo.perHit[i].damage), held: theirHits[i].armorReduced } : null }))),
    ...(phone ? you.smash.slice(0, 1) : you.smash).map((s, i) => ({ name: lv('Smash', i), deal: { title: lv('Smash', i), get: X(x => x.smash[i].v), held: s.held }, take: them.smash[i] ? { title: `${lv('Smash', i)} taken`, get: T(x => x.smash[i].v), held: them.smash[i].held } : null })),
    ...(phone ? [] : you.heavyFinish.map((s, i) => ({ name: lv('Heavy Finish', i), deal: { title: lv('Heavy Finish', i), get: X(x => x.heavyFinish[i].v), held: s.held }, take: them.heavyFinish[i] ? { title: `${lv('Heavy Finish', i)} taken`, get: T(x => x.heavyFinish[i].v), held: them.heavyFinish[i].held } : null }))),
    { name: 'Throw', deal: { title: 'Throw', get: X(x => x.throw.v), held: you.throw.held }, take: { title: 'Throw taken', get: T(x => x.throw.v), held: them.throw.held } },
  ];
  const shots = (x) => (x?.shots > 1 ? ` ×${x.shots}` : '');
  const kib = [
    { name: 'One ki blast', deal: { title: 'Ki blast', get: X(x => x.kiBlast.v), held: you.kiBlast.held }, take: { title: 'Ki blast taken', get: T(x => x.kiBlast.v), held: them.kiBlast.held } },
    { name: 'Full volley', small: you.kiBlast.held || them.kiBlast.held ? 'every shot on armor' : null, deal: { title: 'Full volley', get: X(x => x.volley), held: you.kiBlast.held }, take: { title: 'Full volley taken', get: T(x => x.volley), held: them.kiBlast.held } },
    ...[0, 1, 2].filter(i => you.charged[i] || them.charged[i]).map(i => ({ name: lv('Charged', i), small: i === 0 && (you.charged[0]?.shots > 1 || them.charged[0]?.shots > 1) ? 'per shot' : null,
      deal: you.charged[i] ? { title: lv('Charged', i), get: X(x => x.charged[i]?.v), held: you.charged[i].held, shots: you.charged[i].shots, suffix: shots(you.charged[i]) } : null,
      take: them.charged[i] ? { title: `${lv('Charged', i)} taken`, get: T(x => x.charged[i]?.v), held: them.charged[i].held, shots: them.charged[i].shots, suffix: shots(them.charged[i]) } : null })),
  ];
  // the Command list as Side by side's mirrored rows: each side's move by name, what it deals, no bars
  const cmd = ['Super 1', 'Super 2', 'Ultimate'].map(slot => {
    const mine = (x) => x.blasts.find(y => y.b.slot === slot && !y.b.variant);
    const side = (ex, pick, t) => {
      const m = mine(ex);
      if (!m) return null;
      const get = pick(x => mine(x)?.deal);
      return { name: m.b.name, n: get(pc.pair), value: <XVal cls="xv" title={t ? `${m.b.name} taken` : m.b.name} get={get} /> };
    };
    const lab = slot === 'Ultimate' ? 'ULT' : slot === 'Super 1' ? 'B1' : 'B2';
    return { slot, label: <span className={`slot ${lab === 'ULT' ? 'u' : 'b'}`}>{lab}</span>, a: side(you, X, false), b: side(them, T, true) };
  });
  const hyper = { name: 'Hyper Smash', deal: { title: 'Hyper Smash', get: X(x => x.hyperSmash.v), held: you.hyperSmash.held }, take: { title: 'Hyper Smash taken', get: T(x => x.hyperSmash.v), held: them.hyperSmash.held } };
  const legend = (armorA || armorB) && (
    <div className="xlegend">
      {armorB && <span><b>{nB}'s {armorB}</b> takes {Math.round(B.view.armor * 100)}% off {nA}'s hits until one breaks it.</span>}
      {armorA && <span><b>{nA}'s {armorA}</b> takes {Math.round(A.view.armor * 100)}% off {nB}'s hits until one breaks it.</span>}
      {!phone && <><span><i className="arm" />Armor holds</span><span><i className="arm brk" />Breaks it</span><span>No mark: full damage</span></>}
    </div>
  );
  const head = <XHead nA={nA} nB={nB} />;
  return (
    <div className="cmpgrid xgrid">
      <div className="cmpcol">
        <div className="plate"><h5>Health</h5><HpExchange /></div>
        <div className="plate off"><h5>Melee</h5>{head}{legend}{melee.map((r, i) => <XPair key={i} {...r} />)}</div>
        <div className="plate kib"><h5>Ki blasts</h5>{head}{kib.map((r, i) => <XPair key={i} {...r} />)}</div>
        <div className="plate cmd"><h5>Command list</h5>{head}{cmd.map(r => <Mirror key={r.slot} label={r.label} a={r.a} b={r.b} />)}</div>
        <div className="plate spk"><h5>Sparking! Mode</h5>{head}<XPair {...hyper} /></div>
      </div>
      <div className="cmpcol">
        <div className="plate armp"><h5>Breaking armor</h5><VsArmor /></div>
      </div>
    </div>
  );
}

/** Both health bars mirrored as in Side by side, each with one rush 5-hit from the other side in red. */
function HpExchange() {
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
        const hit = i === lastFull ? Math.min(100, (dmg / 10000) * 100) : 0;
        if (cap) return <i key={i} className="cap" />;
        if (fillPct === 100) return <i key={i} className={`f${hit ? ' hit' : ''}`} style={hit ? { '--w': `${hit}%` } : undefined} />;
        if (fillPct > 0) return <i key={i} className={`part${hit ? ' hit' : ''}`} style={{ '--p': `${fillPct}%`, ...(hit ? { '--w': `${Math.min(fillPct, hit)}%` } : {}) }} />;
        return <i key={i} />;
      })}</span>
    );
  };
  const you = exchange(A, B), them = exchange(B, A);
  const hpOf = (s) => (s.spec.sit?.hp != null ? Math.round(s.spec.sit.hp * s.view.health) : null);
  const val = (s) => <b>{hpOf(s) != null ? `${F.int(hpOf(s))} of ` : ''}{F.int(s.view.health)}</b>;
  return (
    <>
      <div className="hpair">{strip(A, them.combo.rush5Hit, hpOf(A), true)}<span className="hpn">HP</span>{strip(B, you.combo.rush5Hit, hpOf(B), false)}</div>
      <div className="hpvals"><span>{val(A)}</span><span>Red: one rush 5-hit from the other side</span><span>{val(B)}</span></div>
    </>
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
            onChange={setSpec(k)} onEditCaps={() => openPicker('caps', k)} />
          <Conditions side={side} onChange={setSpec(k)} compact />
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
export function VersusView({ pair, lens, setLens, depth, setDepth, setSpec, openPicker, ruleset, resetSits, swapIn, qp = () => null, docks = {} }) {
  const phone = usePhone();
  const wide = useWide();
  const match = lens === 'match';
  const ref = useMemo(() => (match ? evaluatePair({ ...pair.A.spec, sit: null }, { ...pair.B.spec, caps: [], sit: null }, { exchange: true }) : null), [pair, match]);
  const L = useMemo(() => leads(pair), [pair]);
  const nA = nameParts(pair.A.c.name)[0], nB = nameParts(pair.B.c.name)[0];
  const change = (k) => <ChangeButton onClick={() => openPicker('char', k)} title={k === 'B' ? (match ? 'Change opponent' : 'Change the right side') : 'Change fighter'} />;
  let body;
  if (depth === 'full') body = <div className={phone ? '' : 'cmpwrap'}><AllStats phone={phone} sections={match ? statSections({ vs: true, pair }) : null} /></div>;
  else if (match) body = <RefCtx.Provider value={ref}><Exchange phone={phone} /></RefCtx.Provider>;
  else body = <CompareSummary pair={pair} swapIn={swapIn} />;
  return (
    <>
      {phone ? <PhoneVsBar pair={pair} change={change} /> : <VsHead pair={pair} chipsA={buildChips(pair.A)} chipsB={buildChips(pair.B)} changeA={change('A')} changeB={change('B')} />}
      <div className="qpanchor">{qp('A')}{qp('B')}</div>
      <div className="vmodes">
        <Modes value={lens} options={[['side', 'Side by side'], ['match', 'Matchup']]} onChange={setLens} />
        <Modes value={depth} options={[['quick', 'Quick'], ['full', 'Full']]} onChange={setDepth} />
        <em>{match ? 'Each side\'s damage after the other\'s defenses and armor' : <>{nA} leads on <b>{L.a}</b>, {nB} on <b>{L.b}</b></>}</em>
      </div>
      {wide ? (
        <>
          <div className="vineff"><InEffect sides={[[pair.A.c.name, pair.A], [pair.B.c.name, pair.B]]} /></div>
          <div className="vsl">
            <Rail k="A" pair={pair} setSpec={setSpec} openPicker={openPicker} ruleset={ruleset} dock={docks.A} />
            <div className="vsc">{body}</div>
            <Rail k="B" pair={pair} setSpec={setSpec} openPicker={openPicker} ruleset={ruleset} dock={docks.B} />
          </div>
        </>
      ) : (
        <>
          <PairControls pair={pair} setSpec={setSpec} openPicker={openPicker} ruleset={ruleset} resetSits={resetSits} />
          {body}
        </>
      )}
    </>
  );
}
