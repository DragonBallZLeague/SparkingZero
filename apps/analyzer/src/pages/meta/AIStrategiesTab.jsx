import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Portrait from '../../components/Portrait.jsx';
import HeaderFigure from '../../components/HeaderFigure.jsx';
import ChipMenu, { labelMatches, multiLabel } from '../../shell/ChipMenu.jsx';
import { SortHead } from '../../shell/tableParts.jsx';
import { useIsPhone } from '../../shell/useMediaQuery.js';
import { useQueryUpdate } from '../../shell/useQueryUpdate.js';
import { useWidenLink } from '../../shell/useWidenLink.jsx';
import { styleColor, capsuleTypeColor } from '../../utils/overviewPalette.js';
import { lineupIndex } from '../../utils/transformation.js';
import { BuildPill } from '../character/overview/BuildPicker.jsx';
import PooledTab, { FULL_FROM } from './PooledTab.jsx';
import {
  Box, DataSignal, PooledTiles, POOLED_FIGURES, UsedMostBy, tone, fmtInt, pct, pts,
} from './detailParts.jsx';
import {
  aiStrategyRows, readAiFilters, readAiActions, readAiSort, sortAiRows, withActionRates, actionColumn,
  AI_COLUMNS, AI_PHONE_DEFAULTS, MAX_ACTION_COLUMNS,
} from './aiRows.js';
import { aiShift, MIN_OTHER, LEAN_PLACES, SUIT_MIN } from './aiShift.js';
import {
  ACTIONS, ACTION_GROUPS, ACTION_FLOOR, actionByKey, actionShift, fmtPair, fmtRateChange,
} from './aiActions.js';
import { clock } from '../character/transformRows.js';

const characters = r => `${r.characters} character${r.characters === 1 ? '' : 's'}`;
/** The width each action column adds before the full table fits (measured: 80px left Transform touching Defense at 1100px). */
const ACTION_COLUMN_ROOM = 100;
const places = v => `${v >= 0 ? '+' : '−'}${Math.round(Math.abs(v))}`;

/** Style shifts of this many places are coloured, and named in the headline. */
const TONE_PLACES = LEAN_PLACES;
/** A single action's change is coloured from this ratio up (+15% or -15%). */
const TONE_RATIO = 0.15;
/** A change in how often its characters transform is coloured from 5 points. */
const TONE_TRANSFORM = 0.05;
/** A first transformation this many seconds sooner (green) or later (red) is coloured; the median is about 55s. */
const TONE_SECONDS = 5;

const rate = v => `${Math.round(v * 100)}%`;
const points = v => `${v >= 0 ? '+' : '−'}${Math.round(Math.abs(v) * 100)}`;

const qualityTitle = r => `${r.quality} data: ${fmtInt(r.matches.length)} uses over ${characters(r)}, `
  + `${fmtInt(r.comparable)} comparable with the same characters on other AI strategies`;

/**
 * The pooled figures the table used to carry (with the score), each ranked
 * among the strategies in view (detailParts.jsx PooledTiles). Four also say
 * how the same characters did on their other AIs (`changes`, aiShift.js
 * results): the part of the old "Same characters, other AIs" box that the
 * tiles did not already show. Its totals were dropped: averaged per compared
 * character, they disagreed with the tiles' pooled ones (the league's review,
 * 2026-09-30).
 */
const POOLED = [
  { key: 'score', label: 'Score', get: r => r.combatPerformanceScore || 0, fmt: v => v.toFixed(1), dir: 1 },
  ...POOLED_FIGURES,
];

/** The style shift's two markers: a hollow dot for the rank on other AIs, a filled one for this AI's. The legend draws the same. */
const USUAL_DOT = 'h-2 w-2 rounded-full border border-solid border-slate-400 bg-[var(--surface)]';
const THIS_DOT = 'h-2.5 w-2.5 rounded-full';
function Legend({ color = '#e2e8f0' }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block ${USUAL_DOT}`} />other AIs
      <span className={`ml-1.5 inline-block ${THIS_DOT}`} style={{ background: color }} />this AI
    </span>
  );
}

/**
 * A style's shift as the league ranking it moves along: a hollow dot where
 * its characters rank on their other AIs, a filled one where they rank on this AI, #1
 * (does it most) at the right.
 */
function StyleRow({ st }) {
  const color = styleColor(st.key);
  if (st.gain === null) {
    return (
      <li className="grid grid-cols-[76px_1fr_112px] items-center gap-2 py-[5px] text-[12.5px]">
        <span className="text-slate-300">{st.name}</span><span className="h-[3px] rounded-sm bg-shell-track" />
        <span className="text-right text-slate-500">–</span>
      </li>
    );
  }
  const x = r => ((st.pool - r) / Math.max(1, st.pool - 1)) * 100;
  const u = x(st.usual), w = x(st.with);
  const ru = Math.round(st.usual), rw = Math.round(st.with);
  return (
    <li className="grid grid-cols-[76px_1fr_112px] items-center gap-2 py-[5px] text-[12.5px]"
      title={`${st.name}: #${ru} of ${st.pool} on other AIs, #${rw} on this AI (the league's ranking, #1 does it most)`}>
      <span className="text-slate-300">{st.name}</span>
      <span className="relative block h-[3px] rounded-sm bg-shell-track">
        <span className="absolute inset-y-0" style={{ left: `${Math.min(u, w)}%`, width: `${Math.abs(w - u)}%`, background: color, opacity: 0.55 }} />
        <span className={`absolute top-1/2 -translate-y-1/2 ${USUAL_DOT}`} style={{ left: `calc(${u}% - 4px)` }} />
        <span className={`absolute top-1/2 -translate-y-1/2 ${THIS_DOT}`} style={{ left: `calc(${w}% - 5px)`, background: color }} />
      </span>
      <span className="text-right tabular-nums">
        <span className="text-slate-500">#{ru} → #{rw}</span>
        <b className={`ml-2 inline-block w-8 font-semibold ${tone(st.gain, TONE_PLACES)}`}>{places(st.gain)}</b>
      </span>
    </li>
  );
}

/** "Suits best" or "worst": characters by their score on this AI minus their score on other AIs. */
function SuitList({ title, list, idFor, linkFor }) {
  if (!list.length) return null;
  return (
    <div className="min-w-0">
      <div className="mb-0.5 text-[11px] text-slate-400">{title}</div>
      <ul className="m-0 list-none p-0">
        {list.map(d => {
          const to = linkFor ? linkFor(d.name) : null;
          const Name = to ? Link : 'span';
          return (
            <li key={d.name} className="flex items-center gap-1.5 py-[3px]"
              title={`Score ${d.with.toFixed(1)} on this AI over ${d.uses} matches, ${d.without.toFixed(1)} on other AIs`}>
              <Portrait id={idFor(d.name)} name={d.name} size={20} rounded={4} />
              <Name to={to || undefined} className="min-w-0 flex-1 truncate text-[12.5px] text-slate-100 no-underline hover:underline">{d.name}</Name>
              <span className={`text-[12px] tabular-nums ${tone(d.delta, 0)}`}>{pts(d.delta)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Characters whose transform rate this AI raises (or lowers) most: rate on other AIs → on this AI. */
function TransformList({ title, list, idFor, linkFor }) {
  if (!list.length) return null;
  return (
    <div className="min-w-0">
      <div className="mb-0.5 text-[11px] text-slate-400">{title}</div>
      <ul className="m-0 list-none p-0">
        {list.map(d => {
          const to = linkFor ? linkFor(d.name) : null;
          const Name = to ? Link : 'span';
          return (
            <li key={d.name} className="flex items-center gap-1.5 py-[3px]"
              title={`Transformed in ${d.on.transformed} of ${d.on.matches} matches on this AI, ${d.off.transformed} of ${d.off.matches} on other AIs`}>
              <Portrait id={idFor(d.name)} name={d.name} size={20} rounded={4} />
              <Name to={to || undefined} className="min-w-0 flex-1 truncate text-[12.5px] text-slate-100 no-underline hover:underline">{d.name}</Name>
              <span className="text-[12px] tabular-nums text-slate-500">{rate(d.usual)} → {rate(d.with)}</span>
              <span className={`w-8 text-right text-[12px] tabular-nums ${tone(d.delta, 0)}`}>{points(d.delta)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * How often its characters transform (fusions included) on this AI against
 * their other AIs (aiShift.js transformShift), the question participants bring
 * to this page: which AI gets my character to transform. The rate, the time on
 * the field before the first transformation, and the characters it helps and
 * hurts most.
 */
function TransformBox({ t, one, idFor, linkFor, className = '' }) {
  if (!t.compared) {
    return (
      <Box title="Transformations" className={className}>
        <p className="m-0 text-[12.5px] text-slate-400">
          None of its characters that transform has {MIN_OTHER}+ matches on other AI strategies here, so there is nothing to compare it with.
        </p>
      </Box>
    );
  }
  const whose = one ? 'On this AI, against its other AIs' : `Its ${t.characters} compared character${t.characters === 1 ? '' : 's'} on average`;
  return (
    <Box title="Transformations" aside="other AIs → this AI" className={className}>
      <div className="flex items-baseline gap-2" title={`${whose}: the share of matches they transformed or fused in`}>
        <span className="text-[13px] tabular-nums text-slate-400">{rate(t.usual)} →</span>
        <span className="text-[20px] font-extrabold tabular-nums leading-tight text-slate-50">{rate(t.with)}</span>
        <b className={`text-[14px] font-semibold tabular-nums ${tone(t.gain, TONE_TRANSFORM)}`}>{points(t.gain)}</b>
      </div>
      <div className="mb-2 text-[11.5px] text-slate-500">of matches transformed or fused</div>
      {t.seconds && (() => {
        // Sooner is better: a team picking an AI to get a character to
        // transform wants it early (the league, 2026-10-01). So a quicker
        // first transformation is green and a slower one red, said in words.
        const dt = t.seconds.with - t.seconds.usual;
        const shown = Math.round(Math.abs(dt));
        return (
          <div className="mb-2 flex items-baseline justify-between gap-2 border-0 border-t border-solid border-gray-700/50 pt-1.5 text-[12.5px]"
            title={`${whose}: the median time on the field before the first transformation. Sooner is better.`}>
            <span className="text-slate-300">First transformation</span>
            {/* The times, then how much sooner or later in small type under them. */}
            <span className="flex flex-col items-end tabular-nums">
              <span>
                <span className="text-slate-400">{clock(t.seconds.usual)}</span><span className="mx-1.5 text-slate-500">→</span>
                <b className="font-semibold text-slate-100">{clock(t.seconds.with)}</b>
              </span>
              <span className={`text-[11px] font-semibold leading-tight ${tone(dt, TONE_SECONDS, -1)}`}>{shown ? `${shown}s ${dt < 0 ? 'sooner' : 'later'}` : 'same time'}</span>
            </span>
          </div>
        );
      })()}
      {!one && (
        <div className="flex flex-col gap-2.5">
          <TransformList title="Raises most" list={t.byCharacter.filter(d => d.delta > 0).slice(0, 3)} idFor={idFor} linkFor={linkFor} />
          <TransformList title="Lowers most" list={t.byCharacter.filter(d => d.delta < 0).reverse().slice(0, 3)} idFor={idFor} linkFor={linkFor} />
        </div>
      )}
      {!one && !t.byCharacter.length && (
        <p className="m-0 text-[12px] text-slate-500">No character has {SUIT_MIN}+ matches each way to list.</p>
      )}
    </Box>
  );
}

// ---- Single actions, a minute on the field (aiActions.js) ---------------------

const PART = { hit: 'hits/thrown', won: 'won/fought' };
/** An action's figure on this AI or other AIs, a blast as "hits/thrown". */
const valueOf = (a, side) => (side === 'with' ? fmtPair(a.with, a.partWith) : fmtPair(a.usual, a.partUsual));
/**
 * This AI's figure's colour: green up, red down from TONE_RATIO, once the
 * action happens often enough on one side to count (ACTION_FLOOR, Biggest
 * changes' rule): 0.01 to 0.03 a minute is noise, not a tripling.
 */
function actionTone(a) {
  if (a.with === null || a.usual === null || Math.max(a.with, a.usual) < ACTION_FLOOR) return a.with ? 'text-slate-200' : 'text-slate-500';
  return tone(a.usual > 0 ? a.with / a.usual - 1 : (a.with > 0 ? 1 : 0), TONE_RATIO);
}
/** A row's tooltip, `whose(this AI, other AIs)` saying whose figures they are. */
function actionTitle(a, whose) {
  const unit = `${a.label} a minute${a.partWord ? ` (${PART[a.partWord]})` : ''}`;
  return a.usual === null ? `${unit} on this AI: ${valueOf(a, 'with')}` : `${unit}. ${whose(valueOf(a, 'with'), valueOf(a, 'usual'))}`;
}

/**
 * The All actions box's sorts: each column's figure, Change by how much the
 * action moved for its size (aiActions.js actionShift), so a rare action and a
 * common one compare fairly. Without a figure, last either way.
 */
const ACTION_SORTS = {
  usual: a => a.usual,
  with: a => a.with,
  change: a => (a.with === null || a.usual === null ? null : actionShift(a)),
};

/**
 * Its rows: the action, other AIs, this AI and the change (a blast's
 * "0.82/1.17" fits), narrower on a phone so "Vanishing attacks" does too;
 * this AI alone with nothing to compare.
 */
const ALL_GRID = 'grid grid-cols-[minmax(0,1fr)_56px_58px_48px] sm:grid-cols-[minmax(0,1fr)_64px_62px_54px] items-baseline gap-x-2';
const ONLY_GRID = 'grid grid-cols-[minmax(0,1fr)_88px] items-baseline gap-x-2';

/**
 * Every action a minute on the field (aiShift.js `actions`, from
 * aiActions.js), for the reader who wants every detail of what the AI does
 * (the league, 2026-10-01). Biggest changes is its top six by size of
 * change. Grouped as the Match page groups its counts; a search finds an
 * action by name or group; each header sorts (a third click goes back to the
 * groups). `compare` false (no character has enough matches on other AIs):
 * this AI's figures alone.
 *
 * A row toggles that action as a column of the table above (`picked`, the
 * URL's `act`; up to MAX_ACTION_COLUMNS, `full`), without re-sorting it: the
 * open row would jump. The table's own header sorts by it.
 *
 * On a wide screen it fills the detail's right third, as tall as the boxes
 * beside it, and scrolls inside; narrower, it runs its full length.
 */
function AllActions({ actions, compare, picked, full, onToggle, whose, className = '' }) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState(null);
  const onSort = key => setSort(cur => {
    const first = key === 'name' ? 'asc' : 'desc';
    if (!cur || cur.key !== key) return { key, dir: first };
    if (cur.dir === first) return { key, dir: first === 'asc' ? 'desc' : 'asc' };
    return null;
  });
  const head = (key, label, left = false, title) => (
    <SortHead label={label} left={left} title={title} on={!!sort && sort.key === key} dir={sort ? sort.dir : 'desc'} onClick={() => onSort(key)} />
  );
  const grid = compare ? ALL_GRID : ONLY_GRID;
  const found = actions.filter(a => labelMatches(`${a.label} ${a.group}`, q));

  const row = a => {
    const on = picked.includes(a.key);
    const locked = full && !on;
    const hint = on ? 'Click to take it out of the table'
      : locked ? `Up to ${MAX_ACTION_COLUMNS} table columns: take one out first` : 'Click to add it to the table as a column';
    return (
      <li key={a.key} className="border-0 border-t border-solid border-gray-700/50 first:border-t-0">
        <button type="button" aria-pressed={on} aria-disabled={locked || undefined} title={`${actionTitle(a, whose)}. ${hint}`}
          onClick={() => { if (!locked) onToggle(a.key); }}
          className={`${grid} w-full rounded-[4px] border-0 px-1.5 py-[5px] text-left text-[12.5px] ${
            on ? 'cursor-pointer bg-brand/[.12] shadow-[inset_2px_0_0_#f97316]' : locked ? 'cursor-default bg-transparent' : 'cursor-pointer bg-transparent hover:bg-slate-400/5'}`}>
          <span className="truncate text-slate-300">{a.label}</span>
          {compare && <span className={`text-right tabular-nums ${a.usual ? 'text-slate-400' : 'text-slate-500'}`}>{valueOf(a, 'usual')}</span>}
          <b className={`text-right font-semibold tabular-nums ${compare ? actionTone(a) : a.with ? 'text-slate-100' : 'text-slate-500'}`}>{valueOf(a, 'with')}</b>
          {compare && <span className={`text-right text-[12px] tabular-nums ${actionTone(a)}`}>{a.usual === null ? '–' : fmtRateChange(a.with - a.usual)}</span>}
        </button>
      </li>
    );
  };

  let items;
  if (sort) {
    const sign = sort.dir === 'asc' ? 1 : -1;
    const get = ACTION_SORTS[sort.key];
    const has = a => get(a) !== null && get(a) !== undefined;
    items = [...found].sort((x, y) => (sort.key === 'name'
      ? sign * x.label.localeCompare(y.label)
      : (has(y) - has(x)) || sign * (get(x) - get(y)) || x.label.localeCompare(y.label))).map(row);
  } else {
    items = ACTION_GROUPS.flatMap(g => {
      const inGroup = found.filter(a => a.group === g);
      if (!inGroup.length) return [];
      return [
        <li key={`g-${g}`} className="px-1.5 pb-0.5 pt-2.5 text-[10.5px] font-semibold uppercase tracking-[.05em] text-slate-500 first:pt-0.5">{g}</li>,
        ...inGroup.map(row),
      ];
    });
  }

  return (
    <Box title="All actions" aside={compare ? 'a minute: other AIs → this AI' : 'a minute on this AI'} className={`xl:flex xl:flex-col ${className}`}>
      <div className="mb-2 flex items-center gap-2">
        <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Find an action" aria-label="Find an action"
          className="h-[30px] min-w-0 flex-1 rounded-[7px] border border-solid border-gray-700 bg-gray-900 px-2.5 text-[12.5px] text-white outline-none focus:border-brand/[.55]" />
        <span className="flex-none text-[11px] text-slate-500">{full ? `Up to ${MAX_ACTION_COLUMNS} columns` : 'Tap to add a table column'}</span>
      </div>
      <div className={`${grid} border-0 border-b border-solid border-gray-700/50 px-1.5 pb-1.5`}>
        {head('name', 'Action', true)}
        {compare && head('usual', 'Other AIs')}
        {head('with', 'This AI')}
        {compare && head('change', 'Change', false, 'A minute, this AI minus other AIs. Sorts by the change for the action\'s size, so halving counts as much as doubling')}
      </div>
      <ul className="m-0 mt-1 list-none p-0 xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
        {items}
        {!found.length && <li className="px-1.5 py-2 text-[12.5px] text-slate-500">No action matches.</li>}
      </ul>
    </Box>
  );
}

/**
 * One strategy's detail, under its row at every width (it is wider than a
 * side panel): its figures, then bordered boxes (the league asked for borders
 * to tell the parts apart, 2026-09-30):
 *   the pooled figures (score, and damage to win %, the table's old
 *   columns), each ranked among the strategies in view, and for score,
 *   damage, efficiency and taken, the change "vs other AIs": the same
 *   characters' figures on this AI against their own on other AIs
 *   (meta/aiShift.js; nothing here is about who they fought);
 *   then two thirds of boxes, two a row: Style shift, Biggest changes and
 *   Suits (the same comparison), Transformations (when any of its characters
 *   can transform), Run with and Used most by; and the right third, All
 *   actions (2026-10-01), as tall as they are. A lone last box spans its row.
 * With the Character chip on one character, the comparisons are its own, and
 * Suits and Used most by go: they would only name that character again (its
 * score change is the Score tile's "vs other AIs").
 *
 * `act` / `onToggleAction`: the table's action columns, which All actions'
 * rows toggle.
 */
function AIDetail({ row, pool, aggregated, filters, charMap, idFor, linkFor, act, onToggleAction }) {
  const s = useMemo(() => aiShift(aggregated, row.name, filters, charMap), [aggregated, row.name, filters, charMap]);
  const lean = [...s.styles].filter(x => x.gain >= LEAN_PLACES).sort((a, b) => b.gain - a.gain)[0];
  const drop = [...s.styles].filter(x => x.gain <= -LEAN_PLACES).sort((a, b) => a.gain - b.gain)[0];
  const headline = [lean && `More ${lean.name.toLowerCase()}`, drop && `${lean ? 'less' : 'Less'} ${drop.name.toLowerCase()}`]
    .filter(Boolean).join(', ');
  const r = s.results;
  // The tiles' "vs other AIs": figures, format, change format, colour from,
  // and which way is better.
  const change = (x, fmt, diff, min, better = 1) => (x && s.compared ? { ...x, fmt, diff, min, better } : null);
  const changes = {
    score: change(r.score, v => v.toFixed(1), pts, 2),
    dmg: change(r.dmg, v => fmtInt(v), pct, 0.03),
    eff: change(r.eff, v => `${v.toFixed(2)}×`, pct, 0.03),
    taken: change(r.taken, v => fmtInt(v), pct, 0.03, -1),
  };
  // Who the change is about: one character, or its characters on average.
  const one = s.characters === 1 && filters.chars.length === 1;
  const whose = (w, u) => (one
    ? `On this AI ${w}; on its other AIs ${u}`
    : `Its ${s.characters} compared characters average ${w} on this AI and ${u} on their other AIs`);
  const single = filters.chars.length === 1;

  // The left two thirds' boxes, in order; each a function of its classes.
  const boxes = [];
  if (s.compared === 0) {
    boxes.push(['style', cls => (
      <Box title="Style shift" className={cls}>
        <p className="m-0 text-[12.5px] text-slate-400">
          None of its characters has {MIN_OTHER}+ matches on other AI strategies here, so there is nothing to compare it with.
        </p>
      </Box>
    )]);
  } else {
    boxes.push(['style', cls => (
      <Box title="Style shift" aside={<span className="inline-flex items-center gap-1.5">league rank:<Legend /></span>} className={cls}>
        <div className="mb-1 text-[16px] font-extrabold leading-tight" style={{ color: lean ? styleColor(lean.key) : '#e2e8f0' }}>
          {headline || 'No clear shift'}
        </div>
        <ul className="m-0 list-none p-0">{s.styles.map(st => <StyleRow key={st.key} st={st} />)}</ul>
      </Box>
    )]);
    // The top six of All actions by size of change, a minute on the field.
    boxes.push(['biggest', cls => (
      <Box title="Biggest changes" aside="a minute: other AIs → this AI" className={cls}>
        <ul className="m-0 list-none p-0">
          {s.biggest.slice(0, 6).map(a => (
            <li key={a.key} title={actionTitle(a, whose)}
              className="flex items-baseline justify-between gap-2 border-0 border-t border-solid border-gray-700/50 py-[5px] text-[12.5px] first:border-t-0">
              <span className="text-slate-300">{a.label}</span>
              <span className="tabular-nums">
                <span className="text-slate-400">{valueOf(a, 'usual')}</span>
                <span className="mx-1.5 text-slate-500">→</span>
                <b className={`font-semibold ${actionTone(a)}`}>{valueOf(a, 'with')}</b>
              </span>
            </li>
          ))}
        </ul>
        {!s.biggest.length && <p className="m-0 text-[12.5px] text-slate-400">No action happens often enough to compare.</p>}
      </Box>
    )]);
    if (!single && (s.suits.best.length > 0 || s.suits.worst.length > 0)) {
      boxes.push(['suits', cls => (
        <Box title="Suits" aside="score: this AI − other AIs" className={cls}>
          <div className="flex flex-col gap-2.5">
            <SuitList title="Best" list={s.suits.best} idFor={idFor} linkFor={linkFor} />
            <SuitList title="Worst" list={s.suits.worst} idFor={idFor} linkFor={linkFor} />
          </div>
        </Box>
      )]);
    }
  }
  if (row.transform) {
    boxes.push(['transform', cls => (
      <TransformBox t={row.transform} one={single && row.transform.characters === 1} idFor={idFor} linkFor={linkFor} className={cls} />
    )]);
  }
  boxes.push(['run', cls => (
    <Box title="Run with" aside="share of its uses" className={cls}>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {s.builds.types.map(t => (
          <span key={t.label} className="inline-flex items-center gap-1 text-[12px] tabular-nums text-slate-400">
            <BuildPill label={t.label} compact />{Math.round(t.share * 100)}%
          </span>
        ))}
      </div>
      <ul className="m-0 list-none p-0">
        {s.builds.capsules.map(c => (
          <li key={c.name} className="flex items-center gap-2 border-0 border-t border-solid border-gray-700/50 py-1 text-[12.5px] first:border-t-0">
            <span className="h-2 w-2 flex-none rounded-[2px]" style={{ background: capsuleTypeColor(c.type) }} />
            <span className="min-w-0 flex-1 truncate text-slate-200">{c.name}</span>
            <span className="tabular-nums text-slate-400">{Math.round(c.share * 100)}%</span>
          </li>
        ))}
      </ul>
    </Box>
  )]);
  if (!single) {
    boxes.push(['used', cls => (
      <Box title="Used most by" className={cls}>
        <UsedMostBy byCharacter={row.byCharacter} idFor={idFor} linkFor={linkFor} title={false} />
      </Box>
    )]);
  }

  return (
    <div className="pb-1 pt-1">
      <div className="mb-3 flex flex-wrap gap-x-7 gap-y-2">
        <HeaderFigure label="Uses">{fmtInt(row.matches.length)}</HeaderFigure>
        <HeaderFigure label="Characters">{fmtInt(row.characters)}</HeaderFigure>
        <HeaderFigure label="Data" title={qualityTitle(row)}>
          <span className="inline-flex items-center gap-1.5"><DataSignal level={row.quality} />{row.quality}</span>
        </HeaderFigure>
        <HeaderFigure label="Compared" title="Uses whose character also has 3+ matches on other AI strategies">
          {fmtInt(s.compared)}<span className="ml-1 text-sm font-medium text-slate-500">of {fmtInt(s.total)}</span>
        </HeaderFigure>
      </div>

      <PooledTiles row={row} pool={pool} stats={POOLED} changes={changes} whose={whose} vs="vs other AIs"
        grid="grid-cols-2 sm:grid-cols-4 lg:grid-cols-8" />

      <div className="mt-2 grid gap-2 xl:grid-cols-3">
        <div className="grid content-start gap-2 md:grid-cols-2 xl:col-span-2">
          {boxes.map(([key, box], i) => (
            <React.Fragment key={key}>{box(i === boxes.length - 1 && boxes.length % 2 ? 'md:col-span-2' : '')}</React.Fragment>
          ))}
        </div>
        {/* Out of the flow on a wide screen, so the boxes beside it set its height. */}
        <div className="relative min-w-0 xl:min-h-[440px]">
          <AllActions actions={s.actions} compare={s.compared > 0} picked={act} full={act.length >= MAX_ACTION_COLUMNS}
            onToggle={onToggleAction} whose={whose} className="xl:absolute xl:inset-0" />
        </div>
      </div>
    </div>
  );
}

/**
 * Meta's AI strategies tab: a row per AI strategy in scope (meta/aiRows.js),
 * on the pooled Meta table (meta/PooledTab.jsx).
 *
 * The COLUMNS rank strategies by what they do to their characters' fighting
 * styles, so a reader can sort for the strategy that pushes a style most (the
 * league, 2026-09-30): Data, Score and Uses, then a column per style, the
 * places it moves its characters in the league's ranking for that style,
 * against the same characters on other strategies (aiShift.js styleRanks).
 * The pooled figures that were the columns (damage to battle time, win %)
 * open in the detail.
 *
 * ACTION COLUMNS (`act=sparking,ult`, 2026-10-01): any single action, up to
 * MAX_ACTION_COLUMNS, after Uses (aiRows.js actionColumn): with one character
 * picked, its rate a minute on each AI; otherwise the change a minute against
 * the same characters on their other AIs. Picked from the control row (which
 * sorts by the one added) or by tapping a row of a detail's All actions box
 * (which does not: the open row would jump). Their rates are computed only
 * while one is shown (withActionRates). A compact table shows them in its
 * slots before the viewer's picks, and its full layout starts wider.
 *
 * Its filters are scope-bar chips (Type, and the Builds tab's Character);
 * the sort, the action columns and the open strategy (`open=<slug>`) are in
 * the URL. `linkFor(name)` opens a character's page.
 *
 * TRANSFORM, the last column (aiRows.js TRANSFORM_STAT): how much more often
 * the same characters transform or fuse on it than on their other AIs. It
 * goes when none of the characters in view can transform, with a line saying
 * so (a column of dashes distinguishes nothing).
 *
 * DATA: each row's data quality (aiShift.js dataQuality, from uses and
 * characters) is a column of rising bars, and Low rows fade as thin samples
 * do. When every row has the same level the column and the fading switch off:
 * a marker on every row distinguishes nothing. When most rows are Low, a link
 * widens the scope to the league reference's window (the last two seasons,
 * Ultra: style-baseline.json's basis) by setting those chips, so the change is
 * in the scope bar for anyone to see and undo (the league's choice, over
 * changing the default scope or pinning the figures to that window).
 */
export default function AIStrategiesTab({ aggregated, charMap, idFor, linkFor }) {
  const [params] = useSearchParams();
  const update = useQueryUpdate();
  const isPhone = useIsPhone();
  const filters = readAiFilters(params);
  const filterKey = JSON.stringify(filters);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableFilters = useMemo(() => filters, [filterKey]);
  const lineups = useMemo(() => lineupIndex(aggregated, idFor), [aggregated, idFor]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const pool = useMemo(() => aiStrategyRows(aggregated, filters, charMap, { idFor, lineups }), [aggregated, filterKey, charMap, idFor, lineups]);
  const act = readAiActions(params);
  const actKey = act.join(',');
  const acting = act.length > 0;
  const single = filters.chars.length === 1;
  // The action columns' figures, only while one is shown.
  const rated = useMemo(() => (acting ? withActionRates(pool, aggregated, stableFilters) : pool), [acting, pool, aggregated, stableFilters]);
  const transforms = pool.some(r => r.transform);
  // Transform figures on too little data of their own fade, unless all of them
  // do: a marker on every row distinguishes nothing (the footnote says so).
  const figures = pool.filter(r => r.transform && r.transform.gain !== null);
  const thinFigures = figures.filter(r => r.transform.quality === 'Low').length;
  const allThin = figures.length > 0 && thinFigures === figures.length;
  const base = transforms
    ? AI_COLUMNS.map(c => (c.key === 'transform' && allThin ? { ...c, thin: null } : c))
    : AI_COLUMNS.filter(c => c.key !== 'transform');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const actionCols = useMemo(() => act.map(k => actionColumn(k, single)), [actKey, single]);
  // Uses (AI_COLUMNS' first), the action columns, then the styles and Transform.
  const columns = [base[0], ...actionCols, ...base.slice(1)];
  const statFor = key => columns.find(c => c.key === key) || null;
  const { sort, dir } = readAiSort(params, statFor);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rows = useMemo(() => sortAiRows(rated, { sort, dir }, statFor), [rated, sort, dir, transforms, actionCols]);
  const varied = new Set(pool.map(r => r.quality)).size > 1;

  // Most rows thin: offer the reference window (shell/useWidenLink.jsx).
  const thin = (pool.length > 0 && pool.filter(r => r.quality === 'Low').length * 2 > pool.length)
    || (figures.length > 0 && thinFigures * 2 > figures.length);
  const widen = useWidenLink(thin);

  // The open strategy is in the URL (`open=<slug>`), so a link can open one:
  // a row of the Character page's Transformations tab does, on its character.
  const open = params.get('open');
  const onOpen = id => update(p => { if (id) p.set('open', id); else p.delete('open'); });

  const onSort = key => update(p => {
    const byDefault = key === 'name' ? 'asc' : 'desc';
    const next = sort === key ? (dir === 'asc' ? 'desc' : 'asc') : byDefault;
    if (key === 'matches' && next === 'desc') { p.delete('sort'); p.delete('dir'); return; }
    p.set('sort', key);
    if (next === byDefault) p.delete('dir'); else p.set('dir', next);
  });

  // The action columns: `sortBy` sorts by the one added; dropping the sorted
  // one drops the sort.
  const setActions = (next, sortBy = null) => update(p => {
    const keep = [...new Set(next)].slice(0, MAX_ACTION_COLUMNS);
    if (keep.length) p.set('act', keep.join(',')); else p.delete('act');
    const sorted = p.get('sort');
    if (sortBy) { p.set('sort', `a_${sortBy}`); p.delete('dir'); }
    else if (sorted && sorted.startsWith('a_') && !keep.includes(sorted.slice(2))) { p.delete('sort'); p.delete('dir'); }
  });
  const onToggleAction = key => setActions(act.includes(key) ? act.filter(k => k !== key) : [...act, key]);
  const [actOpen, setActOpen] = useState(false);
  const actionChip = {
    id: 'act',
    name: 'Action columns',
    multi: true,
    search: true,
    selected: act,
    set: acting,
    label: multiLabel('Action columns', act, k => actionByKey(k).label),
    allLabel: 'None',
    options: ACTIONS.map(a => ({ v: a.key, l: a.label, cnt: a.group, dis: act.length >= MAX_ACTION_COLUMNS })),
    note: `Up to ${MAX_ACTION_COLUMNS}, a minute on the field: ${single
      ? 'its rate on each AI' : 'the change against the same characters on their other AIs'}.`,
    onChange: next => setActions(next, next.find(k => !act.includes(k)) || null),
  };
  const controls = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <ChipMenu isPhone={isPhone} open={actOpen} onOpenChange={setActOpen} chip={actionChip} />
      {widen}
    </div>
  );

  return (
    <PooledTab rows={rows} sort={sort} dir={dir} onSort={onSort} resetKey={filterKey + rows.length}
      nameLabel="AI strategy" noun="strategies" empty="No AI strategies match these filters." controls={controls} open={open} onOpen={onOpen}
      stats={columns} phone={{ key: 'szl.analyzer.ai.phoneCols', defaults: AI_PHONE_DEFAULTS, byKey: statFor }} below
      pinned={actionCols} fullFrom={FULL_FROM + ACTION_COLUMN_ROOM * act.length}
      afterName={varied ? [{
        key: 'data', label: 'Data', width: '48px', sort: false, title: 'Data quality: uses and characters',
        cell: r => <div className="flex justify-center"><DataSignal level={r.quality} title={qualityTitle(r)} /></div>,
      }] : []}
      fadeRow={varied ? r => r.quality === 'Low' : null}
      // No Balanced / Attack / Defense pill: every strategy's name already says
      // it (the league, 2026-09-29). The Type chip still filters by it.
      nameCell={(r, compact) => (
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold leading-[1.25] text-slate-50 sm:text-[14px]">{r.name}</div>
          <div className="mt-[3px] flex items-center gap-1.5 text-[12px] text-slate-400">
            {characters(r)}
            {compact && varied && <><span aria-hidden>·</span><DataSignal level={r.quality} title={qualityTitle(r)} /></>}
          </div>
        </div>
      )}
      title={r => <div className="text-[15px] font-semibold leading-[1.25] text-slate-50">{r.name}</div>}
      detail={r => (
        <AIDetail row={r} pool={pool} aggregated={aggregated} filters={stableFilters} charMap={charMap} idFor={idFor} linkFor={linkFor}
          act={act} onToggleAction={onToggleAction} />
      )}
      footnote={`${acting ? `Action columns: ${single ? 'its rate a minute on each AI' : 'the change a minute against the same characters on their other AI strategies'}. ` : ''
      }Style columns: the places a strategy moves its characters in the league's ranking for that style, against the same characters on their other AI strategies. ${
        transforms ? `Transform: how many points more often they transform or fuse on it${
          allThin ? '; every figure here rests on little data, so none is faded' : ', faded where that rests on little data'}.`
          : 'None of these characters can transform or fuse, so there is no Transform column.'}${
        varied ? '' : ` Every strategy here has ${pool[0] ? pool[0].quality : 'the same'} data, so none is marked.`}`} />
  );
}
