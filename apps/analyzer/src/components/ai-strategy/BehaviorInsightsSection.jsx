import React, { useState, useMemo } from 'react';
import { Lightbulb, Brain, BarChart3, Package, ChevronDown, ChevronUp, CheckCircle, AlertTriangle, Star, TrendingUp, Swords, Flame, Shield, Target, MoveRight, Sparkles, GitBranch, Radio } from 'lucide-react';
import { generateBehavioralInsights } from '../../utils/aiStrategyInsights.js';
import InsightCard from './InsightCard.jsx';
import ActionComparisonBar from './ActionComparisonBar.jsx';
import { getBuildTypeColor } from '../../App.jsx';

// Icon mapping for archetypes
const iconMap = {
  'Swords': Swords,
  'Flame': Flame,
  'Star': Star,
  'Shield': Shield,
  'Target': Target,
  'MoveRight': MoveRight,
  'Sparkles': Sparkles,
  'GitBranch': GitBranch,
  'Radio': Radio
};

// Color mapping for archetypes
const getArchetypeColors = (color, darkMode) => {
  const colors = {
    red: darkMode ? 'text-red-400 bg-red-900/20 border-red-600' : 'text-red-600 bg-red-50 border-red-300',
    orange: darkMode ? 'text-orange-400 bg-orange-900/20 border-orange-600' : 'text-orange-600 bg-orange-50 border-orange-300',
    yellow: darkMode ? 'text-yellow-400 bg-yellow-900/20 border-yellow-600' : 'text-yellow-600 bg-yellow-50 border-yellow-300',
    blue: darkMode ? 'text-blue-400 bg-blue-900/20 border-blue-600' : 'text-blue-600 bg-blue-50 border-blue-300',
    purple: darkMode ? 'text-purple-400 bg-purple-900/20 border-purple-600' : 'text-purple-600 bg-purple-50 border-purple-300',
    indigo: darkMode ? 'text-indigo-400 bg-indigo-900/20 border-indigo-600' : 'text-indigo-600 bg-indigo-50 border-indigo-300',
    pink: darkMode ? 'text-pink-400 bg-pink-900/20 border-pink-600' : 'text-pink-600 bg-pink-50 border-pink-300',
    cyan: darkMode ? 'text-cyan-400 bg-cyan-900/20 border-cyan-600' : 'text-cyan-600 bg-cyan-50 border-cyan-300'
  };
  return colors[color] || colors.purple;
};

/**
 * BehaviorInsightsSection Component
 * 
 * Displays comprehensive behavioral insights for an AI strategy
 */
export default function BehaviorInsightsSection({ 
  aiMetrics, 
  allAIMetrics, 
  darkMode = false,
  characterFiltered = false,
  selectedCharacter = null
}) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [showKeyPatterns, setShowKeyPatterns] = useState(true);
  const [showBuildFrequencies, setShowBuildFrequencies] = useState(false);
  const [showCapsuleFrequencies, setShowCapsuleFrequencies] = useState(false);
  
  // Generate all insights
  const insights = useMemo(() => {
    const result = generateBehavioralInsights(aiMetrics, allAIMetrics, characterFiltered);
    console.log('[BehaviorInsights] Generated insights:', result);
    return result;
  }, [aiMetrics, allAIMetrics, characterFiltered]);
  
  // If no insights at all, don't render
  if (!insights) {
    return null;
  }
  
  const {
    keyInsights,
    archetype,
    effectiveness,
    actionFrequency,
    buildBehavioralImpact,
    capsuleBehavioralImpact,
    normalizedScores,
    dataQuality
  } = insights;
  
  console.log('[BehaviorInsights] buildBehavioralImpact:', buildBehavioralImpact);
  console.log('[BehaviorInsights] capsuleBehavioralImpact:', capsuleBehavioralImpact);
  
  return (
    <div className={`rounded-lg border ${
      darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
    }`}>
      {/* Header - Clickable to toggle collapse */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`w-full p-4 flex items-center justify-between cursor-pointer rounded transition-colors ${
          darkMode 
            ? 'bg-gray-700 hover:bg-gray-750 text-white' 
            : 'hover:bg-gray-50 text-gray-900'
        }`}
      >
        <div className="flex items-center gap-3">
          <Lightbulb className={`w-5 h-5 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
          <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Behavior Insights
            {characterFiltered && selectedCharacter && (
              <span className={`ml-2 text-sm font-normal ${
                darkMode ? 'text-purple-400' : 'text-purple-600'
              }`}>
                (AI with {selectedCharacter})
              </span>
            )}
          </h3>
          {keyInsights && keyInsights.length > 0 && (
            <span className={`text-xs px-2 py-1 rounded font-medium ${
              darkMode ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-700'
            }`}>
              {keyInsights.length}
            </span>
          )}
          {dataQuality && dataQuality.confidence === 'Low' && !isCollapsed && (
            <span className={`text-xs px-2 py-1 rounded ${
              darkMode ? 'bg-yellow-900/30 text-yellow-300' : 'bg-yellow-100 text-yellow-700'
            }`}>
              Limited Data
            </span>
          )}
        </div>
        {isCollapsed ? (
          <ChevronDown className={`w-5 h-5 transition-transform ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
        ) : (
          <ChevronUp className={`w-5 h-5 transition-transform ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
        )}
      </button>
      
      {/* Collapsible Content */}
      {!isCollapsed && (
        <div className={`p-6 space-y-6 border-t ${
          darkMode ? 'bg-gray-700 border-gray-700' : 'border-gray-200'
        }`}>
          {/* Key Behavioral Patterns - Collapsible */}
          {keyInsights && keyInsights.length > 0 && (
            <div className={`rounded-lg ${
                  darkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'
                }`}>
              <button
                onClick={() => setShowKeyPatterns(!showKeyPatterns)}
                className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  darkMode
                    ? 'bg-gray-800 border-gray-700 hover:bg-gray-750 text-white'
                    : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Lightbulb className={`w-5 h-5 ${
                    darkMode ? 'text-yellow-400' : 'text-yellow-600'
                  }`} />
                  <span className="font-bold text-sm">Key Behavioral Patterns</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    darkMode ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-700'
                  }`}>
                    {keyInsights.length}
                  </span>
                </div>
                {showKeyPatterns ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              
              {showKeyPatterns && (
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {keyInsights.map((insight, idx) => (
                      <InsightCard key={idx} insight={insight} darkMode={darkMode} />
                    ))}
                  </div>

                  {/* Behavioral Signature - Redesigned */}
                  {archetype && (
                  <div className="mt-4">
                    <div className={`flex items-center gap-2 mb-3 ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      <Brain className={`w-5 h-5 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                      <span className="font-bold text-sm">Behavioral Signature</span>
                    </div>
                  
                    {/* Primary and Secondary Archetypes - Side by Side */}
                    <div className={`grid ${archetype.secondary ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'} gap-3 mb-3`}>
                      {/* Primary Archetype */}
                      <div>
                        <div className={`text-xs font-medium uppercase tracking-wide mb-2 ${
                          darkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          Primary
                        </div>
                        {(() => {
                          const PrimaryIcon = iconMap[archetype.primary.icon] || Star;
                          const colorClasses = getArchetypeColors(archetype.primary.color, darkMode);
                          return (
                            <div className={`p-4 rounded-lg border-2 ${colorClasses}`}>
                              <div className="flex items-center gap-3">
                                <div className={`p-3 rounded-lg ${
                                  darkMode ? 'bg-gray-800/50' : 'bg-white/50'
                                }`}>
                                  <PrimaryIcon className="w-8 h-8" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-lg font-bold">
                                      {archetype.primary.archetype}
                                    </span>
                                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                                      darkMode ? 'bg-gray-800 text-gray-300' : 'bg-white/70 text-gray-700'
                                    }`}>
                                      {archetype.primary.score.toFixed(0)}%
                                    </span>
                                  </div>
                                  <div className={`text-sm ${
                                    darkMode ? 'text-gray-300' : 'text-gray-700'
                                  }`}>
                                    {archetype.primary.description}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Secondary Archetype */}
                      {archetype.secondary && (
                        <div>
                          <div className={`text-xs font-medium uppercase tracking-wide mb-2 ${
                            darkMode ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            Secondary
                          </div>
                          {(() => {
                            const SecondaryIcon = iconMap[archetype.secondary.icon] || Shield;
                            const colorClasses = getArchetypeColors(archetype.secondary.color, darkMode);
                            return (
                              <div className={`p-4 rounded-lg border-2 ${colorClasses}`}>
                                <div className="flex items-center gap-3">
                                  <div className={`p-3 rounded-lg ${
                                    darkMode ? 'bg-gray-800/50' : 'bg-white/50'
                                  }`}>
                                    <SecondaryIcon className="w-8 h-8" />
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-lg font-bold">
                                        {archetype.secondary.archetype}
                                      </span>
                                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                                        darkMode ? 'bg-gray-800 text-gray-300' : 'bg-white/70 text-gray-700'
                                      }`}>
                                        {archetype.secondary.score.toFixed(0)}%
                                      </span>
                                    </div>
                                    <div className={`text-sm ${
                                      darkMode ? 'text-gray-300' : 'text-gray-700'
                                    }`}>
                                      {archetype.secondary.description}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                      
                    {/* Sub-Types - Compact Horizontal Pills with Tooltips */}
                    {archetype.subTypes && archetype.subTypes.length > 0 && (
                      <div className="space-y-2">
                        <div className={`text-xs font-medium uppercase tracking-wide ${
                          darkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          Fighting Styles
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {archetype.subTypes.map((subType, idx) => {
                            const SubTypeIcon = iconMap[subType.icon] || Target;
                            const colorClasses = getArchetypeColors(subType.color, darkMode);
                            return (
                              <div 
                                key={idx}
                                title={subType.description}
                                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border ${colorClasses} cursor-help transition-all hover:scale-105`}
                              >
                                <SubTypeIcon className="w-4 h-4 flex-shrink-0" />
                                <div>
                                  <div className="text-sm font-medium">
                                    {subType.archetype}
                                  </div>
                                  <div className={`text-xs ${
                                    darkMode ? 'text-gray-400' : 'text-gray-600'
                                  }`}>
                                    {subType.score.toFixed(0)}%
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Frequency Analysis - Always Expanded */}
                {actionFrequency && actionFrequency.length > 0 && (
                  <div className="mt-4">
                    <div className={`flex items-center gap-2 mb-3 ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      <BarChart3 className={`w-5 h-5 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                      <span className="font-bold text-sm">Action Frequency Analysis</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        darkMode ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {actionFrequency.filter(a => a.isSignature || a.isRare).length} notable
                      </span>
                    </div>
                  
                    <div className="grid grid-cols-1 md:grid-cols-2 ">
                      {actionFrequency.map((actionInsight, idx) => (
                        <ActionComparisonBar
                          key={idx}
                          actionInsight={actionInsight}
                          darkMode={darkMode}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            </div>
          )}
      
      {/* Build Behavioral Impact - Collapsible */}
      {buildBehavioralImpact && buildBehavioralImpact.impacts && buildBehavioralImpact.impacts.length > 0 && (
        <div className={`rounded-lg ${
            darkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'
            }`}>
          <button
            onClick={() => setShowBuildFrequencies(!showBuildFrequencies)}
            className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
              darkMode
                ? 'bg-gray-800 border-gray-700 hover:bg-gray-750 text-white'
                : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-900'
            }`}>
            <div className="flex items-center gap-2">
              <Package className={`w-5 h-5 ${
                darkMode ? 'text-blue-400' : 'text-blue-600'
              }`} />
              <span className="font-bold text-sm">Build Type Action Frequencies</span>
              <span className={`text-xs px-2 py-0.5 rounded ${
                darkMode ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-700'
              }`}>
                {buildBehavioralImpact.impacts.length}
              </span>
            </div>
            {showBuildFrequencies ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          {showBuildFrequencies && (
          <div className="p-4 space-y-3">
            {/* Most Common Build Note */}
            {buildBehavioralImpact.mostDistinct && (
              <div className={`p-3 rounded-lg border ${
                darkMode ? 'bg-blue-900/20 border-blue-600' : 'bg-blue-50 border-blue-200'
              }`}>
                <div className={`flex items-start gap-2 ${
                  darkMode ? 'text-blue-300' : 'text-blue-700'
                }`}>
                  <Brain className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <span className="font-bold">Most Used:</span> {buildBehavioralImpact.mostDistinct.buildType} ({buildBehavioralImpact.mostDistinct.percentage.toFixed(1)}% usage, {buildBehavioralImpact.mostDistinct.winRate.toFixed(1)}% WR)
                  </div>
                </div>
              </div>
            )}
            
            {/* Build Action Frequencies Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {buildBehavioralImpact.impacts.map((impact, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border ${
                    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="mb-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded border ${getBuildTypeColor(impact.buildType, darkMode)}`}>
                      {impact.buildType}
                    </span>
                  </div>
                  <div className={`text-xs mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {impact.count} matches
                  </div>
                  <div className={`space-y-1.5 text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {impact.frequencies && impact.frequencies.map((freq, freqIdx) => (
                      <div key={freqIdx} className="flex flex-col gap-0.5">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{freq.action}</span>
                          {freq.percentDiff !== null && (
                            <span className={`text-xs font-bold ${
                              freq.direction === 'above'
                                ? (darkMode ? 'text-green-400' : 'text-green-600')
                                : (darkMode ? 'text-orange-400' : 'text-orange-600')
                            }`}>
                              {freq.direction === 'above' ? '+' : ''}{freq.percentDiff}%
                            </span>
                          )}
                        </div>
                        <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {freq.value.toFixed(1)} per match
                          {freq.avg && (
                            <span className="ml-1">(avg: {freq.avg.toFixed(1)})</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}
        </div>
      )}
      
      {/* Capsule Behavioral Impact - Collapsible */}
      {characterFiltered && !capsuleBehavioralImpact && (
        <div className={`p-3 rounded-lg border ${
          darkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'
        }`}>
          <div className={`flex items-center gap-2 text-sm ${
            darkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            <Package className="w-4 h-4" />
            <span>Capsule analysis unavailable - all capsules appear together in every match</span>
          </div>
        </div>
      )}
      {capsuleBehavioralImpact && capsuleBehavioralImpact.impacts && capsuleBehavioralImpact.impacts.length > 0 && (
        <div className={`rounded-lg ${
            darkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'
            }`}>
          <button
            onClick={() => setShowCapsuleFrequencies(!showCapsuleFrequencies)}
            className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
              darkMode
                ? 'bg-gray-800 border-gray-700 hover:bg-gray-750 text-white'
                : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-900'
            }`}>
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              <span className="font-bold text-sm">Capsule Action Frequency Analysis</span>
              <span className={`text-xs px-2 py-0.5 rounded ${
                darkMode ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-700'
              }`}>
                {capsuleBehavioralImpact.impacts.length}
              </span>
            </div>
            {showCapsuleFrequencies ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          {showCapsuleFrequencies && (
          <div className="p-4 space-y-3">
            {/* Most Impactful Capsule */}
            {capsuleBehavioralImpact.mostImpactful && (
              <div className={`p-3 rounded-lg border ${
                darkMode ? 'bg-purple-900/20 border-purple-600' : 'bg-purple-50 border-purple-200'
              }`}>
                <div className={`flex items-start gap-2 ${
                  darkMode ? 'text-purple-300' : 'text-purple-700'
                }`}>
                  <Star className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <span className="font-bold">Most Used:</span> {capsuleBehavioralImpact.mostImpactful.name} ({capsuleBehavioralImpact.mostImpactful.count} matches, {capsuleBehavioralImpact.mostImpactful.winRate.toFixed(1)}% WR)
                  </div>
                </div>
              </div>
            )}
            
            {/* Capsule List */}
            <div className="space-y-2">
              {capsuleBehavioralImpact.impacts.map((impact, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border ${
                    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="mb-2">
                    <div className={`text-sm font-medium mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {impact.name}
                    </div>
                    <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {impact.count} uses • {impact.winRate.toFixed(1)}% WR
                    </div>
                  </div>
                  <div className={`space-y-1.5 text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {impact.frequencies && impact.frequencies.map((freq, freqIdx) => (
                      <div key={freqIdx} className="flex flex-col gap-0.5">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{freq.action}</span>
                          {freq.percentDiff !== null && (
                            <span className={`text-xs font-bold ${
                              freq.direction === 'above'
                                ? (darkMode ? 'text-green-400' : 'text-green-600')
                                : (darkMode ? 'text-orange-400' : 'text-orange-600')
                            }`}>
                              {freq.direction === 'above' ? '+' : ''}{freq.percentDiff}%
                            </span>
                          )}
                        </div>
                        <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {freq.value.toFixed(1)} per match
                          {freq.avg && (
                            <span className="ml-1">(avg: {freq.avg.toFixed(1)})</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}
        </div>
      )}
        </div>
      )}
    </div>
  );
}
