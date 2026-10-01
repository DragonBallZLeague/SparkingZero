import React from 'react';
import { styleTip } from './styleRows.js';

/**
 * A fighting style's figure (characters/styleRows.js): a rate a minute, or
 * Defense's 0-100 rating, with its league rank in the tooltip. A style never
 * used reads "Never". `f` is one of a row's `styles` entries and `stat` its
 * STYLE_STATS column; `unit` adds "/min" or "/100", faint (Home's boards,
 * where no header says what the figure is).
 */
export default function StyleValue({ f, stat, unit = false }) {
  if (!f) return <>–</>;
  if (f.never) return <span className="text-slate-400" title={styleTip(stat, f)}>Never</span>;
  return (
    <span title={styleTip(stat, f)}>
      {stat.fmt(f.raw)}{unit && <span className="font-medium text-slate-500">{stat.unit}</span>}
    </span>
  );
}
