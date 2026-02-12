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
      case 'name':
        return sortDirection === 'asc' 
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
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
      case 'battleTime':
        aVal = a.avgBattleTime;
        bVal = b.avgBattleTime;
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
      case 'throws':
        aVal = a.avgThrows || 0;
        bVal = b.avgThrows || 0;
        break;
      case 'vanishingAttacks':
        aVal = a.avgVanishingAttacks || 0;
        bVal = b.avgVanishingAttacks || 0;
        break;
      case 'dragonHoming':
        aVal = a.avgDragonHoming || 0;
        bVal = b.avgDragonHoming || 0;
        break;
      case 'lightningAttacks':
        aVal = a.avgLightningAttacks || 0;
        bVal = b.avgLightningAttacks || 0;
        break;
      case 'speedImpacts':
        aVal = a.avgSpeedImpacts || 0;
        bVal = b.avgSpeedImpacts || 0;
        break;
      case 'speedImpactWins':
        aVal = a.avgSpeedImpactWins || 0;
        bVal = b.avgSpeedImpactWins || 0;
        break;
      case 'maxCombo':
        aVal = a.avgMaxCombo || 0;
        bVal = b.avgMaxCombo || 0;
        break;
      case 'maxComboDamage':
        aVal = a.avgMaxComboDamage || 0;
        bVal = b.avgMaxComboDamage || 0;
        break;
      case 'sparkingComboHits':
        aVal = a.avgSparkingComboHits || 0;
        bVal = b.avgSparkingComboHits || 0;
        break;
      case 'kills':
        aVal = a.avgKills || 0;
        bVal = b.avgKills || 0;
        break;
      case 'maxHealth':
        aVal = a.avgMaxHealth || 0;
        bVal = b.avgMaxHealth || 0;
        break;
      case 'healthRemaining':
        aVal = a.avgHealthRemaining || 0;
        bVal = b.avgHealthRemaining || 0;
        break;
      case 'survivalRate':
        aVal = a.avgSurvivalRate || 0;
        bVal = b.avgSurvivalRate || 0;
        break;
      case 'tags':
        aVal = a.avgTags || 0;
        bVal = b.avgTags || 0;
        break;
      case 'guards':
        aVal = a.avgGuards || 0;
        bVal = b.avgGuards || 0;
        break;
      case 'superCounters':
        aVal = a.avgSuperCounters || 0;
        bVal = b.avgSuperCounters || 0;
        break;
      case 'revengeCounters':
        aVal = a.avgRevengeCounters || 0;
        bVal = b.avgRevengeCounters || 0;
        break;
      case 'zCounters':
        aVal = a.avgZCounters || 0;
        bVal = b.avgZCounters || 0;
        break;
      case 's1Blast':
        aVal = a.avgS1Blast || 0;
        bVal = b.avgS1Blast || 0;
        break;
      case 's2Blast':
        aVal = a.avgS2Blast || 0;
        bVal = b.avgS2Blast || 0;
        break;
      case 'ultBlast':
        aVal = a.avgUltBlast || 0;
        bVal = b.avgUltBlast || 0;
        break;
      case 'kiBlasts':
        aVal = a.avgEnergyBlasts || 0;
        bVal = b.avgEnergyBlasts || 0;
        break;
      case 'skill1':
        aVal = a.avgExa1Count || 0;
        bVal = b.avgExa1Count || 0;
        break;
      case 'skill2':
        aVal = a.avgExa2Count || 0;
        bVal = b.avgExa2Count || 0;
        break;
      case 'charges':
        aVal = a.avgCharges || 0;
        bVal = b.avgCharges || 0;
        break;
      case 'sparking':
        aVal = a.avgSparkingCount || 0;
        bVal = b.avgSparkingCount || 0;
        break;
      case 'dragonDashDistance':
        aVal = a.avgDragonDashDistance || 0;
        bVal = b.avgDragonDashDistance || 0;
        break;
      case 'characters':
        aVal = a.uniqueCharacters;
        bVal = b.uniqueCharacters;
        break;
      case 'topCharacter':
        const aTop = a.characterUsage && a.characterUsage.length > 0 ? a.characterUsage[0].name : '';
        const bTop = b.characterUsage && b.characterUsage.length > 0 ? b.characterUsage[0].name : '';
        return sortDirection === 'asc' 
          ? aTop.localeCompare(bTop)
          : bTop.localeCompare(aTop);
      default:
        aVal = a.totalMatches;
        bVal = b.totalMatches;
    }
    
    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
  });
  
  // Display all strategies - row limit controls visible height via maxHeight, not data displayed
  const displayedStrategies = sortedStrategies;
  
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
          overflowY: 'scroll',
          maxHeight: rowLimit === 'all' ? '1250px' : rowLimit === 10 ? '760px' : '410px',
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
                onClick={() => handleSort('throws')}
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '90px' }}
                className={`px-4 py-3 text-left font-semibold cursor-pointer hover:bg-opacity-80 transition-colors ${
                  darkMode ? 'bg-red-900/40 text-red-200' : 'bg-red-100 text-red-800'
                }`}
              >
                <div className="flex items-center gap-1">
                  Throws
                  <SortIcon columnKey="throws" />
                </div>
              </th>
              
              <th 
                onClick={() => handleSort('vanishingAttacks')}
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '150px' }}
                className={`px-4 py-3 text-left font-semibold cursor-pointer hover:bg-opacity-80 transition-colors ${
                  darkMode ? 'bg-red-900/40 text-red-200' : 'bg-red-100 text-red-800'
                }`}
              >
                <div className="flex items-center gap-1">
                  Vanishing Attacks
                  <SortIcon columnKey="vanishingAttacks" />
                </div>
              </th>
              
              <th 
                onClick={() => handleSort('dragonHoming')}
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '140px' }}
                className={`px-4 py-3 text-left font-semibold cursor-pointer hover:bg-opacity-80 transition-colors ${
                  darkMode ? 'bg-red-900/40 text-red-200' : 'bg-red-100 text-red-800'
                }`}
              >
                <div className="flex items-center gap-1">
                  Dragon Homings
                  <SortIcon columnKey="dragonHoming" />
                </div>
              </th>
              
              <th 
                onClick={() => handleSort('lightningAttacks')}
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '140px' }}
                className={`px-4 py-3 text-left font-semibold cursor-pointer hover:bg-opacity-80 transition-colors ${
                  darkMode ? 'bg-red-900/40 text-red-200' : 'bg-red-100 text-red-800'
                }`}
              >
                <div className="flex items-center gap-1">
                  Lightning Attacks
                  <SortIcon columnKey="lightningAttacks" />
                </div>
              </th>
              
              <th 
                onClick={() => handleSort('speedImpacts')}
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '130px' }}
                className={`px-4 py-3 text-left font-semibold cursor-pointer hover:bg-opacity-80 transition-colors ${
                  darkMode ? 'bg-red-900/40 text-red-200' : 'bg-red-100 text-red-800'
                }`}
              >
                <div className="flex items-center gap-1">
                  Speed Impacts
                  <SortIcon columnKey="speedImpacts" />
                </div>
              </th>
              
              <th 
                onClick={() => handleSort('speedImpactWins')}
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '150px' }}
                className={`px-4 py-3 text-left font-semibold cursor-pointer hover:bg-opacity-80 transition-colors ${
                  darkMode ? 'bg-red-900/40 text-red-200' : 'bg-red-100 text-red-800'
                }`}
              >
                <div className="flex items-center gap-1">
                  Speed Impact Wins
                  <SortIcon columnKey="speedImpactWins" />
                </div>
              </th>
              
              <th 
                onClick={() => handleSort('maxCombo')}
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '140px' }}
                className={`px-4 py-3 text-left font-semibold cursor-pointer hover:bg-opacity-80 transition-colors ${
                  darkMode ? 'bg-red-900/40 text-red-200' : 'bg-red-100 text-red-800'
                }`}
              >
                <div className="flex items-center gap-1">
                  Max Combo Hits
                  <SortIcon columnKey="maxCombo" />
                </div>
              </th>
              
              <th 
                onClick={() => handleSort('maxComboDamage')}
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '160px' }}
                className={`px-4 py-3 text-left font-semibold cursor-pointer hover:bg-opacity-80 transition-colors ${
                  darkMode ? 'bg-red-900/40 text-red-200' : 'bg-red-100 text-red-800'
                }`}
              >
                <div className="flex items-center gap-1">
                  Max Combo Damage
                  <SortIcon columnKey="maxComboDamage" />
                </div>
              </th>
              
              <th 
                onClick={() => handleSort('sparkingComboHits')}
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '170px' }}
                className={`px-4 py-3 text-left font-semibold cursor-pointer hover:bg-opacity-80 transition-colors ${
                  darkMode ? 'bg-red-900/40 text-red-200' : 'bg-red-100 text-red-800'
                }`}
              >
                <div className="flex items-center gap-1">
                  Sparking Combo Hits
                  <SortIcon columnKey="sparkingComboHits" />
                </div>
              </th>
              
              <th 
                onClick={() => handleSort('kills')}
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '80px' }}
                className={`px-4 py-3 text-left font-semibold cursor-pointer hover:bg-opacity-80 transition-colors ${
                  darkMode ? 'bg-red-900/40 text-red-200' : 'bg-red-100 text-red-800'
                }`}
              >
                <div className="flex items-center gap-1">
                  Kills
                  <SortIcon columnKey="kills" />
                </div>
              </th>
              
              {/* SURVIVAL & HEALTH SECTION - GREEN */}
              <th 
                onClick={() => handleSort('maxHealth')}
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '110px' }}
                className={`px-4 py-3 text-left font-semibold cursor-pointer hover:bg-opacity-80 transition-colors border-l-2 ${
                  darkMode 
                    ? 'bg-green-900/40 text-green-200 border-green-600' 
                    : 'bg-green-100 text-green-800 border-green-300'
                }`}
              >
                <div className="flex items-center gap-1">
                  Max Health
                  <SortIcon columnKey="maxHealth" />
                </div>
              </th>
              
              <th 
                onClick={() => handleSort('healthRemaining')}
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '150px' }}
                className={`px-4 py-3 text-left font-semibold cursor-pointer hover:bg-opacity-80 transition-colors ${
                  darkMode ? 'bg-green-900/40 text-green-200' : 'bg-green-100 text-green-800'
                }`}
              >
                <div className="flex items-center gap-1">
                  Health Remaining
                  <SortIcon columnKey="healthRemaining" />
                </div>
              </th>
              
              <th 
                onClick={() => handleSort('survivalRate')}
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '120px' }}
                className={`px-4 py-3 text-left font-semibold cursor-pointer hover:bg-opacity-80 transition-colors ${
                  darkMode ? 'bg-green-900/40 text-green-200' : 'bg-green-100 text-green-800'
                }`}
              >
                <div className="flex items-center gap-1">
                  Survival Rate
                  <SortIcon columnKey="survivalRate" />
                </div>
              </th>
              
              <th 
                onClick={() => handleSort('tags')}
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '120px' }}
                className={`px-4 py-3 text-left font-semibold cursor-pointer hover:bg-opacity-80 transition-colors ${
                  darkMode ? 'bg-green-900/40 text-green-200' : 'bg-green-100 text-green-800'
                }`}
              >
                <div className="flex items-center gap-1">
                  Swaps (Tags)
                  <SortIcon columnKey="tags" />
                </div>
              </th>
              
              <th 
                onClick={() => handleSort('guards')}
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '90px' }}
                className={`px-4 py-3 text-left font-semibold cursor-pointer hover:bg-opacity-80 transition-colors ${
                  darkMode ? 'bg-green-900/40 text-green-200' : 'bg-green-100 text-green-800'
                }`}
              >
                <div className="flex items-center gap-1">
                  Guards
                  <SortIcon columnKey="guards" />
                </div>
              </th>
              
              <th 
                onClick={() => handleSort('superCounters')}
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '130px' }}
                className={`px-4 py-3 text-left font-semibold cursor-pointer hover:bg-opacity-80 transition-colors ${
                  darkMode ? 'bg-green-900/40 text-green-200' : 'bg-green-100 text-green-800'
                }`}
              >
                <div className="flex items-center gap-1">
                  Super Counters
                  <SortIcon columnKey="superCounters" />
                </div>
              </th>
              
              <th 
                onClick={() => handleSort('revengeCounters')}
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '150px' }}
                className={`px-4 py-3 text-left font-semibold cursor-pointer hover:bg-opacity-80 transition-colors ${
                  darkMode ? 'bg-green-900/40 text-green-200' : 'bg-green-100 text-green-800'
                }`}
              >
                <div className="flex items-center gap-1">
                  Revenge Counters
                  <SortIcon columnKey="revengeCounters" />
                </div>
              </th>
              
              <th 
                onClick={() => handleSort('zCounters')}
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '110px' }}
                className={`px-4 py-3 text-left font-semibold cursor-pointer hover:bg-opacity-80 transition-colors ${
                  darkMode ? 'bg-green-900/40 text-green-200' : 'bg-green-100 text-green-800'
                }`}
              >
                <div className="flex items-center gap-1">
                  Z-Counters
                  <SortIcon columnKey="zCounters" />
                </div>
              </th>
              
              {/* SPECIAL ABILITIES SECTION - PURPLE */}
              <th 
                onClick={() => handleSort('s1Blast')}
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '130px' }}
                className={`px-4 py-3 text-left font-semibold cursor-pointer hover:bg-opacity-80 transition-colors border-l-2 ${
                  darkMode 
                    ? 'bg-purple-900/40 text-purple-200 border-purple-600' 
                    : 'bg-purple-100 text-purple-800 border-purple-300'
                }`}
              >
                <div className="flex items-center gap-1">
                  S1 Blasts
                  <SortIcon columnKey="s1Blast" />
                </div>
              </th>
              
              <th 
                onClick={() => handleSort('s2Blast')}
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '130px' }}
                className={`px-4 py-3 text-left font-semibold cursor-pointer hover:bg-opacity-80 transition-colors ${
                  darkMode ? 'bg-purple-900/40 text-purple-200' : 'bg-purple-100 text-purple-800'
                }`}
              >
                <div className="flex items-center gap-1">
                  S2 Blasts
                  <SortIcon columnKey="s2Blast" />
                </div>
              </th>
              
              <th 
                onClick={() => handleSort('ultBlast')}
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '130px' }}
                className={`px-4 py-3 text-left font-semibold cursor-pointer hover:bg-opacity-80 transition-colors ${
                  darkMode ? 'bg-purple-900/40 text-purple-200' : 'bg-purple-100 text-purple-800'
                }`}
              >
                <div className="flex items-center gap-1">
                  Ult Blasts
                  <SortIcon columnKey="ultBlast" />
                </div>
              </th>
              
              <th 
                onClick={() => handleSort('kiBlasts')}
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '100px' }}
                className={`px-4 py-3 text-left font-semibold cursor-pointer hover:bg-opacity-80 transition-colors ${
                  darkMode ? 'bg-purple-900/40 text-purple-200' : 'bg-purple-100 text-purple-800'
                }`}
              >
                <div className="flex items-center gap-1">
                  Ki Blasts
                  <SortIcon columnKey="kiBlasts" />
                </div>
              </th>
              
              <th 
                onClick={() => handleSort('skill1')}
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '120px' }}
                className={`px-4 py-3 text-left font-semibold cursor-pointer hover:bg-opacity-80 transition-colors ${
                  darkMode ? 'bg-purple-900/40 text-purple-200' : 'bg-purple-100 text-purple-800'
                }`}
              >
                <div className="flex items-center gap-1">
                  Skill 1 Usage
                  <SortIcon columnKey="skill1" />
                </div>
              </th>
              
              <th 
                onClick={() => handleSort('skill2')}
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '120px' }}
                className={`px-4 py-3 text-left font-semibold cursor-pointer hover:bg-opacity-80 transition-colors ${
                  darkMode ? 'bg-purple-900/40 text-purple-200' : 'bg-purple-100 text-purple-800'
                }`}
              >
                <div className="flex items-center gap-1">
                  Skill 2 Usage
                  <SortIcon columnKey="skill2" />
                </div>
              </th>
              
              <th 
                onClick={() => handleSort('charges')}
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '100px' }}
                className={`px-4 py-3 text-left font-semibold cursor-pointer hover:bg-opacity-80 transition-colors ${
                  darkMode ? 'bg-purple-900/40 text-purple-200' : 'bg-purple-100 text-purple-800'
                }`}
              >
                <div className="flex items-center gap-1">
                  Charges
                  <SortIcon columnKey="charges" />
                </div>
              </th>
              
              <th 
                onClick={() => handleSort('sparking')}
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '100px' }}
                className={`px-4 py-3 text-left font-semibold cursor-pointer hover:bg-opacity-80 transition-colors ${
                  darkMode ? 'bg-purple-900/40 text-purple-200' : 'bg-purple-100 text-purple-800'
                }`}
              >
                <div className="flex items-center gap-1">
                  Sparking
                  <SortIcon columnKey="sparking" />
                </div>
              </th>
              
              <th 
                onClick={() => handleSort('dragonDashDistance')}
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '170px' }}
                className={`px-4 py-3 text-left font-semibold cursor-pointer hover:bg-opacity-80 transition-colors ${
                  darkMode ? 'bg-purple-900/40 text-purple-200' : 'bg-purple-100 text-purple-800'
                }`}
              >
                <div className="flex items-center gap-1">
                  Dragon Dash Mileage
                  <SortIcon columnKey="dragonDashDistance" />
                </div>
              </th>
              
              {/* END COLUMNS */}
              <th 
                onClick={() => handleSort('characters')}
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '110px' }}
                className={`px-4 py-3 text-left font-semibold cursor-pointer hover:bg-opacity-80 transition-colors border-l-2 ${
                  darkMode 
                    ? 'bg-gray-700 text-gray-200 border-gray-500' 
                    : 'bg-gray-50 text-gray-700 border-gray-300'
                }`}
              >
                <div className="flex items-center gap-1">
                  Characters
                  <SortIcon columnKey="characters" />
                </div>
              </th>
              
              <th 
                onClick={() => handleSort('topCharacter')}
                style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '150px' }}
                className={`px-4 py-3 text-left font-semibold cursor-pointer hover:bg-opacity-80 transition-colors ${
                  darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-50 text-gray-700'
                }`}
              >
                <div className="flex items-center gap-1">
                  Top Character
                  <SortIcon columnKey="topCharacter" />
                </div>
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
                    {formatNumber(ai.avgDragonHoming, 1)}
                  </td>
                  
                  <td className={`px-4 py-3 ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
                    {formatNumber(ai.avgLightningAttacks, 1)}
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

