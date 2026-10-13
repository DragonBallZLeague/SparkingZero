// Full stats: every section of the character's stats. On a desktop each section is a small table laid
// out across (round 22, the league's pick), sections sharing a line and filling it; on a phone the
// stacked list (label, Base, Build). Sections fold; a closed one keeps its headline numbers.
import React, { useEffect, useState } from 'react';
import {
  faceUrl, nameParts, gameMoves, chainTypes, armorBreaks, fiveHitTaken, fiveHitTakenArmored, volley,
  perceptionName, blastsOf, skillOf, blastDamage,
} from './model.js';
import { Tap, Val, Fold, Name, PhoneSectionNav, usePhone, usePair, useBase } from './ui.jsx';
import { MoveCards, orderedBlasts } from './moves.jsx';
import { ClassChip, SkillSwitches, CapsuleRows, traitChips, ChangeButton } from './sheet.jsx';
import { Conditions } from './conditions.jsx';
import { F } from './format.js';

const A = (get) => (sides) => get(sides.A.view, sides.A);
const GM = (get) => (sides) => get(gameMoves(sides.A), sides.A);
const cell = (h, get, o = {}) => ({ h, get, long: o.long || h, fmt: o.fmt || F.int, kind: o.kind || 'int', less: !!o.less, text: o.text, small: o.small });
const def = (h, get, long) => cell(h, (s) => 1 - get(s.A.view), { fmt: (x) => F.def(1 - x), kind: 'def', long });

/* ------------------------------------------------------------------ the sections */
function sections(side) {
  const { c, view: v } = side;
  const gm = gameMoves(side);
  const mob = c.mobility || {};
  const ps = c.moveset?.pursuits || {};
  const yes = (b) => (b === false ? 'No' : 'Yes');
  return [
    {
      id: 'tough', title: 'Toughness', cls: '',
      groups: [
        [null, [cell('HP', A(x => x.health))]],
        // Armored: the same rush with this fighter's armor up (a giant's Hyper Armor, Sparking Armor), the hits
        // before the one that breaks it reduced. Only shown when the fighter has armor now; otherwise it equals Normal.
        v.armor > 0
          ? ['5-hit taken', [cell('Normal', A(fiveHitTaken), { less: true, long: '5-hit damage taken' }), cell('Armored', A(fiveHitTakenArmored), { less: true, long: '5-hit taken, armored' })]]
          : [null, [cell('5-hit taken', A(fiveHitTaken), { less: true, long: '5-hit damage taken' })]],
        ['Defense', [def('Melee', x => x.meleeDefenseStat, 'Melee defense'), def('Blast', x => x.blastDefense, 'Blast defense'), def('Ki blast', x => x.energy, 'Ki-blast defense')]],
        [null, [cell('Armor', A(x => x.armor), { fmt: F.armor, kind: 'def' }), cell('Switch', A(x => x.switch), { fmt: F.secs, kind: 'dec', less: true })]],
      ],
      summary: [['HP', F.int(v.health)], ['5-hit taken', F.int(v.melee)], ['Armor', F.armor(v.armor)]],
    },
    {
      id: 'res', title: 'Resources', cls: 'res',
      groups: [
        ['Ki (bars)', [
          cell('Start', A(x => x.startingKi), { fmt: F.bars, kind: 'dec', long: 'Starting ki (bars)' }),
          cell('Charge per sec', A(x => x.kiCharge), { fmt: F.dec2, kind: 'dec', long: 'Ki charge (bars/s)' }),
          cell('Regen per sec', A(x => x.kiRegen), { fmt: F.dec, kind: 'dec', long: 'Ki regen (bars/s)' }),
          cell('Refills to', A(x => x.kiRegenRange), { fmt: String, kind: 'dec', long: 'Ki refills to (bars)' }),
          cell('From hits', A(x => x.attackKiGain), { fmt: F.dec, kind: 'dec', long: 'Ki from hits (bars)' }),
        ]],
        ['Skill gauge', [
          cell('Start', A(x => x.skillStart), { fmt: String, kind: 'dec', long: 'Skill gauge at start' }),
          cell('Limit', A(x => x.skillLimit), { fmt: String, kind: 'dec', long: 'Skill gauge limit' }),
          cell('Per minute', A(x => parseFloat(x.skillRegen)), { fmt: F.dec, kind: 'dec', long: 'Skill gauge per minute' }),
        ]],
      ],
      summary: [['Ki charge', F.dec2(v.kiCharge)], ['Ki regen', F.dec(v.kiRegen)], ['Skill gauge limit', v.skillLimit]],
    },
    {
      id: 'melee', title: 'Melee', cls: 'off', split: 1,
      groups: [
        ['Rush', [
          cell('Hit 1', A(x => x.rush), { long: 'Rush hit 1' }), cell('Hit 2', A(x => x.hit2), { long: 'Rush hit 2' }), cell('Hit 3', A(x => x.hit3), { long: 'Rush hit 3' }),
          cell('Hit 4', A(x => x.hit4), { long: 'Rush hit 4' }), cell('Hit 5', A(x => x.hit5), { long: 'Rush hit 5' }),
          cell('Total', A(x => x.rush5Hit), { long: 'Rush 5-hit total' }), cell('Into armor', A(x => x.fiveHitAfterArmor), { long: 'Rush 5-hit into armor' }),
        ]],
        ['Smash', gm.smash.map((_, i) => cell(`Lv.${i + 1}`, GM(g => g.smash[i]), { long: `Smash, Charge Lv.${i + 1}` }))],
        [null, [cell('Throw', A(x => x.throw)), cell('Pursuit', A(x => x.pursuit)), cell('Armor break', A(x => x.armorBreak), { fmt: F.hits, kind: 'dec', less: true })]],
      ],
      summary: [['Rush 5-hit', F.int(v.rush5Hit)], ['Smash', F.int(gm.smash[0])], ['Throw', F.int(v.throw)], ['Armor break', F.hits(v.armorBreak)]],
    },
    { id: 'chains', title: 'Rush Chains', cls: 'mov', custom: 'chains', summary: chainTypes(side).types.map(t => [t.type, F.int(t.dmg?.damage?.at(-1))]) },
    { id: 'kib', title: 'Ki blasts', cls: 'kib', custom: 'kib', summary: [['Ki blast', F.int(v.kiBlastDmg)], ['Limit', F.count(v.kiBlastLimit)], ['Full volley', F.int(volley(v))], ...(gm.charged ? [['Charged', F.int(gm.charged.damage.at(-1))]] : [])] },
    { id: 'armor', title: 'Breaking armor', cls: 'armp', custom: 'armor', summary: armorSummary(v) },
    {
      id: 'limits', title: 'Combat limits', cls: 'new',
      groups: [
        [null, [cell('Follow-ups', null, { text: String(ps.limit ?? 0), small: ps.sparkingAdd ? `+${ps.sparkingAdd} in Sparking!` : null })]],
        ['Pursuits', [cell('Vanishing Attack', null, { text: yes(ps.vanishingAttack) }), cell('Lightning Attack', null, { text: yes(ps.lightningAttack) }), cell('Dragon Homing', null, { text: yes(ps.dragonHoming) })]],
      ],
      summary: [['Follow-ups', ps.limit ?? 0], [[ps.vanishingAttack, ps.lightningAttack, ps.dragonHoming].every(x => x !== false) ? 'Every pursuit' : 'Some pursuits', null]],
    },
    { id: 'mob', title: 'Mobility', cls: 'mob', custom: 'mob', tag: mob.canFly === false ? "Can't fly" : 'Can fly', summary: [[mob.canFly === false ? "Can't fly" : 'Can fly', null], ['Short Dash', F.bars(v.shortDashCost)], ['Z-Burst Dash', F.bars(mob.zBurstDash?.start)]] },
    {
      id: 'spk', title: 'Sparking! Mode', cls: 'spk',
      groups: [[null, [
        cell('Hyper Smash', GM(g => g.hyperSmash)), cell('Burst Melee Attack', null, { text: '1,250' }), cell('Burst Rush hit', null, { text: '450' }),
        cell('Violent Rush', null, { text: c.moveset?.unavailable?.includes('Violent Rush') ? 'No' : 'Yes' }),
        cell('Follow-ups', null, { text: `+${ps.sparkingAdd ?? 0}`, long: 'Extra follow-ups' }),
        cell('Armor', null, { text: c.armor?.sparking ? `${Math.round((1 - c.armor.sparking.damageRate) * 100)}%` : 'None', long: 'Sparking armor' }),
      ]]],
      summary: [['Hyper Smash', F.int(gm.hyperSmash)], [c.moveset?.unavailable?.includes('Violent Rush') ? 'No Violent Rush' : 'Violent Rush', null]],
    },
    { id: 'traits', title: 'Traits', cls: 'neutral', custom: 'traits', summary: traitSummary(c) },
    { id: 'cmd', title: 'Command list', cls: 'cmd', custom: 'cmd', full: true, summary: cmdSummary(side) },
  ];
}

function armorSummary(v) {
  const rows = armorBreaks(v) || [];
  const rush = rows.slice(0, 4).findIndex(r => r.sparking);
  return [['Rush breaks on', rush >= 0 ? `hit ${rush + 1}` : 'hit 5'], ['Lv.1 smash', rows[4]?.sparking ? 'breaks' : 'holds'], ['Ki blast', rows[5]?.sparking ? 'breaks' : 'holds']];
}
function traitSummary(c) {
  const t = traitChips(c).map(([x]) => [x, null]);
  return t.length ? t : [['None', null]];
}
function cmdSummary(side) {
  const out = orderedBlasts(side.c, { alternates: false }).map(b => [b.slot === 'Ultimate' ? 'ULT' : b.slot === 'Super 1' ? 'B1' : 'B2', F.int(blastDamage(side, b).damage)]);
  for (const n of [1, 2]) { const s = skillOf(side.c, n); if (s) out.push([`S${n} ${s.name}`, null]); }
  return out;
}

/* ------------------------------------------------------------------ desktop: rows */
function StatTable({ groups }) {
  const anyLabel = groups.some(([l]) => l);
  return (
    <table className="ht">
      <thead>
        {anyLabel && <tr className="g">{groups.map(([l, cells], gi) => <th key={gi} colSpan={cells.length} className={gi ? 'gs' : ''}>{l && <span>{l}</span>}</th>)}</tr>}
        <tr>{groups.flatMap(([, cells], gi) => cells.map((c, ci) => <th key={`${gi}-${ci}`} className={gi && !ci ? 'gs' : ''}>{c.h}</th>))}</tr>
      </thead>
      <tbody><tr>{groups.flatMap(([, cells], gi) => cells.map((c, ci) => (
        <td key={`${gi}-${ci}`} className={gi && !ci ? 'gs' : ''}>
          {c.get ? <Val title={c.long} get={c.get} fmt={c.fmt} kind={c.kind} lessIsBetter={c.less} /> : c.text}
          {c.small && <small>{c.small}</small>}
        </td>
      )))}</tr></tbody>
    </table>
  );
}

function RowsSection({ s, side, abTab, setAbTab }) {
  if (!s.custom) {
    if (s.split) {
      return <div className="htw"><StatTable groups={s.groups.slice(0, s.split)} /><StatTable groups={s.groups.slice(s.split)} /></div>;
    }
    return <StatTable groups={s.groups} />;
  }
  if (s.custom === 'chains') return <ChainsMatrix side={side} />;
  if (s.custom === 'kib') return <KiBlastMatrix side={side} />;
  if (s.custom === 'armor') return <ArmorMatrix side={side} tab={abTab} setTab={setAbTab} />;
  if (s.custom === 'mob') return <MobilityMatrix side={side} />;
  if (s.custom === 'traits') return <Traits c={side.c} />;
  if (s.custom === 'cmd') return null;
  return null;
}

const ctypeGet = (type, lv, grand = false) => (sides) => {
  const t = chainTypes(sides.A);
  const d = grand ? t.ms[grand] : t.types.find(x => x.type === type)?.dmg;
  return d?.damage?.[lv];
};
const fuTotal = (type, name, grand = false) => (sides) => {
  const t = chainTypes(sides.A);
  const d = grand ? t.ms[grand] : t.types.find(x => x.type === type)?.dmg;
  return d?.followUps?.find(f => f.name === name)?.total;
};

function chainRowsFor(side) {
  const { types, ms } = chainTypes(side);
  const out = types.map(t => ({ type: t.type, sub: `Rush Chain${t.slots.length > 1 ? 's' : ''} ${t.slots.join(' and ')}`, dmg: t.dmg, fus: (t.dmg?.followUps || []).filter(f => t.followUps.includes(f.name)) }));
  if (ms.grand) out.push({ type: 'Grand Slash', sub: 'Every character', dmg: ms.grand, fus: ms.grand.followUps.filter(f => ms.grand.allowed.includes(f.name)), grand: 'grand' });
  if (ms.lift) out.push({ type: 'Lift Strike', sub: 'Most characters', dmg: ms.lift, fus: [], grand: 'lift' });
  return { rows: out, ms };
}
const fuSmall = (f, dmg) => [`${f.hits.length} hit${f.hits.length === 1 ? '' : 's'}`, f.needsFullCharge && `after Lv.${dmg.damage.length}`, f.flurry && '+ ki blasts'].filter(Boolean).join(', ');

function ChainsMatrix({ side }) {
  const { rows, ms } = chainRowsFor(side);
  return (
    <>
      <table className="ht mx">
        <thead>
          <tr className="g"><th></th><th colSpan={3} className="gs"><span>Charge level</span></th><th colSpan={2} className="gs"><span>Follow-up</span></th></tr>
          <tr><th></th><th className="gs">Lv.1</th><th>Lv.2</th><th>Lv.3</th><th className="gs">Attack</th><th>Damage</th></tr>
        </thead>
        {rows.map(r => {
          const n = Math.max(1, r.fus.length);
          const lv = r.dmg && r.dmg.chargeable && r.dmg.damage.length > 1
            ? r.dmg.damage.map((_, i) => <td key={i} className={i ? '' : 'gs'} rowSpan={n}><Val title={`${r.type}, Charge Lv.${i + 1}`} get={ctypeGet(r.type, i, r.grand)} /></td>)
            : [<td key="u" className="gs ctr" colSpan={3} rowSpan={n}>{r.dmg && <Val title={r.type} get={ctypeGet(r.type, 0, r.grand)} />}<small>Can't be charged</small></td>];
          const fuCells = (f) => f
            ? [<td key="n" className="fup gs">{f.name}<small>{fuSmall(f, r.dmg)}</small></td>, <td key="d"><Val title={f.name} get={fuTotal(r.type, f.name, r.grand)} extra={(p) => <div className="hitl">Hits<span className="tags">{(r.grand ? chainTypes(p.A).ms[r.grand] : chainTypes(p.A).types.find(x => x.type === r.type)?.dmg)?.followUps.find(x => x.name === f.name)?.hits.map((h, i) => <span key={i}>{F.int(h)}</span>)}</span></div>} /></td>]
            : [<td key="n" className="gs"></td>, <td key="d"></td>];
          return (
            <tbody key={r.type}>
              <tr><th rowSpan={n}>{r.type}<small>{r.sub}</small></th>{lv}{fuCells(r.fus[0])}</tr>
              {r.fus.slice(1).map(f => <tr key={f.name}>{fuCells(f)}</tr>)}
            </tbody>
          );
        })}
      </table>
      <div className="chainmisc"><span><small>Step-In Chain</small>{ms.stepIn || 'None'}</span><span><small>Rush-In Attack</small>{ms.rushIn || 'None'}</span><span><small>Perception</small>{perceptionName(ms.counter)}</span></div>
    </>
  );
}

function kiRows(side) {
  const { view: v } = side;
  const gm = gameMoves(side);
  const same = (a, b) => a && b && JSON.stringify(a.damage) === JSON.stringify(b.damage);
  const tagText = (t) => (t || []).filter(x => !['giant'].includes(x)).join(', ');
  const rows = [
    { label: 'Ki blast', sub: [gm.kiBlastTags.length && !gm.kiBlastTags.includes('none') ? gm.kiBlastTags.join(', ') : 'Standard', `full volley ${F.int(volley(v))}`].join(', '), dmg: A(x => x.kiBlastDmg), shots: F.count(v.kiBlastLimit), cost: F.bars(v.kiBlastCost), costGet: A(x => x.kiBlastCost) },
  ];
  if (gm.charged) rows.push({ label: 'Charged ki blast', sub: tagText(gm.charged.tags), lv: gm.charged.damage.map((_, i) => GM(g => g.charged.damage[i])), shots: gm.charged.shots, cost: F.bars(gm.charged.cost) });
  if (gm.chargedMoving && !same(gm.chargedMoving, gm.charged)) rows.push({ label: 'Charged, while moving', lv: gm.chargedMoving.damage.map((_, i) => GM(g => g.chargedMoving.damage[i])), shots: gm.chargedMoving.shots, cost: F.bars(gm.chargedMoving.cost) });
  if (gm.jump) rows.push({ label: 'Jump ki blast', dmg: GM(g => g.jump.damage), shots: gm.jump.count, cost: F.bars(gm.jump.cost) });
  if (gm.dash) rows.push({ label: 'Dash ki blast', dmg: GM(g => g.dash.damage), shots: gm.dash.count, cost: F.bars(gm.dash.cost) });
  if (gm.jumpCharged && same(gm.jumpCharged, gm.dashCharged)) rows.push({ label: 'Jump / dash charged', lv: gm.jumpCharged.damage.map((_, i) => GM(g => g.jumpCharged.damage[i])), shots: gm.jumpCharged.shots, cost: F.bars(gm.jumpCharged.cost) });
  else {
    if (gm.jumpCharged) rows.push({ label: 'Jump, charged', lv: gm.jumpCharged.damage.map((_, i) => GM(g => g.jumpCharged.damage[i])), shots: gm.jumpCharged.shots, cost: F.bars(gm.jumpCharged.cost) });
    if (gm.dashCharged) rows.push({ label: 'Dash, charged', lv: gm.dashCharged.damage.map((_, i) => GM(g => g.dashCharged.damage[i])), shots: gm.dashCharged.shots, cost: F.bars(gm.dashCharged.cost) });
  }
  return rows;
}

function KiBlastMatrix({ side }) {
  const rows = kiRows(side);
  return (
    <table className="ht mx">
      <thead>
        <tr className="g"><th></th><th className="gs"></th><th colSpan={3} className="gs"><span>Charge level</span></th><th colSpan={2} className="gs"></th></tr>
        <tr><th></th><th className="gs">Damage</th><th className="gs">Lv.1</th><th>Lv.2</th><th>Lv.3</th><th className="gs">Shots</th><th>Ki cost</th></tr>
      </thead>
      {rows.map(r => (
        <tbody key={r.label}><tr>
          <th>{r.label}{r.sub && <small>{r.sub}</small>}</th>
          <td className="gs">{r.dmg && <Val title={r.label} get={r.dmg} />}</td>
          {[0, 1, 2].map(i => <td key={i} className={i ? '' : 'gs'}>{r.lv?.[i] && <Val title={`${r.label}, Charge Lv.${i + 1}`} get={r.lv[i]} />}</td>)}
          <td className="gs">{r.shots}</td>
          <td>{r.costGet ? <Val title={`${r.label} cost`} get={r.costGet} fmt={F.bars} kind="dec" lessIsBetter /> : r.cost}</td>
        </tr></tbody>
      ))}
    </table>
  );
}

const SHIELD = { hold: <span className="no"><i className="arm" />Holds</span>, brk: <span className="ok">Breaks</span> };
function armorRowsAt(side, tab) {
  const up = side.c.sparking?.armorBreakLevel ?? 3;
  const offset = (tab === 'sp' ? up : 0) - (side.spec.sparking ? up : 0);
  return armorBreaks(side.view, offset) || [];
}
function ArmorMatrix({ side, tab, setTab }) {
  const rows = armorRowsAt(side, tab);
  const armors = [['Hyper Armor', 'hyper'], ['Sparking Armor', 'sparking'], ['Hyper, in Sparking', 'hyperSparking']];
  return (
    <>
      <div className="abtabs"><button className={tab === 'n' ? 'on' : ''} onClick={() => setTab('n')}>Normal</button><button className={`sp${tab === 'sp' ? ' on' : ''}`} onClick={() => setTab('sp')}>In Sparking!</button></div>
      <table className="ht mx">
        <thead>
          <tr className="g"><th></th><th colSpan={4} className="gs"><span>Rush hit</span></th><th colSpan={3} className="gs"></th></tr>
          <tr><th>Against</th>{['1', '2', '3', '4', 'Smash Lv.1', 'Ki blast', 'Charged ki blast'].map((h, i) => <th key={h} className={i === 0 || i === 4 ? 'gs' : ''}>{h}</th>)}</tr>
        </thead>
        {armors.map(([label, k]) => (
          <tbody key={k}><tr><th>{label}</th>{rows.map((r, i) => <td key={r.label} className={i === 0 || i === 4 ? 'gs' : ''}>{r[k] ? SHIELD.brk : SHIELD.hold}</td>)}</tr></tbody>
        ))}
      </table>
      <div className="abnote">Armor takes 10% off a hit (Hyper Armor) or 25% (Sparking Armor) until a hit breaks it. A Heavy Finish breaks armor like the smash. Rush hit 5, higher smash charges, throws, blasts and ultimates break every armor.</div>
    </>
  );
}

function mobCells(side) {
  const m = side.c.mobility || {};
  const v = side.view;
  const r = (x) => (typeof x === 'number' ? F.bars(x) : '');
  return [
    // the short dash is the one a capsule changes (Light Body, ...): a tappable value, orange with "Base" when changed
    ['Short', typeof v.shortDashCost === 'number' ? <Val title="Short Dash cost" get={A(x => x.shortDashCost)} fmt={F.bars} kind="dec" lessIsBetter /> : '', ''], ['Step-cancel', r(m.stepCancelCost), ''], ['Dragon', r(m.dragonDash?.start), r(m.dragonDash?.perSecond)],
    ['High-Speed', r(m.dragonDash?.start), r(m.dragonDash?.highSpeedPerSecond)], ['Z-Burst', r(m.zBurstDash?.start), r(m.zBurstDash?.perSecond)],
    ['Ascend / Descend', r(m.dashUp?.start), r(m.dashUp?.perSecond)], ['Dragon Homing', r(m.dragonHoming?.start), r(m.dragonHoming?.perSecond)],
  ];
}
function MobilityMatrix({ side }) {
  const cells = mobCells(side);
  return (
    <table className="ht mx">
      <thead>
        <tr className="g"><th></th><th colSpan={5} className="gs"><span>Dash</span></th><th colSpan={2} className="gs"></th></tr>
        <tr><th>Ki cost (bars)</th>{cells.map(([h], i) => <th key={h} className={i === 0 || i === 5 ? 'gs' : ''}>{h}</th>)}</tr>
      </thead>
      <tbody><tr><th>To start</th>{cells.map(([h, a], i) => <td key={h} className={i === 0 || i === 5 ? 'gs' : ''}>{a}</td>)}</tr></tbody>
      <tbody><tr><th>Per sec</th>{cells.map(([h, , b], i) => <td key={h} className={i === 0 || i === 5 ? 'gs' : ''}>{b}</td>)}</tr></tbody>
    </table>
  );
}

function Traits({ c }) {
  const ab = (c.moveset?.abilities || []).filter(x => x !== 'Hyper armor');
  const missing = c.moveset?.unavailable || [];
  return (
    <>
      {(c.passives || []).map(p => <div className="trait" key={p.name}><b>{p.condition.replace(/^health /, '').replace(/^below/, 'Below')}</b><span>all damage +{Math.round((p.effects?.[0]?.value ?? 0) * 100)}%</span></div>)}
      {traitChips(c).filter(([t]) => t !== 'Low-HP power-up').length > 0 && <div className="trait"><b>Plays</b><span className="tags">{traitChips(c).filter(([t]) => t !== 'Low-HP power-up').map(([t]) => <span key={t}>{t}</span>)}</span></div>}
      {ab.length > 0 && <div className="trait"><b>Abilities</b><span className="tags">{ab.map(t => <span key={t}>{t}</span>)}</span></div>}
      {missing.length > 0 && <div className="trait"><b>Can't use</b><span className="tags">{missing.map(t => <span key={t}>{t}</span>)}</span></div>}
      {!(c.passives || []).length && !ab.length && !missing.length && !traitChips(c).length && <div className="trait"><span>Nothing unusual</span></div>}
    </>
  );
}

/* ------------------------------------------------------------------ phone: the stacked list */
/** The Base column: the value with no build. */
function B({ get, fmt = F.int }) {
  const b = useBase(get);
  return typeof b === 'number' ? fmt(b) : null;
}
function PhoneRow({ c }) {
  const b = useBase(c.get || (() => null));
  return (
    <div className="srow">
      <span>{c.long}</span>
      <span>{c.get ? c.fmt(b) : ''}</span>
      <span>{c.get ? <Tap title={c.long} get={c.get} fmt={c.fmt} kind={c.kind} lessIsBetter={c.less} /> : c.text}</span>
    </div>
  );
}
function PhoneSection({ s, side, abTab, setAbTab }) {
  if (!s.custom) {
    return (<><div className="srow h"><span></span><span>Base</span><span>Build</span></div>{s.groups.flatMap(([, cells]) => cells).map(c => <PhoneRow key={c.long} c={c} />)}</>);
  }
  if (s.custom === 'chains') {
    const { rows, ms } = chainRowsFor(side);
    return (
      <>
        {rows.map(r => (
          <React.Fragment key={r.type}>
            <div className="srow ch"><span><b>{r.type}</b><small>{r.sub}</small></span><span>{r.dmg && !(r.dmg.chargeable && r.dmg.damage.length > 1) && <B get={ctypeGet(r.type, 0, r.grand)} />}</span><span>{r.dmg && !(r.dmg.chargeable && r.dmg.damage.length > 1) && <Tap title={r.type} get={ctypeGet(r.type, 0, r.grand)} />}</span></div>
            {r.dmg && r.dmg.chargeable && r.dmg.damage.length > 1 && r.dmg.damage.map((_, i) => <div className="srow sub" key={i}><span>Charge Lv.{i + 1}</span><span><B get={ctypeGet(r.type, i, r.grand)} /></span><span><Tap title={`${r.type}, Charge Lv.${i + 1}`} get={ctypeGet(r.type, i, r.grand)} /></span></div>)}
            {r.fus.map(f => <div className="srow sub fw" key={f.name}><span>{f.name}<small>{fuSmall(f, r.dmg)}</small></span><span><B get={fuTotal(r.type, f.name, r.grand)} /></span><span><Tap title={f.name} get={fuTotal(r.type, f.name, r.grand)} /></span></div>)}
          </React.Fragment>
        ))}
        <div className="chainmisc"><span><small>Step-In Chain</small>{ms.stepIn || 'None'}</span><span><small>Rush-In Attack</small>{ms.rushIn || 'None'}</span><span><small>Perception</small>{perceptionName(ms.counter)}</span></div>
      </>
    );
  }
  if (s.custom === 'kib') {
    return (<>{kiRows(side).map(r => (
      <React.Fragment key={r.label}>
        <div className="srow"><span>{r.label}</span><span>{r.dmg && <B get={r.dmg} />}</span><span>{r.dmg && <Tap title={r.label} get={r.dmg} />}</span></div>
        {r.lv?.map((g, i) => <div className="srow sub" key={i}><span>Charge Lv.{i + 1}</span><span><B get={g} /></span><span><Tap title={`${r.label}, Charge Lv.${i + 1}`} get={g} /></span></div>)}
        <div className="srow sub"><span>Shots, ki cost (bars)</span><span></span><span>{r.shots}, {r.cost}</span></div>
      </React.Fragment>
    ))}</>);
  }
  if (s.custom === 'armor') {
    const rows = armorRowsAt(side, abTab);
    return (
      <>
        <div className="abtabs"><button className={abTab === 'n' ? 'on' : ''} onClick={() => setAbTab('n')}>Normal</button><button className={`sp${abTab === 'sp' ? ' on' : ''}`} onClick={() => setAbTab('sp')}>In Sparking!</button></div>
        <div className="abrow h"><span>Against</span><span>Hyper Armor</span><span>Sparking Armor</span><span>Hyper, in Sparking</span></div>
        {rows.map(r => <div className="abrow" key={r.label}><span>{r.label}</span>{['hyper', 'sparking', 'hyperSparking'].map(k => <span key={k}>{r[k] ? SHIELD.brk : SHIELD.hold}</span>)}</div>)}
      </>
    );
  }
  if (s.custom === 'mob') {
    return (<><div className="srow h"><span>Ki cost (bars)</span><span>Start</span><span>Per sec</span></div>{mobCells(side).map(([h, a, b]) => <div className="srow" key={h}><span>{h === 'Short' || h === 'Step-cancel' || h === 'Dragon' || h === 'High-Speed' || h === 'Z-Burst' ? `${h === 'Dragon' ? 'Dragon Dash' : h === 'High-Speed' ? 'High-Speed Dragon Dash' : h === 'Z-Burst' ? 'Z-Burst Dash' : h === 'Short' ? 'Short Dash' : 'Step-cancel dash'}` : h}</span><span>{a}</span><span>{b}</span></div>)}</>);
  }
  if (s.custom === 'traits') return <Traits c={side.c} />;
  return null;
}

/* ------------------------------------------------------------------ the view */
const STORE = 'calc-demo-fold';
function loadFold(phone) {
  try { const v = JSON.parse(localStorage.getItem(STORE + (phone ? '-ph' : ''))); if (v) return v; } catch { /* private window */ }
  return null;
}

export function FullStatsView({ A: side, ruleset, setSpec, openPicker, qp = () => null }) {
  const phone = usePhone();
  const pc = usePair();
  const secs = sections(side);
  const [open, setOpen] = useState(() => loadFold(phone) || Object.fromEntries(secs.map(s => [s.id, !phone || s.id === 'tough'])));
  const [abTab, setAbTab] = useState(side.spec.sparking ? 'sp' : 'n');
  const [here, setHere] = useState(null);
  useEffect(() => {
    // the nav marks the section being read: the last one whose top has passed under the nav
    const f = () => {
      let at = null;
      for (const s of secs) { const el = document.getElementById(`fs-${s.id}`); if (el && el.getBoundingClientRect().top < 140) at = s.id; }
      setHere(at);
    };
    window.addEventListener('scroll', f, { passive: true });
    f();
    return () => window.removeEventListener('scroll', f);
  }, [secs.map(s => s.id).join()]);
  useEffect(() => { try { localStorage.setItem(STORE + (phone ? '-ph' : ''), JSON.stringify(open)); } catch { /* private window */ } }, [open, phone]);
  const isOpen = (id) => open[id] !== false && (open[id] ?? !phone);
  const allOpen = secs.every(s => isOpen(s.id));
  const setAll = (v) => setOpen(Object.fromEntries(secs.map(s => [s.id, v])));
  const jump = (id) => { setOpen(o => ({ ...o, [id]: true })); setTimeout(() => document.getElementById(`fs-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30); };
  const { c } = side;
  const body = (s) => (phone ? <PhoneSection s={s} side={side} abTab={abTab} setAbTab={setAbTab} /> : <RowsSection s={s} side={side} abTab={abTab} setAbTab={setAbTab} />);
  // a closed section's headline numbers: orange where the build or conditions change them, as everywhere else
  const baseSecs = pc?.base?.A ? sections(pc.base.A) : [];
  const summary = (s) => {
    const was = baseSecs.find(b => b.id === s.id)?.summary || [];
    return s.summary.map(([l, v], i) => <span key={i}>{l}{v != null && <b className={was[i] && was[i][1] !== v ? 'up' : undefined}>{v}</b>}</span>);
  };
  const stat = secs.filter(s => s.id !== 'cmd');
  const cmd = secs.find(s => s.id === 'cmd');
  const fold = (s) => (
    <Fold key={s.id} id={`fs-${s.id}`} keepWidth={!phone} cls={s.cls} title={s.title} extra={s.tag && <span className="tg">{s.tag}</span>} open={isOpen(s.id)}
      onToggle={() => setOpen(o => ({ ...o, [s.id]: !isOpen(s.id) }))} summary={summary(s)}>
      {body(s)}
    </Fold>
  );
  return (
    <div className="fs">
      <div className="fs-id">
        <img className="face" src={faceUrl(c)} alt="" />
        <div>
          <div className="nmrow"><div className="nm"><Name parts={nameParts(c.name)} /></div><ChangeButton onClick={() => openPicker('char', 'A')} /></div>
          <div className="chips"><ClassChip c={c} /><span className="chip dp">DP {c.dp}</span>{traitChips(c).map(([t, title]) => <span key={t} className="chip trait-chip" title={title || undefined}>{t}</span>)}</div>
        </div>
        {qp('A')}
      </div>
      {/* the build as one panel: what is switched on, the capsules in their category colours, the conditions */}
      <div className="plate fsb">
        <div className="fsb-col">
          <div className="fsb-h">Active</div>
          <SkillSwitches side={side} onChange={setSpec} />
        </div>
        <div className="fsb-col">
          <CapsuleRows side={side} ruleset={ruleset} onEdit={() => openPicker('caps', 'A')} />
        </div>
        <div className="fsb-col">
          <Conditions side={side} onChange={setSpec} compact />
        </div>
      </div>
      {phone ? (
        <PhoneSectionNav items={secs} prefix="fs-" onJump={jump}
          extra={<button className="call" onClick={() => setAll(!allOpen)}>{allOpen ? 'Collapse all' : 'Expand all'}</button>} />
      ) : (
        <nav className="fsnav" aria-label="Sections">
          {secs.map(s => <button key={s.id} className={`${s.cls || 'tough'}${here === s.id ? ' on' : ''}`} onClick={() => jump(s.id)}><i />{s.title.replace('! Mode', '!')}</button>)}
          <button className="call" onClick={() => setAll(!allOpen)}>{allOpen ? 'Collapse all' : 'Expand all'}</button>
        </nav>
      )}
      <div className={phone ? 'clstack' : 'rws'}>
        {stat.map(fold)}
      </div>
      <Fold id="fs-cmd" cls="cmd fscmd" title="Command list" open={isOpen('cmd')} onToggle={() => setOpen(o => ({ ...o, cmd: !isOpen('cmd') }))} summary={summary(cmd)}>
        <MoveCards side={side} onStage={(slot, n) => setSpec({ ...side.spec, stage: { ...side.spec.stage, [slot]: n } })} />
      </Fold>
    </div>
  );
}
