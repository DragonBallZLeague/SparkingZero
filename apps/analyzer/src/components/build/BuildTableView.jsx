import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFloating, autoUpdate, offset, flip } from '@floating-ui/react';
import { ArrowUpDown, ChevronDown, ChevronUp, Filter, Star, X } from 'lucide-react';
import { getBuildTypeColor } from '../../utils/buildComposition.js';
import { BuildTypeTooltipWrapper } from './BuildTypeTooltipWrapper.jsx';
import { PerformanceScoreBadge } from '../stats/PerformanceScoreBadge.jsx';
import { buildKeyOf } from '../../utils/buildKey.js';

// Sortable build table + detail card for a character's full build history
export function BuildTableView({
  builds,          // full sorted builds array
  buildKey,        // unique key per character (char.name or charKey)
  selectedBuildIndex,
  setSelectedBuildIndex,
  selectedBuildSort,
  setSelectedBuildSort,
  primaryTeam,     // optional — shown in detail panel footer
  activeBuildFilters,      // track active build filter per character
  setActiveBuildFilters,   // setter for active build filter
  darkMode,
}) {
  if (!builds || builds.length === 0) return null;

  const [panelOpen, setPanelOpen] = useState(false);
  const tableRef = useRef(null);

  const { refs, floatingStyles } = useFloating({
    placement: 'left',
    middleware: [offset(8), flip()],
    whileElementsMounted: autoUpdate,
  });

  // Sort state for this character's table: { col, dir }
  const sortState = selectedBuildSort[buildKey] || { col: 'activeCount', dir: 'desc' };
  const selectedIndex = selectedBuildIndex[buildKey] ?? 0;

  // Build filter helpers
  const getBuildFilterKey = buildKeyOf;
  const characterActiveFilter = activeBuildFilters ? activeBuildFilters[buildKey] : null;

  // Close on outside click or Escape
  useEffect(() => {
    if (!panelOpen) return;
    const handleMouseDown = (e) => {
      const inPanel = refs.floating.current?.contains(e.target);
      const inTable = tableRef.current?.contains(e.target);
      if (!inPanel && !inTable) setPanelOpen(false);
    };
    const handleKey = (e) => { if (e.key === 'Escape') setPanelOpen(false); };
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, [panelOpen, refs]);

  // Close panel when the buildKey changes (different character expanded)
  useEffect(() => { setPanelOpen(false); }, [buildKey]);

  const handleSort = (col) => {
    const next = sortState.col === col
      ? { col, dir: sortState.dir === 'desc' ? 'asc' : 'desc' }
      : { col, dir: 'desc' };
    setSelectedBuildSort(prev => ({ ...prev, [buildKey]: next }));
  };

  // Apply table sort (independent of the aggregation sort)
  const sortedForTable = [...builds].sort((a, b) => {
    let av, bv;
    switch (sortState.col) {
      case 'activeCount': av = a.activeCount; bv = b.activeCount; break;
      case 'avgDamage':
        av = a.activeCount > 0 ? a.totalDamageDealt / a.activeCount : 0;
        bv = b.activeCount > 0 ? b.totalDamageDealt / b.activeCount : 0;
        break;
      case 'efficiency':
        av = a.totalDamageTaken > 0 ? a.totalDamageDealt / a.totalDamageTaken : a.totalDamageDealt;
        bv = b.totalDamageTaken > 0 ? b.totalDamageDealt / b.totalDamageTaken : b.totalDamageDealt;
        break;
      case 'score': av = a.avgPerformanceScore; bv = b.avgPerformanceScore; break;
      default: av = a.activeCount; bv = b.activeCount;
    }
    return sortState.dir === 'desc' ? bv - av : av - bv;
  });

  const currentBuild = sortedForTable[selectedIndex] || sortedForTable[0];
  const bestScoreIdx = sortedForTable.reduce((best, b, i) =>
    b.avgPerformanceScore > sortedForTable[best].avgPerformanceScore ? i : best, 0);
  // Find the build that is currently applied as a filter (for the clear pill)
  const activeFilterBuild = characterActiveFilter
    ? sortedForTable.find(b => getBuildFilterKey(b) === characterActiveFilter) || null
    : null;

  const handleRowClick = (e, i) => {
    e.stopPropagation();
    if (selectedIndex === i && panelOpen) {
      setPanelOpen(false);
    } else {
      setSelectedBuildIndex(prev => ({ ...prev, [buildKey]: i }));
      setPanelOpen(true);
    }
  };

  const SortIcon = ({ col }) => {
    if (sortState.col !== col) return <ArrowUpDown className="w-3 h-3 opacity-40 inline ml-0.5" />;
    return sortState.dir === 'desc'
      ? <ChevronDown className="w-3 h-3 inline ml-0.5" />
      : <ChevronUp className="w-3 h-3 inline ml-0.5" />;
  };

  const thClass = `text-center text-xs font-semibold cursor-pointer select-none whitespace-nowrap px-1.5 py-1 uppercase tracking-wide transition-colors ${darkMode ? 'text-gray-400 hover:text-indigo-300' : 'text-gray-500 hover:text-indigo-600'}`;
  const thLeftClass = `text-left text-xs font-semibold px-1.5 py-1 uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`;

  // Each row is ~28px; show 8 rows + header before scrolling
  const ROW_HEIGHT = 28;
  const MAX_VISIBLE_ROWS = 8;
  const tbodyMaxHeight = ROW_HEIGHT * MAX_VISIBLE_ROWS;

  return (
    <div ref={tableRef}>
      {/* Active build filter clear pill — shown above the table when a filter is active */}
      {characterActiveFilter && activeFilterBuild && (
        <div className={`flex items-center justify-between gap-2 px-3 py-2.5 mb-2 rounded-lg text-xs font-medium border ${
          darkMode ? 'bg-amber-950/40 border-amber-700 text-amber-300' : 'bg-amber-50 border-amber-300 text-amber-800'
        }`}>
          <div className="flex items-center gap-1.5 min-w-0">
            <Filter className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">
              <span className="font-semibold">{activeFilterBuild.buildComposition?.label || '—'}</span>
              {activeFilterBuild.aiStrategy && (
                <span className={darkMode ? 'text-amber-400' : 'text-amber-600'}> · {activeFilterBuild.aiStrategy}</span>
              )}
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveBuildFilters(prev => {
                const next = { ...prev };
                delete next[buildKey];
                return next;
              });
            }}
            className={`flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded text-xs font-bold transition-colors bg-transparent ${
              darkMode ? 'hover:bg-amber-800 text-amber-300 hover:text-white' : 'hover:bg-amber-200 text-amber-700 hover:text-amber-900'
            }`}
            title="Clear build filter"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        </div>
      )}
      <div className={`rounded-lg overflow-hidden border ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
        {/* Fixed header */}
        <table className="w-full text-xs table-fixed">
          <colgroup>
            <col style={{ width: '2rem' }} />
            <col style={{ width: '10rem' }} />
            <col />
            <col style={{ width: '3.5rem' }} />
            <col style={{ width: '4rem' }} />
          </colgroup>
          <thead>
            <tr className={`${darkMode ? 'bg-gray-900/80 border-b border-gray-700' : 'bg-gray-100 border-b border-gray-300'}`}>
              <th className={thLeftClass} style={{ paddingLeft: '0.75rem' }}>#</th>
              <th className={thLeftClass}>Build Type</th>
              <th className={thLeftClass}>AI Strategy</th>
              <th className={thClass} onClick={() => handleSort('activeCount')}>Uses <SortIcon col="activeCount" /></th>
              <th className={thClass} style={{ paddingRight: '0.75rem' }} onClick={() => handleSort('score')}>Score <SortIcon col="score" /></th>
            </tr>
          </thead>
        </table>
        {/* Scrollable body */}
        <div style={{ maxHeight: `${tbodyMaxHeight}px`, overflowY: 'auto' }} className={`${darkMode ? 'scrollbar-dark bg-gray-800' : 'bg-white'}`}>
          <table className="w-full text-xs table-fixed">
            <colgroup>
              <col style={{ width: '2rem' }} />
              <col style={{ width: '10rem' }} />
              <col />
              <col style={{ width: '3.5rem' }} />
              <col style={{ width: '3.5rem' }} />
            </colgroup>
            <tbody className={`divide-y ${darkMode ? 'divide-gray-600' : 'divide-gray-200'}`}>
              {sortedForTable.map((build, i) => {
                const isSelected = i === selectedIndex && panelOpen;
                const isBestScore = i === bestScoreIdx;
                const isActiveFilter = getBuildFilterKey(build) === characterActiveFilter;
                const rowBase = isSelected
                  ? darkMode ? 'bg-indigo-950 border-l-2 border-indigo-400' : 'bg-indigo-100 border-l-2 border-indigo-500'
                  : isActiveFilter
                    ? darkMode ? 'bg-amber-950/40 border-l-2 border-amber-500' : 'bg-amber-50 border-l-2 border-amber-500'
                    : darkMode ? 'hover:bg-gray-700/60 border-l-2 border-transparent' : 'hover:bg-gray-50 border-l-2 border-transparent';
                return (
                  <tr
                    key={i}
                    ref={i === selectedIndex ? refs.setReference : null}
                    className={`cursor-pointer transition-colors ${rowBase}`}
                    onClick={(e) => handleRowClick(e, i)}
                  >
                    <td className={`px-1.5 py-1 font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} style={{ paddingLeft: '0.75rem' }}>
                      {isBestScore
                        ? <Star className="w-3 h-3 inline text-yellow-400" title="Best performance score" />
                        : i + 1}
                    </td>
                    <td className="px-1.5 py-1">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium border whitespace-nowrap ${getBuildTypeColor(build.buildComposition, darkMode)}`}>
                        {build.buildComposition?.label || '—'}
                      </span>
                    </td>
                    <td className={`px-1.5 py-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {build.aiStrategy || 'Default'}
                    </td>
                    <td className={`px-1.5 py-1 text-left font-medium ${darkMode ? 'text-indigo-300' : 'text-indigo-700'}`}>
                      {build.activeCount}
                    </td>
                    <td className={`px-1.5 py-1 text-left font-semibold ${darkMode ? 'text-yellow-300' : 'text-yellow-700'}`} style={{ paddingRight: '0.75rem' }}>
                      {Math.round(build.avgPerformanceScore)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating detail panel — portal so it escapes card overflow clipping */}
      {panelOpen && currentBuild && typeof document !== 'undefined' && createPortal(
        <div
          ref={refs.setFloating}
          style={{ ...floatingStyles, zIndex: 9999, width: '26rem' }}
          className={`rounded-lg shadow-2xl border ${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'}`}
        >
          {/* Panel header */}
          <div className={`flex items-center justify-between px-3 py-2 rounded-t-lg border-b ${darkMode ? 'bg-gray-900/60 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
            <span className={`text-xs font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Build {selectedIndex + 1} of {sortedForTable.length}
            </span>
            <div className="flex items-center gap-2">
              <PerformanceScoreBadge
                score={currentBuild.avgPerformanceScore || 0}
                label="Score"
                size="small"
                darkMode={darkMode}
              />
              <button
                onClick={(e) => { e.stopPropagation(); setPanelOpen(false); }}
                className={`w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold transition-colors ${darkMode ? 'bg-gray-700 hover:bg-red-700 text-gray-300 hover:text-white' : 'bg-gray-200 hover:bg-red-500 text-gray-600 hover:text-white'}`}
                title="Close"
              >
                ×
              </button>
            </div>
          </div>
          <div className="p-3">
            <BuildTypeTooltipWrapper
              buildComposition={currentBuild.buildComposition}
              aiStrategy={currentBuild.aiStrategy}
              count={currentBuild.activeCount}
              equippedCapsules={currentBuild.equippedCapsules}
              totalCapsuleCost={currentBuild.totalCapsuleCost}
              darkMode={darkMode}
              tooltipKey={`${buildKey}-floating-panel-${selectedIndex}`}
              characterName={buildKey}
            />
            {primaryTeam && (
              <div className={`flex items-center justify-between font-semibold text-sm mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <span className={`font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Main Team:</span>
                <span className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{primaryTeam}</span>
              </div>
            )}
            {/* Apply / Remove build filter button */}
            {setActiveBuildFilters && currentBuild && (() => {
              const fKey = getBuildFilterKey(currentBuild);
              const isCurrentFilter = characterActiveFilter === fKey;
              return (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveBuildFilters(prev => {
                      if (isCurrentFilter) {
                        const next = { ...prev };
                        delete next[buildKey];
                        return next;
                      }
                      return { ...prev, [buildKey]: fKey };
                    });
                    setPanelOpen(false);
                  }}
                  className={`mt-2 w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                    isCurrentFilter
                      ? darkMode
                        ? 'bg-amber-800/60 hover:bg-red-800/60 text-amber-200 border border-amber-600'
                        : 'bg-amber-100 hover:bg-red-100 text-amber-800 border border-amber-400'
                      : darkMode
                        ? 'bg-indigo-800/60 hover:bg-indigo-700/60 text-indigo-200 border border-indigo-600'
                        : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-300'
                  }`}
                >
                  {isCurrentFilter
                    ? <><X className="w-3 h-3" /> Remove Build Filter</>
                    : <><Filter className="w-3 h-3" /> Apply as Filter</>}
                </button>
              );
            })()}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
