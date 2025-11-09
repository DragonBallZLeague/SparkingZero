/**
 * Build Analyzer Tool
 * Tab 3 of Capsule Synergy Analysis
 * 
 * Interactive tool for:
 * - Creating and analyzing custom builds
 * - Getting AI-powered build recommendations
 * - Validating builds against league rules
 * - Comparing build performance
 * 
 * Created: November 5, 2025
 */

import React, { useState, useMemo } from 'react';
import { validateBuild, getValidationMessage } from '../../config/buildRules.js';
import { analyzeBuildComposition } from '../../utils/capsuleEffectParser.js';
import { scoreBuild, generateRecommendedBuilds, suggestBuildImprovements } from '../../utils/buildRecommendationEngine.js';

export default function BuildAnalyzerTool({ 
  capsuleData, 
  performanceData, 
  synergyData, 
  aiCompatibilityData 
}) {
  const [mode, setMode] = useState('custom'); // 'custom' or 'recommended'
  const [selectedCapsules, setSelectedCapsules] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterArchetype, setFilterArchetype] = useState('all');
  const [recommendOptions, setRecommendOptions] = useState({
    targetAIStrategy: 'all',
    targetArchetype: 'all',
    maxBuilds: 5
  });
  const [recommendedBuilds, setRecommendedBuilds] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Available capsules for selection
  const availableCapsules = useMemo(() => {
    if (!capsuleData?.capsules) return [];
    
    let capsules = [...capsuleData.capsules];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      capsules = capsules.filter(cap => cap.name.toLowerCase().includes(term));
    }
    
    if (filterArchetype !== 'all') {
      capsules = capsules.filter(cap => cap.archetype === filterArchetype);
    }
    
    // Sort by performance score if available
    capsules.sort((a, b) => {
      const scoreA = performanceData?.[a.id]?.compositeScore || 0;
      const scoreB = performanceData?.[b.id]?.compositeScore || 0;
      return scoreB - scoreA;
    });
    
    return capsules;
  }, [capsuleData, searchTerm, filterArchetype, performanceData]);

  // Current build analysis
  const buildAnalysis = useMemo(() => {
    if (selectedCapsules.length === 0) return null;

    const validation = validateBuild(selectedCapsules);
    const composition = analyzeBuildComposition(selectedCapsules);
    const score = scoreBuild(
      selectedCapsules,
      performanceData || {},
      synergyData || {},
      aiCompatibilityData || {},
      recommendOptions.targetAIStrategy !== 'all' ? recommendOptions.targetAIStrategy : null,
      recommendOptions.targetArchetype !== 'all' ? recommendOptions.targetArchetype : null
    );

    return {
      validation,
      composition,
      score,
      totalCost: selectedCapsules.reduce((sum, cap) => sum + cap.cost, 0),
      capsuleCount: selectedCapsules.length
    };
  }, [selectedCapsules, performanceData, synergyData, aiCompatibilityData, recommendOptions]);

  // Build suggestions
  const suggestions = useMemo(() => {
    if (!showSuggestions || selectedCapsules.length === 0) return [];
    
    return suggestBuildImprovements(
      selectedCapsules,
      availableCapsules,
      synergyData || {},
      performanceData || {}
    ).slice(0, 5);
  }, [selectedCapsules, availableCapsules, synergyData, performanceData, showSuggestions]);

  // Get archetypes for filter
  const archetypes = useMemo(() => {
    if (!capsuleData?.capsuleMap) return [];
    const types = new Set(Object.values(capsuleData.capsuleMap).map(c => c.archetype).filter(Boolean));
    return Array.from(types).sort();
  }, [capsuleData]);

  // Get AI strategies
  const aiStrategies = useMemo(() => {
    if (!aiCompatibilityData) return [];
    return Object.keys(aiCompatibilityData).sort();
  }, [aiCompatibilityData]);

  // Add capsule to build
  const addCapsule = (capsule) => {
    if (selectedCapsules.find(c => c.id === capsule.id)) return;
    setSelectedCapsules([...selectedCapsules, capsule]);
  };

  // Remove capsule from build
  const removeCapsule = (capsuleId) => {
    setSelectedCapsules(selectedCapsules.filter(c => c.id !== capsuleId));
  };

  // Clear build
  const clearBuild = () => {
    setSelectedCapsules([]);
    setShowSuggestions(false);
  };

  // Generate recommendations
  const generateRecommendations = () => {
    const options = {
      targetAIStrategy: recommendOptions.targetAIStrategy !== 'all' ? recommendOptions.targetAIStrategy : null,
      targetArchetype: recommendOptions.targetArchetype !== 'all' ? recommendOptions.targetArchetype : null,
      aiStrategyCompatibility: aiCompatibilityData || {},
      maxBuilds: recommendOptions.maxBuilds,
      minCapsules: 3,
      preferHighSynergy: true
    };

    const builds = generateRecommendedBuilds(
      availableCapsules,
      performanceData || {},
      synergyData || {},
      options
    );

    setRecommendedBuilds(builds);
    setMode('recommended');
  };

  // Load recommended build
  const loadRecommendedBuild = (build) => {
    setSelectedCapsules(build.capsules);
    setMode('custom');
  };

  if (!capsuleData) {
    return (
      <div className="text-center text-gray-400 py-12">
        Loading capsule data...
      </div>
    );
  }

  return (
    <div className="build-analyzer-tool">
      {/* Mode Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-700 pb-2">
        <button
          onClick={() => setMode('custom')}
          className={`px-4 py-2 font-medium transition-colors ${
            mode === 'custom'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Custom Build
        </button>
        <button
          onClick={() => setMode('recommended')}
          className={`px-4 py-2 font-medium transition-colors ${
            mode === 'recommended'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Recommended Builds
        </button>
      </div>

      {mode === 'custom' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Build Creation */}
          <div>
            <h3 className="text-lg font-semibold text-gray-200 mb-4">Build Your Capsule Set</h3>
            
            {/* Capsule Selection */}
            <div className="mb-4">
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  placeholder="Search capsules..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
                <select
                  value={filterArchetype}
                  onChange={(e) => setFilterArchetype(e.target.value)}
                  className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="all">All</option>
                  {archetypes.map(arch => (
                    <option key={arch} value={arch}>{arch}</option>
                  ))}
                </select>
              </div>

              <div className="bg-gray-800 rounded border border-gray-700 max-h-64 overflow-y-auto">
                {availableCapsules.length === 0 ? (
                  <div className="p-4 text-gray-400 text-center">No capsules found</div>
                ) : (
                  availableCapsules.map(capsule => {
                    const isSelected = selectedCapsules.find(c => c.id === capsule.id);
                    const performance = performanceData?.[capsule.id];
                    
                    return (
                      <div
                        key={capsule.id}
                        onClick={() => !isSelected && addCapsule(capsule)}
                        className={`p-3 border-b border-gray-700 cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-gray-700 opacity-50 cursor-not-allowed'
                            : 'hover:bg-gray-700'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium text-gray-200">{capsule.name}</div>
                            <div className="flex gap-2 mt-1">
                              <span className={`px-2 py-0.5 rounded text-xs ${getArchetypeBadgeClass(capsule.archetype)}`}>
                                {capsule.archetype}
                              </span>
                              <span className="text-xs text-gray-400">Cost: {capsule.cost}</span>
                              {performance && (
                                <span className="text-xs text-blue-400">
                                  Score: {performance.compositeScore.toFixed(1)}
                                </span>
                              )}
                            </div>
                          </div>
                          {isSelected && (
                            <span className="text-green-400 text-sm">✓</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Current Build */}
            <div className="bg-gray-800 rounded border border-gray-700 p-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium text-gray-200">Current Build ({selectedCapsules.length}/7)</h4>
                {selectedCapsules.length > 0 && (
                  <button
                    onClick={clearBuild}
                    className="text-sm text-red-400 hover:text-red-300"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {selectedCapsules.length === 0 ? (
                <div className="text-gray-400 text-center py-4">
                  Select capsules to build your set
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedCapsules.map(capsule => (
                    <div
                      key={capsule.id}
                      className="flex justify-between items-center p-2 bg-gray-700 rounded"
                    >
                      <div>
                        <div className="text-gray-200">{capsule.name}</div>
                        <div className="text-xs text-gray-400">
                          {capsule.archetype} • Cost: {capsule.cost}
                        </div>
                      </div>
                      <button
                        onClick={() => removeCapsule(capsule.id)}
                        className="text-red-400 hover:text-red-300 px-2"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {buildAnalysis && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Total Cost:</span>
                    <span className={buildAnalysis.totalCost > 20 ? 'text-red-400 font-medium' : 'text-gray-200'}>
                      {buildAnalysis.totalCost}/20
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Validation:</span>
                    <span className={buildAnalysis.validation.isValid ? 'text-green-400' : 'text-red-400'}>
                      {buildAnalysis.validation.isValid ? '✓ Valid' : '✗ Invalid'}
                    </span>
                  </div>
                  {!buildAnalysis.validation.isValid && (
                    <div className="mt-2 text-xs text-red-400">
                      {getValidationMessage(buildAnalysis.validation)}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Suggestions Toggle */}
            {selectedCapsules.length > 0 && (
              <button
                onClick={() => setShowSuggestions(!showSuggestions)}
                className="mt-4 w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
              >
                {showSuggestions ? 'Hide' : 'Show'} Improvement Suggestions
              </button>
            )}

            {/* Suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="mt-4 bg-gray-800 rounded border border-gray-700 p-4">
                <h4 className="font-medium text-gray-200 mb-3">Suggested Additions</h4>
                <div className="space-y-2">
                  {suggestions.map(sugg => (
                    <div
                      key={sugg.capsule.id}
                      onClick={() => addCapsule(sugg.capsule)}
                      className="p-3 bg-gray-700 hover:bg-gray-600 rounded cursor-pointer transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-gray-200">{sugg.capsule.name}</div>
                          <div className="text-xs text-gray-400 mt-1">
                            Impact: {sugg.impactScore.toFixed(1)} • 
                            Synergy with {sugg.synergyCount} capsules
                          </div>
                        </div>
                        <span className="text-sm text-green-400">+{sugg.capsule.cost}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Build Analysis */}
          <div>
            <h3 className="text-lg font-semibold text-gray-200 mb-4">Build Analysis</h3>

            {!buildAnalysis ? (
              <div className="text-center text-gray-400 py-12">
                Add capsules to see analysis
              </div>
            ) : (
              <div className="space-y-4">
                {/* Score Breakdown */}
                <div className="bg-gray-800 rounded border border-gray-700 p-4">
                  <h4 className="font-medium text-gray-200 mb-3">Overall Score</h4>
                  <div className="text-3xl font-bold text-blue-400 mb-4">
                    {buildAnalysis.score.totalScore.toFixed(1)}
                  </div>
                  <div className="space-y-2 text-sm">
                    <ScoreBar 
                      label="Individual Performance" 
                      value={buildAnalysis.score.individualPerformance} 
                      max={40}
                    />
                    <ScoreBar 
                      label="Synergy Bonus" 
                      value={buildAnalysis.score.synergyBonus} 
                      max={30}
                    />
                    <ScoreBar 
                      label="AI Strategy Match" 
                      value={buildAnalysis.score.aiStrategyMatch} 
                      max={15}
                    />
                    <ScoreBar 
                      label="Archetype Alignment" 
                      value={buildAnalysis.score.archetypeAlignment} 
                      max={10}
                    />
                    <ScoreBar 
                      label="Cost Efficiency" 
                      value={buildAnalysis.score.costEfficiency} 
                      max={5}
                    />
                  </div>
                </div>

                {/* Composition */}
                <div className="bg-gray-800 rounded border border-gray-700 p-4">
                  <h4 className="font-medium text-gray-200 mb-3">Archetype Composition</h4>
                  <div className="mb-3">
                    <span className="text-gray-400 text-sm">Primary: </span>
                    <span className={`px-2 py-1 rounded text-sm ${getArchetypeBadgeClass(buildAnalysis.composition.primaryArchetype)}`}>
                      {buildAnalysis.composition.primaryArchetype || 'Mixed'}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {Object.entries(buildAnalysis.composition.archetypeCounts).map(([archetype, count]) => (
                      <div key={archetype} className="flex justify-between items-center">
                        <span className="text-gray-300">{archetype}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full"
                              style={{ width: `${(count / selectedCapsules.length) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-gray-400 text-sm w-8">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Validation Details */}
                <div className={`rounded border p-4 ${
                  buildAnalysis.validation.isValid
                    ? 'bg-green-900/20 border-green-500'
                    : 'bg-red-900/20 border-red-500'
                }`}>
                  <h4 className={`font-medium mb-2 ${
                    buildAnalysis.validation.isValid ? 'text-green-400' : 'text-red-400'
                  }`}>
                    League Rule Validation
                  </h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Capsule Count:</span>
                      <span className={buildAnalysis.capsuleCount <= 7 ? 'text-green-400' : 'text-red-400'}>
                        {buildAnalysis.capsuleCount}/7
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Total Cost:</span>
                      <span className={buildAnalysis.totalCost <= 20 ? 'text-green-400' : 'text-red-400'}>
                        {buildAnalysis.totalCost}/20
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Recommended Builds Mode */
        <div>
          {/* Recommendation Options */}
          <div className="bg-gray-800 rounded border border-gray-700 p-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-200 mb-4">Generate Recommendations</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Target AI Strategy</label>
                <select
                  value={recommendOptions.targetAIStrategy}
                  onChange={(e) => setRecommendOptions({ ...recommendOptions, targetAIStrategy: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-200"
                >
                  <option value="all">Any Strategy</option>
                  {aiStrategies.map(strat => (
                    <option key={strat} value={strat}>{strat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Target Archetype</label>
                <select
                  value={recommendOptions.targetArchetype}
                  onChange={(e) => setRecommendOptions({ ...recommendOptions, targetArchetype: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-200"
                >
                  <option value="all">Any Archetype</option>
                  {archetypes.map(arch => (
                    <option key={arch} value={arch}>{arch}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Number of Builds</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={recommendOptions.maxBuilds}
                  onChange={(e) => setRecommendOptions({ ...recommendOptions, maxBuilds: parseInt(e.target.value) || 5 })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-200"
                />
              </div>
            </div>
            <button
              onClick={generateRecommendations}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors"
            >
              Generate Recommended Builds
            </button>
          </div>

          {/* Recommended Builds List */}
          {recommendedBuilds.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              Click "Generate Recommended Builds" to see AI-powered suggestions
            </div>
          ) : (
            <div className="space-y-4">
              {recommendedBuilds.map((build, idx) => (
                <div key={idx} className="bg-gray-800 rounded border border-gray-700 p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-medium text-gray-200">
                        Build #{idx + 1} - Score: {build.scoreBreakdown.totalScore.toFixed(1)}
                      </h4>
                      <div className="text-sm text-gray-400 mt-1">
                        {build.composition.primaryArchetype} • {build.totalCost}/20 Cost • {build.capsules.length} Capsules
                      </div>
                    </div>
                    <button
                      onClick={() => loadRecommendedBuild(build)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                    >
                      Load Build
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="text-sm font-medium text-gray-300 mb-2">Capsules:</h5>
                      <div className="space-y-1">
                        {build.capsules.map(cap => (
                          <div key={cap.id} className="text-sm text-gray-400 flex justify-between">
                            <span>{cap.name}</span>
                            <span className="text-gray-500">{cap.cost}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h5 className="text-sm font-medium text-gray-300 mb-2">Score Breakdown:</h5>
                      <div className="space-y-1 text-xs">
                        <ScoreBar 
                          label="Performance" 
                          value={build.scoreBreakdown.individualPerformance} 
                          max={40}
                          compact
                        />
                        <ScoreBar 
                          label="Synergy" 
                          value={build.scoreBreakdown.synergyBonus} 
                          max={30}
                          compact
                        />
                        <ScoreBar 
                          label="AI Match" 
                          value={build.scoreBreakdown.aiStrategyMatch} 
                          max={15}
                          compact
                        />
                        <ScoreBar 
                          label="Archetype" 
                          value={build.scoreBreakdown.archetypeAlignment} 
                          max={10}
                          compact
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Score bar component
function ScoreBar({ label, value, max, compact = false }) {
  const percentage = (value / max) * 100;
  const color = percentage >= 70 ? 'bg-green-500' : percentage >= 40 ? 'bg-blue-500' : 'bg-yellow-500';
  
  return (
    <div className={compact ? 'mb-1' : 'mb-2'}>
      <div className="flex justify-between mb-1">
        <span className="text-gray-300">{label}</span>
        <span className="text-gray-400">{value.toFixed(1)}/{max}</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div
          className={`${color} h-2 rounded-full transition-all`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        ></div>
      </div>
    </div>
  );
}

// Helper function
function getArchetypeBadgeClass(archetype) {
  switch (archetype) {
    case 'Aggressive':
      return 'bg-red-900/50 text-red-300';
    case 'Defensive':
      return 'bg-blue-900/50 text-blue-300';
    case 'Technical':
      return 'bg-purple-900/50 text-purple-300';
    default:
      return 'bg-gray-800 text-gray-400';
  }
}
