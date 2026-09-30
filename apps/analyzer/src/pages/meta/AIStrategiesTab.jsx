import React, { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Portrait from '../../components/Portrait.jsx';
import HeaderFigure from '../../components/HeaderFigure.jsx';
import { useQueryUpdate } from '../../shell/useQueryUpdate.js';
import { tierMatchCount } from '../../utils/performanceTier.js';
import { styleColor, capsuleTypeColor, rankColor } from '../../utils/overviewPalette.js';
import { RankText } from '../character/overview/parts.jsx';
import { BuildPill } from '../character/overview/BuildPicker.jsx';
import TierScorePill from '../../components/TierScorePill.jsx';
import { statByKey } from '../characters/characterRows.js';
import PooledTab, { KICKER } from './PooledTab.jsx';
import {
  aiStrategyRows, readAiFilters, readAiSort, sortAiRows, AI_COLUMNS, aiStatByKey, AI_PHONE_DEFAULTS,
} from './aiRows.js';
import { aiShift, QUALITY, MIN_OTHER, LEAN_PLACES } from './aiShift.js';

const fmtInt = v => Math.round(v || 0).toLocaleString('en-US');
const characters = r => `${r.characters} character${r.characters === 1 ? '' : 's'}`;
const pct = v => (v === null || v === undefined ? '–' : `${v >= 0 ? '+' : '−'}${Math.round(Math.abs(v) * 100)}%`);
const pts = v => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}`;
const places = v => `${v >= 0 ? '+' : '−'}${Math.round(Math.abs(v))}`;
const count = v => (v >= 10 ? Math.round(v).toLocaleString('en-US') : v.toFixed(1));

/**
 * A change's colour: green up (or better), red down (or worse), neutral when
 * it is smaller than `min`, so colour marks only the changes that matter (the
 * league asked for green / red on the changes, 2026-09-30; the site colours
 * only what stands out). `better` is -1 where less is better (damage taken).
 */
const tone = (v, min, better = 1) => (v === null || v === undefined || Math.abs(v) < min ? 'text-slate-200'
  : v * better > 0 ? 'text-rank-good' : 'text-rank-bad');
/** Style shifts of this many places are coloured, and named in the headline. */
const TONE_PLACES = LEAN_PLACES;
/** A single action's change is coloured from this ratio up (+15% or -15%). */
const TONE_RATIO = 0.15;

/**
 * The characters that ran a strategy (or equipped a capsule) most, each
 * linking to its page. Shared by both pooled Meta tabs.
 */
export function UsedMostBy({ byCharacter, idFor, linkFor, title = true }) {
  return (
    <>
      {title && <div className={`${KICKER} mb-1`}>Used most by</div>}
      <ul className="m-0 list-none p-0">
        {byCharacter.slice(0, 5).map(c => {
          const to = linkFor ? linkFor(c.name) : null;
          const Name = to ? Link : 'span';
          return (
            <li key={c.name} className="flex items-center gap-2 border-0 border-t border-solid border-gray-700/50 py-1 first:border-t-0">
              <Portrait id={idFor(c.name)} name={c.name} size={22} rounded={5} />
              <Name to={to || undefined} className="min-w-0 flex-1 truncate text-[13px] text-slate-100 no-underline hover:underline">{c.name}</Name>
              <span className="text-[12px] tabular-nums text-slate-400">{c.uses}×</span>
            </li>
          );
        })}
      </ul>
      {byCharacter.length > 5 && <div className="mt-1 text-[12px] text-slate-500">and {byCharacter.length - 5} more</div>}
    </>
  );
}

/**
 * Low / Medium / High as one, two or three rising bars, lit red, yellow or
 * green (the rank colours, with yellow between) so the level reads at a glance.
 */
const SIGNAL = ['bg-rank-bad', 'bg-yellow-400', 'bg-rank-good'];
export function DataSignal({ level, title }) {
  const on = QUALITY.indexOf(level) + 1;
  return (
    <span className="inline-flex items-end gap-[2px]" title={title} aria-label={`${level} data`}>
      {[5, 8, 11].map((h, i) => (
        <span key={h} className={`block w-[3px] rounded-[1px] ${i < on ? SIGNAL[on - 1] : 'bg-gray-700'}`} style={{ height: h }} />
      ))}
    </span>
  );
}
const qualityTitle = r => `${r.quality} data: ${fmtInt(r.matches.length)} uses over ${characters(r)}, `
  + `${fmtInt(r.comparable)} comparable with the same characters on other AI strategies`;

/** One part of the detail: a light border and a small heading, as the Overview's cards have. */
function Box({ title, aside = null, children, className = '' }) {
  return (
    <section className={`min-w-0 rounded-[10px] border border-solid border-gray-700 p-3.5 ${className}`}>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className={KICKER}>{title}</span>
        {aside && <span className="text-[11px] text-slate-500">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

/**
 * The pooled figures the table used to carry (with the score), each ranked
 * among the strategies in view. Four also say how the same characters did on
 * their other AIs (`changes`, aiShift.js results): the part of the old "Same
 * characters, other AIs" box that the tiles did not already show. Its totals
 * were dropped: averaged per compared character, they disagreed with the
 * tiles' pooled ones (the league's review, 2026-09-30).
 */
const POOLED = [
  { key: 'score', label: 'Score', get: r => r.combatPerformanceScore || 0, fmt: v => v.toFixed(1), dir: 1 },
  ...['dmg', 'dps', 'eff', 'surv', 'taken', 'time', 'win'].map(statByKey),
];
function PooledTiles({ row, pool, changes = {}, whose }) {
  const place = s => {
    const v = s.get(row);
    const better = pool.filter(r => (s.dir === -1 ? s.get(r) < v : s.get(r) > v)).length;
    const rank = better + 1;
    const pctl = pool.length >= 5 && s.dir !== 0 ? ((pool.length - rank) / (pool.length - 1)) * 100 : null;
    return { rank, color: rankColor(pctl, true) };
  };
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-solid border-gray-700 bg-slate-400/[.16] sm:grid-cols-4 lg:grid-cols-8">
      {POOLED.map(s => {
        const { rank, color } = place(s);
        const c = changes[s.key];
        return (
          <div key={s.key} className="min-w-0 bg-shell-panel px-3 py-2.5 sm:px-3.5 sm:py-3">
            <div className="truncate text-[11px] font-semibold uppercase tracking-wider text-slate-400">{s.label}</div>
            <div className="mt-0.5 text-lg font-extrabold tabular-nums text-white">
              {s.key === 'score' ? <TierScorePill score={row.combatPerformanceScore} /> : s.fmt(s.get(row))}
            </div>
            <div className="text-xs"><RankText rank={rank} pool={pool.length} color={color} darkMode /></div>
            {c && (
              <div className="mt-1 whitespace-nowrap text-[11px] tabular-nums"
                title={`${whose(c.fmt(c.with), c.fmt(c.usual))}`}>
                <b className={`font-semibold ${tone(c.shift, c.min, c.better)}`}>{c.diff(c.shift)}</b>
                <span className="ml-1 text-slate-500">vs other AIs</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** The style shift's two markers: a hollow dot for the rank on other AIs, a filled one for this AI's. The legend draws the same. */
const USUAL_DOT = 'h-2 w-2 rounded-full border border-solid border-slate-400 bg-shell-panel';
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
  const color = styleColor(st.key, true);
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

/**
 * One strategy's detail, under its row at every width (it is wider than a
 * side panel): its figures, then bordered boxes (the league asked for borders
 * to tell the parts apart, 2026-09-30):
 *   the pooled figures (score, and damage to win %, the table's old
 *   columns), each ranked among the strategies in view, and for score,
 *   damage, efficiency and taken, the change "vs other AIs": the same
 *   characters' figures on this AI against their own on other AIs
 *   (meta/aiShift.js; nothing here is about who they fought);
 *   Style shift, Biggest changes and Suits (the same comparison), then Run
 *   with and Used most by.
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
        <HeaderFigure label="Uses">{fmtInt(tierMatchCount(row))}</HeaderFigure>
        <HeaderFigure label="Characters">{fmtInt(row.characters)}</HeaderFigure>
        <HeaderFigure label="Data" title={qualityTitle(row)}>
          <span className="inline-flex items-center gap-1.5"><DataSignal level={row.quality} />{row.quality}</span>
        </HeaderFigure>
        <HeaderFigure label="Compared" title="Uses whose character also has 3+ matches on other AI strategies">
          {fmtInt(s.compared)}<span className="ml-1 text-sm font-medium text-slate-500">of {fmtInt(s.total)}</span>
        </HeaderFigure>
      </div>

      <PooledTiles row={row} pool={pool} changes={changes} whose={whose} />

      {s.compared === 0 ? (
        <Box title="Style shift" className="mt-2">
          <p className="m-0 text-[12.5px] text-slate-400">
            None of its characters has {MIN_OTHER}+ matches on other AI strategies here, so there is nothing to compare it with.
          </p>
        </Box>
      ) : (
        <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          <Box title="Style shift" aside={<span className="inline-flex items-center gap-1.5">league rank:<Legend /></span>}>
            <div className="mb-1 text-[16px] font-extrabold leading-tight" style={{ color: lean ? styleColor(lean.key, true) : '#e2e8f0' }}>
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

      <div className="mt-2 grid gap-2 md:grid-cols-2">
        <Box title="Run with" aside="share of its uses">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {s.builds.types.map(t => (
              <span key={t.label} className="inline-flex items-center gap-1 text-[12px] tabular-nums text-slate-400">
                <BuildPill label={t.label} darkMode compact />{Math.round(t.share * 100)}%
              </span>
            ))}
          </div>
          <ul className="m-0 list-none p-0">
            {s.builds.capsules.map(c => (
              <li key={c.name} className="flex items-center gap-2 border-0 border-t border-solid border-gray-700/50 py-1 text-[12.5px] first:border-t-0">
                <span className="h-2 w-2 flex-none rounded-[2px]" style={{ background: capsuleTypeColor(c.type, true) }} />
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
 * DATA: each row's data quality (aiShift.js dataQuality, from uses and
 * characters) is a column of rising bars, and Low rows fade as thin samples
 * do. When every row has the same level the column and the fading switch off:
 * a marker on every row distinguishes nothing.
 */
export default function AIStrategiesTab({ aggregated, charMap, idFor, linkFor }) {
  const [params] = useSearchParams();
  const update = useQueryUpdate();
  const filters = readAiFilters(params);
  const filterKey = JSON.stringify(filters);
  const { sort, dir } = readAiSort(params, aiStatByKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableFilters = useMemo(() => filters, [filterKey]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const pool = useMemo(() => aiStrategyRows(aggregated, filters, charMap), [aggregated, filterKey, charMap]);
  const rows = useMemo(() => sortAiRows(pool, { sort, dir }, aiStatByKey), [pool, sort, dir]);
  const varied = new Set(pool.map(r => r.quality)).size > 1;

  const onSort = key => update(p => {
    const byDefault = key === 'name' ? 'asc' : 'desc';
    const next = sort === key ? (dir === 'asc' ? 'desc' : 'asc') : byDefault;
    if (key === 'matches' && next === 'desc') { p.delete('sort'); p.delete('dir'); return; }
    p.set('sort', key);
    if (next === byDefault) p.delete('dir'); else p.set('dir', next);
  });

  return (
    <PooledTab rows={rows} sort={sort} dir={dir} onSort={onSort} resetKey={filterKey + rows.length}
      nameLabel="AI strategy" noun="strategies" empty="No AI strategies match these filters."
      stats={AI_COLUMNS} phone={{ key: 'szl.analyzer.ai.phoneCols', defaults: AI_PHONE_DEFAULTS, byKey: aiStatByKey }} below
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
      footnote={`Style columns: the places a strategy moves its characters in the league's ranking for that style, against the same characters on their other AI strategies.${
        varied ? '' : ` Every strategy here has ${pool[0] ? pool[0].quality : 'the same'} data, so none is marked.`}`} />
  );
}
