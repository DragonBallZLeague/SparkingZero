import React from 'react';
import { Link } from 'react-router-dom';
import Portrait from '../../components/Portrait.jsx';
import TierScorePill from '../../components/TierScorePill.jsx';
import { rankColor } from '../../utils/overviewPalette.js';
import { RankText } from '../character/overview/parts.jsx';
import { statByKey } from '../characters/characterRows.js';
import { KICKER } from './PooledTab.jsx';
import { QUALITY } from './aiShift.js';

/**
 * The parts both pooled Meta details are built from (AI strategies and
 * Capsules, 2026-09-30): the bordered box, the ranked tile grid with its
 * change line, the data signal, the change colours and "Used most by".
 */

export const fmtInt = v => Math.round(v || 0).toLocaleString('en-US');
/** A ratio change as a signed percent, "+5%" / "−3%". */
export const pct = v => (v === null || v === undefined ? '–' : `${v >= 0 ? '+' : '−'}${Math.round(Math.abs(v) * 100)}%`);
/** A points change, "+2.4". */
export const pts = v => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}`;

/**
 * A change's colour: green up (or better), red down (or worse), neutral when
 * it is smaller than `min`, so colour marks only the changes that matter (the
 * league asked for green / red on the changes, 2026-09-30; the site colours
 * only what stands out). `better` is -1 where less is better (damage taken).
 */
export const tone = (v, min, better = 1) => (v === null || v === undefined || Math.abs(v) < min ? 'text-slate-200'
  : v * better > 0 ? 'text-rank-good' : 'text-rank-bad');

/** One part of a detail: a light border and a small heading, as the Overview's cards have. */
export function Box({ title, aside = null, children, className = '' }) {
  return (
    <section className={`min-w-0 rounded-[10px] border border-solid border-gray-700 p-3.5 ${className}`}>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className={KICKER}>{title}</span>
        {aside && <span className="text-right text-[11px] text-slate-500">{aside}</span>}
      </div>
      {children}
    </section>
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

/** The pooled figures a Characters row carries, damage to win % (win % last: a team measure). */
export const POOLED_FIGURES = ['dmg', 'dps', 'eff', 'surv', 'taken', 'time', 'win'].map(statByKey);

/**
 * Pooled figures as a tile grid, each ranked among `pool` (the rows in view).
 * `changes[key]`, when given, adds a line under a tile: the change against
 * the detail's comparison ({ with, usual, shift, fmt, diff, min, better }),
 * followed by `vs` ("vs other AIs"), its tooltip `whose(with, usual)`.
 * `grid` is the grid's column classes, and `lastSpan` the last tile's, so an
 * odd count still fills its rows.
 */
export function PooledTiles({ row, pool, stats, changes = {}, whose, vs, grid, lastSpan = '' }) {
  const place = s => {
    const v = s.get(row);
    const better = pool.filter(r => (s.dir === -1 ? s.get(r) < v : s.get(r) > v)).length;
    const rank = better + 1;
    const pctl = pool.length >= 5 && s.dir !== 0 ? ((pool.length - rank) / (pool.length - 1)) * 100 : null;
    return { rank, color: rankColor(pctl) };
  };
  return (
    <div className={`grid gap-px overflow-hidden rounded-[10px] border border-solid border-gray-700 bg-slate-400/[.16] ${grid}`}>
      {stats.map((s, i) => {
        const { rank, color } = place(s);
        const c = changes[s.key];
        return (
          <div key={s.key} className={`min-w-0 bg-[var(--surface)] px-3 py-2.5 sm:px-3.5 sm:py-3 ${i === stats.length - 1 ? lastSpan : ''}`}>
            <div className="truncate text-[11px] font-semibold uppercase tracking-wider text-slate-400">{s.label}</div>
            <div className="mt-0.5 text-lg font-extrabold tabular-nums text-white">
              {s.key === 'score' ? <TierScorePill score={row.combatPerformanceScore} /> : s.fmt(s.get(row))}
            </div>
            <div className="text-xs"><RankText rank={rank} pool={pool.length} color={color} /></div>
            {c && (
              <div className="mt-1 whitespace-nowrap text-[11px] tabular-nums" title={whose(c.fmt(c.with), c.fmt(c.usual))}>
                <b className={`font-semibold ${tone(c.shift, c.min, c.better)}`}>{c.diff(c.shift)}</b>
                <span className="ml-1 text-slate-500">{vs}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * The characters that ran a strategy (or equipped a capsule) most, each
 * linking to its page.
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
