// Full stats: the Fighter page's Full form of each section (FullForm), the Quick form blown up with every detail
// in the same look (tiles, cards, badges; round 23), and a folded section's headline numbers (Summary).
import React from 'react';
import {
  gameMoves, chainTypes, armorBreaks, fiveHitTaken, fiveHitTakenArmored, volley,
  perceptionName, blastsOf, skillOf, blastDamage, rosterPos,
} from './model.js';
import { Tap, Rk, usePair, useBase, useValue } from './ui.jsx';
import { orderedBlasts, Hits } from './moves.jsx';
import { traitChips, QuickBody } from './sheet.jsx';
import { F } from './format.js';

const A = (get) => (sides) => get(sides.A.view, sides.A);
const GM = (get) => (sides) => get(gameMoves(sides.A), sides.A);
const cell = (h, get, o = {}) => ({ h, get, long: o.long || h, fmt: o.fmt || F.int, kind: o.kind || 'int', less: !!o.less, text: o.text, small: o.small });
const def = (h, get, long) => cell(h, (s) => 1 - get(s.A.view), { fmt: (x) => F.def(1 - x), kind: 'def', long });

/* ------------------------------------------------------------------ the sections */
export function sections(side) {
  const { c, view: v } = side;
  const gm = gameMoves(side);
  const mob = c.mobility || {};
  const ps = c.moveset?.pursuits || {};
  const orNone = (x) => (x == null ? 'None' : F.int(x));
  const uses = (n) => (n ? String(n) : 'No');
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
        [null, [cell('Throw', A(x => x.throw))]],
        // the pursuits' damage (Vanishing Crash and Dragon Crash raise their own); None where the fighter can't
        ['Pursuits', [
          cell('Vanishing Attack', A(x => x.vanishingAttack), { fmt: orNone }), cell('Dragon Smash', A(x => x.dragonSmash), { fmt: orNone, long: 'Dragon Smash (Dragon Homing)' }),
          cell('Lightning Attack', A(x => x.lightningAttack), { fmt: orNone, small: '2 hits' }),
        ]],
        [null, [cell('Armor break', A(x => x.armorBreak), { fmt: F.hits, kind: 'dec', less: true })]],
      ],
      summary: [['Rush 5-hit', F.int(v.rush5Hit)], ['Smash', F.int(gm.smash[0])], ['Throw', F.int(v.throw)], ['Armor break', F.hits(v.armorBreak)]],
    },
    { id: 'chains', title: 'Rush Chains', cls: 'mov', custom: 'chains', summary: chainTypes(side).types.map(t => [t.type, F.int(t.dmg?.damage?.at(-1))]) },
    { id: 'kib', title: 'Ki blasts', cls: 'kib', custom: 'kib', summary: [['Ki blast', F.int(v.kiBlastDmg)], ['Limit', F.count(v.kiBlastLimit)], ['Full volley', F.int(volley(v))], ...(gm.charged ? [['Charged', F.int(gm.charged.damage.at(-1))]] : [])] },
    { id: 'armor', title: 'Breaking armor', cls: 'armp', custom: 'armor', summary: armorSummary(v) },
    {
      id: 'limits', title: 'Combat limits', cls: 'new',
      groups: [
        // the total follow-ups in a combo (Vanishing Break and Dragon Break raise it too), then each pursuit's uses
        [null, [cell('Follow-ups', A(x => x.pursuitLimit.general), { fmt: String, kind: 'dec', long: 'Follow-ups per combo', small: ps.sparkingAdd ? `+${ps.sparkingAdd} in Sparking!` : null })]],
        ['Pursuit uses', [
          cell('Vanishing Attack', A(x => x.pursuitLimit.vanishingAttack), { fmt: uses, kind: 'dec', long: 'Vanishing Attack uses' }),
          cell('Dragon Homing', A(x => x.pursuitLimit.dragonHoming), { fmt: uses, kind: 'dec', long: 'Dragon Homing uses' }),
          cell('Lightning Attack', A(x => x.pursuitLimit.lightningAttack), { fmt: uses, kind: 'dec', long: 'Lightning Attack uses (always 1)' }),
        ]],
      ],
      summary: [['Follow-ups', String(v.pursuitLimit.general)], ['Vanishing', uses(v.pursuitLimit.vanishingAttack)], ['Dragon Homing', uses(v.pursuitLimit.dragonHoming)], ['Lightning', uses(v.pursuitLimit.lightningAttack)]],
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

/* ------------------------------------------------------------------ the pieces of the Full forms */
// Round 23, second pass: the league found the row tables plain next to the Sheet. A section's Full form is its
// Quick form blown up, as the Command list's cards are: the same tiles, cards and badges, with every detail.

/** A stat tile: label, the number (a breakdown on tap, orange or red when the build changes it), Base under it. */
function TV({ label, title, get, fmt = F.int, kind = 'int', less = false, unit, rk = null, sub = null, cls = '' }) {
  const v = useValue(get), b = useBase(get);
  const changed = typeof v === 'number' && typeof b === 'number' && Math.abs(v - b) > 1e-9;
  return (
    <div className={`tile ${cls}`}>
      <span>{label}</span>
      <b>{v == null ? '–' : <Tap title={title || label} get={get} fmt={fmt} kind={kind} lessIsBetter={less} />}{unit && v != null && <small>{unit}</small>}</b>
      {changed ? <small className="tb">Base {fmt(b)}</small> : sub ? <small className="tb">{sub}</small> : null}
      {rk}
    </div>
  );
}
/** A tile for a value that has no breakdown (text, or a game-file value no build changes). */
const TT = ({ label, value, unit, sub, cls = '' }) => (
  <div className={`tile ${cls}`}><span>{label}</span><b>{value}{unit && <small>{unit}</small>}</b>{sub && <small className="tb">{sub}</small>}</div>
);
const Gh = ({ children, cls = '' }) => <div className={`fgh ${cls}`}>{children}</div>;
const Pips = ({ n, max = n }) => <span className="lpips">{Array.from({ length: Math.max(n, max) }, (_, i) => <i key={i} className={i < n ? 'f' : ''} />)}</span>;

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
  const out = types.map(t => ({ type: t.type, slots: t.slots, sub: `Rush Chain${t.slots.length > 1 ? 's' : ''} ${t.slots.join(' and ')}`, dmg: t.dmg, fus: (t.dmg?.followUps || []).filter(f => t.followUps.includes(f.name)) }));
  if (ms.grand) out.push({ type: 'Grand Slash', sub: 'Every character', dmg: ms.grand, fus: ms.grand.followUps.filter(f => ms.grand.allowed.includes(f.name)), grand: 'grand' });
  if (ms.lift) out.push({ type: 'Lift Strike', sub: 'Most characters', dmg: ms.lift, fus: [], grand: 'lift' });
  return { rows: out, ms };
}

function kiRows(side) {
  const { view: v } = side;
  const gm = gameMoves(side);
  const same = (a, b) => a && b && JSON.stringify(a.damage) === JSON.stringify(b.damage);
  const tagText = (t) => (t || []).filter(x => !['giant'].includes(x));
  const rows = [
    { label: 'Ki blast', type: gm.kiBlastTags.length && !gm.kiBlastTags.includes('none') ? gm.kiBlastTags[0] : 'Standard', dmg: A(x => x.kiBlastDmg), shots: v.kiBlastLimit, shotsGet: A(x => x.kiBlastLimit), costGet: A(x => x.kiBlastCost), volley: true, tags: gm.kiBlastTags.slice(1) },
  ];
  if (gm.charged) rows.push({ label: 'Charged ki blast', type: 'Charged', lv: gm.charged.damage.map((_, i) => GM(g => g.charged.damage[i])), shots: gm.charged.shots, cost: gm.charged.cost, tags: tagText(gm.charged.tags) });
  if (gm.chargedMoving && !same(gm.chargedMoving, gm.charged)) rows.push({ label: 'Charged, while moving', type: 'Charged', lv: gm.chargedMoving.damage.map((_, i) => GM(g => g.chargedMoving.damage[i])), shots: gm.chargedMoving.shots, cost: gm.chargedMoving.cost, tags: tagText(gm.chargedMoving.tags) });
  if (gm.jump) rows.push({ label: 'Jump ki blast', type: 'Jump', dmg: GM(g => g.jump.damage), shots: gm.jump.count, cost: gm.jump.cost });
  if (gm.dash) rows.push({ label: 'Dash ki blast', type: 'Dash', dmg: GM(g => g.dash.damage), shots: gm.dash.count, cost: gm.dash.cost });
  if (gm.jumpCharged && same(gm.jumpCharged, gm.dashCharged)) rows.push({ label: 'Jump / dash charged', type: 'Charged', lv: gm.jumpCharged.damage.map((_, i) => GM(g => g.jumpCharged.damage[i])), shots: gm.jumpCharged.shots, cost: gm.jumpCharged.cost });
  else {
    if (gm.jumpCharged) rows.push({ label: 'Jump, charged', type: 'Charged', lv: gm.jumpCharged.damage.map((_, i) => GM(g => g.jumpCharged.damage[i])), shots: gm.jumpCharged.shots, cost: gm.jumpCharged.cost });
    if (gm.dashCharged) rows.push({ label: 'Dash, charged', type: 'Charged', lv: gm.dashCharged.damage.map((_, i) => GM(g => g.dashCharged.damage[i])), shots: gm.dashCharged.shots, cost: gm.dashCharged.cost });
  }
  return rows;
}

/** A card in the Command list's style: a coloured head, the main number large, the rest as small tiles. */
function Card({ cls, name, right = null, type, main, mainSub = [], spec = [], minor = [], fx = null }) {
  return (
    <div className={`mcard ${cls}`}>
      <div className="mh"><span className="mvn">{name}</span>{right && <span className="mhr">{right}</span>}</div>
      <div className="mbody">
        <div className="mmain">{type && <span className="mt">{type}</span>}{main}{mainSub.map((s, i) => <small key={i}>{s}</small>)}</div>
        {(spec.length > 0 || minor.length > 0) && (
          <div className="mside">
            {spec.length > 0 && <div className="spec">{spec.map(([l, v]) => <div key={l}><span>{l}</span><b>{v}</b></div>)}</div>}
            {minor.length > 0 && <div className="minor">{minor.map(t => <span key={t}>{t}</span>)}</div>}
          </div>
        )}
      </div>
      {fx}
    </div>
  );
}
/** A card's big number: a breakdown on tap, Base under it when the build changes it. */
function Big({ title, get, fmt = F.int }) {
  const v = useValue(get), b = useBase(get);
  const changed = typeof v === 'number' && typeof b === 'number' && Math.abs(v - b) > 1e-9;
  return <><Tap as="b" title={title} get={get} fmt={fmt} />{changed && <small>Base {fmt(b)}</small>}</>;
}
/** A small value in a card's tiles: tappable, with its base in a tooltip line when it changes. */
function Small({ title, get, fmt = F.int }) {
  const v = useValue(get);
  return v == null ? '–' : <Tap title={title} get={get} fmt={fmt} />;
}

/* ------------------------------------------------------------------ each section's Full form */
function OffenseFull({ side, phone }) {
  const { view: v } = side;
  const gm = gameMoves(side);
  const hitsGet = ['rush', 'hit2', 'hit3', 'hit4', 'hit5'];
  const kr = kiRows(side);
  return (
    <>
      <Gh>Rush</Gh>
      <div className="tiles hitstrip">
        {hitsGet.map((k, i) => <TV key={k} label={`Hit ${i + 1}`} title={`Rush hit ${i + 1}`} get={A(x => x[k])} cls="sm" />)}
        <TV label="5-hit total" title="Rush 5-hit" get={A(x => x.rush5Hit)} rk={<Rk p={rosterPos('rush5', x => x.rush5Hit, v.rush5Hit)} />} />
        <TV label="Into armor" title="Rush 5-hit into armor" get={A(x => x.fiveHitAfterArmor)} />
      </div>
      <Gh>Smash and throw</Gh>
      <div className="tiles t5">
        {gm.smash.map((_, i) => <TV key={i} label={`Smash Lv.${i + 1}`} title={`Smash, Charge Lv.${i + 1}`} get={GM(g => g.smash[i])} rk={i === 0 ? <Rk p={rosterPos('smash', x => x.smash, v.smash)} /> : null} />)}
        <TV label="Throw" get={A(x => x.throw)} rk={<Rk p={rosterPos('throw', x => x.throw, v.throw)} />} />
        <TV label="Armor break" get={A(x => x.armorBreak)} fmt={F.hits} kind="dec" less sub="hits to break" />
      </div>
      <Gh>Pursuits</Gh>
      <div className="tiles t5">
        <TV label="Vanishing Attack" get={A(x => x.vanishingAttack)} rk={v.vanishingAttack != null ? <Rk p={rosterPos('pursuit', x => x.pursuit, v.vanishingAttack)} /> : null} sub={v.vanishingAttack == null ? "Can't use it" : null} />
        <TV label="Dragon Smash" title="Dragon Smash (Dragon Homing)" get={A(x => x.dragonSmash)} sub={v.dragonSmash == null ? "Can't use it" : 'after Dragon Homing'} />
        <TV label="Lightning Attack" get={A(x => x.lightningAttack)} sub={v.lightningAttack == null ? "Can't use it" : '2 hits'} />
      </div>
      <Gh cls="kib">Ki blasts</Gh>
      <div className="mrow" style={{ '--n': phone ? 1 : 3 }}>
        {kr.map(r => {
          const last = r.lv ? r.lv.length - 1 : null;
          const spec = [];
          if (r.lv) r.lv.forEach((g, i) => spec.push([`Lv.${i + 1}`, <Small title={`${r.label}, Charge Lv.${i + 1}`} get={g} />]));
          spec.push(['Shots', r.shotsGet ? <Small title="Ki blast limit" get={r.shotsGet} fmt={F.count} /> : r.shots]);
          spec.push(['Ki cost', r.costGet ? <><Small title="Ki blast cost" get={r.costGet} fmt={F.bars} /><small> bars</small></> : <>{F.bars(r.cost)}<small> bars</small></>]);
          if (r.volley) spec.push(['Volley', <Small title="Full volley" get={A(x => volley(x))} />]);
          return (
            <Card key={r.label} cls="k" name={r.label} type={r.type}
              main={<Big title={r.lv ? `${r.label}, Charge Lv.${last + 1}` : r.label} get={r.lv ? r.lv[last] : r.dmg} />}
              mainSub={[r.lv ? `Lv.${last + 1}, per shot` : 'per shot']} spec={spec} minor={r.tags || []} />
          );
        })}
      </div>
    </>
  );
}

function ChainsFull({ side, phone }) {
  const { rows, ms } = chainRowsFor(side);
  const hitsOf = (r, f) => (sides) => (r.grand ? chainTypes(sides.A).ms[r.grand] : chainTypes(sides.A).types.find(x => x.type === r.type)?.dmg)?.followUps.find(x => x.name === f.name)?.hits;
  return (
    <>
      <div className="mrow" style={{ '--n': phone ? 1 : 3 }}>
        {rows.map(r => {
          const lvs = r.dmg?.damage || [];
          const charged = r.dmg?.chargeable && lvs.length > 1;
          const last = lvs.length - 1;
          return (
            <Card key={r.type} cls="r" name={r.type}
              right={r.slots ? <span className="rcs">{r.slots.map(n => <span key={n} title={`Rush Chain ${n}`}><Hits n={n} /></span>)}</span> : <span className="rcn">{r.sub}</span>}
              type={charged ? `Lv.${last + 1}` : 'One level'}
              main={r.dmg ? <Big title={`${r.type}${charged ? `, Charge Lv.${last + 1}` : ''}`} get={ctypeGet(r.type, last, r.grand)} /> : <b>–</b>}
              mainSub={[charged ? 'full charge' : "can't be charged", r.slots ? r.sub : null].filter(Boolean)}
              spec={charged ? lvs.map((_, i) => [`Lv.${i + 1}`, <Small title={`${r.type}, Charge Lv.${i + 1}`} get={ctypeGet(r.type, i, r.grand)} />]) : []}
              fx={r.fus.length > 0 && (
                <div className="fx fus">{r.fus.map(f => (
                  <div key={f.name}>
                    <span>{f.name}<b><Tap title={f.name} get={fuTotal(r.type, f.name, r.grand)} /></b></span>
                    <small>{f.hits.length} hit{f.hits.length === 1 ? '' : 's'}{f.hits.length > 1 && <>: <HitList get={hitsOf(r, f)} /></>}{f.needsFullCharge ? `, after Lv.${lvs.length}` : ''}{f.flurry ? ', plus ki blasts' : ''}</small>
                  </div>
                ))}</div>
              )} />
          );
        })}
      </div>
      <div className="tiles t5">
        <TT label="Step-In Chain" value={ms.stepIn || 'None'} cls="txt" />
        <TT label="Rush-In Attack" value={ms.rushIn || 'None'} cls="txt" />
        <TT label="Perception" value={perceptionName(ms.counter)} sub="after a successful Perception" cls="txt" />
      </div>
    </>
  );
}
function HitList({ get }) {
  const h = useValue(get) || [];
  return <>{h.map(x => F.int(x)).join(', ')}</>;
}

const SHIELD = { hold: <span className="abc no"><i className="arm" />Holds</span>, brk: <span className="abc ok"><i className="arm brk" />Breaks</span> };
function armorRowsAt(side, tab) {
  const up = side.c.sparking?.armorBreakLevel ?? 3;
  const offset = (tab === 'sp' ? up : 0) - (side.spec.sparking ? up : 0);
  return armorBreaks(side.view, offset) || [];
}
const ARMORS = [['Hyper Armor', 'hyper'], ['Sparking Armor', 'sparking'], ['Hyper, in Sparking', 'hyperSparking']];
const ATTACKS = ['Rush hit 1', 'Rush hit 2', 'Rush hit 3', 'Rush hit 4', 'Smash Lv.1', 'Ki blast', 'Charged ki blast'];
function ArmorFull({ side, phone, tab, setTab }) {
  const rows = armorRowsAt(side, tab);
  return (
    <>
      <div className="abtabs"><button className={tab === 'n' ? 'on' : ''} onClick={() => setTab('n')}>Normal</button><button className={`sp${tab === 'sp' ? ' on' : ''}`} onClick={() => setTab('sp')}>In Sparking!</button></div>
      {phone ? (
        <div className="abg" style={{ '--cols': 3 }}>
          <span className="abh l">Attack</span>{ARMORS.map(([l]) => <span key={l} className="abh">{l}</span>)}
          {rows.map((r, i) => <React.Fragment key={r.label}><span className="abl">{ATTACKS[i]}</span>{ARMORS.map(([, k]) => <React.Fragment key={k}>{r[k] ? SHIELD.brk : SHIELD.hold}</React.Fragment>)}</React.Fragment>)}
        </div>
      ) : (
        <div className="abg" style={{ '--cols': rows.length }}>
          <span className="abh l">Against</span>{rows.map((r, i) => <span key={r.label} className="abh">{ATTACKS[i]}</span>)}
          {ARMORS.map(([label, k]) => <React.Fragment key={k}><span className="abl">{label}</span>{rows.map(r => <React.Fragment key={r.label}>{r[k] ? SHIELD.brk : SHIELD.hold}</React.Fragment>)}</React.Fragment>)}
        </div>
      )}
      <div className="abnote">Armor takes 10% off a hit (Hyper Armor) or 25% (Sparking Armor) until a hit breaks it. A Heavy Finish breaks armor like the smash. Rush hit 5, higher smash charges, throws, blasts and ultimates break every armor.</div>
    </>
  );
}

function LimitsFull({ side }) {
  const { view: v, c } = side;
  const ps = c.moveset?.pursuits || {};
  const L = v.pursuitLimit;
  const tile = (label, get, n, sub) => (
    <div className="tile" key={label}><span>{label}</span><b><Tap title={label} get={A(get)} fmt={(x) => (x ? String(x) : 'No')} kind="dec" /></b><Pips n={n} />{sub && <small className="tb">{sub}</small>}</div>
  );
  return (
    <div className="tiles t5">
      {tile('Follow-ups per combo', x => x.pursuitLimit.general, L.general, ps.sparkingAdd ? `+${ps.sparkingAdd} in Sparking!` : null)}
      {tile('Vanishing Attack uses', x => x.pursuitLimit.vanishingAttack, L.vanishingAttack)}
      {tile('Dragon Homing uses', x => x.pursuitLimit.dragonHoming, L.dragonHoming)}
      {tile('Lightning Attack uses', x => x.pursuitLimit.lightningAttack, L.lightningAttack, 'once at most')}
    </div>
  );
}

function MobilityFull({ side }) {
  const m = side.c.mobility || {};
  const per = (x) => (typeof x === 'number' ? `then ${F.bars(x)} bars/s` : null);
  const num = (x) => (typeof x === 'number' ? F.bars(x) : '–');
  return (
    <div className="tiles t4">
      <TV label="Short Dash" get={A(x => x.shortDashCost)} fmt={F.bars} kind="dec" less unit="bars" />
      <TT label="Step-cancel" value={num(m.stepCancelCost)} unit="bars" />
      <TT label="Dragon Dash" value={num(m.dragonDash?.start)} unit="bars" sub={per(m.dragonDash?.perSecond)} />
      <TT label="High-Speed Dash" value={num(m.dragonDash?.start)} unit="bars" sub={per(m.dragonDash?.highSpeedPerSecond)} />
      <TT label="Z-Burst Dash" value={num(m.zBurstDash?.start)} unit="bars" sub={per(m.zBurstDash?.perSecond)} />
      <TT label="Ascend / Descend" value={num(m.dashUp?.start)} unit="bars" sub={per(m.dashUp?.perSecond)} />
      <TT label="Dragon Homing" value={num(m.dragonHoming?.start)} unit="bars" sub={per(m.dragonHoming?.perSecond)} />
      <TT label="Flight" value={m.canFly === false ? "Can't fly" : 'Can fly'} cls="txt" />
    </div>
  );
}

function Traits({ c }) {
  const ab = (c.moveset?.abilities || []).filter(x => x !== 'Hyper armor');
  const missing = c.moveset?.unavailable || [];
  const plays = traitChips(c).filter(([t]) => t !== 'Low-HP power-up');
  return (
    <div className="tiles t4 traits">
      {(c.passives || []).map(p => <TT key={p.name} label={p.condition.replace(/^health /, '').replace(/^below/, 'Below')} value={`All damage +${Math.round((p.effects?.[0]?.value ?? 0) * 100)}%`} cls="txt" />)}
      {plays.length > 0 && <div className="tile wide"><span>Plays</span><div className="minor">{plays.map(([t]) => <span key={t}>{t}</span>)}</div></div>}
      {ab.length > 0 && <div className="tile wide"><span>Abilities</span><div className="minor">{ab.map(t => <span key={t}>{t}</span>)}</div></div>}
      {missing.length > 0 && <div className="tile wide"><span>Can't use</span><div className="minor">{missing.map(t => <span key={t}>{t}</span>)}</div></div>}
      {!(c.passives || []).length && !ab.length && !missing.length && !plays.length && <TT label="Traits" value="Nothing unusual" cls="txt" />}
    </div>
  );
}

/**
 * A Fighter section's Full form (`id` is the Fighter page's section id; the Command list's is its move cards,
 * in fighter.jsx). Toughness, Resources and Sparking! are their Quick form with the rest of their details added.
 */
export function FullForm({ id, side, phone, abTab, setAbTab }) {
  const { view: v, c } = side;
  if (id === 'tough') {
    return (
      <>
        <QuickBody id="tough" side={side} />
        <div className="tiles t5">
          {v.armor > 0 && <TV label="Armored 5-hit taken" title="5-hit taken, armored" get={A(fiveHitTakenArmored)} less sub="with this armor up" />}
          <TV label="Switch" title="Switch cooldown" get={A(x => x.switch)} fmt={F.secs} kind="dec" less sub="cooldown" />
          <TT label="Health bars" value={+(v.health / 10000).toFixed(2)} sub="10,000 each" />
        </div>
      </>
    );
  }
  if (id === 'res') {
    return (
      <>
        <QuickBody id="res" side={side} />
        <div className="tiles t5">
          <TT label="Max ki" value={c.stats.maxKi ?? 5} unit="bars" />
          <TV label="Starting ki" get={A(x => x.startingKi)} fmt={F.bars} kind="dec" unit="bars" />
          <TT label="Refills to" value={v.kiRegenRange} unit="bars" sub="on its own" />
          <TV label="Ki from hits" get={A(x => x.attackKiGain)} fmt={F.dec} kind="dec" unit="bars" />
          <TV label="Skill gauge per min" title="Skill gauge per minute" get={A(x => parseFloat(x.skillRegen))} fmt={F.dec} kind="dec" />
        </div>
      </>
    );
  }
  if (id === 'off') return <OffenseFull side={side} phone={phone} />;
  if (id === 'chains') return <ChainsFull side={side} phone={phone} />;
  if (id === 'spk') {
    return (
      <>
        <QuickBody id="spk" side={side} />
        <div className="tiles t5">
          <TT label="Sparking armor" value={c.armor?.sparking ? `${Math.round((1 - c.armor.sparking.damageRate) * 100)}%` : 'None'} sub={c.armor?.sparking ? 'less damage taken' : null} />
          <TT label="Armor break" value={`+${c.sparking?.armorBreakLevel ?? 3}`} sub="levels in Sparking!" />
        </div>
      </>
    );
  }
  if (id === 'armor') return <ArmorFull side={side} phone={phone} tab={abTab} setTab={setAbTab} />;
  if (id === 'limits') return <LimitsFull side={side} />;
  if (id === 'mob') return <MobilityFull side={side} />;
  if (id === 'traits') return <Traits c={c} />;
  return null;
}

/* ------------------------------------------------------------------ a section's headline numbers */
/**
 * A folded section's headline numbers, marked like everywhere else: orange when the build or conditions make
 * them better than base, red when worse (less is better for damage taken, armor break and dash costs).
 */
const LESS = /taken|armor break|dash/i;
const num = (t) => parseFloat(String(t).replace(/[^0-9.\-]/g, ''));
function mark(label, now, was) {
  if (was == null || was === now) return undefined;
  const a = num(now), b = num(was);
  if (Number.isNaN(a) || Number.isNaN(b) || a === b) return 'up';
  return (LESS.test(label) ? a < b : a > b) ? 'up' : 'dn';
}
export function Summary({ s }) {
  const pc = usePair();
  const was = (pc?.base?.A ? sections(pc.base.A) : []).find(b => b.id === s.id)?.summary || [];
  return <div className="csum">{s.summary.map(([l, v], i) => <span key={i}>{l}{v != null && <b className={mark(l, v, was[i]?.[1])}>{v}</b>}</span>)}</div>;
}
