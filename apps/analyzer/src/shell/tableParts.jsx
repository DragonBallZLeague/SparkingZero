import React from 'react';

/**
 * Pieces every list table shares (Characters, Meta Builds): the header type and
 * a sortable header cell, as the shell demo drew them.
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
