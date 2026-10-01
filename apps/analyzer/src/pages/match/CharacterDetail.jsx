import React, { useMemo, useRef, useState } from 'react';
import baseline from '../../config/style-baseline.json';
import FormBreakdown, { PICKED } from '../../components/FormBreakdown.jsx';
import FilterStrip from '../../components/FilterStrip.jsx';
import Portrait from '../../components/Portrait.jsx';
import { Ring, VolumeCircle } from '../character/overview/Headline.jsx';
import { MedianTrack, fmt, mmss, percent } from '../character/overview/parts.jsx';
import { BuildPill } from '../character/overview/BuildPicker.jsx';
import { CostBar, CapsuleList } from '../meta/BuildsTable.jsx';
import { rankColor, styleColor, NEUTRAL } from '../../utils/overviewPalette.js';
import { placeMatch } from '../../utils/matchReference.js';
import { matchForms } from '../../utils/formBreakdown.js';
import { useMediaQuery } from '../../shell/useMediaQuery.js';
import { NAV_H, SCOPE_H } from '../../shell/ScopeBar.jsx';

const LABEL = 'text-[11px] font-semibold uppercase leading-4 tracking-wider text-slate-400';
// The Character page Overview's boxes: a tile grid split by hairlines, and cards.
const BOX = 'rounded-[10px] border border-solid border-gray-700';
const FAINT = '#64748b';
const int = v => Math.round(v || 0).toLocaleString('en-US');
const share = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

/** A character's capsules, as the build list and cost bar take them. */
export const capsulesOf = stats => (stats.equippedCapsules || []).map(c => ({
  name: c.name, cost: (c.capsule && c.capsule.cost) || 0, type: String((c.capsule && c.capsule.buildType) || '').toLowerCase(),
}));

/**
 * The rest of one character's numbers for the match, opened from its row on
 * the Match page. It is built from the Character page Overview's pieces, and
 * boxed as the Overview boxes them, so a match reads like a character's page
 * for one fight:
 *
 *   1. Its five headline figures (damage dealt and taken, efficiency, damage
 *      per second, battle time) as the Overview's tile grid, each on a track
 *      against the league, green or red only when the match is in the top or
 *      bottom fifth.
 *   2. Its moves as the Overview's cards: the supers and ultimate as
 *      hit/thrown with the hit-rate ring, ki blasts and skills as the volume
 *      circle.
 *   3. Attack, defense and mechanics counts as short lists, and its build as
 *      the one-column capsule list, each in its own box.
 *   4. Its forms (components/FormBreakdown.jsx), when it transformed.
 *
 * PICKING A FORM shows that form alone in 1-3, the way the Character page's
 * build picker shows one build: an orange "Showing one form" strip on top
 * says so, the tile grid's frame turns orange with it, and the form's own
 * swatch turns orange. Rates (efficiency, damage per second, hit rates) keep
 * their league comparison; amounts (damage, time, ki blasts, skills) become
 * the form's share of all its forms, since a part of a match cannot be placed
 * among whole matches. The build is the same in every form.
 *
 * A wide screen runs the build down the right beside the counts and forms; a
 * narrower one sets the counts and the build two by two, forms under them; a
 * phone pairs only Attack and Defense, whose labels are short.
 *
 * The league here is single matches, not characters' averages (see
 * utils/matchReference.js): every performance in the calibration window, so
 * "League" is the typical match.
 */
export default function CharacterDetail({ c, isPhone, build, characterIdRecord, charMap }) {
  const wide = useMediaQuery('(min-width: 1024px)');
  const [picked, setPicked] = useState(null);
  const top = useRef(null);
  const s = c.stats;
  const forms = useMemo(
    () => (s.formChangeCount > 0 ? matchForms(c.record, characterIdRecord, charMap, { shared: c.formSnapshotShared }) : null),
    [s.formChangeCount, c.record, c.formSnapshotShared, characterIdRecord, charMap],
  );
  const form = forms && forms.complete && picked !== null ? forms.forms[picked] : null;
  const v = form ? form.stats : s;
  const place = placeMatch(v, baseline.perMatch);
  const M = baseline.medians;
  const hits = !!v.hasAdditionalCounts;

  // What a form's amounts are a share of: the sum over its forms (the whole
  // output, as the forms show it, not the character's fusion-split total).
  const all = key => (forms && forms.complete ? forms.forms.reduce((n, f) => n + (f.stats[key] || 0), 0) : 0);

  // Picking a form at the bottom changes the top: bring the strip into view.
  const pick = i => {
    setPicked(i);
    if (i === null || !top.current) return;
    const y = top.current.getBoundingClientRect().top - (NAV_H + SCOPE_H + 12);
    if (y < 0) window.scrollBy({ top: y, behavior: 'smooth' });
  };

  const buildBlock = (
    <div className={`${BOX} min-w-0 self-start p-3`}>
      <div className="flex items-center justify-between gap-2">
        <span className={LABEL}>Build</span>
        <span className="text-xs tabular-nums text-slate-400">{int(s.totalCapsuleCost)} cost</span>
      </div>
      <div className="mt-1.5"><BuildPill label={build} compact /></div>
      <CostBar capsules={capsulesOf(s)} className="my-2" />
      <CapsuleList build={{ capsules: capsulesOf(s), aiName: s.aiStrategy || 'Default' }} />
    </div>
  );

  if (!c.played) {
    return (
      <div className={`surface-inset ${isPhone ? 'px-3' : 'px-3.5'} pb-4 pt-3`}>
        {/* A desktop row already says so; a phone's shows the position there. */}
        {isPhone && <div className="mb-3 text-[13px] text-slate-400">Did not fight.</div>}
        <div className="max-w-[320px]">{buildBlock}</div>
      </div>
    );
  }

  // 1. Headline figures: [label, value, unit, placed, league text, share of all forms].
  const amount = (key, whole) => (form ? share(v[key] || 0, whole) : null);
  const tiles = [
    ['Damage dealt', int(v.damageDone), '', place.damageDone, int(place.damageDone.median), amount('damageDone', all('damageDone'))],
    ['Damage taken', int(v.damageTaken), '', place.damageTaken, int(place.damageTaken.median), amount('damageTaken', all('damageTaken'))],
    ['Efficiency', fmt(place.efficiency.value, 2), '×', place.efficiency, `${fmt(place.efficiency.median, 2)}×`, null],
    ['Damage / sec', int(place.dps.value), '', place.dps, int(place.dps.median), null],
    ['Battle time', mmss(v.battleTime), '', place.battleTime, mmss(place.battleTime.median), amount('battleTime', all('battleTime'))],
  ];

  // 2. Moves. A single match's hit rate is its own, so the ring is never
  // dimmed as a thin sample; the tick is the league's median rate.
  const hitMove = (name, hit, thrown, rateKey, styleKey) => {
    const used = thrown > 0;
    const rate = used && hits ? hit / thrown : null;
    return (
      <Move key={name} name={name}
        graphic={<Ring rate={rate} color={used ? styleColor(styleKey) : FAINT} median={M[rateKey]} size={isPhone ? 46 : 52} />}
        value={hits ? `${int(hit)}/${int(thrown)}` : int(thrown)}
        muted={!used}
        caption={!used ? 'Not used' : !hits ? 'No hit data' : `League ${percent(M[rateKey])}`} />
    );
  };
  // Ki blasts and skills: against the typical match, or, for one form, as a
  // share of what all its forms did (no league ring then).
  const volumeMove = (name, key, statKey, styleKey, unit) => {
    const pl = place[key];
    const whole = form ? all(statKey) : null;
    return (
      <Move key={name} name={name}
        graphic={<VolumeCircle value={pl.value} median={form ? null : pl.median} top={form ? Math.max(whole, 1) : Math.max(pl.p95 || 0, 1)}
          color={styleColor(styleKey)} size={isPhone ? 46 : 52} />}
        value={<>{int(pl.value)}<span className="ml-1 text-xs font-medium text-slate-400">{unit}</span></>}
        muted={!pl.value}
        caption={!pl.value ? 'Not used' : form ? `of ${int(whole)} ${isPhone ? 'total' : 'in all forms'}` : `League ${int(pl.median)}`} />
    );
  };

  // 3. Counts. A form's best combo is unknown unless it set the match's best
  // so far (utils/formBreakdown.js), and a form that ended in a fusion has no
  // HP of its own.
  const orDash = (x, text) => (x === null || x === undefined ? '–' : text || int(x));
  const attack = [
    ['Rush hits', v.rushHits],
    ['Heavy hits', v.heavyHits],
    ['Throws', v.throwCount],
    ['Best combo', v.maxComboNum, orDash(v.maxComboNum, `${int(v.maxComboNum)} hits`)],
    ['Combo damage', v.maxComboDamage, orDash(v.maxComboDamage)],
    ['KOs', v.kills],
  ];
  const defense = [
    ['Guards', v.guardCount],
    ['Super counters', v.superCounterCount],
    ['Z-counters', v.zCounterCount],
    ['Revenge counters', v.revengeCounterCount],
    ['Tags', v.tags],
    ['HP left', v.hPGaugeValue, orDash(v.hPGaugeValue, `${int(v.hPGaugeValue)}/${int(v.hPGaugeValueMax)}`), false],
  ];
  const mechanics = [
    ['Dragon homing', v.dragonHomingCount],
    ['Vanishing attacks', v.vanishingAttackCount],
    ['Lightning attacks', v.lightningAttackCount],
    ['Speed impacts won', v.speedImpactCount, `${int(v.speedImpactWins)}/${int(v.speedImpactCount)}`],
    ['Sparking', v.sparkingCount],
    ['Ki charges', v.chargeCount],
    ['Dash distance', v.dragonDashMileage],
  ];

  const formBlock = forms && forms.forms.length > 0 && (
    <div className={`${BOX} mt-2 p-3`}>
      <FormBreakdown forms={forms.forms} complete={forms.complete} reason={forms.reason} isPhone={isPhone} selected={picked} onSelect={pick} />
    </div>
  );
  const counts = [
    <Counts key="a" title="Attack" rows={attack} isPhone={isPhone} />,
    <Counts key="d" title="Defense" rows={defense} isPhone={isPhone} />,
    <Counts key="m" title="Mechanics" rows={mechanics} isPhone={isPhone} />,
  ];

  return (
    <div ref={top} className={`surface-inset ${isPhone ? 'px-3 pb-4 pt-3' : 'px-3.5 pb-5 pt-4'}`}>
      {form && (
        <FilterStrip label="Showing one form" clearLabel="Show all forms" onClear={() => pick(null)} className="mb-3">
          <span className="inline-flex min-w-0 items-center gap-2">
            <Portrait id={form.id} name={form.name} size={22} rounded={5} />
            <b className="font-semibold text-white">{form.name}</b>
          </span>
          <span className="tabular-nums text-slate-400">
            {mmss(forms.forms.slice(0, picked).reduce((n, f) => n + f.seconds, 0))}–{mmss(forms.forms.slice(0, picked + 1).reduce((n, f) => n + f.seconds, 0))}
          </span>
          {form.fusion && <span className="text-slate-400">The whole fusion{form.fusion.partnerName ? `, with ${form.fusion.partnerName}` : ''}</span>}
        </FilterStrip>
      )}

      <div className={`grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-solid bg-slate-400/[.16] sm:grid-cols-5 ${form ? 'border-brand/[.55]' : 'border-gray-700'}`}>
        {tiles.map(([label, value, unit, pl, league, part], i) => {
          const color = rankColor(pl.good);
          return (
            <div key={label} className={`min-w-0 bg-[var(--surface)] p-3.5 ${i === 4 ? 'col-span-2 sm:col-span-1' : ''}`}>
              <div className={`${LABEL} truncate`}>{label}</div>
              <div className="mb-2 mt-0.5 whitespace-nowrap text-2xl font-extrabold tabular-nums tracking-tight text-white">
                {value}
                {unit && <span className="ml-1 text-xs font-medium text-slate-400">{unit}</span>}
              </div>
              {part === null
                ? <MedianTrack p={pl.good} color={color || NEUTRAL} fade={!color} dot />
                : <MedianTrack p={part} color={PICKED} tick={false} />}
              <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 text-xs">
                <span className="whitespace-nowrap text-slate-400">{part === null ? '' : `${part}% of all forms`}</span>
                {part === null && <span className="whitespace-nowrap text-slate-400">League {league}</span>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {hitMove('Super 1', v.s1HitBlast, v.s1Blast, 's1Rate', 'blast')}
        {hitMove('Super 2', v.s2HitBlast, v.s2Blast, 's2Rate', 'blast')}
        {hitMove('Ultimate', v.uLTHitBlast, v.ultBlast, 'ultRate', 'ult')}
        {volumeMove('Ki blasts', 'kiFired', 'shotEnergyBulletCount', 'ki', 'fired')}
        {volumeMove('Skill 1', 'skill1', 'exa1Count', 'skill', 'uses')}
        {volumeMove('Skill 2', 'skill2', 'exa2Count', 'skill', 'uses')}
      </div>

      {wide ? (
        <div className="mt-2 grid grid-cols-[minmax(0,1fr)_280px] gap-x-2">
          <div className="min-w-0">
            <div className="grid grid-cols-3 gap-2">{counts}</div>
            {formBlock}
          </div>
          {buildBlock}
        </div>
      ) : isPhone ? (
        // Two lists of short labels share a line; the longer ones get the width.
        <>
          <div className="mt-2 grid grid-cols-2 gap-2">{counts.slice(0, 2)}</div>
          <div className="mt-2 grid gap-2">
            {counts[2]}
            {buildBlock}
          </div>
          {formBlock}
        </>
      ) : (
        <>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {counts}
            {buildBlock}
          </div>
          {formBlock}
        </>
      )}
    </div>
  );
}

/** One move, as the Character page's move cards: its graphic, then name, value and a caption. */
function Move({ name, graphic, value, caption, muted }) {
  return (
    <div className={`${BOX} flex h-full min-w-0 items-center gap-2.5 px-3 py-2.5`}>
      {graphic}
      <div className="min-w-0">
        <div className={`${LABEL} truncate`}>{name}</div>
        <div className={`whitespace-nowrap text-base font-bold tabular-nums ${muted ? 'text-slate-500' : 'text-white'}`}>{value}</div>
        <div className="truncate text-xs font-semibold text-slate-400">{caption}</div>
      </div>
    </div>
  );
}

/** A short list of counts in its own box, one per line: [label, value, text?, mutedWhenZero = true]. */
function Counts({ title, rows, isPhone }) {
  return (
    <div className={`${BOX} min-w-0 ${isPhone ? 'p-2.5' : 'p-3'}`}>
      <div className={LABEL}>{title}</div>
      <ul className="m-0 mt-1.5 list-none p-0">
        {rows.map(([label, value, text, muteZero = true]) => {
          const zero = muteZero && !value;
          return (
            <li key={label} className={`grid grid-cols-[minmax(0,1fr)_auto] items-center border-0 border-t border-solid border-gray-700/50 py-[3px] first:border-t-0 ${
              isPhone ? 'gap-2 text-[12.5px]' : 'gap-3 text-[13px]'}`}>
              <span className={`truncate ${zero ? 'text-slate-500' : 'text-slate-300'}`}>{label}</span>
              <span className={`tabular-nums ${zero ? 'text-slate-500' : 'text-slate-100'}`}>{text || int(value)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
