import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * ActionComparisonBar Component
 * 
 * Displays a visual comparison bar for action frequency
 */
export default function ActionComparisonBar({ actionInsight, darkMode = false }) {
  const { action, emoji, value, percentile, label, comparison, diff, isSignature, isRare } = actionInsight;
  
  // Get color based on percentile
  const getBarColor = () => {
    if (isSignature) return darkMode ? 'bg-purple-500' : 'bg-purple-600';
    if (percentile >= 75) return darkMode ? 'bg-green-500' : 'bg-green-600';
    if (percentile >= 60) return darkMode ? 'bg-blue-500' : 'bg-blue-600';
    if (percentile >= 40) return darkMode ? 'bg-gray-500' : 'bg-gray-600';
    if (isRare) return darkMode ? 'bg-orange-500' : 'bg-orange-600';
    return darkMode ? 'bg-red-500' : 'bg-red-600';
  };
  
  const getLabelColor = () => {
    if (isSignature) return darkMode ? 'text-purple-400' : 'text-purple-600';
    if (percentile >= 75) return darkMode ? 'text-green-400' : 'text-green-600';
    if (percentile >= 60) return darkMode ? 'text-blue-400' : 'text-blue-600';
    if (percentile >= 40) return darkMode ? 'text-gray-400' : 'text-gray-600';
    if (isRare) return darkMode ? 'text-orange-400' : 'text-orange-600';
    return darkMode ? 'text-red-400' : 'text-red-600';
  };
  
  const getTrendIcon = () => {
    if (percentile >= 55) return <TrendingUp className="w-3 h-3" />;
    if (percentile <= 45) return <TrendingDown className="w-3 h-3" />;
    return <Minus className="w-3 h-3" />;
  };
  
  const getBadgeText = () => {
    if (isSignature) return 'Signature';
    if (isRare) return 'Rarely Used';
    return label;
  };
  
  return (
    <div className={`p-3 rounded-lg border ${
      darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">{emoji}</span>
          <span className={`font-medium text-sm ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            {action}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold ${getLabelColor()}`}>
            {value}
          </span>
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
            darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
          }`}>
            {getBadgeText()}
          </span>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className={`w-full h-2 rounded-full mb-2 ${
        darkMode ? 'bg-gray-700' : 'bg-gray-200'
      }`}>
        <div
          className={`h-2 rounded-full transition-all ${getBarColor()}`}
          style={{ width: `${percentile}%` }}
        />
      </div>
      
      {/* Comparison Text */}
      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-1 text-xs ${getLabelColor()}`}>
          {getTrendIcon()}
          <span>{comparison}</span>
        </div>
        <span className={`text-xs font-medium ${
          darkMode ? 'text-gray-400' : 'text-gray-600'
        }`}>
          {diff} vs avg
        </span>
      </div>
    </div>
  );
}
