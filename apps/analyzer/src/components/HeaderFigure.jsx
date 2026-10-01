import React from 'react';

/**
 * One of a detail page's header figures: a small label over its value, as the
 * Character page header has Tier, Score, Rank and Matches, and the Match page
 * its season, type, size, map and difficulty. The value row is 26px, a small
 * tier plate's height, so a plate, a pill and plain text line up.
 *
 * `center` centres the label over its value, as the Character page header has
 * them (the league, 2026-09-30); the Match page's figures stay left-aligned.
 */
export default function HeaderFigure({ label, title, center = false, children }) {
  return (
    <div className={`flex min-w-0 flex-col gap-1 ${center ? 'items-center text-center' : ''}`} title={title}>
      <span className="text-[10px] font-semibold uppercase leading-none tracking-wider text-slate-500">{label}</span>
      <span className={`flex h-[26px] items-center whitespace-nowrap text-lg font-bold leading-none tabular-nums text-slate-100 ${center ? 'justify-center' : ''}`}>{children}</span>
    </div>
  );
}
