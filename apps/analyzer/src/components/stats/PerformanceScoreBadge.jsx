import React from 'react';
import { Star } from 'lucide-react';
import { getPerformanceLevel } from '../../utils/performanceLevel.js';

// Performance Score Badge Component
// Displays a large performance score with color coding based on level
export function PerformanceScoreBadge({ score, label = 'Score', size = 'medium', darkMode = false, allScores = [] }) {
  // Use relative scoring if allScores provided, otherwise use fixed thresholds
  let level;
  if (allScores && allScores.length > 0) {
    level = getPerformanceLevel(score, allScores);
  } else {
    // Fallback to fixed thresholds
    const getScoreLevel = (score) => {
      if (score >= 200) return 'excellent';  // Top tier performance
      if (score >= 120) return 'good';       // Strong performance
      if (score >= 80) return 'average';     // Decent performance
      if (score >= 40) return 'below-average'; // Weak performance
      return 'poor';                          // Very poor performance
    };
    level = getScoreLevel(score);
  }
  
  const colorClasses = {
    excellent: darkMode ? 'bg-green-900/30 text-green-300 border-green-600' : 'bg-green-100 text-green-700 border-green-300',
    good: darkMode ? 'bg-blue-900/30 text-blue-300 border-blue-600' : 'bg-blue-100 text-blue-700 border-blue-300',
    average: darkMode ? 'bg-yellow-900/30 text-yellow-300 border-yellow-600' : 'bg-yellow-100 text-yellow-700 border-yellow-300',
    'below-average': darkMode ? 'bg-orange-900/30 text-orange-300 border-orange-600' : 'bg-orange-100 text-orange-700 border-orange-300',
    poor: darkMode ? 'bg-red-900/30 text-red-300 border-red-600' : 'bg-red-100 text-red-700 border-red-300'
  };

  const sizeClasses = {
    'extra-small': 'text-xs px-1.5 py-0.5',
    small: 'text-sm px-2 py-0',
    medium: 'text-base px-3 py-1.5',
    large: 'text-lg px-4 py-2'
  };

  const iconSize = size === 'extra-small' ? 'w-3 h-3' : size === 'small' ? 'w-3 h-3' : size === 'medium' ? 'w-4 h-4' : 'w-5 h-5';
  
  return (
    <div className={`inline-flex items-center gap-1 rounded-lg border font-bold ${colorClasses[level]} ${sizeClasses[size]}`}>
      <Star className={iconSize} />
      <span>{label}: {Math.round(score)}</span>
    </div>
  );
}
