/**
 * Synergy Pairs Analysis
 * Tab 2 of Capsule Synergy Analysis
 * 
 * Displays capsule pair synergies with:
 * - Top performing pairs table
 * - Synergy type breakdown
 * - Interactive heatmap visualization
 * - Archetype-based filtering
 * 
 * Created: November 5, 2025
 */

import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';

export default function SynergyPairsAnalysis({ synergyData, capsuleMap }) {
  const [sortBy, setSortBy] = useState('synergyBonus');
  const [sortDir, setSortDir] = useState('desc');
  const [filterSynergyType, setFilterSynergyType] = useState('all');
  const [filterArchetype, setFilterArchetype] = useState('all');
  const [minAppearances, setMinAppearances] = useState(3);
  const [showHeatmap, setShowHeatmap] = useState(false);

  // Process pair data into table format
  const tableData = useMemo(() => {
    if (!synergyData) return [];

    let data = Object.entries(synergyData).map(([pairKey, metrics]) => {
      // Use data already in metrics from calculator
      return {
        pairKey,
        id1: metrics.capsule1Id,
        id2: metrics.capsule2Id,
        name1: metrics.capsule1Name || 'Unknown',
        name2: metrics.capsule2Name || 'Unknown',
        archetype1: metrics.capsule1Archetype || 'Unknown',
        archetype2: metrics.capsule2Archetype || 'Unknown',
        cost1: capsuleMap[metrics.capsule1Id]?.cost || 0,
        cost2: capsuleMap[metrics.capsule2Id]?.cost || 0,
        combinedCost: metrics.combinedCost || 0,
        ...metrics
      };
    });

    // Apply filters
    data = data.filter(item => item.appearances >= minAppearances);

    if (filterSynergyType !== 'all') {
      data = data.filter(item => item.synergyType === filterSynergyType);
    }

    if (filterArchetype !== 'all') {
      data = data.filter(item => 
        item.archetype1 === filterArchetype || item.archetype2 === filterArchetype
      );
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
  }, [synergyData, capsuleMap, sortBy, sortDir, filterSynergyType, filterArchetype, minAppearances]);

  // Get unique synergy types
  const synergyTypes = useMemo(() => {
    if (!synergyData) return [];
    const types = new Set(Object.values(synergyData).map(s => s.synergyType).filter(Boolean));
    return Array.from(types).sort();
  }, [synergyData]);

  // Get unique archetypes
  const archetypes = useMemo(() => {
    if (!capsuleMap) return [];
    const types = new Set(Object.values(capsuleMap).map(c => c.archetype).filter(Boolean));
    return Array.from(types).sort();
  }, [capsuleMap]);

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
      'Capsule 1': row.name1,
      'Capsule 2': row.name2,
      'Archetype 1': row.archetype1,
      'Archetype 2': row.archetype2,
      'Combined Cost': row.combinedCost,
      'Synergy Type': row.synergyType || 'Unknown',
      'Appearances': row.appearances,
      'Win Rate': `${(row.pairWinRate || 0).toFixed(1)}%`,
      'Synergy Bonus': (row.synergyBonus || 0).toFixed(2),
      'Avg Damage': (row.avgDamageDealt || 0).toFixed(0),
      'Efficiency': (row.damageEfficiency || 0).toFixed(2)
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Synergy Pairs');
    XLSX.writeFile(wb, 'capsule_synergy_pairs.xlsx');
  };

  if (!synergyData || Object.keys(synergyData).length === 0) {
    return (
      <div className="text-center text-gray-400 py-12">
        No synergy pair data available.
      </div>
    );
  }

  return (
    <div className="synergy-pairs-analysis">
      {/* Controls */}
      <div className="mb-6 flex flex-wrap gap-4 items-center">
        {/* Synergy Type Filter */}
        {synergyTypes.length > 0 && (
          <select
            value={filterSynergyType}
            onChange={(e) => setFilterSynergyType(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded text-gray-200 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Synergy Types</option>
            {synergyTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        )}

        {/* Archetype Filter */}
        <select
          value={filterArchetype}
          onChange={(e) => setFilterArchetype(e.target.value)}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded text-gray-200 focus:outline-none focus:border-blue-500"
        >
          <option value="all">All Archetypes</option>
          {archetypes.map(arch => (
            <option key={arch} value={arch}>{arch}</option>
          ))}
        </select>

        {/* Min Appearances */}
        <div className="flex items-center gap-2">
          <label className="text-gray-400 text-sm">Min Appearances:</label>
          <input
            type="number"
            min="1"
            value={minAppearances}
            onChange={(e) => setMinAppearances(parseInt(e.target.value) || 1)}
            className="w-20 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-200 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Heatmap Toggle */}
        <button
          onClick={() => setShowHeatmap(!showHeatmap)}
          className={`px-4 py-2 rounded transition-colors ${
            showHeatmap
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
          }`}
        >
          {showHeatmap ? 'Show Table' : 'Show Heatmap'}
        </button>

        {/* Export Button */}
        <button
          onClick={exportToExcel}
          className="ml-auto px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
        >
          Export to Excel
        </button>
      </div>

      {/* Results Count */}
      <div className="mb-4 text-gray-400 text-sm">
        Showing {tableData.length} synergy pair{tableData.length !== 1 ? 's' : ''}
      </div>

      {/* Content: Table or Heatmap */}
      {showHeatmap ? (
        <SynergyHeatmap data={tableData} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-800 text-gray-300">
                <th className="px-4 py-3 text-left">Capsule 1</th>
                <th className="px-4 py-3 text-left">Capsule 2</th>
                <th className="px-4 py-3 text-left">Archetypes</th>
                <SortableHeader label="Cost" column="combinedCost" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <th className="px-4 py-3 text-left">Synergy Type</th>
                <SortableHeader label="Uses" column="appearances" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Win %" column="pairWinRate" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Bonus" column="synergyBonus" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Avg Damage" column="avgDamageDealt" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, idx) => (
                <tr
                  key={row.pairKey}
                  className={`border-b border-gray-700 hover:bg-gray-800/50 ${
                    idx % 2 === 0 ? 'bg-gray-900/30' : ''
                  }`}
                >
                  <td className="px-4 py-3 text-gray-200">{row.name1}</td>
                  <td className="px-4 py-3 text-gray-200">{row.name2}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <span className={`px-2 py-1 rounded text-xs ${getArchetypeBadgeClass(row.archetype1)}`}>
                        {row.archetype1}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs ${getArchetypeBadgeClass(row.archetype2)}`}>
                        {row.archetype2}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-center">{row.combinedCost}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${getSynergyTypeBadgeClass(row.synergyType)}`}>
                      {row.synergyType || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-center">{row.appearances}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={getWinRateClass(row.pairWinRate)}>
                      {(row.pairWinRate || 0).toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={getSynergyBonusClass(row.synergyBonus)}>
                      {row.synergyBonus > 0 ? '+' : ''}{(row.synergyBonus || 0).toFixed(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-right">{(row.avgDamageDealt || 0).toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Heatmap component
function SynergyHeatmap({ data }) {
  // Get top capsules by appearance frequency
  const topCapsules = useMemo(() => {
    const capsuleFreq = {};
    data.forEach(pair => {
      capsuleFreq[pair.name1] = (capsuleFreq[pair.name1] || 0) + 1;
      capsuleFreq[pair.name2] = (capsuleFreq[pair.name2] || 0) + 1;
    });

    return Object.entries(capsuleFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([name]) => name);
  }, [data]);

  // Build synergy matrix
  const synergyMatrix = useMemo(() => {
    const matrix = {};
    topCapsules.forEach(cap1 => {
      matrix[cap1] = {};
      topCapsules.forEach(cap2 => {
        matrix[cap1][cap2] = null;
      });
    });

    data.forEach(pair => {
      if (topCapsules.includes(pair.name1) && topCapsules.includes(pair.name2)) {
        matrix[pair.name1][pair.name2] = pair.synergyBonus || 0;
        matrix[pair.name2][pair.name1] = pair.synergyBonus || 0;
      }
    });

    return matrix;
  }, [data, topCapsules]);

  if (topCapsules.length === 0) {
    return (
      <div className="text-center text-gray-400 py-12">
        Not enough data for heatmap visualization.
      </div>
    );
  }

  return (
    <div className="synergy-heatmap overflow-x-auto">
      <div className="mb-4 text-gray-400 text-sm">
        Showing top 20 most frequently paired capsules
      </div>
      <table className="border-collapse">
        <thead>
          <tr>
            <th className="px-2 py-2 bg-gray-800 border border-gray-700"></th>
            {topCapsules.map(name => (
              <th
                key={name}
                className="px-2 py-2 bg-gray-800 border border-gray-700 text-gray-300 text-xs transform -rotate-45 origin-bottom-left"
                style={{ height: '120px', minWidth: '30px' }}
              >
                <div className="whitespace-nowrap">{name}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {topCapsules.map(cap1 => (
            <tr key={cap1}>
              <th className="px-2 py-2 bg-gray-800 border border-gray-700 text-gray-300 text-xs text-left whitespace-nowrap">
                {cap1}
              </th>
              {topCapsules.map(cap2 => {
                const value = synergyMatrix[cap1][cap2];
                return (
                  <td
                    key={cap2}
                    className="border border-gray-700 text-center text-xs"
                    style={{
                      backgroundColor: getHeatmapColor(value),
                      minWidth: '30px',
                      height: '30px'
                    }}
                    title={value !== null ? `${cap1} + ${cap2}: ${value.toFixed(1)}` : 'No data'}
                  >
                    {value !== null && value !== 0 ? value.toFixed(0) : ''}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Sortable header component
function SortableHeader({ label, column, sortBy, sortDir, onSort }) {
  const isActive = sortBy === column;
  return (
    <th
      onClick={() => onSort(column)}
      className="px-4 py-3 text-left cursor-pointer hover:bg-gray-700 transition-colors select-none"
    >
      <div className="flex items-center gap-2">
        <span>{label}</span>
        {isActive && (
          <span className="text-blue-400">
            {sortDir === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </div>
    </th>
  );
}

// Helper functions for styling
function getArchetypeBadgeClass(archetype) {
  switch (archetype) {
    case 'Aggressive':
      return 'bg-red-900/50 text-red-300';
    case 'Defensive':
      return 'bg-blue-900/50 text-blue-300';
    case 'Technical':
      return 'bg-purple-900/50 text-purple-300';
    default:
      return 'bg-gray-800 text-gray-400';
  }
}

function getSynergyTypeBadgeClass(type) {
  switch (type) {
    case 'Cross-Archetype':
      return 'bg-green-900/50 text-green-300';
    case 'Same-Archetype':
      return 'bg-yellow-900/50 text-yellow-300';
    case 'Effect-Based':
      return 'bg-indigo-900/50 text-indigo-300';
    default:
      return 'bg-gray-800 text-gray-400';
  }
}

function getWinRateClass(winRate) {
  if (winRate >= 60) return 'text-green-400 font-medium';
  if (winRate >= 50) return 'text-blue-400';
  if (winRate >= 40) return 'text-yellow-400';
  return 'text-red-400';
}

function getSynergyBonusClass(bonus) {
  if (bonus >= 10) return 'text-green-400 font-medium';
  if (bonus >= 5) return 'text-blue-400';
  if (bonus >= 0) return 'text-gray-400';
  return 'text-red-400';
}

function getHeatmapColor(value) {
  if (value === null) return 'rgb(31, 41, 55)'; // gray-800
  if (value >= 15) return 'rgb(22, 163, 74)'; // green-600
  if (value >= 10) return 'rgb(34, 197, 94)'; // green-500
  if (value >= 5) return 'rgb(132, 204, 22)'; // lime-500
  if (value >= 0) return 'rgb(234, 179, 8)'; // yellow-500
  if (value >= -5) return 'rgb(249, 115, 22)'; // orange-500
  return 'rgb(239, 68, 68)'; // red-500
}
