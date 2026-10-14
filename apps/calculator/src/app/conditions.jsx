// Conditions: a side's health, ki bars and skill gauge, and the map and timed events when an equipped
// capsule needs them. Effects that depend on them then apply with exact numbers (src/utils/conditions.js).
import React, { useRef } from 'react';
import { conditionNeedsOf, effectTiles, nameParts } from './model.js';
import { MAPS, EVENTS } from '../utils/conditions.js';
import { F } from './format.js';

export const sitOf = (side) => ({
  hp: side.spec.sit?.hp ?? 1,
  ki: side.spec.sit?.ki ?? Math.floor(side.view.startingKi),
  skill: side.spec.sit?.skill ?? side.view.skillStart,
  map: side.spec.sit?.map ?? null,
  events: side.spec.sit?.events ?? {},
});

/** The effects the conditions turned on, by source: [{ source, text }]. */
export function inEffect(side) {
  const by = new Map();
  for (const e of side.applied) {
    if (!e.when) continue;
    if (!by.has(e.source)) by.set(e.source, []);
    by.get(e.source).push(e);
  }
  return [...by].map(([source, list]) => ({ source, text: effectTiles(list, { summed: true }).map(t => `${t.short.toLowerCase() === 'defense' ? 'damage taken' : t.short.toLowerCase()} ${t.short === 'Defense' ? t.value.replace('+', '−') : t.value}`).join(', ') }));
}

function HealthBar({ frac, max, marks, onChange }) {
  const ref = useRef(null);
  const set = (clientX) => {
    const r = ref.current.getBoundingClientRect();
    onChange(Math.max(0.01, Math.min(1, (clientX - r.left) / r.width)));
  };
  const drag = (e) => {
    e.preventDefault();
    set(e.clientX);
    const mv = (ev) => set(ev.clientX);
    const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', mv);
    window.addEventListener('pointerup', up);
  };
  const key = (e) => {
    const step = e.shiftKey ? 0.01 : 0.05;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); onChange(Math.max(0.01, +(frac - step).toFixed(2))); }
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); onChange(Math.min(1, +(frac + step).toFixed(2))); }
    if (e.key === 'Home') onChange(0.01);
    if (e.key === 'End') onChange(1);
  };
  return (
    <div ref={ref} className="hpb" role="slider" tabIndex={0} aria-label="Health" aria-valuemin={1} aria-valuemax={max}
      aria-valuenow={Math.round(frac * max)} aria-valuetext={`${F.int(frac * max)} of ${F.int(max)} HP`}
      onPointerDown={drag} onKeyDown={key}>
      <i className="fill" style={{ width: `${frac * 100}%` }} />
      {marks.map(m => <i key={m} className="tk" style={{ left: `${m * 100}%` }} />)}
      <i className="knob" style={{ left: `${frac * 100}%` }} />
    </div>
  );
}

function Pips({ n, value, kind, label, onChange }) {
  return (
    <span className={`pips ${kind}`} role="group" aria-label={label}>
      {Array.from({ length: n }, (_, i) => (
        <button key={i} className={i < value ? 'on' : ''} aria-label={`${label} ${i + 1}`} aria-pressed={i < value}
          onClick={() => onChange(value === i + 1 ? i : i + 1)} />
      ))}
    </span>
  );
}

/**
 * One side's controls. `compact` (the Sheet's art column) leaves out the heading; `who` names the side
 * in Vs opponent.
 */
export function Conditions({ side, onChange, compact = false, who = null, right = false }) {
  const { c, view: v, spec } = side;
  const sit = sitOf(side);
  const needs = conditionNeedsOf(side);
  const max = v.health;
  const set = (patch) => onChange({ ...spec, sit: { ...sit, ...patch } });
  const marks = [...new Set(needs.health.map(n => (n.cond.kind === 'healthPct' ? n.cond.max : n.cond.below / max)).filter(m => m > 0 && m < 1))].sort((a, b) => b - a);
  const markNames = [...new Set(needs.health.map(n => (n.passive ? `power-up below ${F.int(n.cond.below)} HP` : n.name)))];
  const pctSteps = needs.health.some(n => n.cond.kind === 'healthPct');
  const kiMax = c.stats.maxKi ?? 5;
  const effects = inEffect(side);
  return (
    <div className={`sits${right ? ' r' : ''}${compact ? ' cmp' : ''}`}>
      <h6><span>Conditions</span><em>{who || ''}</em></h6>
      <div className="sitr">
        <span className="sl">Health</span>
        <div>
          <HealthBar frac={sit.hp} max={max} marks={marks} onChange={(hp) => set({ hp })} />
          {markNames.length > 0 && <div className="tkl"><span>Marked: {markNames.join(', ')}</span></div>}
        </div>
        <b>{F.int(sit.hp * max)}<small>{sit.hp < 1 ? `${Math.round(sit.hp * 100)}%` : 'Full'}</small></b>
      </div>
      {pctSteps && (
        <div className="sitr"><span className="sl"></span>
          <span className="steps">{[[1, 'Full'], [0.75, '75%'], [0.5, '50%'], [0.25, '25%']].map(([f, l]) => (
            <button key={l} className={Math.abs(sit.hp - f) < 0.001 ? 'on' : ''} onClick={() => set({ hp: f })}>{l}</button>
          ))}</span><b></b></div>
      )}
      <div className="sitr"><span className="sl">Ki</span><Pips n={kiMax} value={sit.ki} kind="ki" label="Ki bars" onChange={(ki) => set({ ki })} /><b>{sit.ki} bar{sit.ki === 1 ? '' : 's'}</b></div>
      <div className="sitr"><span className="sl">Skill gauge</span><Pips n={v.skillLimit || 0} value={sit.skill} kind="sk" label="Skill gauge" onChange={(skill) => set({ skill })} /><b>{sit.skill} of {v.skillLimit}</b></div>
      {needs.map.length > 0 && (
        <div className="sitr"><span className="sl">Map</span>
          <span className="steps">{[...new Set(needs.map.map(n => n.cond.map))].map(m => (
            <button key={m} className={sit.map === m ? 'on' : ''} onClick={() => set({ map: sit.map === m ? null : m })}>{MAPS[m]}</button>
          ))}<button className={!sit.map ? 'on' : ''} onClick={() => set({ map: null })}>Other</button></span><b></b></div>
      )}
      {needs.event.length > 0 && (
        <div className="sitr"><span className="sl">Events</span>
          <span className="steps">{[...new Set(needs.event.map(n => n.cond.event))].map(ev => (
            <button key={ev} className={sit.events[ev] ? 'on' : ''} onClick={() => set({ events: { ...sit.events, [ev]: !sit.events[ev] } })}>{EVENTS[ev]}</button>
          ))}</span><b></b></div>
      )}
      {compact && effects.length > 0 && (
        <div className="ineff in"><b>In effect</b>{effects.map(e => <span key={e.source}>{e.source}: {e.text}</span>)}</div>
      )}
      {(spec.sit) && <button className="reset" onClick={() => onChange({ ...spec, sit: null })}>Reset to full</button>}
    </div>
  );
}

/** The "In effect" line for both sides (Vs opponent). */
export function InEffect({ sides }) {
  const items = [];
  for (const [who, side] of sides) for (const e of inEffect(side)) items.push({ who, ...e });
  if (!items.length) return null;
  return <div className="ineff"><b>In effect</b>{items.map((e, i) => <span key={i}><i>{shortName(e.who)}</i>{e.source}, {e.text}</span>)}</div>;
}
const shortName = (n) => nameParts(n)[0];
