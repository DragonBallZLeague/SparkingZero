// Versus: Compare and Vs opponent as one page (round 23). The Matchup's Quick form is the Exchange: what each
// attack deals to the other side after its defenses and armor (a shield on a hit the armor reduces, a cracked
// one on the hit that breaks it); its Full form is the same sections as Side by side's, as dealt to and taken
// from the other side. Side by side's own pieces are in compare.jsx.
import React, { createContext, useContext, useMemo } from 'react';
import { nameParts, exchange, evaluatePair } from './model.js';
import { Tap, Modes, usePhone, useWide, usePair } from './ui.jsx';
import { VsHead, buildChips, AllStats, PairControls, statSections, VsArmor, SideBuild, CompareSummary, PhoneVsBar, leads } from './compare.jsx';
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

function XRow({ name, small, deal, take, sub = false }) {
  const changed = [useChanged(deal?.get || (() => null)), useChanged(take?.get || (() => null))].some(x => x != null);
  return (
    <div className={`xrow${sub ? ' sub' : ''}${changed ? ' chgd' : ''}`}>
      <span className="nm2">{name}{small && <small>{small}</small>}</span>
      {deal ? <XVal cls="v1" {...deal} /> : <span className="v1" />}
      {take ? <XVal cls="v2" {...take} /> : <span className="v2" />}
    </div>
  );
}

function Exchange({ phone }) {
  const pc = usePair();
  const { A, B } = pc.pair;
  const you = exchange(A, B), them = exchange(B, A);
  const nB = nameParts(B.c.name)[0];
  const armorB = B.view.armor > 0 ? (B.spec.sparking && B.c.armor?.sparking ? 'Sparking Armor' : B.c.armor?.base?.type || 'Armor') : null;
  const ph = you.combo.perHit;
  const breakAt = B.view.armor > 0 ? ph.findIndex((h, i) => !h.armorReduced && (i === 0 || ph[i - 1].armorReduced)) : -1;
  const theirHits = them.combo.perHit;
  const groups = [
    ['melee', 'Melee', [
      { name: 'Rush 5-hit', small: armorB ? (breakAt >= 0 ? `breaks the armor on hit ${breakAt + 1}` : 'the armor holds every hit') : null, deal: { title: 'Rush 5-hit', get: X(x => x.combo.rush5Hit) }, take: { title: 'Rush 5-hit taken', get: T(x => x.combo.rush5Hit) } },
      ...(phone ? [] : ph.map((h, i) => ({ sub: true, name: `Hit ${i + 1}`, deal: { title: `Rush hit ${i + 1}`, get: X(x => x.combo.perHit[i].damage), held: h.armorReduced, brk: i === breakAt }, take: theirHits[i] && B.view[['rush', 'hit2', 'hit3', 'hit4', 'hit5'][i]] ? { title: `Rush hit ${i + 1} taken`, get: T(x => x.combo.perHit[i].damage), held: theirHits[i].armorReduced } : null }))),
      ...(phone ? [{ name: 'Smash, Charge Lv.1', deal: { title: 'Smash Lv.1', get: X(x => x.smash[0].v), held: you.smash[0]?.held }, take: { title: 'Smash Lv.1 taken', get: T(x => x.smash[0].v) } }] : [
        { name: 'Smash' },
        ...you.smash.map((s, i) => ({ sub: true, name: `Charge Lv.${i + 1}`, deal: { title: `Smash Lv.${i + 1}`, get: X(x => x.smash[i].v), held: s.held }, take: them.smash[i] ? { title: `Smash Lv.${i + 1} taken`, get: T(x => x.smash[i].v), held: them.smash[i].held } : null })),
        { name: 'Heavy Finish' },
        ...you.heavyFinish.map((s, i) => ({ sub: true, name: `Charge Lv.${i + 1}`, deal: { title: `Heavy Finish Lv.${i + 1}`, get: X(x => x.heavyFinish[i].v), held: s.held }, take: them.heavyFinish[i] ? { title: `Heavy Finish Lv.${i + 1} taken`, get: T(x => x.heavyFinish[i].v), held: them.heavyFinish[i].held } : null })),
      ]),
      { name: 'Throw', deal: { title: 'Throw', get: X(x => x.throw.v), held: you.throw.held }, take: { title: 'Throw taken', get: T(x => x.throw.v), held: them.throw.held } },
    ]],
    ['kib', 'Ki blasts', [
      { name: 'One ki blast', deal: { title: 'Ki blast', get: X(x => x.kiBlast.v), held: you.kiBlast.held }, take: { title: 'Ki blast taken', get: T(x => x.kiBlast.v), held: them.kiBlast.held } },
      { name: 'Full volley', small: you.kiBlast.held ? 'every shot on armor' : null, deal: { title: 'Full volley', get: X(x => x.volley), held: you.kiBlast.held }, take: { title: 'Full volley taken', get: T(x => x.volley), held: them.kiBlast.held } },
      ...(you.charged.length || them.charged.length ? [{ name: 'Charged ki blast', small: them.charged[0]?.shots > 1 ? `theirs fires ${them.charged[0].shots} shots` : null }] : []),
      ...[0, 1, 2].filter(i => you.charged[i] || them.charged[i]).map(i => ({ sub: true, name: `Charge Lv.${i + 1}`,
        deal: you.charged[i] ? { title: `Charged Lv.${i + 1}`, get: X(x => x.charged[i]?.v), held: you.charged[i].held, suffix: you.charged[i].shots > 1 ? ` ×${you.charged[i].shots}` : '' } : null,
        take: them.charged[i] ? { title: `Charged Lv.${i + 1} taken`, get: T(x => x.charged[i]?.v), held: them.charged[i].held, suffix: them.charged[i].shots > 1 ? ` ×${them.charged[i].shots}` : '' } : null })),
    ]],
    ['blast', 'Blasts', ['Super 1', 'Super 2'].map((slot, i) => {
      const yb = you.blasts.find(x => x.b.slot === slot && !x.b.variant), tb = them.blasts.find(x => x.b.slot === slot && !x.b.variant);
      return { name: `B${i + 1} ${yb?.b.name || ''}`, small: tb ? `vs ${tb.b.name}` : null,
        deal: yb && { title: yb.b.name, get: X(x => x.blasts.find(y => y.b.slot === slot && !y.b.variant)?.deal) },
        take: tb && { title: `${tb.b.name} taken`, get: T(x => x.blasts.find(y => y.b.slot === slot && !y.b.variant)?.deal) } };
    })],
    ['ult', 'Ultimate', (() => {
      const yb = you.blasts.find(x => x.b.slot === 'Ultimate' && !x.b.variant), tb = them.blasts.find(x => x.b.slot === 'Ultimate' && !x.b.variant);
      return [{ name: yb?.b.name || 'Ultimate', small: tb ? `vs ${tb.b.name}` : null,
        deal: yb && { title: yb.b.name, get: X(x => x.blasts.find(y => y.b.slot === 'Ultimate' && !y.b.variant)?.deal) },
        take: tb && { title: `${tb.b.name} taken`, get: T(x => x.blasts.find(y => y.b.slot === 'Ultimate' && !y.b.variant)?.deal) } }];
    })()],
    ['spk', 'Sparking! Mode', [{ name: 'Hyper Smash', deal: { title: 'Hyper Smash', get: X(x => x.hyperSmash.v), held: you.hyperSmash.held }, take: { title: 'Hyper Smash taken', get: T(x => x.hyperSmash.v), held: them.hyperSmash.held } }]],
  ];
  return (
    <div className="plate neutral">
      <h5>Damage exchange</h5>
      {armorB && !phone && (
        <div className="xlegend"><span><b>{nB}'s {armorB}</b> takes {Math.round(B.view.armor * 100)}% off your hits until one breaks it.</span><span><i className="arm" />Armor holds</span><span><i className="arm brk" />Breaks it</span><span>No mark: full damage</span></div>
      )}
      <div className="xcols">
        {/* the basic attacks, then the Command list's (blasts, the ultimate) and Sparking!'s */}
        {[['melee', 'kib'], ['blast', 'ult', 'spk']].map((keys, ci) => (
          <div className="xcol" key={ci}>
            <div className="xhead"><span></span><span>{phone ? 'Deal' : 'You deal'}</span><span>{phone ? 'Take' : 'You take'}</span></div>
            {groups.filter(([k]) => keys.includes(k)).map(([k, label, rows]) => (
              <div className={`xgroup ${k}`} key={k}><div className="gh">{label}</div>{rows.map((r, i) => <XRow key={i} {...r} />)}</div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function HealthStrips() {
  const pc = usePair();
  const { A, B } = pc.pair;
  const strip = (side, dmg, now) => {
    const max = side.view.health;
    const hp = now ?? max;
    const n = Math.max(5, Math.ceil(max / 10000));
    const lastFull = Math.ceil(hp / 10000) - 1;
    return (
      <span className="bars hp">{Array.from({ length: n }, (_, i) => {
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
  return (
    <div className="plate">
      <h5>Health</h5>
      <div className="hpcap"><span>{B.c.name}</span><b>{hpOf(B) != null ? `${F.int(hpOf(B))} of ` : ''}{F.int(B.view.health)}</b></div>
      {strip(B, you.combo.rush5Hit, hpOf(B))}
      <div className="hpcap"><span>You</span><b>{hpOf(A) != null ? `${F.int(hpOf(A))} of ` : ''}{F.int(A.view.health)}</b></div>
      {strip(A, them.combo.rush5Hit, hpOf(A))}
      <div className="hpcap" style={{ marginTop: 8 }}><span>Red: one rush combo</span><span></span></div>
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
  else if (match) {
    body = (
      <div className="cmpgrid vsgrid">
        <div><RefCtx.Provider value={ref}><Exchange phone={phone} /></RefCtx.Provider></div>
        <div className="cmpcol"><HealthStrips /><div className="plate armp"><h5>Breaking armor</h5><VsArmor /></div></div>
      </div>
    );
  } else body = <CompareSummary pair={pair} swapIn={swapIn} />;
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
