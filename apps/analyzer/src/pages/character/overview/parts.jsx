import React, { useState } from 'react';
import {
  useFloating, autoUpdate, offset, flip, shift,
  useHover, useFocus, useDismiss, useRole, useInteractions, FloatingPortal,
} from '@floating-ui/react';
import { Star } from 'lucide-react';
import { tierForScore } from '../../../utils/performanceTier.js';
import { tierPillColors, tierPillClass } from '../../../utils/tierPlateSvg.js';
import { NEUTRAL } from '../../../utils/overviewPalette.js';

/**
 * Small pieces shared by the Overview's sections: number formats, the rank text,
 * the compact score pill and the Me / League tooltip.
 */

export const fmt = (n, digits = 0) =>
  (n === null || n === undefined || !Number.isFinite(n)) ? '—' : Number(n).toLocaleString(undefined, {
    minimumFractionDigits: digits, maximumFractionDigits: digits,
  });

/** Per-match averages: one decimal, two when a real value would round to 0.0. */
export const perMatch = x => (x > 0 && x < 0.095 ? fmt(x, 2) : fmt(x, 1));

// Rounded to whole seconds BEFORE splitting, or 119.6s would read 1:60.
export const mmss = s => {
  if (!Number.isFinite(s)) return '—';
  const t = Math.round(s);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};

export const percent = x => (x === null || x === undefined ? '—' : `${Math.round(x * 100)}%`);

/**
 * "#42/126": the leaderboard position, then the pool it is ranked in, faint. #1 is
 * always the top. `color` is the rank colour, or null for neutral.
 */
export function RankText({ rank, pool, color, className = '' }) {
  if (rank === null || rank === undefined) return <span className={className}>—</span>;
  return (
    <span className={`font-bold tabular-nums whitespace-nowrap ${className}`} style={{ color: color || NEUTRAL }}>
      #{rank}<span className="font-medium text-slate-500">/{pool}</span>
    </span>
  );
}

/**
 * The compact score pill - star and number - in the tier's colours, as the
 * leaderboard badge draws it. `provisional` dims it the way a thin-sample tier
 * plate is dimmed.
 */
export function ScorePill({ score, provisional = false, label = '' }) {
  const tier = tierForScore(score);
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-bold px-1.5 py-0.5 rounded-lg border border-solid whitespace-nowrap tabular-nums ${tierPillClass(tier)}`}
      style={{ ...tierPillColors(tier), ...(provisional ? { filter: 'saturate(.45)', opacity: 0.62 } : null) }}
      title={provisional ? `Tier ${tier}, provisional: under 5 matches` : `Tier ${tier}`}
    >
      <Star className="w-3 h-3" />
      {label}{Math.round(score || 0)}
    </span>
  );
}

/**
 * Wraps a target so hovering, focusing or tapping it shows `content` in a floating
 * panel. `as` picks the element (an SVG `g` works too, for chart marks).
 */
export function Tip({ content, children, as: Tag = 'div', className = '', ...rest }) {
  const [open, setOpen] = useState(false);
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: 'top',
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });
  const { getReferenceProps, getFloatingProps } = useInteractions([
    useHover(context, { move: false }),
    useFocus(context),
    useDismiss(context),
    useRole(context, { role: 'tooltip' }),
  ]);
  return (
    <>
      <Tag ref={refs.setReference} tabIndex={0} className={`cursor-help ${className}`} {...getReferenceProps(rest)}>
        {children}
      </Tag>
      {open && content && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className="z-50 rounded-[8px] border border-solid px-3 py-2 text-xs bg-shell-pop border-gray-700 text-slate-100 shadow-[0_16px_36px_-10px_rgba(0,0,0,.7)]"
          >
            {content}
          </div>
        </FloatingPortal>
      )}
    </>
  );
}

/** A tooltip body: a small Me / League table, with an optional line under it. */
export function TipTable({ title, rows, foot = null }) {
  const muted = 'text-slate-400';
  return (
    <div>
      <div className="font-bold mb-1">{title}</div>
      <table className="border-collapse tabular-nums">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-slate-500">
            <th />
            <th className="text-right font-bold pl-4 pb-1">Me</th>
            <th className="text-right font-bold pl-4 pb-1">League</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, me, league]) => (
            <tr key={label}>
              <td className={`pr-2 py-0.5 ${muted}`}>{label}</td>
              <td className="text-right font-semibold pl-4 py-0.5">{me}</td>
              <td className={`text-right pl-4 py-0.5 ${muted}`}>{league}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {foot && (
        <div className={`mt-1.5 pt-1.5 border-0 border-t border-solid border-gray-700 ${muted}`}>
          {foot}
        </div>
      )}
    </div>
  );
}

/**
 * A thin track with a league-median tick at 50%, filled to `p`% in `color`.
 * `tick={false}` drops the tick, for a track that is a share, not a place.
 */
export function MedianTrack({ p, color, height = 6, empty = false, dot = false, fade = false, tick = true }) {
  const pos = Math.max(0, Math.min(100, p ?? 0));
  return (
    <div className="relative rounded-full bg-shell-track" style={{ height }}>
      {!empty && (
        <div className="absolute left-0 top-0 bottom-0 rounded-full"
          style={{ width: `${Math.max(2, pos)}%`, background: color, opacity: fade ? 0.45 : 0.9 }} />
      )}
      {tick && (
        <div className="absolute bg-slate-400"
          style={{ left: '50%', top: -3, bottom: -3, width: 2, opacity: 0.8 }} />
      )}
      {dot && !empty && (
        <div className="absolute rounded-full border-2 border-solid border-[color:var(--surface)]"
          style={{ left: `${pos}%`, top: '50%', width: 11, height: 11, transform: 'translate(-50%, -50%)', background: color }} />
      )}
    </div>
  );
}
