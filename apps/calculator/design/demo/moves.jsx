// Blasts, ultimates, skills and the Sparking passive: quick cards and their breakdowns.
import React from 'react';
import { blastsOf, skillOf, effectsLine, mergedEffects, ultimateWithSparking } from './data.js';
import { Explain } from './ui.jsx';

const n0 = (v) => (typeof v === 'number' ? Math.round(v).toLocaleString() : '—');
const bars = (ki) => (typeof ki === 'number' ? +(ki / 10000).toFixed(2) : null);

const FLAG_WORDS = {
  beamClashCapable: 'Can beam clash', lockOnNeeded: 'Needs lock-on', dashClashCapable: 'Can dash clash', unblockable: 'Unblockable',
  targetGiant: 'Hits giants', audienceFlees: 'Clears the audience', destroyMap: 'Destroys the map',
};

/** A blast's damage and ki cost under a computed view (capsules, skills). */
export function blastNumbers(c, b, view) {
  const f = view ? (b.slot === 'Ultimate' ? view.blastFactor.ultimate : view.blastFactor.super) : 1;
  const add = view ? (b.slot === 'Ultimate' ? view.ultimateKiCostAdd : view.blastKiCostAdd) : 0;
  return {
    damage: b.damage == null ? null : Math.round(b.damage * f),
    factor: f,
    ki: bars((b.kiCost ?? 0) + (add || 0)),
    kiAdd: add ? bars(add) : 0,
  };
}

export function blastRows(c, b, view) {
  const { damage, factor, ki, kiAdd } = blastNumbers(c, b, view);
  const rows = [];
  rows.push(['Damage', n0(b.damage), b.damageStatus === 'measured' ? 'Measured in game (league)' : `Computed: ${b.recipe || 'calibrated recipe'}`]);
  const sp = ultimateWithSparking(c, b);
  if (sp) rows.push(['While Sparking passive', `+${Math.round(sp * 100)}%`, 'Already in the damage: ultimates need Sparking Mode']);
  if (Math.abs(factor - 1) > 1e-9) rows.push(['This build', `× ${factor.toFixed(3)}`, `${b.slot === 'Ultimate' ? 'Ultimate' : 'Super'} damage effects`]);
  rows.push(['Damage', n0(damage), b.boostedDamage ? `Boosted (charged or combo): ${n0(Math.round(b.boostedDamage * factor))}` : '', true]);
  rows.push(['Ki cost', `${bars(b.kiCost)} bars`, 'Game files']);
  if (kiAdd) rows.push(['This build', `+${kiAdd} bar${kiAdd === 1 ? '' : 's'}`, 'Capsules']);
  if (b.triggerKi != null && b.triggerKi !== b.kiCost) rows.push(['Ki to start it', `${bars(b.triggerKi)} bars`, 'Game files']);
  rows.push(['Total ki', `${ki} bars`, b.slot === 'Ultimate' ? 'Plus all Sparking' : '', true]);
  const kind = [b.category, b.type].filter(Boolean).join(' · ');
  if (kind) rows.push(['Kind', kind, b.detailsSource === 'curated' ? 'League table' : 'SZ Neo sheet']);
  const traits = [...(b.traits || []), ...(b.flags || []).map(f => FLAG_WORDS[f]).filter(Boolean)];
  if (traits.length) rows.push(['Traits', traits.join(', '), '']);
  if (b.lungeSpeed != null) rows.push(['Lunge speed', String(b.lungeSpeed), 'Game files']);
  return rows;
}

export function skillRows(c, sk) {
  const d = sk.display || {};
  const rows = [
    ['Cost', `${sk.stockCost ?? '—'} skill points`, 'Game files'],
    ['Type', d.type || '—', 'League table'],
  ];
  if (sk.duration) rows.push(['Duration', `${sk.duration}s`, 'Game files']);
  if (d.activationTime) rows.push(['Activation', `${d.activationTime}s`, 'League testing']);
  if (sk.damage) rows.push(['Damage', n0(sk.damage), 'Capsule Corp sheet']);
  (sk.phases || []).forEach((p, i) => {
    const label = sk.stages ? `Stage ${i + 1}` : sk.phases.length > 1 ? `Phase ${i + 1}` : 'Effects';
    for (const [l, v, e] of mergedEffects(p.effects)) rows.push([label, `${l} ${v}`, e.target === 'opponent' ? 'On the opponent' : p.duration ? `${p.duration}s` : '']);
  });
  if (sk.stages) rows.push(['Stages', 'The strongest stage applies', 'Charge stages do not add up']);
  if (sk.armor) rows.push(['Armor', '10%', 'While active']);
  const tags = [d.instantSparking && 'Instant Sparking', d.instantKi && 'Instant ki', d.unblockable && 'Unblockable', d.cutscene && 'Cutscene'].filter(Boolean);
  if (tags.length) rows.push(['Traits', tags.join(', '), '']);
  if (d.note) rows.push(['Note', d.note, '']);
  return rows;
}

export function sparkingRows(c) {
  const rows = mergedEffects(c.sparking?.effects).map(([l, v]) => ['While Sparking', `${l} ${v}`, 'Game files']);
  if (c.sparking?.armor) rows.push(['Sparking armor', '25%', 'Measured in game']);
  for (const p of c.passives || []) for (const [l, v] of mergedEffects(p.effects)) rows.push([p.condition || p.name, `${l} ${v}`, 'Game files']);
  if (!rows.length) rows.push(['Passive', 'None', 'Game files']);
  return rows;
}

/** The quick-view cards: the three blasts (and alternative ultimates), the two skills, Sparking. */
export function MoveCards({ c, view, compact = false }) {
  const bl = blastsOf(c);
  const main = ['Super 1', 'Super 2', 'Ultimate'].map(s => bl.find(b => b.slot === s && !b.variant)).filter(Boolean);
  const extra = bl.filter(b => b.variant);
  const sk = [skillOf(c, 1), skillOf(c, 2)].filter(Boolean);
  const sparkLine = effectsLine(c.sparking?.effects) + (c.sparking?.armor ? `${c.sparking.effects?.length ? ' · ' : ''}Sparking armor 25%` : '');
  return (
    <div className="moves">
      {main.map(b => {
        const nb = blastNumbers(c, b, view);
        return (
          <Explain key={b.slot} className="move" title={b.name} sub={`${c.name} · ${b.slot}`} rows={blastRows(c, b, view)}>
            <span className="mv-slot">{b.slot}</span>
            <span className="mv-name">{b.name}</span>
            <span className="mv-kind">{[b.category, b.type].filter(Boolean).join(' · ') || '—'}</span>
            <span className="mv-figs">
              <b className={nb.factor !== 1 ? 'up' : ''}>{n0(nb.damage)}{b.damageStatus === 'computed' && <i className="calc" title="Computed by a calibrated recipe">calc</i>}</b>
              <span>{nb.ki} bars{b.slot === 'Ultimate' ? ' + Sparking' : ''}</span>
            </span>
          </Explain>
        );
      })}
      {sk.map(s => (
        <Explain key={s.id} className="move skill" title={s.name} sub={`${c.name} · Skill ${s.slot}`} rows={skillRows(c, s)}>
          <span className="mv-slot">Skill {s.slot}</span>
          <span className="mv-name">{s.name}</span>
          <span className="mv-kind">{s.display?.type || '—'}</span>
          <span className="mv-buff">{effectsLine(s.stages ? s.phases.slice(-1).flatMap(p => p.effects) : s.phases.flatMap(p => p.effects)) || (s.damage ? `${n0(s.damage)} damage` : s.display?.note || 'No stat effects')}</span>
          <span className="mv-figs"><span>{s.stockCost} pts{s.duration ? ` · ${s.duration}s` : ''}</span></span>
        </Explain>
      ))}
      <Explain className="move spark" title="Sparking" sub={c.name} rows={sparkingRows(c)}>
        <span className="mv-slot">Sparking</span>
        <span className="mv-name">While Sparking</span>
        <span className="mv-buff">{sparkLine || 'No passive'}</span>
        {!compact && (c.passives || []).length > 0 && <span className="mv-kind">+ {c.passives.map(p => p.condition).join(', ')}</span>}
      </Explain>
      {!compact && extra.length > 0 && (
        <div className="mv-extra">Alternative ultimates: {extra.map((b, i) => (
          <React.Fragment key={b.variant}>{i > 0 && ', '}<Explain title={b.name} sub={`${c.name} · ${b.variant}`} rows={blastRows(c, b, view)} className="inline">{b.name}</Explain></React.Fragment>
        ))}</div>
      )}
    </div>
  );
}
