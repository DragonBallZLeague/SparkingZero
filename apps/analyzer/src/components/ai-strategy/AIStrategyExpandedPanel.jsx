import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  Trophy, 
  Target, 
  Shield, 
  Zap, 
  TrendingUp, 
  TrendingDown,
  Users, 
  Package,
  Activity,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Brain,
  ArrowUpDown,
  Clock,
  User
} from 'lucide-react';
import { getBuildTypeColor } from '../../App';
import BehaviorInsightsSection from './BehaviorInsightsSection.jsx';

/**
 * AIStrategyExpandedPanel Component
 * 
 * Full detailed analysis panel for a single AI strategy
 * Shows comprehensive metrics, character compatibility, build analysis, and behavioral patterns
 */
export default function AIStrategyExpandedPanel({ 
  aiMetrics, 
  allAIMetrics, 
  darkMode = false, 
  onClose,
  characterFiltered = false,
  selectedCharacter = null
}) {
  const [showAllCharacters, setShowAllCharacters] = useState(false);
  const [characterSortBy, setCharacterSortBy] = useState('matches');
  const [showCombatDetails, setShowCombatDetails] = useState(false);
  const [showSurvivalDetails, setShowSurvivalDetails] = useState(false);
  const [showSpecialAbilitiesDetails, setShowSpecialAbilitiesDetails] = useState(false);
  
  // ESC key to close
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);
  
  const {
    name,
    type,
    totalMatches,
    usageRate,
    winRate,
    winCount,
    lossCount,
    combatPerformanceScore,
    avgSurvivalRate,
    avgKills,
    uniqueCharacters,
    characterUsage,
    buildTypeDistribution,
    topCapsules,
    avgBuildCosts,
    dataQuality,
    // Raw stats
    avgDamageDealt,
    avgDamageTaken,
    avgDamageTakenPerSecond,
    avgHealthRemaining,
    avgMaxHealth,
    avgMaxCombo,
    avgMaxComboDamage,
    avgSparkingComboHits,
    avgS1Blast,
    avgS2Blast,
    avgUltBlast,
    avgS1HitBlast,
    avgS2HitBlast,
    avgUltHitBlast,
    avgS1HitRate,
    avgS2HitRate,
    avgUltHitRate,
    avgExa1Count,
    avgExa2Count,
    avgThrows,
    avgVanishingAttacks,
    avgDragonHoming,
    avgLightningAttacks,
    avgSpeedImpacts,
    avgSpeedImpactWins,
    avgGuards,
    avgZCounters,
    avgSuperCounters,
    avgRevengeCounters,
    avgSparkingCount,
    avgDragonDashDistance,
    avgEnergyBlasts,
    avgCharges,
    avgTags,
    avgBattleTime,
    damageEfficiency,
    avgDPS
  } = aiMetrics;
  
  // Calculate overall averages for comparison
  const overallStats = useMemo(() => {
    const allAIs = Object.values(allAIMetrics);
    const totalAIMatches = allAIs.reduce((sum, ai) => sum + ai.totalMatches, 0);
    
    if (totalAIMatches === 0) return null;
    
    return {
      avgWinRate: allAIs.reduce((sum, ai) => sum + (ai.winRate * ai.totalMatches), 0) / totalAIMatches,
      avgDamageDealt: allAIs.reduce((sum, ai) => sum + (ai.avgDamageDealt * ai.totalMatches), 0) / totalAIMatches,
      avgDamageTaken: allAIs.reduce((sum, ai) => sum + (ai.avgDamageTaken * ai.totalMatches), 0) / totalAIMatches,
      avgPerformance: allAIs.reduce((sum, ai) => sum + (ai.combatPerformanceScore * ai.totalMatches), 0) / totalAIMatches,
      avgBattleTime: allAIs.reduce((sum, ai) => sum + ((ai.avgBattleTime || 0) * ai.totalMatches), 0) / totalAIMatches,
      avgDamageEfficiency: allAIs.reduce((sum, ai) => sum + ((ai.damageEfficiency || 0) * ai.totalMatches), 0) / totalAIMatches,
      avgDPS: allAIs.reduce((sum, ai) => sum + ((ai.avgDPS || 0) * ai.totalMatches), 0) / totalAIMatches
    };
  }, [allAIMetrics]);
  
  // Calculate performance delta vs overall
  const getDelta = (value, overallValue) => {
    if (!overallValue || overallValue === 0) return 0;
    return ((value - overallValue) / overallValue) * 100;
  };
  
  // Format battle time from seconds to M:SS
  const formatBattleTime = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Get badge color
  const getBadgeColor = () => {
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
  
  // Sort characters
  const sortedCharacters = useMemo(() => {
    let chars = [...characterUsage];
    
    // If character filtered, only show that character
    if (characterFiltered && selectedCharacter) {
      chars = chars.filter(char => char.name === selectedCharacter);
    }
    
    switch (characterSortBy) {
      case 'delta':
        // Sort by efficiency: damageEfficiency * (charWinRate / overallWinRate)
        chars.sort((a, b) => {
          const effA = damageEfficiency * (a.winRate / winRate);
          const effB = damageEfficiency * (b.winRate / winRate);
          const finalEffA = isFinite(effA) && effA > 0 ? effA : damageEfficiency;
          const finalEffB = isFinite(effB) && effB > 0 ? effB : damageEfficiency;
          return finalEffB - finalEffA;
        });
        break;
      case 'winRate':
        chars.sort((a, b) => b.winRate - a.winRate);
        break;
      case 'matches':
        chars.sort((a, b) => b.matches - a.matches);
        break;
      default:
        chars.sort((a, b) => b.matches - a.matches);
    }
    
    return chars;
  }, [characterUsage, characterSortBy, damageEfficiency, winRate, characterFiltered, selectedCharacter]);
  
  // Top 5 characters with significant delta
  const topDeltaCharacters = sortedCharacters.slice(0, 5);
  const displayedCharacters = showAllCharacters ? sortedCharacters : topDeltaCharacters;
  
  return (
    <div className="flex flex-col h-full" style={{ maxHeight: '90vh' }}>
      {/* Header - Fixed at top */}
      <div className="flex items-start justify-between px-6 py-2 border-b flex-shrink-0" style={{
        backgroundColor: darkMode ? 'rgb(31, 41, 55)' : 'white'
      }}>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Brain className={`w-6 h-6 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
            <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              {name}
            </h2>
            <span className={`px-2 py-0.5 rounded-full border text-xs font-medium ${getBadgeColor()}`}>
              {type}
            </span>
            {characterFiltered && selectedCharacter && (
              <span className={`px-3 py-1 rounded-lg text-sm border flex items-center gap-2 ${
                darkMode 
                  ? 'bg-purple-900/30 text-purple-300 border-purple-700' 
                  : 'bg-purple-50 text-purple-700 border-purple-300'
              }`}>
                <User className="w-4 h-4" />
                <span className="font-medium">Filtered by: {selectedCharacter}</span>
              </span>
            )}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className={`p-1.5 rounded-lg transition-all flex-shrink-0 ml-4 mt-4 ${
            darkMode 
              ? 'bg-gray-700 hover:bg-red-600 text-gray-300 hover:text-white' 
              : 'bg-gray-100 hover:bg-red-500 text-gray-600 hover:text-white'
          }`}
          title="Close (ESC)"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      
      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6" style={{ 
        overflowY: 'auto',
        maxHeight: 'calc(90vh - 100px)' 
      }}>
      {/* Overview Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-lg border ${
          darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
        }`}>
          <div className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Win Rate</div>
          <div className={`text-3xl font-bold ${
            winRate >= 60 ? darkMode ? 'text-green-400' : 'text-green-600'
            : winRate >= 45 ? darkMode ? 'text-yellow-400' : 'text-yellow-600'
            : darkMode ? 'text-red-400' : 'text-red-600'
          }`}>
            {winRate}%
          </div>
          <div className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
            {winCount}W - {lossCount}L
          </div>
          {overallStats && (
            <div className={`text-xs mt-2 flex items-center gap-1 ${
              getDelta(winRate, overallStats.avgWinRate) > 0 
                ? 'text-green-500' 
                : 'text-red-500'
            }`}>
              {getDelta(winRate, overallStats.avgWinRate) > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {getDelta(winRate, overallStats.avgWinRate) > 0 ? '+' : ''}{getDelta(winRate, overallStats.avgWinRate).toFixed(1)}% vs avg
            </div>
          )}
        </div>
        
        <div className={`p-4 rounded-lg border ${
          darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
        }`}>
          <div className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Performance Score</div>
          <div className={`text-3xl font-bold ${
            combatPerformanceScore >= 70 ? darkMode ? 'text-green-400' : 'text-green-600'
            : combatPerformanceScore >= 50 ? darkMode ? 'text-yellow-400' : 'text-yellow-600'
            : darkMode ? 'text-orange-400' : 'text-orange-600'
          }`}>
            {combatPerformanceScore}
          </div>
          <div className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
            out of 100
          </div>
          {overallStats && (
            <div className={`text-xs mt-2 flex items-center gap-1 ${
              getDelta(combatPerformanceScore, overallStats.avgPerformance) > 0 
                ? 'text-green-500' 
                : 'text-red-500'
            }`}>
              {getDelta(combatPerformanceScore, overallStats.avgPerformance) > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {getDelta(combatPerformanceScore, overallStats.avgPerformance) > 0 ? '+' : ''}{getDelta(combatPerformanceScore, overallStats.avgPerformance).toFixed(1)}% vs avg
            </div>
          )}
        </div>
        
        <div className={`p-4 rounded-lg border ${
          darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
        }`}>
          <div className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Usage</div>
          <div className={`text-3xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
            {totalMatches}
          </div>
          <div className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
            {usageRate}% of all matches
          </div>
          <div className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {uniqueCharacters} unique characters
          </div>
        </div>
        
        <div className={`p-4 rounded-lg border ${
          darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
        }`}>
          <div className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Data Quality</div>
          <div className={`text-3xl font-bold ${
            dataQuality.confidence === 'High' ? darkMode ? 'text-green-400' : 'text-green-600'
            : dataQuality.confidence === 'Medium' ? darkMode ? 'text-yellow-400' : 'text-yellow-600'
            : darkMode ? 'text-orange-400' : 'text-orange-600'
          }`}>
            {dataQuality.confidence}
          </div>
          <div className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
            Diversity: {(dataQuality.diversityScore * 100).toFixed(0)}%
          </div>
          <div className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {dataQuality.sampleSize} total matches
          </div>
        </div>
      </div>
      
      {/* Behavior Insights Section */}
      <BehaviorInsightsSection
        aiMetrics={aiMetrics}
        allAIMetrics={allAIMetrics}
        darkMode={darkMode}
        characterFiltered={characterFiltered}
        selectedCharacter={selectedCharacter}
      />
      
      {/* AI Performance Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Avg Damage */}
        <div className={`p-4 rounded-lg border ${
          darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
        }`}>
          <div className={`flex items-center gap-2 mb-2 ${
            darkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            <Target className="w-4 h-4" />
            <span className="text-sm">Avg Damage</span>
          </div>
          <div className={`text-2xl font-bold ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            {avgDamageDealt >= 1000 
              ? `${(avgDamageDealt / 1000).toFixed(1)}K` 
              : avgDamageDealt.toFixed(0)}
          </div>
          {overallStats && (
            <div className={`text-xs mt-1 flex items-center gap-1 ${
              getDelta(avgDamageDealt, overallStats.avgDamageDealt) > 0
                ? darkMode ? 'text-green-400' : 'text-green-600'
                : darkMode ? 'text-red-400' : 'text-red-600'
            }`}>
              {getDelta(avgDamageDealt, overallStats.avgDamageDealt) > 0 ? '+' : ''}
              {getDelta(avgDamageDealt, overallStats.avgDamageDealt).toFixed(1)}% vs avg
            </div>
          )}
        </div>
        
        {/* Damage/Sec */}
        <div className={`p-4 rounded-lg border ${
          darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
        }`}>
          <div className={`flex items-center gap-2 mb-2 ${
            darkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            <Zap className="w-4 h-4" />
            <span className="text-sm">Damage/Sec</span>
          </div>
          <div className={`text-2xl font-bold ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            {avgDPS ? Math.round(avgDPS) : 0}
          </div>
          {overallStats && (
            <div className={`text-xs mt-1 flex items-center gap-1 ${
              getDelta(avgDPS || 0, overallStats.avgDPS) > 0
                ? darkMode ? 'text-green-400' : 'text-green-600'
                : darkMode ? 'text-red-400' : 'text-red-600'
            }`}>
              {getDelta(avgDPS || 0, overallStats.avgDPS) > 0 ? '+' : ''}
              {getDelta(avgDPS || 0, overallStats.avgDPS).toFixed(1)}% vs avg
            </div>
          )}
        </div>
        
        {/* Efficiency */}
        <div className={`p-4 rounded-lg border ${
          darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
        }`}>
          <div className={`flex items-center gap-2 mb-2 ${
            darkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            <Activity className="w-4 h-4" />
            <span className="text-sm">Efficiency</span>
          </div>
          <div className={`text-2xl font-bold ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            {damageEfficiency ? damageEfficiency.toFixed(2) : '0.00'}x
          </div>
          {overallStats && (
            <div className={`text-xs mt-1 flex items-center gap-1 ${
              getDelta(damageEfficiency || 0, overallStats.avgDamageEfficiency) > 0
                ? darkMode ? 'text-green-400' : 'text-green-600'
                : darkMode ? 'text-red-400' : 'text-red-600'
            }`}>
              {getDelta(damageEfficiency || 0, overallStats.avgDamageEfficiency) > 0 ? '+' : ''}
              {getDelta(damageEfficiency || 0, overallStats.avgDamageEfficiency).toFixed(1)}% vs avg
            </div>
          )}
        </div>
        
        {/* Battle Time */}
        <div className={`p-4 rounded-lg border ${
          darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
        }`}>
          <div className={`flex items-center gap-2 mb-2 ${
            darkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            <Clock className="w-4 h-4" />
            <span className="text-sm">Battle Time</span>
          </div>
          <div className={`text-2xl font-bold ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            {formatBattleTime(avgBattleTime)}
          </div>
          {overallStats && (
            <div className={`text-xs mt-1 flex items-center gap-1 ${
              getDelta(avgBattleTime || 0, overallStats.avgBattleTime) < 0
                ? darkMode ? 'text-green-400' : 'text-green-600'
                : darkMode ? 'text-red-400' : 'text-red-600'
            }`}>
              {getDelta(avgBattleTime || 0, overallStats.avgBattleTime) > 0 ? '+' : ''}
              {formatBattleTime(Math.abs((avgBattleTime || 0) - (overallStats.avgBattleTime || 0)))} 
              {getDelta(avgBattleTime || 0, overallStats.avgBattleTime) < 0 ? ' shorter' : ' longer'}
            </div>
          )}
        </div>
      </div>
      
      {/* Behavioral Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Combat Performance */}
        <div className={`p-4 rounded-lg border ${
          darkMode ? 'bg-red-900/20 border-red-600' : 'bg-red-50 border-red-200'
        }`}>
          <h4 className={`font-bold mb-3 flex items-center gap-2 ${
            darkMode ? 'text-red-300' : 'text-red-700'
          }`}>
            <Target className="w-5 h-5" />
            Combat Performance
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Damage Done:</span>
              <span className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{avgDamageDealt.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Damage Taken:</span>
              <span className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{avgDamageTaken.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Damage Over Time:</span>
              <span className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{avgDPS ? Math.round(avgDPS) : 0}/sec</span>
            </div>
            <div className="flex justify-between">
              <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Damage Efficiency:</span>
              <span className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{damageEfficiency ? damageEfficiency.toFixed(2) : '0.00'}x</span>
            </div>
          </div>
          
          {showCombatDetails && (
            <div className="mt-3 pt-3 border-t space-y-2 text-sm" style={{
              borderColor: darkMode ? 'rgba(252, 165, 165, 0.3)' : 'rgba(252, 165, 165, 0.5)'
            }}>
              <div className="flex justify-between">
                <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Throws:</span>
                <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{avgThrows || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Vanishing Attacks:</span>
                <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{avgVanishingAttacks || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Dragon Homings:</span>
                <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{avgDragonHoming || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Lightning Attacks:</span>
                <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{avgLightningAttacks || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Speed Impacts:</span>
                <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{avgSpeedImpacts || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Speed Impact Wins:</span>
                <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{avgSpeedImpactWins || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Max Combo Hits:</span>
                <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{avgMaxCombo || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Max Combo Damage:</span>
                <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{avgMaxComboDamage ? avgMaxComboDamage.toLocaleString() : 0}</span>
              </div>
              <div className="flex justify-between">
                <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Sparking Combo Hits:</span>
                <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{avgSparkingComboHits || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Avg Kills:</span>
                <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{avgKills || 0}</span>
              </div>
            </div>
          )}
          
          <button
            onClick={() => setShowCombatDetails(!showCombatDetails)}
            className={`mt-3 w-full py-1.5 px-3 rounded text-xs transition-colors ${
              darkMode
                ? 'bg-red-800/30 hover:bg-red-800/50 text-red-300'
                : 'bg-red-100 hover:bg-red-200 text-red-700'
            }`}
          >
            {showCombatDetails ? (
              <><ChevronUp className="w-3 h-3 inline mr-1" />Hide Details</>
            ) : (
              <><ChevronDown className="w-3 h-3 inline mr-1" />Show More</>
            )}
          </button>
        </div>
        
        {/* Survival & Health */}
        <div className={`p-4 rounded-lg border ${
          darkMode ? 'bg-green-900/20 border-green-600' : 'bg-green-50 border-green-200'
        }`}>
          <h4 className={`font-bold mb-3 flex items-center gap-2 ${
            darkMode ? 'text-green-300' : 'text-green-700'
          }`}>
            <Shield className="w-5 h-5" />
            Survival & Health
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Max Health:</span>
              <span className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{avgMaxHealth ? avgMaxHealth.toLocaleString() : 0}</span>
            </div>
            <div className="flex justify-between">
              <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Health Remaining:</span>
              <span className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{avgHealthRemaining ? avgHealthRemaining.toLocaleString() : 0}</span>
            </div>
            <div className="flex justify-between">
              <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Survival Rate:</span>
              <span className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{avgSurvivalRate.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Swaps (Tags):</span>
              <span className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{avgTags || 0}</span>
            </div>
          </div>
          
          {showSurvivalDetails && (
            <div className="mt-3 pt-3 border-t space-y-2 text-sm" style={{
              borderColor: darkMode ? 'rgba(134, 239, 172, 0.3)' : 'rgba(134, 239, 172, 0.5)'
            }}>
              <div className="flex justify-between">
                <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Guards:</span>
                <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{avgGuards || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Super Counters:</span>
                <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{avgSuperCounters || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Revenge Counters:</span>
                <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{avgRevengeCounters || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Z-Counters:</span>
                <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{avgZCounters || 0}</span>
              </div>
            </div>
          )}
          
          <button
            onClick={() => setShowSurvivalDetails(!showSurvivalDetails)}
            className={`mt-3 w-full py-1.5 px-3 rounded text-xs transition-colors ${
              darkMode
                ? 'bg-green-800/30 hover:bg-green-800/50 text-green-300'
                : 'bg-green-100 hover:bg-green-200 text-green-700'
            }`}
          >
            {showSurvivalDetails ? (
              <><ChevronUp className="w-3 h-3 inline mr-1" />Hide Details</>
            ) : (
              <><ChevronDown className="w-3 h-3 inline mr-1" />Show More</>
            )}
          </button>
        </div>
        
        {/* Special Abilities */}
        <div className={`p-4 rounded-lg border ${
          darkMode ? 'bg-purple-900/20 border-purple-600' : 'bg-purple-50 border-purple-200'
        }`}>
          <h4 className={`font-bold mb-3 flex items-center gap-2 ${
            darkMode ? 'text-purple-300' : 'text-purple-700'
          }`}>
            <Zap className="w-5 h-5" />
            Special Abilities
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Super 1 Blasts:</span>
              <span className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {avgS1HitBlast}/{avgS1Blast} ({avgS1HitRate}%)
              </span>
            </div>
            <div className="flex justify-between">
              <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Super 2 Blasts:</span>
              <span className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {avgS2HitBlast}/{avgS2Blast} ({avgS2HitRate}%)
              </span>
            </div>
            <div className="flex justify-between">
              <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Ultimate Blasts:</span>
              <span className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {avgUltHitBlast}/{avgUltBlast} ({avgUltHitRate}%)
              </span>
            </div>
            <div className="flex justify-between">
              <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Ki Blasts:</span>
              <span className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{avgEnergyBlasts}</span>
            </div>
          </div>
          
          {showSpecialAbilitiesDetails && (
            <div className="mt-3 pt-3 border-t space-y-2 text-sm" style={{
              borderColor: darkMode ? 'rgba(216, 180, 254, 0.3)' : 'rgba(216, 180, 254, 0.5)'
            }}>
              <div className="flex justify-between">
                <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Skill 1 Usage:</span>
                <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{avgExa1Count}</span>
              </div>
              <div className="flex justify-between">
                <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Skill 2 Usage:</span>
                <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{avgExa2Count}</span>
              </div>
              <div className="flex justify-between">
                <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Charges:</span>
                <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{avgCharges}</span>
              </div>
              <div className="flex justify-between">
                <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Sparking:</span>
                <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{avgSparkingCount}</span>
              </div>
              <div className="flex justify-between">
                <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Dragon Dash Mileage:</span>
                <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{Math.round(avgDragonDashDistance)}</span>
              </div>
            </div>
          )}
          
          <button
            onClick={() => setShowSpecialAbilitiesDetails(!showSpecialAbilitiesDetails)}
            className={`mt-3 w-full py-1.5 px-3 rounded-2x text-xs transition-colors ${
              darkMode
                ? 'bg-purple-800/30 hover:bg-purple-800/50 text-purple-300'
                : 'bg-purple-100 hover:bg-purple-200 text-purple-700'
            }`}
          >
            {showSpecialAbilitiesDetails ? (
              <><ChevronUp className="w-3 h-3 inline mr-1" />Hide Details</>
            ) : (
              <><ChevronDown className="w-3 h-3 inline mr-1" />Show More</>
            )}
          </button>
        </div>
      </div>
      
      {/* Character Compatibility */}
      <div className={`p-6 rounded-lg border ${
        darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-xl font-bold flex items-center gap-2 ${
            darkMode ? 'text-white' : 'text-gray-800'
          }`}>
            <Users className="w-5 h-5" />
            Character Compatibility
            {characterFiltered && selectedCharacter && (
              <span className={`ml-2 text-sm font-normal ${
                darkMode ? 'text-purple-400' : 'text-purple-600'
              }`}>
                (Showing: {selectedCharacter})
              </span>
            )}
          </h3>
          <div className="flex items-center gap-2">
            <select
              value={characterSortBy}
              onChange={(e) => setCharacterSortBy(e.target.value)}
              className={`text-sm px-3 py-1.5 rounded-lg border ${
                darkMode 
                  ? 'bg-slate-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="delta">Sort by Efficiency</option>
              <option value="winRate">Sort by Win Rate</option>
              <option value="matches">Sort by Usage</option>
            </select>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={`border-b ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                <th className={`text-left p-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Character</th>
                <th className={`text-right p-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Matches</th>
                <th className={`text-right p-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Win Rate</th>
                <th className={`text-right p-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Efficiency</th>
                <th className={`text-left p-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Most Used Build Type</th>
              </tr>
            </thead>
            <tbody>
              {displayedCharacters.map((char, idx) => {
                // Calculate efficiency based on win rate and damage performance
                const charEfficiency = damageEfficiency * (char.winRate / winRate);
                const efficiency = isFinite(charEfficiency) && charEfficiency > 0 ? charEfficiency : damageEfficiency;
                
                return (
                  <tr key={idx} className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    <td className={`p-2 font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {char.name}
                    </td>
                    <td className={`text-right p-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {char.matches}
                    </td>
                    <td className={`text-right p-2 font-bold ${
                      char.winRate >= 60 ? 'text-green-500'
                      : char.winRate >= 45 ? 'text-yellow-500'
                      : 'text-red-500'
                    }`}>
                      {char.winRate.toFixed(1)}%
                    </td>
                    <td className={`text-right p-2 font-bold ${
                      efficiency >= 1.25 ? 'text-green-500'
                      : efficiency >= 0.75 ? 'text-yellow-500'
                      : 'text-red-500'
                    }`}>
                      {efficiency.toFixed(2)}x
                    </td>
                    <td className={`text-left p-2`}>
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${getBuildTypeColor(char.mostUsedBuildType || 'N/A', darkMode)}`}>
                        {char.mostUsedBuildType || 'N/A'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {!showAllCharacters && sortedCharacters.length > 5 && (
          <button
            onClick={() => setShowAllCharacters(true)}
            className={`mt-4 w-full py-2 px-4 rounded-lg border transition-colors ${
              darkMode 
                ? 'bg-slate-600 border-gray-600 hover:bg-gray-600 text-gray-300' 
                : 'border-gray-300 hover:bg-gray-100 text-gray-700'
            }`}
          >
            <ChevronDown className="w-4 h-4 inline mr-2" />
            Show All {sortedCharacters.length} Characters
          </button>
        )}
        
        {showAllCharacters && (
          <button
            onClick={() => setShowAllCharacters(false)}
            className={`mt-4 w-full py-2 px-4 rounded-lg border transition-colors ${
              darkMode 
                ? 'bg-slate-600 border-gray-600 hover:bg-gray-600 text-gray-300' 
                : 'border-gray-300 hover:bg-gray-100 text-gray-700'
            }`}
          >
            <ChevronUp className="w-4 h-4 inline mr-2" />
            Show Top 5 Only
          </button>
        )}
      </div>
      
      {/* Build Type Distribution */}
      {buildTypeDistribution.length > 0 && (
        <div className={`p-4 rounded-lg border ${
          darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
        }`}>
          <h3 className={`text-lg font-bold mb-3 flex items-center gap-2 ${
            darkMode ? 'text-white' : 'text-gray-800'
          }`}>
            <BarChart3 className="w-4 h-4" />
            Build Type Preferences
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            {buildTypeDistribution.slice(0, 6).map((build, idx) => (
              <div key={idx} className={`p-3 rounded-lg border ${
                darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <div className="flex justify-between items-center mb-2">
                  <span className={`font-medium text-xs ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {build.buildType}
                  </span>
                  <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {build.percentage}%
                  </span>
                </div>
                <div className={`w-full h-1.5 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                  <div 
                    className="h-1.5 rounded-full bg-purple-500"
                    style={{ width: `${build.percentage}%` }}
                  />
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {build.count} matches
                  </span>
                  <span className={`text-xs font-bold ${
                    build.winRate >= 60 ? 'text-green-500'
                    : build.winRate >= 45 ? 'text-yellow-500'
                    : 'text-red-500'
                  }`}>
                    {build.winRate.toFixed(1)}% WR
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          {/* Average Build Costs */}
          <h4 className={`font-bold text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Average Build Cost Allocation
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
            <div>
              <div className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Melee:</div>
              <div className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{avgBuildCosts.melee}</div>
            </div>
            <div>
              <div className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Blast:</div>
              <div className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{avgBuildCosts.blast}</div>
            </div>
            <div>
              <div className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Ki Blast:</div>
              <div className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{avgBuildCosts.kiBlast}</div>
            </div>
            <div>
              <div className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Defense:</div>
              <div className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{avgBuildCosts.defense}</div>
            </div>
            <div>
              <div className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Skill:</div>
              <div className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{avgBuildCosts.skill}</div>
            </div>
            <div>
              <div className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Ki Efficiency:</div>
              <div className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{avgBuildCosts.kiEfficiency}</div>
            </div>
            <div>
              <div className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Utility:</div>
              <div className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{avgBuildCosts.utility}</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Top Capsules */}
      {topCapsules.length > 0 && (
        <div className={`p-4 rounded-lg border ${
          darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
        }`}>
          <h3 className={`text-lg font-bold mb-3 flex items-center gap-2 ${
            darkMode ? 'text-white' : 'text-gray-800'
          }`}>
            <Package className="w-4 h-4" />
            Most Used Capsules
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {topCapsules.map((capsule, idx) => (
              <div key={idx} className={`flex justify-between items-center p-3 rounded-lg border ${
                darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <div className="flex-1">
                  <div className={`font-medium text-xs ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {capsule.name}
                  </div>
                  <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Used {capsule.count} times
                  </div>
                </div>
                <div className={`text-xs font-bold ${
                  capsule.winRate >= 60 ? 'text-green-500'
                  : capsule.winRate >= 45 ? 'text-yellow-500'
                  : 'text-red-500'
                }`}>
                  {capsule.winRate.toFixed(1)}% WR
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      </div>
      {/* End Scrollable Content Area */}
    </div>
  );
}

