import React, { useEffect, useMemo, useState } from 'react';
import { Filter, ChevronDown, ChevronUp, X } from 'lucide-react';

// Tag dimension config — order, label, color theming
const TAG_DIMS = [
  { key: 'season',    label: 'Season',     dark: { pill: 'bg-violet-900/50 text-violet-300 border-violet-700', on: 'bg-violet-600 text-white border-violet-500' }, light: { pill: 'bg-violet-50 text-violet-600 border-violet-200', on: 'bg-violet-500 text-white border-violet-400' } },
  { key: 'team',      label: 'Team',       dark: { pill: 'bg-blue-900/50 text-blue-300 border-blue-700',     on: 'bg-blue-600 text-white border-blue-500' },   light: { pill: 'bg-blue-50 text-blue-600 border-blue-200',   on: 'bg-blue-500 text-white border-blue-400' } },
  { key: 'matchType', label: 'Type',       dark: { pill: 'bg-amber-900/50 text-amber-300 border-amber-700',   on: 'bg-amber-600 text-white border-amber-500' },  light: { pill: 'bg-amber-50 text-amber-600 border-amber-200', on: 'bg-amber-500 text-white border-amber-400' } },
  { key: 'difficulty', label: 'Difficulty', dark: { pill: 'bg-red-900/50 text-red-300 border-red-700',         on: 'bg-red-600 text-white border-red-500' },      light: { pill: 'bg-red-50 text-red-600 border-red-200',     on: 'bg-red-500 text-white border-red-400' } },
  { key: 'matchSize', label: 'Size',       dark: { pill: 'bg-emerald-900/50 text-emerald-300 border-emerald-700', on: 'bg-emerald-600 text-white border-emerald-500' }, light: { pill: 'bg-emerald-50 text-emerald-600 border-emerald-200', on: 'bg-emerald-500 text-white border-emerald-400' } },
];

export default function TagFilterSelector({ onSelect, darkMode = true }) {
  const [tagsIndex, setTagsIndex] = useState(null);
  const [activeFilters, setActiveFilters] = useState({});
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const base = import.meta.env?.BASE_URL || '';
    fetch(`${base}br-data-tags.json`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setTagsIndex(data); })
      .catch(() => {});
  }, []);

  // Collect unique values per dimension
  const availableValues = useMemo(() => {
    if (!tagsIndex) return {};
    const sets = {};
    TAG_DIMS.forEach(d => { sets[d.key] = new Set(); });
    Object.values(tagsIndex).forEach(tags => {
      if (!tags) return;
      TAG_DIMS.forEach(d => {
        const val = tags[d.key];
        if (Array.isArray(val)) {
          val.forEach(v => { if (v) sets[d.key].add(v); });
        } else if (val) {
          sets[d.key].add(val);
        }
      });
    });
    const out = {};
    TAG_DIMS.forEach(d => {
      out[d.key] = [...sets[d.key]].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
      );
    });
    return out;
  }, [tagsIndex]);

  // Filter files by active tags (AND across dims, OR within a dim)
  // For array-valued tags (e.g. team), a file matches if ANY of its values is in the selected set
  const matchingFiles = useMemo(() => {
    if (!tagsIndex) return [];
    const active = Object.entries(activeFilters).filter(([, s]) => s.size > 0);
    return Object.entries(tagsIndex)
      .filter(([, tags]) => {
        if (active.length === 0) return true;
        if (!tags) return false;
        return active.every(([dim, vals]) => {
          const tagVal = tags[dim];
          if (Array.isArray(tagVal)) {
            return tagVal.some(v => vals.has(v));
          }
          return vals.has(tagVal);
        });
      })
      .map(([p]) => p);
  }, [tagsIndex, activeFilters]);

  const hasActiveFilters = Object.values(activeFilters).some(s => s.size > 0);

  useEffect(() => {
    if (tagsIndex) onSelect?.(hasActiveFilters ? matchingFiles : null);
  }, [matchingFiles, tagsIndex, hasActiveFilters]);

  const toggle = (dim, val) => {
    setActiveFilters(prev => {
      const s = new Set(prev[dim] || []);
      s.has(val) ? s.delete(val) : s.add(val);
      return { ...prev, [dim]: s };
    });
  };

  const clearAll = () => setActiveFilters({});

  const hasFilters = hasActiveFilters;
  const totalFiles = tagsIndex ? Object.keys(tagsIndex).length : 0;

  if (!tagsIndex) return null;

  const dm = darkMode;

  return (
    <div className={`rounded-xl overflow-hidden ${dm ? 'bg-gray-800/60 border border-gray-700' : 'bg-white border border-gray-200'}`}>
      {/* Compact Header */}
      <div
        className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer select-none ${dm ? 'hover:bg-gray-700/40' : 'hover:bg-gray-50'}`}
        onClick={() => setExpanded(e => !e)}
      >
        <Filter className={`w-4 h-4 shrink-0 ${dm ? 'text-gray-400' : 'text-gray-500'}`} />
        <span className={`text-sm font-semibold ${dm ? 'text-gray-200' : 'text-gray-700'}`}>
          Tag Filters
        </span>

        {/* File count badge */}
        <span className={`text-xs tabular-nums ${dm ? 'text-gray-500' : 'text-gray-400'}`}>
          {hasFilters
            ? <>{matchingFiles.length}<span className="opacity-60">/{totalFiles}</span> files</>
            : <>{totalFiles} files</>
          }
        </span>

        {/* Active filter summary pills (always visible) */}
        {hasFilters && (
          <div className="flex items-center gap-1 ml-auto mr-2 overflow-hidden">
            {TAG_DIMS.map(dim => {
              const active = activeFilters[dim.key];
              if (!active || active.size === 0) return null;
              const colors = dm ? dim.dark : dim.light;
              return [...active].map(v => (
                <span key={`${dim.key}-${v}`} className={`shrink-0 inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-bold border ${colors.on}`}>
                  {v}
                  <X
                    className="w-2.5 h-2.5 cursor-pointer opacity-70 hover:opacity-100"
                    onClick={e => { e.stopPropagation(); toggle(dim.key, v); }}
                  />
                </span>
              ));
            })}
            <button
              onClick={e => { e.stopPropagation(); clearAll(); }}
              className={`shrink-0 ml-1 text-[10px] font-semibold px-2 py-0.5 rounded border transition-colors ${dm ? 'text-red-300 border-red-700 bg-red-900/40 hover:bg-red-800/50 hover:text-red-200' : 'text-red-600 border-red-300 bg-red-50 hover:bg-red-100'}`}
            >
              Clear
            </button>
          </div>
        )}

        <div className={`ml-auto shrink-0 ${hasFilters ? 'ml-0' : ''}`}>
          {expanded
            ? <ChevronUp className={`w-3.5 h-3.5 ${dm ? 'text-gray-500' : 'text-gray-400'}`} />
            : <ChevronDown className={`w-3.5 h-3.5 ${dm ? 'text-gray-500' : 'text-gray-400'}`} />
          }
        </div>
      </div>

      {/* Filter Grid */}
      {expanded && (
        <div className={`px-4 pb-3 pt-1 ${dm ? 'border-t border-gray-700/60' : 'border-t border-gray-100'}`}>
          <div className="grid gap-2" style={{ gridTemplateColumns: 'auto 1fr' }}>
            {TAG_DIMS.map(dim => {
              const values = availableValues[dim.key] || [];
              if (values.length === 0) return null;
              const active = activeFilters[dim.key] || new Set();
              const colors = dm ? dim.dark : dim.light;
              return (
                <React.Fragment key={dim.key}>
                  {/* Row label */}
                  <span className={`text-[11px] font-semibold uppercase tracking-wider pt-1 ${dm ? 'text-gray-500' : 'text-gray-400'}`}>
                    {dim.label}
                  </span>
                  {/* Pill row */}
                  <div className="flex flex-wrap gap-1">
                    {values.map(v => {
                      const isOn = active.has(v);
                      return (
                        <button
                          key={v}
                          onClick={() => toggle(dim.key, v)}
                          className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs font-semibold border transition-all duration-100 ${
                            isOn ? colors.on : colors.pill
                          } ${isOn ? 'shadow-sm' : 'opacity-80 hover:opacity-100'}`}
                        >
                          {v}
                          {isOn && <X className="w-2.5 h-2.5 ml-0.5" />}
                        </button>
                      );
                    })}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
