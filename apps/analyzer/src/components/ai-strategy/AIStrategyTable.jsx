import React, { useState } from 'react';
import { Brain, ChevronUp, ChevronDown, AlertCircle, User } from 'lucide-react';

/**
 * AIStrategyTable Component
 * 
 * Displays AI strategies in a comprehensive table format with sortable columns
 * Organized into sections: Core, Combat Performance, Survival & Health, Special Abilities
 */
export default function AIStrategyTable({ 
  strategies = [], 
  darkMode = false, 
  onRowClick,
  characterFiltered = false,
  selectedCharacter = null,
  sortBy,
  onSortChange
}) {
  const [tableSortBy, setTableSortBy] = useState(sortBy || 'usage');
  const [sortDirection, setSortDirection] = useState('desc');
  const [rowLimit, setRowLimit] = useState(5);
  
  // Format battle time (M:SS)
  const formatBattleTime = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Format percentage
  const formatPercent = (value) => {
    return value ? `${value.toFixed(1)}%` : '0.0%';
  };
  
  // Format number with decimals
  const formatNumber = (value, decimals = 1) => {
    return value ? value.toFixed(decimals) : '0';
  };
  
  // Format blast stats (hit/used (hit%))
  const formatBlastStats = (hit, used, hitRate) => {
    if (!used && !hit) return '0/0 (0%)';
    const hitVal = formatNumber(hit, 1);
    const usedVal = formatNumber(used, 1);
    const rate = hitRate ? Math.round(hitRate) : 0;
    return `${hitVal}/${usedVal} (${rate}%)`;
  };
  
  // Get badge color based on type
  const getBadgeColor = (type) => {
    switch (type) {
      case 'Attack':
        return darkMode 
          ? 'bg-red-900/50 text-red-300 border-red-600' 
          : 'bg-red-100 text-red-700 border-red-300';
      case 'Defense':
        return darkMode 
          ? 'bg-blue-900/50 text-blue-300 border-blue-600' 
          : 'bg-blue-100 text-blue-700 border-blue-300';
      case 'Balanced':
        return darkMode 
          ? 'bg-green-900/50 text-green-300 border-green-600' 
          : 'bg-green-100 text-green-700 border-green-300';
      default:
        return darkMode 
          ? 'bg-gray-700 text-gray-300 border-gray-600' 
          : 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };
  
  // Get win rate color
  const getWinRateColor = (winRate) => {
    if (winRate >= 60) {
      return darkMode ? 'text-green-400' : 'text-green-600';
    } else if (winRate >= 45) {
      return darkMode ? 'text-yellow-400' : 'text-yellow-600';
    } else {
      return darkMode ? 'text-red-400' : 'text-red-600';
    }
  };
  
  // Get performance score color
  const getPerformanceColor = (score) => {
    if (score >= 70) {
      return darkMode ? 'text-green-400' : 'text-green-600';
    } else if (score >= 50) {
      return darkMode ? 'text-yellow-400' : 'text-yellow-600';
    } else {
      return darkMode ? 'text-orange-400' : 'text-orange-600';
    }
  };
  
  // Handle column sort
  const handleSort = (key) => {
    if (tableSortBy === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setTableSortBy(key);
      setSortDirection('desc');
      if (onSortChange) {
        onSortChange(key);
      }
    }
  };
  
  // Sort icon component
  const SortIcon = ({ columnKey }) => {
    if (tableSortBy !== columnKey) {
      return <ChevronUp className="w-3 h-3 opacity-30" />;
    }
    return sortDirection === 'asc' 
      ? <ChevronUp className="w-3 h-3" />
      : <ChevronDown className="w-3 h-3" />;
  };
  
  // Sort strategies
  const sortedStrategies = [...strategies].sort((a, b) => {
    let aVal, bVal;
    
    switch (tableSortBy) {
      case 'usage':
        aVal = a.totalMatches;
        bVal = b.totalMatches;
        break;
      case 'winRate':
        aVal = a.winRate;
        bVal = b.winRate;
        break;
      case 'performance':
        aVal = a.combatPerformanceScore;
        bVal = b.combatPerformanceScore;
        break;
      case 'damageDealt':
        aVal = a.avgDamageDealt;
        bVal = b.avgDamageDealt;
        break;
      case 'damageTaken':
        aVal = a.avgDamageTaken;
        bVal = b.avgDamageTaken;
        break;
      case 'dps':
        aVal = a.avgDPS;
        bVal = b.avgDPS;
        break;
      case 'efficiency':
        aVal = a.damageEfficiency;
        bVal = b.damageEfficiency;
        break;
      case 'battleTime':
        aVal = a.avgBattleTime;
        bVal = b.avgBattleTime;
        break;
      case 'characters':
        aVal = a.uniqueCharacters;
        bVal = b.uniqueCharacters;
        break;
      default:
        aVal = a.totalMatches;
        bVal = b.totalMatches;
    }
    
    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
  });
  
  // Apply row limit - convert string numbers to integers for comparison
  const displayedStrategies = rowLimit === 'all' 
    ? sortedStrategies 
    : sortedStrategies.slice(0, Number(rowLimit));
  
  console.log('AIStrategyTable - rowLimit:', rowLimit, 'displayedStrategies count:', displayedStrategies.length, 'sortedStrategies count:', sortedStrategies.length);
  
  if (strategies.length === 0) {
    return (
      <div className={`text-center py-12 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
        <Brain className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p className="text-sm">No AI strategies match the current filters.</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      {/* Header with note and row limit selector */}
      <div className="flex items-center justify-between gap-4">
        <div className={`text-xs italic ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          All statistical values represent averages per match
        </div>
        
        {/* Row limit selector */}
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Show:
          </span>
          <div className="flex gap-1">
            {[5, 10, 'all'].map((limit) => (
              <button
                key={limit}
                onClick={() => setRowLimit(limit)}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  rowLimit === limit
                    ? darkMode
                      ? 'bg-purple-600 text-white'
                      : 'bg-purple-500 text-white'
                    : darkMode
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {limit === 'all' ? 'All' : limit}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Table Container with horizontal and vertical scroll */}
      <div 
        className={`rounded-xl border ${
          darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
        }`}
        style={{ 
          overflowX: 'auto',
          overflowY: 'auto',
          maxHeight: rowLimit === 'all' ? '1250px' : rowLimit === 10 ? '850px' : '450px',
          position: 'relative'
        }}
      >
        <table className="w-full text-sm" style={{ tableLayout: 'auto', minWidth: 'max-content' }}>
          <thead>
            <tr>
              {/* CORE COLUMNS */}
              {/* AI Name - Sticky */}
              <th 
                onClick={() => handleSort('name')}
                style={{ 
                  position: 'sticky',
                  left: 0,
                  top: 0,
                  zIndex: 100,
                  minWidth: '200px'
                }}
                className={`px-4 py-3 text-left font-semibold cursor-pointer hover:bg-opacity-80 transition-colors border-r-2 ${
                  darkMode ? 'bg-gray-700 text-gray-200 border-gray-600' : 'bg-gray-50 text-gray-700 border-gray-300'
                }`}
              >
                <div className="flex items-center gap-1">
                  AI Name
                  <SortIcon columnKey="name" />
                </div>
              </th>
              
              {/* Matches */}
              <th 
                onClick={() => handleSort('usage')}
                style={{ position: 'sticky', top: 0, zIndex: 5, minWidth: '100px' }}
                className={`px-4 py-3 text-left font-semibold cursor-pointer hover:bg-opacity-80 transition-colors ${
                  darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-50 text-gray-700'
                }`}
              >
                <div className="flex items-center gap-1">
                  Matches
                  <SortIcon columnKey="usage" />
                </div>
              </th>
              
              {/* Win Rate */}
              <th 
                onClick={() => handleSort('winRate')}
                style={{ position: 'sticky', top: 0, zIndex: 5, minWidth: '100px' }}
                className={`px-4 py-3 text-left font-semibold cursor-pointer hover:bg-opacity-80 transition-colors ${
                  darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-50 text-gray-700'
                }`}
              >
                <div className="flex items-center gap-1">
                  Win Rate
                  <SortIcon columnKey="winRate" />
                </div>
              </th>
              
              {/* Performance Score */}
              <th 
                onClick={() => handleSort('performance')}
                style={{ position: 'sticky', top: 0, zIndex: 5, minWidth: '130px' }}
                className={`px-4 py-3 text-left font-semibold cursor-pointer hover:bg-opacity-80 transition-colors ${
                  darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-50 text-gray-700'
                }`}
              >
                <div className="flex items-center gap-1">
                  Performance
                  <SortIcon columnKey="performance" />
                </div>
              </th>
              
              {/* Battle Time */}
              <th 
                onClick={() => handleSort('battleTime')}
                style={{ position: 'sticky', top: 0, zIndex: 5, minWidth: '110px' }}
                className={`px-4 py-3 text-left font-semibold cursor-pointer hover:bg-opacity-80 transition-colors ${
                  darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-50 text-gray-700'
                }`}
              >
                <div className="flex items-center gap-1">
                  Battle Time
                  <SortIcon columnKey="battleTime" />
                </div>
              </th>
              
              {/* COMBAT PERFORMANCE SECTION - RED */}
              <th 
                onClick={() => handleSort('damageDealt')}
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '120px' }}
                className={`px-4 py-3 text-left font-semibold cursor-pointer hover:bg-opacity-80 transition-colors border-l-2 ${
                  darkMode 
                    ? 'bg-red-900/40 text-red-200 border-red-600' 
                    : 'bg-red-100 text-red-800 border-red-300'
                }`}
              >
                <div className="flex items-center gap-1">
                  Damage Done
                  <SortIcon columnKey="damageDealt" />
                </div>
              </th>
              
              <th 
                onClick={() => handleSort('damageTaken')}
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '130px' }}
                className={`px-4 py-3 text-left font-semibold cursor-pointer hover:bg-opacity-80 transition-colors ${
                  darkMode 
                    ? 'bg-red-900/40 text-red-200' 
                    : 'bg-red-100 text-red-800'
                }`}
              >
                <div className="flex items-center gap-1">
                  Damage Taken
                  <SortIcon columnKey="damageTaken" />
                </div>
              </th>
              
              <th 
                onClick={() => handleSort('dps')}
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '150px' }}
                className={`px-4 py-3 text-left font-semibold cursor-pointer hover:bg-opacity-80 transition-colors ${
                  darkMode 
                    ? 'bg-red-900/40 text-red-200' 
                    : 'bg-red-100 text-red-800'
                }`}
              >
                <div className="flex items-center gap-1">
                  Damage Over Time
                  <SortIcon columnKey="dps" />
                </div>
              </th>
              
              <th 
                onClick={() => handleSort('efficiency')}
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '140px' }}
                className={`px-4 py-3 text-left font-semibold cursor-pointer hover:bg-opacity-80 transition-colors ${
                  darkMode 
                    ? 'bg-red-900/40 text-red-200' 
                    : 'bg-red-100 text-red-800'
                }`}
              >
                <div className="flex items-center gap-1">
                  Damage Efficiency
                  <SortIcon columnKey="efficiency" />
                </div>
              </th>
              
              <th 
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '90px' }}
                className={`px-4 py-3 text-left font-semibold ${
                  darkMode ? 'bg-red-900/40 text-red-200' : 'bg-red-100 text-red-800'
                }`}
              >
                Throws
              </th>
              
              <th 
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '150px' }}
                className={`px-4 py-3 text-left font-semibold ${
                  darkMode ? 'bg-red-900/40 text-red-200' : 'bg-red-100 text-red-800'
                }`}
              >
                Vanishing Attacks
              </th>
              
              <th 
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '140px' }}
                className={`px-4 py-3 text-left font-semibold ${
                  darkMode ? 'bg-red-900/40 text-red-200' : 'bg-red-100 text-red-800'
                }`}
              >
                Dragon Homings
              </th>
              
              <th 
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '140px' }}
                className={`px-4 py-3 text-left font-semibold ${
                  darkMode ? 'bg-red-900/40 text-red-200' : 'bg-red-100 text-red-800'
                }`}
              >
                Lightning Attacks
              </th>
              
              <th 
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '130px' }}
                className={`px-4 py-3 text-left font-semibold ${
                  darkMode ? 'bg-red-900/40 text-red-200' : 'bg-red-100 text-red-800'
                }`}
              >
                Speed Impacts
              </th>
              
              <th 
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '150px' }}
                className={`px-4 py-3 text-left font-semibold ${
                  darkMode ? 'bg-red-900/40 text-red-200' : 'bg-red-100 text-red-800'
                }`}
              >
                Speed Impact Wins
              </th>
              
              <th 
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '140px' }}
                className={`px-4 py-3 text-left font-semibold ${
                  darkMode ? 'bg-red-900/40 text-red-200' : 'bg-red-100 text-red-800'
                }`}
              >
                Max Combo Hits
              </th>
              
              <th 
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '160px' }}
                className={`px-4 py-3 text-left font-semibold ${
                  darkMode ? 'bg-red-900/40 text-red-200' : 'bg-red-100 text-red-800'
                }`}
              >
                Max Combo Damage
              </th>
              
              <th 
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '170px' }}
                className={`px-4 py-3 text-left font-semibold ${
                  darkMode ? 'bg-red-900/40 text-red-200' : 'bg-red-100 text-red-800'
                }`}
              >
                Sparking Combo Hits
              </th>
              
              <th 
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '80px' }}
                className={`px-4 py-3 text-left font-semibold ${
                  darkMode ? 'bg-red-900/40 text-red-200' : 'bg-red-100 text-red-800'
                }`}
              >
                Kills
              </th>
              
              {/* SURVIVAL & HEALTH SECTION - GREEN */}
              <th 
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '110px' }}
                className={`px-4 py-3 text-left font-semibold border-l-2 ${
                  darkMode 
                    ? 'bg-green-900/40 text-green-200 border-green-600' 
                    : 'bg-green-100 text-green-800 border-green-300'
                }`}
              >
                Max Health
              </th>
              
              <th 
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '150px' }}
                className={`px-4 py-3 text-left font-semibold ${
                  darkMode ? 'bg-green-900/40 text-green-200' : 'bg-green-100 text-green-800'
                }`}
              >
                Health Remaining
              </th>
              
              <th 
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '120px' }}
                className={`px-4 py-3 text-left font-semibold ${
                  darkMode ? 'bg-green-900/40 text-green-200' : 'bg-green-100 text-green-800'
                }`}
              >
                Survival Rate
              </th>
              
              <th 
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '120px' }}
                className={`px-4 py-3 text-left font-semibold ${
                  darkMode ? 'bg-green-900/40 text-green-200' : 'bg-green-100 text-green-800'
                }`}
              >
                Swaps (Tags)
              </th>
              
              <th 
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '90px' }}
                className={`px-4 py-3 text-left font-semibold ${
                  darkMode ? 'bg-green-900/40 text-green-200' : 'bg-green-100 text-green-800'
                }`}
              >
                Guards
              </th>
              
              <th 
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '130px' }}
                className={`px-4 py-3 text-left font-semibold ${
                  darkMode ? 'bg-green-900/40 text-green-200' : 'bg-green-100 text-green-800'
                }`}
              >
                Super Counters
              </th>
              
              <th 
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '150px' }}
                className={`px-4 py-3 text-left font-semibold ${
                  darkMode ? 'bg-green-900/40 text-green-200' : 'bg-green-100 text-green-800'
                }`}
              >
                Revenge Counters
              </th>
              
              <th 
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '110px' }}
                className={`px-4 py-3 text-left font-semibold ${
                  darkMode ? 'bg-green-900/40 text-green-200' : 'bg-green-100 text-green-800'
                }`}
              >
                Z-Counters
              </th>
              
              {/* SPECIAL ABILITIES SECTION - PURPLE */}
              <th 
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '130px' }}
                className={`px-4 py-3 text-left font-semibold border-l-2 ${
                  darkMode 
                    ? 'bg-purple-900/40 text-purple-200 border-purple-600' 
                    : 'bg-purple-100 text-purple-800 border-purple-300'
                }`}
              >
                S1 Blasts
              </th>
              
              <th 
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '130px' }}
                className={`px-4 py-3 text-left font-semibold ${
                  darkMode ? 'bg-purple-900/40 text-purple-200' : 'bg-purple-100 text-purple-800'
                }`}
              >
                S2 Blasts
              </th>
              
              <th 
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '130px' }}
                className={`px-4 py-3 text-left font-semibold ${
                  darkMode ? 'bg-purple-900/40 text-purple-200' : 'bg-purple-100 text-purple-800'
                }`}
              >
                Ult Blasts
              </th>
              
              <th 
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '100px' }}
                className={`px-4 py-3 text-left font-semibold ${
                  darkMode ? 'bg-purple-900/40 text-purple-200' : 'bg-purple-100 text-purple-800'
                }`}
              >
                Ki Blasts
              </th>
              
              <th 
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '120px' }}
                className={`px-4 py-3 text-left font-semibold ${
                  darkMode ? 'bg-purple-900/40 text-purple-200' : 'bg-purple-100 text-purple-800'
                }`}
              >
                Skill 1 Usage
              </th>
              
              <th 
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '120px' }}
                className={`px-4 py-3 text-left font-semibold ${
                  darkMode ? 'bg-purple-900/40 text-purple-200' : 'bg-purple-100 text-purple-800'
                }`}
              >
                Skill 2 Usage
              </th>
              
              <th 
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '100px' }}
                className={`px-4 py-3 text-left font-semibold ${
                  darkMode ? 'bg-purple-900/40 text-purple-200' : 'bg-purple-100 text-purple-800'
                }`}
              >
                Charges
              </th>
              
              <th 
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '100px' }}
                className={`px-4 py-3 text-left font-semibold ${
                  darkMode ? 'bg-purple-900/40 text-purple-200' : 'bg-purple-100 text-purple-800'
                }`}
              >
                Sparking
              </th>
              
              <th 
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '170px' }}
                className={`px-4 py-3 text-left font-semibold ${
                  darkMode ? 'bg-purple-900/40 text-purple-200' : 'bg-purple-100 text-purple-800'
                }`}
              >
                Dragon Dash Mileage
              </th>
              
              {/* END COLUMNS */}
              <th 
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '110px' }}
                className={`px-4 py-3 text-left font-semibold border-l-2 ${
                  darkMode 
                    ? 'bg-gray-700 text-gray-200 border-gray-500' 
                    : 'bg-gray-50 text-gray-700 border-gray-300'
                }`}
              >
                Characters
              </th>
              
              <th 
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '150px' }}
                className={`px-4 py-3 text-left font-semibold ${
                  darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-50 text-gray-700'
                }`}
              >
                Top Character
              </th>
            </tr>
          </thead>
          
          <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
            {displayedStrategies.map((ai, index) => {
              const topCharacter = ai.characterUsage && ai.characterUsage.length > 0 
                ? ai.characterUsage[0] 
                : null;
              
              return (
                <tr 
                  key={ai.name}
                  onClick={() => onRowClick(ai)}
                  className={`cursor-pointer transition-colors ${
                    darkMode 
                      ? 'hover:bg-gray-700/50' 
                      : 'hover:bg-purple-50'
                  }`}
                >
                  {/* CORE COLUMNS */}
                  {/* AI Name - Sticky */}
                  <td 
                    style={{
                      position: 'sticky',
                      left: 0,
                      zIndex: 50
                    }}
                    className={`px-4 py-3 border-r-2 ${
                      darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex flex-col gap-1">
                      <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {ai.name}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${getBadgeColor(ai.type)}`}>
                          {ai.type}
                        </span>
                        {characterFiltered && selectedCharacter && (
                          <span className={`text-xs px-2 py-0.5 rounded border font-medium flex items-center gap-1 ${
                            darkMode 
                              ? 'bg-purple-900/30 text-purple-300 border-purple-700' 
                              : 'bg-purple-50 text-purple-700 border-purple-300'
                          }`}>
                            <User className="w-3 h-3" />
                            {selectedCharacter}
                          </span>
                        )}
                        {ai.dataQuality?.confidence === 'Low' && (
                          <span className={`text-xs px-2 py-0.5 rounded border flex items-center gap-1 ${
                            darkMode 
                              ? 'bg-yellow-900/30 text-yellow-300 border-yellow-700' 
                              : 'bg-yellow-50 text-yellow-700 border-yellow-300'
                          }`}>
                            <AlertCircle className="w-3 h-3" />
                            Low Data
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  
                  {/* Matches */}
                  <td className={`px-4 py-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {ai.totalMatches}
                  </td>
                  
                  {/* Win Rate */}
                  <td className={`px-4 py-3 font-semibold ${getWinRateColor(ai.winRate)}`}>
                    {formatPercent(ai.winRate)}
                  </td>
                  
                  {/* Performance Score */}
                  <td className={`px-4 py-3 font-semibold ${getPerformanceColor(ai.combatPerformanceScore)}`}>
                    {formatNumber(ai.combatPerformanceScore, 1)}
                  </td>
                  
                  {/* Battle Time */}
                  <td className={`px-4 py-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {formatBattleTime(ai.avgBattleTime)}
                  </td>
                  
                  {/* COMBAT PERFORMANCE SECTION */}
                  <td className={`px-4 py-3 border-l-2 ${
                    darkMode 
                      ? 'text-red-300 border-red-600' 
                      : 'text-red-700 border-red-300'
                  }`}>
                    {formatNumber(ai.avgDamageDealt, 0)}
                  </td>
                  
                  <td className={`px-4 py-3 ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
                    {formatNumber(ai.avgDamageTaken, 0)}
                  </td>
                  
                  <td className={`px-4 py-3 ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
                    {formatNumber(ai.avgDPS, 0)}/sec
                  </td>
                  
                  <td className={`px-4 py-3 ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
                    {formatNumber(ai.damageEfficiency, 2)}x
                  </td>
                  
                  <td className={`px-4 py-3 ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
                    {formatNumber(ai.avgThrows, 1)}
                  </td>
                  
                  <td className={`px-4 py-3 ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
                    {formatNumber(ai.avgVanishingAttacks, 1)}
                  </td>
                  
                  <td className={`px-4 py-3 ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
                    {formatNumber(ai.avgDragonHoming, 0)}
                  </td>
                  
                  <td className={`px-4 py-3 ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
                    {formatNumber(ai.avgLightningAttacks, 0)}
                  </td>
                  
                  <td className={`px-4 py-3 ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
                    {formatNumber(ai.avgSpeedImpacts, 1)}
                  </td>
                  
                  <td className={`px-4 py-3 ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
                    {formatNumber(ai.avgSpeedImpactWins, 1)}
                  </td>
                  
                  <td className={`px-4 py-3 ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
                    {formatNumber(ai.avgMaxCombo, 1)}
                  </td>
                  
                  <td className={`px-4 py-3 ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
                    {formatNumber(ai.avgMaxComboDamage, 0)}
                  </td>
                  
                  <td className={`px-4 py-3 ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
                    {formatNumber(ai.avgSparkingComboHits, 0)}
                  </td>
                  
                  <td className={`px-4 py-3 ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
                    {formatNumber(ai.avgKills, 1)}
                  </td>
                  
                  {/* SURVIVAL & HEALTH SECTION */}
                  <td className={`px-4 py-3 border-l-2 ${
                    darkMode 
                      ? 'text-green-300 border-green-600' 
                      : 'text-green-700 border-green-300'
                  }`}>
                    {formatNumber(ai.avgMaxHealth, 0)}
                  </td>
                  
                  <td className={`px-4 py-3 ${darkMode ? 'text-green-300' : 'text-green-700'}`}>
                    {formatNumber(ai.avgHealthRemaining, 0)}
                  </td>
                  
                  <td className={`px-4 py-3 ${darkMode ? 'text-green-300' : 'text-green-700'}`}>
                    {formatPercent(ai.avgSurvivalRate)}
                  </td>
                  
                  <td className={`px-4 py-3 ${darkMode ? 'text-green-300' : 'text-green-700'}`}>
                    {formatNumber(ai.avgTags, 1)}
                  </td>
                  
                  <td className={`px-4 py-3 ${darkMode ? 'text-green-300' : 'text-green-700'}`}>
                    {formatNumber(ai.avgGuards, 0)}
                  </td>
                  
                  <td className={`px-4 py-3 ${darkMode ? 'text-green-300' : 'text-green-700'}`}>
                    {formatNumber(ai.avgSuperCounters, 1)}
                  </td>
                  
                  <td className={`px-4 py-3 ${darkMode ? 'text-green-300' : 'text-green-700'}`}>
                    {formatNumber(ai.avgRevengeCounters, 1)}
                  </td>
                  
                  <td className={`px-4 py-3 ${darkMode ? 'text-green-300' : 'text-green-700'}`}>
                    {formatNumber(ai.avgZCounters, 1)}
                  </td>
                  
                  {/* SPECIAL ABILITIES SECTION */}
                  <td className={`px-4 py-3 border-l-2 ${
                    darkMode 
                      ? 'text-purple-300 border-purple-600' 
                      : 'text-purple-700 border-purple-300'
                  }`}>
                    {formatBlastStats(ai.avgS1HitBlast, ai.avgS1Blast, ai.avgS1HitRate)}
                  </td>
                  
                  <td className={`px-4 py-3 ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>
                    {formatBlastStats(ai.avgS2HitBlast, ai.avgS2Blast, ai.avgS2HitRate)}
                  </td>
                  
                  <td className={`px-4 py-3 ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>
                    {formatBlastStats(ai.avgUltHitBlast, ai.avgUltBlast, ai.avgUltHitRate)}
                  </td>
                  
                  <td className={`px-4 py-3 ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>
                    {formatNumber(ai.avgEnergyBlasts, 0)}
                  </td>
                  
                  <td className={`px-4 py-3 ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>
                    {formatNumber(ai.avgExa1Count, 1)}
                  </td>
                  
                  <td className={`px-4 py-3 ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>
                    {formatNumber(ai.avgExa2Count, 1)}
                  </td>
                  
                  <td className={`px-4 py-3 ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>
                    {formatNumber(ai.avgCharges, 0)}
                  </td>
                  
                  <td className={`px-4 py-3 ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>
                    {formatNumber(ai.avgSparkingCount, 0)}
                  </td>
                  
                  <td className={`px-4 py-3 ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>
                    {formatNumber(ai.avgDragonDashDistance, 0)}
                  </td>
                  
                  {/* END COLUMNS */}
                  <td className={`px-4 py-3 border-l-2 ${
                    darkMode 
                      ? 'text-gray-300 border-gray-600' 
                      : 'text-gray-700 border-gray-300'
                  }`}>
                    {ai.uniqueCharacters}
                  </td>
                  
                  <td className={`px-4 py-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {topCharacter ? topCharacter.name : 'N/A'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

