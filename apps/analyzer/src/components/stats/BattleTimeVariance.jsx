import React from 'react';
import { Clock } from 'lucide-react';
import { formatBattleTime } from '../../utils/statCalculations.js';

// Calculate performance score for a single match character
// Component to show battle time variance from average
export function BattleTimeVariance({ value, averageValue, darkMode = false }) {
  const variance = value - averageValue;
  const isAbove = variance > 0;
  const absVariance = Math.abs(variance);
  
  if (Math.abs(variance) < 1) {
    return (
      <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
        <div className="flex items-center gap-2 mb-2">
          <Clock className={`w-4 h-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`} />
          <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Battle Time</span>
        </div>
        <div className="flex items-center justify-between">
          <span className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{formatBattleTime(value)}</span>
          <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>~Average</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
      <div className="flex items-center gap-2 mb-2">
        <Clock className={`w-4 h-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`} />
        <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Battle Time</span>
      </div>
      <div className="flex items-center justify-between">
        <span className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{formatBattleTime(value)}</span>
        <span className={`text-xs font-medium ${isAbove ? 'text-blue-400' : 'text-red-400'}`}>
          {isAbove ? '+' : '-'}{formatBattleTime(absVariance)} {isAbove ? 'longer' : 'shorter'}
        </span>
      </div>
    </div>
  );
}
