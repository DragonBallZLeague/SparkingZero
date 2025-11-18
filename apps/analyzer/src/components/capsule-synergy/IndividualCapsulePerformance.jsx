/**
 * Individual Capsule Performance Table
 * Part of Capsule Performance Analysis
 * 
 * Displays performance metrics for each capsule:
 * - Usage statistics
 * - Performance scores (damage, efficiency, survival)
 * - Build type classification
 * - AI strategy compatibility
 * 
 * Created: November 5, 2025
 * Updated: November 6, 2025 - Switched to build type system
 * Updated: November 6, 2025 - Added scrollable table and tooltips
 * Updated: November 7, 2025 - Migrated to floating-ui for tooltips
 */

import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/react';
import * as XLSX from 'xlsx';
import { Info } from 'lucide-react';

export default function IndividualCapsulePerformance({ performanceData, capsuleMap, aiCompatibilityData }) {
  const [sortBy, setSortBy] = useState('compositeScore');
  const [sortDir, setSortDir] = useState('desc');
  const [filterBuildType, setFilterBuildType] = useState('all');
  const [filterAIStrategy, setFilterAIStrategy] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [hoveredCapsule, setHoveredCapsule] = useState(null);
  const [hoveredUsesData, setHoveredUsesData] = useState(null);

  // Use floating-ui for capsule name tooltip positioning
  const { x, y, strategy, refs, floatingStyles } = useFloating({
    placement: 'right-start',
    middleware: [offset(20), flip(), shift({ padding: 10 })],
    whileElementsMounted: autoUpdate,
  });

  // Use floating-ui for uses tooltip positioning
  const { 
    x: usesX, 
    y: usesY, 
    strategy: usesStrategy, 
    refs: usesRefs, 
    floatingStyles: usesFloatingStyles 
  } = useFloating({
    placement: 'right-start',
    middleware: [offset(10), flip(), shift({ padding: 10 })],
    whileElementsMounted: autoUpdate,
  });

  // Process and sort data
  const tableData = useMemo(() => {
    if (!performanceData) return [];

    let data = Object.entries(performanceData).map(([capsuleId, metrics]) => {
      const capsule = capsuleMap[capsuleId];
      return {
        id: capsuleId,
        name: capsule?.name || 'Unknown',
        buildType: capsule?.buildType || 'Unknown',
        cost: capsule?.cost || 0,
        ...metrics
      };
    });

    // Apply filters
    if (filterBuildType !== 'all') {
      data = data.filter(item => item.buildType === filterBuildType);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      data = data.filter(item => item.name.toLowerCase().includes(term));
    }

    // Apply AI strategy filter with compatibility data
    if (filterAIStrategy !== 'all' && aiCompatibilityData && aiCompatibilityData[filterAIStrategy]) {
      data = data.map(item => {
        const aiData = aiCompatibilityData[filterAIStrategy][item.id];
        return {
          ...item,
          aiCompatScore: aiData?.compositeScore || 0,
          aiAppearances: aiData?.appearances || 0
        };
      }).filter(item => item.aiAppearances > 0);
    }

    // Sort
    data.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      
      if (aVal === undefined) aVal = 0;
      if (bVal === undefined) bVal = 0;
      
      if (sortDir === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return data;
  }, [performanceData, capsuleMap, sortBy, sortDir, filterBuildType, filterAIStrategy, searchTerm, aiCompatibilityData]);

  // Handle sort
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDir('desc');
    }
  };

  // Export to Excel
  const exportToExcel = () => {
    const exportData = tableData.map(row => ({
      'Capsule': row.name,
      'Build Type': row.buildType,
      'Cost': row.cost,
      'Appearances': row.appearances,
      'Win Rate': `${(row.winRate || 0).toFixed(1)}%`,
      'Composite Score': (row.compositeScore || 0).toFixed(2),
      'Avg Damage Dealt': (row.avgDamageDealt || 0).toFixed(0),
      'Avg Damage Taken': (row.avgDamageTaken || 0).toFixed(0),
      'Avg Battle Time': `${(row.avgBattleTime || 0).toFixed(1)}s`,
      'Damage Efficiency': (row.damageEfficiency || 0).toFixed(2)
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Capsule Performance');
    XLSX.writeFile(wb, 'capsule_performance.xlsx');
  };

  // Get unique build types for filter
  const buildTypes = useMemo(() => {
    if (!capsuleMap) return [];
    const types = new Set(Object.values(capsuleMap).map(c => c.buildType).filter(Boolean));
    return Array.from(types).sort();
  }, [capsuleMap]);

  // Get AI strategies for filter
  const aiStrategies = useMemo(() => {
    if (!aiCompatibilityData) return [];
    return Object.keys(aiCompatibilityData).sort();
  }, [aiCompatibilityData]);

  // Handle tooltip display
  const handleMouseEnter = (capsule, event) => {
    if (!capsule) return;
    // Set the reference element to the current target
    refs.setReference(event.currentTarget);
    setHoveredCapsule(capsule);
  };

  const handleMouseLeave = () => {
    setHoveredCapsule(null);
  };

  // Handle uses tooltip display
  const handleUsesMouseEnter = (characterMatchCounts, event) => {
    if (!characterMatchCounts) return;
    usesRefs.setReference(event.currentTarget);
    setHoveredUsesData(characterMatchCounts);
  };

  const handleUsesMouseLeave = () => {
    setHoveredUsesData(null);
  };

  if (!performanceData || Object.keys(performanceData).length === 0) {
    return (
      <div className="text-center text-gray-400 py-12">
        No capsule performance data available.
      </div>
    );
  }

  return (
    <div className="individual-capsule-performance">
      {/* Header Section - Fixed */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-5 h-5 text-blue-400" />
          <p className="text-sm text-gray-400">
            Hover over capsule names for effect details. Hover over usage count to see which characters used each capsule. Click column headers to sort.
          </p>
        </div>

        {/* Controls */}
        <div className="mb-4 flex flex-wrap gap-4 items-center">
        {/* Search */}
        <input
          type="text"
          placeholder="Search capsules..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />

        {/* Build Type Filter */}
        <select
          value={filterBuildType}
          onChange={(e) => setFilterBuildType(e.target.value)}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded text-gray-200 focus:outline-none focus:border-blue-500"
        >
          <option value="all">All Build Types</option>
          {buildTypes.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>

        {/* AI Strategy Filter */}
        {aiStrategies.length > 0 && (
          <select
            value={filterAIStrategy}
            onChange={(e) => setFilterAIStrategy(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded text-gray-200 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All AI Strategies</option>
            {aiStrategies.map(strat => (
              <option key={strat} value={strat}>{strat}</option>
            ))}
          </select>
        )}

        {/* Export Button */}
        <button
          onClick={exportToExcel}
          className="ml-auto px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export to Excel
        </button>
      </div>

      {/* Results Count */}
      <div className="mb-3 flex justify-between items-center">
        <span className="text-gray-400 text-sm">
          Showing <span className="text-white font-semibold">{tableData.length}</span> capsule{tableData.length !== 1 ? 's' : ''}
        </span>
        <span className="text-gray-500 text-xs">
          Sorted by: <span className="text-gray-300">{sortBy}</span> ({sortDir === 'desc' ? '↓' : '↑'})
        </span>
      </div>
      </div>

      {/* Scrollable Table Container */}
      <div className="border border-gray-700 rounded-lg bg-gray-900/50 backdrop-blur-sm" style={{ maxHeight: '600px', overflow: 'auto' }}>
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-[5]">
            <tr className="bg-gray-800 text-gray-300 shadow-lg">
              <SortableHeader label="Capsule" column="name" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
              <SortableHeader label="Build Type" column="buildType" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
              <SortableHeader label="Cost" column="cost" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
              <SortableHeader label="Uses" column="appearances" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
              <SortableHeader label="Win %" column="winRate" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
              <SortableHeader label="Score" column="compositeScore" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
              <SortableHeader label="Avg Damage" column="avgDamageDealt" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
              <SortableHeader label="Avg Taken" column="avgDamageTaken" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
              <SortableHeader label="Efficiency" column="damageEfficiency" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
              {filterAIStrategy !== 'all' && (
                <SortableHeader label="AI Compat" column="aiCompatScore" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
              )}
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, idx) => {
              const capsuleData = capsuleMap[row.id];
              return (
                <tr
                  key={row.id}
                  className={`border-b border-gray-700 hover:bg-gray-800/70 transition-colors ${
                    idx % 2 === 0 ? 'bg-gray-900/30' : 'bg-gray-900/10'
                  }`}
                >
                  <td className="px-4 py-3 text-gray-200 relative">
                    <span 
                      className="font-medium cursor-help"
                      onMouseEnter={(e) => handleMouseEnter(capsuleData, e)}
                      onMouseLeave={handleMouseLeave}
                    >
                      {row.name}
                    </span>
                  </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${getBuildTypeBadgeClass(row.buildType)}`}>
                    {row.buildType}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-800 text-gray-200 font-semibold text-sm">
                    {row.cost}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span 
                    className="text-gray-300 font-medium cursor-help hover:text-blue-400 transition-colors"
                    onMouseEnter={(e) => handleUsesMouseEnter(row.characterMatchCounts, e)}
                    onMouseLeave={handleUsesMouseLeave}
                  >
                    {row.appearances}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getWinRateDot(row.winRate)}`}></div>
                    <span className={`font-semibold ${getWinRateClass(row.winRate)}`}>
                      {(row.winRate || 0).toFixed(1)}%
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex flex-col items-center">
                    <span className={`font-bold text-lg ${getScoreClass(row.compositeScore)}`}>
                      {(row.compositeScore || 0).toFixed(1)}
                    </span>
                    <div className="w-16 h-1 bg-gray-700 rounded-full mt-1 overflow-hidden">
                      <div 
                        className={`h-full ${getScoreBg(row.compositeScore)}`}
                        style={{ width: `${Math.min((row.compositeScore || 0), 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-green-400 font-medium">
                    {Math.round(row.avgDamageDealt || 0).toLocaleString()}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-red-400 font-medium">
                    {Math.round(row.avgDamageTaken || 0).toLocaleString()}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`font-semibold ${getEfficiencyClass(row.damageEfficiency)}`}>
                    {(row.damageEfficiency || 0).toFixed(2)}x
                  </span>
                </td>
                {filterAIStrategy !== 'all' && (
                  <td className="px-4 py-3 text-center">
                    <span className={`font-semibold ${getScoreClass(row.aiCompatScore)}`}>
                      {(row.aiCompatScore || 0).toFixed(1)}
                    </span>
                  </td>
                )}
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>

      {/* Capsule Name Tooltip */}
      {hoveredCapsule && typeof document !== 'undefined' && createPortal(
        <div
          ref={refs.setFloating}
          style={{ ...floatingStyles, width: '32rem', maxWidth: '32rem' }}
          className="z-[9999] bg-gray-800 border border-gray-600 rounded-lg shadow-2xl p-4"
        >
          <div className="mb-3 pb-3 border-b border-gray-700">
            <h4 className="font-bold text-white text-lg">{hoveredCapsule.name}</h4>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-1 rounded text-xs font-semibold ${getBuildTypeBadgeClass(hoveredCapsule.buildType)}`}>
                {hoveredCapsule.buildType}
              </span>
              <span className="text-sm text-gray-400">Cost: {hoveredCapsule.cost}</span>
              {hoveredCapsule.exclusiveTo && (
                <span className="text-xs text-purple-400">({hoveredCapsule.exclusiveTo})</span>
              )}
            </div>
          </div>
          <div className="text-sm text-gray-300 leading-relaxed">
            {(hoveredCapsule.effect || 'No effect description available')
              .split(/\\r\\n|\\n|\r\n|\n/)
              .map((line, idx) => (
                <div key={idx}>{line}</div>
              ))
            }
          </div>
        </div>,
        document.body
      )}

      {/* Uses Tooltip - Character Match Counts */}
      {hoveredUsesData && typeof document !== 'undefined' && createPortal(
        <div
          ref={usesRefs.setFloating}
          style={{ ...usesFloatingStyles, minWidth: '20rem' }}
          className="z-[9999] bg-gray-800 border border-gray-600 rounded-lg shadow-2xl p-4"
        >
          <h4 className="font-bold text-white text-base mb-3 border-b border-gray-700 pb-2">
            Character Usage
          </h4>
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {Object.entries(hoveredUsesData)
              .sort((a, b) => b[1] - a[1]) // Sort by match count descending
              .map(([character, count]) => (
                <div key={character} className="flex justify-between items-center py-1 px-2 hover:bg-gray-700/50 rounded">
                  <span className="text-gray-300 text-sm">{character}</span>
                  <span className="text-blue-400 font-semibold text-sm ml-4">
                    {count} {count === 1 ? 'match' : 'matches'}
                  </span>
                </div>
              ))
            }
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// Sortable header component
function SortableHeader({ label, column, sortBy, sortDir, onSort }) {
  const isActive = sortBy === column;
  return (
    <th
      onClick={() => onSort(column)}
      className="px-4 py-3 text-left cursor-pointer hover:bg-gray-700 transition-colors select-none group"
    >
      <div className="flex items-center gap-2">
        <span className={`font-semibold ${isActive ? 'text-blue-400' : 'text-gray-300'}`}>
          {label}
        </span>
        <span className={`text-sm ${isActive ? 'text-blue-400' : 'text-gray-500 opacity-0 group-hover:opacity-100'} transition-opacity`}>
          {isActive ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </div>
    </th>
  );
}

// Helper functions for styling
function getBuildTypeBadgeClass(buildType) {
  switch (buildType) {
    case 'Melee':
      return 'bg-red-900/70 text-red-300 border border-red-700/50';
    case 'Blast':
      return 'bg-orange-900/70 text-orange-300 border border-orange-700/50';
    case 'Ki Blast':
      return 'bg-yellow-900/70 text-yellow-300 border border-yellow-700/50';
    case 'Defense':
      return 'bg-blue-900/70 text-blue-300 border border-blue-700/50';
    case 'Skill':
      return 'bg-purple-900/70 text-purple-300 border border-purple-700/50';
    case 'Ki Efficiency':
      return 'bg-green-900/70 text-green-300 border border-green-700/50';
    case 'Utility':
      return 'bg-gray-700/70 text-gray-300 border border-gray-600/50';
    default:
      return 'bg-gray-800 text-gray-400';
  }
}

function getWinRateClass(winRate) {
  if (winRate >= 60) return 'text-green-400';
  if (winRate >= 50) return 'text-blue-400';
  if (winRate >= 40) return 'text-yellow-400';
  return 'text-red-400';
}

function getWinRateDot(winRate) {
  if (winRate >= 60) return 'bg-green-400';
  if (winRate >= 50) return 'bg-blue-400';
  if (winRate >= 40) return 'bg-yellow-400';
  return 'bg-red-400';
}

function getScoreClass(score) {
  if (score >= 70) return 'text-green-400';
  if (score >= 50) return 'text-blue-400';
  if (score >= 30) return 'text-yellow-400';
  return 'text-gray-400';
}

function getScoreBg(score) {
  if (score >= 70) return 'bg-green-400';
  if (score >= 50) return 'bg-blue-400';
  if (score >= 30) return 'bg-yellow-400';
  return 'bg-gray-400';
}

function getEfficiencyClass(efficiency) {
  if (efficiency >= 1.5) return 'text-green-400';
  if (efficiency >= 1.0) return 'text-blue-400';
  if (efficiency >= 0.7) return 'text-yellow-400';
  return 'text-red-400';
}
