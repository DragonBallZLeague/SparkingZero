import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useFloating, autoUpdate, offset, flip } from '@floating-ui/react';
import { Package } from 'lucide-react';
import { getBuildTypeColor } from '../../utils/buildComposition.js';
import { BuildYamlButtons } from './BuildYamlButtons.jsx';

// Component to display character build information
export function BuildDisplay({ stats, showDetailed = false, darkMode = false }) {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  
  // Use floating-ui for proper tooltip positioning
  const { x, y, strategy, refs, floatingStyles } = useFloating({
    placement: 'left',
    middleware: [offset(10), flip()],
    whileElementsMounted: autoUpdate,
  });

  const handleMouseEnter = () => {
    setTooltipOpen(true);
  };

  const handleMouseLeave = () => {
    setTooltipOpen(false);
  };

  // Check if we have any build data to display
  const hasEquipment = stats.equippedCapsules && stats.equippedCapsules.length > 0;
  const hasAI = stats.aiStrategy && stats.aiStrategy !== 'Unknown' && stats.aiStrategy !== 'Com' && stats.aiStrategy !== 'Player';
  
  // If no equipment and no AI, show "No Equipment Data"
  if (!hasEquipment && !hasAI) {
    return (
      <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
        <div className="flex items-center gap-2 mb-2">
          <Package className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} />
          <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No Equipment Data</span>
        </div>
      </div>
    );
  }

  const getBuildColor = (archetype) => {
    if (archetype.includes('Aggressive')) return darkMode ? 'text-red-400 bg-red-900/30 border-red-600' : 'text-red-600 bg-red-50 border-red-200';
    if (archetype.includes('Defensive')) return darkMode ? 'text-green-400 bg-green-900/30 border-green-600' : 'text-green-600 bg-green-50 border-green-200';
    if (archetype.includes('Technical')) return darkMode ? 'text-blue-400 bg-blue-900/30 border-blue-600' : 'text-blue-600 bg-blue-50 border-blue-200';
    if (archetype.includes('Hybrid')) return darkMode ? 'text-purple-400 bg-purple-900/30 border-purple-600' : 'text-purple-600 bg-purple-50 border-purple-200';
    return darkMode ? 'text-gray-400 bg-gray-700 border-gray-600' : 'text-gray-600 bg-gray-50 border-gray-200';
  };

  /**
   * Get text color for build type names in tooltips
   */
  const getBuildTypeTextColor = (typeName) => {
    const type = typeName?.toLowerCase();
    const textColorMap = {
      'melee': darkMode ? 'text-red-400' : 'text-red-600',
      'blast': darkMode ? 'text-orange-400' : 'text-orange-600',
      'ki blast': darkMode ? 'text-yellow-400' : 'text-yellow-600',
      'defense': darkMode ? 'text-blue-400' : 'text-blue-600',
      'skill': darkMode ? 'text-purple-400' : 'text-purple-600',
      'ki efficiency': darkMode ? 'text-green-400' : 'text-green-600',
      'utility': darkMode ? 'text-gray-400' : 'text-gray-600',
    };
    return textColorMap[type] || (darkMode ? 'text-gray-300' : 'text-gray-700');
  };

  return (
    <div className={`space-y-2`}>
      {/* Build Composition (New System) - only show if we have equipment */}
      {stats.buildComposition && hasEquipment && (
        <div className="flex items-center justify-between">
          <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Build Type</span>
          <div
            ref={refs.setReference}
            className={`inline-block px-2 py-1 rounded text-xs font-medium border cursor-help ${getBuildTypeColor(stats.buildComposition, darkMode)}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {stats.buildComposition.label}
          </div>
        </div>
      )}

      {/* Tooltip Portal - renders in document.body */}
      {tooltipOpen && stats.buildComposition && hasEquipment && typeof document !== 'undefined' && createPortal(
        <div
          ref={refs.setFloating}
          style={{ ...floatingStyles, width: '16rem', zIndex: 10000 }}
          className={`p-3 rounded-lg shadow-xl border z-[10000] ${
            darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'
          }`}
        >
          <div className={`text-sm font-semibold mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
            Build Composition
          </div>
          <div className="space-y-1.5">
            {stats.buildComposition.breakdown
              .filter(item => item.cost > 0)
              .map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className={`font-medium ${getBuildTypeTextColor(item.name)}`}>
                    {item.name}:
                  </span>
                  <span className={`tabular-nums ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                    {item.cost} ({item.percent.toFixed(0)}%)
                  </span>
                </div>
              ))}
          </div>
          <div className={`mt-2 pt-2 border-t text-sm font-semibold ${
            darkMode ? 'border-gray-600 text-gray-200' : 'border-gray-300 text-gray-800'
          }`}>
            Total Cost: {stats.totalCapsuleCost}
          </div>
        </div>,
        document.body
      )}

      {/* AI Strategy - show in non-detailed view if no equipment but has AI */}
      {!showDetailed && hasAI && !hasEquipment && (
        <div className="flex items-center justify-between">
          <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>AI Strategy</span>
          <span className={`text-sm font-medium ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
            {stats.aiStrategy}
          </span>
        </div>
      )}
      
      {showDetailed && (
        <>
          {/* Capsules List - only show if we have equipment */}
          {hasEquipment && (
            <>
              <div className="space-y-1.5 pt-1">
                {stats.equippedCapsules.map((capsule, idx) => (
                  <div key={idx} className={`flex items-center justify-between text-xs p-1.5 rounded ${
                    darkMode ? 'bg-gray-600/50' : 'bg-gray-100'
                  }`}>
                    <span className={`${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                      {capsule.name}
                    </span>
                    <span className={`font-medium ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                      {capsule.capsule.cost}
                    </span>
                  </div>
                ))}
              </div>
              <div className={`flex items-center justify-between text-xs font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <span>Capsules ({stats.equippedCapsules.length})</span>
                <span>Total Cost: <span className={`font-medium ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>{stats.totalCapsuleCost}</span></span>
              </div>
            </>
          )}
          {/* AI Strategy - show if available */}
          {hasAI && (
            <div className="flex items-center justify-between">
              <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>AI Strategy</span>
              <span className={`text-sm font-medium ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                {stats.aiStrategy}
              </span>
            </div>
          )}
          {/* Show "No Capsules" message if AI exists but no equipment */}
          {hasAI && !hasEquipment && (
            <div className={`text-xs italic ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              No capsules equipped
            </div>
          )}
          {/* YAML export buttons — only show when there's something to export */}
          {(hasEquipment || hasAI) && (
            <BuildYamlButtons
              characterName={stats.name}
              capsules={stats.equippedCapsules}
              aiStrategy={stats.aiStrategy}
              darkMode={darkMode}
            />
          )}
        </>
      )}
    </div>
  );
}
