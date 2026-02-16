import React from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

/**
 * InsightCard Component
 * 
 * Displays a single insight with appropriate styling based on type
 */
export default function InsightCard({ insight, darkMode = false }) {
  const { type, emoji, text } = insight;
  
  // Get styling based on insight type
  const getCardStyle = () => {
    switch (type) {
      case 'success':
        return darkMode
          ? 'bg-green-900/20 border-green-600 text-green-300'
          : 'bg-green-50 border-green-200 text-green-700';
      case 'warning':
        return darkMode
          ? 'bg-yellow-900/20 border-yellow-600 text-yellow-300'
          : 'bg-yellow-50 border-yellow-200 text-yellow-700';
      case 'danger':
        return darkMode
          ? 'bg-red-900/20 border-red-600 text-red-300'
          : 'bg-red-50 border-red-200 text-red-700';
      case 'info':
      default:
        return darkMode
          ? 'bg-blue-900/20 border-blue-600 text-blue-300'
          : 'bg-blue-50 border-blue-200 text-blue-700';
    }
  };
  
  const getIcon = () => {
    const iconClass = "w-4 h-4 flex-shrink-0";
    
    switch (type) {
      case 'success':
        return <CheckCircle className={iconClass} />;
      case 'warning':
        return <AlertTriangle className={iconClass} />;
      case 'danger':
        return <AlertCircle className={iconClass} />;
      case 'info':
      default:
        return <Info className={iconClass} />;
    }
  };
  
  return (
    <div
      className={`p-3 rounded-lg border ${getCardStyle()} transition-all hover:shadow-md`}
    >
      <div className="flex items-start gap-2">
        {emoji && <span className="text-lg flex-shrink-0">{emoji}</span>}
        {!emoji && getIcon()}
        <span className="text-sm font-medium leading-snug">{text}</span>
      </div>
    </div>
  );
}
