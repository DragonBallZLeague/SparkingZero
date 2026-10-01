import React, { useMemo } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import Portrait from '../../components/Portrait.jsx';
import HeaderFigure from '../../components/HeaderFigure.jsx';
import { useQueryUpdate } from '../../shell/useQueryUpdate.js';
import { parseScope, writeScope } from '../../shell/scopeModel.js';
import { isSandboxPath } from '../../routes.js';
import { styleColor, capsuleTypeColor } from '../../utils/overviewPalette.js';
import { lineupIndex } from '../../utils/transformation.js';
import baseline from '../../config/style-baseline.json';
import { BuildPill } from '../character/overview/BuildPicker.jsx';
import PooledTab from './PooledTab.jsx';
import {
  Box, DataSignal, PooledTiles, POOLED_FIGURES, UsedMostBy, tone, fmtInt, pct, pts,
} from './detailParts.jsx';
import {
  aiStrategyRows, readAiFilters, readAiSort, sortAiRows, AI_COLUMNS, AI_PHONE_DEFAULTS,
} from './aiRows.js';
import { aiShift, MIN_OTHER, LEAN_PLACES, SUIT_MIN } from './aiShift.js';

const characters = r => `${r.characters} character${r.characters === 1 ? '' : 's'}`;
const places = v => `${v >= 0 ? '+' : '−'}${Math.round(Math.abs(v))}`;
const count = v => (v >= 10 ? Math.round(v).toLocaleString('en-US') : v.toFixed(1));

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
const clock = s => { const t = Math.round(s); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };

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
function TransformBox({ t, one, idFor, linkFor }) {
  if (!t.compared) {
    return (
      <Box title="Transformations">
        <p className="m-0 text-[12.5px] text-slate-400">
          None of its characters that transform has {MIN_OTHER}+ matches on other AI strategies here, so there is nothing to compare it with.
        </p>
      </Box>
    );
  }
  const whose = one ? 'On this AI, against its other AIs' : `Its ${t.characters} compared character${t.characters === 1 ? '' : 's'} on average`;
  return (
    <Box title="Transformations" aside="other AIs → this AI">
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
            <span className="tabular-nums">
              <span className="text-slate-400">{clock(t.seconds.usual)}</span><span className="mx-1.5 text-slate-500">→</span>
              <b className="font-semibold text-slate-100">{clock(t.seconds.with)}</b>
              <b className={`ml-2 font-semibold ${tone(dt, TONE_SECONDS, -1)}`}>{shown ? `${shown}s ${dt < 0 ? 'sooner' : 'later'}` : 'same'}</b>
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

/**
 * One strategy's detail, under its row at every width (it is wider than a
 * side panel): its figures, then bordered boxes (the league asked for borders
 * to tell the parts apart, 2026-09-30):
 *   the pooled figures (score, and damage to win %, the table's old
 *   columns), each ranked among the strategies in view, and for score,
 *   damage, efficiency and taken, the change "vs other AIs": the same
 *   characters' figures on this AI against their own on other AIs
 *   (meta/aiShift.js; nothing here is about who they fought);
 *   Style shift, Biggest changes and Suits (the same comparison), then
 *   Transformations (when any of its characters can transform), Run with and
 *   Used most by.
 * With the Character chip on one character, the comparisons are its own.
 */
function AIDetail({ row, pool, aggregated, filters, charMap, idFor, linkFor }) {
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

      {s.compared === 0 ? (
        <Box title="Style shift" className="mt-2">
          <p className="m-0 text-[12.5px] text-slate-400">
            None of its characters has {MIN_OTHER}+ matches on other AI strategies here, so there is nothing to compare it with.
          </p>
        </Box>
      ) : (
        <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          <Box title="Style shift" aside={<span className="inline-flex items-center gap-1.5">league rank:<Legend /></span>}>
            <div className="mb-1 text-[16px] font-extrabold leading-tight" style={{ color: lean ? styleColor(lean.key) : '#e2e8f0' }}>
              {headline || 'No clear shift'}
            </div>
            <ul className="m-0 list-none p-0">{s.styles.map(st => <StyleRow key={st.key} st={st} />)}</ul>
          </Box>

          <Box title="Biggest changes" aside="a match: other AIs → this AI">
            <ul className="m-0 list-none p-0">
              {s.actions.slice(0, 6).map(a => (
                <li key={a.key} className="flex items-baseline justify-between gap-2 border-0 border-t border-solid border-gray-700/50 py-[5px] text-[12.5px] first:border-t-0">
                  <span className="text-slate-300">{a.label}</span>
                  <span className="tabular-nums">
                    <span className="text-slate-400">{count(a.usual)}</span>
                    <span className="mx-1.5 text-slate-500">→</span>
                    <b className={`font-semibold ${tone(a.usual > 0 ? a.with / a.usual - 1 : (a.with > 0 ? 1 : 0), TONE_RATIO)}`}>{count(a.with)}</b>
                  </span>
                </li>
              ))}
            </ul>
          </Box>

          {(s.suits.best.length > 0 || s.suits.worst.length > 0) && (
            <Box title="Suits" aside="score: this AI − other AIs" className="md:col-span-2 xl:col-span-1">
              <div className="flex flex-col gap-2.5">
                <SuitList title="Best" list={s.suits.best} idFor={idFor} linkFor={linkFor} />
                <SuitList title="Worst" list={s.suits.worst} idFor={idFor} linkFor={linkFor} />
              </div>
            </Box>
          )}
        </div>
      )}

      <div className={`mt-2 grid gap-2 md:grid-cols-2 ${row.transform ? 'xl:grid-cols-3' : ''}`}>
        {row.transform && (
          <TransformBox t={row.transform} one={filters.chars.length === 1 && row.transform.characters === 1} idFor={idFor} linkFor={linkFor} />
        )}
        <Box title="Run with" aside="share of its uses">
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
        <Box title="Used most by">
          <UsedMostBy byCharacter={row.byCharacter} idFor={idFor} linkFor={linkFor} title={false} />
        </Box>
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
 * Its filters are scope-bar chips (Type, and the Builds tab's Character);
 * the sort is in the URL. `linkFor(name)` opens a character's page.
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
  const { pathname } = useLocation();
  const update = useQueryUpdate();
  const filters = readAiFilters(params);
  const filterKey = JSON.stringify(filters);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableFilters = useMemo(() => filters, [filterKey]);
  const lineups = useMemo(() => lineupIndex(aggregated, idFor), [aggregated, idFor]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const pool = useMemo(() => aiStrategyRows(aggregated, filters, charMap, { idFor, lineups }), [aggregated, filterKey, charMap, idFor, lineups]);
  const transforms = pool.some(r => r.transform);
  // Transform figures on too little data of their own fade, unless all of them
  // do: a marker on every row distinguishes nothing (the footnote says so).
  const figures = pool.filter(r => r.transform && r.transform.gain !== null);
  const thinFigures = figures.filter(r => r.transform.quality === 'Low').length;
  const allThin = figures.length > 0 && thinFigures === figures.length;
  const columns = transforms
    ? AI_COLUMNS.map(c => (c.key === 'transform' && allThin ? { ...c, thin: null } : c))
    : AI_COLUMNS.filter(c => c.key !== 'transform');
  const statFor = key => columns.find(c => c.key === key) || null;
  const { sort, dir } = readAiSort(params, statFor);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rows = useMemo(() => sortAiRows(pool, { sort, dir }, statFor), [pool, sort, dir, transforms]);
  const varied = new Set(pool.map(r => r.quality)).size > 1;

  // Most rows thin, and not already on the reference window: offer it.
  const basis = baseline.basis;
  const scope = parseScope(params);
  const onWindow = !scope.matchType && (scope.difficulty || []).join() === basis.difficulty
    && [...(scope.seasonNumber || [])].sort().join() === [...basis.seasons].sort().join();
  const thin = (pool.length > 0 && pool.filter(r => r.quality === 'Low').length * 2 > pool.length)
    || (figures.length > 0 && thinFigures * 2 > figures.length);
  const widen = thin && !onWindow && !isSandboxPath(pathname) ? (
    <span className="text-[12.5px] text-slate-400">
      Little data here.{' '}
      <button type="button" className="cursor-pointer bg-transparent p-0 text-[12.5px] text-orange-400 hover:underline"
        title={`Sets the Season chip to ${basis.seasons.map(s => `Season ${s}`).join(' and ')}, Difficulty to ${basis.difficulty}, and clears Match type`}
        onClick={() => update(p => writeScope(p, { ...parseScope(p), seasonNumber: basis.seasons, difficulty: [basis.difficulty], matchType: [] }))}>
        Widen to the last {basis.seasonWindow} seasons, {basis.difficulty} ({fmtInt(basis.matches)} matches)
      </button>
    </span>
  ) : null;

  const onSort = key => update(p => {
    const byDefault = key === 'name' ? 'asc' : 'desc';
    const next = sort === key ? (dir === 'asc' ? 'desc' : 'asc') : byDefault;
    if (key === 'matches' && next === 'desc') { p.delete('sort'); p.delete('dir'); return; }
    p.set('sort', key);
    if (next === byDefault) p.delete('dir'); else p.set('dir', next);
  });

  return (
    <PooledTab rows={rows} sort={sort} dir={dir} onSort={onSort} resetKey={filterKey + rows.length}
      nameLabel="AI strategy" noun="strategies" empty="No AI strategies match these filters." controls={widen}
      stats={columns} phone={{ key: 'szl.analyzer.ai.phoneCols', defaults: AI_PHONE_DEFAULTS, byKey: statFor }} below
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
      detail={r => <AIDetail row={r} pool={pool} aggregated={aggregated} filters={stableFilters} charMap={charMap} idFor={idFor} linkFor={linkFor} />}
      footnote={`Style columns: the places a strategy moves its characters in the league's ranking for that style, against the same characters on their other AI strategies. ${
        transforms ? `Transform: how many points more often they transform or fuse on it${
          allThin ? '; every figure here rests on little data, so none is faded' : ', faded where that rests on little data'}.`
          : 'None of these characters can transform or fuse, so there is no Transform column.'}${
        varied ? '' : ` Every strategy here has ${pool[0] ? pool[0].quality : 'the same'} data, so none is marked.`}`} />
  );
}
