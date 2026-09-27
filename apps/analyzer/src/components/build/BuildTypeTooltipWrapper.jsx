import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useFloating, autoUpdate, offset, flip } from '@floating-ui/react';
import { getBuildTypeColor } from '../../utils/buildComposition.js';
import { BuildYamlButtons } from './BuildYamlButtons.jsx';

// Component to display build type with tooltip for team rankings
export function BuildTypeTooltipWrapper({ buildComposition, aiStrategy, count, equippedCapsules, totalCapsuleCost, darkMode, tooltipKey, characterName }) {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  
  const { refs, floatingStyles } = useFloating({
    placement: 'left',
    middleware: [offset(10), flip()],
    whileElementsMounted: autoUpdate,
  });

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
    <div className="space-y-2">
      {/* Build Type */}
      <div className="flex items-center justify-between">
        <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Build Type:</span>
        <div
          ref={refs.setReference}
          className={`inline-block px-2 py-1 rounded text-xs font-medium border cursor-help ${getBuildTypeColor(buildComposition, darkMode)}`}
          onMouseEnter={() => setTooltipOpen(true)}
          onMouseLeave={() => setTooltipOpen(false)}
        >
          {buildComposition?.label || 'Unknown'}
        </div>
      </div>

      {/* Tooltip Portal */}
      {tooltipOpen && buildComposition && typeof document !== 'undefined' && createPortal(
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
            {buildComposition.breakdown
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
        </div>,
        document.body
      )}

      {/* Capsules List */}
      {equippedCapsules && equippedCapsules.length > 0 && (
        <>
          <div className="space-y-1 pt-1 px-5">
            {equippedCapsules.map((capsule, idx) => (
              <div key={idx} className={`flex items-center justify-between text-sm py-1.5 rounded border-b ${
                darkMode
                  ? 'text-gray-200 border-gray-500/25'
                  : 'text-gray-700 border-gray-400/20'
              }`}>
                <span>{capsule.name}</span>
                <span className={`font-medium ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                  {capsule.capsule.cost}
                </span>
              </div>
            ))}
          </div>
          <div className={`flex items-center justify-between text-sm font-semibold px-5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <span>Capsules ({equippedCapsules.length})</span>
            <span>Total Cost: <span className={`font-medium ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>{totalCapsuleCost}</span></span>
          </div>
        </>
      )}

      {/* AI Strategy */}
      <div className="flex items-center justify-between">
        <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>AI Strategy:</span>
        <strong className={`text-sm ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
          {aiStrategy || 'Default'}
        </strong>
      </div>

      {/* Times Used */}
      <div className="flex items-center justify-between">
        <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Times Used:</span>
        <strong className={`text-sm ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
          {count} {count === 1 ? 'match' : 'matches'}
        </strong>
      </div>
      {/* YAML export buttons */}
      {(equippedCapsules?.length > 0 || aiStrategy) && (
        <BuildYamlButtons
          characterName={characterName}
          capsules={equippedCapsules}
          aiStrategy={aiStrategy}
          darkMode={darkMode}
        />
      )}
    </div>
  );
}
