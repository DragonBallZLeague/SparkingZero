import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

// Stat Group Component
// Groups related stats under a header with icon
export function StatGroup({ title, icon: Icon, children, darkMode = false, collapsible = false, defaultCollapsed = false, iconColor = 'gray' }) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const iconColorClasses = {
    red: darkMode ? 'text-red-400' : 'text-red-600',
    green: darkMode ? 'text-green-400' : 'text-green-600',
    yellow: darkMode ? 'text-yellow-400' : 'text-yellow-600',
    purple: darkMode ? 'text-purple-400' : 'text-purple-600',
    gray: darkMode ? 'text-gray-300' : 'text-gray-600'
  };

  return (
    <div className={`${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'} rounded-lg p-3`}>
      <div 
        className={`flex items-center gap-2 mb-2 ${collapsible ? 'cursor-pointer' : ''}`}
        onClick={() => collapsible && setCollapsed(!collapsed)}
      >
        <Icon className={`w-4 h-4 ${iconColorClasses[iconColor]}`} />
        <span className={`text-sm font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
          {title}
        </span>
        {collapsible && (
          <div className="ml-auto">
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </div>
        )}
      </div>
      {!collapsed && <div>{children}</div>}
    </div>
  );
}
