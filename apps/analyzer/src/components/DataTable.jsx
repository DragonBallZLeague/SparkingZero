import React, { useState, useMemo, useCallback } from 'react';
import { 
  ChevronUp, 
  ChevronDown, 
  Search, 
  Filter, 
  Download,
  Eye,
  EyeOff,
  ArrowUpDown,
  CheckSquare,
  Square,
  MoreVertical,
  Settings
} from 'lucide-react';

// Enhanced DataTable Component with filtering, sorting, and export capabilities
const DataTable = ({ 
  data = [], 
  columns = [],
  title = "Data Table",
  exportFileName = "data",
  onExport = null,
  pageSize = 10,
  darkMode = false,
  showSearch = true,
  showFilter = true,
  showExport = true,
  showColumnControls = true,
  selectable = false,
  onSelectionChange = null
}) => {
  // State management
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [columnFilters, setColumnFilters] = useState({});
  const [visibleColumns, setVisibleColumns] = useState(
    columns.reduce((acc, col) => ({ ...acc, [col.key]: col.visible !== false }), {})
  );
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [showColumnSettings, setShowColumnSettings] = useState(false);

  // Filter and sort data
  const processedData = useMemo(() => {
    let filteredData = [...data];

    // Apply global search
    if (searchTerm) {
      filteredData = filteredData.filter(row =>
        columns.some(col => {
          if (!visibleColumns[col.key]) return false;
          const value = col.accessor ? col.accessor(row) : row[col.key];
          return String(value).toLowerCase().includes(searchTerm.toLowerCase());
        })
      );
    }

    // Apply column-specific filters
    Object.entries(columnFilters).forEach(([key, filterValue]) => {
      if (filterValue) {
        filteredData = filteredData.filter(row => {
          const col = columns.find(c => c.key === key);
          const value = col.accessor ? col.accessor(row) : row[key];
          return String(value).toLowerCase().includes(filterValue.toLowerCase());
        });
      }
    });

    // Apply sorting
    if (sortConfig.key) {
      filteredData.sort((a, b) => {
        const col = columns.find(c => c.key === sortConfig.key);
        const aVal = col.accessor ? col.accessor(a) : a[sortConfig.key];
        const bVal = col.accessor ? col.accessor(b) : b[sortConfig.key];
        
        if (col.sortType === 'number') {
          return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
        } else {
          const aStr = String(aVal).toLowerCase();
          const bStr = String(bVal).toLowerCase();
          if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
          if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
        }
      });
    }

    return filteredData;
  }, [data, searchTerm, columnFilters, sortConfig, columns, visibleColumns]);

  // Pagination
  const totalPages = Math.ceil(processedData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = processedData.slice(startIndex, startIndex + pageSize);

  // Handlers
  const handleSort = useCallback((key) => {
    setSortConfig(prevSort => ({
      key,
      direction: prevSort.key === key && prevSort.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  const handleColumnFilterChange = useCallback((key, value) => {
    setColumnFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  }, []);

  const handleRowSelection = useCallback((rowIndex, checked) => {
    const newSelected = new Set(selectedRows);
    if (checked) {
      newSelected.add(startIndex + rowIndex);
    } else {
      newSelected.delete(startIndex + rowIndex);
    }
    setSelectedRows(newSelected);
    onSelectionChange?.(Array.from(newSelected).map(index => data[index]));
  }, [selectedRows, startIndex, data, onSelectionChange]);

  const handleSelectAll = useCallback((checked) => {
    if (checked) {
      const allIndices = new Set(processedData.map((_, index) => 
        data.findIndex(item => item === processedData[index])
      ));
      setSelectedRows(allIndices);
      onSelectionChange?.(processedData);
    } else {
      setSelectedRows(new Set());
      onSelectionChange?.([]);
    }
  }, [processedData, data, onSelectionChange]);

  const toggleColumnVisibility = useCallback((key) => {
    setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleExport = useCallback(() => {
    const exportData = {
      title,
      data: processedData,
      columns: columns.filter(col => visibleColumns[col.key]),
      selectedRows: Array.from(selectedRows).map(index => data[index]),
      searchTerm,
      columnFilters
    };
    onExport?.(exportData, exportFileName);
  }, [title, processedData, columns, visibleColumns, selectedRows, data, searchTerm, columnFilters, onExport, exportFileName]);

  const visibleColumnsList = columns.filter(col => visibleColumns[col.key]);

  // Get the left offset for the first sticky data column (accounts for selectable checkbox col)
  const firstColLeft = selectable ? 48 : 0;

  // Get section divider border color for a group (used on both th and td)
  const getGroupBorderColor = (group) => {
    switch (group) {
      case 'Combat Performance': return darkMode ? '#7f1d1d' : '#fca5a5';
      case 'Survival & Health': return darkMode ? '#14532d' : '#86efac';
      case 'Special Abilities': return darkMode ? '#581c87' : '#d8b4fe';
      case 'Combat Mechanics': return darkMode ? '#7c2d12' : '#fdba74';
      case 'Build & Equipment': return darkMode ? '#1e3a5f' : '#93c5fd';
      case 'Form Changes': return darkMode ? '#134e4a' : '#5eead4';
      default: return darkMode ? '#374151' : '#d1d5db';
    }
  };

  // Get header background/text styles based on column group (matches AIStrategyTable section coloring)
  const getGroupHeaderClass = (group, isFirstInGroup) => {
    const borderLeft = isFirstInGroup ? 'border-l-2 ' : '';
    switch (group) {
      case 'Combat Performance':
        return darkMode
          ? `${borderLeft}bg-red-900 text-red-200 border-red-600`
          : `${borderLeft}bg-red-100 text-red-800 border-red-300`;
      case 'Survival & Health':
        return darkMode
          ? `${borderLeft}bg-green-900 text-green-200 border-green-600`
          : `${borderLeft}bg-green-100 text-green-800 border-green-300`;
      case 'Special Abilities':
        return darkMode
          ? `${borderLeft}bg-purple-900 text-purple-200 border-purple-600`
          : `${borderLeft}bg-purple-100 text-purple-800 border-purple-300`;
      case 'Combat Mechanics':
        return darkMode
          ? `${borderLeft}bg-orange-900 text-orange-200 border-orange-600`
          : `${borderLeft}bg-orange-100 text-orange-800 border-orange-300`;
      case 'Build & Equipment':
        return darkMode
          ? `${borderLeft}bg-blue-900 text-blue-200 border-blue-600`
          : `${borderLeft}bg-blue-100 text-blue-800 border-blue-300`;
      case 'Form Changes':
        return darkMode
          ? `${borderLeft}bg-teal-900 text-teal-200 border-teal-600`
          : `${borderLeft}bg-teal-100 text-teal-800 border-teal-300`;
      default:
        // 'Identity & Context', 'Match Identity', or any ungrouped columns → gray
        return darkMode
          ? `${borderLeft}bg-gray-700 text-gray-200 border-gray-500`
          : `${borderLeft}bg-gray-50 text-gray-700 border-gray-300`;
    }
  };

  return (
    <div className={`rounded-xl border ${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}>
      {/* Header Controls */}
      <div className={`p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {title}
          </h3>
          <div className="flex items-center gap-2">
            {showColumnControls && (
              <button
                onClick={() => setShowColumnSettings(!showColumnSettings)}
                className={`p-2 rounded-md transition-colors 
                ${
                  darkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
                title="Column Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
            {showExport && (
              <button
                onClick={handleExport}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  darkMode
                    ? 'bg-green-700 text-white hover:bg-green-800'
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                <Download className="w-4 h-4 inline mr-1" />
                Export
              </button>
            )}
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="flex items-center gap-4 mb-4">
          {showSearch && (
            <div className="flex-1 relative">
              <Search className={`w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 ${
                darkMode ? 'text-gray-400' : 'text-gray-500'
              }`} />
              <input
                type="text"
                placeholder="Search all columns..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className={`w-full pl-10 pr-4 py-2 rounded-md border ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
              />
            </div>
          )}
          
          <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {processedData.length} of {data.length} rows
            {selectedRows.size > 0 && ` (${selectedRows.size} selected)`}
          </div>
        </div>

        {/* Column Settings Panel */}
        {showColumnSettings && (
          <div className={`mb-4 p-3 rounded-md border ${
            darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <h4 className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Column Visibility
              </h4>
              <div className="flex gap-2">
                <button
                  onClick={() => setVisibleColumns(columns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {}))}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${
                    darkMode
                      ? 'bg-gray-700 text-white hover:bg-gray-600'
                      : 'bg-gray-500 text-white hover:bg-gray-600'
                  }`}
                >
                  Select All
                </button>
                <button
                  onClick={() => setVisibleColumns(columns.reduce((acc, col) => ({ ...acc, [col.key]: false }), {}))}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${
                    darkMode
                      ? 'bg-gray-700 text-white hover:bg-gray-600'
                      : 'bg-gray-400 text-white hover:bg-gray-500'
                  }`}
                >
                  Unselect All
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {columns.map(col => (
                <label key={col.key} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={visibleColumns[col.key]}
                    onChange={() => toggleColumnVisibility(col.key)}
                    className="mr-2"
                  />
                  <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {col.header}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-scroll">
        <table className="w-full min-w-max">
          <thead>
            <tr>
              {selectable && (
                <th className={`w-12 px-4 py-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`} style={{ position: 'sticky', top: 0, left: 0, zIndex: 20 }}>
                  <input
                    type="checkbox"
                    checked={selectedRows.size === processedData.length && processedData.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded"
                  />
                </th>
              )}
              {visibleColumnsList.map((col, colIndex) => {
                const prevCol = colIndex > 0 ? visibleColumnsList[colIndex - 1] : null;
                const isFirstInGroup = !prevCol || prevCol.group !== col.group;
                const groupClass = getGroupHeaderClass(col.group, isFirstInGroup);
                const isFirstCol = colIndex === 0;
                const thStyle = isFirstCol
                  ? { position: 'sticky', top: 0, left: firstColLeft, zIndex: 20, minWidth: '180px' }
                  : { position: 'sticky', top: 0, zIndex: 5, minWidth: '120px' };
                return (
                <th 
                  key={col.key}
                  className={`px-4 py-3 text-left text-sm font-semibold ${groupClass} ${
                    col.sortable !== false ? 'cursor-pointer hover:bg-opacity-80' : ''}`}
                  style={thStyle}
                  onClick={col.sortable !== false ? () => handleSort(col.key) : undefined}
                >
                  <div className="flex items-center gap-2">
                    <span>{col.header}</span>
                    {col.sortable !== false && (
                      <div className="flex flex-col">
                        <ChevronUp 
                          className={`w-3 h-3 ${
                            sortConfig.key === col.key && sortConfig.direction === 'asc'
                              ? darkMode ? 'text-blue-400' : 'text-blue-600'
                              : 'text-gray-400'
                          }`} 
                        />
                        <ChevronDown 
                          className={`w-3 h-3 -mt-1 ${
                            sortConfig.key === col.key && sortConfig.direction === 'desc'
                              ? darkMode ? 'text-blue-400' : 'text-blue-600'
                              : 'text-gray-400'
                          }`} 
                        />
                      </div>
                    )}
                  </div>
                  {showFilter && col.filterable !== false && (
                    <input
                      type="text"
                      placeholder={`Filter ${col.header.toLowerCase()}...`}
                      value={columnFilters[col.key] || ''}
                      onChange={(e) => handleColumnFilterChange(col.key, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className={`mt-1 w-full text-xs px-2 py-1 rounded border ${
                        darkMode 
                          ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400' 
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                    />
                  )}
                </th>
                );
              })}
            </tr>
          </thead>
          <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
            {paginatedData.map((row, index) => (
              <tr 
                key={index}
                className={`${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} ${
                  selectedRows.has(startIndex + index)
                    ? darkMode ? 'bg-gray-900' : 'bg-blue-50'
                    : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                } transition-colors`}
              >
                {selectable && (
                  <td
                    className={`px-3 py-1.5 w-12 ${darkMode ? 'border-r border-gray-600' : 'border-r border-gray-200'}`}
                    style={{
                      position: 'sticky',
                      left: 0,
                      zIndex: 3,
                      background: selectedRows.has(startIndex + index)
                        ? (darkMode ? '#111827' : '#eff6ff')
                        : (darkMode ? '#1f2937' : '#ffffff'),
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedRows.has(startIndex + index)}
                      onChange={(e) => handleRowSelection(index, e.target.checked)}
                      className="rounded"
                    />
                  </td>
                )}
                {visibleColumnsList.map((col, colIndex) => {
                  const prevCol = colIndex > 0 ? visibleColumnsList[colIndex - 1] : null;
                  const isFirstInGroup = !prevCol || prevCol.group !== col.group;
                  const isFirstCol = colIndex === 0;
                  const isSelected = selectedRows.has(startIndex + index);
                  const tdStyle = isFirstCol
                    ? {
                        position: 'sticky',
                        left: firstColLeft,
                        zIndex: 3,
                        minWidth: '180px',
                        background: isSelected
                          ? (darkMode ? '#111827' : '#eff6ff')
                          : (darkMode ? '#1f2937' : '#ffffff'),
                      }
                    : {
                        minWidth: '120px',
                        borderLeft: isFirstInGroup ? `2px solid ${getGroupBorderColor(col.group)}` : undefined,
                      };
                  return (
                  <td 
                    key={col.key}
                    className={`px-3 py-1.5 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'} ${
                      isFirstCol ? (darkMode ? 'border-r border-gray-600' : 'border-r border-gray-200') : ''
                    }`}
                    style={tdStyle}
                  >
                    {col.render ? col.render(row, col.accessor ? col.accessor(row) : row[col.key]) : 
                     (col.accessor ? col.accessor(row) : row[col.key])}
                  </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={`px-4 py-3 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Showing {startIndex + 1} to {Math.min(startIndex + pageSize, processedData.length)} of {processedData.length} results
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className={`px-3 py-1 bg-gray-700 rounded text-sm ${
                  currentPage === 1
                    ? darkMode ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 cursor-not-allowed'
                    : darkMode ? 'text-gray-300 hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Previous
              </button>
              <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className={`px-3 py-1 bg-gray-700 rounded text-sm ${
                  currentPage === totalPages
                    ? darkMode ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 cursor-not-allowed'
                    : darkMode ? 'text-gray-300 hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;