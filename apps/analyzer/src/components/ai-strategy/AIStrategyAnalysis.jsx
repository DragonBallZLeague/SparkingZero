import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Brain, Filter, TrendingUp, Target, User } from 'lucide-react';
import { calculateAIStrategyMetrics, generateAIInsights, extractUniqueCharacters, filterAIMetricsByCharacter } from '../../utils/aiStrategyCalculator.js';
import { Combobox } from '../Combobox.jsx';
// import AIStrategyCard from './AIStrategyCard.jsx'; // Replaced with table view
import AIStrategyTable from './AIStrategyTable.jsx';
import AIStrategyExpandedPanel from './AIStrategyExpandedPanel.jsx';

/**
 * AIStrategyAnalysis Component
 * 
 * Main component for AI Strategy effectiveness analysis
 * Displays cards in grid layout with filtering and sorting
 */
export default function AIStrategyAnalysis({ aggregatedData, charMap = {}, darkMode = false }) {
  // Calculate AI metrics
  const aiMetrics = useMemo(() => {
    return calculateAIStrategyMetrics(aggregatedData);
  }, [aggregatedData]);
  
  // Generate insights
  const insights = useMemo(() => {
    return generateAIInsights(aiMetrics);
  }, [aiMetrics]);
  
  // State for filtering and sorting
  const [selectedCharacter, setSelectedCharacter] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, Attack, Defense, Balanced
  const [sortBy, setSortBy] = useState('usage'); // usage, winRate, performance
  const [minMatches, setMinMatches] = useState(1);
  const [selectedAI, setSelectedAI] = useState(null);
  
  // Extract available characters
  const availableCharacters = useMemo(() => {
    return extractUniqueCharacters(aiMetrics, charMap);
  }, [aiMetrics, charMap]);
  
  // Create character items for Combobox
  const characterItems = useMemo(() => {
    return availableCharacters.map(char => ({ id: char.id, name: char.name }));
  }, [availableCharacters]);
  
  // Get selected character name for display
  const selectedCharacterName = useMemo(() => {
    if (!selectedCharacter) return null;
    const charData = characterItems.find(char => char.id === selectedCharacter);
    return charData ? charData.name : selectedCharacter;
  }, [selectedCharacter, characterItems]);
  
  // Create filtered metrics for display
  const displayMetrics = useMemo(() => {
    if (!selectedCharacter) return aiMetrics;
    return filterAIMetricsByCharacter(aiMetrics, selectedCharacter, charMap);
  }, [aiMetrics, selectedCharacter, charMap]);
  
  // Disable body scroll when modal is open
  useEffect(() => {
    if (selectedAI) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedAI]);
  
  // Filter and sort strategies
  const filteredAndSortedStrategies = useMemo(() => {
    let strategies = Object.values(displayMetrics);
    
    // Filter by type
    if (filterType !== 'all') {
      strategies = strategies.filter(ai => ai.type === filterType);
    }
    
    // Filter by minimum matches
    strategies = strategies.filter(ai => ai.totalMatches >= minMatches);
    
    // Sort
    strategies.sort((a, b) => {
      switch (sortBy) {
        case 'usage':
          return b.totalMatches - a.totalMatches;
        case 'winRate':
          return b.winRate - a.winRate;
        case 'performance':
          return b.combatPerformanceScore - a.combatPerformanceScore;
        default:
          return b.totalMatches - a.totalMatches;
      }
    });
    
    return strategies;
  }, [displayMetrics, filterType, sortBy, minMatches]);
  
  // Check if no data
  if (Object.keys(aiMetrics).length === 0) {
    return (
      <div className={`text-center py-12 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
        <Brain className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-semibold mb-2">No AI Strategy Data</h3>
        <p className="text-sm">
          AI strategy information will appear when match data with AI configurations is loaded.
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Insights Section */}
      {insights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {insights.map((insight, i) => (
            <div
              key={i}
              className={`p-3 rounded-lg border ${
                insight.type === 'success'
                  ? darkMode
                    ? 'bg-green-900/20 border-green-600 text-green-300'
                    : 'bg-green-50 border-green-200 text-green-700'
                  : darkMode
                    ? 'bg-blue-900/20 border-blue-600 text-blue-300'
                    : 'bg-blue-50 border-blue-200 text-blue-700'
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="text-xl">{insight.icon}</span>
                <span className="text-sm font-medium">{insight.text}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Controls */}
      <div className={`p-4 rounded-xl border ${
        darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Character Filter */}
          <div>
            <label className={`text-sm font-medium mb-2 block ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              <User className="w-4 h-4 inline mr-1" />
              Character
            </label>
            <Combobox
              valueId={selectedCharacter}
              items={characterItems}
              placeholder="All Characters"
              onSelect={(id) => setSelectedCharacter(id)}
              getName={(item) => item.name}
              darkMode={darkMode}
              focusColor="purple"
              showTooltip={false}
              disabled={characterItems.length === 0}
            />
          </div>
          
          {/* Filter by Type */}
          <div>
            <label className={`text-sm font-medium mb-2 block ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              <Filter className="w-4 h-4 inline mr-1" />
              Filter by Type
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${
                darkMode 
                  ? 'bg-gray-800 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:outline-none focus:ring-2 focus:ring-purple-500/50`}
            >
              <option value="all">All Types</option>
              <option value="Balanced">Balanced Strategy</option>
              <option value="Attack">Attack Strategy</option>
              <option value="Defense">Defense Strategy</option>
            </select>
          </div>
          
          {/* Sort By */}
          <div>
            <label className={`text-sm font-medium mb-2 block ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              <TrendingUp className="w-4 h-4 inline mr-1" />
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${
                darkMode 
                  ? 'bg-gray-800 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:outline-none focus:ring-2 focus:ring-purple-500/50`}
            >
              <option value="usage">Most Used</option>
              <option value="winRate">Highest Win Rate</option>
              <option value="performance">Best Performance</option>
            </select>
          </div>
          
          {/* Minimum Matches */}
          <div>
            <label className={`text-sm font-medium mb-2 block ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              <Target className="w-4 h-4 inline mr-1" />
              Min Matches: {minMatches}
            </label>
            <input
              type="range"
              min="1"
              max="50"
              value={minMatches}
              onChange={(e) => setMinMatches(parseInt(e.target.value))}
              className="w-full"
            />
            <div className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Showing {filteredAndSortedStrategies.length} of {Object.keys(aiMetrics).length} strategies
            </div>
          </div>
        </div>
      </div>
      
      {/* Strategy Table */}
      {filteredAndSortedStrategies.length > 0 && (
        <AIStrategyTable
          strategies={filteredAndSortedStrategies}
          darkMode={darkMode}
          onRowClick={(ai) => setSelectedAI(ai)}
          characterFiltered={!!selectedCharacter}
          selectedCharacter={selectedCharacterName}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />
      )}
      
      {/* No Results Message */}
      {filteredAndSortedStrategies.length === 0 && (
        <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <Filter className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No AI strategies match the current filters.</p>
          <button
            onClick={() => {
              setSelectedCharacter('');
              setFilterType('all');
              setMinMatches(1);
            }}
            className={`mt-3 px-4 py-2 rounded-lg text-sm font-medium ${
              darkMode
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'bg-purple-500 hover:bg-purple-600 text-white'
            }`}
          >
            Reset All Filters
          </button>
        </div>
      )}
      
      {/* Expanded Panel Modal */}
      {selectedAI && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60" 
          data-ai-details-modal="true"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedAI(null);
          }}
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0,
            overflow: 'hidden'
          }}
        >
          <div 
            className={`w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl ${
              darkMode ? 'bg-gray-800' : 'bg-white'
            }`}
            onClick={(e) => e.stopPropagation()}
            style={{
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '90vh',
              overflow: 'hidden'
            }}
          >
            <AIStrategyExpandedPanel
              aiMetrics={selectedAI}
              allAIMetrics={displayMetrics}
              darkMode={darkMode}
              onClose={() => setSelectedAI(null)}
              characterFiltered={!!selectedCharacter}
              selectedCharacter={selectedCharacterName}
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
