import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Star } from 'lucide-react';
import { calculatePerFormStats, formatPerFormStatsForDisplay } from '../utils/formStatsCalculator';

/**
 * Format number with commas
 */
function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return Math.round(num).toLocaleString();
}

/**
 * Compact table row for a single form's stats
 */
function FormStatRow({ formStat, darkMode }) {
  // Final form gets visually distinct styling
  const rowBg = formStat.isFinalForm
    ? (darkMode ? 'bg-blue-900/20' : 'bg-blue-50')
    : (darkMode ? 'bg-gray-700' : 'bg-white');
  
  const textColor = darkMode ? 'text-gray-300' : 'text-gray-700';
  const boldColor = darkMode ? 'text-white' : 'text-gray-900';

  return (
    <tr className={`${rowBg} border-b ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
      {/* Form Number & Name */}
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
            darkMode ? 'bg-yellow-900/40 text-yellow-300' : 'bg-yellow-100 text-yellow-800'
          }`}>
            {formStat.formNumber}
          </span>
          <span className={`text-sm font-semibold ${boldColor}`}>
            {formStat.characterName}
          </span>
          {formStat.isFinalForm && (
            <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${
              darkMode ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-100 text-blue-800'
            }`}>
              Final
            </span>
          )}
        </div>
      </td>
      
      {/* Damage Done */}
      <td className={`px-3 py-2 text-sm text-right ${textColor}`}>
        {formatNumber(formStat.damageDone)}
      </td>
      
      {/* Damage Taken */}
      <td className={`px-3 py-2 text-sm text-right ${textColor}`}>
        {formatNumber(formStat.damageTaken)}
      </td>
      
      {/* Efficiency */}
      <td className={`px-3 py-2 text-sm text-right ${textColor}`}>
        {formStat.damageEfficiency.toFixed(2)}×
      </td>
      
      {/* DPS */}
      <td className={`px-3 py-2 text-sm text-right ${textColor}`}>
        {Math.round(formStat.damagePerSecond).toLocaleString()}
      </td>
      
      {/* Time */}
      <td className={`px-3 py-2 text-sm text-right ${textColor}`}>
        {Math.round(formStat.battleTime)}s
      </td>
      
      {/* HP */}
      <td className={`px-3 py-2 text-sm text-right ${textColor}`}>
        {formatNumber(formStat.hpRemaining)}
      </td>
      
      {/* Specials */}
      <td className={`px-3 py-2 text-sm text-right ${textColor}`}>
        {formStat.specialMovesUsed}
      </td>
      
      {/* Ultimates */}
      <td className={`px-3 py-2 text-sm text-right ${textColor}`}>
        {formStat.ultimatesUsed}
      </td>
      
      {/* S1 Blasts */}
      <td className={`px-3 py-2 text-sm text-right ${textColor}`}>
        {formStat.s1Blast > 0 ? `${formStat.s1HitBlast}/${formStat.s1Blast}` : '-'}
      </td>
      
      {/* S2 Blasts */}
      <td className={`px-3 py-2 text-sm text-right ${textColor}`}>
        {formStat.s2Blast > 0 ? `${formStat.s2HitBlast}/${formStat.s2Blast}` : '-'}
      </td>
      
      {/* Ult Blasts */}
      <td className={`px-3 py-2 text-sm text-right ${textColor}`}>
        {formStat.ultBlast > 0 ? `${formStat.uLTHitBlast}/${formStat.ultBlast}` : '-'}
      </td>
      
      {/* Kills */}
      <td className={`px-3 py-2 text-sm text-right ${textColor}`}>
        {formStat.kills}
      </td>
    </tr>
  );
}

/**
 * Expandable per-form stats display component (Table Format)
 * Displays detailed stat breakdown for each form a character used
 */
export function PerFormStatsDisplay({ 
  characterRecord, 
  characterIdRecord, 
  formChangeHistory, 
  formChangeHistoryText,
  originalCharacterId,
  charMap,
  darkMode
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Don't show if no transformations occurred
  if (!formChangeHistory || formChangeHistory.length === 0) {
    return null;
  }
  
  // Calculate per-form stats
  const perFormStats = calculatePerFormStats(
    characterRecord, 
    characterIdRecord, 
    formChangeHistory,
    originalCharacterId
  );
  
  // Format for display
  const displayStats = formatPerFormStatsForDisplay(perFormStats, charMap);
  
  // If calculation failed, don't render
  if (!displayStats || displayStats.length === 0) {
    return null;
  }
  
  return (
    <div className={`mt-3 rounded-lg border-2 ${
      darkMode 
        ? 'bg-yellow-900/20 border-yellow-700' 
        : 'bg-yellow-50 border-yellow-200'
    }`}>
      {/* Header - Clickable */}
      <div 
        className={`p-3 flex items-center justify-between cursor-pointer transition-colors rounded-lg ${
          darkMode ? 'hover:bg-yellow-900/30' : 'hover:bg-yellow-100'
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Star className={`w-4 h-4 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
          <span className={`text-sm font-semibold ${darkMode ? 'text-yellow-300' : 'text-yellow-800'}`}>
            Forms Used ({formChangeHistory.length + 1} total)
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className={`w-4 h-4 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
        ) : (
          <ChevronDown className={`w-4 h-4 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
        )}
      </div>
      
      {/* Summary Text - Always visible */}
      <div className={`px-3 ${!isExpanded ? 'pb-3' : 'pb-2'} text-sm ${
        darkMode ? 'text-gray-400' : 'text-gray-500'
      }`}>
        {formChangeHistoryText}
      </div>
      
      {/* Expanded Per-Form Table */}
      {isExpanded && (
        <div className={`overflow-x-auto border-t ${
          darkMode ? 'border-yellow-700' : 'border-yellow-200'
        }`}>
          <table className="w-full text-sm">
            <thead className={`${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
              <tr className={`border-b ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                <th className={`px-3 py-2 text-left font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Form</th>
                <th className={`px-3 py-2 text-right font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Dmg Done</th>
                <th className={`px-3 py-2 text-right font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Dmg Taken</th>
                <th className={`px-3 py-2 text-right font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Efficiency</th>
                <th className={`px-3 py-2 text-right font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>DPS</th>
                <th className={`px-3 py-2 text-right font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Time</th>
                <th className={`px-3 py-2 text-right font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>HP Left</th>
                <th className={`px-3 py-2 text-right font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>SPMs</th>
                <th className={`px-3 py-2 text-right font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Ults</th>
                <th className={`px-3 py-2 text-right font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>S1</th>
                <th className={`px-3 py-2 text-right font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>S2</th>
                <th className={`px-3 py-2 text-right font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>UB</th>
                <th className={`px-3 py-2 text-right font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>KOs</th>
              </tr>
            </thead>
            <tbody>
              {displayStats.map((formStat, idx) => (
                <FormStatRow 
                  key={idx}
                  formStat={formStat}
                  darkMode={darkMode}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/**
 * Compact table row for aggregated form stats
 */
function FormStatRowAggregated({ formStat, darkMode }) {
  // Final form gets visually distinct styling
  const rowBg = formStat.isFinalForm
    ? (darkMode ? 'bg-blue-900/20' : 'bg-blue-50')
    : (darkMode ? 'bg-gray-700' : 'bg-white');
  
  const textColor = darkMode ? 'text-gray-300' : 'text-gray-700';
  const boldColor = darkMode ? 'text-white' : 'text-gray-900';

  return (
    <tr className={`${rowBg} border-b ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
      {/* Form Number & Name */}
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
            darkMode ? 'bg-yellow-900/40 text-yellow-300' : 'bg-yellow-100 text-yellow-800'
          }`}>
            {formStat.formNumber}
          </span>
          <span className={`text-sm font-semibold ${boldColor}`}>
            {formStat.name}
          </span>
          {formStat.isFinalForm && (
            <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${
              darkMode ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-100 text-blue-800'
            }`}>
              Final
            </span>
          )}
        </div>
      </td>
      
      {/* Avg Damage Done */}
      <td className={`px-3 py-2 text-sm text-right ${textColor}`}>
        {formatNumber(formStat.avgDamageDone)}
      </td>
      
      {/* Avg Damage Taken */}
      <td className={`px-3 py-2 text-sm text-right ${textColor}`}>
        {formatNumber(formStat.avgDamageTaken)}
      </td>
      
      {/* Efficiency */}
      <td className={`px-3 py-2 text-sm text-right ${textColor}`}>
        {formStat.damageEfficiency.toFixed(2)}×
      </td>
      
      {/* DPS */}
      <td className={`px-3 py-2 text-sm text-right ${textColor}`}>
        {Math.round(formStat.damagePerSecond).toLocaleString()}
      </td>
      
      {/* Time */}
      <td className={`px-3 py-2 text-sm text-right ${textColor}`}>
        {Math.round(formStat.avgBattleTime)}s
      </td>
      
      {/* HP */}
      <td className={`px-3 py-2 text-sm text-right ${textColor}`}>
        {formatNumber(formStat.avgHPRemaining)}
      </td>
      
      {/* Specials */}
      <td className={`px-3 py-2 text-sm text-right ${textColor}`}>
        {formStat.avgSpecialMoves?.toFixed(1) || '0.0'}
      </td>
      
      {/* Ultimates */}
      <td className={`px-3 py-2 text-sm text-right ${textColor}`}>
        {formStat.avgUltimates?.toFixed(1) || '0.0'}
      </td>
      
      {/* S1 Blasts */}
      <td className={`px-3 py-2 text-sm text-right ${textColor}`}>
        {formStat.avgS1Blast > 0 ? `${formStat.avgS1HitBlast?.toFixed(1)}/${formStat.avgS1Blast?.toFixed(1)}` : '-'}
      </td>
      
      {/* S2 Blasts */}
      <td className={`px-3 py-2 text-sm text-right ${textColor}`}>
        {formStat.avgS2Blast > 0 ? `${formStat.avgS2HitBlast?.toFixed(1)}/${formStat.avgS2Blast?.toFixed(1)}` : '-'}
      </td>
      
      {/* Ult Blasts */}
      <td className={`px-3 py-2 text-sm text-right ${textColor}`}>
        {formStat.avgUltBlast > 0 ? `${formStat.avgULTHitBlast?.toFixed(1)}/${formStat.avgUltBlast?.toFixed(1)}` : '-'}
      </td>
      
      {/* Kills */}
      <td className={`px-3 py-2 text-sm text-right ${textColor}`}>
        {formStat.avgKills?.toFixed(1) || '0.0'}
      </td>
    </tr>
  );
}

/**
 * Aggregated per-form stats display component (Table Format)
 * Used in Aggregated Stats view where data is already averaged across matches
 */
export function PerFormStatsDisplayAggregated({ 
  formStatsArray,
  formChangeHistoryText,
  darkMode
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Don't show if no form stats
  if (!formStatsArray || formStatsArray.length === 0) {
    return null;
  }
  
  // Sort by form number
  const sortedForms = [...formStatsArray].sort((a, b) => a.formNumber - b.formNumber);
  
  return (
    <div className={`rounded-lg border-2 ${
      darkMode 
        ? 'bg-yellow-900/20 border-yellow-700' 
        : 'bg-yellow-50 border-yellow-200'
    }`}>
      {/* Header - Clickable */}
      <div 
        className={`p-3 flex items-center justify-between cursor-pointer transition-colors rounded-lg ${
          darkMode ? 'hover:bg-yellow-900/30' : 'hover:bg-yellow-100'
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Star className={`w-4 h-4 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
          <span className={`text-sm font-semibold ${darkMode ? 'text-yellow-300' : 'text-yellow-800'}`}>
            Forms Used ({sortedForms.length} total)
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className={`w-4 h-4 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
        ) : (
          <ChevronDown className={`w-4 h-4 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
        )}
      </div>
      
      {/* Summary Text - Always visible */}
      <div className={`px-3 ${!isExpanded ? 'pb-3' : 'pb-2'} text-sm ${
        darkMode ? 'text-gray-400' : 'text-gray-500'
      }`}>
        {formChangeHistoryText || sortedForms.map(f => f.name).join(', ')}
      </div>
      
      {/* Expanded Per-Form Table */}
      {isExpanded && (
        <div className={`overflow-x-auto border-t ${
          darkMode ? 'border-yellow-700' : 'border-yellow-200'
        }`}>
          <table className="w-full text-sm">
            <thead className={`${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
              <tr className={`border-b ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                <th className={`px-3 py-2 text-left font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Form</th>
                <th className={`px-3 py-2 text-right font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Avg Dmg</th>
                <th className={`px-3 py-2 text-right font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Avg Taken</th>
                <th className={`px-3 py-2 text-right font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Efficiency</th>
                <th className={`px-3 py-2 text-right font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>DPS</th>
                <th className={`px-3 py-2 text-right font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Time</th>
                <th className={`px-3 py-2 text-right font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>HP Left</th>
                <th className={`px-3 py-2 text-right font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>SPMs</th>
                <th className={`px-3 py-2 text-right font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Ults</th>
                <th className={`px-3 py-2 text-right font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>S1</th>
                <th className={`px-3 py-2 text-right font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>S2</th>
                <th className={`px-3 py-2 text-right font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>UB</th>
                <th className={`px-3 py-2 text-right font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>KOs</th>
              </tr>
            </thead>
            <tbody>
              {sortedForms.map((formStat, idx) => (
                <FormStatRowAggregated 
                  key={idx}
                  formStat={formStat}
                  darkMode={darkMode}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
