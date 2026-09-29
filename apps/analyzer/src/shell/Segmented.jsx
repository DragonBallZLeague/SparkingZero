import React from 'react';

/**
 * A small segmented switch between a page's views (Table / Tier list, Best per
 * character / All builds). The pressed segment is raised, not orange: orange
 * marks the active section tab and set filters.
 */
export default function Segmented({ options, value, onChange, label }) {
  return (
    <div role="group" aria-label={label}
      className="inline-flex flex-none rounded-[9px] border border-solid border-gray-700 bg-gray-800 p-[3px]">
      {options.map(o => {
        const on = o.value === value;
        return (
          <button key={o.value} type="button" aria-pressed={on} onClick={() => onChange(o.value)}
            className={`rounded-md border-0 px-3 py-1 text-[13px] leading-[19px] font-semibold whitespace-nowrap cursor-pointer ${
              on ? 'bg-gray-700 text-white' : 'bg-transparent text-slate-400 hover:text-slate-200'}`}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
