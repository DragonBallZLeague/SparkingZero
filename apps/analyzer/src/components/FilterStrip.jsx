import React from 'react';
import { Filter, X } from 'lucide-react';

/**
 * "Showing one ...": the strip that says a section is filtered, with the way
 * back. The Character page shows it for one build ("Showing one build") and
 * the Match page's character detail for one form ("Showing one form"). A
 * filtered view must never pass for the whole picture, so it is loud: the
 * accent orange, above what it filters.
 */
export default function FilterStrip({ label, clearLabel, onClear, children, className = '' }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[8px] border border-solid border-brand/[.55] bg-brand/[.12] px-3 py-2 text-sm text-slate-200 ${className}`}>
      <Filter className="h-4 w-4 shrink-0 text-orange-400" />
      <span className="font-semibold">{label}</span>
      {children}
      <button type="button" onClick={onClear}
        className="ml-auto inline-flex cursor-pointer items-center gap-1 rounded-md border-0 bg-transparent px-2 py-1 text-xs font-semibold text-orange-300 hover:bg-orange-500/20">
        <X className="h-3.5 w-3.5" />
        {clearLabel}
      </button>
    </div>
  );
}
