import React from 'react';
import { Search, X } from 'lucide-react';

/**
 * Pieces every list table shares (Characters, Meta Builds, Teams, the Team
 * page): the header type, a sortable header cell, a stat cell, a search box and
 * the "Show more" foot, as the shell demo drew them.
 */

/** A header cell's type: small caps, one line-height, so buttons and plain cells share a baseline. */
export const HEAD = 'text-[11px] leading-4 font-semibold uppercase tracking-[.04em] whitespace-nowrap';

/** A sortable header cell: orange while it is the sort, with the direction's arrow. */
export function SortHead({ label, on, dir, onClick, left = false }) {
  return (
    <div className={`flex ${left ? 'justify-start' : 'justify-end'}`}>
      <button type="button" onClick={onClick}
        className={`${HEAD} border-0 bg-transparent p-0 cursor-pointer ${on ? 'text-orange-400' : 'text-slate-400 hover:text-slate-200'}`}>
        {label}{on ? (dir === 'asc' ? ' ↑' : ' ↓') : ''}
      </button>
    </div>
  );
}

/**
 * A stat cell: the number, white, over a thin bar for its size in the column.
 * The bar turns green for the top fifth of the pool and red for the bottom
 * fifth (`p`, 0..1 in the "better" direction, or null), and stays grey between,
 * so colour marks only what stands out. `faded` is a thin sample's look.
 */
export function StatCell({ text, value, max, p, faded = false }) {
  const colour = p === null || p === undefined ? null : p >= 0.8 ? '#16e05a' : p < 0.2 ? '#ff2b3a' : null;
  const width = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <div className="flex flex-col items-end gap-1">
      <span className="text-[14px] leading-5 text-slate-100 tabular-nums">{text}</span>
      <span className="block h-[3px] w-[52px] overflow-hidden rounded-sm bg-shell-track">
        <span className="block h-full rounded-sm"
          style={{ width: `${width}%`, background: colour || '#56627a', ...(faded && colour ? { filter: 'saturate(.45)', opacity: 0.62 } : null) }} />
      </span>
    </div>
  );
}

/** How many rows a long list shows before "Show more", and how many each press adds. */
export const PAGE = 25;

/**
 * A long list's foot: shows the next PAGE rows. It is the panel's last row,
 * so it takes the panel's bottom corners.
 */
export function ShowMore({ left, onClick }) {
  if (left <= 0) return null;
  return (
    <button type="button" onClick={onClick}
      className="block w-full cursor-pointer rounded-b-[10px] border-0 border-t border-solid border-gray-700 bg-transparent p-3 text-[14px] leading-[1.45] font-semibold text-orange-400 hover:bg-orange-500/[.06]">
      Show more ({left})
    </button>
  );
}

/** A list's search box, for a page's control row. Escape or the cross clears it. */
export function SearchBox({ value, onChange, placeholder = 'Search', className = '' }) {
  return (
    <div className={`relative flex items-center ${className}`}>
      <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder}
        onKeyDown={e => { if (e.key === 'Escape') onChange(''); }}
        className="h-8 w-full rounded-[8px] border border-solid border-gray-700 bg-gray-900 pl-8 pr-7 text-[13px] leading-[1.45] text-white outline-none placeholder:text-slate-500 focus:border-brand/[.55]" />
      {value && (
        <button type="button" onClick={() => onChange('')} aria-label="Clear the search"
          className="absolute right-1.5 inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded border-0 bg-transparent p-0 text-slate-400 hover:text-white">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
