// Moves: the Sheet's Command list rows, Full stats' move cards, costs, and Rush Chains.
import React from 'react';
import {
  SLOT_LABEL, blastsOf, skillOf, blastType, blastTiles, blastTags, blastDamage, skillDamage, kiBars, selfDamageText,
  SKILL_TYPE, skillTiles, skillTags, skillEffectTiles, skillHeal, toggleable, moveset, perceptionName,
} from './model.js';
import { Tap } from './ui.jsx';
import { F, barsText } from './format.js';

/** Ki pips for a blast (Blast Burst's extra bar outlined), Sparking for an ultimate (Ultimate Burst's burnout in red), points for a skill. */
export function Cost({ kind, bars = 0, add = 0, points = 0 }) {
  if (kind === 'ult') {
    // with Ultimate Burst the text is just the extra bar: the purple bar already says Sparking
    return (
      <span className="cost" title={add > 0 ? `Sparking! Mode, plus ${add} bar of ki` : 'Sparking! Mode'}>
        <i className={`spark${add > 0 ? ' sm' : ''}`} />{add > 0 && <i className="burn" />}<em>{add > 0 ? `+${add} bar` : 'Sparking'}</em>
      </span>
    );
  }
  if (kind === 'skill') {
    return <span className="cost">{Array.from({ length: points }, (_, i) => <i key={i} className="pt" />)}<em>{points} point{points === 1 ? '' : 's'}</em></span>;
  }
  const whole = Math.round(bars);
  return (
    <span className="cost">
      {Array.from({ length: whole }, (_, i) => <i key={i} />)}
      {Array.from({ length: Math.round(add) }, (_, i) => <i key={`a${i}`} className="add" />)}
      <em>{barsText(bars + add)}</em>
    </span>
  );
}

/** The side's blasts in slot order: B1, B2, the ultimate, then alternate ultimates. */
export function orderedBlasts(c, { alternates = true } = {}) {
  const list = blastsOf(c);
  const main = ['Super 1', 'Super 2', 'Ultimate'].map(s => list.find(b => b.slot === s && !b.variant)).filter(Boolean);
  const alts = alternates ? list.filter(b => b.variant) : [];
  return [...main, ...alts];
}

function blastCost(side, b) {
  if (b.slot === 'Ultimate') return <Cost kind="ult" add={(side.view.ultimateKiCostAdd || 0) / 10000} />;
  return <Cost kind="blast" bars={kiBars(b) ?? 0} add={(side.view.blastKiCostAdd || 0) / 10000} />;
}

const blastGet = (sideKey, b, field = 'damage') => (sides) => {
  const s = sides[sideKey];
  const mine = blastsOf(s.c).find(x => x.slot === b.slot && x.variant === b.variant && x.name === b.name) || b;
  return blastDamage(s, mine)[field];
};

/** A skill's damage with the side's build, for a Tap (its breakdown lists what raises it). */
export const skillGet = (sideKey, s) => (sides) => skillDamage(sides[sideKey], s)?.damage;
/** A barrier's reflected ki blast (Gogeta's Stardust Barrier sends one back when a ki blast or blast hits it). */
export const reflectGet = (sideKey, s) => (sides) => skillDamage(sides[sideKey], s)?.reflect?.damage;

/* ------------------------------------------------------------------ the Sheet's Command list */
/**
 * The Command list as rows: blasts (B1, B2, alternate blasts), ultimates (with alternates), skills.
 * `only`: 'skills' or 'blasts' (ultimates included), the Fighter page's two sections.
 */
export function CmdRows({ side, sideKey = 'A', only = null }) {
  const { c } = side;
  const rows = [], skillRows = [];
  const all = orderedBlasts(c);
  const blasts = only === 'skills' ? [] : [...all.filter(b => b.slot !== 'Ultimate'), ...all.filter(b => b.slot === 'Ultimate')];
  for (const b of blasts) {
    const slot = SLOT_LABEL[b.slot];
    const tiles = blastTiles(b);
    rows.push(
      <div className={`cmdrow${b.variant ? ' alt' : ''}`} key={b.slot + (b.variant || '') + b.name}>
        <span className={`slot ${slot === 'ULT' ? 'u' : 'b'}`}>{slot}</span>
        <span className="mvn">{b.name}{b.variant && <small className="altn">{slot === 'ULT' ? 'Alternate ultimate' : 'Alternate blast'}, with a costume</small>}</span>
        <span className="tcell">
          <span className="tline"><span className="ttype">{blastType(b)}</span>{tiles.map(t => <span className="pv" key={t.label}><i>{t.shortLabel}</i>{t.short}</span>)}</span>
          {b.selfDamage && <span className="tline"><span className="ef neg">Self-damage {selfDamageText(b).amount}</span></span>}
        </span>
        <Tap title={b.name} get={blastGet(sideKey, b)} className="dmg">{undefined}</Tap>
        {blastCost(side, b)}
      </div>,
    );
  }
  for (const slot of (!only || only === 'skills' ? [1, 2] : [])) {
    const s = skillOf(c, slot);
    if (!s) continue;
    const effects = skillEffectTiles(s, side.spec?.stage?.[slot]);
    const heal = skillHeal(s);
    skillRows.push(
      <div className="cmdrow" key={`s${slot}`}>
        <span className="slot s">S{slot}</span>
        <span className="mvn">{s.name}</span>
        <span className="tcell">
          <span className="tline"><span className="ttype">{SKILL_TYPE(s)}</span>{skillTiles(s).map(t => <span className="pv" key={t.label}><i>{t.label}</i>{t.value}</span>)}            {s.display?.reflectPower && <span className="pv"><i>Reflected ki blast</i><Tap as="span" title={`${s.name}, reflected ki blast`} get={reflectGet(sideKey, s)} /></span>}</span>
          {effects.length > 0 && <span className="tline">{effects.map((t, i) => <span className={`ef${t.kind ? ' ' + t.kind : ''}`} key={i}>{t.short} {t.value}{t.time ? ` for ${t.time}` : ''}</span>)}</span>}
        </span>
        {/* a damaging skill's damage (Wild Sense, Explosive Wave, barriers, binds), a heal-only skill's heal, else its duration */}
        {s.damage > 0 ? <Tap title={s.name} get={skillGet(sideKey, s)} className="dmg" />
          : heal ? <span className="dmg dur" title="Health restored">{heal.value}{heal.unit}</span>
          : <span className="dmg dur">{s.duration ? `${s.duration}s` : ''}</span>}
        <Cost kind="skill" points={s.stockCost} />
      </div>,
    );
  }
  return <>{[...skillRows, ...rows]}</>;
}

/* ------------------------------------------------------------------ Full stats' move cards */
function SkillCard({ side, sideKey = 'A', slot, onStage }) {
  const s = skillOf(side.c, slot);
  if (!s) return null;
  const stage = side.spec?.stage?.[slot] || (s.stages ? s.phases.length : null);
  const fx = skillEffectTiles(s, stage);
  const pos = fx.filter(t => t.kind !== 'neg'), neg = fx.filter(t => t.kind === 'neg');
  const heal = skillHeal(s);
  return (
    <div className="mcard s">
      <div className="mh"><span className="slot s">S{slot}</span><span className="mvn">{s.name}</span><Cost kind="skill" points={s.stockCost} /></div>
      <div className="mbody">
        <div className="mmain">
          <span className="mt">{SKILL_TYPE(s)}</span>
          {s.damage > 0 ? (
            <>
              <Tap as="b" title={s.name} get={skillGet(sideKey, s)} />
              <small>Base {F.int(skillDamage(side, s).base)}</small>              {s.display?.reflectPower && <small title="A ki blast or blast hitting the barrier sends a ki blast back">Reflected ki blast <Tap as="i" title={`${s.name}, reflected ki blast`} get={reflectGet(sideKey, s)} /></small>}
            </>
          ) : heal ? <><b>{heal.value}<small>{heal.unit.trim()}</small></b><small>Health restored</small></>
            : <><b>{s.duration || '–'}{s.duration ? <small>s</small> : null}</b><small>Duration</small></>}
          {s.stages && (
            <div className="stg"><em>Stage</em>{s.phases.map((p, i) => (
              <button key={i} className={stage === i + 1 ? 'on' : ''} onClick={() => onStage?.(slot, i + 1)} aria-pressed={stage === i + 1}>{i + 1}</button>
            ))}</div>
          )}
          {s.stages && <span className="stgl">Use again to move up a stage</span>}
        </div>
        <div className="mside">
          <div className="spec">{skillTiles(s).map(t => <div key={t.label}><span>{t.label}</span><b>{t.value}</b></div>)}</div>
          {skillTags(s).length > 0 && <div className="minor">{skillTags(s).map(([t]) => <span key={t}>{t}</span>)}</div>}
        </div>
      </div>
      {pos.length > 0 && <div className="fx">{pos.map((t, i) => <div key={i} className={t.kind || ''}><span>{t.label}<b>{t.value}</b></span>{(t.sub || t.time) && <small>{[t.sub, t.time && `for ${t.time}`].filter(Boolean).join(', ')}</small>}</div>)}</div>}
      {neg.length > 0 && <div className="fx">{neg.map((t, i) => <div key={i} className="neg"><span>{t.label}<b>{t.value}</b></span><small>{[t.sub, t.time && `for ${t.time}`].filter(Boolean).join(', ')}</small></div>)}</div>}
      {!toggleable(s) && <div className="special"><b>Note</b>Not a stat change, so it can't be switched on</div>}
    </div>
  );
}

function BlastCard({ side, sideKey, b }) {
  const slot = SLOT_LABEL[b.slot];
  const u = b.slot === 'Ultimate';
  const d = blastDamage(side, b);
  const sd = selfDamageText(b);
  const tags = blastTags(b);
  return (
    <div className={`mcard ${u ? 'u' : 'b'}`}>
      <div className="mh">
        <span className={`slot ${u ? 'u' : 'b'}`}>{slot}</span><span className="mvn">{b.name}</span>
        {blastCost(side, b)}
      </div>
      <div className="mbody">
        <div className="mmain">
          <span className="mt">{blastType(b)}</span>
          <Tap as="b" title={b.name} get={blastGet(sideKey, b)} />
          <small>Base {F.int(d.base)}</small>
          {d.boosted != null && <small title="1 extra bar of ki spent while firing">Boosted <i>{F.int(d.boosted)}</i></small>}
          {b.spread && <small>{b.spread.commonHits} of {b.spread.shotsFired} shots × {F.int(b.spread.perShot)}</small>}
          {b.variant && <span className="altv">{u ? 'Alternate ultimate' : 'Alternate blast'}<small>with a costume</small></span>}
        </div>
        <div className="mside">
          <div className="spec">{blastTiles(b).map(t => <div key={t.label}><span>{t.label}</span><b>{t.value}</b></div>)}</div>
          {tags.length > 0 && <div className="minor">{tags.map(([t, v]) => <span key={t}>{t}{v && <> <b>{v}</b></>}</span>)}</div>}
        </div>
      </div>
      {sd && <div className="fx self"><div className="neg"><span>Self-damage<b>{sd.amount}</b></span>{sd.note && <small>{sd.note}</small>}</div></div>}
      {b.special && <div className="special"><b>Special</b>{b.special}</div>}
    </div>
  );
}

/** Skills, then Blasts, then Ultimates: up to three cards a row. */
/** The Command list's cards: skills, blasts, then ultimates, a row each. `only`: 'skills' or 'blasts' (ultimates included), the Fighter page's two sections. */
export function MoveCards({ side, sideKey = 'A', onStage, only = null }) {
  const { c } = side;
  const skills = [1, 2].filter(n => skillOf(c, n));
  const blasts = orderedBlasts(c);
  const supers = blasts.filter(b => b.slot !== 'Ultimate'), ults = blasts.filter(b => b.slot === 'Ultimate');
  const show = (k) => !only || only === k || (only === 'blasts' && k === 'ults');
  return (
    <div className="mlist nohd">
      {show('skills') && <div className="mgrp s"><div className="mrow" style={{ '--n': Math.min(3, skills.length) }}>{skills.map(n => <SkillCard key={n} side={side} sideKey={sideKey} slot={n} onStage={onStage} />)}</div></div>}
      {show('blasts') && <div className="mgrp b"><div className="mrow" style={{ '--n': Math.min(3, supers.length) }}>{supers.map(b => <BlastCard key={b.slot + b.name} side={side} sideKey={sideKey} b={b} />)}</div></div>}
      {show('ults') && <div className="mgrp u"><div className="mrow" style={{ '--n': Math.min(3, ults.length) }}>{ults.map(b => <BlastCard key={b.slot + b.variant + b.name} side={side} sideKey={sideKey} b={b} />)}</div></div>}
    </div>
  );
}

/* ------------------------------------------------------------------ Rush Chains (the Sheet) */
export const Hits = ({ n }) => <span className="hits">{[1, 2, 3, 4].map(i => <i key={i} className={i <= n ? 'f' : ''} />)}</span>;

const chainGet = (sideKey, type, lv) => (sides) => {
  const ms = moveset(sides[sideKey]);
  const ch = ms.chains.find(x => x.type === type)?.dmg || (type === 'Grand Slash' ? ms.grand : type === 'Lift Strike' ? ms.lift : null);
  return ch?.damage?.[lv];
};
const fuGet = (sideKey, type, name) => (sides) => {
  const ms = moveset(sides[sideKey]);
  const ch = ms.chains.find(x => x.type === type)?.dmg || (type === 'Grand Slash' ? ms.grand : null);
  return ch?.followUps?.find(f => f.name === name)?.total;
};
export { chainGet, fuGet };

function FullCharge({ sideKey, type, dmg }) {
  if (!dmg) return null;
  const lv = dmg.damage.length - 1;
  return <b className="cd">{dmg.chargeable && dmg.damage.length > 1 && <em>Lv.{lv + 1}</em>}<Tap title={`${type}${dmg.damage.length > 1 ? `, Charge Lv.${lv + 1}` : ''}`} get={chainGet(sideKey, type, lv)} /></b>;
}

function FollowUps({ sideKey, type, names, dmg, none = 'No follow-up' }) {
  const list = (dmg?.followUps || []).filter(f => names.includes(f.name));
  if (!list.length) return <span className="fu"><span className="none">{none}</span></span>;
  return (
    <span className="fu">
      {list.map(f => (
        <span key={f.name}>{f.name}<Tap as="b" title={f.name} get={fuGet(sideKey, type, f.name)} />{f.needsFullCharge && <small>after Lv.{dmg.damage.length}</small>}{f.flurry && <small>+ ki blasts</small>}</span>
      ))}
    </span>
  );
}

export function SheetChains({ side, sideKey = 'A' }) {
  const ms = moveset(side);
  return (
    <>
      <div className="chaincols">
        {ms.chains.map(ch => (
          <div className="chainrow" key={ch.n} title={`Rush Chain ${ch.n}: the smash after ${ch.n} rush hit${ch.n > 1 ? 's' : ''}`}>
            <span><small>Rush Chain {ch.n}</small><Hits n={ch.n} /></span>
            <span className="ctype">{ch.type || <span className="none">None</span>}<FullCharge sideKey={sideKey} type={ch.type} dmg={ch.dmg} /></span>
            {ch.type ? <FollowUps sideKey={sideKey} type={ch.type} names={ch.followUps} dmg={ch.dmg} /> : <span />}
          </div>
        ))}
      </div>
      <div className="chainmisc">
        <span><small>Step-In Chain</small>{ms.stepIn || 'None'}</span>
        <span><small>Rush-In Attack</small>{ms.rushIn || 'None'}</span>
        <span><small>Perception</small>{perceptionName(ms.counter)}</span>
        {ms.grand && (
          <span><small>Grand Slash</small><span className="ctype"><FullCharge sideKey={sideKey} type="Grand Slash" dmg={ms.grand} /></span>
            <FollowUps sideKey={sideKey} type="Grand Slash" names={ms.grand.allowed} dmg={ms.grand} none="No follow-ups" /></span>
        )}
        {ms.lift && <span><small>Lift Strike</small><span className="ctype"><FullCharge sideKey={sideKey} type="Lift Strike" dmg={ms.lift} /></span></span>}
      </div>
    </>
  );
}

