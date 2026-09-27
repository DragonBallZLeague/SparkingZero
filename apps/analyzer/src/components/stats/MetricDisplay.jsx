import React from 'react';

// Metric Display Component
// Displays a single metric with label and value
export function MetricDisplay({ label, value, icon: Icon, color = 'gray', darkMode = false, size = 'medium' }) {
  const colorClasses = {
    red: darkMode ? 'text-red-400' : 'text-red-600',
    blue: darkMode ? 'text-blue-400' : 'text-blue-600',
    green: darkMode ? 'text-green-400' : 'text-green-600',
    yellow: darkMode ? 'text-yellow-400' : 'text-yellow-600',
    purple: darkMode ? 'text-purple-400' : 'text-purple-600',
    orange: darkMode ? 'text-orange-400' : 'text-orange-600',
    teal: darkMode ? 'text-teal-400' : 'text-teal-600',
    violet: darkMode ? 'text-violet-300' : 'text-violet-600',
    gray: darkMode ? 'text-gray-400' : 'text-gray-600'
  };

  const sizeClasses = {
    small: { label: 'text-xs', value: 'text-sm' },
    medium: { label: 'text-sm', value: 'text-base font-bold' },
    large: { label: 'text-sm', value: 'text-lg font-bold' }
  };

  return (
    <div className="flex items-center justify-between">
      <span className={`${sizeClasses[size].label} ${darkMode ? 'text-gray-400' : 'text-gray-600'} flex items-center gap-1`}>
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </span>
      <span className={`${sizeClasses[size].value} ${colorClasses[color]}`}>
        {value}
      </span>
    </div>
  );
}

// Blast Metric Display Component
// Displays blast tracking with hit/thrown/rate format: "X/Y (Z%)"
// Legacy mode displays only thrown count (for old JSON format without hit data)
export function BlastMetricDisplay({ label, thrown, hit, hitRate, color = 'blue', darkMode = false, size = 'medium', legacyMode = false }) {
  const getColorClass = () => {
    const colors = {
      orange: darkMode ? 'text-orange-400' : 'text-orange-600',
      red: darkMode ? 'text-red-400' : 'text-red-600',
      yellow: darkMode ? 'text-yellow-400' : 'text-yellow-600',
      purple: darkMode ? 'text-purple-400' : 'text-purple-600',
      blue: darkMode ? 'text-blue-400' : 'text-blue-600',
      cyan: darkMode ? 'text-cyan-400' : 'text-cyan-600',
    };
    return colors[color] || colors.blue;
  };

  const getRateColorClass = () => {
    // If no blasts thrown (hitRate is null), use gray
    if (hitRate === null) return darkMode ? 'text-gray-400' : 'text-gray-600';
    if (hitRate >= 70) return darkMode ? 'text-green-400' : 'text-green-600';
    if (hitRate >= 50) return darkMode ? 'text-yellow-400' : 'text-yellow-600';
    return darkMode ? 'text-red-400' : 'text-red-600';
  };

  const sizeClasses = {
    small: { label: 'text-xs', value: 'text-sm' },
    medium: { label: 'text-sm', value: 'text-base font-bold' },
    large: { label: 'text-sm', value: 'text-lg font-bold' }
  };

  // Legacy mode - display only thrown count (old JSON format)
  if (legacyMode) {
    return (
      <div className="flex items-center justify-between">
        <span className={`${sizeClasses[size].label} ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {label}
        </span>
        <span className={`${sizeClasses[size].value} ${getColorClass()}`}>
          {thrown || 0}
        </span>
      </div>
    );
  }

  // New format - display hit/thrown/rate
  return (
    <div className={`flex items-center justify-between p-2 rounded ${
      darkMode ? 'bg-gray-800/50' : 'bg-gray-100'
    }`}>
      <span className={`${sizeClasses[size].label} font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        {label}
      </span>
      <div className="flex items-center gap-2">
        <span className={`font-mono font-bold ${sizeClasses[size].value} ${getColorClass()}`}>
          {hit}/{thrown}
        </span>
        <span className={`font-mono font-bold ${sizeClasses[size].value} ${getRateColorClass()}`}>
          ({hitRate !== null ? `${hitRate.toFixed(1)}%` : 'N/A'})
        </span>
      </div>
    </div>
  );
}
