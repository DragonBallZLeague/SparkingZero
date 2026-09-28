import React from 'react';
import { Eye, Star, Target, TrendingUp } from 'lucide-react';
import { getPerformanceLevel } from '../../utils/performanceLevel.js';

export function PerformanceIndicator({ value, allValues, type = 'damage', isInverse = false, darkMode = false, size = 'medium' }) {
  // For inverse, flip the values for robust stats
  let values = allValues;
  let val = value;
  if (isInverse) {
    const maxValue = Math.max(...allValues);
    values = allValues.map(v => maxValue - v);
    val = maxValue - value;
  }
  const level = getPerformanceLevel(val, values);
  let colorClass;
  switch (level) {
    case 'excellent':
      colorClass = darkMode ? 'bg-green-900/30 text-green-300 border-green-600' : 'bg-green-100 text-green-800 border-green-200';
      break;
    case 'good':
      colorClass = darkMode ? 'bg-blue-900/30 text-blue-300 border-blue-600' : 'bg-blue-100 text-blue-800 border-blue-200';
      break;
    case 'average':
      colorClass = darkMode ? 'bg-yellow-900/30 text-yellow-300 border-yellow-600' : 'bg-yellow-100 text-yellow-800 border-yellow-200';
      break;
    case 'below-average':
      colorClass = darkMode ? 'bg-red-900/30 text-red-300 border-red-600' : 'bg-red-100 text-red-800 border-red-200';
      break;
    default:
      colorClass = darkMode ? 'bg-gray-900/30 text-gray-300 border-gray-600' : 'bg-gray-100 text-gray-800 border-gray-200';
  }
  
  // Size configurations
  const sizeClasses = {
    'extra-small': { padding: 'px-1.5 py-0.5', text: 'text-xs', icon: 'w-3 h-3', gap: 'gap-1', border: 'border' },
    'small': { padding: 'px-2 py-1', text: 'text-sm', icon: 'w-3 h-3', gap: 'gap-1.5', border: 'border' },
    'medium': { padding: 'px-2 py-2', text: 'text-base', icon: 'w-4 h-4', gap: 'gap-2', border: 'border-2' },
    'large': { padding: 'px-3 py-2', text: 'text-lg', icon: 'w-5 h-5', gap: 'gap-2', border: 'border-2' }
  };
  
  const sizeConfig = sizeClasses[size] || sizeClasses['medium'];
  
  return (
    <span className={`inline-flex items-center ${sizeConfig.gap} ${sizeConfig.padding} rounded-lg ${sizeConfig.text} font-bold ${sizeConfig.border} ${colorClass}`}>
      <Star className={sizeConfig.icon} />
      <span>Score:</span>
      <span className={sizeConfig.text}>{Math.round(value)}</span>
    </span>
  );
}

// Performance Indicator Label Component (for combat stats)
// Displays performance level text like "EXCELLENT", "GOOD", etc.
export function PerformanceIndicatorLabel({ value, allValues, type = 'damage', isInverse = false, darkMode = false }) {
  // For inverse, flip the values for robust stats
  let values = allValues;
  let val = value;
  if (isInverse) {
    const maxValue = Math.max(...allValues);
    values = allValues.map(v => maxValue - v);
    val = maxValue - value;
  }
  const level = getPerformanceLevel(val, values);
  let colorClass, icon;
  switch (level) {
    case 'excellent':
      colorClass = darkMode ? 'bg-green-900/30 text-green-300 border-green-600' : 'bg-green-100 text-green-800 border-green-200';
      icon = <Star className="w-3 h-3" />;
      break;
    case 'good':
      colorClass = darkMode ? 'bg-blue-900/30 text-blue-300 border-blue-600' : 'bg-blue-100 text-blue-800 border-blue-200';
      icon = <TrendingUp className="w-3 h-3" />;
      break;
    case 'average':
      colorClass = darkMode ? 'bg-yellow-900/30 text-yellow-300 border-yellow-600' : 'bg-yellow-100 text-yellow-800 border-yellow-200';
      icon = <Eye className="w-3 h-3" />;
      break;
    case 'below-average':
      colorClass = darkMode ? 'bg-red-900/30 text-red-300 border-red-600' : 'bg-red-100 text-red-800 border-red-200';
      icon = <Target className="w-3 h-3" />;
      break;
    default:
      colorClass = darkMode ? 'bg-gray-900/30 text-gray-300 border-gray-600' : 'bg-gray-100 text-gray-800 border-gray-200';
      icon = <Target className="w-3 h-3" />;
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${colorClass}`}>
      {icon}
      {level.toUpperCase()}
    </span>
  );
}
