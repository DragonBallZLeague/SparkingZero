import React from 'react';
import { Brain, TrendingUp, Users, Target, Shield, Zap, AlertCircle, Package, User } from 'lucide-react';
import { getBuildTypeColor } from '../../App';

/**
 * AIStrategyCard Component
 * 
 * Displays a single AI strategy as a card with key metrics
 * Clicking the card opens the detailed analysis panel
 */
export default function AIStrategyCard({ 
  aiMetrics, 
  darkMode = false, 
  onClick,
  characterFiltered = false,
  selectedCharacter = null
}) {
  const {
    name,
    type,
    totalMatches,
    usageRate,
    winRate,
    combatPerformanceScore,
    uniqueCharacters,
    characterUsage,
    dataQuality,
    avgDamageDealt,
    avgDamageTaken,
    damageEfficiency,
    buildTypeDistribution,
    avgBattleTime,
    avgDPS
  } = aiMetrics;
  
  // Format battle time (M:SS)
  const formatBattleTime = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Get badge color based on type
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
  
  // Get win rate color
  const getWinRateColor = () => {
    if (winRate >= 60) {
      return darkMode ? 'text-green-400' : 'text-green-600';
    } else if (winRate >= 45) {
      return darkMode ? 'text-yellow-400' : 'text-yellow-600';
    } else {
      return darkMode ? 'text-red-400' : 'text-red-600';
    }
  };
  
  // Get performance score color
  const getPerformanceColor = () => {
    if (combatPerformanceScore >= 70) {
      return darkMode ? 'text-green-400' : 'text-green-600';
    } else if (combatPerformanceScore >= 50) {
      return darkMode ? 'text-yellow-400' : 'text-yellow-600';
    } else {
      return darkMode ? 'text-orange-400' : 'text-orange-600';
    }
  };
  
  // Get confidence badge
  const getConfidenceBadge = () => {
    const { confidence, sampleSize } = dataQuality;
    
    if (confidence === 'Low') {
      return (
        <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded border ${
          darkMode 
            ? 'bg-yellow-900/30 text-yellow-300 border-yellow-700' 
            : 'bg-yellow-50 text-yellow-700 border-yellow-300'
        }`}>
          <AlertCircle className="w-3 h-3" />
          Low Data
        </div>
      );
    }
    return null;
  };
  
  // Get top character
  const topCharacter = characterUsage && characterUsage.length > 0 ? characterUsage[0] : null;
  
  // Calculate efficiency
  const efficiency = avgDamageTaken > 0 ? (avgDamageDealt / avgDamageTaken).toFixed(2) : '∞';
  
  return (
    <div
      onClick={onClick}
      className={`
        rounded-xl p-5 border-2 cursor-pointer transition-all duration-200
        hover:scale-[1.02] hover:shadow-xl
        ${darkMode 
          ? 'bg-gray-700 border-gray-600 hover:border-purple-500' 
          : 'bg-white border-gray-200 hover:border-purple-400 hover:shadow-purple-200'
        }
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className={`text-sm font-bold mb-1 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            {name}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${getBadgeColor()}`}>
              {type}
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
            {getConfidenceBadge()}
          </div>
        </div>
        <Brain className={`w-6 h-6 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
      </div>
      
      {/* Match Count & Usage */}
      <div className={`text-xs mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        <div className="flex items-center justify-between">
          <span>{totalMatches} matches</span>
          <span>{usageRate}% usage</span>
        </div>
        <div className={`w-full h-1 rounded-full mt-1 ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
          <div 
            className="h-1 rounded-full bg-purple-500"
            style={{ width: `${Math.min(usageRate * 5, 100)}%` }}
          />
        </div>
      </div>
      
      {/* Top Metrics Row - Win Rate, Performance, Unique Characters */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="text-center">
          <div className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Win Rate
          </div>
          <div className={`text-3xl font-bold ${getWinRateColor()}`}>
            {winRate}%
          </div>
        </div>
        <div className="text-center">
          <div 
            className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'} cursor-help`}
            title="Performance Score = (Damage Ratio × 30) + (Win Rate × 0.5) + (Survival Rate × 0.2)"
          >
            Performance
          </div>
          <div className={`text-3xl font-bold ${getPerformanceColor()}`}>
            {combatPerformanceScore}
          </div>
        </div>
        <div className="text-center">
          <div className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Characters
          </div>
          <div className={`text-3xl font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
            {uniqueCharacters}
          </div>
        </div>
      </div>
      
      {/* Secondary Metrics Row - Damage, DPS, Efficiency, Battle Time */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <div className="text-center">
          <div className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Avg Damage
          </div>
          <div className={`text-lg font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
            {(avgDamageDealt / 1000).toFixed(1)}k
          </div>
        </div>
        <div className="text-center">
          <div className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Damage/Sec
          </div>
          <div className={`text-lg font-bold ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
            {(avgDPS || 0).toFixed(0)}
          </div>
        </div>
        <div className="text-center">
          <div className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Efficiency
          </div>
          <div className={`text-lg font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
            {efficiency}x
          </div>
        </div>
        <div className="text-center">
          <div className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Battle Time
          </div>
          <div className={`text-lg font-bold ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
            {formatBattleTime(avgBattleTime)}
          </div>
        </div>
      </div>
      
      {/* Top Character */}
      {topCharacter && (
        <div className={`
          p-2 rounded-lg border text-xs
          ${darkMode 
            ? 'bg-gray-800 border-gray-600 text-gray-300' 
            : 'bg-gray-50 border-gray-200 text-gray-700'
          }
        `}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span className="font-medium truncate">{topCharacter.name}</span>
            </div>
            <span className={`font-bold ${
              topCharacter.winRate >= 60 
                ? darkMode ? 'text-green-400' : 'text-green-600'
                : darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {topCharacter.winRate}% WR
            </span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
              {topCharacter.matches} matches
            </div>
            {topCharacter.mostUsedBuildType && (
              <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium border ${getBuildTypeColor(topCharacter.mostUsedBuildType, darkMode)}`}>
                {topCharacter.mostUsedBuildType}
              </span>
            )}
          </div>
        </div>
      )}
      
      {/* Click indicator */}
      <div className={`
        text-xs text-center mt-3 pt-2 border-t font-medium
        ${darkMode 
          ? 'border-gray-600 text-purple-400' 
          : 'border-gray-200 text-purple-600'
        }
      `}>
        Click for detailed analysis →
      </div>
    </div>
  );
}
