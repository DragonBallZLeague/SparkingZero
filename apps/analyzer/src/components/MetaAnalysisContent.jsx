import React, { useState } from 'react';
import { Brain, ChevronDown, Database, Minus, Zap } from 'lucide-react';
import AIStrategyAnalysis from './ai-strategy/AIStrategyAnalysis.jsx';
import CapsuleSynergyAnalysis from './CapsuleSynergyAnalysis.jsx';

// Meta Analysis Component
export function MetaAnalysisContent({ aggregatedData, capsuleMap, aiStrategies, charMap, darkMode = false }) {
  const [isAIStrategyExpanded, setIsAIStrategyExpanded] = useState(true);
  const [isCapsuleExpanded, setIsCapsuleExpanded] = useState(true);
  
  if (aggregatedData.length === 0) {
    return (
      <div className="text-center py-8">
        <Database className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} />
        <h3 className={`text-lg font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>No Data Available</h3>
        <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Please ensure you have match data loaded to view meta analysis.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Strategy Effectiveness Analysis */}
      <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-purple-50'} border ${darkMode ? 'border-purple-900/30' : 'border-purple-200'}`}>
        <div className="flex items-center gap-3 mb-4">
          <Brain className={`w-6 h-6 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
          <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            AI Strategy Effectiveness
          </h3>
          <button 
            onClick={() => setIsAIStrategyExpanded(!isAIStrategyExpanded)}
            className={`ml-auto w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              darkMode 
                ? 'bg-purple-600 hover:bg-purple-500 text-white' 
                : 'bg-purple-600 hover:bg-purple-700 text-white'
            }`}
            aria-label={isAIStrategyExpanded ? 'Collapse section' : 'Expand section'}
          >
            {isAIStrategyExpanded ? (
              <Minus className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
        {isAIStrategyExpanded && (
          <>
            <p className={`mb-4 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Compare AI strategy performance, behavioral patterns, character synergies, and build compatibility.
            </p>
            <AIStrategyAnalysis aggregatedData={aggregatedData} charMap={charMap} darkMode={darkMode} />
          </>
        )}
      </div>
      
      {/* Capsule Performance Analysis */}
      <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-blue-50'} border ${darkMode ? 'border-blue-900/30' : 'border-blue-200'}`}>
        <div className="flex items-center gap-3 mb-4">
          <Zap className={`w-6 h-6 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
          <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            Capsule Performance Analysis
          </h3>
          <button 
            onClick={() => setIsCapsuleExpanded(!isCapsuleExpanded)}
            className={`ml-auto w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              darkMode 
                ? 'bg-blue-600 hover:bg-blue-500 text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
            aria-label={isCapsuleExpanded ? 'Collapse section' : 'Expand section'}
          >
            {isCapsuleExpanded ? (
              <Minus className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
        {isCapsuleExpanded && (
          <>
            <p className={`mb-4 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Analyze individual capsule performance across matches, characters, and AI strategies.
            </p>
            <CapsuleSynergyAnalysis aggregatedData={aggregatedData} darkMode={darkMode} />
          </>
        )}
      </div>
    </div>
  );
}

export default MetaAnalysisContent;
