// /calculator/build: one build, or two (Compare), or a build against an opponent's (Vs opponent).
// The whole build lives in the address: character, capsules, skills, Sparking, ruleset, mode.
import React, { useState } from 'react';
import { data, byId, capsuleById, sideEffects, sideStats, baseStats, legacy, skillOf, blastsOf, effectsLine, slugOf, noteText } from './data.js';
import { STAT, SECTIONS, valueOf } from './stats.js';
import { Num, Explain, Seg, ChipMenu, Portrait, ClassBadge, usePhone } from './ui.jsx';
import { MoveCards, blastNumbers, blastRows } from './moves.jsx';
import { totalCost, groupOverages, bannedEquipped } from '../../src/utils/rules.js';
import { capsuleNotes } from '../../src/utils/engine.js';
import { calcOutgoingCombo, damageTaken, kiBlastVolley } from '../../src/utils/calculator.js';
import { DRACONIC_AURA, DRAGON_RUSH, LIGHT_BODY } from '../../src/utils/specialCapsules.js';

const SLOTS = 7;
const list = (s) => (s ? s.split('.').filter(Boolean) : []);
const charOptions = data.characters.map(c => [c.id, c.name]);
const legacySkill = new Map(legacy.skills.map(s => [s.id, s]));

/** One side's build from the address: prefix '' for the main side, 'b' for the other. */
function readSide(query, p) {
  return {
    id: query[`${p}c`] || null,
    caps: list(query[`${p}k`]).slice(0, SLOTS),
    skills: list(query[`${p}s`]).map(Number),
    sparking: query[`${p}sp`] === '1',
  };
}

export default function BuildPage({ query, setQuery, go }) {
  const phone = usePhone();
  const ruleset = data.meta.rulesets.find(r => r.name === query.r) || data.meta.rulesets.find(r => r.name === data.meta.defaultRuleset);
  const mode = ['compare', 'opponent'].includes(query.mode) ? query.mode : 'single';
  const A = readSide(query, '');
  const B = readSide(query, 'b');
  // an unknown id (an old or mistyped link) falls back rather than failing
  if (!byId.has(A.id)) A.id = data.characters[0].id;
  const two = mode !== 'single';
  if (two && !byId.has(B.id)) B.id = A.id;

  // the engine, as App.jsx runs it: in Vs opponent each side receives the other's opponent-targeted skill effects
  const sA0 = sideEffects(A.id, A.caps, A.skills, A.sparking);
  const sB0 = two ? sideEffects(B.id, B.caps, B.skills, B.sparking) : null;
  const vs = mode === 'opponent';
  const sA = vs && sB0?.effects.outgoing.length ? sideEffects(A.id, A.caps, A.skills, A.sparking, sB0.effects.outgoing) : sA0;
  const sB = vs && sA0?.effects.outgoing.length ? sideEffects(B.id, B.caps, B.skills, B.sparking, sA0.effects.outgoing) : sB0;
  const vA = sideStats(sA, vs ? B.caps : []);
  const vB = two ? sideStats(sB, vs ? A.caps : []) : null;

  const [tabPhone, setTabPhone] = useState('stats');

  const loadoutA = <Loadout title={two ? (mode === 'compare' ? 'Build A' : 'Your build') : 'Build'} side={A} p="" ruleset={ruleset} setQuery={setQuery} go={go} />;
  const loadoutB = two && <Loadout title={mode === 'compare' ? 'Build B' : 'Opponent'} side={B} p="b" ruleset={ruleset} setQuery={setQuery} go={go} />;

  const results = mode === 'single'
    ? <SingleResults sideA={sA} vA={vA} A={A} />
    : mode === 'compare'
      ? <CompareResults sA={sA} vA={vA} sB={sB} vB={vB} />
      : <VersusResults A={A} B={B} sA={sA} vA={vA} sB={sB} vB={vB} />;

  return (
    <>
      <div className="ctl-row">
        <Seg options={[['single', 'One build'], ['compare', 'Compare'], ['opponent', 'Vs opponent']]} value={mode}
          onChange={(m) => setQuery({ mode: m === 'single' ? null : m, ...(m !== 'single' && !query.bc ? { bc: A.id } : {}) })} small={phone} />
        <div className="ctl-end">
          <ChipMenu label="Ruleset" multi={false} options={data.meta.rulesets.map(r => [r.name, r.name, `${r.totalCost} pts`])}
            selected={ruleset.name} onChange={(v) => setQuery({ r: v && v !== data.meta.defaultRuleset ? v : null })} />
          <button className="btn" onClick={() => { navigator.clipboard?.writeText(location.href); toast('Link copied: it holds the whole build'); }}>Copy link</button>
        </div>
      </div>
      {phone ? (
        <>
          <div className="subtabs">
            {[['stats', 'Results'], ['a', two ? (mode === 'compare' ? 'Build A' : 'You') : 'Loadout'], ...(two ? [['b', mode === 'compare' ? 'Build B' : 'Opponent']] : [])].map(([t, l]) => (
              <button key={t} className="subtab" aria-selected={tabPhone === t} onClick={() => setTabPhone(t)}>{l}</button>
            ))}
          </div>
          {tabPhone === 'stats' && results}
          {tabPhone === 'a' && loadoutA}
          {tabPhone === 'b' && loadoutB}
        </>
      ) : (
        <div className="build-grid">
          <div className="loadouts">{loadoutA}{loadoutB}</div>
          <div className="min0">{results}</div>
        </div>
      )}
    </>
  );
}

export function toast(text) {
  let el = document.querySelector('.toast');
  if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
  el.textContent = text;
  el.classList.add('on');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('on'), 2200);
}

/* ---------------- the loadout: character, skills, Sparking, seven capsules ---------------- */
function Loadout({ title, side, p, ruleset, setQuery, go }) {
  const c = byId.get(side.id);
  const caps = side.caps.map(id => capsuleById.get(id)).filter(Boolean);
  const cost = totalCost(caps);
  const over = groupOverages(caps, ruleset, data.capsules);
  const banned = bannedEquipped(caps, ruleset);
  const setCaps = (ids) => setQuery({ [`${p}k`]: ids.join('.') || null });
  const toggleSkill = (n) => {
    const s = side.skills.includes(n) ? side.skills.filter(x => x !== n) : [...side.skills, n].sort();
    setQuery({ [`${p}s`]: s.join('.') || null });
  };
  const allowed = data.capsules.filter(x => !ruleset.banned.includes(x.id));
  const notes = caps.flatMap(x => capsuleNotes(x).map(t => [x.name, t]));
  return (
    <section className="panel loadout">
      <div className="lo-head">
        <span className="kick">{title}</span>
        <ChipMenu label="Character" multi={false} search options={charOptions} selected={side.id}
          onChange={(v) => v && setQuery({ [`${p}c`]: v, [`${p}s`]: null, [`${p}sp`]: null })}
          render={(v, l) => <span className="who"><Portrait id={v} size={22} radius={5} /> {l}</span>} />
      </div>
      <a className="lo-who" href={`#/characters/${slugOf.get(c.id)}`} onClick={(e) => { e.preventDefault(); go(`/characters/${slugOf.get(c.id)}`); }}>
        <Portrait id={c.id} size={44} radius={10} />
        <span className="min0"><span className="nm">{c.name}</span><span className="sub"><ClassBadge label={c.class.label} /> <span className="dp">DP {c.dp}</span></span></span>
      </a>

      <div className="kick">Active</div>
      <div className="toggles">
        {[1, 2].map(n => {
          const s = skillOf(c, n);
          if (!s) return null;
          const ls = legacySkill.get(s.id);
          const can = ls?.effectCount > 0;
          return (
            <button key={n} type="button" className={`tog${side.skills.includes(n) ? ' on' : ''}`} disabled={!can}
              title={can ? effectsLine(s.phases.flatMap(x => x.effects)) : 'No effect the stats show'} onClick={() => toggleSkill(n)}>
              <span className="tog-k">Skill {n}</span><span className="tog-n">{s.name}</span>
            </button>
          );
        })}
        <button type="button" className={`tog${side.sparking ? ' on' : ''}`} onClick={() => setQuery({ [`${p}sp`]: side.sparking ? null : '1' })}>
          <span className="tog-k">Sparking</span><span className="tog-n">{c.sparking?.effects?.length || c.sparking?.armor ? 'Passive on' : 'No passive'}</span>
        </button>
      </div>

      <div className="kick">Capsules <span className={cost > ruleset.totalCost ? 'bad' : ''}>{cost} / {ruleset.totalCost} pts</span></div>
      <div className="budget"><i style={{ width: `${Math.min(100, (cost / ruleset.totalCost) * 100)}%` }} className={cost > ruleset.totalCost ? 'over' : ''} /></div>
      <ul className="slots">
        {Array.from({ length: SLOTS }, (_, i) => {
          const x = caps[i];
          return x ? (
            <li key={i} className="slot">
              <span className="slot-c">{x.cost}</span>
              <span className="min0"><span className="slot-n">{x.name}</span><span className="slot-d">{x.description}</span></span>
              <button className="x" aria-label={`Remove ${x.name}`} onClick={() => setCaps(side.caps.filter((_, j) => j !== i))}>×</button>
            </li>
          ) : i === caps.length ? (
            <li key={i} className="slot add">
              <ChipMenu label="+ Add capsule" multi={false} search selected={null}
                options={allowed.filter(a => !side.caps.includes(a.id)).map(a => [a.id, a.name, `${a.cost}`])}
                onChange={(v) => v && setCaps([...side.caps, v])}
                render={(v, l) => <span className="min0"><span>{l}</span><span className="slot-d">{capsuleById.get(v).description}</span></span>} />
            </li>
          ) : <li key={i} className="slot empty-slot" />;
        })}
      </ul>
      {(over.length > 0 || banned.length > 0) && (
        <div className="warn">
          {banned.map(b => <div key={b.id}>{b.name} is banned in {ruleset.name}</div>)}
          {over.map((o, i) => <div key={i}>{o.names.join(' / ')}: {o.cost} of {o.maxCost} pts allowed</div>)}
        </div>
      )}
      {notes.length > 0 && (
        <div className="notes"><div className="kick">Not in the numbers</div>{notes.map(([n, t], i) => <div key={i}><b>{n}:</b> {noteText(t)}</div>)}</div>
      )}
      {caps.length > 0 && <button className="linkbtn" onClick={() => setCaps([])}>Clear capsules</button>}
    </section>
  );
}

/* ---------------- results: one build ---------------- */
function SingleResults({ sideA, vA, A }) {
  const c = sideA.c;
  const base = baseStats(c.id);
  const ctx = { c, side: sideA, view: vA };
  const bctx = { c, side: sideEffects(c.id), view: base };
  return (
    <>
      <div className="res-head"><span className="kick">Stats</span><span className="legend">Base → this build · changed values in orange · tap a number for its parts</span></div>
      <div className="stat-cols two">
        {SECTIONS.map(s => (
          <section key={s.title} className="panel st">
            <h3>{s.title}<span className="cols"><span>Base</span><span>Build</span></span></h3>
            {s.keys.map(k => (
              <div key={k} className="st-row cmp">
                <span className="st-l">{STAT[k].label}</span>
                <Num stat={k} ctx={bctx} className="st-v dim" />
                <Num stat={k} ctx={ctx} base={base} className="st-v" />
              </div>
            ))}
          </section>
        ))}
      </div>
      <h2 className="h2">Moves in this build</h2>
      <MoveCards c={c} view={vA} compact />
      <Notes view={vA} />
    </>
  );
}

function Notes({ view, label }) {
  const notes = view?.notes || [];
  if (!notes.length) return null;
  return (
    <div className="panel notes-panel">
      <div className="kick">{label || 'Effects not in the numbers'}</div>
      {notes.map((n, i) => <div key={i}><b>{n.source}:</b> {noteText(n.text)}</div>)}
    </div>
  );
}

/* ---------------- results: compare two builds ---------------- */
const pick = (k, a, b) => {
  const x = typeof a === 'number' ? a : parseFloat(a), y = typeof b === 'number' ? b : parseFloat(b);
  if (!Number.isFinite(x) || !Number.isFinite(y) || x === y) return 0;
  const hi = STAT[k].better === 'high';
  return (x > y) === hi ? -1 : 1; // -1: A better, 1: B better
};
function diffText(k, a, b) {
  const x = typeof a === 'number' ? a : parseFloat(a), y = typeof b === 'number' ? b : parseFloat(b);
  if (!Number.isFinite(x) || !Number.isFinite(y) || x === y) return '';
  if (k === 'kiBlastLimit' && (x >= 999 || y >= 999)) return '∞';
  if (STAT[k].fmt === STAT.meleeDefenseStat.fmt || STAT[k].fmt === STAT.sparkCharge.fmt) return `${Math.abs((x - y) * 100).toFixed(1).replace('.0', '')} pts`;
  const d = Math.abs(y - x);
  return d >= 10 ? Math.round(d).toLocaleString() : +d.toFixed(3);
}

function CompareResults({ sA, vA, sB, vB }) {
  const cA = sA.c, cB = sB.c;
  const ctxA = { c: cA, side: sA, view: vA }, ctxB = { c: cB, side: sB, view: vB };
  let winsA = 0, winsB = 0;
  for (const s of SECTIONS) for (const k of s.keys) { const w = pick(k, valueOf(k, vA), valueOf(k, vB)); if (w < 0) winsA++; if (w > 0) winsB++; }
  return (
    <>
      <div className="vs-head">
        <span className="who"><Portrait id={cA.id} size={36} /><span className="nm">{cA.name}</span></span>
        <span className="vs-score"><b className="good">{winsA}</b> better · <b className="good">{winsB}</b> better</span>
        <span className="who r"><span className="nm">{cB.name}</span><Portrait id={cB.id} size={36} /></span>
      </div>
      <div className="stat-cols two">
        {SECTIONS.map(s => (
          <section key={s.title} className="panel st">
            <h3>{s.title}<span className="cols"><span>A</span><span>B</span><span>Diff</span></span></h3>
            {s.keys.map(k => {
              const a = valueOf(k, vA), b = valueOf(k, vB), w = pick(k, a, b);
              return (
                <div key={k} className="st-row cmp3">
                  <span className="st-l">{STAT[k].label}</span>
                  <Num stat={k} ctx={ctxA} className={`st-v${w < 0 ? ' win' : ''}`} />
                  <Num stat={k} ctx={ctxB} className={`st-v${w > 0 ? ' win' : ''}`} />
                  <span className={`st-d ${w < 0 ? 'a' : w > 0 ? 'b' : ''}`}>{w ? `${w < 0 ? 'A' : 'B'} ${diffText(k, a, b) === '∞' ? '' : '+'}${diffText(k, a, b)}` : '='}</span>
                </div>
              );
            })}
          </section>
        ))}
        <section className="panel st">
          <h3>Moves<span className="cols mv2"><span>A</span><span>B</span></span></h3>
          {['Super 1', 'Super 2', 'Ultimate'].map(slot => {
            const ba = blastsOf(cA).find(x => x.slot === slot && !x.variant), bb = blastsOf(cB).find(x => x.slot === slot && !x.variant);
            const na = ba && blastNumbers(cA, ba, vA), nb = bb && blastNumbers(cB, bb, vB);
            return (
              <div key={slot} className="st-row mvrow">
                <span className="st-l">{slot}</span>
                {ba ? <Explain className="st-v mv" title={ba.name} sub={cA.name} rows={blastRows(cA, ba, vA)}><span>{na.damage?.toLocaleString() ?? '—'}</span><em>{ba.name} · {na.ki} bars</em></Explain> : <span className="st-v">—</span>}
                {bb ? <Explain className="st-v mv" title={bb.name} sub={cB.name} rows={blastRows(cB, bb, vB)}><span>{nb.damage?.toLocaleString() ?? '—'}</span><em>{bb.name} · {nb.ki} bars</em></Explain> : <span className="st-v">—</span>}
              </div>
            );
          })}
        </section>
      </div>
      <Notes view={vA} label={`${cA.name}: not in the numbers`} />
      <Notes view={vB} label={`${cB.name}: not in the numbers`} />
    </>
  );
}

/* ---------------- results: a build against an opponent ---------------- */
function attackRows(att, atkSide, atkCaps, def, defCaps) {
  const breaksArmor = atkCaps.includes(DRACONIC_AURA) || atkCaps.includes(DRAGON_RUSH);
  const defNoArmor = breaksArmor ? { ...def, armor: 0 } : def;
  const combo = calcOutgoingCombo(att, defNoArmor);
  const volley = kiBlastVolley(att, { opponentStats: def, opponentHasLightBody: defCaps.includes(LIGHT_BODY), attackerHasDraconicAura: atkCaps.includes(DRACONIC_AURA) });
  const kiArmor = atkCaps.includes(DRACONIC_AURA) ? 0 : def.armor || 0;
  const rows = [
    ['Rush 5-hit', combo.rush5Hit, combo.perHit.map((h, i) => [`Hit ${i + 1}`, String(h.damage), `${[att.rush, att.hit2, att.hit3, att.hit4, att.hit5][i]} × ${def.meleeDefenseStat.toFixed(3)} melee defense${h.armorReduced ? ` × ${1 - def.armor} armor` : ''}`])],
    ['Smash', damageTaken(att.smash, def.meleeDefenseStat), [['Smash', String(att.smash), 'Attacker'], ['Melee defense', `× ${def.meleeDefenseStat.toFixed(3)}`, 'Defender']]],
    ['Throw', damageTaken(att.throw, def.meleeDefenseStat), [['Throw', String(att.throw), 'Attacker'], ['Melee defense', `× ${def.meleeDefenseStat.toFixed(3)}`, 'Defender']]],
    ['Ki blast', damageTaken(att.kiBlastDmg, def.energy, 1 - kiArmor), [['Ki blast', String(att.kiBlastDmg), 'Attacker'], ['Ki blast defense', `× ${def.energy.toFixed(3)}`, 'Defender'], ...(kiArmor ? [['Armor', `× ${1 - kiArmor}`, 'Defender']] : [])]],
    ['Ki blast volley', volley, [['Shots', att.kiBlastLimit >= 999 ? '20 (unlimited)' : String(att.kiBlastLimit), 'Attacker'], ['Falloff', kiArmor || defCaps.includes(LIGHT_BODY) ? 'None (armor)' : '−5% a shot, 40% floor', 'Hits on armor are not a combo']]],
  ];
  for (const slot of ['Super 1', 'Super 2', 'Ultimate']) {
    const b = blastsOf(atkSide.c).find(x => x.slot === slot && !x.variant);
    if (!b) continue;
    const nb = blastNumbers(atkSide.c, b, att);
    rows.push([`${slot}: ${b.name}`, nb.damage == null ? null : damageTaken(nb.damage, def.blastDefense), [...blastRows(atkSide.c, b, att).filter(r => !r[3] || r[0] === 'Damage').slice(0, 4), ['Blast defense', `× ${def.blastDefense.toFixed(3)}`, 'Defender']]]);
  }
  return rows;
}

function VersusResults({ A, B, sA, vA, sB, vB }) {
  const cA = sA.c, cB = sB.c;
  const out = attackRows(vA, sA, A.caps, vB, B.caps);
  const inc = attackRows(vB, sB, B.caps, vA, A.caps);
  const ko = (hp, dmg) => (dmg ? Math.ceil(hp / dmg) : '—');
  return (
    <>
      <div className="vs-head">
        <span className="who"><Portrait id={cA.id} size={36} /><span className="nm">{cA.name}</span></span>
        <span className="vs-score">HP {vA.health.toLocaleString()} · HP {vB.health.toLocaleString()}</span>
        <span className="who r"><span className="nm">{cB.name}</span><Portrait id={cB.id} size={36} /></span>
      </div>
      <section className="panel st wide">
        <h3>Damage dealt<span className="cols"><span>You → them</span><span>Them → you</span></span></h3>
        {out.map(([label, v, rows], i) => {
          const [, w, wrows] = inc[i] || [];
          return (
            <div key={label} className="st-row cmp">
              <span className="st-l">{label.replace(/^(Super \d|Ultimate): .*/, '$1')}</span>
              <Explain className="st-v" title={`${label} → ${cB.name}`} sub={cA.name} rows={[...rows, [label, v?.toLocaleString() ?? '—', 'After their defenses, rounded up per hit', true]]}>{v?.toLocaleString() ?? '—'}</Explain>
              {inc[i] ? <Explain className="st-v" title={`${inc[i][0]} → ${cA.name}`} sub={cB.name} rows={[...wrows, [inc[i][0], w?.toLocaleString() ?? '—', 'After your defenses, rounded up per hit', true]]}>{w?.toLocaleString() ?? '—'}</Explain> : <span className="st-v">—</span>}
            </div>
          );
        })}
      </section>
      <section className="panel st wide">
        <h3>To knock out<span className="cols"><span>You</span><span>Them</span></span></h3>
        <div className="st-row cmp"><span className="st-l">Rush combos</span><span className="st-v">{ko(vB.health, out[0][1])}</span><span className="st-v">{ko(vA.health, inc[0][1])}</span></div>
        <div className="st-row cmp"><span className="st-l">Ultimates</span><span className="st-v">{ko(vB.health, out.at(-1)[1])}</span><span className="st-v">{ko(vA.health, inc.at(-1)[1])}</span></div>
      </section>
      <Notes view={vA} label={`${cA.name}: not in the numbers`} />
      <Notes view={vB} label={`${cB.name}: not in the numbers`} />
    </>
  );
}
