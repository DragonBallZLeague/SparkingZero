import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Star } from 'lucide-react';
import { calculatePerFormStats, formatPerFormStatsForDisplay } from '../utils/formStatsCalculator';

/**
 * Format number with commas
 */
function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return Math.round(num).toLocaleString();
}

/**
 * Default column configuration for per-form stats table
 */
const DEFAULT_COLUMNS = [
  { id: 'form', label: 'Form', align: 'left' },
  { id: 'dmgDone', label: 'Dmg Done', align: 'right' },
  { id: 'dmgTaken', label: 'Dmg Taken', align: 'right' },
  { id: 'efficiency', label: 'Efficiency', align: 'right' },
  { id: 'dps', label: 'DPS', align: 'right' },
  { id: 'time', label: 'Time', align: 'right' },
  { id: 'hpLeft', label: 'HP Left', align: 'right' },
  { id: 'spms', label: 'SPMs', align: 'right' },
  { id: 'ults', label: 'Ults', align: 'right' },
  { id: 's1', label: 'S1', align: 'right' },
  { id: 's2', label: 'S2', align: 'right' },
  { id: 'ub', label: 'UB', align: 'right' },
  { id: 'kos', label: 'KOs', align: 'right' },
];

/**
 * Render cell content based on column ID
 */
function renderCellContent(columnId, formStat) {
  switch (columnId) {
    case 'form':
      return (
        <div className="flex items-center gap-2">
          <span className="formNumber">{formStat.formNumber}</span>
          <span className="characterName">{formStat.characterName}</span>
          {formStat.isFinalForm && <span className="finalBadge">Final</span>}
        </div>
      );
    case 'dmgDone':
      return formatNumber(formStat.damageDone);
    case 'dmgTaken':
      return formatNumber(formStat.damageTaken);
    case 'efficiency':
      return `${formStat.damageEfficiency.toFixed(2)}×`;
    case 'dps':
      return Math.round(formStat.damagePerSecond).toLocaleString();
    case 'time':
      return `${Math.round(formStat.battleTime)}s`;
    case 'hpLeft':
      return formatNumber(formStat.hpRemaining);
    case 'spms':
      return formStat.specialMovesUsed;
    case 'ults':
      return formStat.ultimatesUsed;
    case 's1':
      return formStat.s1Blast > 0 ? `${formStat.s1HitBlast}/${formStat.s1Blast}` : '-';
    case 's2':
      return formStat.s2Blast > 0 ? `${formStat.s2HitBlast}/${formStat.s2Blast}` : '-';
    case 'ub':
      return formStat.ultBlast > 0 ? `${formStat.uLTHitBlast}/${formStat.ultBlast}` : '-';
    case 'kos':
      return formStat.kills;
    default:
      return '';
  }
}

/**
 * Compact table row for a single form's stats
 */
function FormStatRow({ formStat, darkMode, columns }) {
  // Final form gets visually distinct styling
  const rowBg = formStat.isFinalForm
    ? (darkMode ? 'bg-blue-900/20' : 'bg-blue-50')
    : (darkMode ? 'bg-gray-700' : 'bg-white');
  
  const textColor = darkMode ? 'text-gray-300' : 'text-gray-700';
  const boldColor = darkMode ? 'text-white' : 'text-gray-900';

  return (
    <tr className={`${rowBg} border-b ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
      {columns.map((column) => {
        const content = renderCellContent(column.id, formStat);
        const isFormColumn = column.id === 'form';
        
        return (
          <td 
            key={column.id}
            className={`px-3 py-2 text-sm ${column.align === 'left' ? 'text-left' : 'text-right'} ${
              isFormColumn ? '' : textColor
            }`}
          >
            {isFormColumn ? (
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                  darkMode ? 'bg-yellow-900/40 text-yellow-300' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {formStat.formNumber}
                </span>
                <span className={`font-semibold ${boldColor}`}>
                  {formStat.characterName}
                </span>
                {formStat.isFinalForm && (
                  <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${
                    darkMode ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-100 text-blue-800'
                  }`}>
                    Final
                  </span>
                )}
              </div>
            ) : (
              content
            )}
          </td>
        );
      })}
    </tr>
  );
}

/**
 * Expandable per-form stats display component (Table Format)
 * Displays detailed stat breakdown for each form a character used
 */
export function PerFormStatsDisplay({ 
  characterRecord, 
  characterIdRecord, 
  formChangeHistory, 
  formChangeHistoryText,
  originalCharacterId,
  charMap,
  darkMode
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [draggedColumn, setDraggedColumn] = useState(null);
  
  // Don't show if no transformations occurred
  if (!formChangeHistory || formChangeHistory.length === 0) {
    return null;
  }
  
  // Calculate per-form stats
  const perFormStats = calculatePerFormStats(
    characterRecord, 
    characterIdRecord, 
    formChangeHistory,
    originalCharacterId
  );
  
  // Format for display
  const displayStats = formatPerFormStatsForDisplay(perFormStats, charMap);
  
  // If calculation failed, don't render
  if (!displayStats || displayStats.length === 0) {
    return null;
  }
  
  // Drag and drop handlers
  const handleDragStart = (e, index) => {
    setDraggedColumn(index);
    e.dataTransfer.effectAllowed = 'move';
  };
  
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  
  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedColumn === null || draggedColumn === dropIndex) return;
    
    const newColumns = [...columns];
    const draggedItem = newColumns[draggedColumn];
    newColumns.splice(draggedColumn, 1);
    newColumns.splice(dropIndex, 0, draggedItem);
    
    setColumns(newColumns);
    setDraggedColumn(null);
  };
  
  const handleDragEnd = () => {
    setDraggedColumn(null);
  };
  
  return (
    <div className={`mt-3 rounded-lg border-2 ${
      darkMode 
        ? 'bg-yellow-900/20 border-yellow-700' 
        : 'bg-yellow-50 border-yellow-200'
    }`}>
      {/* Header - Clickable */}
      <div 
        className={`p-3 flex items-center justify-between cursor-pointer transition-colors rounded-lg ${
          darkMode ? 'hover:bg-yellow-900/30' : 'hover:bg-yellow-100'
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Star className={`w-4 h-4 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
          <span className={`text-sm font-semibold ${darkMode ? 'text-yellow-300' : 'text-yellow-800'}`}>
            Forms Used ({formChangeHistory.length + 1} total)
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className={`w-4 h-4 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
        ) : (
          <ChevronDown className={`w-4 h-4 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
        )}
      </div>
      
      {/* Summary Text - Always visible */}
      <div className={`px-3 ${!isExpanded ? 'pb-3' : 'pb-2'} text-sm ${
        darkMode ? 'text-gray-400' : 'text-gray-500'
      }`}>
        {formChangeHistoryText}
      </div>
      
      {/* Expanded Aggregated Per-Form Table */}
      {isExpanded && (
        <div className={`overflow-x-scroll border-t ${
          darkMode ? 'border-yellow-700' : 'border-yellow-200'
        }`} style={{ marginBottom: '8px' }}>
          <table className="w-max text-sm">
            <thead className={`${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
              <tr className={`border-b ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                {columns.map((column, index) => (
                  <th
                    key={column.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`px-3 py-2 ${column.align === 'left' ? 'text-left' : 'text-right'} font-semibold ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    } cursor-move select-none transition-colors whitespace-nowrap ${
                      draggedColumn === index 
                        ? (darkMode ? 'bg-gray-700' : 'bg-gray-200')
                        : (darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200')
                    }`}
                    title="Drag to reorder columns"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayStats.map((formStat, idx) => (
                <FormStatRow 
                  key={idx}
                  formStat={formStat}
                  darkMode={darkMode}
                  columns={columns}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/**
 * Render aggregated cell content based on column ID
 */
function renderAggregatedCellContent(columnId, formStat) {
  switch (columnId) {
    case 'form':
      return (
        <div className="flex items-center gap-2">
          <span className="formNumber">{formStat.formNumber}</span>
          <span className="characterName">{formStat.name}</span>
          {formStat.isFinalForm && <span className="finalBadge">Final</span>}
        </div>
      );
    case 'dmgDone':
      return formatNumber(formStat.avgDamageDone);
    case 'dmgTaken':
      return formatNumber(formStat.avgDamageTaken);
    case 'efficiency':
      return `${formStat.damageEfficiency.toFixed(2)}×`;
    case 'dps':
      return Math.round(formStat.damagePerSecond).toLocaleString();
    case 'time':
      return `${Math.round(formStat.avgBattleTime)}s`;
    case 'hpLeft':
      return formatNumber(formStat.avgHPRemaining);
    case 'spms':
      return formStat.avgSpecialMoves?.toFixed(1) || '0.0';
    case 'ults':
      return formStat.avgUltimates?.toFixed(1) || '0.0';
    case 's1':
      return formStat.avgS1Blast > 0 ? `${formStat.avgS1HitBlast?.toFixed(1)}/${formStat.avgS1Blast?.toFixed(1)}` : '-';
    case 's2':
      return formStat.avgS2Blast > 0 ? `${formStat.avgS2HitBlast?.toFixed(1)}/${formStat.avgS2Blast?.toFixed(1)}` : '-';
    case 'ub':
      return formStat.avgUltBlast > 0 ? `${formStat.avgULTHitBlast?.toFixed(1)}/${formStat.avgUltBlast?.toFixed(1)}` : '-';
    case 'kos':
      return formStat.avgKills?.toFixed(1) || '0.0';
    default:
      return '';
  }
}

/**
 * Compact table row for aggregated form stats
 */
function FormStatRowAggregated({ formStat, darkMode, columns }) {
  // Final form gets visually distinct styling
  const rowBg = formStat.isFinalForm
    ? (darkMode ? 'bg-blue-900/20' : 'bg-blue-50')
    : (darkMode ? 'bg-gray-700' : 'bg-white');
  
  const textColor = darkMode ? 'text-gray-300' : 'text-gray-700';
  const boldColor = darkMode ? 'text-white' : 'text-gray-900';

  return (
    <tr className={`${rowBg} border-b ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
      {columns.map((column) => {
        const content = renderAggregatedCellContent(column.id, formStat);
        const isFormColumn = column.id === 'form';
        
        return (
          <td 
            key={column.id}
            className={`px-3 py-2 text-sm ${column.align === 'left' ? 'text-left' : 'text-right'} ${
              isFormColumn ? '' : textColor
            }`}
          >
            {isFormColumn ? (
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                  darkMode ? 'bg-yellow-900/40 text-yellow-300' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {formStat.formNumber}
                </span>
                <span className={`font-semibold ${boldColor}`}>
                  {formStat.name}
                </span>
                {formStat.isFinalForm && (
                  <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${
                    darkMode ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-100 text-blue-800'
                  }`}>
                    Final
                  </span>
                )}
              </div>
            ) : (
              content
            )}
          </td>
        );
      })}
    </tr>
  );
}

/**
 * Aggregated per-form stats display component (Table Format)
 * Used in Aggregated Stats view where data is already averaged across matches
 */
export function PerFormStatsDisplayAggregated({ 
  formStatsArray,
  formChangeHistoryText,
  darkMode
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [draggedColumn, setDraggedColumn] = useState(null);
  
  // Don't show if no form stats
  if (!formStatsArray || formStatsArray.length === 0) {
    return null;
  }
  
  // Sort by form number
  const sortedForms = [...formStatsArray].sort((a, b) => a.formNumber - b.formNumber);
  
  // Drag and drop handlers
  const handleDragStart = (e, index) => {
    setDraggedColumn(index);
    e.dataTransfer.effectAllowed = 'move';
  };
  
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  
  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedColumn === null || draggedColumn === dropIndex) return;
    
    const newColumns = [...columns];
    const draggedItem = newColumns[draggedColumn];
    newColumns.splice(draggedColumn, 1);
    newColumns.splice(dropIndex, 0, draggedItem);
    
    setColumns(newColumns);
    setDraggedColumn(null);
  };
  
  const handleDragEnd = () => {
    setDraggedColumn(null);
  };
  
  return (
    <div className={`rounded-lg border-2 ${
      darkMode 
        ? 'bg-yellow-900/20 border-yellow-700' 
        : 'bg-yellow-50 border-yellow-200'
    }`}>
      {/* Header - Clickable */}
      <div 
        className={`p-3 flex items-center justify-between cursor-pointer transition-colors rounded-lg ${
          darkMode ? 'hover:bg-yellow-900/30' : 'hover:bg-yellow-100'
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Star className={`w-4 h-4 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
          <span className={`text-sm font-semibold ${darkMode ? 'text-yellow-300' : 'text-yellow-800'}`}>
            Forms Used ({sortedForms.length} total)
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className={`w-4 h-4 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
        ) : (
          <ChevronDown className={`w-4 h-4 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
        )}
      </div>
      
      {/* Summary Text - Always visible */}
      <div className={`px-3 ${!isExpanded ? 'pb-3' : 'pb-2'} text-sm ${
        darkMode ? 'text-gray-400' : 'text-gray-500'
      }`}>
        {formChangeHistoryText || sortedForms.map(f => f.name).join(', ')}
      </div>
      
      {/* Expanded Per-Form Table */}
      {isExpanded && (
        <div className={`overflow-x-scroll border-t ${
          darkMode ? 'border-yellow-700' : 'border-yellow-200'
        }`} style={{ marginBottom: '8px' }}>
          <table className="w-max text-sm">
            <thead className={`${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
              <tr className={`border-b ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                {columns.map((column, index) => (
                  <th
                    key={column.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`px-3 py-2 ${column.align === 'left' ? 'text-left' : 'text-right'} font-semibold ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    } cursor-move select-none transition-colors whitespace-nowrap ${
                      draggedColumn === index 
                        ? (darkMode ? 'bg-gray-700' : 'bg-gray-200')
                        : (darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200')
                    }`}
                    title="Drag to reorder columns"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedForms.map((formStat, idx) => (
                <FormStatRowAggregated 
                  key={idx}
                  formStat={formStat}
                  darkMode={darkMode}
                  columns={columns}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
