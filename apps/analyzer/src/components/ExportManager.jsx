import React, { useState } from 'react';
import { 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Settings, 
  CheckSquare,
  Square,
  Loader2
} from 'lucide-react';

// Export Manager Component for generating Excel and CSV exports
const ExportManager = ({ 
  aggregatedData = null,
  positionData = null,
  metaData = null,
  currentViewData = null,
  viewType = 'single',
  darkMode = false,
  selectedFile = null
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    includeCharacterStats: true,
    includeBuildAnalysis: true,
    includePositionAnalysis: true,
    includeMetaAnalysis: true,
    includeSummary: true,
    format: 'excel' // 'excel' or 'csv'
  });

  // Helper function to format data for export
  const formatDataForExport = (data, type) => {
    if (!data) return [];
    
    switch (type) {
      case 'character':
        return Object.values(data).map(char => ({
          'Character Name': char.name,
          'Matches Played': char.matchCount,
          'Active Matches': char.activeMatchCount || 0,
          'Win Rate': `${char.winRate}%`,
          'Total Damage': char.totalDamage?.toLocaleString() || 0,
          'Average Damage': char.avgDamage?.toLocaleString() || 0,
          'Damage Taken': char.totalDamageTaken?.toLocaleString() || 0,
          'Total Kills': char.totalKills || 0,
          'Average Battle Time': char.avgBattleTime || 0,
          'Sparking Usage': char.totalSparking || 0,
          'Ultimate Usage': char.totalUltimate || 0,
          'Special Moves': char.totalSpecial || 0,
          'Max Combo': char.maxCombo || 0,
          'Build Archetype': char.buildArchetype || 'Unknown'
        }));
        
      case 'position':
        const positionExport = [];
        if (positionData) {
          [1, 2, 3].forEach(position => {
            const posData = positionData[position];
            if (posData?.sortedCharacters) {
              posData.sortedCharacters.forEach(char => {
                positionExport.push({
                  'Position': position === 1 ? 'Lead' : position === 2 ? 'Middle' : 'Anchor',
                  'Character Name': char.name,
                  'Matches': char.matchCount,
                  'Win Rate': `${char.winRate}%`,
                  'Avg Damage': char.avgDamage?.toLocaleString() || 0,
                  'Avg HP Remaining': char.avgHealth?.toLocaleString() || 0,
                  'Avg Battle Time': char.avgBattleTime || 0,
                  'Avg Kills': char.avgKills || 0,
                  'Avg Sparking': char.avgSparking || 0
                });
              });
            }
          });
        }
        return positionExport;
        
      case 'meta':
        if (!metaData) return [];
        return metaData.topCapsules?.map(capsule => ({
          'Capsule Name': capsule.name,
          'Usage Count': capsule.usage,
          'Win Rate': `${capsule.winRate}%`,
          'Character Count': capsule.characterCount,
          'Type': capsule.type || 'Capsule'
        })) || [];
        
      default:
        return [];
    }
  };

  // Helper function to convert data to CSV
  const convertToCSV = (data, columns = []) => {
    if (!data || data.length === 0) return '';
    
    // Use provided columns or infer from data
    const headers = columns.length > 0 
      ? columns.map(col => col.header || col.key)
      : Object.keys(data[0]);
    
    const csvRows = [headers.join(',')];
    
    data.forEach(row => {
      const values = columns.length > 0
        ? columns.map(col => {
            const value = col.accessor ? col.accessor(row) : row[col.key];
            // Escape commas and quotes in CSV values
            return typeof value === 'string' && (value.includes(',') || value.includes('"'))
              ? `"${value.replace(/"/g, '""')}"`
              : value;
          })
        : Object.values(row).map(val => 
            typeof val === 'string' && (val.includes(',') || val.includes('"'))
              ? `"${val.replace(/"/g, '""')}"`
              : val
          );
      csvRows.push(values.join(','));
    });
    
    return csvRows.join('\n');
  };

  // Helper function to download data as file
  const downloadFile = (content, filename, type = 'text/csv') => {
    const blob = new Blob([content], { type });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // Generate Excel workbook with multiple sheets (simplified as CSV for now)
  const generateExcelWorkbook = async () => {
    setIsExporting(true);
    
    try {
      let csvContent = '';
      
      // Summary Section
      if (exportOptions.includeSummary) {
        csvContent += 'Dragon Ball Sparking Zero - Battle Analysis Report\n';
        csvContent += `Generated on: ${new Date().toLocaleString()}\n`;
        csvContent += `View Type: ${viewType}\n`;
        csvContent += `Selected File: ${selectedFile || 'All Data'}\n\n`;
        csvContent += 'Statistics Summary:\n';
        csvContent += `Total Characters: ${aggregatedData ? Object.keys(aggregatedData).length : 0}\n`;
        csvContent += `Analysis Type: ${viewType === 'aggregated' ? 'Aggregated Data' : 'Single Match'}\n\n`;
      }
      
      // Character Statistics Section
      if (exportOptions.includeCharacterStats && aggregatedData) {
        csvContent += '\n=== CHARACTER STATISTICS ===\n';
        const characterData = formatDataForExport(aggregatedData, 'character');
        if (characterData.length > 0) {
          csvContent += convertToCSV(characterData) + '\n\n';
        }
      }
      
      // Position Analysis Section
      if (exportOptions.includePositionAnalysis && positionData) {
        csvContent += '\n=== POSITION ANALYSIS ===\n';
        const positionExportData = formatDataForExport(null, 'position');
        if (positionExportData.length > 0) {
          csvContent += convertToCSV(positionExportData) + '\n\n';
        }
      }
      
      // Meta Analysis Section
      if (exportOptions.includeMetaAnalysis && metaData) {
        csvContent += '\n=== META ANALYSIS ===\n';
        const metaExportData = formatDataForExport(null, 'meta');
        if (metaExportData.length > 0) {
          csvContent += convertToCSV(metaExportData) + '\n\n';
        }
      }
      
      // Build Analysis Section
      if (exportOptions.includeBuildAnalysis && aggregatedData) {
        csvContent += '\n=== BUILD ANALYSIS ===\n';
        const buildData = Object.values(aggregatedData)
          .filter(char => char.equippedCapsules?.length > 0)
          .map(char => ({
            'Character Name': char.name,
            'Build Archetype': char.buildArchetype || 'Unknown',
            'Capsule Count': char.equippedCapsules?.length || 0,
            'Capsules': char.equippedCapsules?.map(cap => cap.name).join('; ') || '',
            'Total Cost': char.totalCapsuleCost || 0,
            'Win Rate': `${char.winRate}%`,
            'Avg Damage': char.avgDamage?.toLocaleString() || 0
          }));
          
        if (buildData.length > 0) {
          csvContent += convertToCSV(buildData) + '\n\n';
        }
      }
      
      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `DBSZ_Analysis_${viewType}_${timestamp}.csv`;
      
      // Download file
      downloadFile(csvContent, filename, 'text/csv');
      
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Generate CSV export for specific data
  const generateCSVExport = async (dataType) => {
    setIsExporting(true);
    
    try {
      let csvData = [];
      let filename = '';
      
      switch (dataType) {
        case 'character':
          csvData = formatDataForExport(aggregatedData, 'character');
          filename = `DBSZ_Character_Stats_${new Date().toISOString().split('T')[0]}.csv`;
          break;
        case 'position':
          csvData = formatDataForExport(null, 'position');
          filename = `DBSZ_Position_Analysis_${new Date().toISOString().split('T')[0]}.csv`;
          break;
        case 'meta':
          csvData = formatDataForExport(null, 'meta');
          filename = `DBSZ_Meta_Analysis_${new Date().toISOString().split('T')[0]}.csv`;
          break;
      }
      
      if (csvData.length > 0) {
        const csvContent = convertToCSV(csvData);
        downloadFile(csvContent, filename, 'text/csv');
      } else {
        alert('No data available for export');
      }
      
    } catch (error) {
      console.error('CSV export failed:', error);
      alert('CSV export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle export option changes
  const handleOptionChange = (option, value) => {
    setExportOptions(prev => ({ ...prev, [option]: value }));
  };

  return (
    <div className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <div className="flex items-center gap-2 mb-4">
        <Download className={`w-5 h-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
        <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Export Data
        </h3>
      </div>

      {/* Export Options */}
      <div className="space-y-4 mb-6">
        <div>
          <h4 className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Include in Export:
          </h4>
          <div className="space-y-2">
            {[
              { key: 'includeSummary', label: 'Summary Sheet', available: true },
              { key: 'includeCharacterStats', label: 'Character Statistics', available: !!aggregatedData },
              { key: 'includePositionAnalysis', label: 'Position Analysis', available: !!positionData },
              { key: 'includeMetaAnalysis', label: 'Meta Analysis', available: !!metaData },
              { key: 'includeBuildAnalysis', label: 'Build Analysis', available: !!aggregatedData }
            ].map(option => (
              <label key={option.key} className={`flex items-center ${!option.available ? 'opacity-50' : ''}`}>
                <input
                  type="checkbox"
                  checked={exportOptions[option.key]}
                  onChange={(e) => handleOptionChange(option.key, e.target.checked)}
                  disabled={!option.available}
                  className="mr-2 rounded"
                />
                <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {option.label}
                  {!option.available && ' (No data available)'}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Export Buttons */}
      <div className="space-y-3">
        {/* CSV Export */}
        <button
          onClick={generateExcelWorkbook}
          disabled={isExporting}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-md font-medium transition-colors ${
            darkMode
              ? 'bg-green-700 text-white hover:bg-green-800 disabled:bg-gray-600'
              : 'bg-green-500 text-white hover:bg-green-600 disabled:bg-gray-400'
          }`}
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileText className="w-4 h-4" />
          )}
          Export Complete Report (CSV)
        </button>

        {/* Individual CSV Exports */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <button
            onClick={() => generateCSVExport('character')}
            disabled={isExporting || !aggregatedData}
            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              darkMode
                ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-600'
                : 'bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-400'
            }`}
          >
            <FileText className="w-4 h-4" />
            Character CSV
          </button>
          
          <button
            onClick={() => generateCSVExport('position')}
            disabled={isExporting || !positionData}
            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              darkMode
                ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-600'
                : 'bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-400'
            }`}
          >
            <FileText className="w-4 h-4" />
            Position CSV
          </button>
          
          <button
            onClick={() => generateCSVExport('meta')}
            disabled={isExporting || !metaData}
            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              darkMode
                ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-600'
                : 'bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-400'
            }`}
          >
            <FileText className="w-4 h-4" />
            Meta CSV
          </button>
        </div>
      </div>

      {/* Export Info */}
      <div className={`mt-4 p-3 rounded-md text-xs ${darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-50 text-gray-600'}`}>
        <p className="mb-1">
          <strong>Complete Report:</strong> Comprehensive CSV file with all selected data sections
        </p>
        <p>
          <strong>Individual CSV Export:</strong> Specific data tables for focused analysis
        </p>
        <p className="mt-1 text-xs opacity-75">
          Note: Full Excel support will be added in a future update
        </p>
      </div>
    </div>
  );
};

export default ExportManager;