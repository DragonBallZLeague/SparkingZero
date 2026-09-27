import React from 'react';
import { Target } from 'lucide-react';
import { formatNumber } from '../../utils/formatters.js';

// Small stat bar used in the match panels
export function StatBar({ value, maxValue, displayValue, type = 'damage', isInverse = false, label = '', icon: Icon = Target, darkMode = false }) {
  const percentage = Math.min((value / maxValue) * 100, 100);
  const displayPercentage = isInverse ? 100 - percentage : percentage;
  const actualDisplayValue = displayValue !== undefined ? displayValue : value;

  const getColorClass = () => {
    switch (type) {
      case 'damage': return 'bg-red-500';
      case 'health': return 'bg-green-500';
      case 'special': return 'bg-purple-500';
      case 'ultimate': return 'bg-orange-500';
      case 'taken': return 'bg-blue-500';
      case 'time': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`} />
        <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{label}</span>
      </div>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{formatNumber(actualDisplayValue)}</span>
      </div>
      <div className={`w-full rounded-full h-2 ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${getColorClass()}`}
          style={{ width: `${displayPercentage}%` }}
        />
      </div>
    </div>
  );
}
