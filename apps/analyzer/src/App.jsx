import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useFloating, offset, flip, autoUpdate } from '@floating-ui/react';
import Autocomplete from '@mui/material/Autocomplete';
import MUITextField from '@mui/material/TextField';
import './App.css';
import BRDataSelector from './components/BRDataSelector.jsx';
import { Combobox } from './components/Combobox.jsx';
import { MultiSelectCombobox } from './components/MultiSelectCombobox.jsx';
import { formatNumber } from './utils/formatters.js';
import DataTable from './components/DataTable.jsx';
import { prepareCharacterAveragesData, prepareMatchDetailsData, getCharacterAveragesTableConfig, getMatchDetailsTableConfig, getMetaTableConfig } from './components/TableConfigs.jsx';
import { exportToExcel } from './utils/excelExport.js';
import { PerFormStatsDisplay, PerFormStatsDisplayAggregated } from './components/PerFormStatsDisplay.jsx';
import { calculatePerFormStats } from './utils/formStatsCalculator.js';
import CapsuleSynergyAnalysis from './components/CapsuleSynergyAnalysis.jsx';
import { loadCapsuleData } from './utils/capsuleDataProcessor.js';
import { 
  Trophy, 
  Swords, 
  Target, 
  Zap, 
  Clock, 
  Heart, 
  Shield, 
  Upload,
  BarChart3,
  Users,
  FileText,
  Database,
  TrendingUp,
  Eye,
  Star,
  Settings,
  Package,
  Moon,
  Sun,
  Table,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Info,
  Search,
  X,
  ArrowUpDown,
  Filter,
  Download
} from 'lucide-react';
import UploadWidgetLauncher from './UploadWidgetLauncher';
// Reference data CSVs (raw imports) - now using shared referencedata folder
import charactersCSV from '../../../referencedata/characters.csv?raw';
import capsulesCSV from '../../../referencedata/capsules.csv?raw';
// Preload reference JSON files shipped with the analyzer (Vite import.meta.glob)
// Each entry may be a module object; code uses module.default || module
const dataFiles = import.meta.glob('../BR_Data/*.json', { eager: true });
// Small stat bar used in the match panels
function StatBar({ value, maxValue, displayValue, type = 'damage', isInverse = false, label = '', icon: Icon = Target, darkMode = false }) {
  const percentage = Math.min((value / maxValue) * 100, 100);
  const displayPercentage = isInverse ? 100 - percentage : percentage;
  const actualDisplayValue = displayValue !== undefined ? displayValue : value;

  const getColorClass = () => {
    switch (type) {
      case 'damage': return 'bg-red-500';
      case 'health': return 'bg-green-500';
      case 'special': return 'bg-purple-500';
      case 'ultimate': return 'bg-orange-500';
      case 'taken': return 'bg-blue-500';
      case 'time': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`} />
        <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{label}</span>
      </div>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{formatNumber(actualDisplayValue)}</span>
      </div>
      <div className={`w-full rounded-full h-2 ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${getColorClass()}`}
          style={{ width: `${displayPercentage}%` }}
        />
      </div>
    </div>
  );
}

// Parse capsules CSV data
function parseCapsules(csvText) {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',');
  const capsules = {};
  const aiStrategies = {};
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const item = {
      name: values[0]?.trim(),
      id: values[1]?.trim(),
      type: values[2]?.trim(),
      exclusiveTo: values[3]?.trim(),
      cost: parseInt(values[4]) || 0,
      effect: values[5]?.trim()
    };
    
    if (item.id) {
      // Only include actual gameplay capsules and AI strategies
      if (item.type === 'Capsule') {
        capsules[item.id] = item;
      } else if (item.type === 'AI') {
        aiStrategies[item.id] = item;
      }
      // Skip Costume and Sparking BGM as they are cosmetic
    }
  }
  
  return { capsules, aiStrategies };
}

function PerformanceIndicator({ value, allValues, type = 'damage', isInverse = false, darkMode = false }) {
  // For inverse, flip the values for robust stats
  let values = allValues;
  let val = value;
  if (isInverse) {
    const maxValue = Math.max(...allValues);
    values = allValues.map(v => maxValue - v);
    val = maxValue - value;
  }
  const level = getPerformanceLevel(val, values);
  let colorClass;
  switch (level) {
    case 'excellent':
      colorClass = darkMode ? 'bg-green-900/30 text-green-300 border-green-600' : 'bg-green-100 text-green-800 border-green-200';
      break;
    case 'good':
      colorClass = darkMode ? 'bg-blue-900/30 text-blue-300 border-blue-600' : 'bg-blue-100 text-blue-800 border-blue-200';
      break;
    case 'average':
      colorClass = darkMode ? 'bg-yellow-900/30 text-yellow-300 border-yellow-600' : 'bg-yellow-100 text-yellow-800 border-yellow-200';
      break;
    case 'below-average':
      colorClass = darkMode ? 'bg-red-900/30 text-red-300 border-red-600' : 'bg-red-100 text-red-800 border-red-200';
      break;
    default:
      colorClass = darkMode ? 'bg-gray-900/30 text-gray-300 border-gray-600' : 'bg-gray-100 text-gray-800 border-gray-200';
  }
  return (
    <span className={`inline-flex items-center gap-2 px-2 py-2 rounded-lg text-base font-bold border-2 ${colorClass}`}>
      <Star className="w-4 h-4" />
      <span>Score:</span>
      <span className="text-base">{Math.round(value)}</span>
    </span>
  );
}

// Performance Indicator Label Component (for combat stats)
// Displays performance level text like "EXCELLENT", "GOOD", etc.
function PerformanceIndicatorLabel({ value, allValues, type = 'damage', isInverse = false, darkMode = false }) {
  // For inverse, flip the values for robust stats
  let values = allValues;
  let val = value;
  if (isInverse) {
    const maxValue = Math.max(...allValues);
    values = allValues.map(v => maxValue - v);
    val = maxValue - value;
  }
  const level = getPerformanceLevel(val, values);
  let colorClass, icon;
  switch (level) {
    case 'excellent':
      colorClass = darkMode ? 'bg-green-900/30 text-green-300 border-green-600' : 'bg-green-100 text-green-800 border-green-200';
      icon = <Star className="w-3 h-3" />;
      break;
    case 'good':
      colorClass = darkMode ? 'bg-blue-900/30 text-blue-300 border-blue-600' : 'bg-blue-100 text-blue-800 border-blue-200';
      icon = <TrendingUp className="w-3 h-3" />;
      break;
    case 'average':
      colorClass = darkMode ? 'bg-yellow-900/30 text-yellow-300 border-yellow-600' : 'bg-yellow-100 text-yellow-800 border-yellow-200';
      icon = <Eye className="w-3 h-3" />;
      break;
    case 'below-average':
      colorClass = darkMode ? 'bg-red-900/30 text-red-300 border-red-600' : 'bg-red-100 text-red-800 border-red-200';
      icon = <Target className="w-3 h-3" />;
      break;
    default:
      colorClass = darkMode ? 'bg-gray-900/30 text-gray-300 border-gray-600' : 'bg-gray-100 text-gray-800 border-gray-200';
      icon = <Target className="w-3 h-3" />;
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${colorClass}`}>
      {icon}
      {level.toUpperCase()}
    </span>
  );
}

// Performance Score Badge Component
// Displays a large performance score with color coding based on level
function PerformanceScoreBadge({ score, label = 'Score', size = 'medium', darkMode = false, allScores = [] }) {
  // Use relative scoring if allScores provided, otherwise use fixed thresholds
  let level;
  if (allScores && allScores.length > 0) {
    level = getPerformanceLevel(score, allScores);
  } else {
    // Fallback to fixed thresholds
    const getScoreLevel = (score) => {
      if (score >= 200) return 'excellent';  // Top tier performance
      if (score >= 120) return 'good';       // Strong performance
      if (score >= 80) return 'average';     // Decent performance
      if (score >= 40) return 'below-average'; // Weak performance
      return 'poor';                          // Very poor performance
    };
    level = getScoreLevel(score);
  }
  
  const colorClasses = {
    excellent: darkMode ? 'bg-green-900/30 text-green-300 border-green-600' : 'bg-green-100 text-green-700 border-green-300',
    good: darkMode ? 'bg-blue-900/30 text-blue-300 border-blue-600' : 'bg-blue-100 text-blue-700 border-blue-300',
    average: darkMode ? 'bg-yellow-900/30 text-yellow-300 border-yellow-600' : 'bg-yellow-100 text-yellow-700 border-yellow-300',
    'below-average': darkMode ? 'bg-orange-900/30 text-orange-300 border-orange-600' : 'bg-orange-100 text-orange-700 border-orange-300',
    poor: darkMode ? 'bg-red-900/30 text-red-300 border-red-600' : 'bg-red-100 text-red-700 border-red-300'
  };

  const sizeClasses = {
    small: 'text-sm px-2 py-0',
    medium: 'text-base px-3 py-1.5',
    large: 'text-lg px-4 py-2'
  };

  return (
    <div className={`inline-flex items-center gap-2 rounded-lg border font-bold ${colorClasses[level]} ${sizeClasses[size]}`}>
      <Star className={size === 'small' ? 'w-3 h-3' : size === 'medium' ? 'w-4 h-4' : 'w-5 h-5'} />
      <span>{label}: {Math.round(score)}</span>
    </div>
  );
}

// Stat Group Component
// Groups related stats under a header with icon
function StatGroup({ title, icon: Icon, children, darkMode = false, collapsible = false, defaultCollapsed = false, iconColor = 'gray' }) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const iconColorClasses = {
    red: darkMode ? 'text-red-400' : 'text-red-600',
    green: darkMode ? 'text-green-400' : 'text-green-600',
    yellow: darkMode ? 'text-yellow-400' : 'text-yellow-600',
    purple: darkMode ? 'text-purple-400' : 'text-purple-600',
    gray: darkMode ? 'text-gray-300' : 'text-gray-600'
  };

  return (
    <div className={`${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'} rounded-lg p-3`}>
      <div 
        className={`flex items-center gap-2 mb-2 ${collapsible ? 'cursor-pointer' : ''}`}
        onClick={() => collapsible && setCollapsed(!collapsed)}
      >
        <Icon className={`w-4 h-4 ${iconColorClasses[iconColor]}`} />
        <span className={`text-sm font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
          {title}
        </span>
        {collapsible && (
          <div className="ml-auto">
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </div>
        )}
      </div>
      {!collapsed && <div>{children}</div>}
    </div>
  );
}

// Metric Display Component
// Displays a single metric with label and value
function MetricDisplay({ label, value, icon: Icon, color = 'gray', darkMode = false, size = 'medium' }) {
  const colorClasses = {
    red: darkMode ? 'text-red-400' : 'text-red-600',
    blue: darkMode ? 'text-blue-400' : 'text-blue-600',
    green: darkMode ? 'text-green-400' : 'text-green-600',
    yellow: darkMode ? 'text-yellow-400' : 'text-yellow-600',
    purple: darkMode ? 'text-purple-400' : 'text-purple-600',
    orange: darkMode ? 'text-orange-400' : 'text-orange-600',
    teal: darkMode ? 'text-teal-400' : 'text-teal-600',
    gray: darkMode ? 'text-gray-400' : 'text-gray-600'
  };

  const sizeClasses = {
    small: { label: 'text-xs', value: 'text-sm' },
    medium: { label: 'text-sm', value: 'text-base font-bold' },
    large: { label: 'text-sm', value: 'text-lg font-bold' }
  };

  return (
    <div className="flex items-center justify-between">
      <span className={`${sizeClasses[size].label} ${darkMode ? 'text-gray-400' : 'text-gray-600'} flex items-center gap-1`}>
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </span>
      <span className={`${sizeClasses[size].value} ${colorClasses[color]}`}>
        {value}
      </span>
    </div>
  );
}

// Blast Metric Display Component
// Displays blast tracking with hit/thrown/rate format: "X/Y (Z%)"
// Legacy mode displays only thrown count (for old JSON format without hit data)
function BlastMetricDisplay({ label, thrown, hit, hitRate, color = 'blue', darkMode = false, size = 'medium', legacyMode = false }) {
  const getColorClass = () => {
    const colors = {
      orange: darkMode ? 'text-orange-400' : 'text-orange-600',
      red: darkMode ? 'text-red-400' : 'text-red-600',
      yellow: darkMode ? 'text-yellow-400' : 'text-yellow-600',
      purple: darkMode ? 'text-purple-400' : 'text-purple-600',
      blue: darkMode ? 'text-blue-400' : 'text-blue-600',
      cyan: darkMode ? 'text-cyan-400' : 'text-cyan-600',
    };
    return colors[color] || colors.blue;
  };

  const getRateColorClass = () => {
    // If no blasts thrown (hitRate is null), use gray
    if (hitRate === null) return darkMode ? 'text-gray-400' : 'text-gray-600';
    if (hitRate >= 70) return darkMode ? 'text-green-400' : 'text-green-600';
    if (hitRate >= 50) return darkMode ? 'text-yellow-400' : 'text-yellow-600';
    return darkMode ? 'text-red-400' : 'text-red-600';
  };

  const sizeClasses = {
    small: { label: 'text-xs', value: 'text-sm' },
    medium: { label: 'text-sm', value: 'text-base font-bold' },
    large: { label: 'text-sm', value: 'text-lg font-bold' }
  };

  // Legacy mode - display only thrown count (old JSON format)
  if (legacyMode) {
    return (
      <div className="flex items-center justify-between">
        <span className={`${sizeClasses[size].label} ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {label}
        </span>
        <span className={`${sizeClasses[size].value} ${getColorClass()}`}>
          {thrown || 0}
        </span>
      </div>
    );
  }

  // New format - display hit/thrown/rate
  return (
    <div className={`flex items-center justify-between p-2 rounded ${
      darkMode ? 'bg-gray-800/50' : 'bg-gray-100'
    }`}>
      <span className={`${sizeClasses[size].label} font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        {label}
      </span>
      <div className="flex items-center gap-2">
        <span className={`font-mono font-bold ${sizeClasses[size].value} ${getColorClass()}`}>
          {hit}/{thrown}
        </span>
        <span className={`font-mono font-bold ${sizeClasses[size].value} ${getRateColorClass()}`}>
          ({hitRate !== null ? `${hitRate.toFixed(1)}%` : 'N/A'})
        </span>
      </div>
    </div>
  );
}

// Calculate performance score for a single match character
function calculateMatchPerformanceScore(stats) {
  const avgDamage = stats.damageDone || 0;
  const avgTaken = stats.damageTaken || 1; // Avoid division by zero
  const avgBattleTime = stats.battleTime || 1; // Avoid division by zero
  const healthRetention = stats.hPGaugeValueMax > 0 ? stats.hPGaugeValue / stats.hPGaugeValueMax : 0;
  
  const damageEfficiency = avgTaken > 0 ? avgDamage / avgTaken : avgDamage / 1000;
  const damagePerSecond = avgBattleTime > 0 ? avgDamage / avgBattleTime : 0;
  
  // Base performance score (normalized metrics) - matches aggregated calculation
  const baseScore = (
    (avgDamage / 100000) * 35 +        // Damage dealt weight: 35%
    (damageEfficiency) * 25 +          // Damage efficiency weight: 25%
    (damagePerSecond / 1000) * 25 +    // Damage per second weight: 25%
    (healthRetention) * 15             // Health retention weight: 15%
  );
  
  // No experience multiplier for single match (that's for aggregated only)
  return baseScore; // Returns score in 0-300+ range naturally
}

function parseCharacterCSV(csv) {
  const lines = csv.split(/\r?\n/).filter(Boolean);
  const map = {};
  for (let i = 1; i < lines.length; i++) {
    const [name, id] = lines[i].split(',');
    if (id) map[id.trim()] = name.trim();
  }
  return map;
}

function getTeams(characterRecord) {
  const p1Keys = Object.keys(characterRecord).filter(k => k.includes('１Ｐ') || k.includes('AlliesTeamMember'));
  const p2Keys = Object.keys(characterRecord).filter(k => k.includes('２Ｐ') || k.includes('EnemyTeamMember'));
  return {
    p1: p1Keys.map(k => ({ ...characterRecord[k], _key: k })),
    p2: p2Keys.map(k => ({ ...characterRecord[k], _key: k }))
  };
}

function extractStats(char, charMap, capsuleMap = {}, position = null, aiStrategiesMap = {}) {
  const play = char.battlePlayCharacter || {};
  const count = char.battleCount || {};
  const numCount = count.battleNumCount || {};
  const runBlastCount = count.runBlastCount || {};
  const attackHitCount = count.attackHitCount || {};
  const originalForm = char.battlePlayCharacter?.originalCharacter?.key;
  const currentForm = play.character?.key;
  const charId = originalForm || currentForm || '';
  const name = charMap[charId] || charId || '-';
  
  // Form change history - only show if character actually changed forms
  let formNames = '';
  if (Array.isArray(char.formChangeHistory) && char.formChangeHistory.length > 0) {
    const forms = [originalForm, ...char.formChangeHistory.map(f => f.key)].filter(Boolean);
    formNames = forms.map(f => charMap[f] || f).join(', ');
  }
  
  // Equipment analysis - filter to ONLY capsules (00_0_XXXX pattern)
  const equipItems = play.equipItem || [];
  const equippedCapsules = equipItems
    .map(item => item.key)
    .filter(key => key && key.startsWith('00_0_')) // Only include actual capsules
    .filter(key => capsuleMap[key]) // Only include capsules in our reference data
    .map(key => ({
      id: key,
      name: capsuleMap[key].name,
      capsule: capsuleMap[key]
    }));
  
  const totalCapsuleCost = equippedCapsules.reduce((sum, item) => sum + (item.capsule.cost || 0), 0);
  
  // Extract AI strategy from equipped items
  let aiStrategy = null;
  for (const item of equipItems) {
    const strategy = aiStrategiesMap[item.key];
    if (strategy) {
      aiStrategy = strategy.name;
      break; // Found the AI strategy, stop looking
    }
  }
  // If no AI strategy found, use "Default"
  if (!aiStrategy) {
    aiStrategy = 'Default';
  }
  
  // Categorize capsules by build type using metadata
  const capsuleTypes = {
    melee: 0,
    blast: 0,
    kiBlast: 0,
    defense: 0,
    skill: 0,
    kiEfficiency: 0,
    utility: 0
  };

  const capsuleCosts = {
    melee: 0,
    blast: 0,
    kiBlast: 0,
    defense: 0,
    skill: 0,
    kiEfficiency: 0,
    utility: 0
  };

  equippedCapsules.forEach(item => {
    const buildType = item.capsule.buildType?.toLowerCase() || 'unknown';
    const cost = item.capsule.cost || 0;
    
    switch (buildType) {
      case 'melee':
        capsuleTypes.melee++;
        capsuleCosts.melee += cost;
        break;
      case 'blast':
        capsuleTypes.blast++;
        capsuleCosts.blast += cost;
        break;
      case 'ki blast':  // Normalized format (spaces, not hyphens)
        capsuleTypes.kiBlast++;
        capsuleCosts.kiBlast += cost;
        break;
      case 'defense':
        capsuleTypes.defense++;
        capsuleCosts.defense += cost;
        break;
      case 'skill':
        capsuleTypes.skill++;
        capsuleCosts.skill += cost;
        break;
      case 'ki efficiency':  // Normalized format (spaces, not hyphens)
        capsuleTypes.kiEfficiency++;
        capsuleCosts.kiEfficiency += cost;
        break;
      case 'utility':
        capsuleTypes.utility++;
        capsuleCosts.utility += cost;
        break;
    }
  });
  
  // Parse blast counts for detailed super blast tracking
  let spm1Count = 0;
  let spm2Count = 0;
  let exa1Count = 0;
  let exa2Count = 0;
  
  Object.entries(runBlastCount).forEach(([key, value]) => {
    if (key.includes('SPM1')) spm1Count += value;
    else if (key.includes('SPM2') || key.includes('SPM3')) spm2Count += value;
    else if (key.includes('EXA1')) exa1Count += value;
    else if (key.includes('EXA2')) exa2Count += value;
  });
  
  // New blast tracking system - parse additionalCounts if available
  const additionalCounts = char.additionalCounts || {};
  const hasAdditionalCounts = char.additionalCounts !== undefined;
  
  // New blast tracking (preferred method with fallback to old method)
  const s1Blast = additionalCounts.s1Blast ?? spm1Count;
  const s2Blast = additionalCounts.s2Blast ?? spm2Count;
  const ultBlast = additionalCounts.ultBlast ?? (numCount.uLTCount || 0);
  // Hit blast values should remain undefined for legacy data (no fallback to 0)
  const s1HitBlast = additionalCounts.s1HitBlast;
  const s2HitBlast = additionalCounts.s2HitBlast;
  const uLTHitBlast = additionalCounts.uLTHitBlast;
  const tags = additionalCounts.tags ?? 0;
  
  // Calculate hit rates (percentage) - null if no blasts thrown
  const s1HitRate = s1Blast > 0 ? (s1HitBlast / s1Blast) * 100 : null;
  const s2HitRate = s2Blast > 0 ? (s2HitBlast / s2Blast) * 100 : null;
  const ultHitRate = ultBlast > 0 ? (uLTHitBlast / ultBlast) * 100 : null;
  
  // Parse attack hit counts for combat performance metrics
  let speedImpactCount = 0;
  let speedImpactWins = 0;
  
  Object.entries(attackHitCount).forEach(([key, value]) => {
    // Speed Impact triggers - these indicate speed impact usage
    if (key.includes('actSPIMPO') || key.includes('actRI')) {
      speedImpactCount += value;
    }
  });
  
  // Speed impact wins are tracked in battleNumCount.speedImpactWinCount
  
  return {
    name,
    damageDone: count.givenDamage || 0,
    damageTaken: count.takenDamage || 0,
    battleTime: parseBattleTime(count.battleTime) || 0,
    hPGaugeValue: play.hPGaugeValue || 0,
    hPGaugeValueMax: play.hPGaugeValueMax || 40000,
    specialMovesUsed: numCount.sPMCount || 0,
    ultimatesUsed: numCount.uLTCount || 0,
    skillsUsed: numCount.eXACount || 0,
    kills: count.killCount || 0,
    formChangeHistory: formNames,
    // Survival & Health metrics
    sparkingCount: numCount.sparkingCount || 0,
    chargeCount: numCount.chargeCount || 0,
    guardCount: numCount.guardCount || 0,
    shotEnergyBulletCount: numCount.shotEnergyBulletCount || 0,
    zCounterCount: numCount.zCounter || 0,
    superCounterCount: numCount.superCounterCount || 0,
    revengeCounterCount: numCount.revengeCounter || 0,
    tags, // New: Character swap tracking
    // Special Abilities - detailed blast tracking (NEW SYSTEM)
    hasAdditionalCounts, // Flag to determine if new format with additionalCounts
    s1Blast,        // Super 1 thrown
    s2Blast,        // Super 2 thrown
    ultBlast,       // Ultimate thrown
    s1HitBlast,     // Super 1 hit
    s2HitBlast,     // Super 2 hit
    uLTHitBlast,    // Ultimate hit
    s1HitRate,      // Super 1 hit rate %
    s2HitRate,      // Super 2 hit rate %
    ultHitRate,     // Ultimate hit rate %
    // Legacy blast tracking (kept for backwards compatibility)
    spm1Count: s1Blast,
    spm2Count: s2Blast,
    exa1Count,
    exa2Count,
    dragonDashMileage: parseFloat((count.dragonDashMileage || 0).toFixed(0)),
    // Combat Performance metrics
    maxComboNum: count.maxComboNum || 0,
    maxComboDamage: count.maxComboDamage || 0,
    throwCount: numCount.throwCount || 0,
    lightningAttackCount: numCount.lightningAttack || 0,
    vanishingAttackCount: numCount.vanishingAttack || 0,
    dragonHomingCount: numCount.dragonHoming || 0,
    speedImpactCount: numCount.speedImpactCount || speedImpactCount,
    speedImpactWins: numCount.speedImpactWinCount || 0,
    sparkingComboCount: numCount.sparkingCount > 0 ? count.maxComboNum || 0 : 0,
    // Position tracking
    position: position,
    // Equipment data
    equippedCapsules,
    totalCapsuleCost,
    capsuleTypes,
    capsuleCosts,
    buildComposition: getBuildComposition(capsuleCosts), // New 7-category system
    aiStrategy
  };
}

// Helper function to parse battle time format "+00000000.00:02:54.470000000" to seconds
function parseBattleTime(timeString) {
  if (!timeString || typeof timeString !== 'string') return 0;
  
  // Format: "+00000000.00:02:54.470000000"
  // Extract the time part after the first colon
  const timeMatch = timeString.match(/(\d{2}):(\d{2}):(\d{2})\.(\d+)/);
  if (!timeMatch) return 0;
  
  const hours = parseInt(timeMatch[1], 10);
  const minutes = parseInt(timeMatch[2], 10);
  const seconds = parseInt(timeMatch[3], 10);
  const milliseconds = parseInt(timeMatch[4].substring(0, 3), 10); // Take first 3 digits for milliseconds
  
  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
}

// Helper function to format seconds back to readable time
function formatBattleTime(seconds) {
  if (!seconds || seconds === 0) return '0:00';
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Component to show battle time variance from average
function BattleTimeVariance({ value, averageValue, darkMode = false }) {
  const variance = value - averageValue;
  const isAbove = variance > 0;
  const absVariance = Math.abs(variance);
  
  if (Math.abs(variance) < 1) {
    return (
      <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
        <div className="flex items-center gap-2 mb-2">
          <Clock className={`w-4 h-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`} />
          <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Battle Time</span>
        </div>
        <div className="flex items-center justify-between">
          <span className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{formatBattleTime(value)}</span>
          <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>~Average</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
      <div className="flex items-center gap-2 mb-2">
        <Clock className={`w-4 h-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`} />
        <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Battle Time</span>
      </div>
      <div className="flex items-center justify-between">
        <span className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{formatBattleTime(value)}</span>
        <span className={`text-xs font-medium ${isAbove ? 'text-blue-400' : 'text-red-400'}`}>
          {isAbove ? '+' : '-'}{formatBattleTime(absVariance)} {isAbove ? 'longer' : 'shorter'}
        </span>
      </div>
    </div>
  );
}

/**
 * Determine build composition based on capsule cost distribution
 * Uses new 7-category build type system with cost-based thresholds
 * 
 * @param {Object} capsuleCosts - Cost totals for each build type
 * @returns {Object} Build composition with primary, label, type, and breakdown
 */
function getBuildComposition(capsuleCosts) {
  const types = [
    { name: 'Melee', cost: capsuleCosts.melee },
    { name: 'Blast', cost: capsuleCosts.blast },
    { name: 'Ki Blast', cost: capsuleCosts.kiBlast },
    { name: 'Defense', cost: capsuleCosts.defense },
    { name: 'Skill', cost: capsuleCosts.skill },
    { name: 'Ki Efficiency', cost: capsuleCosts.kiEfficiency },
    { name: 'Utility', cost: capsuleCosts.utility }
  ];
  
  const totalCost = types.reduce((sum, t) => sum + t.cost, 0);
  
  if (totalCost === 0) {
    return { 
      primary: 'No Build', 
      label: 'No Build', 
      type: 'none',
      breakdown: types.map(t => ({ ...t, percent: 0 }))
    };
  }
  
  // Sort by cost (highest first)
  types.sort((a, b) => b.cost - a.cost);
  
  const primary = types[0];
  const secondary = types[1];
  
  const primaryPercent = (primary.cost / totalCost) * 100;
  const secondaryPercent = (secondary.cost / totalCost) * 100;
  const percentDiff = primaryPercent - secondaryPercent;
  
  // Add percentages to breakdown
  const breakdown = types.map(t => ({
    ...t,
    percent: (t.cost / totalCost) * 100
  }));
  
  // Pure build: 75%+ in one type (15/20 cost)
  if (primaryPercent >= 75) {
    return { 
      primary: primary.name, 
      label: `Pure ${primary.name}`, 
      type: 'pure',
      breakdown
    };
  }
  
  // Focused build: 45%+ in one type (9/20 cost)
  if (primaryPercent >= 45) {
    return { 
      primary: primary.name, 
      label: `${primary.name}-Focused`, 
      type: 'focused',
      breakdown
    };
  }
  
  // Dual build: Top 2 types close (within 20%) and together ≥65%
  if (percentDiff <= 20 && (primaryPercent + secondaryPercent) >= 65) {
    return { 
      primary: primary.name, 
      secondary: secondary.name,
      label: `${primary.name}/${secondary.name}`, 
      type: 'dual',
      breakdown
    };
  }
  
  // Balanced hybrid: No clear dominance
  return { 
    primary: 'Hybrid', 
    label: 'Balanced Hybrid', 
    type: 'balanced',
    breakdown
  };
}

/**
 * Get color classes for new build type system (exported for use in TableConfigs)
 * Supports all 7 build types plus hybrid combinations
 * @param {Object|string} buildComposition - Build composition object with primary type, or label string
 * @param {boolean} darkMode - Whether dark mode is enabled
 * @returns {string} Tailwind CSS classes for styling
 */
export function getBuildTypeColor(buildComposition, darkMode = false) {
  if (!buildComposition) return darkMode ? 'text-gray-400 bg-gray-700 border-gray-600' : 'text-gray-600 bg-gray-50 border-gray-200';
  
  // Handle both object (with primary property) and string (label) inputs
  let primaryType;
  if (typeof buildComposition === 'string') {
    // Extract primary type from label (e.g., "Pure Melee" -> "melee", "Melee-Focused" -> "melee")
    const label = buildComposition.toLowerCase();
    if (label.includes('melee')) primaryType = 'melee';
    else if (label.includes('ki blast')) primaryType = 'ki blast';
    else if (label.includes('blast')) primaryType = 'blast';
    else if (label.includes('defense')) primaryType = 'defense';
    else if (label.includes('skill')) primaryType = 'skill';
    else if (label.includes('ki efficiency')) primaryType = 'ki efficiency';
    else if (label.includes('utility')) primaryType = 'utility';
    else if (label.includes('balanced') || label.includes('hybrid')) primaryType = 'hybrid';
    else primaryType = 'no build';
  } else {
    primaryType = buildComposition.primary?.toLowerCase();
  }
  
  // Color mapping for 7 build types
  const colorMap = {
    'melee': darkMode ? 'text-red-400 bg-red-900/30 border-red-600' : 'text-red-600 bg-red-50 border-red-200',
    'blast': darkMode ? 'text-orange-400 bg-orange-900/30 border-orange-600' : 'text-orange-600 bg-orange-50 border-orange-200',
    'ki blast': darkMode ? 'text-yellow-400 bg-yellow-900/30 border-yellow-600' : 'text-yellow-600 bg-yellow-50 border-yellow-200',
    'defense': darkMode ? 'text-blue-400 bg-blue-900/30 border-blue-600' : 'text-blue-600 bg-blue-50 border-blue-200',
    'skill': darkMode ? 'text-purple-400 bg-purple-900/30 border-purple-600' : 'text-purple-600 bg-purple-50 border-purple-200',
    'ki efficiency': darkMode ? 'text-green-400 bg-green-900/30 border-green-600' : 'text-green-600 bg-green-50 border-green-200',
    'utility': darkMode ? 'text-gray-400 bg-gray-700 border-gray-600' : 'text-gray-600 bg-gray-50 border-gray-200',
    'hybrid': darkMode ? 'text-purple-400 bg-purple-900/30 border-purple-600' : 'text-purple-600 bg-purple-50 border-purple-200',
    'no build': darkMode ? 'text-gray-400 bg-gray-700 border-gray-600' : 'text-gray-400 bg-gray-100 border-gray-300'
  };
  
  return colorMap[primaryType] || (darkMode ? 'text-gray-400 bg-gray-700 border-gray-600' : 'text-gray-600 bg-gray-50 border-gray-200');
}

// Component to display build type with tooltip for team rankings
function BuildTypeTooltipWrapper({ buildComposition, aiStrategy, count, equippedCapsules, totalCapsuleCost, darkMode, tooltipKey }) {
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
          style={{ ...floatingStyles, width: '16rem' }}
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
          <div className="space-y-1.5 pt-1">
            {equippedCapsules.map((capsule, idx) => (
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
    </div>
  );
}

// Component to display character build information
function BuildDisplay({ stats, showDetailed = false, darkMode = false }) {
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

  if (!stats.equippedCapsules || stats.equippedCapsules.length === 0) {
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
      {/* Build Composition (New System) */}
      {stats.buildComposition && (
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
      {tooltipOpen && stats.buildComposition && typeof document !== 'undefined' && createPortal(
        <div
          ref={refs.setFloating}
          style={{ ...floatingStyles, width: '16rem' }}
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
      
      {showDetailed && (
        <>
          {/* Capsules List */}
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
          {/* AI Strategy */}
          {stats.aiStrategy && (
            <div className="flex items-center justify-between">
              <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>AI Strategy</span>
              <span className={`text-sm font-medium ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                {stats.aiStrategy}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Meta Analysis Component
function MetaAnalysisContent({ aggregatedData, capsuleMap, aiStrategies, darkMode = false }) {
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
      {/* Phase 1.1: Capsule Performance Analysis */}
      <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-blue-50'} border ${darkMode ? 'border-blue-900/30' : 'border-blue-200'}`}>
        <div className="flex items-center gap-3 mb-4">
          <Zap className={`w-6 h-6 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
          <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            Capsule Performance Analysis
          </h3>
          <span className={`ml-auto px-3 py-1 rounded-full text-xs font-medium ${darkMode ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-700'}`}>
            Phase 1
          </span>
        </div>
        <p className={`mb-4 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          Analyze individual capsule performance across matches, characters, and AI strategies.
        </p>
        <CapsuleSynergyAnalysis aggregatedData={aggregatedData} darkMode={darkMode} />
      </div>
    </div>
  );
}

function getPositionBasedData(files, charMap, capsuleMap = {}) {
  const positionStats = {
    1: { totalMatches: 0, characters: {} }, // Position 1 (Lead)
    2: { totalMatches: 0, characters: {} }, // Position 2 (Middle)
    3: { totalMatches: 0, characters: {} }  // Position 3 (Anchor)
  };
  
  // Helper function to process a characterRecord
  function processCharacterRecord(characterRecord) {
    if (!characterRecord) return;
    
    // Process each team separately to determine team size
    const alliesKeys = Object.keys(characterRecord).filter(k => k.includes('AlliesTeamMember'));
    const enemyKeys = Object.keys(characterRecord).filter(k => k.includes('EnemyTeamMember'));
    
    // Process allies team
    const alliesTeamSize = alliesKeys.length;
    alliesKeys.forEach(key => {
      const char = characterRecord[key];
      if (!char) return;
      
      // Extract slot number from key (e.g., "AlliesTeamMember1" -> 1)
      const slotMatch = key.match(/Member(\d+)/);
      const slotNumber = slotMatch ? parseInt(slotMatch[1]) : null;
      if (!slotNumber) return;
      
      // Determine position: 1 = lead (first), 2 = middle (everyone else), 3 = anchor (last)
      let position;
      if (slotNumber === 1) {
        position = 1; // Lead
      } else if (slotNumber === alliesTeamSize) {
        position = 3; // Anchor
      } else {
        position = 2; // Middle
      }
      
      const stats = extractStats(char, charMap, capsuleMap, position);
      if (!stats.name || stats.name === '-') return;
      
      const characterName = stats.name;
      
      positionStats[position].totalMatches++;
      
      if (!positionStats[position].characters[characterName]) {
        positionStats[position].characters[characterName] = {
          name: characterName,
          matchCount: 0,
          // activeMatchCount counts matches where battleTime > 0
          activeMatchCount: 0,
          totalDamage: 0,
          totalTaken: 0,
          totalHealth: 0,
          totalBattleTime: 0,
          totalSpecialMoves: 0,
          totalUltimates: 0,
          totalSkills: 0,
          totalSparking: 0,
          totalCharges: 0,
          totalGuards: 0,
          totalEnergyBlasts: 0,
          totalComboNum: 0,
          totalComboDamage: 0
        };
      }
      
      const charData = positionStats[position].characters[characterName];
      // Always increment visible match count
      charData.matchCount++;
      // Only count as an "active" match if battleTime > 0
      if (stats.battleTime && stats.battleTime > 0) {
        charData.activeMatchCount += 1;
        charData.totalBattleTime += stats.battleTime;
      }
      charData.totalDamage += stats.damageDone;
      charData.totalTaken += stats.damageTaken;
      charData.totalHealth += stats.hPGaugeValue;
      charData.totalSpecialMoves += stats.specialMovesUsed;
      charData.totalUltimates += stats.ultimatesUsed;
      charData.totalSkills += stats.skillsUsed;
      charData.totalSparking += stats.sparkingCount;
      charData.totalCharges += stats.chargeCount;
      charData.totalGuards += stats.guardCount;
      charData.totalEnergyBlasts += stats.shotEnergyBulletCount;
      charData.totalComboNum += stats.maxComboNum;
      charData.totalComboDamage += stats.maxComboDamage;
    });
    
    // Process enemy team
    const enemyTeamSize = enemyKeys.length;
    enemyKeys.forEach(key => {
      const char = characterRecord[key];
      if (!char) return;
      
      // Extract slot number from key (e.g., "EnemyTeamMember1" -> 1)
      const slotMatch = key.match(/Member(\d+)/);
      const slotNumber = slotMatch ? parseInt(slotMatch[1]) : null;
      if (!slotNumber) return;
      
      // Determine position: 1 = lead (first), 2 = middle (everyone else), 3 = anchor (last)
      let position;
      if (slotNumber === 1) {
        position = 1; // Lead
      } else if (slotNumber === enemyTeamSize) {
        position = 3; // Anchor
      } else {
        position = 2; // Middle
      }
      
      if (!positionStats[position]) return;
      
      const stats = extractStats(char, charMap, capsuleMap, position);
      if (!stats.name || stats.name === '-') return;
      
      const characterName = stats.name;
      
      positionStats[position].totalMatches++;
      
      if (!positionStats[position].characters[characterName]) {
        positionStats[position].characters[characterName] = {
          name: characterName,
          matchCount: 0,
          totalDamage: 0,
          totalTaken: 0,
          totalHealth: 0,
          totalBattleTime: 0,
          totalSpecialMoves: 0,
          totalUltimates: 0,
          totalSkills: 0,
          totalSparking: 0,
          totalCharges: 0,
          totalGuards: 0,
          totalEnergyBlasts: 0,
          totalComboNum: 0,
          totalComboDamage: 0
        };
      }
      
      const charData = positionStats[position].characters[characterName];
      charData.matchCount++;
      charData.totalDamage += stats.damageDone;
      charData.totalTaken += stats.damageTaken;
      charData.totalHealth += stats.hPGaugeValue;
      // Only include battleTime in totals if it's > 0. This keeps averages consistent when excluding zero-duration matches.
      if (stats.battleTime && stats.battleTime > 0) {
        charData.totalBattleTime += stats.battleTime;
      }
      charData.totalSpecialMoves += stats.specialMovesUsed;
      charData.totalUltimates += stats.ultimatesUsed;
      charData.totalSkills += stats.skillsUsed;
      charData.totalSparking += stats.sparkingCount;
      charData.totalCharges += stats.chargeCount;
      charData.totalGuards += stats.guardCount;
      charData.totalEnergyBlasts += stats.shotEnergyBulletCount;
      charData.totalComboNum += stats.maxComboNum;
      charData.totalComboDamage += stats.maxComboDamage;
    });
  }
  
  files.forEach(file => {
    if (file.error) return;
    
    const fileContent = file.content;
    let characterRecord;
    
    // Handle TeamBattleResults format (current BR_Data structure)
    if (fileContent.TeamBattleResults) {
      // Check for battleResult (lowercase r)
      if (fileContent.TeamBattleResults.battleResult) {
        characterRecord = fileContent.TeamBattleResults.battleResult.characterRecord;
      }
      // Check for BattleResults (capital R) - Cinema files format
      else if (fileContent.TeamBattleResults.BattleResults) {
        characterRecord = fileContent.TeamBattleResults.BattleResults.characterRecord;
      }
      // Check if data is directly in TeamBattleResults (new wrapper format)
      else if (fileContent.TeamBattleResults.characterRecord) {
        characterRecord = fileContent.TeamBattleResults.characterRecord;
      }
    }
    // Handle new format with teams array at the top
    else if (fileContent.teams && Array.isArray(fileContent.teams)) {
      // Process all teams in the array
      fileContent.teams.forEach(team => {
        let teamCharRecord;
        
        if (team.BattleResults) {
          teamCharRecord = team.BattleResults.characterRecord;
        } else if (team.characterRecord) {
          teamCharRecord = team.characterRecord;
        }
        
        if (teamCharRecord) {
          processCharacterRecord(teamCharRecord);
        }
      });
      return; // Already processed all teams
    }
    // Handle standard format with BattleResults at root
    else if (fileContent.BattleResults) {
      characterRecord = fileContent.BattleResults.characterRecord;
    } 
    // Handle legacy format with direct properties
    else {
      characterRecord = fileContent.characterRecord;
    }
    
    processCharacterRecord(characterRecord);
  });
  
  // Calculate averages and format data
  Object.keys(positionStats).forEach(position => {
    const posData = positionStats[position];
    posData.sortedCharacters = Object.values(posData.characters)
      .map(char => {
        // Use activeMatchCount if available (exclude zero battleTime matches), fallback to matchCount
        const denom = (char.activeMatchCount && char.activeMatchCount > 0) ? char.activeMatchCount : char.matchCount || 1;
        return ({
          ...char,
          avgDamage: char.totalDamage / denom,
          avgTaken: char.totalTaken / denom,
          avgHealth: char.totalHealth / denom,
          avgBattleTime: char.totalBattleTime / denom,
          avgSpecialMoves: char.totalSpecialMoves / denom,
          avgUltimates: char.totalUltimates / denom,
          avgSkills: char.totalSkills / denom,
          avgSparking: char.totalSparking / denom,
          avgCharges: char.totalCharges / denom,
          avgGuards: char.totalGuards / denom,
          avgEnergyBlasts: char.totalEnergyBlasts / denom,
          avgComboNum: char.totalComboNum / denom,
          avgComboDamage: char.totalComboDamage / denom,
          damageEfficiency: char.totalTaken > 0 ? (char.totalDamage / char.totalTaken) : char.totalDamage
        });
      })
      .sort((a, b) => b.avgDamage - a.avgDamage);
  });
  
  return positionStats;
}

function getAggregatedCharacterData(files, charMap, capsuleMap = {}, aiStrategiesMap = {}) {
  const characterStats = {};
  
  // Helper function to process a characterRecord (extracted to avoid duplication)
  function processCharacterRecord(characterRecord, characterIdRecord, teams = null, fileName = '', battleWinLose = null) {
    Object.keys(characterRecord).forEach(key => {
      const char = characterRecord[key];
      const stats = extractStats(char, charMap, capsuleMap, null); // No position for aggregated data
      if (!stats.name || stats.name === '-') return;
      
      // Determine team association
      let teamName = null;
      let opponentTeam = null;
      let isTeam1 = false;
      if (teams && Array.isArray(teams) && teams.length >= 2) {
        if (key.includes('AlliesTeamMember') || key.includes('１Ｐ')) {
          teamName = teams[0];
          opponentTeam = teams[1];
          isTeam1 = true;
        } else if (key.includes('EnemyTeamMember') || key.includes('２Ｐ')) {
          teamName = teams[1];
          opponentTeam = teams[0];
          isTeam1 = false;
        }
      }
      
      // Extract AI strategy from equipped items (look for AI type capsules)
      let aiStrategy = null;
      const equipItems = char.battlePlayCharacter?.equipItem || [];
      for (const item of equipItems) {
        const strategy = aiStrategiesMap[item.key];
        if (strategy) {
          aiStrategy = strategy.name;
          break; // Found the AI strategy, stop looking
        }
      }
      // If no AI strategy found, use "Default"
      if (!aiStrategy) {
        aiStrategy = 'Default';
      }
      // If no AI strategy found, use "Default"
      if (!aiStrategy) {
        aiStrategy = 'Default';
      }
      
      // Use original form name as the key for aggregation
      const originalForm = char.battlePlayCharacter?.originalCharacter?.key;
      const aggregationKey = originalForm ? (charMap[originalForm] || originalForm) : stats.name;
      
      if (!characterStats[aggregationKey]) {
        characterStats[aggregationKey] = {
          name: aggregationKey,
          totalDamage: 0,
          totalTaken: 0,
          totalHealth: 0,
          totalBattleTime: 0,
          totalHPGaugeValueMax: 0,
          totalSpecial: 0,
          totalUltimates: 0,
          totalSkills: 0,
          totalKills: 0,
          // Survival & Health metrics
          survivalCount: 0,
          totalSparking: 0,
          totalCharges: 0,
          totalGuards: 0,
          totalEnergyBlasts: 0,
          totalZCounters: 0,
          totalSuperCounters: 0,
          totalRevengeCounters: 0,
          totalTags: 0, // New: Character swaps
          // Special Abilities - NEW blast tracking system
          totalS1Blast: 0,
          totalS2Blast: 0,
          totalUltBlast: 0,
          totalS1HitBlast: 0,
          totalS2HitBlast: 0,
          totalULTHitBlast: 0,
          // Trackable blasts (only from matches with additionalCounts)
          totalS1BlastTrackable: 0,
          totalS2BlastTrackable: 0,
          totalUltBlastTrackable: 0,
          // Special Abilities - Legacy blast tracking (kept for backwards compatibility)
          totalSPM1: 0,
          totalSPM2: 0,
          totalEXA1: 0,
          totalEXA2: 0,
          totalDragonDashMileage: 0,
          // Combat Performance metrics
          maxComboNumTotal: 0,
          maxComboDamageTotal: 0,
          totalThrows: 0,
          totalLightningAttacks: 0,
          totalVanishingAttacks: 0,
          totalDragonHoming: 0,
          totalSpeedImpacts: 0,
          totalSpeedImpactWins: 0,
          totalSparkingCombo: 0,
          matchCount: 0,
          // activeMatchCount excludes matches with zero battleTime
          activeMatchCount: 0,
          // Build & Equipment tracking
          totalCapsuleCost: 0,
          // Track build-type costs for averaging
          totalMeleeCost: 0,
          totalBlastCost: 0,
          totalKiBlastCost: 0,
          totalDefenseCost: 0,
          totalSkillCost: 0,
          totalKiEfficiencyCost: 0,
          totalUtilityCost: 0,
          buildCompositions: {}, // Track build compositions with counts (new 7-category system)
          capsuleUsage: {}, // Track individual capsules used
          allFormsUsed: new Set(), // Track all forms used across matches
          formStats: {}, // Track per-form aggregated stats
          matches: [], // Track individual match data for meta analysis
          teamsUsed: {}, // Track which teams this character played on with counts
          aiStrategiesUsed: {} // Track AI strategies used with counts
        };
      }
      
      const charData = characterStats[aggregationKey];
      
      // Track team and AI strategy with frequency
      if (teamName) {
        charData.teamsUsed[teamName] = (charData.teamsUsed[teamName] || 0) + 1;
      }
      if (aiStrategy) {
        charData.aiStrategiesUsed[aiStrategy] = (charData.aiStrategiesUsed[aiStrategy] || 0) + 1;
      }
      
      charData.matchCount += 1;
      
      // Only accumulate stats for active matches (battleTime > 0)
      if (stats.battleTime && stats.battleTime > 0) {
        charData.activeMatchCount += 1;
        charData.totalDamage += stats.damageDone;
        charData.totalTaken += stats.damageTaken;
        charData.totalHealth += stats.hPGaugeValue;
        charData.totalBattleTime += stats.battleTime;
        charData.totalHPGaugeValueMax += stats.hPGaugeValueMax;
      }
      
      charData.totalSpecial += stats.specialMovesUsed;
      charData.totalUltimates += stats.ultimatesUsed;
      charData.totalSkills += stats.skillsUsed;
      charData.totalKills += stats.kills;
      // Survival & Health metrics
      // Only count as survived if character had health AND actually participated (battleTime > 0)
      if (stats.hPGaugeValue > 0 && stats.battleTime > 0) {
        charData.survivalCount += 1;
      }
      charData.totalSparking += stats.sparkingCount;
      charData.totalCharges += stats.chargeCount;
      charData.totalGuards += stats.guardCount;
      charData.totalEnergyBlasts += stats.shotEnergyBulletCount;
      charData.totalZCounters += stats.zCounterCount;
      charData.totalSuperCounters += stats.superCounterCount;
      charData.totalRevengeCounters += stats.revengeCounterCount;
      charData.totalTags += stats.tags;
      // Special Abilities - NEW blast tracking system
      charData.totalS1Blast += stats.s1Blast;
      charData.totalS2Blast += stats.s2Blast;
      charData.totalUltBlast += stats.ultBlast;
      charData.totalS1HitBlast += stats.s1HitBlast;
      charData.totalS2HitBlast += stats.s2HitBlast;
      charData.totalULTHitBlast += stats.uLTHitBlast;
      // Track separately for hit rate calculation (only from new format matches)
      if (stats.hasAdditionalCounts) {
        charData.totalS1BlastTrackable += stats.s1Blast;
        charData.totalS2BlastTrackable += stats.s2Blast;
        charData.totalUltBlastTrackable += stats.ultBlast;
      }
      
      // Special Abilities - Legacy blast tracking (also updated to new values)
      charData.totalSPM1 += stats.s1Blast;
      charData.totalSPM2 += stats.s2Blast;
      charData.totalEXA1 += stats.exa1Count;
      charData.totalEXA2 += stats.exa2Count;
      charData.totalDragonDashMileage += stats.dragonDashMileage;
      // Combat Performance metrics
      charData.maxComboNumTotal += stats.maxComboNum;
      charData.maxComboDamageTotal += stats.maxComboDamage;
      charData.totalThrows += stats.throwCount;
      charData.totalLightningAttacks += stats.lightningAttackCount;
      charData.totalVanishingAttacks += stats.vanishingAttackCount;
      charData.totalDragonHoming += stats.dragonHomingCount;
      charData.totalSpeedImpacts += stats.speedImpactCount;
      charData.totalSpeedImpactWins += stats.speedImpactWins;
      charData.totalSparkingCombo += stats.sparkingComboCount;
      
      // Build & Equipment tracking
      charData.totalCapsuleCost += stats.totalCapsuleCost || 0;
      
      // Track build composition usage (new 7-category system)
      if (stats.buildComposition && stats.buildComposition.label) {
        const label = stats.buildComposition.label;
        charData.buildCompositions[label] = (charData.buildCompositions[label] || 0) + 1;
      }
      
      // Accumulate build-type costs from breakdown
      if (stats.buildComposition && stats.buildComposition.breakdown) {
        stats.buildComposition.breakdown.forEach(item => {
          switch(item.name) {
            case 'Melee': charData.totalMeleeCost += item.cost || 0; break;
            case 'Blast': charData.totalBlastCost += item.cost || 0; break;
            case 'Ki Blast': charData.totalKiBlastCost += item.cost || 0; break;
            case 'Defense': charData.totalDefenseCost += item.cost || 0; break;
            case 'Skill': charData.totalSkillCost += item.cost || 0; break;
            case 'Ki Efficiency': charData.totalKiEfficiencyCost += item.cost || 0; break;
            case 'Utility': charData.totalUtilityCost += item.cost || 0; break;
          }
        });
      }
      
      // Track individual capsules used
      if (stats.equippedCapsules && Array.isArray(stats.equippedCapsules)) {
        stats.equippedCapsules.forEach(capsule => {
          if (capsule.id) {
            if (!charData.capsuleUsage[capsule.id]) {
              charData.capsuleUsage[capsule.id] = {
                id: capsule.id,
                name: capsule.name,
                count: 0
              };
            }
            charData.capsuleUsage[capsule.id].count += 1;
          }
        });
      }
      
      // Extract form change history
      let formChangeHistory = '—';
      let formChangeCount = 0;
      if (Array.isArray(char.formChangeHistory) && char.formChangeHistory.length > 0) {
        formChangeHistory = char.formChangeHistory.map(form => charMap[form.key] || form.key).join(' → ');
        formChangeCount = char.formChangeHistory.length; // Count number of transformations
      }
      
      // Determine win/loss status based on TEAM victory, not character survival
      // battleWinLose is from team 1's perspective: 'Win' means team 1 won, 'Lose' means team 2 won
      let won = false;
      if (battleWinLose) {
        if (isTeam1) {
          // Team 1 character: won if battleWinLose === 'Win'
          won = battleWinLose === 'Win';
        } else {
          // Team 2 character: won if battleWinLose === 'Lose' (team 1 lost)
          won = battleWinLose === 'Lose';
        }
      } else {
        // Fallback to character survival if battleWinLose not available
        won = stats.hPGaugeValue > 0;
      }
      
      // Calculate per-form stats for this match if transformations occurred
      let perFormStatsForMatch = null;
      if (characterIdRecord && char.formChangeHistory && char.formChangeHistory.length > 0) {
        perFormStatsForMatch = calculatePerFormStats(
          char,
          characterIdRecord,
          char.formChangeHistory,
          originalForm
        );
      }
      
      // Add individual match data for meta analysis
      charData.matches.push({
        damageDone: stats.damageDone,
        damageTaken: stats.damageTaken,
        battleTime: stats.battleTime,
        hPGaugeValue: stats.hPGaugeValue,
        hPGaugeValueMax: stats.hPGaugeValueMax,
        buildArchetype: stats.buildArchetype, // Legacy
        buildComposition: stats.buildComposition, // New 7-category system
        totalCapsuleCost: stats.totalCapsuleCost,
        capsuleTypes: stats.capsuleTypes,
        equippedCapsules: stats.equippedCapsules,
        team: teamName,
        opponentTeam: opponentTeam,
        aiStrategy: aiStrategy,
        kills: stats.kills,
        specialMovesUsed: stats.specialMovesUsed,
        ultimatesUsed: stats.ultimatesUsed,
        skillsUsed: stats.skillsUsed,
        sparkingCount: stats.sparkingCount,
        chargeCount: stats.chargeCount,
        guardCount: stats.guardCount,
        shotEnergyBulletCount: stats.shotEnergyBulletCount,
        zCounterCount: stats.zCounterCount,
        superCounterCount: stats.superCounterCount,
        revengeCounterCount: stats.revengeCounterCount,
        tags: stats.tags,
        // NEW blast tracking
        s1Blast: stats.s1Blast,
        s2Blast: stats.s2Blast,
        ultBlast: stats.ultBlast,
        s1HitBlast: stats.s1HitBlast,
        s2HitBlast: stats.s2HitBlast,
        uLTHitBlast: stats.uLTHitBlast,
        s1HitRate: stats.s1HitRate,
        s2HitRate: stats.s2HitRate,
        ultHitRate: stats.ultHitRate,
        // Legacy blast tracking (for backwards compatibility)
        spm1Count: stats.s1Blast,
        spm2Count: stats.s2Blast,
        exa1Count: stats.exa1Count,
        exa2Count: stats.exa2Count,
        dragonDashMileage: stats.dragonDashMileage,
        maxComboNum: stats.maxComboNum,
        maxComboDamage: stats.maxComboDamage,
        throwCount: stats.throwCount,
        lightningAttackCount: stats.lightningAttackCount,
        vanishingAttackCount: stats.vanishingAttackCount,
        dragonHomingCount: stats.dragonHomingCount,
        speedImpactCount: stats.speedImpactCount,
        speedImpactWins: stats.speedImpactWins,
        sparkingComboCount: stats.sparkingComboCount,
        formChangeHistory: formChangeHistory,
        formChangeCount: formChangeCount,
        perFormStats: perFormStatsForMatch, // Store per-form stats with each match
        won: won,
        fileName: fileName
      });
      
      // Track all forms used
      if (originalForm) {
        charData.allFormsUsed.add(originalForm);
      }
      if (Array.isArray(char.formChangeHistory) && char.formChangeHistory.length > 0) {
        char.formChangeHistory.forEach(form => {
          charData.allFormsUsed.add(form.key);
        });
      }
      
      // Aggregate per-form stats from stored per-match form data
      if (perFormStatsForMatch && Array.isArray(perFormStatsForMatch)) {
        // Aggregate each form's stats
        perFormStatsForMatch.forEach(formStat => {
          const formId = formStat.formId;
          const formName = charMap[formId] || formId;
          
          if (!charData.formStats[formId]) {
            charData.formStats[formId] = {
              formId: formId,
              formNumber: formStat.formNumber,
              name: formName,
              isFirstForm: formStat.isFirstForm,
              isFinalForm: formStat.isFinalForm,
              // Combat stats
              totalDamageDone: 0,
              totalDamageTaken: 0,
              totalBattleTime: 0,
              totalBattleCount: 0,
              // Health
              totalHPRemaining: 0,
              totalHPMax: 0,
              // Special abilities
              totalSpecialMoves: 0,
              totalUltimates: 0,
              totalSkills: 0,
              // Blast tracking
              totalS1Blast: 0,
              totalS2Blast: 0,
              totalUltBlast: 0,
              totalS1HitBlast: 0,
              totalS2HitBlast: 0,
              totalULTHitBlast: 0,
              // Survival & Defense
              totalSparking: 0,
              totalCharges: 0,
              totalGuards: 0,
              totalEnergyBlasts: 0,
              totalZCounters: 0,
              totalSuperCounters: 0,
              totalRevengeCounters: 0,
              // Combat mechanics
              totalMaxComboNum: 0,
              totalMaxComboDamage: 0,
              totalThrows: 0,
              totalLightningAttacks: 0,
              totalVanishingAttacks: 0,
              totalDragonHoming: 0,
              totalSpeedImpacts: 0,
              totalSpeedImpactWins: 0,
              totalSparkingCombo: 0,
              totalDragonDashMileage: 0,
              // Kills
              totalKills: 0,
              matchCount: 0
            };
          }
          
          const formData = charData.formStats[formId];
          
          // Accumulate stats for this form
          formData.totalDamageDone += formStat.damageDone || 0;
          formData.totalDamageTaken += formStat.damageTaken || 0;
          formData.totalBattleTime += formStat.battleTime || 0;
          formData.totalBattleCount += formStat.battleCount || 0;
          formData.totalHPRemaining += formStat.hPGaugeValue || 0;
          formData.totalHPMax += formStat.hPGaugeValueMax || 0;
          formData.totalSpecialMoves += formStat.specialMovesUsed || 0;
          formData.totalUltimates += formStat.ultimatesUsed || 0;
          formData.totalSkills += formStat.skillsUsed || 0;
          formData.totalS1Blast += formStat.s1Blast || 0;
          formData.totalS2Blast += formStat.s2Blast || 0;
          formData.totalUltBlast += formStat.ultBlast || 0;
          formData.totalS1HitBlast += formStat.s1HitBlast || 0;
          formData.totalS2HitBlast += formStat.s2HitBlast || 0;
          formData.totalULTHitBlast += formStat.uLTHitBlast || 0;
          formData.totalSparking += formStat.sparkingCount || 0;
          formData.totalCharges += formStat.chargeCount || 0;
          formData.totalGuards += formStat.guardCount || 0;
          formData.totalEnergyBlasts += formStat.shotEnergyBulletCount || 0;
          formData.totalZCounters += formStat.zCounterCount || 0;
          formData.totalSuperCounters += formStat.superCounterCount || 0;
          formData.totalRevengeCounters += formStat.revengeCounterCount || 0;
          formData.totalMaxComboNum += formStat.maxComboNum || 0;
          formData.totalMaxComboDamage += formStat.maxComboDamage || 0;
          formData.totalThrows += formStat.throwCount || 0;
          formData.totalLightningAttacks += formStat.lightningAttackCount || 0;
          formData.totalVanishingAttacks += formStat.vanishingAttackCount || 0;
          formData.totalDragonHoming += formStat.dragonHomingCount || 0;
          formData.totalSpeedImpacts += formStat.speedImpactCount || 0;
          formData.totalSpeedImpactWins += formStat.speedImpactWins || 0;
          formData.totalSparkingCombo += formStat.sparkingComboCount || 0;
          formData.totalDragonDashMileage += formStat.dragonDashMileage || 0;
          formData.totalKills += formStat.kills || 0;
          formData.matchCount += 1;
        });
      }
    });
  }
  
  files.forEach(file => {
    if (file.error) return;
    
    const fileName = file.name || file.fileName || '';
    let characterRecord, characterIdRecord, teams, battleWinLose;
    
    // Handle TeamBattleResults format (current BR_Data structure)
    if (file.content.TeamBattleResults) {
      teams = file.content.TeamBattleResults.teams;
      // Check for battleResult (lowercase r)
      if (file.content.TeamBattleResults.battleResult) {
        characterRecord = file.content.TeamBattleResults.battleResult.characterRecord;
        characterIdRecord = file.content.TeamBattleResults.battleResult.characterIdRecord;
        battleWinLose = file.content.TeamBattleResults.battleResult.battleWinLose;
      }
      // Check for BattleResults (capital R) - Cinema files format
      else if (file.content.TeamBattleResults.BattleResults) {
        characterRecord = file.content.TeamBattleResults.BattleResults.characterRecord;
        characterIdRecord = file.content.TeamBattleResults.BattleResults.characterIdRecord;
        battleWinLose = file.content.TeamBattleResults.BattleResults.battleWinLose;
      }
      // Check if data is directly in TeamBattleResults (new wrapper format)
      else if (file.content.TeamBattleResults.characterRecord) {
        characterRecord = file.content.TeamBattleResults.characterRecord;
        characterIdRecord = file.content.TeamBattleResults.characterIdRecord;
        battleWinLose = file.content.TeamBattleResults.battleWinLose;
      }
    }
    // Handle new format with teams array at the top
    else if (file.content.teams && Array.isArray(file.content.teams)) {
      // Process all teams in the array
      file.content.teams.forEach(team => {
        let teamCharRecord, teamCharIdRecord;
        
        if (team.BattleResults) {
          teamCharRecord = team.BattleResults.characterRecord;
          teamCharIdRecord = team.BattleResults.characterIdRecord;
        } else if (team.characterRecord) {
          teamCharRecord = team.characterRecord;
          teamCharIdRecord = team.characterIdRecord;
        }
        
        if (teamCharRecord) {
          // Extract battleWinLose for team format
          let teamBattleWinLose;
          if (team.BattleResults) {
            teamBattleWinLose = team.BattleResults.battleWinLose;
          }
          processCharacterRecord(teamCharRecord, teamCharIdRecord, file.content.teams, fileName, teamBattleWinLose);
        }
      });
      return; // Already processed all teams
    }
    // Handle standard format with BattleResults at root
    else if (file.content.BattleResults) {
      characterRecord = file.content.BattleResults.characterRecord;
      characterIdRecord = file.content.BattleResults.characterIdRecord;
      battleWinLose = file.content.BattleResults.battleWinLose;
      teams = file.content.teams;
    } 
    // Handle legacy format with direct properties
    else {
      characterRecord = file.content.characterRecord;
      characterIdRecord = file.content.characterIdRecord;
      battleWinLose = file.content.battleWinLose;
      teams = file.content.teams;
    }
    
    if (!characterRecord) return;
    
    processCharacterRecord(characterRecord, characterIdRecord, teams, fileName, battleWinLose);
  });
  
  // Calculate averages and format form history
  return Object.values(characterStats).map(char => {
    const allForms = Array.from(char.allFormsUsed);
    const formHistory = allForms.length > 1 ? 
      allForms.map(f => charMap[f] || f).join(', ') : '';
    
    // Convert objects to arrays and find most common team and AI strategy
    const teamsArray = Object.keys(char.teamsUsed);
    const aiStrategiesArray = Object.keys(char.aiStrategiesUsed);
    
    // Find most commonly used team (highest count)
    const primaryTeam = teamsArray.length > 0 
      ? teamsArray.reduce((a, b) => char.teamsUsed[a] > char.teamsUsed[b] ? a : b)
      : null;
    
    // Find most commonly used AI strategy (highest count)
    const primaryAIStrategy = aiStrategiesArray.length > 0
      ? aiStrategiesArray.reduce((a, b) => char.aiStrategiesUsed[a] > char.aiStrategiesUsed[b] ? a : b)
      : null;
    
    // Calculate averages for per-form stats
    const formStatsArray = Object.values(char.formStats).map(formStat => {
      const matchCount = formStat.matchCount || 1;
      const damagePerSecond = (formStat.totalBattleTime || 0) > 0 
        ? (formStat.totalDamageDone || 0) / formStat.totalBattleTime 
        : 0;
      const damageEfficiency = (formStat.totalDamageTaken || 0) > 0
        ? (formStat.totalDamageDone || 0) / formStat.totalDamageTaken
        : ((formStat.totalDamageDone || 0) > 0 ? 999 : 0);
      
      return {
        ...formStat,
        // Averages
        avgDamageDone: Math.round((formStat.totalDamageDone || 0) / matchCount),
        avgDamageTaken: Math.round((formStat.totalDamageTaken || 0) / matchCount),
        avgBattleTime: Math.round(((formStat.totalBattleTime || 0) / matchCount) * 10) / 10,
        avgBattleCount: Math.round(((formStat.totalBattleCount || 0) / matchCount) * 10) / 10,
        avgHPRemaining: Math.round((formStat.totalHPRemaining || 0) / matchCount),
        avgHPMax: Math.round((formStat.totalHPMax || 0) / matchCount),
        avgSpecialMoves: Math.round(((formStat.totalSpecialMoves || 0) / matchCount) * 10) / 10,
        avgUltimates: Math.round(((formStat.totalUltimates || 0) / matchCount) * 10) / 10,
        avgSkills: Math.round(((formStat.totalSkills || 0) / matchCount) * 10) / 10,
        avgS1Blast: Math.round(((formStat.totalS1Blast || 0) / matchCount) * 10) / 10,
        avgS2Blast: Math.round(((formStat.totalS2Blast || 0) / matchCount) * 10) / 10,
        avgUltBlast: Math.round(((formStat.totalUltBlast || 0) / matchCount) * 10) / 10,
        avgS1HitBlast: Math.round(((formStat.totalS1HitBlast || 0) / matchCount) * 10) / 10,
        avgS2HitBlast: Math.round(((formStat.totalS2HitBlast || 0) / matchCount) * 10) / 10,
        avgULTHitBlast: Math.round(((formStat.totalULTHitBlast || 0) / matchCount) * 10) / 10,
        avgSparking: Math.round(((formStat.totalSparking || 0) / matchCount) * 10) / 10,
        avgCharges: Math.round(((formStat.totalCharges || 0) / matchCount) * 10) / 10,
        avgGuards: Math.round(((formStat.totalGuards || 0) / matchCount) * 10) / 10,
        avgEnergyBlasts: Math.round(((formStat.totalEnergyBlasts || 0) / matchCount) * 10) / 10,
        avgZCounters: Math.round(((formStat.totalZCounters || 0) / matchCount) * 10) / 10,
        avgSuperCounters: Math.round(((formStat.totalSuperCounters || 0) / matchCount) * 10) / 10,
        avgRevengeCounters: Math.round(((formStat.totalRevengeCounters || 0) / matchCount) * 10) / 10,
        avgMaxComboNum: Math.round(((formStat.totalMaxComboNum || 0) / matchCount) * 10) / 10,
        avgMaxComboDamage: Math.round((formStat.totalMaxComboDamage || 0) / matchCount),
        avgThrows: Math.round(((formStat.totalThrows || 0) / matchCount) * 10) / 10,
        avgLightningAttacks: Math.round(((formStat.totalLightningAttacks || 0) / matchCount) * 10) / 10,
        avgVanishingAttacks: Math.round(((formStat.totalVanishingAttacks || 0) / matchCount) * 10) / 10,
        avgDragonHoming: Math.round(((formStat.totalDragonHoming || 0) / matchCount) * 10) / 10,
        avgSpeedImpacts: Math.round(((formStat.totalSpeedImpacts || 0) / matchCount) * 10) / 10,
        avgSpeedImpactWins: Math.round(((formStat.totalSpeedImpactWins || 0) / matchCount) * 10) / 10,
        avgSparkingCombo: Math.round(((formStat.totalSparkingCombo || 0) / matchCount) * 10) / 10,
        avgDragonDashMileage: Math.round(((formStat.totalDragonDashMileage || 0) / matchCount) * 10) / 10,
        avgKills: Math.round(((formStat.totalKills || 0) / matchCount) * 10) / 10,
        // Derived stats
        damagePerSecond,
        damageEfficiency,
        // Hit rates
        s1HitRate: (formStat.totalS1Blast || 0) > 0
          ? Math.round(((formStat.totalS1HitBlast || 0) / formStat.totalS1Blast) * 1000) / 10
          : null,
        s2HitRate: (formStat.totalS2Blast || 0) > 0
          ? Math.round(((formStat.totalS2HitBlast || 0) / formStat.totalS2Blast) * 1000) / 10
          : null,
        ultHitRate: (formStat.totalUltBlast || 0) > 0
          ? Math.round(((formStat.totalULTHitBlast || 0) / formStat.totalUltBlast) * 1000) / 10
          : null,
        speedImpactWinRate: (formStat.totalSpeedImpacts || 0) > 0
          ? Math.round(((formStat.totalSpeedImpactWins || 0) / formStat.totalSpeedImpacts) * 1000) / 10
          : null,
      };
    });
    
    return {
      ...char,
      formHistory,
      formStatsArray,
      hasMultipleForms: allForms.length > 1,
      teamsUsed: teamsArray,
      aiStrategiesUsed: aiStrategiesArray,
      primaryTeam,
      primaryAIStrategy,
      // Use activeMatchCount (non-zero battleTime) for all averages when available
      _activeMatches: char.activeMatchCount || 0,
      avgDamage: Math.round(char.totalDamage / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)),
      avgTaken: Math.round(char.totalTaken / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)),
      avgHealth: Math.round(char.totalHealth / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)),
      avgBattleTime: Math.round((char.totalBattleTime / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 10) / 10,
      avgHPGaugeValueMax: Math.round(char.totalHPGaugeValueMax / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)),
  avgSpecial: Math.round((char.totalSpecial / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 10) / 10,
      avgSkills: Math.round((char.totalSkills / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 10) / 10,
      avgKills: Math.round((char.totalKills / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 10) / 10,
      // Survival & Health averages
      survivalRate: Math.round((char.survivalCount / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 1000) / 10, // % of matches survived
      avgSparking: Math.round((char.totalSparking / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 10) / 10,
      avgCharges: Math.round((char.totalCharges / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 10) / 10,
      avgGuards: Math.round((char.totalGuards / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 10) / 10,
      avgEnergyBlasts: Math.round((char.totalEnergyBlasts / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 10) / 10,
      avgZCounters: Math.round((char.totalZCounters / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 10) / 10,
      avgSuperCounters: Math.round((char.totalSuperCounters / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 10) / 10,
      avgRevengeCounters: Math.round((char.totalRevengeCounters / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 10) / 10,
      avgTags: Math.round((char.totalTags / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 10) / 10,
      // Special Abilities - NEW blast tracking averages
      avgS1Blast: Math.round((char.totalS1Blast / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 10) / 10,
      avgS2Blast: Math.round((char.totalS2Blast / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 10) / 10,
      avgUltBlast: Math.round((char.totalUltBlast / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 10) / 10,
      avgS1Hit: Math.round((char.totalS1HitBlast / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 10) / 10,
      avgS2Hit: Math.round((char.totalS2HitBlast / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 10) / 10,
      avgUltHit: Math.round((char.totalULTHitBlast / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 10) / 10,
      // Hit rates (overall across all matches) - calculated from trackable throws only, null if no trackable data
      s1HitRateOverall: char.totalS1BlastTrackable > 0 ? Math.round((char.totalS1HitBlast / char.totalS1BlastTrackable) * 1000) / 10 : null,
      s2HitRateOverall: char.totalS2BlastTrackable > 0 ? Math.round((char.totalS2HitBlast / char.totalS2BlastTrackable) * 1000) / 10 : null,
      ultHitRateOverall: char.totalUltBlastTrackable > 0 ? Math.round((char.totalULTHitBlast / char.totalUltBlastTrackable) * 1000) / 10 : null,
      
      
      // Special Abilities - Legacy blast tracking (kept for backwards compatibility, now using new values)
    avgSPM1: Math.round((char.totalS1Blast / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 10) / 10,
  avgSPM2: Math.round((char.totalS2Blast / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 10) / 10,
  avgEXA1: Math.round((char.totalEXA1 / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 10) / 10,
  avgEXA2: Math.round((char.totalEXA2 / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 10) / 10,
  avgUltimates: Math.round((char.totalUltimates / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 10) / 10,
  avgDragonDashMileage: Math.round((char.totalDragonDashMileage / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 10) / 10,
  avgMaxComboDamage: Math.round(char.maxComboDamageTotal / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)),
  avgThrows: Math.round((char.totalThrows / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 10) / 10,
  avgLightningAttacks: Math.round((char.totalLightningAttacks / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 10) / 10,
  avgVanishingAttacks: Math.round((char.totalVanishingAttacks / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 10) / 10,
  avgDragonHoming: Math.round((char.totalDragonHoming / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 10) / 10,
  avgSpeedImpacts: Math.round((char.totalSpeedImpacts / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 10) / 10,
  avgSpeedImpactWins: Math.round((char.totalSpeedImpactWins / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 10) / 10,
  avgSparkingCombo: Math.round((char.totalSparkingCombo / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 10) / 10,
  // Build & Equipment averages
  avgCapsuleCost: Math.round(char.totalCapsuleCost / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)),
  // Build-type cost averages (new 7-category system)
  avgMeleeCost: Math.round((char.totalMeleeCost / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 10) / 10,
  avgBlastCost: Math.round((char.totalBlastCost / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 10) / 10,
  avgKiBlastCost: Math.round((char.totalKiBlastCost / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 10) / 10,
  avgDefenseCost: Math.round((char.totalDefenseCost / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 10) / 10,
  avgSkillCost: Math.round((char.totalSkillCost / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 10) / 10,
  avgKiEfficiencyCost: Math.round((char.totalKiEfficiencyCost / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 10) / 10,
  avgUtilityCost: Math.round((char.totalUtilityCost / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 10) / 10,
      // Most used build composition (new 7-category system)
      primaryBuildComposition: Object.keys(char.buildCompositions).length > 0
        ? Object.keys(char.buildCompositions).reduce((a, b) => 
            char.buildCompositions[a] > char.buildCompositions[b] ? a : b)
        : 'No Build',
      // Most used capsules (top 7)
      topCapsules: Object.values(char.capsuleUsage)
        .sort((a, b) => b.count - a.count)
        .slice(0, 7)
        .map(c => ({ id: c.id, name: c.name, usage: c.count }))
    };
  }).map(char => {
    // Calculate top 3 most used builds (similar to Team Rankings implementation)
    const buildGroups = {};
    
    // Group matches by build composition label
    char.matches.forEach(match => {
      if (match.buildComposition && match.buildComposition.label) {
        const buildLabel = match.buildComposition.label;
        
        if (!buildGroups[buildLabel]) {
          buildGroups[buildLabel] = {
            buildComposition: match.buildComposition,
            aiStrategy: match.aiStrategy || null,
            equippedCapsules: match.equippedCapsules || [],
            totalCapsuleCost: match.totalCapsuleCost || 0,
            count: 0,
            activeCount: 0,
            totalDamageDealt: 0,
            totalDamageTaken: 0,
            totalBattleDuration: 0,
            totalHealthRemaining: 0,
            totalHealthMax: 0
          };
        }
        
        buildGroups[buildLabel].count++;
        // Only count as active if battleTime > 0
        if (match.battleTime && match.battleTime > 0) {
          buildGroups[buildLabel].activeCount++;
          buildGroups[buildLabel].totalBattleDuration += match.battleTime;
          // Only accumulate stats for active matches
          buildGroups[buildLabel].totalDamageDealt += match.damageDone || 0;
          buildGroups[buildLabel].totalDamageTaken += match.damageTaken || 0;
          buildGroups[buildLabel].totalHealthRemaining += match.hPGaugeValue || 0;
          buildGroups[buildLabel].totalHealthMax += match.hPGaugeValueMax || 0;
        }
      }
    });
    
    // Calculate performance score for each build and sort
    const sortedBuilds = Object.values(buildGroups)
      .filter(build => build.activeCount > 0) // Only include builds with active matches
      .map(build => {
        // Use activeCount for averages (non-zero battleTime), fallback to count
        const denominator = build.activeCount > 0 ? build.activeCount : build.count;
        // Round averages to match character-level calculation precision
        const avgDamageDealt = Math.round(build.totalDamageDealt / denominator);
        const avgDamageTaken = Math.round(build.totalDamageTaken / denominator);
        const avgBattleDuration = Math.round((build.totalBattleDuration / (build.activeCount > 0 ? build.activeCount : 1)) * 10) / 10;
        const avgHealthRemaining = Math.round(build.totalHealthRemaining / denominator);
        const avgHealthMax = Math.round(build.totalHealthMax / denominator);
        
        // Calculate derived stats (use totals, not rounded averages, for accuracy)
        const damageEfficiency = build.totalDamageTaken > 0 
          ? build.totalDamageDealt / build.totalDamageTaken 
          : build.totalDamageDealt;
        const damagePerSecond = build.totalBattleDuration > 0 
          ? build.totalDamageDealt / build.totalBattleDuration 
          : 0;
        const healthRetention = avgHealthMax > 0 ? avgHealthRemaining / avgHealthMax : 0;
        
        // Calculate base score using same formula as character performance
        const baseScore = (
          (avgDamageDealt / 100000) * 35 +        // Damage dealt weight: 35%
          (damageEfficiency) * 25 +                // Damage efficiency weight: 25%
          (damagePerSecond / 1000) * 25 +          // Damage per second weight: 25%
          (healthRetention) * 15                   // Health retention weight: 15%
        );
        
        // Apply experience multiplier
        const experienceMultiplier = Math.min(1.25, 1.0 + ((build.activeCount > 0 ? build.activeCount : build.count) - 1) * (0.25 / 11));
        const performanceScore = Math.round((baseScore * experienceMultiplier) * 100) / 100;
        
        return {
          ...build,
          avgPerformanceScore: performanceScore
        };
      })
      .sort((a, b) => {
        // Primary sort: by usage count (descending)
        if (b.count !== a.count) return b.count - a.count;
        // Tie-breaker: by average performance score (descending)
        return b.avgPerformanceScore - a.avgPerformanceScore;
      });
    
    // Get top 3 most used builds
    const topBuilds = sortedBuilds.slice(0, 3);
    
    // Calculate combat performance score
    const avgDamage = char.avgDamage;
    const avgTaken = char.avgTaken;
    const avgBattleTime = char.avgBattleTime;
    // Use total-based efficiency calculation (aggregate then calculate)
    const damageEfficiency = char.totalTaken > 0 ? char.totalDamage / char.totalTaken : char.totalDamage;
    // Use total-based DPS calculation (total damage / total time) - same as build calculation
    const damagePerSecond = char.totalBattleTime > 0 ? char.totalDamage / char.totalBattleTime : 0;
    const healthRetention = char.avgHPGaugeValueMax > 0 ? char.avgHealth / char.avgHPGaugeValueMax : 0;
    
    // Base performance score (normalized metrics)
    const baseScore = (
      (avgDamage / 100000) * 35 +        // Damage dealt weight: 35%
      (damageEfficiency) * 25 +          // Damage efficiency weight: 25%
      (damagePerSecond / 1000) * 25 +    // Damage per second weight: 25%
      (healthRetention) * 15             // Health retention weight: 15%
    );
    
    // Experience multiplier based on matches played (1.0 to 1.25x, maxed at 12 matches)
    // Characters with more matches get slightly higher weight
  // Use active matches (non-zero battleTime) for experience weighting when available
  const experienceMatches = (char.activeMatchCount && char.activeMatchCount > 0) ? char.activeMatchCount : char.matchCount;
  const experienceMultiplier = Math.min(1.25, 1.0 + (experienceMatches - 1) * (0.25 / 11));
    
    // Final combat performance score
    const combatPerformanceScore = baseScore * experienceMultiplier;
    
    // Calculate win rate from matches array
  // For win rate, prefer counting only active matches (non-zero battleTime)
  const totalMatches = char.matches ? char.matches.length : char.matchCount;
  const activeMatches = char.matches ? char.matches.filter(m => m.battleTime && m.battleTime > 0) : [];
  const winsActive = activeMatches.length > 0 ? activeMatches.filter(m => m.won).length : (char.matches ? char.matches.filter(m => m.won).length : 0);
  const winRate = activeMatches.length > 0 ? Math.round((winsActive / activeMatches.length) * 1000) / 10 : (totalMatches > 0 ? Math.round(((char.matches ? char.matches.filter(m => m.won).length : 0) / totalMatches) * 1000) / 10 : 0);
    
    // Calculate wins and losses
    const totalWins = char.matches ? char.matches.filter(m => m.won).length : 0;
    const totalLosses = char.matches ? char.matches.filter(m => !m.won).length : 0;
    
    // Calculate speed impact win rate (wins / impacts * 100)
    const speedImpactWinRate = char.totalSpeedImpacts > 0 
      ? Math.round((char.totalSpeedImpactWins / char.totalSpeedImpacts) * 1000) / 10 
      : 0;
    
    return {
      ...char,
      dps: Math.round(damagePerSecond * 10) / 10, // Add DPS field
      efficiency: Math.round(damageEfficiency * 100) / 100, // Add efficiency field
      hpRetention: Math.round(healthRetention * 1000) / 10, // Add HP retention % field
      combatPerformanceScore: Math.round(combatPerformanceScore * 100) / 100,
      winRate: winRate, // Add win rate % field
      wins: totalWins, // Add total wins
      losses: totalLosses, // Add total losses
      speedImpactWinRate: speedImpactWinRate, // Add speed impact win rate % field
      topBuilds: topBuilds // Add top 3 most used builds
    };
  }).sort((a, b) => {
    // Primary sort: Combat performance score (descending)
    if (Math.abs(b.combatPerformanceScore - a.combatPerformanceScore) > 0.1) {
      return b.combatPerformanceScore - a.combatPerformanceScore;
    }
    // Secondary sort: Average damage (descending) for very close scores
    if (Math.abs(b.avgDamage - a.avgDamage) > 1000) {
      return b.avgDamage - a.avgDamage;
    }
    // Tertiary sort: Match count (descending) for nearly identical performance
    return b.matchCount - a.matchCount;
  });
  
  // DEBUG: Cross-check character vs build scores for single-build characters
  const singleBuildChars = aggregated.filter(char => 
    char.topBuilds && 
    char.topBuilds.length === 1 && 
    char.topBuilds[0] &&
    char.activeMatchCount === char.topBuilds[0].activeCount
  );
  
  return aggregated;
}

function getTeamAggregatedData(files, charMap, capsuleMap = {}, aiStrategiesMap = {}) {
  const teamStats = {};
  
  files.forEach((file, index) => {
    if (file.error) return;
    
    let teams, battleWinLose, characterRecord, characterIdRecord = null;
    
    // Handle TeamBattleResults format (current BR_Data structure)
    if (file.content.TeamBattleResults) {
      teams = file.content.TeamBattleResults.teams;
      // Check for battleResult (lowercase r)
      if (file.content.TeamBattleResults.battleResult) {
        battleWinLose = file.content.TeamBattleResults.battleResult.battleWinLose;
        characterRecord = file.content.TeamBattleResults.battleResult.characterRecord;
        characterIdRecord = file.content.TeamBattleResults.battleResult.characterIdRecord;
      }
      // Check for BattleResults (capital R) - Cinema files format
      else if (file.content.TeamBattleResults.BattleResults) {
        battleWinLose = file.content.TeamBattleResults.BattleResults.battleWinLose;
        characterRecord = file.content.TeamBattleResults.BattleResults.characterRecord;
        characterIdRecord = file.content.TeamBattleResults.BattleResults.characterIdRecord;
      }
      // Check if data is directly in TeamBattleResults (new wrapper format)
      else if (file.content.TeamBattleResults.battleWinLose && file.content.TeamBattleResults.characterRecord) {
        battleWinLose = file.content.TeamBattleResults.battleWinLose;
        characterRecord = file.content.TeamBattleResults.characterRecord;
        characterIdRecord = file.content.TeamBattleResults.characterIdRecord;
      }
    }
    // Handle other formats
    else if (file.content.teams && Array.isArray(file.content.teams)) {
      teams = file.content.teams;
      if (file.content.teams[0]?.BattleResults) {
        battleWinLose = file.content.teams[0].BattleResults.battleWinLose;
        characterRecord = file.content.teams[0].BattleResults.characterRecord;
        characterIdRecord = file.content.teams[0].BattleResults.characterIdRecord;
      }
    }
    else if (file.content.BattleResults) {
      battleWinLose = file.content.BattleResults.battleWinLose;
      characterRecord = file.content.BattleResults.characterRecord;
      characterIdRecord = file.content.BattleResults.characterIdRecord;
      // Try to extract team names from file name or default
      teams = ["Team 1", "Team 2"];
    }
    
    if (!teams || !Array.isArray(teams) || teams.length < 2 || !battleWinLose || !characterRecord) {
      return;
    }
    
    const team1Name = teams[0];
    const team2Name = teams[1];
    
    // Check if team names are valid (not empty, null, undefined, or just whitespace)
    const isTeam1Valid = team1Name && typeof team1Name === 'string' && team1Name.trim() !== '';
    const isTeam2Valid = team2Name && typeof team2Name === 'string' && team2Name.trim() !== '';
    
    // Skip entirely if both teams are invalid
    if (!isTeam1Valid && !isTeam2Valid) {
      return;
    }
    
    // Determine which teams to process (only valid ones)
    const teamsToProcess = [];
    if (isTeam1Valid) teamsToProcess.push({ name: team1Name, isTeam1: true });
    if (isTeam2Valid) teamsToProcess.push({ name: team2Name, isTeam1: false });
    
    // Initialize team stats if they don't exist
    teamsToProcess.forEach(({ name: teamName }) => {
      if (!teamStats[teamName]) {
        teamStats[teamName] = {
          teamName,
          matches: 0,
          activeMatches: 0, // Track matches with battleDuration > 0
          wins: 0,
          losses: 0,
          winRate: 0,
          totalDamageDealt: 0,
          totalDamageTaken: 0,
          totalHealthRemaining: 0,
          totalHealthMax: 0,
          totalMatchDuration: 0, // Track total battle time across all matches
          avgDamagePerMatch: 0,
          avgDamageTakenPerMatch: 0,
          avgHealthRetention: 0,
          charactersUsed: new Set(),
          characterUsageCount: {},
          characterDetails: {},  // Store individual character match data
          characterAverages: {}, // Store calculated averages per character
          buildCompositions: {}, // New 7-category system - dynamic tracking
          matchHistory: [],
          opponentRecords: {}
        };
      }
    });
    
    // Process match result from team1's perspective
    const team1Won = battleWinLose === 'Win';
    const team2Won = battleWinLose === 'Lose';
    
    // Update win/loss records only for valid teams
    if (isTeam1Valid) {
      teamStats[team1Name].matches++;
      if (team1Won) teamStats[team1Name].wins++;
      else if (team2Won) teamStats[team1Name].losses++;
    }
    
    if (isTeam2Valid) {
      teamStats[team2Name].matches++;
      if (team2Won) teamStats[team2Name].wins++;
      else if (team1Won) teamStats[team2Name].losses++;
    }
    
    // Initialize opponent records only if both teams are valid
    if (isTeam1Valid && isTeam2Valid) {
      if (!teamStats[team1Name].opponentRecords[team2Name]) {
        teamStats[team1Name].opponentRecords[team2Name] = { wins: 0, losses: 0, characterMatchups: {} };
      }
      if (!teamStats[team2Name].opponentRecords[team1Name]) {
        teamStats[team2Name].opponentRecords[team1Name] = { wins: 0, losses: 0, characterMatchups: {} };
      }
      
      // Update head-to-head records
      if (team1Won) {
        teamStats[team1Name].opponentRecords[team2Name].wins++;
        teamStats[team2Name].opponentRecords[team1Name].losses++;
      } else if (team2Won) {
        teamStats[team1Name].opponentRecords[team2Name].losses++;
        teamStats[team2Name].opponentRecords[team1Name].wins++;
      }
    }
    
    // Process character data for both teams
    const teams_data = getTeams(characterRecord);
    const p1TeamStats = getTeamStats(teams_data.p1, charMap, capsuleMap);
    const p2TeamStats = getTeamStats(teams_data.p2, charMap, capsuleMap);
    
    // Check if this is an active match (has battle duration > 0)
    const isActiveMatch = p1TeamStats.totalBattleTime > 0 || p2TeamStats.totalBattleTime > 0;
    
    // Increment active match count for valid teams
    if (isActiveMatch) {
      if (isTeam1Valid) teamStats[team1Name].activeMatches++;
      if (isTeam2Valid) teamStats[team2Name].activeMatches++;
    }
    
    // Aggregate team 1 stats only if valid AND active match
    if (isTeam1Valid && isActiveMatch) {
      teamStats[team1Name].totalDamageDealt += p1TeamStats.totalDamage;
      teamStats[team1Name].totalDamageTaken += p1TeamStats.totalTaken;
      teamStats[team1Name].totalHealthRemaining += p1TeamStats.totalHealth;
      teamStats[team1Name].totalHealthMax += p1TeamStats.totalHPGaugeValueMax;
      teamStats[team1Name].totalMatchDuration += p1TeamStats.totalBattleTime;
    }
    
    // Aggregate team 2 stats only if valid AND active match
    if (isTeam2Valid && isActiveMatch) {
      teamStats[team2Name].totalDamageDealt += p2TeamStats.totalDamage;
      teamStats[team2Name].totalDamageTaken += p2TeamStats.totalTaken;
      teamStats[team2Name].totalHealthRemaining += p2TeamStats.totalHealth;
      teamStats[team2Name].totalHealthMax += p2TeamStats.totalHPGaugeValueMax;
      teamStats[team2Name].totalMatchDuration += p2TeamStats.totalBattleTime;
    }
    
    // Track character usage for team 1 only if valid
    if (isTeam1Valid) {
      teams_data.p1.forEach(char => {
      const stats = extractStats(char, charMap, capsuleMap, null, aiStrategiesMap);
      if (stats.name && stats.name !== '-') {
        teamStats[team1Name].charactersUsed.add(stats.name);
        teamStats[team1Name].characterUsageCount[stats.name] = 
          (teamStats[team1Name].characterUsageCount[stats.name] || 0) + 1;
        
        // Initialize character details array if needed
        if (!teamStats[team1Name].characterDetails[stats.name]) {
          teamStats[team1Name].characterDetails[stats.name] = [];
        }
        
        // Extract original character ID for form tracking
        const originalForm = char.battlePlayCharacter?.originalCharacter?.key || char.originalCharacter?.key;
        
        // Store individual character match data with all detailed stats
        teamStats[team1Name].characterDetails[stats.name].push({
          damageDealt: stats.damageDone || 0,
          damageTaken: stats.damageTaken || 0,
          healthRemaining: stats.hPGaugeValue || 0,
          healthMax: stats.hPGaugeValueMax || 0,
          battleDuration: stats.battleTime || 0,
          // Build and AI Strategy
          buildComposition: stats.buildComposition,
          aiStrategy: stats.aiStrategy,
          equippedCapsules: stats.equippedCapsules || [],
          totalCapsuleCost: stats.totalCapsuleCost || 0,
          // Special Abilities
          specialMovesUsed: stats.specialMovesUsed || 0,
          ultimatesUsed: stats.ultimatesUsed || 0,
          skillsUsed: stats.skillsUsed || 0,
          // NEW blast tracking
          s1Blast: stats.s1Blast || 0,
          s2Blast: stats.s2Blast || 0,
          ultBlast: stats.ultBlast || 0,
          s1HitBlast: stats.s1HitBlast,
          s2HitBlast: stats.s2HitBlast,
          uLTHitBlast: stats.uLTHitBlast,
          s1HitRate: stats.s1HitRate,
          s2HitRate: stats.s2HitRate,
          ultHitRate: stats.ultHitRate,
          // Legacy blast tracking (for backwards compatibility)
          spm1Count: stats.s1Blast || 0,
          spm2Count: stats.s2Blast || 0,
          exa1Count: stats.exa1Count || 0,
          exa2Count: stats.exa2Count || 0,
          // Survival & Health
          sparkingCount: stats.sparkingCount || 0,
          chargeCount: stats.chargeCount || 0,
          guardCount: stats.guardCount || 0,
          shotEnergyBulletCount: stats.shotEnergyBulletCount || 0,
          zCounterCount: stats.zCounterCount || 0,
          superCounterCount: stats.superCounterCount || 0,
          revengeCounterCount: stats.revengeCounterCount || 0,
          tags: stats.tags || 0,
          // Combat Performance
          maxComboNum: stats.maxComboNum || 0,
          maxComboDamage: stats.maxComboDamage || 0,
          throwCount: stats.throwCount || 0,
          lightningAttackCount: stats.lightningAttackCount || 0,
          vanishingAttackCount: stats.vanishingAttackCount || 0,
          dragonHomingCount: stats.dragonHomingCount || 0,
          speedImpactCount: stats.speedImpactCount || 0,
          speedImpactWins: stats.speedImpactWins || 0,
          sparkingComboCount: stats.sparkingComboCount || 0,
          dragonDashMileage: stats.dragonDashMileage || 0,
          kills: stats.kills || 0,
          fileName: file.name,
          // Per-form stats tracking
          formChangeHistory: char.formChangeHistory || [],
          originalCharacterId: originalForm,
          characterIdRecord: characterIdRecord,
          rawCharacterData: char // Store raw data for per-form calculation
        });
        
        // Track build compositions (new 7-category system)
        if (stats.buildComposition && stats.buildComposition.label) {
          const compositionLabel = stats.buildComposition.label;
          if (!teamStats[team1Name].buildCompositions[compositionLabel]) {
            teamStats[team1Name].buildCompositions[compositionLabel] = 0;
          }
          teamStats[team1Name].buildCompositions[compositionLabel]++;
        }
      }
    });
    }
    
    // Track character usage for team 2 only if valid
    if (isTeam2Valid) {
      teams_data.p2.forEach(char => {
      const stats = extractStats(char, charMap, capsuleMap, null, aiStrategiesMap);
      if (stats.name && stats.name !== '-') {
        teamStats[team2Name].charactersUsed.add(stats.name);
        teamStats[team2Name].characterUsageCount[stats.name] = 
          (teamStats[team2Name].characterUsageCount[stats.name] || 0) + 1;
        
        // Initialize character details array if needed
        if (!teamStats[team2Name].characterDetails[stats.name]) {
          teamStats[team2Name].characterDetails[stats.name] = [];
        }
        
        // Extract original character ID for form tracking
        const originalForm = char.battlePlayCharacter?.originalCharacter?.key || char.originalCharacter?.key;
        
        // Store individual character match data with all detailed stats
        teamStats[team2Name].characterDetails[stats.name].push({
          damageDealt: stats.damageDone || 0,
          damageTaken: stats.damageTaken || 0,
          healthRemaining: stats.hPGaugeValue || 0,
          healthMax: stats.hPGaugeValueMax || 0,
          battleDuration: stats.battleTime || 0,
          // Build and AI Strategy
          buildComposition: stats.buildComposition,
          aiStrategy: stats.aiStrategy,
          equippedCapsules: stats.equippedCapsules || [],
          totalCapsuleCost: stats.totalCapsuleCost || 0,
          // Special Abilities
          specialMovesUsed: stats.specialMovesUsed || 0,
          ultimatesUsed: stats.ultimatesUsed || 0,
          skillsUsed: stats.skillsUsed || 0,
          // NEW blast tracking
          s1Blast: stats.s1Blast || 0,
          s2Blast: stats.s2Blast || 0,
          ultBlast: stats.ultBlast || 0,
          s1HitBlast: stats.s1HitBlast,
          s2HitBlast: stats.s2HitBlast,
          uLTHitBlast: stats.uLTHitBlast,
          s1HitRate: stats.s1HitRate,
          s2HitRate: stats.s2HitRate,
          ultHitRate: stats.ultHitRate,
          // Legacy blast tracking (for backwards compatibility)
          spm1Count: stats.s1Blast || 0,
          spm2Count: stats.s2Blast || 0,
          exa1Count: stats.exa1Count || 0,
          exa2Count: stats.exa2Count || 0,
          // Survival & Health
          sparkingCount: stats.sparkingCount || 0,
          chargeCount: stats.chargeCount || 0,
          guardCount: stats.guardCount || 0,
          shotEnergyBulletCount: stats.shotEnergyBulletCount || 0,
          zCounterCount: stats.zCounterCount || 0,
          superCounterCount: stats.superCounterCount || 0,
          revengeCounterCount: stats.revengeCounterCount || 0,
          tags: stats.tags || 0,
          // Combat Performance
          maxComboNum: stats.maxComboNum || 0,
          maxComboDamage: stats.maxComboDamage || 0,
          throwCount: stats.throwCount || 0,
          lightningAttackCount: stats.lightningAttackCount || 0,
          vanishingAttackCount: stats.vanishingAttackCount || 0,
          dragonHomingCount: stats.dragonHomingCount || 0,
          speedImpactCount: stats.speedImpactCount || 0,
          speedImpactWins: stats.speedImpactWins || 0,
          sparkingComboCount: stats.sparkingComboCount || 0,
          dragonDashMileage: stats.dragonDashMileage || 0,
          kills: stats.kills || 0,
          fileName: file.name,
          // Per-form stats tracking
          formChangeHistory: char.formChangeHistory || [],
          originalCharacterId: originalForm,
          characterIdRecord: characterIdRecord,
          rawCharacterData: char // Store raw data for per-form calculation
        });
        
        // Track build compositions (new 7-category system)
        if (stats.buildComposition && stats.buildComposition.label) {
          const compositionLabel = stats.buildComposition.label;
          if (!teamStats[team2Name].buildCompositions[compositionLabel]) {
            teamStats[team2Name].buildCompositions[compositionLabel] = 0;
          }
          teamStats[team2Name].buildCompositions[compositionLabel]++;
        }
      }
    });
    }
    
    // Track position-based character matchups (only if both teams are valid)
    if (isTeam1Valid && isTeam2Valid) {
      teams_data.p1.forEach((p1Char, index) => {
        const p2Char = teams_data.p2[index];
        if (!p2Char) return; // No opposing character at this position
        
        const p1Stats = extractStats(p1Char, charMap, capsuleMap, null, aiStrategiesMap);
        const p2Stats = extractStats(p2Char, charMap, capsuleMap, null, aiStrategiesMap);
        
        if (p1Stats.name && p1Stats.name !== '-' && p2Stats.name && p2Stats.name !== '-') {
          const position = index + 1; // 1-indexed position
          
          // Track for team1 vs team2
          const matchupKey = `${p1Stats.name}_vs_${p2Stats.name}`;
          if (!teamStats[team1Name].opponentRecords[team2Name].characterMatchups[matchupKey]) {
            teamStats[team1Name].opponentRecords[team2Name].characterMatchups[matchupKey] = {
              characterName: p1Stats.name,
              opponentName: p2Stats.name,
              position: position,
              matches: [],
              buildUsage: {},
              buildCompositionData: {} // Store full build composition data
            };
          }
          
          // Calculate performance score for this match
          const damageEfficiency = (p1Stats.damageTaken || 1) > 0 ? p1Stats.damageDone / p1Stats.damageTaken : p1Stats.damageDone;
          const dps = (p1Stats.battleTime || 1) > 0 ? p1Stats.damageDone / p1Stats.battleTime : 0;
          const healthRetention = (p1Stats.hPGaugeValueMax || 1) > 0 ? p1Stats.hPGaugeValue / p1Stats.hPGaugeValueMax : 0;
          const baseScore = (
            (p1Stats.damageDone / 100000) * 35 +
            (damageEfficiency) * 25 +
            (dps / 1000) * 25 +
            (healthRetention) * 15
          );
          
          teamStats[team1Name].opponentRecords[team2Name].characterMatchups[matchupKey].matches.push({
            damageDealt: p1Stats.damageDone || 0,
            damageTaken: p1Stats.damageTaken || 0,
            battleTime: p1Stats.battleTime || 0,
            healthRemaining: p1Stats.hPGaugeValue || 0,
            healthMax: p1Stats.hPGaugeValueMax || 0,
            performanceScore: baseScore
          });
          
          // Track build usage for this matchup
          if (p1Stats.buildComposition && p1Stats.buildComposition.label) {
            const buildKey = p1Stats.buildComposition.label;
            teamStats[team1Name].opponentRecords[team2Name].characterMatchups[matchupKey].buildUsage[buildKey] = 
              (teamStats[team1Name].opponentRecords[team2Name].characterMatchups[matchupKey].buildUsage[buildKey] || 0) + 1;
            // Store the full build composition data
            if (!teamStats[team1Name].opponentRecords[team2Name].characterMatchups[matchupKey].buildCompositionData[buildKey]) {
              teamStats[team1Name].opponentRecords[team2Name].characterMatchups[matchupKey].buildCompositionData[buildKey] = {
                buildComposition: p1Stats.buildComposition,
                aiStrategy: p1Stats.aiStrategy || 'Default',
                equippedCapsules: p1Stats.equippedCapsules || [],
                totalCapsuleCost: p1Stats.totalCapsuleCost || 0
              };
            }
          }
          
          // Track for team2 vs team1 (reverse matchup)
          const reverseMatchupKey = `${p2Stats.name}_vs_${p1Stats.name}`;
          if (!teamStats[team2Name].opponentRecords[team1Name].characterMatchups[reverseMatchupKey]) {
            teamStats[team2Name].opponentRecords[team1Name].characterMatchups[reverseMatchupKey] = {
              characterName: p2Stats.name,
              opponentName: p1Stats.name,
              position: position,
              matches: [],
              buildUsage: {},
              buildCompositionData: {} // Store full build composition data
            };
          }
          
          const p2DamageEfficiency = (p2Stats.damageTaken || 1) > 0 ? p2Stats.damageDone / p2Stats.damageTaken : p2Stats.damageDone;
          const p2Dps = (p2Stats.battleTime || 1) > 0 ? p2Stats.damageDone / p2Stats.battleTime : 0;
          const p2HealthRetention = (p2Stats.hPGaugeValueMax || 1) > 0 ? p2Stats.hPGaugeValue / p2Stats.hPGaugeValueMax : 0;
          const p2BaseScore = (
            (p2Stats.damageDone / 100000) * 35 +
            (p2DamageEfficiency) * 25 +
            (p2Dps / 1000) * 25 +
            (p2HealthRetention) * 15
          );
          
          teamStats[team2Name].opponentRecords[team1Name].characterMatchups[reverseMatchupKey].matches.push({
            damageDealt: p2Stats.damageDone || 0,
            damageTaken: p2Stats.damageTaken || 0,
            battleTime: p2Stats.battleTime || 0,
            healthRemaining: p2Stats.hPGaugeValue || 0,
            healthMax: p2Stats.hPGaugeValueMax || 0,
            performanceScore: p2BaseScore
          });
          
          if (p2Stats.buildComposition && p2Stats.buildComposition.label) {
            const p2BuildKey = p2Stats.buildComposition.label;
            teamStats[team2Name].opponentRecords[team1Name].characterMatchups[reverseMatchupKey].buildUsage[p2BuildKey] = 
              (teamStats[team2Name].opponentRecords[team1Name].characterMatchups[reverseMatchupKey].buildUsage[p2BuildKey] || 0) + 1;
            // Store the full build composition data
            if (!teamStats[team2Name].opponentRecords[team1Name].characterMatchups[reverseMatchupKey].buildCompositionData[p2BuildKey]) {
              teamStats[team2Name].opponentRecords[team1Name].characterMatchups[reverseMatchupKey].buildCompositionData[p2BuildKey] = {
                buildComposition: p2Stats.buildComposition,
                aiStrategy: p2Stats.aiStrategy || 'Default',
                equippedCapsules: p2Stats.equippedCapsules || [],
                totalCapsuleCost: p2Stats.totalCapsuleCost || 0
              };
            }
          }
        }
      });
    }
    
    // Add match history only for valid teams
    if (isTeam1Valid) {
      teamStats[team1Name].matchHistory.push({
        opponent: isTeam2Valid ? team2Name : 'Unknown',
        result: team1Won ? 'Win' : 'Loss',
        damageDealt: p1TeamStats.totalDamage,
        damageTaken: p1TeamStats.totalTaken,
        healthRemaining: p1TeamStats.totalHealth,
        healthMax: p1TeamStats.totalHPGaugeValueMax,
        battleDuration: p1TeamStats.totalBattleTime,
        fileName: file.name
      });
    }
    
    if (isTeam2Valid) {
      teamStats[team2Name].matchHistory.push({
        opponent: isTeam1Valid ? team1Name : 'Unknown',
        result: team2Won ? 'Win' : 'Loss',
        damageDealt: p2TeamStats.totalDamage,
        damageTaken: p2TeamStats.totalTaken,
        healthRemaining: p2TeamStats.totalHealth,
        healthMax: p2TeamStats.totalHPGaugeValueMax,
        battleDuration: p2TeamStats.totalBattleTime,
        fileName: file.name
      });
    }
  });
  
  // Calculate final statistics and format data
  return Object.values(teamStats).map(team => {
    team.winRate = team.matches > 0 ? Math.round((team.wins / team.matches) * 100 * 10) / 10 : 0;
    
    // Convert character usage set to array and sort by usage frequency
    team.favoriteCharacters = Object.entries(team.characterUsageCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, usage: count }));
    
    // Calculate per-character averages
    Object.entries(team.characterDetails).forEach(([charName, matches]) => {
      if (matches.length > 0) {
        // Filter for active matches first (same approach as build calculation)
        const activeMatches = matches.filter(m => m.battleDuration && m.battleDuration > 0);
        const matchesToAggregate = activeMatches.length > 0 ? activeMatches : matches;
        
        const totalDamageDealt = matchesToAggregate.reduce((sum, match) => sum + (match.damageDealt || 0), 0);
        const totalDamageTaken = matchesToAggregate.reduce((sum, match) => sum + (match.damageTaken || 0), 0);
        const totalBattleDuration = matchesToAggregate.reduce((sum, match) => sum + (match.battleDuration || 0), 0);
        const totalHealthRemaining = matchesToAggregate.reduce((sum, match) => sum + (match.healthRemaining || 0), 0);
        const totalHealthMax = matchesToAggregate.reduce((sum, match) => sum + (match.healthMax || 0), 0);
        
        // Special Abilities totals
        const totalSpecialMoves = matches.reduce((sum, match) => sum + (match.specialMovesUsed || 0), 0);
        const totalUltimates = matches.reduce((sum, match) => sum + (match.ultimatesUsed || 0), 0);
        const totalSkills = matches.reduce((sum, match) => sum + (match.skillsUsed || 0), 0);
        const totalSPM1 = matches.reduce((sum, match) => sum + (match.spm1Count || 0), 0);
        const totalSPM2 = matches.reduce((sum, match) => sum + (match.spm2Count || 0), 0);
        const totalEXA1 = matches.reduce((sum, match) => sum + (match.exa1Count || 0), 0);
        const totalEXA2 = matches.reduce((sum, match) => sum + (match.exa2Count || 0), 0);
        
        // New blast tracking totals
        const totalS1Blast = matches.reduce((sum, match) => sum + (match.s1Blast || match.spm1Count || 0), 0);
        const totalS2Blast = matches.reduce((sum, match) => sum + (match.s2Blast || match.spm2Count || 0), 0);
        const totalUltBlast = matches.reduce((sum, match) => sum + (match.ultBlast || 0), 0);
        const totalS1HitBlast = matches.reduce((sum, match) => sum + (match.s1HitBlast || 0), 0);
        const totalS2HitBlast = matches.reduce((sum, match) => sum + (match.s2HitBlast || 0), 0);
        const totalULTHitBlast = matches.reduce((sum, match) => sum + (match.uLTHitBlast || 0), 0);
        const totalTags = matches.reduce((sum, match) => sum + (match.tags || 0), 0);
        
        // Track separately for hit rate calculation (only from matches with additionalCounts data)
        // Check each blast type individually - a match is trackable for a blast type only if that specific blast type has hit data
        const totalS1BlastTrackable = matches.reduce((sum, match) => {
          // Check if THIS blast type has hit data in this match
          const hasS1HitData = (match.s1HitBlast !== undefined && match.s1HitBlast !== null);
          return sum + (hasS1HitData ? (match.s1Blast || 0) : 0);
        }, 0);
        const totalS2BlastTrackable = matches.reduce((sum, match) => {
          // Check if THIS blast type has hit data in this match
          const hasS2HitData = (match.s2HitBlast !== undefined && match.s2HitBlast !== null);
          return sum + (hasS2HitData ? (match.s2Blast || 0) : 0);
        }, 0);
        const totalUltBlastTrackable = matches.reduce((sum, match) => {
          // Check if THIS blast type has hit data in this match
          const hasUltHitData = (match.uLTHitBlast !== undefined && match.uLTHitBlast !== null);
          return sum + (hasUltHitData ? (match.ultBlast || 0) : 0);
        }, 0);
        
        // Survival & Health totals
        const totalSparking = matches.reduce((sum, match) => sum + (match.sparkingCount || 0), 0);
        const totalCharges = matches.reduce((sum, match) => sum + (match.chargeCount || 0), 0);
        const totalGuards = matches.reduce((sum, match) => sum + (match.guardCount || 0), 0);
        const totalEnergyBlasts = matches.reduce((sum, match) => sum + (match.shotEnergyBulletCount || 0), 0);
        const totalZCounters = matches.reduce((sum, match) => sum + (match.zCounterCount || 0), 0);
        const totalSuperCounters = matches.reduce((sum, match) => sum + (match.superCounterCount || 0), 0);
        const totalRevengeCounters = matches.reduce((sum, match) => sum + (match.revengeCounterCount || 0), 0);
        
        // Combat Performance totals
        const totalMaxComboNum = matches.reduce((sum, match) => sum + (match.maxComboNum || 0), 0);
        const totalMaxComboDamage = matches.reduce((sum, match) => sum + (match.maxComboDamage || 0), 0);
        const totalThrows = matches.reduce((sum, match) => sum + (match.throwCount || 0), 0);
        const totalLightningAttacks = matches.reduce((sum, match) => sum + (match.lightningAttackCount || 0), 0);
        const totalVanishingAttacks = matches.reduce((sum, match) => sum + (match.vanishingAttackCount || 0), 0);
        const totalDragonHoming = matches.reduce((sum, match) => sum + (match.dragonHomingCount || 0), 0);
        const totalSpeedImpacts = matches.reduce((sum, match) => sum + (match.speedImpactCount || 0), 0);
        const totalSpeedImpactWins = matches.reduce((sum, match) => sum + (match.speedImpactWins || 0), 0);
        const totalSparkingCombo = matches.reduce((sum, match) => sum + (match.sparkingComboCount || 0), 0);
        const totalDragonDashMileage = matches.reduce((sum, match) => sum + (match.dragonDashMileage || 0), 0);
        const totalKills = matches.reduce((sum, match) => sum + (match.kills || 0), 0);
        
        const matchCount = matches.length;
        const activeMatchCount = matchesToAggregate.length;
        const denom = activeMatchCount;
        
        const avgDamageDealt = Math.round(totalDamageDealt / Math.max(denom, 1));
        const avgDamageTaken = Math.round(totalDamageTaken / Math.max(denom, 1));
        const avgBattleDuration = totalBattleDuration / Math.max(denom, 1);
        const avgHealthRemaining = totalHealthRemaining / Math.max(denom, 1);
        const avgHealthMax = totalHealthMax / Math.max(denom, 1);
        
        const damageEfficiency = totalDamageTaken > 0 ? 
          Math.round((totalDamageDealt / totalDamageTaken) * 100) / 100 : 
          (totalDamageDealt > 0 ? 999 : 0);
        const damagePerSecond = totalBattleDuration > 0 ? 
          Math.round((totalDamageDealt / totalBattleDuration) * 100) / 100 : 0;
        const healthRetention = avgHealthMax > 0 ? avgHealthRemaining / avgHealthMax : 0;
        
        // Calculate performance score using same formula as character aggregation
        const baseScore = (
          (avgDamageDealt / 100000) * 35 +        // Damage dealt weight: 35%
          (damageEfficiency) * 25 +                // Damage efficiency weight: 25%
          (damagePerSecond / 1000) * 25 +          // Damage per second weight: 25%
          (healthRetention) * 15                   // Health retention weight: 15%
        );
        
        // Experience multiplier based on matches played (use active match count)
        const experienceMultiplier = Math.min(1.25, 1.0 + (activeMatchCount - 1) * (0.25 / 11));
        const performanceScore = Math.round((baseScore * experienceMultiplier) * 100) / 100;
        
        // Calculate speed impact win rate
        const speedImpactWinRate = totalSpeedImpacts > 0 
          ? Math.round((totalSpeedImpactWins / totalSpeedImpacts) * 1000) / 10 
          : 0;
        
        team.characterAverages[charName] = {
          avgDamageDealt,
          avgDamageTaken,
          avgDamageEfficiency: damageEfficiency,
          avgDamagePerSecond: damagePerSecond,
          avgHealthRetention: healthRetention,
          avgHealthMax: Math.round(avgHealthMax),
          avgHealthRemaining: Math.round(avgHealthRemaining),
          avgBattleDuration: Math.round(avgBattleDuration),
          performanceScore,
          matchesPlayed: matchCount,
          activeMatchesPlayed: activeMatchCount,
          usageRate: Math.round((activeMatchCount / team.activeMatches) * 100 * 10) / 10,
          // Special Abilities averages
          avgSpecialMoves: Math.round((totalSpecialMoves / denom) * 10) / 10,
          avgUltimates: Math.round((totalUltimates / denom) * 10) / 10,
          avgSkills: Math.round((totalSkills / denom) * 10) / 10,
          avgSPM1: Math.round((totalSPM1 / denom) * 10) / 10,
          avgSPM2: Math.round((totalSPM2 / denom) * 10) / 10,
          avgEXA1: Math.round((totalEXA1 / denom) * 10) / 10,
          avgEXA2: Math.round((totalEXA2 / denom) * 10) / 10,
          // New blast tracking averages
          avgS1Blast: Math.round((totalS1Blast / denom) * 10) / 10,
          avgS2Blast: Math.round((totalS2Blast / denom) * 10) / 10,
          avgUltBlast: Math.round((totalUltBlast / denom) * 10) / 10,
          avgS1Hit: Math.round((totalS1HitBlast / denom) * 10) / 10,
          avgS2Hit: Math.round((totalS2HitBlast / denom) * 10) / 10,
          avgUltHit: Math.round((totalULTHitBlast / denom) * 10) / 10,
          s1HitRateOverall: totalS1BlastTrackable > 0 ? Math.round((totalS1HitBlast / totalS1BlastTrackable) * 1000) / 10 : null,
          s2HitRateOverall: totalS2BlastTrackable > 0 ? Math.round((totalS2HitBlast / totalS2BlastTrackable) * 1000) / 10 : null,
          ultHitRateOverall: totalUltBlastTrackable > 0 ? Math.round((totalULTHitBlast / totalUltBlastTrackable) * 1000) / 10 : null,
          
          avgTags: Math.round((totalTags / denom) * 10) / 10,
          totalTags: totalTags,
          
          // Survival & Health averages
          avgSparking: Math.round((totalSparking / denom) * 10) / 10,
          avgCharges: Math.round((totalCharges / denom) * 10) / 10,
          avgGuards: Math.round((totalGuards / denom) * 10) / 10,
          avgEnergyBlasts: Math.round((totalEnergyBlasts / denom) * 10) / 10,
          avgZCounters: Math.round((totalZCounters / denom) * 10) / 10,
          avgSuperCounters: Math.round((totalSuperCounters / denom) * 10) / 10,
          avgRevengeCounters: Math.round((totalRevengeCounters / denom) * 10) / 10,
          // Combat Performance averages
          avgMaxComboNum: Math.round((totalMaxComboNum / denom) * 10) / 10,
          avgMaxComboDamage: Math.round(totalMaxComboDamage / denom),
          avgThrows: Math.round((totalThrows / denom) * 10) / 10,
          avgLightningAttacks: Math.round((totalLightningAttacks / denom) * 10) / 10,
          avgVanishingAttacks: Math.round((totalVanishingAttacks / denom) * 10) / 10,
          avgDragonHoming: Math.round((totalDragonHoming / denom) * 10) / 10,
          avgSpeedImpacts: Math.round((totalSpeedImpacts / denom) * 10) / 10,
          avgSpeedImpactWins: Math.round((totalSpeedImpactWins / denom) * 10) / 10,
          speedImpactWinRate: speedImpactWinRate,
          avgSparkingCombo: Math.round((totalSparkingCombo / denom) * 10) / 10,
          avgDragonDashMileage: Math.round((totalDragonDashMileage / denom) * 10) / 10,
          avgKills: Math.round((totalKills / denom) * 10) / 10
        };
        
        // Track build usage for this character
        const buildUsageMap = {};
        matches.forEach(match => {
          if (match.buildComposition && match.buildComposition.label) {
            const buildKey = `${match.buildComposition.label}|${match.aiStrategy || 'Default'}`;
            if (!buildUsageMap[buildKey]) {
              buildUsageMap[buildKey] = {
                buildLabel: match.buildComposition.label,
                buildComposition: match.buildComposition,
                aiStrategy: match.aiStrategy,
                equippedCapsules: match.equippedCapsules || [],
                totalCapsuleCost: match.totalCapsuleCost || 0,
                count: 0,
                activeCount: 0, // Track active matches (with battleDuration > 0)
                // Aggregate stats (same approach as character)
                totalDamageDealt: 0,
                totalDamageTaken: 0,
                totalBattleDuration: 0,
                totalHealthRemaining: 0,
                totalHealthMax: 0
              };
            }
            buildUsageMap[buildKey].count++;
            // Only aggregate stats from active matches (same as character)
            if (match.battleDuration && match.battleDuration > 0) {
              buildUsageMap[buildKey].activeCount++;
              buildUsageMap[buildKey].totalDamageDealt += match.damageDealt || 0;
              buildUsageMap[buildKey].totalDamageTaken += match.damageTaken || 0;
              buildUsageMap[buildKey].totalBattleDuration += match.battleDuration || 0;
              buildUsageMap[buildKey].totalHealthRemaining += match.healthRemaining || 0;
              buildUsageMap[buildKey].totalHealthMax += match.healthMax || 0;
            }
          }
        });
        
        // Sort builds by usage first, then by average performance score for tie-breaking
        const sortedBuilds = Object.values(buildUsageMap)
          .filter(build => build.activeCount > 0) // Only include builds with active matches
          .map(build => {
            // Calculate metrics from aggregated totals (same as character calculation)
            const denom = build.activeCount;
            const avgDamageDealt = Math.round(build.totalDamageDealt / Math.max(denom, 1));
            const avgDamageTaken = Math.round(build.totalDamageTaken / Math.max(denom, 1));
            const avgBattleDuration = build.totalBattleDuration / Math.max(denom, 1);
            const avgHealthRemaining = build.totalHealthRemaining / Math.max(denom, 1);
            const avgHealthMax = build.totalHealthMax / Math.max(denom, 1);
            
            const damageEfficiency = build.totalDamageTaken > 0 ? 
              Math.round((build.totalDamageDealt / build.totalDamageTaken) * 100) / 100 : 
              (build.totalDamageDealt > 0 ? 999 : 0);
            const damagePerSecond = build.totalBattleDuration > 0 ? 
              Math.round((build.totalDamageDealt / build.totalBattleDuration) * 100) / 100 : 0;
            const healthRetention = avgHealthMax > 0 ? avgHealthRemaining / avgHealthMax : 0;
            
            // Calculate base score using same formula as character
            const baseScore = (
              (avgDamageDealt / 100000) * 35 +        // Damage dealt weight: 35%
              (damageEfficiency) * 25 +                // Damage efficiency weight: 25%
              (damagePerSecond / 1000) * 25 +          // Damage per second weight: 25%
              (healthRetention) * 15                   // Health retention weight: 15%
            );
            
            // Apply experience multiplier consistent with character performance score
            // Use activeCount for experience, same as character (prefer active matches)
            const experienceMultiplier = Math.min(1.25, 1.0 + ((build.activeCount > 0 ? build.activeCount : build.count) - 1) * (0.25 / 11));
            const performanceScore = Math.round((baseScore * experienceMultiplier) * 100) / 100;
            
            return {
              ...build,
              avgPerformanceScore: performanceScore
            };
          })
          .sort((a, b) => {
            // Primary sort: by usage count (descending)
            if (b.count !== a.count) return b.count - a.count;
            // Tie-breaker: by average performance score (descending)
            return b.avgPerformanceScore - a.avgPerformanceScore;
          });
        
        // Get top 3 most used builds
        team.characterAverages[charName].topBuilds = sortedBuilds.slice(0, 3);
        
        // Aggregate per-form stats for characters with transformations
        const formStatsMap = {};
        matches.forEach(match => {
          // Check if this character has form changes AND characterIdRecord data
          const hasFormChanges = Array.isArray(match.formChangeHistory) && match.formChangeHistory.length > 0;
          const hasCharacterIdRecord = match.characterIdRecord && typeof match.characterIdRecord === 'object';
          
          if (hasFormChanges && hasCharacterIdRecord) {
            const perFormStats = calculatePerFormStats(
              match.rawCharacterData,
              match.characterIdRecord,
              match.formChangeHistory,
              match.originalCharacterId
            );

            
            perFormStats.forEach(formStat => {
              const formId = formStat.formId;
              if (!formStatsMap[formId]) {
                formStatsMap[formId] = {
                  formId: formId,
                  formNumber: formStat.formNumber,
                  isFirstForm: formStat.isFirstForm,
                  isFinalForm: formStat.isFinalForm,
                  totalDamageDone: 0,
                  totalDamageTaken: 0,
                  totalBattleTime: 0,
                  totalBattleCount: 0,
                  totalHPRemaining: 0,
                  totalHPMax: 0,
                  totalSpecialMoves: 0,
                  totalUltimates: 0,
                  totalS1Blast: 0,
                  totalS2Blast: 0,
                  totalUltBlast: 0,
                  totalS1HitBlast: 0,
                  totalS2HitBlast: 0,
                  totalULTHitBlast: 0,
                  totalKills: 0,
                  matches: 0
                };
              }
              
              formStatsMap[formId].totalDamageDone += formStat.damageDone || 0;
              formStatsMap[formId].totalDamageTaken += formStat.damageTaken || 0;
              formStatsMap[formId].totalBattleTime += formStat.battleTime || 0;
              formStatsMap[formId].totalHPRemaining += formStat.hpRemaining || 0;
              formStatsMap[formId].totalHPMax += (formStat.hpRemaining || 0);
              formStatsMap[formId].totalSpecialMoves += formStat.specialMovesUsed || 0;
              formStatsMap[formId].totalUltimates += formStat.ultimatesUsed || 0;
              formStatsMap[formId].totalS1Blast += formStat.s1Blast || 0;
              formStatsMap[formId].totalS2Blast += formStat.s2Blast || 0;
              formStatsMap[formId].totalUltBlast += formStat.ultBlast || 0;
              formStatsMap[formId].totalS1HitBlast += (formStat.s1HitBlast || 0);
              formStatsMap[formId].totalS2HitBlast += (formStat.s2HitBlast || 0);
              formStatsMap[formId].totalULTHitBlast += (formStat.uLTHitBlast || 0);
              formStatsMap[formId].totalKills += formStat.kills || 0;
              formStatsMap[formId].matches += 1;
            });
          }
        });
        
        // Calculate averages for each form
        const aggregatedFormStats = Object.values(formStatsMap).map(formData => {
          const matchCount = formData.matches;
          const avgDamageDone = matchCount > 0 ? formData.totalDamageDone / matchCount : 0;
          const avgDamageTaken = matchCount > 0 ? formData.totalDamageTaken / matchCount : 0;
          const avgBattleTime = matchCount > 0 ? formData.totalBattleTime / matchCount : 0;
          
          // Calculate derived stats using total-based calculations
          const damageEfficiency = formData.totalDamageTaken > 0 ? formData.totalDamageDone / formData.totalDamageTaken : 0;
          const damagePerSecond = formData.totalBattleTime > 0 ? formData.totalDamageDone / formData.totalBattleTime : 0;
          
          return {
            formId: formData.formId,
            formNumber: formData.formNumber,
            characterName: charMap[formData.formId] || formData.formId,
            isFirstForm: formData.isFirstForm,
            isFinalForm: formData.isFinalForm,
            avgDamageDone: avgDamageDone,
            avgDamageTaken: avgDamageTaken,
            avgBattleTime: avgBattleTime,
            avgHPRemaining: matchCount > 0 ? formData.totalHPRemaining / matchCount : 0,
            avgSpecialMoves: matchCount > 0 ? formData.totalSpecialMoves / matchCount : 0,
            avgUltimates: matchCount > 0 ? formData.totalUltimates / matchCount : 0,
            avgS1Blast: matchCount > 0 ? formData.totalS1Blast / matchCount : 0,
            avgS2Blast: matchCount > 0 ? formData.totalS2Blast / matchCount : 0,
            avgUltBlast: matchCount > 0 ? formData.totalUltBlast / matchCount : 0,
            avgS1HitBlast: matchCount > 0 ? formData.totalS1HitBlast / matchCount : 0,
            avgS2HitBlast: matchCount > 0 ? formData.totalS2HitBlast / matchCount : 0,
            avgULTHitBlast: matchCount > 0 ? formData.totalULTHitBlast / matchCount : 0,
            avgKills: matchCount > 0 ? formData.totalKills / matchCount : 0,
            damageEfficiency: damageEfficiency,
            damagePerSecond: damagePerSecond,
            matchCount: matchCount
          };
        }).sort((a, b) => a.formNumber - b.formNumber);
        
        // Add form stats to character averages
        if (aggregatedFormStats.length > 0) {
          team.characterAverages[charName].formStats = aggregatedFormStats;
          
          // Build form change history text
          const formNames = aggregatedFormStats.map(f => f.characterName);
          team.characterAverages[charName].formChangeHistoryText = formNames.join(' → ');
          
          // Store raw form change history for component
          team.characterAverages[charName].formChangeHistory = matches[0]?.formChangeHistory || [];
        }
      }
    });
    
    // Get top 5 characters by performance score for team-level stats (matching Team Performance Matrix logic)
    const top5Characters = Object.entries(team.characterAverages)
      .sort((a, b) => (b[1].performanceScore || 0) - (a[1].performanceScore || 0))
      .slice(0, 5)
      .map(([name, stats]) => ({ name, ...stats }));
    
    // Calculate team-level stats based on top 5 characters
    const top5TotalDamage = top5Characters.reduce((sum, char) => sum + char.avgDamageDealt, 0);
    const top5TotalTaken = top5Characters.reduce((sum, char) => sum + char.avgDamageTaken, 0);
    const top5TotalMaxHP = top5Characters.reduce((sum, char) => sum + char.avgHealthMax, 0);
    const top5TotalHPLeft = top5Characters.reduce((sum, char) => sum + char.avgHealthRemaining, 0);
    const top5TotalBattleTime = top5Characters.reduce((sum, char) => sum + (char.avgBattleDuration || 0), 0);
    const top5TotalTags = top5Characters.reduce((sum, char) => sum + (char.totalTags || 0), 0);
    
    // Team-level calculated stats from top 5
    team.avgDamagePerMatch = Math.round(top5TotalDamage);
    team.avgDamageTakenPerMatch = Math.round(top5TotalTaken);
    team.avgHealthRetention = top5TotalMaxHP > 0 ? 
      Math.round((top5TotalHPLeft / top5TotalMaxHP) * 1000) / 10 : 0;
    team.top5Efficiency = top5TotalTaken > 0 ? 
      Math.round((top5TotalDamage / top5TotalTaken) * 100) / 100 : 0;
    team.top5DPS = top5TotalBattleTime > 0 ?
      Math.round((top5TotalDamage / top5TotalBattleTime) * 10) / 10 : 0;
    // Calculate average TOTAL match duration (total battle time of all characters per match)
    team.top5AvgMatchDuration = team.matches > 0 ?
      Math.round(team.totalMatchDuration / team.matches) : 0;
    team.top5AvgHPRemaining = top5Characters.length > 0 ?
      Math.round(top5TotalHPLeft / top5Characters.length) : 0;
    team.top5AvgTags = top5Characters.length > 0 ?
      Math.round((top5TotalTags / top5Characters.length) * 10) / 10 : 0;
    team.top5TotalTags = top5TotalTags;
    
    // Store top 5 character names for UI highlighting
    team.top5CharacterNames = top5Characters.map(c => c.name);
    
    // Convert set to count for UI display
    team.uniqueCharactersUsed = team.charactersUsed.size;
    team.charactersUsed = Array.from(team.charactersUsed);
    
    return team;
  }).sort((a, b) => {
    // Primary sort: Win rate (descending)
    if (b.winRate !== a.winRate) return b.winRate - a.winRate;
    // Secondary sort: Total matches (descending, more experienced teams ranked higher)
    if (b.matches !== a.matches) return b.matches - a.matches;
    // Tertiary sort: Damage efficiency (descending)
    const aEfficiency = a.totalDamageTaken > 0 ? a.totalDamageDealt / a.totalDamageTaken : a.totalDamageDealt;
    const bEfficiency = b.totalDamageTaken > 0 ? b.totalDamageDealt / b.totalDamageTaken : b.totalDamageDealt;
    return bEfficiency - aEfficiency;
  });
}

function getTeamStats(teamRecords, charMap, capsuleMap = {}, aiStrategiesMap = {}) {
  let totalDamage = 0, totalTaken = 0, totalHealth = 0, totalHPGaugeValueMax = 0, totalSpecial = 0, totalUltimates = 0, totalSkills = 0, totalBattleTime = 0;
  teamRecords.forEach(char => {
    const stats = extractStats(char, charMap, capsuleMap, null, aiStrategiesMap); // No position for team aggregation
    totalDamage += stats.damageDone;
    totalTaken += stats.damageTaken;
    totalHealth += stats.hPGaugeValue;
    totalHPGaugeValueMax += stats.hPGaugeValueMax;
    totalSpecial += stats.specialMovesUsed;
    totalUltimates += stats.ultimatesUsed;
    totalSkills += stats.skillsUsed;
    totalBattleTime += stats.battleTime || 0;
  });
  return { totalDamage, totalTaken, totalHealth, totalHPGaugeValueMax, totalSpecial, totalUltimates, totalSkills, totalBattleTime };
}

export default function App() {
  const [mode, setMode] = useState('reference');
  const [selectedFilePath, setSelectedFilePath] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState(null);
  // Separate state for the header match-analysis selector so we don't override global fileContent
  const [analysisSelectedFilePath, setAnalysisSelectedFilePath] = useState(null);
  const [analysisFileContent, setAnalysisFileContent] = useState(null);
  const [viewType, setViewType] = useState('single');
  const [manualFiles, setManualFiles] = useState([]);
  const [expandedRows, setExpandedRows] = useState({}); // Expanded state for character rows
  const [expandedPositions, setExpandedPositions] = useState({}); // Expanded state for position accordions in matchups
  const [expandedCharacters, setExpandedCharacters] = useState({}); // Expanded state for individual character cards in matchups
  const [selectedBuildIndex, setSelectedBuildIndex] = useState({}); // Track selected build index per character
  const [sectionCollapsed, setSectionCollapsed] = useState({
    aggregated: false,
    position: false
  }); // Collapsed state for major sections
  const [uploadedFilesCollapsed, setUploadedFilesCollapsed] = useState(false); // Collapsed state for uploaded files list
  const [filtersCollapsed, setFiltersCollapsed] = useState(false); // Collapsed state for aggregated character filters panel
  const [darkMode, setDarkMode] = useState(true); // Dark mode state - default to true
  
  // Search and filter state for Aggregated Character Performance
  const [selectedCharacters, setSelectedCharacters] = useState([]);
  // Old combobox state variables removed - now using Combobox component
  const [performanceFilters, setPerformanceFilters] = useState(['excellent', 'good', 'average', 'below', 'poor']);
  const [minMatches, setMinMatches] = useState(1);
  const [maxMatches, setMaxMatches] = useState(999);
  const [sortBy, setSortBy] = useState('combatScore');
  const [sortDirection, setSortDirection] = useState('desc');
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [selectedAIStrategies, setSelectedAIStrategies] = useState([]);

  const charMap = useMemo(() => parseCharacterCSV(charactersCSV), []);
  const capsuleInfo = useMemo(() => loadCapsuleData(capsulesCSV), []);
  const capsuleMap = capsuleInfo.capsuleMap;
  // Convert AI strategies array to map for efficient lookup by ID
  const aiStrategies = useMemo(() => {
    const map = {};
    if (capsuleInfo.aiStrategies && Array.isArray(capsuleInfo.aiStrategies)) {
      capsuleInfo.aiStrategies.forEach(strategy => {
        if (strategy.id) {
          map[strategy.id] = strategy;
        }
      });
    }
    return map;
  }, [capsuleInfo.aiStrategies]);


  // Aggregated data for reference mode (single file only)
  const aggregatedData = useMemo(() => {
    if (mode === 'reference' && (viewType === 'aggregated' || viewType === 'meta' || viewType === 'tables') && fileContent) {
      // If fileContent is an array, use as is; if single file, wrap in array
      const filesArr = Array.isArray(fileContent)
        ? fileContent
        : fileContent.error ? [] : [{ name: selectedFilePath ? selectedFilePath.join(' / ') : 'Selected File', content: fileContent }];
      return getAggregatedCharacterData(filesArr, charMap, capsuleMap, aiStrategies);
    } else if (mode === 'manual' && (viewType === 'aggregated' || viewType === 'meta' || viewType === 'tables') && manualFiles.length > 0) {
      return getAggregatedCharacterData(manualFiles, charMap, capsuleMap, aiStrategies);
    }
    return [];
  }, [mode, viewType, charMap, capsuleMap, aiStrategies, manualFiles, fileContent, selectedFilePath]);

  // Position-based data for advanced analysis (single file only)
  const positionData = useMemo(() => {
    if (mode === 'reference' && (viewType === 'aggregated' || viewType === 'meta' || viewType === 'tables') && fileContent) {
      const filesArr = Array.isArray(fileContent)
        ? fileContent
        : fileContent.error ? [] : [{ name: selectedFilePath ? selectedFilePath.join(' / ') : 'Selected File', content: fileContent }];
      return getPositionBasedData(filesArr, charMap, capsuleMap);
    } else if (mode === 'manual' && (viewType === 'aggregated' || viewType === 'meta' || viewType === 'tables') && manualFiles.length > 0) {
      return getPositionBasedData(manualFiles, charMap, capsuleMap);
    }
    return {};
  }, [mode, viewType, charMap, capsuleMap, manualFiles, fileContent, selectedFilePath]);

  // Team aggregated data for team rankings
  const teamAggregatedData = useMemo(() => {
    if (mode === 'reference' && (viewType === 'aggregated' || viewType === 'meta' || viewType === 'tables' || viewType === 'teams') && fileContent) {
      const filesArr = Array.isArray(fileContent)
        ? fileContent
        : fileContent.error ? [] : [{ name: selectedFilePath ? selectedFilePath.join(' / ') : 'Selected File', content: fileContent }];
      return getTeamAggregatedData(filesArr, charMap, capsuleMap, aiStrategies);
    } else if (mode === 'manual' && (viewType === 'aggregated' || viewType === 'meta' || viewType === 'tables' || viewType === 'teams') && manualFiles.length > 0) {
      return getTeamAggregatedData(manualFiles, charMap, capsuleMap, aiStrategies);
    }
    return [];
  }, [mode, viewType, charMap, capsuleMap, aiStrategies, manualFiles, fileContent, selectedFilePath]);

  // Filtered and sorted aggregated data based on search and filters
  const filteredAggregatedData = useMemo(() => {
    if (!Array.isArray(aggregatedData)) return [];
    
    let filtered = aggregatedData.map(char => {
      // Filter matches based on team and AI strategy filters
      let filteredMatches = [...char.matches];
      
      // Apply team filter to matches
      if (selectedTeams.length > 0) {
        filteredMatches = filteredMatches.filter(match => 
          match.team && selectedTeams.includes(match.team)
        );
      }
      
      // Apply AI strategy filter to matches
      if (selectedAIStrategies.length > 0) {
        filteredMatches = filteredMatches.filter(match => 
          match.aiStrategy && selectedAIStrategies.includes(match.aiStrategy)
        );
      }
      
      // If no matches remain after filtering, return null to filter out later
      if (filteredMatches.length === 0) {
        return null;
      }
      
      // Filter to only active matches for stat calculations (matching main aggregation logic)
      const matchCount = filteredMatches.length;
      const activeMatches = filteredMatches.filter(m => m.battleTime && m.battleTime > 0);
      const activeMatchCount = activeMatches.length;
      
      // Recalculate stats based on ACTIVE filtered matches only
      const totalDamage = activeMatches.reduce((sum, m) => sum + m.damageDone, 0);
      const totalTaken = activeMatches.reduce((sum, m) => sum + m.damageTaken, 0);
      const totalHealth = activeMatches.reduce((sum, m) => sum + m.hPGaugeValue, 0);
      const totalBattleTime = activeMatches.reduce((sum, m) => sum + m.battleTime, 0);
      const totalHPGaugeValueMax = activeMatches.reduce((sum, m) => sum + m.hPGaugeValueMax, 0);
      const totalSpecial = filteredMatches.reduce((sum, m) => sum + (m.specialMovesUsed || 0), 0);
      const totalUltimates = filteredMatches.reduce((sum, m) => sum + (m.ultimatesUsed || 0), 0);
      const totalSkills = filteredMatches.reduce((sum, m) => sum + (m.skillsUsed || 0), 0);
      const totalKills = filteredMatches.reduce((sum, m) => sum + (m.kills || 0), 0);
      const totalSparking = filteredMatches.reduce((sum, m) => sum + (m.sparkingCount || 0), 0);
      const totalCharges = filteredMatches.reduce((sum, m) => sum + (m.chargeCount || 0), 0);
      const totalGuards = filteredMatches.reduce((sum, m) => sum + (m.guardCount || 0), 0);
      const totalEnergyBlasts = filteredMatches.reduce((sum, m) => sum + (m.shotEnergyBulletCount || 0), 0);
      const totalZCounters = filteredMatches.reduce((sum, m) => sum + (m.zCounterCount || 0), 0);
      const totalSuperCounters = filteredMatches.reduce((sum, m) => sum + (m.superCounterCount || 0), 0);
      const totalRevengeCounters = filteredMatches.reduce((sum, m) => sum + (m.revengeCounterCount || 0), 0);
      const totalTags = filteredMatches.reduce((sum, m) => sum + (m.tags || 0), 0);
      const maxComboNumTotal = filteredMatches.reduce((sum, m) => sum + (m.maxComboNum || 0), 0);
      const maxComboDamageTotal = filteredMatches.reduce((sum, m) => sum + (m.maxComboDamage || 0), 0);
      
      // Special Abilities - NEW blast tracking
      const totalS1Blast = filteredMatches.reduce((sum, m) => sum + (m.s1Blast || 0), 0);
      const totalS2Blast = filteredMatches.reduce((sum, m) => sum + (m.s2Blast || 0), 0);
      const totalUltBlast = filteredMatches.reduce((sum, m) => sum + (m.ultBlast || 0), 0);
      const totalS1HitBlast = filteredMatches.reduce((sum, m) => sum + (m.s1HitBlast || 0), 0);
      const totalS2HitBlast = filteredMatches.reduce((sum, m) => sum + (m.s2HitBlast || 0), 0);
      const totalULTHitBlast = filteredMatches.reduce((sum, m) => sum + (m.uLTHitBlast || 0), 0);
      // Track separately for hit rate calculation (only matches with hasAdditionalCounts would have accurate data)
      let totalS1BlastTrackable = 0;
      let totalS2BlastTrackable = 0;
      let totalUltBlastTrackable = 0;
      filteredMatches.forEach(m => {
        // Only count trackable if match has the new format data
        if (m.s1HitRate !== undefined || m.s2HitRate !== undefined || m.ultHitRate !== undefined) {
          totalS1BlastTrackable += (m.s1Blast || 0);
          totalS2BlastTrackable += (m.s2Blast || 0);
          totalUltBlastTrackable += (m.ultBlast || 0);
        }
      });
      
      // Legacy blast tracking
      const totalEXA1 = filteredMatches.reduce((sum, m) => sum + (m.exa1Count || 0), 0);
      const totalEXA2 = filteredMatches.reduce((sum, m) => sum + (m.exa2Count || 0), 0);
      const totalDragonDashMileage = filteredMatches.reduce((sum, m) => sum + (m.dragonDashMileage || 0), 0);
      
      // Combat Performance
      const totalThrows = filteredMatches.reduce((sum, m) => sum + (m.throwCount || 0), 0);
      const totalLightningAttacks = filteredMatches.reduce((sum, m) => sum + (m.lightningAttackCount || 0), 0);
      const totalVanishingAttacks = filteredMatches.reduce((sum, m) => sum + (m.vanishingAttackCount || 0), 0);
      const totalDragonHoming = filteredMatches.reduce((sum, m) => sum + (m.dragonHomingCount || 0), 0);
      const totalSpeedImpacts = filteredMatches.reduce((sum, m) => sum + (m.speedImpactCount || 0), 0);
      const totalSpeedImpactWins = filteredMatches.reduce((sum, m) => sum + (m.speedImpactWins || 0), 0);
      const totalSparkingCombo = filteredMatches.reduce((sum, m) => sum + (m.sparkingComboCount || 0), 0);
  const denom = activeMatchCount > 0 ? activeMatchCount : matchCount;
      
      // Calculate survival count from filtered matches (only count if survived AND participated)
      const survivalCount = filteredMatches.filter(m => m.hPGaugeValue > 0 && m.battleTime > 0).length;
      const survivalRate = Math.round((survivalCount / Math.max(denom, 1)) * 1000) / 10;
      
      // Recalculate teams and AI strategies used from filtered matches
      const teamsUsed = {};
      const aiStrategiesUsed = {};
      filteredMatches.forEach(match => {
        if (match.team) {
          teamsUsed[match.team] = (teamsUsed[match.team] || 0) + 1;
        }
        if (match.aiStrategy) {
          aiStrategiesUsed[match.aiStrategy] = (aiStrategiesUsed[match.aiStrategy] || 0) + 1;
        }
      });
      
      const teamsArray = Object.keys(teamsUsed);
      const aiStrategiesArray = Object.keys(aiStrategiesUsed);
      const primaryTeam = teamsArray.length > 0 
        ? teamsArray.reduce((a, b) => teamsUsed[a] > teamsUsed[b] ? a : b)
        : null;
      const primaryAIStrategy = aiStrategiesArray.length > 0
        ? aiStrategiesArray.reduce((a, b) => aiStrategiesUsed[a] > aiStrategiesUsed[b] ? a : b)
        : null;
      
  // Calculate averages (use denom which prefers active matches if present)
  const avgDamage = Math.round(totalDamage / Math.max(denom, 1));
  const avgTaken = Math.round(totalTaken / Math.max(denom, 1));
  const avgHealth = Math.round(totalHealth / Math.max(denom, 1));
  const avgBattleTime = Math.round((totalBattleTime / Math.max(denom, 1)) * 10) / 10;
  const avgHPGaugeValueMax = Math.round(totalHPGaugeValueMax / Math.max(denom, 1));
  const avgSpecial = Math.round((totalSpecial / Math.max(denom, 1)) * 10) / 10;
  const avgUltimates = Math.round((totalUltimates / Math.max(denom, 1)) * 10) / 10;
  const avgSkills = Math.round((totalSkills / Math.max(denom, 1)) * 10) / 10;
  const avgKills = Math.round((totalKills / Math.max(denom, 1)) * 10) / 10;
  const avgSparking = Math.round((totalSparking / Math.max(denom, 1)) * 10) / 10;
  const avgCharges = Math.round((totalCharges / Math.max(denom, 1)) * 10) / 10;
  const avgGuards = Math.round((totalGuards / Math.max(denom, 1)) * 10) / 10;
  const avgEnergyBlasts = Math.round((totalEnergyBlasts / Math.max(denom, 1)) * 10) / 10;
  const avgZCounters = Math.round((totalZCounters / Math.max(denom, 1)) * 10) / 10;
  const avgSuperCounters = Math.round((totalSuperCounters / Math.max(denom, 1)) * 10) / 10;
  const avgRevengeCounters = Math.round((totalRevengeCounters / Math.max(denom, 1)) * 10) / 10;
  const avgTags = Math.round((totalTags / Math.max(denom, 1)) * 10) / 10;
  const avgMaxCombo = Math.round((maxComboNumTotal / Math.max(denom, 1)) * 10) / 10;
  const avgMaxComboDamage = Math.round(maxComboDamageTotal / Math.max(denom, 1));
  
  // Special Abilities - NEW blast tracking averages
  const avgS1Blast = Math.round((totalS1Blast / Math.max(denom, 1)) * 10) / 10;
  const avgS2Blast = Math.round((totalS2Blast / Math.max(denom, 1)) * 10) / 10;
  const avgUltBlast = Math.round((totalUltBlast / Math.max(denom, 1)) * 10) / 10;
  const avgS1Hit = Math.round((totalS1HitBlast / Math.max(denom, 1)) * 10) / 10;
  const avgS2Hit = Math.round((totalS2HitBlast / Math.max(denom, 1)) * 10) / 10;
  const avgUltHit = Math.round((totalULTHitBlast / Math.max(denom, 1)) * 10) / 10;
  // Hit rates (overall across all filtered matches)
  const s1HitRateOverall = totalS1BlastTrackable > 0 ? Math.round((totalS1HitBlast / totalS1BlastTrackable) * 1000) / 10 : null;
  const s2HitRateOverall = totalS2BlastTrackable > 0 ? Math.round((totalS2HitBlast / totalS2BlastTrackable) * 1000) / 10 : null;
  const ultHitRateOverall = totalUltBlastTrackable > 0 ? Math.round((totalULTHitBlast / totalUltBlastTrackable) * 1000) / 10 : null;
  
  // Special Abilities - Legacy blast tracking (for backwards compatibility)
  const avgSPM1 = avgS1Blast; // Same as avgS1Blast
  const avgSPM2 = avgS2Blast; // Same as avgS2Blast
  const avgEXA1 = Math.round((totalEXA1 / Math.max(denom, 1)) * 10) / 10;
  const avgEXA2 = Math.round((totalEXA2 / Math.max(denom, 1)) * 10) / 10;
  const avgDragonDashMileage = Math.round((totalDragonDashMileage / Math.max(denom, 1)) * 10) / 10;
  
  // Combat Performance averages
  const avgThrows = Math.round((totalThrows / Math.max(denom, 1)) * 10) / 10;
  const avgLightningAttacks = Math.round((totalLightningAttacks / Math.max(denom, 1)) * 10) / 10;
  const avgVanishingAttacks = Math.round((totalVanishingAttacks / Math.max(denom, 1)) * 10) / 10;
  const avgDragonHoming = Math.round((totalDragonHoming / Math.max(denom, 1)) * 10) / 10;
  const avgSpeedImpacts = Math.round((totalSpeedImpacts / Math.max(denom, 1)) * 10) / 10;
  const avgSpeedImpactWins = Math.round((totalSpeedImpactWins / Math.max(denom, 1)) * 10) / 10;
  const avgSparkingCombo = Math.round((totalSparkingCombo / Math.max(denom, 1)) * 10) / 10;
  
  // Calculate win/loss stats
  const totalWins = filteredMatches.filter(m => m.won).length;
  const totalLosses = filteredMatches.filter(m => !m.won).length;
  const winRate = activeMatches.length > 0 
    ? Math.round((activeMatches.filter(m => m.won).length / activeMatches.length) * 1000) / 10 
    : (filteredMatches.length > 0 ? Math.round((totalWins / filteredMatches.length) * 1000) / 10 : 0);
  
  // Calculate speed impact win rate
  const speedImpactWinRate = totalSpeedImpacts > 0 
    ? Math.round((totalSpeedImpactWins / totalSpeedImpacts) * 1000) / 10 
    : 0;
      
      // Calculate DPS and efficiency - use totals for DPS and efficiency
      const dps = totalBattleTime > 0 ? totalDamage / totalBattleTime : 0;
      const efficiency = totalTaken > 0 ? totalDamage / totalTaken : 0;
      const healthRetention = avgHPGaugeValueMax > 0 ? avgHealth / avgHPGaugeValueMax : 0;
      
      // Recalculate combat performance score using consistent formula
      const baseScore = (
        (avgDamage / 100000) * 35 +        // Damage dealt weight: 35%
        (efficiency) * 25 +                 // Damage efficiency weight: 25%
        (dps / 1000) * 25 +                 // Damage per second weight: 25%
        (healthRetention) * 15              // Health retention weight: 15%
      );
      
  // Experience multiplier based on matches played; prefer active matches for weighting
  const experienceMultiplier = Math.min(1.25, 1.0 + ((activeMatchCount > 0 ? activeMatchCount : matchCount) - 1) * (0.25 / 11));
      const combatPerformanceScore = Math.round((baseScore * experienceMultiplier) * 100) / 100;
      
      // Recalculate top 3 most used builds based on FILTERED matches
      const buildGroups = {};
      
      // Group filtered matches by build composition label
      filteredMatches.forEach(match => {
        if (match.buildComposition && match.buildComposition.label) {
          const buildLabel = match.buildComposition.label;
          
          if (!buildGroups[buildLabel]) {
            buildGroups[buildLabel] = {
              buildComposition: match.buildComposition,
              aiStrategy: match.aiStrategy || null,
              equippedCapsules: match.equippedCapsules || [],
              totalCapsuleCost: match.totalCapsuleCost || 0,
              count: 0,
              activeCount: 0,
              totalDamageDealt: 0,
              totalDamageTaken: 0,
              totalBattleDuration: 0,
              totalHealthRemaining: 0,
              totalHealthMax: 0
            };
          }
          
          buildGroups[buildLabel].count++;
          // Only count as active if battleTime > 0
          if (match.battleTime && match.battleTime > 0) {
            buildGroups[buildLabel].activeCount++;
            buildGroups[buildLabel].totalBattleDuration += match.battleTime;
            // Only accumulate stats for active matches
            buildGroups[buildLabel].totalDamageDealt += match.damageDone || 0;
            buildGroups[buildLabel].totalDamageTaken += match.damageTaken || 0;
            buildGroups[buildLabel].totalHealthRemaining += match.hPGaugeValue || 0;
            buildGroups[buildLabel].totalHealthMax += match.hPGaugeValueMax || 0;
          }
        }
      });
      
      // Calculate performance score for each build and sort
      const sortedBuilds = Object.values(buildGroups)
        .filter(build => build.activeCount > 0) // Only include builds with active matches
        .map(build => {
          // Use activeCount for averages (non-zero battleTime), fallback to count
          const denominator = build.activeCount > 0 ? build.activeCount : build.count;
          // Round averages to match character-level calculation precision
          const avgDamageDealt = Math.round(build.totalDamageDealt / denominator);
          const avgDamageTaken = Math.round(build.totalDamageTaken / denominator);
          const avgBattleDuration = Math.round((build.totalBattleDuration / (build.activeCount > 0 ? build.activeCount : 1)) * 10) / 10;
          const avgHealthRemaining = Math.round(build.totalHealthRemaining / denominator);
          const avgHealthMax = Math.round(build.totalHealthMax / denominator);
          
          // Calculate derived stats (use totals, not rounded averages, for accuracy)
          const damageEfficiency = build.totalDamageTaken > 0 
            ? build.totalDamageDealt / build.totalDamageTaken 
            : build.totalDamageDealt;
          const damagePerSecond = build.totalBattleDuration > 0 
            ? build.totalDamageDealt / build.totalBattleDuration 
            : 0;
          const healthRetention = avgHealthMax > 0 ? avgHealthRemaining / avgHealthMax : 0;
          
          // Calculate base score using same formula as character performance
          const baseScore = (
            (avgDamageDealt / 100000) * 35 +        // Damage dealt weight: 35%
            (damageEfficiency) * 25 +                // Damage efficiency weight: 25%
            (damagePerSecond / 1000) * 25 +          // Damage per second weight: 25%
            (healthRetention) * 15                   // Health retention weight: 15%
          );
          
          // Apply experience multiplier
          const experienceMultiplier = Math.min(1.25, 1.0 + ((build.activeCount > 0 ? build.activeCount : build.count) - 1) * (0.25 / 11));
          const performanceScore = Math.round((baseScore * experienceMultiplier) * 100) / 100;
          
          return {
            ...build,
            avgPerformanceScore: performanceScore
          };
        })
        .sort((a, b) => {
          // Primary sort: by usage count (descending)
          if (b.count !== a.count) return b.count - a.count;
          // Tie-breaker: by average performance score (descending)
          return b.avgPerformanceScore - a.avgPerformanceScore;
        });
      
      // Get top 3 most used builds from filtered data
      const topBuilds = sortedBuilds.slice(0, 3);
      
      // Recalculate form stats from FILTERED matches
      const formStatsMap = {};
      const allFormsUsedFiltered = new Set();
      
      filteredMatches.forEach(match => {
        // Track all forms from filtered matches
        if (match.formChangeHistory && match.formChangeHistory !== '—') {
          // Extract form IDs from the formatted string if needed
          // The formChangeHistory could be stored as a formatted string
          // We need the actual formId data which is in perFormStats
        }
        
        // Aggregate per-form stats from this match
        if (match.perFormStats && Array.isArray(match.perFormStats)) {
          match.perFormStats.forEach(formStat => {
            const formId = formStat.formId;
            
            // Track this form as used
            allFormsUsedFiltered.add(formId);
            
            if (!formStatsMap[formId]) {
              formStatsMap[formId] = {
                formId: formId,
                formNumber: formStat.formNumber,
                name: formStat.name || charMap[formId] || formId,
                isFirstForm: formStat.isFirstForm,
                isFinalForm: formStat.isFinalForm,
                // Combat stats
                totalDamageDone: 0,
                totalDamageTaken: 0,
                totalBattleTime: 0,
                totalBattleCount: 0,
                // Health
                totalHPRemaining: 0,
                totalHPMax: 0,
                // Special abilities
                totalSpecialMoves: 0,
                totalUltimates: 0,
                totalSkills: 0,
                // Blast tracking
                totalS1Blast: 0,
                totalS2Blast: 0,
                totalUltBlast: 0,
                totalS1HitBlast: 0,
                totalS2HitBlast: 0,
                totalULTHitBlast: 0,
                // Survival & Defense
                totalSparking: 0,
                totalCharges: 0,
                totalGuards: 0,
                totalEnergyBlasts: 0,
                totalZCounters: 0,
                totalSuperCounters: 0,
                totalRevengeCounters: 0,
                // Combat mechanics
                totalMaxComboNum: 0,
                totalMaxComboDamage: 0,
                totalThrows: 0,
                totalLightningAttacks: 0,
                totalVanishingAttacks: 0,
                totalDragonHoming: 0,
                totalSpeedImpacts: 0,
                totalSpeedImpactWins: 0,
                totalSparkingCombo: 0,
                totalDragonDashMileage: 0,
                // Kills
                totalKills: 0,
                matchCount: 0
              };
            }
            
            const formData = formStatsMap[formId];
            
            // Accumulate stats for this form
            formData.totalDamageDone += formStat.damageDone || 0;
            formData.totalDamageTaken += formStat.damageTaken || 0;
            formData.totalBattleTime += formStat.battleTime || 0;
            formData.totalBattleCount += formStat.battleCount || 0;
            formData.totalHPRemaining += formStat.hPGaugeValue || 0;
            formData.totalHPMax += formStat.hPGaugeValueMax || 0;
            formData.totalSpecialMoves += formStat.specialMovesUsed || 0;
            formData.totalUltimates += formStat.ultimatesUsed || 0;
            formData.totalSkills += formStat.skillsUsed || 0;
            formData.totalS1Blast += formStat.s1Blast || 0;
            formData.totalS2Blast += formStat.s2Blast || 0;
            formData.totalUltBlast += formStat.ultBlast || 0;
            formData.totalS1HitBlast += formStat.s1HitBlast || 0;
            formData.totalS2HitBlast += formStat.s2HitBlast || 0;
            formData.totalULTHitBlast += formStat.uLTHitBlast || 0;
            formData.totalSparking += formStat.sparkingCount || 0;
            formData.totalCharges += formStat.chargeCount || 0;
            formData.totalGuards += formStat.guardCount || 0;
            formData.totalEnergyBlasts += formStat.shotEnergyBulletCount || 0;
            formData.totalZCounters += formStat.zCounterCount || 0;
            formData.totalSuperCounters += formStat.superCounterCount || 0;
            formData.totalRevengeCounters += formStat.revengeCounterCount || 0;
            formData.totalMaxComboNum += formStat.maxComboNum || 0;
            formData.totalMaxComboDamage += formStat.maxComboDamage || 0;
            formData.totalThrows += formStat.throwCount || 0;
            formData.totalLightningAttacks += formStat.lightningAttackCount || 0;
            formData.totalVanishingAttacks += formStat.vanishingAttackCount || 0;
            formData.totalDragonHoming += formStat.dragonHomingCount || 0;
            formData.totalSpeedImpacts += formStat.speedImpactCount || 0;
            formData.totalSpeedImpactWins += formStat.speedImpactWins || 0;
            formData.totalSparkingCombo += formStat.sparkingComboCount || 0;
            formData.totalDragonDashMileage += formStat.dragonDashMileage || 0;
            formData.totalKills += formStat.kills || 0;
            formData.matchCount += 1;
          });
        }
      });
      
      // Calculate averages and format form stats array
      const formStatsArray = Object.values(formStatsMap).map(formStat => {
        const matchCount = formStat.matchCount || 1;
        const damagePerSecond = (formStat.totalBattleTime || 0) > 0 
          ? (formStat.totalDamageDone || 0) / formStat.totalBattleTime 
          : 0;
        const damageEfficiency = (formStat.totalDamageTaken || 0) > 0
          ? (formStat.totalDamageDone || 0) / formStat.totalDamageTaken
          : ((formStat.totalDamageDone || 0) > 0 ? 999 : 0);
        
        return {
          ...formStat,
          // Averages
          avgDamageDone: Math.round((formStat.totalDamageDone || 0) / matchCount),
          avgDamageTaken: Math.round((formStat.totalDamageTaken || 0) / matchCount),
          avgBattleTime: Math.round(((formStat.totalBattleTime || 0) / matchCount) * 10) / 10,
          avgBattleCount: Math.round(((formStat.totalBattleCount || 0) / matchCount) * 10) / 10,
          avgHPRemaining: Math.round((formStat.totalHPRemaining || 0) / matchCount),
          avgHPMax: Math.round((formStat.totalHPMax || 0) / matchCount),
          avgSpecialMoves: Math.round(((formStat.totalSpecialMoves || 0) / matchCount) * 10) / 10,
          avgUltimates: Math.round(((formStat.totalUltimates || 0) / matchCount) * 10) / 10,
          avgSkills: Math.round(((formStat.totalSkills || 0) / matchCount) * 10) / 10,
          avgS1Blast: Math.round(((formStat.totalS1Blast || 0) / matchCount) * 10) / 10,
          avgS2Blast: Math.round(((formStat.totalS2Blast || 0) / matchCount) * 10) / 10,
          avgUltBlast: Math.round(((formStat.totalUltBlast || 0) / matchCount) * 10) / 10,
          avgS1HitBlast: Math.round(((formStat.totalS1HitBlast || 0) / matchCount) * 10) / 10,
          avgS2HitBlast: Math.round(((formStat.totalS2HitBlast || 0) / matchCount) * 10) / 10,
          avgULTHitBlast: Math.round(((formStat.totalULTHitBlast || 0) / matchCount) * 10) / 10,
          avgSparking: Math.round(((formStat.totalSparking || 0) / matchCount) * 10) / 10,
          avgCharges: Math.round(((formStat.totalCharges || 0) / matchCount) * 10) / 10,
          avgGuards: Math.round(((formStat.totalGuards || 0) / matchCount) * 10) / 10,
          avgEnergyBlasts: Math.round(((formStat.totalEnergyBlasts || 0) / matchCount) * 10) / 10,
          avgZCounters: Math.round(((formStat.totalZCounters || 0) / matchCount) * 10) / 10,
          avgSuperCounters: Math.round(((formStat.totalSuperCounters || 0) / matchCount) * 10) / 10,
          avgRevengeCounters: Math.round(((formStat.totalRevengeCounters || 0) / matchCount) * 10) / 10,
          avgMaxComboNum: Math.round(((formStat.totalMaxComboNum || 0) / matchCount) * 10) / 10,
          avgMaxComboDamage: Math.round((formStat.totalMaxComboDamage || 0) / matchCount),
          avgThrows: Math.round(((formStat.totalThrows || 0) / matchCount) * 10) / 10,
          avgLightningAttacks: Math.round(((formStat.totalLightningAttacks || 0) / matchCount) * 10) / 10,
          avgVanishingAttacks: Math.round(((formStat.totalVanishingAttacks || 0) / matchCount) * 10) / 10,
          avgDragonHoming: Math.round(((formStat.totalDragonHoming || 0) / matchCount) * 10) / 10,
          avgSpeedImpacts: Math.round(((formStat.totalSpeedImpacts || 0) / matchCount) * 10) / 10,
          avgSpeedImpactWins: Math.round(((formStat.totalSpeedImpactWins || 0) / matchCount) * 10) / 10,
          avgSparkingCombo: Math.round(((formStat.totalSparkingCombo || 0) / matchCount) * 10) / 10,
          avgDragonDashMileage: Math.round(((formStat.totalDragonDashMileage || 0) / matchCount) * 10) / 10,
          avgKills: Math.round(((formStat.totalKills || 0) / matchCount) * 10) / 10,
          // Calculated stats
          damagePerSecond: Math.round(damagePerSecond * 10) / 10,
          damageEfficiency: Math.round(damageEfficiency * 100) / 100,
          // Hit rates
          s1HitRate: (formStat.totalS1Blast || 0) > 0
            ? Math.round(((formStat.totalS1HitBlast || 0) / formStat.totalS1Blast) * 1000) / 10
            : null,
          s2HitRate: (formStat.totalS2Blast || 0) > 0
            ? Math.round(((formStat.totalS2HitBlast || 0) / formStat.totalS2Blast) * 1000) / 10
            : null,
          ultHitRate: (formStat.totalUltBlast || 0) > 0
            ? Math.round(((formStat.totalULTHitBlast || 0) / formStat.totalUltBlast) * 1000) / 10
            : null,
          speedImpactWinRate: (formStat.totalSpeedImpacts || 0) > 0
            ? Math.round(((formStat.totalSpeedImpactWins || 0) / formStat.totalSpeedImpacts) * 1000) / 10
            : null,
        };
      });
      
      // Generate form history from filtered forms
      const allFormsFiltered = Array.from(allFormsUsedFiltered);
      const formHistory = allFormsFiltered.length > 1 
        ? allFormsFiltered.map(f => charMap[f] || f).join(', ') 
        : '';
      const hasMultipleForms = allFormsFiltered.length > 1;
      
      return {
        ...char,
        matchCount,
        activeMatchCount,
        totalDamage,
        totalTaken,
        totalHealth,
        totalBattleTime,
        totalHPGaugeValueMax,
        totalSpecial,
        totalUltimates,
        totalSkills,
        totalKills,
        totalSparking,
        totalCharges,
        totalGuards,
        totalEnergyBlasts,
        totalZCounters,
        totalSuperCounters,
        totalRevengeCounters,
        totalTags,
        totalS1Blast,
        totalS2Blast,
        totalUltBlast,
        totalS1HitBlast,
        totalS2HitBlast,
        totalULTHitBlast,
        totalS1BlastTrackable,
        totalS2BlastTrackable,
        totalUltBlastTrackable,
        totalEXA1,
        totalEXA2,
        totalDragonDashMileage,
        totalThrows,
        totalLightningAttacks,
        totalVanishingAttacks,
        totalDragonHoming,
        totalSpeedImpacts,
        totalSpeedImpactWins,
        totalSparkingCombo,
        maxComboNumTotal,
        maxComboDamageTotal,
        avgDamage,
        avgTaken,
        avgHealth,
        avgBattleTime,
        avgHPGaugeValueMax,
        avgSpecial,
        avgUltimates,
        avgSkills,
        avgKills,
        avgSparking,
        avgCharges,
        avgGuards,
        avgEnergyBlasts,
        avgZCounters,
        avgSuperCounters,
        avgRevengeCounters,
        avgTags,
        avgMaxCombo,
        avgMaxComboDamage,
        avgS1Blast,
        avgS2Blast,
        avgUltBlast,
        avgS1Hit,
        avgS2Hit,
        avgUltHit,
        s1HitRateOverall,
        s2HitRateOverall,
        ultHitRateOverall,
        avgSPM1,
        avgSPM2,
        avgEXA1,
        avgEXA2,
        avgDragonDashMileage,
        avgThrows,
        avgLightningAttacks,
        avgVanishingAttacks,
        avgDragonHoming,
        avgSpeedImpacts,
        avgSpeedImpactWins,
        avgSparkingCombo,
        dps,
        efficiency,
        survivalRate,
        combatPerformanceScore,
        wins: totalWins,
        losses: totalLosses,
        winRate: winRate,
        speedImpactWinRate: speedImpactWinRate,
        teamsUsed: teamsArray,
        aiStrategiesUsed: aiStrategiesArray,
        primaryTeam,
        primaryAIStrategy,
        topBuilds: topBuilds, // Recalculated based on filtered matches
        // Form stats - Recalculated based on filtered matches
        formStatsArray: formStatsArray,
        hasMultipleForms: hasMultipleForms,
        formHistory: formHistory,
        matches: filteredMatches
      };
    }).filter(char => char !== null); // Remove characters with no matching matches
    
    // Apply character filter
    if (selectedCharacters.length > 0) {
      filtered = filtered.filter(char => 
        selectedCharacters.includes(char.name)
      );
    }
    
    // Apply minimum/maximum matches filter (use activeMatchCount when available)
    filtered = filtered.filter(char => {
      const matchesForFilter = (char.activeMatchCount && char.activeMatchCount > 0) ? char.activeMatchCount : char.matchCount;
      return matchesForFilter >= minMatches && matchesForFilter <= maxMatches;
    });
    
    // Apply performance level filter
    if (performanceFilters.length > 0 && performanceFilters.length < 5) {
      const combatScores = filtered.map(c => c.combatPerformanceScore);
      filtered = filtered.filter(char => {
        const level = getPerformanceLevel(char.combatPerformanceScore, combatScores);
        return performanceFilters.includes(level);
      });
    }
    
    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      let aVal, bVal;
      switch(sortBy) {
        case 'combatScore':
          aVal = a.combatPerformanceScore;
          bVal = b.combatPerformanceScore;
          break;
        case 'totalDamage':
          aVal = a.totalDamage;
          bVal = b.totalDamage;
          break;
        case 'avgDamage':
          aVal = a.avgDamage;
          bVal = b.avgDamage;
          break;
        case 'dps':
          aVal = a.totalBattleTime > 0 ? a.totalDamage / a.totalBattleTime : 0;
          bVal = b.totalBattleTime > 0 ? b.totalDamage / b.totalBattleTime : 0;
          break;
        case 'efficiency':
          // Use the pre-calculated efficiency value (total-based)
          aVal = a.totalTaken > 0 ? a.totalDamage / a.totalTaken : 0;
          bVal = b.totalTaken > 0 ? b.totalDamage / b.totalTaken : 0;
          break;
        case 'matches':
          aVal = a.matchCount;
          bVal = b.matchCount;
          break;
        case 'name':
          return sortDirection === 'asc' 
            ? a.name.localeCompare(b.name) 
            : b.name.localeCompare(a.name);
        default:
          aVal = a.combatPerformanceScore;
          bVal = b.combatPerformanceScore;
      }
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
    
    return filtered;
  }, [aggregatedData, selectedCharacters, performanceFilters, minMatches, maxMatches, sortBy, sortDirection, selectedTeams, selectedAIStrategies]);

  // Extract unique teams and AI strategies from aggregated data
  const availableCharacters = useMemo(() => {
    return aggregatedData.map(char => char.name).sort();
  }, [aggregatedData]);
  
  const availableTeams = useMemo(() => {
    const teams = new Set();
    aggregatedData.forEach(char => {
      if (char.teamsUsed) {
        char.teamsUsed.forEach(team => teams.add(team));
      }
    });
    return Array.from(teams).sort();
  }, [aggregatedData]);

  const availableAIStrategies = useMemo(() => {
    const strategies = new Set();
    aggregatedData.forEach(char => {
      if (char.aiStrategiesUsed) {
        char.aiStrategiesUsed.forEach(ai => strategies.add(ai));
      }
    });
    return Array.from(strategies).sort();
  }, [aggregatedData]);

  // Helper to toggle expanded state
  const toggleRow = (teamType, idx) => {
    setExpandedRows(prev => ({ ...prev, [`${teamType}_${idx}`]: !prev[`${teamType}_${idx}`] }));
  };

  const handleSelect = (fileName) => {
    setSelectedFile(fileName);
    const fullPath = Object.keys(dataFiles).find((p) => p.endsWith(fileName));
    if (fullPath) {
      // Access the default export from Vite's import.meta.glob
      const moduleContent = dataFiles[fullPath];
      const actualContent = moduleContent.default || moduleContent;
      setFileContent(actualContent);
    } else {
      setFileContent({ error: 'File not found.' });
    }
    setExpandedRows({}); // Reset expanded state on file change
  };



  const processFiles = (files) => {
    Promise.all(files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const content = JSON.parse(e.target.result);
            resolve({ name: file.name, content });
          } catch (error) {
            resolve({ name: file.name, error: 'Invalid JSON file' });
          }
        };
        reader.readAsText(file);
      });
    })).then(results => {
      setManualFiles(results);
      // Automatically select the first valid file if only one file was uploaded
      const validFiles = results.filter(f => !f.error);
      if (validFiles.length === 1) {
        setFileContent(validFiles[0].content);
        setAnalysisFileContent(validFiles[0].content);
        setAnalysisSelectedFilePath([validFiles[0].name]);
        setSelectedFilePath([validFiles[0].name]);
        setViewType('single');
      } else if (validFiles.length > 1) {
        // For multiple files, keep fileContent as null initially
        // Users can select a view type (aggregated, teams, etc.) or select a specific file
        setFileContent(null);
        setAnalysisFileContent(null);
        setAnalysisSelectedFilePath(null);
        setSelectedFilePath(null);
      } else {
        setFileContent(null);
      }
      setExpandedRows({});
    });
  };

  const handleManualFileUpload = (event) => {
    const files = Array.from(event.target.files);
    processFiles(files);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const files = Array.from(event.dataTransfer.files).filter(file => 
      file.name.endsWith('.json')
    );
    if (files.length > 0) {
      processFiles(files);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setSelectedFile(null);
    setFileContent(null);
    setManualFiles([]);
    setViewType('single');
    setExpandedRows({});
  };

  const handleManualFileSelect = (fileName) => {
    const file = manualFiles.find(f => f.name === fileName);
    if (file && !file.error) {
      // Set the single file content for single match view
      setFileContent(file.content);
      // keep global selected path in sync for compatibility
      setSelectedFilePath([file.name]);
      // Also set analysis-specific state so the header/search-driven analysis area shows this file
      setAnalysisFileContent(file.content);
      setAnalysisSelectedFilePath([file.name]);
      // Automatically switch to single view when manually selecting a file
      setViewType('single');
    }
    setExpandedRows({});
  };

  // Handler used by the Match Analysis header combobox to switch which file is being shown
  const handleHeaderFileSelect = (fileName) => {
    if (!fileName) return;
    // Manual mode: pick from uploaded files
    if (mode === 'manual') {
      const file = manualFiles.find(f => f.name === fileName);
      if (file && !file.error) {
        // Only apply to the analysis area
        setAnalysisFileContent(file.content);
        setAnalysisSelectedFilePath([file.name]);
        setExpandedRows({});
      }
      return;
    }

    // Reference mode: fileContent may be an array of {name, content}
    if (Array.isArray(fileContent)) {
      const f = fileContent.find(x => x.name === fileName);
      if (f) {
        // In reference mode other parts of the app expect a plain file content for single view
        // Only apply to the analysis area
        setAnalysisFileContent(f.content || f);
        setAnalysisSelectedFilePath([f.name]);
        setExpandedRows({});
      }
    }
  };

  // Handler for Excel export
  const handleExcelExport = async () => {
    try {
      const characterData = prepareCharacterAveragesData(aggregatedData);
      const matchData = prepareMatchDetailsData(aggregatedData);
      
      const result = await exportToExcel(characterData, matchData, {
        filename: `DBSZ_Analysis_${new Date().toISOString().split('T')[0]}.xlsx`,
        includeCharacterAverages: true,
        includeMatchDetails: true,
        includeFormatting: true
      });
      
      if (result.success) {
        console.log('Excel export successful:', result.filename);
      } else {
        console.error('Excel export failed:', result.error);
        alert(`Export failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Export error:', error);
      alert(`Export failed: ${error.message}`);
    }
  };

  // Handler for Character Averages export only
  const handleCharacterAveragesExport = async () => {
    try {
      const characterData = prepareCharacterAveragesData(aggregatedData);
      
      const result = await exportToExcel(characterData, [], {
        filename: `Character_Averages_${new Date().toISOString().split('T')[0]}.xlsx`,
        includeCharacterAverages: true,
        includeMatchDetails: false,
        includeFormatting: true
      });
      
      if (result.success) {
        console.log('Character Averages export successful:', result.filename);
      } else {
        console.error('Export failed:', result.error);
        alert(`Export failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Export error:', error);
      alert(`Export failed: ${error.message}`);
    }
  };

  // Handler for Match Details export only
  const handleMatchDetailsExport = async () => {
    try {
      const matchData = prepareMatchDetailsData(aggregatedData);
      
      const result = await exportToExcel([], matchData, {
        filename: `Match_Details_${new Date().toISOString().split('T')[0]}.xlsx`,
        includeCharacterAverages: false,
        includeMatchDetails: true,
        includeFormatting: true
      });
      
      if (result.success) {
        console.log('Match Details export successful:', result.filename);
      } else {
        console.error('Export failed:', result.error);
        alert(`Export failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Export error:', error);
      alert(`Export failed: ${error.message}`);
    }
  };

  // Helper function to recursively search for BattleResults, TeamBattleResults, or battleWinLose in nested JSON
  const findBattleData = (obj, maxDepth = 5, currentDepth = 0) => {
    if (!obj || typeof obj !== 'object' || currentDepth >= maxDepth) {
      return null;
    }

    // Check if current object has TeamBattleResults (current BR_Data format)
    if (obj.TeamBattleResults && typeof obj.TeamBattleResults === 'object') {
      const teamBattleResults = obj.TeamBattleResults;
      if (teamBattleResults.battleResult) {
        return teamBattleResults.battleResult;
      }
      if (teamBattleResults.BattleResults) {
        return teamBattleResults.BattleResults;
      }
      // Check if data is directly in TeamBattleResults
      if (teamBattleResults.battleWinLose && teamBattleResults.characterRecord) {
        return teamBattleResults;
      }
    }

    // Check if current object has BattleResults
    if (obj.BattleResults && typeof obj.BattleResults === 'object') {
      return obj.BattleResults;
    }

    // Check if current object directly has battleWinLose (legacy format)
    if (obj.battleWinLose && obj.characterRecord) {
      return obj;
    }

    // Recursively search in nested objects
    for (const key in obj) {
      if (obj.hasOwnProperty(key) && typeof obj[key] === 'object' && obj[key] !== null) {
        const result = findBattleData(obj[key], maxDepth, currentDepth + 1);
        if (result) {
          return result;
        }
      }
    }

    return null;
  };

  // Find correct root for battleWinLose and characterRecord
  let battleWinLose, characterRecord;
  // analysisContent is the file used for the Match Analysis header selector; fall back to global fileContent
  const analysisContent = analysisFileContent || fileContent;
  const analysisSelectedPath = analysisSelectedFilePath || selectedFilePath;

  // Also need characterIdRecord for per-form stats
  let characterIdRecord = null;

  if (analysisContent && typeof analysisContent === 'object') {
    // Handle TeamBattleResults format (current BR_Data structure)
    if (analysisContent.TeamBattleResults && typeof analysisContent.TeamBattleResults === 'object') {
      const teamBattleResults = analysisContent.TeamBattleResults;
      // Check for both battleResult (lowercase) and BattleResults (capital)
      if (teamBattleResults.battleResult) {
        battleWinLose = teamBattleResults.battleResult.battleWinLose;
        characterRecord = teamBattleResults.battleResult.characterRecord;
        characterIdRecord = teamBattleResults.battleResult.characterIdRecord;
      } else if (teamBattleResults.BattleResults) {
        battleWinLose = teamBattleResults.BattleResults.battleWinLose;
        characterRecord = teamBattleResults.BattleResults.characterRecord;
        characterIdRecord = teamBattleResults.BattleResults.characterIdRecord;
      } else if (teamBattleResults.battleWinLose && teamBattleResults.characterRecord) {
        // Direct properties in TeamBattleResults (new wrapper format)
        battleWinLose = teamBattleResults.battleWinLose;
        characterRecord = teamBattleResults.characterRecord;
        characterIdRecord = teamBattleResults.characterIdRecord;
      }
    }
    // Handle new format with teams array at the top
    else if (analysisContent.teams && Array.isArray(analysisContent.teams) && analysisContent.teams.length > 0) {
      const firstTeam = analysisContent.teams[0];
      if (firstTeam.BattleResults) {
        battleWinLose = firstTeam.BattleResults.battleWinLose;
        characterRecord = firstTeam.BattleResults.characterRecord;
        characterIdRecord = firstTeam.BattleResults.characterIdRecord;
      } else if (firstTeam.battleWinLose) {
        battleWinLose = firstTeam.battleWinLose;
        characterRecord = firstTeam.characterRecord;
        characterIdRecord = firstTeam.characterIdRecord;
      }
    } 
    // Handle standard format with BattleResults at root
    else if (analysisContent.BattleResults) {
      battleWinLose = analysisContent.BattleResults.battleWinLose;
      characterRecord = analysisContent.BattleResults.characterRecord;
      characterIdRecord = analysisContent.BattleResults.characterIdRecord;
    } 
    // Handle legacy format with direct properties
    else if (analysisContent.battleWinLose && analysisContent.characterRecord) {
      battleWinLose = analysisContent.battleWinLose;
      characterRecord = analysisContent.characterRecord;
      characterIdRecord = analysisContent.characterIdRecord;
    }
    // Fallback: recursively search for BattleResults in nested structure
    else {
      const battleData = findBattleData(analysisContent);
      if (battleData) {
        battleWinLose = battleData.battleWinLose;
        characterRecord = battleData.characterRecord;
      }
    }
  }

  // Extract team names from teams array (multiple format support)
  let p1TeamName = "Team 1";
  let p2TeamName = "Team 2";
  if (analysisContent && typeof analysisContent === 'object') {
    let teamsArray = null;
    
    // Check for TeamBattleResults format first
    if (analysisContent.TeamBattleResults && Array.isArray(analysisContent.TeamBattleResults.teams)) {
      teamsArray = analysisContent.TeamBattleResults.teams;
    }
    // Check for direct teams array
    else if (Array.isArray(analysisContent.teams)) {
      teamsArray = analysisContent.teams;
    }
    // Check for nested teams in BattleResults
    else if (analysisContent.BattleResults && Array.isArray(analysisContent.BattleResults.teams)) {
      teamsArray = analysisContent.BattleResults.teams;
    }
    
    if (teamsArray && teamsArray.length >= 2) {
      // Handle both string and object formats
      const team1 = teamsArray[0];
      const team2 = teamsArray[1];
      
      // If team1 is a string, use it directly; if it's an object, look for a teamName property
      if (typeof team1 === 'string') {
        p1TeamName = team1 || "Team 1";
      } else if (team1 && typeof team1 === 'object' && team1.teamName) {
        p1TeamName = team1.teamName || "Team 1";
      }
      
      // Same for team2
      if (typeof team2 === 'string') {
        p2TeamName = team2 || "Team 2";
      } else if (team2 && typeof team2 === 'object' && team2.teamName) {
        p2TeamName = team2.teamName || "Team 2";
      }
    } else if (teamsArray && teamsArray.length === 1) {
      const team1 = teamsArray[0];
      
      // If team1 is a string, use it directly; if it's an object, look for a teamName property
      if (typeof team1 === 'string') {
        p1TeamName = team1 || "Team 1";
      } else if (team1 && typeof team1 === 'object' && team1.teamName) {
        p1TeamName = team1.teamName || "Team 1";
      }
    }
  }

  // Extract teams for single file view
  let p1Team = [], p2Team = [];
  if (characterRecord) {
    const teams = getTeams(characterRecord);
    p1Team = teams.p1;
    p2Team = teams.p2;
  }

  const p1Summary = getTeamStats(p1Team, charMap, capsuleMap);
  const p2Summary = getTeamStats(p2Team, charMap, capsuleMap);

  return (
    <div className={`min-h-screen p-4 transition-colors duration-300 ${
      darkMode 
        ? 'bg-gray-900' 
        : 'bg-gradient-to-br from-orange-500 via-red-600 to-purple-700'
    }`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className={`rounded-2xl shadow-2xl p-6 mb-6 ${
          darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center justify-center gap-3 flex-1">
              <Swords className={`w-12 h-12 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} />
              <div className="text-center">
                <h1 className={`text-4xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  Dragon Ball Sparking Zero
                </h1>
                <h2 className={`text-xl ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Match Analyzer
                </h2>
              </div>
              <Trophy className={`w-12 h-12 ${darkMode ? 'text-yellow-400' : 'text-yellow-500'}`} />
            </div>
            
            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-3 rounded-xl transition-all duration-300 ${
                darkMode 
                  ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {darkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
            </button>
          </div>
        </div>
        
        {/* Mode Selection */}
        <div className={`rounded-2xl shadow-xl p-6 mb-6 ${
          darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'
        }`}>
          <div className="flex items-center gap-2 mb-4">
            <Target className={`w-6 h-6 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} />
            <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Analysis Mode</h3>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <label className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              mode === 'reference' 
                ? darkMode
                  ? 'border-orange-400 bg-orange-900/30 text-orange-300'
                  : 'border-orange-500 bg-orange-50 text-orange-700'
                : darkMode
                  ? 'border-gray-600 bg-gray-700 hover:border-gray-500 text-gray-300'
                  : 'border-gray-200 bg-gray-50 hover:border-gray-300'
            }`}>
              <div className="flex items-center gap-3">
                <Database className="w-6 h-6" />
                <div>
                  <input 
                    type="radio" 
                    value="reference" 
                    checked={mode === 'reference'} 
                    onChange={(e) => handleModeChange(e.target.value)}
                    className="sr-only"
                  />
                  <span className="font-semibold">Reference Data Files</span>
                  <p className="text-sm opacity-75">Use built-in test data</p>
                </div>
              </div>
            </label>
            <label className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              mode === 'manual' 
                ? darkMode
                  ? 'border-orange-400 bg-orange-900/30 text-orange-300'
                  : 'border-orange-500 bg-orange-50 text-orange-700'
                : darkMode
                  ? 'border-gray-600 bg-gray-700 hover:border-gray-500 text-gray-300'
                  : 'border-gray-200 bg-gray-50 hover:border-gray-300'
            }`}>
              <div className="flex items-center gap-3">
                <Upload className="w-6 h-6" />
                <div>
                  <input 
                    type="radio" 
                    value="manual" 
                    checked={mode === 'manual'} 
                    onChange={(e) => handleModeChange(e.target.value)}
                    className="sr-only"
                  />
                  <span className="font-semibold">Manual File Upload</span>
                  <p className="text-sm opacity-75">Upload your own JSON files</p>
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Reference Data Mode */}
        {mode === 'reference' && (
          <div className={`rounded-2xl shadow-xl p-6 mb-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className={`w-6 h-6 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
              <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>View Type</h3>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <label className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                viewType === 'single' 
                  ? darkMode
                    ? 'border-blue-400 bg-blue-900/30 text-blue-300'
                    : 'border-blue-500 bg-blue-50 text-blue-700'
                  : darkMode
                    ? 'border-gray-600 bg-gray-700 hover:border-gray-500 text-gray-300'
                    : 'border-gray-200 bg-gray-50 hover:border-gray-300'
              }`}>
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6" />
                  <div>
                    <input 
                      type="radio" 
                      value="single" 
                      checked={viewType === 'single'} 
                      onChange={(e) => setViewType(e.target.value)}
                      className="sr-only"
                    />
                    <span className="font-semibold">Single Match</span>
                    <p className="text-sm opacity-75">Detailed view</p>
                  </div>
                </div>
              </label>
              <label className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                viewType === 'aggregated' 
                  ? darkMode
                    ? 'border-blue-400 bg-blue-900/30 text-blue-300'
                    : 'border-blue-500 bg-blue-50 text-blue-700'
                  : darkMode
                    ? 'border-gray-600 bg-gray-700 hover:border-gray-500 text-gray-300'
                    : 'border-gray-200 bg-gray-50 hover:border-gray-300'
              }`}>
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-6 h-6" />
                  <div>
                    <input 
                      type="radio" 
                      value="aggregated" 
                      checked={viewType === 'aggregated'} 
                      onChange={(e) => setViewType(e.target.value)}
                      className="sr-only"
                    />
                    <span className="font-semibold">Aggregated Stats</span>
                    <p className="text-sm opacity-75">Combined data</p>
                  </div>
                </div>
              </label>
              <label className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                viewType === 'teams' 
                  ? darkMode
                    ? 'border-yellow-400 bg-yellow-900/30 text-yellow-300'
                    : 'border-yellow-500 bg-yellow-50 text-yellow-700'
                  : darkMode
                    ? 'border-gray-600 bg-gray-700 hover:border-gray-500 text-gray-300'
                    : 'border-gray-200 bg-gray-50 hover:border-gray-300'
              }`}>
                <div className="flex items-center gap-3">
                  <Users className="w-6 h-6" />
                  <div>
                    <input 
                      type="radio" 
                      value="teams" 
                      checked={viewType === 'teams'} 
                      onChange={(e) => setViewType(e.target.value)}
                      className="sr-only"
                    />
                    <span className="font-semibold">Team Rankings</span>
                    <p className="text-sm opacity-75">Win/Loss records</p>
                  </div>
                </div>
              </label>
              <label className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                viewType === 'tables' 
                  ? darkMode
                    ? 'border-green-400 bg-green-900/30 text-green-300'
                    : 'border-green-500 bg-green-50 text-green-700'
                  : darkMode
                    ? 'border-gray-600 bg-gray-700 hover:border-gray-500 text-gray-300'
                    : 'border-gray-200 bg-gray-50 hover:border-gray-300'
              }`}>
                <div className="flex items-center gap-3">
                  <Table className="w-6 h-6" />
                  <div>
                    <input 
                      type="radio" 
                      value="tables" 
                      checked={viewType === 'tables'} 
                      onChange={(e) => setViewType(e.target.value)}
                      className="sr-only"
                    />
                    <span className="font-semibold">Data Tables</span>
                    <p className="text-sm opacity-75">Interactive tables</p>
                  </div>
                </div>
              </label>
              <label className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                viewType === 'meta' 
                  ? darkMode
                    ? 'border-purple-400 bg-purple-900/30 text-purple-300'
                    : 'border-purple-500 bg-purple-50 text-purple-700'
                  : darkMode
                    ? 'border-gray-600 bg-gray-700 hover:border-gray-500 text-gray-300'
                    : 'border-gray-200 bg-gray-50 hover:border-gray-300'
              }`}>
                <div className="flex items-center gap-3">
                  <Database className="w-6 h-6" />
                  <div>
                    <input 
                      type="radio" 
                      value="meta" 
                      checked={viewType === 'meta'} 
                      onChange={(e) => setViewType(e.target.value)}
                      className="sr-only"
                    />
                    <span className="font-semibold">Meta Analysis</span>
                    <p className="text-sm opacity-75">Build trends</p>
                  </div>
                </div>
              </label>
            </div>

            <div className={`rounded-xl p-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {viewType === 'single' ? 'Search categories or matches to analyze:' : 'Search categories or matches to analyze:'}
              </label>
              <BRDataSelector
                allowFolderSelect={viewType !== 'single'}
                onSelect={async (selectedIds) => {
                  if (!Array.isArray(selectedIds) || selectedIds.length === 0) return;
                  setSelectedFilePath(selectedIds);
                  setFileContent(null);

                  // Only fetch files (ending in .json)
                  const fileIds = selectedIds.filter(id => id.endsWith('.json'));
                  if (fileIds.length === 0) return;

                  const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) ? import.meta.env.BASE_URL : '';
                  const fileContents = await Promise.all(
                    fileIds.map(async id => {
                      const staticUrl = `${base}BR_Data/${id}`;
                      try {
                        const res = await fetch(staticUrl);
                        if (res.ok) return { name: id, content: await res.json() };
                      } catch (err) {
                        // ignore individual file errors and continue
                      }
                      return null;
                    })
                  );
                  setFileContent(fileContents.filter(Boolean));
                }}
              />
            </div>
          </div>
        )}

        {/* Manual Upload Mode */}
        {mode === 'manual' && (
          <div className={`rounded-2xl shadow-xl p-6 mb-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center gap-2 mb-4">
              <Upload className={`w-6 h-6 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
              <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Upload JSON Battle Result Files</h3>
            </div>
            
            <label 
              className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                darkMode 
                  ? 'border-gray-600 bg-gray-700 hover:bg-gray-600' 
                  : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <Upload className={`w-8 h-8 mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} />
              <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Click to upload JSON files or drag and drop</span>
              <input
                type="file"
                multiple
                accept=".json"
                onChange={handleManualFileUpload}
                className="hidden"
              />
            </label>
            
            {manualFiles.length > 0 && (
              <div className="mt-6">
                <button
                  onClick={() => setUploadedFilesCollapsed(!uploadedFilesCollapsed)}
                  className={`w-full text-sm font-semibold mb-2 flex items-center justify-between gap-2 px-3 py-2 rounded-lg transition-colors ${
                    darkMode 
                      ? 'text-gray-300 bg-gray-700 hover:bg-gray-600' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Uploaded Files ({manualFiles.length})
                  </div>
                  {uploadedFilesCollapsed ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronUp className="w-4 h-4" />
                  )}
                </button>
                
                {!uploadedFilesCollapsed && (
                  <div className="space-y-1 mb-4">
                    {manualFiles.map((file, i) => (
                      <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm ${
                        file.error 
                          ? darkMode 
                            ? 'bg-red-900/30 border border-red-700 text-red-300' 
                            : 'bg-red-50 border border-red-200 text-red-700'
                          : darkMode
                            ? 'bg-green-900/30 border border-green-700 text-green-300'
                            : 'bg-green-50 border border-green-200 text-green-700'
                      }`}>
                        {file.error ? (
                          <Shield className="w-3.5 h-3.5 flex-shrink-0" />
                        ) : (
                          <Target className="w-3.5 h-3.5 flex-shrink-0" />
                        )}
                        <span className="flex-1 truncate">{file.name}</span>
                        {file.error && <span className="text-xs opacity-75">Error: {file.error}</span>}
                      </div>
                    ))}
                  </div>
                )}
                
                {/* View Type Selector for Manual Mode */}
                <div className={`mb-4 p-4 rounded-xl border ${
                  darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                }`}>
                  <h4 className={`text-sm font-semibold mb-3 ${
                    darkMode ? 'text-white' : 'text-gray-800'
                  }`}>View Type</h4>
                  <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-3">
                    <label className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      viewType === 'single' 
                        ? darkMode
                          ? 'border-blue-400 bg-blue-900/30 text-blue-300'
                          : 'border-blue-500 bg-blue-50 text-blue-700'
                        : darkMode
                          ? 'border-gray-600 bg-gray-800 hover:border-gray-500 text-gray-300'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}>
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        <div>
                          <input 
                            type="radio" 
                            value="single" 
                            checked={viewType === 'single'} 
                            onChange={(e) => setViewType(e.target.value)}
                            className="sr-only"
                          />
                          <span className="font-semibold text-sm">Single Match</span>
                          <p className="text-xs opacity-75">Detailed view</p>
                        </div>
                      </div>
                    </label>
                    <label className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      viewType === 'aggregated' 
                        ? darkMode
                          ? 'border-blue-400 bg-blue-900/30 text-blue-300'
                          : 'border-blue-500 bg-blue-50 text-blue-700'
                        : darkMode
                          ? 'border-gray-600 bg-gray-800 hover:border-gray-500 text-gray-300'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        <div>
                          <input 
                            type="radio" 
                            value="aggregated" 
                            checked={viewType === 'aggregated'} 
                            onChange={(e) => setViewType(e.target.value)}
                            className="sr-only"
                          />
                          <span className="font-semibold text-sm">Aggregated Stats</span>
                          <p className="text-xs opacity-75">Combined data</p>
                        </div>
                      </div>
                    </label>
                    <label className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      viewType === 'teams' 
                        ? darkMode
                          ? 'border-yellow-400 bg-yellow-900/30 text-yellow-300'
                          : 'border-yellow-500 bg-yellow-50 text-yellow-700'
                        : darkMode
                          ? 'border-gray-600 bg-gray-800 hover:border-gray-500 text-gray-300'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}>
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        <div>
                          <input 
                            type="radio" 
                            value="teams" 
                            checked={viewType === 'teams'} 
                            onChange={(e) => setViewType(e.target.value)}
                            className="sr-only"
                          />
                          <span className="font-semibold text-sm">Team Rankings</span>
                          <p className="text-xs opacity-75">Win/Loss records</p>
                        </div>
                      </div>
                    </label>
                    <label className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      viewType === 'tables' 
                        ? darkMode
                          ? 'border-green-400 bg-green-900/30 text-green-300'
                          : 'border-green-500 bg-green-50 text-green-700'
                        : darkMode
                          ? 'border-gray-600 bg-gray-800 hover:border-gray-500 text-gray-300'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}>
                      <div className="flex items-center gap-2">
                        <Table className="w-5 h-5" />
                        <div>
                          <input 
                            type="radio" 
                            value="tables" 
                            checked={viewType === 'tables'} 
                            onChange={(e) => setViewType(e.target.value)}
                            className="sr-only"
                          />
                          <span className="font-semibold text-sm">Data Tables</span>
                          <p className="text-xs opacity-75">Interactive tables</p>
                        </div>
                      </div>
                    </label>
                    <label className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      viewType === 'meta' 
                        ? darkMode
                          ? 'border-purple-400 bg-purple-900/30 text-purple-300'
                          : 'border-purple-500 bg-purple-50 text-purple-700'
                        : darkMode
                          ? 'border-gray-600 bg-gray-800 hover:border-gray-500 text-gray-300'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}>
                      <div className="flex items-center gap-2">
                        <Database className="w-5 h-5" />
                        <div>
                          <input 
                            type="radio" 
                            value="meta" 
                            checked={viewType === 'meta'} 
                            onChange={(e) => setViewType(e.target.value)}
                            className="sr-only"
                          />
                          <span className="font-semibold text-sm">Meta Analysis</span>
                          <p className="text-xs opacity-75">Build trends</p>
                        </div>
                      </div>
                    </label>
                  </div>
                  
                  {/* Helpful hint for single file uploads */}
                  {manualFiles.filter(f => !f.error).length === 1 && viewType !== 'single' && (
                    <div className={`mt-3 p-3 rounded-lg border flex items-start gap-2 ${
                      darkMode 
                        ? 'bg-blue-900/20 border-blue-700 text-blue-300' 
                        : 'bg-blue-50 border-blue-200 text-blue-700'
                    }`}>
                      <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <p className="text-xs">
                        <strong>Tip:</strong> Upload multiple files for richer insights and better trend analysis!
                      </p>
                    </div>
                  )}
                  
                  {/* Helpful hint for multiple file uploads in single view mode */}
                  {manualFiles.filter(f => !f.error).length > 1 && viewType === 'single' && (
                    <div className={`mt-3 p-3 rounded-lg border flex items-start gap-2 ${
                      darkMode 
                        ? 'bg-yellow-900/20 border-yellow-700 text-yellow-300' 
                        : 'bg-yellow-50 border-yellow-200 text-yellow-700'
                    }`}>
                      <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <p className="text-xs">
                        <strong>Note:</strong> {manualFiles.filter(f => !f.error).length} files uploaded. Select a specific file below to view single match details, or switch to Aggregated Stats/Team Rankings to analyze all files together.
                      </p>
                    </div>
                  )}
                </div>
                
                {/* File Selection Dropdown for Single View */}
                {viewType === 'single' && manualFiles.filter(f => !f.error).length > 1 && (
                  <div className={`mt-4 p-4 rounded-xl border ${
                    darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <label className={`block text-sm font-medium mb-2 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Select a match to analyze:
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {manualFiles.filter(f => !f.error).map((file) => (
                        <button
                          key={file.name}
                          onClick={() => handleManualFileSelect(file.name)}
                          className={`p-3 rounded-lg border-2 text-left transition-all ${
                            analysisSelectedFilePath && analysisSelectedFilePath[0] === file.name
                              ? darkMode
                                ? 'border-blue-500 bg-blue-900/30 text-blue-300'
                                : 'border-blue-500 bg-blue-50 text-blue-700'
                              : darkMode
                                ? 'border-gray-600 bg-gray-800 hover:border-gray-500 text-gray-300'
                                : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            <span className="text-sm font-medium truncate">{file.name.replace(/\.json$/i, '')}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {viewType === 'single' && manualFiles.length === 1 && !manualFiles[0].error ? (
                  <button 
                    onClick={() => handleManualFileSelect(manualFiles[0].name)}
                    className="w-full bg-orange-600 text-white py-3 px-6 rounded-lg hover:bg-orange-700 transition-colors font-semibold flex items-center justify-center gap-2"
                  >
                    <Eye className="w-5 h-5" />
                    Analyze {manualFiles[0].name}
                  </button>
                ) : null}
              </div>
            )}
          </div>
        )}

        {/* Aggregated Data Display */}
        {((mode === 'reference' && viewType === 'aggregated') || 
          (mode === 'manual' && viewType === 'aggregated' && manualFiles.filter(f => !f.error).length > 0)) && 
          aggregatedData.length > 0 && (
          <div className={`rounded-2xl shadow-xl p-6 mb-6 ${
            darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'
          }`}>
            <div className="flex items-center justify-between mb-6 cursor-pointer" onClick={() => setSectionCollapsed(prev => ({...prev, aggregated: !prev.aggregated}))}>
              <div className="flex items-center gap-3">
                <TrendingUp className={`w-8 h-8 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                <div>
                  <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Aggregated Character Performance</h2>
                  <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Data from {mode === 'reference' ? 1 : manualFiles.filter(f => !f.error).length} battle file{(mode === 'reference' ? 1 : manualFiles.filter(f => !f.error).length) !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <button 
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  darkMode 
                    ? 'bg-blue-900 hover:bg-blue-800 text-blue-400' 
                    : 'bg-blue-100 hover:bg-blue-200 text-blue-600'
                }`}
                title={sectionCollapsed.aggregated ? "Expand section" : "Collapse section"}
              >
                {sectionCollapsed.aggregated ? '+' : '−'}
              </button>
            </div>
            
            {!sectionCollapsed.aggregated && (
            <div className="space-y-4">
              {/* Search and Filter Controls - Sticky Floating Panel */}
              <div className={`sticky top-0 z-[100] rounded-xl border shadow-lg transition-all ${
                darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
              }`}>
                {/* Collapse/Expand Header */}
                <div 
                  className={`flex items-center justify-between px-4 pt-2 pb-4 cursor-pointer ${
                    filtersCollapsed ? 'rounded-xl' : 'rounded-t-xl border-b ' + (darkMode ? 'border-gray-600' : 'border-gray-200')
                  }`}
                  onClick={() => setFiltersCollapsed(!filtersCollapsed)}
                >
                  <div className="flex items-center gap-2">
                    <Filter className={`w-5 h-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                    <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      Filters & Sorting
                    </h3>
                    {filtersCollapsed && (
                      <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        ({filteredAggregatedData.length} of {aggregatedData.length} characters shown)
                      </span>
                    )}
                  </div>
                  <div 
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                      darkMode 
                        ? 'bg-blue-900 text-blue-400 hover:bg-blue-800' 
                        : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                    }`}
                    title={filtersCollapsed ? "Expand filters" : "Collapse filters"}
                  >
                    {filtersCollapsed ? '+' : '−'}
                  </div>
                </div>
                
                {/* Filter Controls - Collapsible Content */}
                {!filtersCollapsed && (
                <div className="p-4 pt-0">
                {/* Search Bar */}
                {/* Character Filter */}
                <div className="mb-4">
                  {/* Selected Characters as Chips */}
                  {selectedCharacters.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {selectedCharacters.map(character => (
                        <button
                          key={character}
                          onClick={() => {
                            setSelectedCharacters(prev => prev.filter(c => c !== character));
                          }}
                          className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all flex items-center gap-1 ${
                            darkMode 
                              ? 'bg-purple-900 border-purple-600 text-purple-300 hover:bg-purple-800' 
                              : 'bg-purple-100 border-purple-500 text-purple-700 hover:bg-purple-200'
                          }`}
                        >
                          {character}
                          <X className="w-3 h-3" />
                        </button>
                      ))}
                      <button
                        onClick={() => setSelectedCharacters([])}
                        className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          darkMode 
                            ? 'text-gray-400 bg-gray-800 hover:text-gray-300 hover:bg-gray-700' 
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        Clear all
                      </button>
                    </div>
                  )}
                  
                  {/* Search Input with Dropdown */}
                  <div className="mb-2">
                    <div className={`text-sm font-medium mb-2 flex items-center gap-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      <Search className="w-5 h-5" />
                      Characters
                    </div>
                    <MultiSelectCombobox
                      items={availableCharacters.map(char => ({ id: char, name: char }))}
                      selectedIds={selectedCharacters}
                      placeholder="Search and select characters..."
                      onAdd={(id) => setSelectedCharacters(prev => [...prev, id])}
                      darkMode={darkMode}
                      focusColor="purple"
                    />
                  </div>
                </div>
                
                {/* Performance Level Filters */}
                <div className="mb-4">
                  <div className={`text-sm font-medium mb-2 flex items-center gap-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    <Filter className="w-4 h-4" />
                    Performance Level
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 'excellent', label: 'Excellent', color: 'green' },
                      { value: 'good', label: 'Good', color: 'yellow' },
                      { value: 'average', label: 'Average', color: 'orange' },
                      { value: 'below', label: 'Below Average', color: 'red' },
                      { value: 'poor', label: 'Poor', color: 'gray' }
                    ].map(filter => {
                      const isActive = performanceFilters.includes(filter.value);
                      const colorClasses = {
                        green: isActive 
                          ? (darkMode ? 'bg-green-900 border-green-500 text-green-200' : 'bg-green-100 border-green-500 text-green-700')
                          : (darkMode ? 'bg-gray-800 border-gray-600 text-gray-400' : 'bg-gray-100 border-gray-300 text-gray-500'),
                        yellow: isActive
                          ? (darkMode ? 'bg-yellow-900 border-yellow-500 text-yellow-200' : 'bg-yellow-100 border-yellow-500 text-yellow-700')
                          : (darkMode ? 'bg-gray-800 border-gray-600 text-gray-400' : 'bg-gray-100 border-gray-300 text-gray-500'),
                        orange: isActive
                          ? (darkMode ? 'bg-orange-900 border-orange-500 text-orange-200' : 'bg-orange-100 border-orange-500 text-orange-700')
                          : (darkMode ? 'bg-gray-800 border-gray-600 text-gray-400' : 'bg-gray-100 border-gray-300 text-gray-500'),
                        red: isActive
                          ? (darkMode ? 'bg-red-900 border-red-500 text-red-200' : 'bg-red-100 border-red-500 text-red-700')
                          : (darkMode ? 'bg-gray-800 border-gray-600 text-gray-400' : 'bg-gray-100 border-gray-300 text-gray-500'),
                        gray: isActive
                          ? (darkMode ? 'bg-gray-700 border-gray-500 text-gray-200' : 'bg-gray-200 border-gray-500 text-gray-800')
                          : (darkMode ? 'bg-gray-800 border-gray-600 text-gray-400' : 'bg-gray-100 border-gray-300 text-gray-500')
                      };
                      
                      return (
                        <button
                          key={filter.value}
                          onClick={() => {
                            setPerformanceFilters(prev => 
                              isActive 
                                ? prev.filter(f => f !== filter.value)
                                : [...prev, filter.value]
                            );
                          }}
                          className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                            colorClasses[filter.color]
                          } hover:opacity-80`}
                        >
                          {filter.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                {/* Matches Filter */}
                <div className="mb-4">
                  <div className={`text-sm font-medium mb-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Matches Played
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <label className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Min:</label>
                      <input
                        type="number"
                        min="1"
                        max={maxMatches}
                        value={minMatches}
                        onChange={(e) => setMinMatches(Math.max(1, Math.min(parseInt(e.target.value) || 1, maxMatches)))}
                        className={`w-16 px-2 py-1 rounded border text-sm ${
                          darkMode 
                            ? 'bg-gray-800 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      />
                    </div>
                    <div className="flex-1">
                      <input
                        type="range"
                        min="1"
                        max={aggregatedData.length > 0 ? Math.max(...aggregatedData.map(c => c.matchCount)) : 20}
                        value={minMatches}
                        onChange={(e) => setMinMatches(parseInt(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Max:</label>
                      <input
                        type="number"
                        min={minMatches}
                        max="999"
                        value={maxMatches}
                        onChange={(e) => setMaxMatches(Math.max(minMatches, parseInt(e.target.value) || 999))}
                        className={`w-16 px-2 py-1 rounded border text-sm ${
                          darkMode 
                            ? 'bg-gray-800 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Team Filter */}
                {availableTeams.length > 0 && (
                  <div className="mb-4">
                    {/* Selected Teams as Chips */}
                    {selectedTeams.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {selectedTeams.map(team => (
                          <button
                            key={team}
                            onClick={() => {
                              setSelectedTeams(prev => prev.filter(t => t !== team));
                            }}
                            className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all flex items-center gap-1 ${
                              darkMode 
                                ? 'bg-blue-900 border-blue-600 text-blue-300 hover:bg-blue-800' 
                                : 'bg-blue-100 border-blue-500 text-blue-700 hover:bg-blue-200'
                            }`}
                          >
                            {team}
                            <X className="w-3 h-3" />
                          </button>
                        ))}
                        <button
                          onClick={() => setSelectedTeams([])}
                          className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            darkMode 
                              ? 'text-gray-400 bg-gray-800 hover:text-gray-300 hover:bg-gray-700' 
                              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          Clear all
                        </button>
                      </div>
                    )}
                    
                    {/* Search Input with Dropdown */}
                    <div className="mb-2">
                      <div className={`text-sm font-medium mb-2 flex items-center gap-2 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        <Users className="w-5 h-5" />
                        Teams
                      </div>
                      <MultiSelectCombobox
                        items={availableTeams.map(team => ({ id: team, name: team }))}
                        selectedIds={selectedTeams}
                        placeholder="Search and select teams..."
                        onAdd={(id) => setSelectedTeams(prev => [...prev, id])}
                        darkMode={darkMode}
                        focusColor="blue"
                      />
                    </div>
                  </div>
                )}
                
                {/* AI Strategy Filter */}
                {availableAIStrategies.length > 0 && (
                  <div className="mb-4">
                    {/* Selected AI Strategies as Chips */}
                    {selectedAIStrategies.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {selectedAIStrategies.map(ai => {
                          const displayName = ai === 'Com' ? 'Computer' : ai === 'Player' ? 'Player' : ai;
                          return (
                            <button
                              key={ai}
                              onClick={() => {
                                setSelectedAIStrategies(prev => prev.filter(a => a !== ai));
                              }}
                              className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all flex items-center gap-1 ${
                                darkMode 
                                  ? 'bg-purple-900 border-purple-600 text-purple-300 hover:bg-purple-800' 
                                  : 'bg-purple-100 border-purple-500 text-purple-700 hover:bg-purple-200'
                              }`}
                            >
                              {displayName}
                              <X className="w-3 h-3" />
                            </button>
                          );
                        })}
                        <button
                          onClick={() => setSelectedAIStrategies([])}
                          className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            darkMode 
                              ? 'text-gray-400 bg-gray-800 hover:text-gray-300 hover:bg-gray-700' 
                              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          Clear all
                        </button>
                      </div>
                    )}
                    
                    {/* Search Input with Dropdown */}
                    <div className="mb-2">
                      <div className={`text-sm font-medium mb-2 flex items-center gap-2 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        <Settings className="w-5 h-5" />
                        AI Strategies
                      </div>
                      <MultiSelectCombobox
                        items={availableAIStrategies.map(ai => ({ 
                          id: ai, 
                          name: ai === 'Com' ? 'Computer' : ai === 'Player' ? 'Player' : ai === 'Default' ? 'Default' : ai 
                        }))}
                        selectedIds={selectedAIStrategies}
                        placeholder="Search and select AI strategies..."
                        onAdd={(id) => setSelectedAIStrategies(prev => [...prev, id])}
                        darkMode={darkMode}
                        focusColor="purple"
                      />
                    </div>
                  </div>
                )}
                
                {/* Sort Controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className={`text-sm font-medium mb-2 block ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Sort By
                    </label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg border ${
                        darkMode 
                          ? 'bg-gray-800 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
                    >
                      <option value="combatScore">Combat Performance Score</option>
                      <option value="totalDamage">Total Damage</option>
                      <option value="avgDamage">Average Damage</option>
                      <option value="dps">DPS (Damage per Second)</option>
                      <option value="efficiency">Efficiency (Damage/Taken)</option>
                      <option value="matches">Matches Played</option>
                      <option value="name">Character Name</option>
                    </select>
                  </div>
                  <div>
                    <label className={`text-sm font-medium mb-2 block ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Sort Direction
                    </label>
                    <button
                      onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                      className={`w-full px-3 py-2 rounded-lg border flex items-center justify-center gap-2 ${
                        darkMode 
                          ? 'bg-gray-800 border-gray-600 text-white hover:bg-gray-700' 
                          : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50'
                      } transition-colors`}
                    >
                      <ArrowUpDown className="w-4 h-4" />
                      {sortDirection === 'asc' ? 'Ascending' : 'Descending'}
                    </button>
                  </div>
                </div>
                
                {/* Result Count */}
                <div className={`text-sm mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Showing {filteredAggregatedData.length} of {aggregatedData.length} characters
                </div>
                </div>
                )}
              </div>
              
              {filteredAggregatedData.map((char, i) => {
                const expanded = expandedRows[`agg_${i}`] || false;
                const allDamageValues = filteredAggregatedData.map(c => c.totalDamage);
                const allDamageTakenValues = filteredAggregatedData.map(c => c.totalTaken);
                const allAvgDamageValues = filteredAggregatedData.map(c => c.avgDamage);
                const allAvgTakenValues = filteredAggregatedData.map(c => c.avgTaken);
                const allAvgHealthValues = filteredAggregatedData.map(c => c.avgHealth);
                const allAvgBattleTimeValues = filteredAggregatedData.map(c => c.avgBattleTime);
                const avgBattleTime = allAvgBattleTimeValues.reduce((sum, val) => sum + val, 0) / allAvgBattleTimeValues.length;
                
                // Get all combat performance scores from the filtered data
                const combatPerformanceScores = filteredAggregatedData.map(c => c.combatPerformanceScore);
                
                return (
                  <div key={i} className={`rounded-xl p-6 border transition-colors ${
                    darkMode 
                      ? 'bg-gray-800 border-gray-600 hover:border-gray-500' 
                      : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                  }`}>
                    <div 
                      className="space-y-4 cursor-pointer"
                      onClick={() => toggleRow('agg', i)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Swords className={`w-6 h-6 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} />
                          <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{char.name}</h3>
                          <PerformanceIndicator value={char.combatPerformanceScore} allValues={combatPerformanceScores} darkMode={darkMode} />
                        </div>
                        <div className="flex items-center gap-4">
                          <div className={`flex items-center gap-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            <BarChart3 className="w-4 h-4" />
                            <span>{char.activeMatchCount || char.matchCount} active match{(char.activeMatchCount || char.matchCount) !== 1 ? 'es' : ''}</span>
                          </div>
                          <div 
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                              darkMode 
                                ? 'bg-blue-900 text-blue-400' 
                                : 'bg-blue-100 text-blue-600'
                            }`}
                            title={expanded ? "Click to collapse" : "Click to expand"}
                          >
                            {expanded ? '−' : '+'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <StatBar 
                            value={char.avgDamage} 
                            maxValue={Math.max(...allAvgDamageValues)} 
                            type="damage" 
                            label="Avg Damage"
                            icon={Zap}
                            darkMode={darkMode}
                          />
                        </div>
                        
                        <div className="flex-1">
                          <StatBar 
                            value={char.totalBattleTime > 0 ? char.totalDamage / char.totalBattleTime : 0} 
                            maxValue={Math.max(...aggregatedData.map(c => c.totalBattleTime > 0 ? c.totalDamage / c.totalBattleTime : 0))} 
                            displayValue={Math.round(char.totalBattleTime > 0 ? char.totalDamage / char.totalBattleTime : 0)}
                            type="special" 
                            label="Damage/Sec"
                            icon={Target}
                            darkMode={darkMode}
                          />
                        </div>
                        
                        <div className="flex-1">
                          <StatBar 
                            value={char.totalTaken > 0 ? char.totalDamage / char.totalTaken : 0} 
                            maxValue={Math.max(...aggregatedData.map(c => c.totalTaken > 0 ? c.totalDamage / c.totalTaken : 0))} 
                            displayValue={(char.totalTaken > 0 ? (char.totalDamage / char.totalTaken).toFixed(2) : '0.00') + 'x'}
                            type="ultimate" 
                            label="Efficiency"
                            icon={TrendingUp}
                            darkMode={darkMode}
                          />
                        </div>
                        
                        <div className="flex-1">
                          <BattleTimeVariance 
                            value={char.avgBattleTime}
                            averageValue={avgBattleTime}
                            darkMode={darkMode}
                          />
                        </div>
                        
                        <div className="flex-1">
                          <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                            <div className="flex items-center gap-2 mb-2">
                              <Trophy className={`w-4 h-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`} />
                              <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Eliminations</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className={`text-lg font-bold ${darkMode ? 'text-yellow-400' : 'text-yellow-500'}`}>{char.totalKills}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {expanded && (
                      <div className={`mt-6 pt-6 border-t ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                        <div className="grid grid-cols-1 gap-4">
                          {/*Character Expanded Stats*/}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
                              {/* Combat Performance - Full Width */}
                              <div className={`rounded-lg p-3 ${darkMode ? 'bg-gray-700' : 'bg-white'}`}>
                                <div className="flex items-center gap-2 mb-2">
                                  <Swords className={`w-5 h-5 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />
                                  <h4 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Combat Performance</h4>
                                </div>
                                <div className="space-y-2 text-sm mb-3">
                                  <div className="flex justify-between">
                                    <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Damage Done:</span>
                                    <div className="flex items-center gap-2">
                                      <strong className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{char.avgDamage.toLocaleString()}</strong>
                                      <PerformanceIndicatorLabel value={char.avgDamage} allValues={allAvgDamageValues} darkMode={darkMode} />
                                    </div>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Damage Taken:</span>
                                    <div className="flex items-center gap-2">
                                      <strong className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{char.avgTaken.toLocaleString()}</strong>
                                      <PerformanceIndicatorLabel value={char.avgTaken} allValues={allAvgTakenValues} isInverse={true} darkMode={darkMode} />
                                    </div>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Damage Over Time:</span>
                                    <div className="flex items-center gap-2">
                                      <strong className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{Math.round(char.totalBattleTime > 0 ? char.totalDamage / char.totalBattleTime : 0).toLocaleString()}/sec</strong>
                                      <PerformanceIndicatorLabel value={char.totalBattleTime > 0 ? char.totalDamage / char.totalBattleTime : 0} allValues={filteredAggregatedData.map(c => c.totalBattleTime > 0 ? c.totalDamage / c.totalBattleTime : 0)} darkMode={darkMode} />
                                    </div>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Damage Efficiency:</span>
                                    <div className="flex items-center gap-2">
                                      <strong className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{(char.totalTaken > 0 ? (char.totalDamage / char.totalTaken).toFixed(2) : '0.00')}x</strong>
                                      <PerformanceIndicatorLabel value={char.totalTaken > 0 ? char.totalDamage / char.totalTaken : 0} allValues={filteredAggregatedData.map(c => c.totalTaken > 0 ? c.totalDamage / c.totalTaken : 0)} darkMode={darkMode} />
                                    </div>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs pt-2 border-t border-gray-600">
                                  <div className="flex justify-between">
                                    <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Throws:</span>
                                    <strong className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{char.avgThrows}</strong>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Vanishing Attacks:</span>
                                    <strong className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{char.avgVanishingAttacks}</strong>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Dragon Homings:</span>
                                    <strong className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{char.avgDragonHoming}</strong>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Lightning Attacks:</span>
                                    <strong className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{char.avgLightningAttacks}</strong>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Speed Impacts:</span>
                                    <strong className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{char.avgSpeedImpacts}</strong>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Speed Impact Wins:</span>
                                    <strong className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{char.avgSpeedImpactWins}</strong>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Max Combo Hits:</span>
                                    <strong className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{char.avgMaxCombo}</strong>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Max Combo Damage:</span>
                                    <strong className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{char.avgMaxComboDamage.toLocaleString()}</strong>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Sparking Combo Hits:</span>
                                    <strong className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{char.avgSparkingCombo}</strong>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Avg Kills:</span>
                                    <strong className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{char.avgKills}</strong>
                                  </div>
                                </div>
                              </div>

                              {/* Survival & Health */}
                              <div className={`rounded-lg p-3 ${darkMode ? 'bg-gray-700' : 'bg-white'}`}>
                                <div className="flex items-center gap-2 mb-2">
                                  <Heart className={`w-5 h-5 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                                  <h4 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Survival & Health</h4>
                                </div>
                                <div className="space-y-2 text-sm mb-2">
                                  <div className="flex justify-between">
                                    <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Max Health:</span>
                                    <strong className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{char.avgHPGaugeValueMax.toLocaleString()}</strong>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Health Remaining:</span>
                                    <strong className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{char.avgHealth.toLocaleString()}</strong>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Survival Rate:</span>
                                    <strong className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{char.survivalRate.toFixed(1)}%</strong>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Swaps (Tags):</span>
                                    <strong className={`${darkMode ? 'text-teal-400' : 'text-teal-600'}`}>{char.avgTags || 0}</strong>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs pt-2 border-t border-gray-600">
                                  <div className="flex justify-between">
                                    <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Guards:</span>
                                    <strong className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{char.avgGuards}</strong>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Super Counters:</span>
                                    <strong className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{char.avgSuperCounters}</strong>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Revenge Counters:</span>
                                    <strong className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{char.avgRevengeCounters}</strong>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Z-Counters:</span>
                                    <strong className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{char.avgZCounters}</strong>
                                  </div>
                                </div>
                              </div>
                            </div>
                            {/* Survival & Health and Special Abilities in a nested grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">

                              {/* Special Abilities */}
                              <div className={`rounded-lg p-3 ${darkMode ? 'bg-gray-700' : 'bg-white'}`}>
                                <div className="flex items-center gap-2 mb-2">
                                  <Zap className={`w-5 h-5 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                                  <h4 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Special Abilities</h4>
                                </div>
                                {/* DEBUG: Log UI values for Panzy */}
                                {char.name.toLowerCase().includes('panzy') && (() => {
                                  console.log('=== AGGREGATED STATS UI - Panzy Display Values ===');
                                  console.log('char object:', char);
                                  console.log('avgS1Hit:', char.avgS1Hit);
                                  console.log('avgS1Blast:', char.avgS1Blast);
                                  console.log('avgSPM1:', char.avgSPM1);
                                  console.log('s1HitRateOverall:', char.s1HitRateOverall);
                                  return null;
                                })()}
                                {/* Check if we have hit rate data (new format) or legacy format */}
                                {char.s1HitRateOverall !== null || char.s2HitRateOverall !== null || char.ultHitRateOverall !== null ? (
                                  // New format - show hit/thrown/rate
                                  <div className="space-y-2 text-sm mb-2">
                                    <div className="flex justify-between">
                                      <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Super 1 Blasts:</span>
                                      <div className="flex items-center gap-2">
                                        <strong className={`${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                                          {(char.avgS1Hit || 0).toFixed(1)}/{(char.avgS1Blast || char.avgSPM1 || 0).toFixed(1)}
                                        </strong>
                                        {char.s1HitRateOverall !== null && char.s1HitRateOverall !== undefined && (
                                          <span className={`text-xs font-mono ${
                                            char.s1HitRateOverall >= 70 ? (darkMode ? 'text-green-400' : 'text-green-600') :
                                            char.s1HitRateOverall >= 50 ? (darkMode ? 'text-yellow-400' : 'text-yellow-600') :
                                            (darkMode ? 'text-red-400' : 'text-red-600')
                                          }`}>
                                            ({char.s1HitRateOverall.toFixed(1)}%)
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Super 2 Blasts:</span>
                                      <div className="flex items-center gap-2">
                                        <strong className={`${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                                          {(char.avgS2Hit || 0).toFixed(1)}/{(char.avgS2Blast || char.avgSPM2 || 0).toFixed(1)}
                                        </strong>
                                        {char.s2HitRateOverall !== null && char.s2HitRateOverall !== undefined && (
                                          <span className={`text-xs font-mono ${
                                            char.s2HitRateOverall >= 70 ? (darkMode ? 'text-green-400' : 'text-green-600') :
                                            char.s2HitRateOverall >= 50 ? (darkMode ? 'text-yellow-400' : 'text-yellow-600') :
                                            (darkMode ? 'text-red-400' : 'text-red-600')
                                          }`}>
                                            ({char.s2HitRateOverall.toFixed(1)}%)
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Ultimate Blasts:</span>
                                      <div className="flex items-center gap-2">
                                        <strong className={`${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
                                          {(char.avgUltHit || 0).toFixed(1)}/{(char.avgUltBlast || char.avgUltimates || 0).toFixed(1)}
                                        </strong>
                                        {char.ultHitRateOverall !== null && char.ultHitRateOverall !== undefined && (
                                          <span className={`text-xs font-mono ${
                                            char.ultHitRateOverall >= 70 ? (darkMode ? 'text-green-400' : 'text-green-600') :
                                            char.ultHitRateOverall >= 50 ? (darkMode ? 'text-yellow-400' : 'text-yellow-600') :
                                            (darkMode ? 'text-red-400' : 'text-red-600')
                                          }`}>
                                            ({char.ultHitRateOverall.toFixed(1)}%)
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  // Legacy format - show only thrown count
                                  <div className="space-y-2 text-sm mb-2">
                                    <div className="flex justify-between">
                                      <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Super 1 Blasts:</span>
                                      <strong className={`${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                                        {char.avgSPM1}
                                      </strong>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Super 2 Blasts:</span>
                                      <strong className={`${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                                        {char.avgSPM2}
                                      </strong>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Ultimate Blasts:</span>
                                      <strong className={`${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
                                        {char.avgUltimates}
                                      </strong>
                                    </div>
                                  </div>
                                )}
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs pt-2 border-t border-gray-600">
                                  <div className="flex justify-between">
                                    <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Skill 1 Usage:</span>
                                    <strong className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{char.avgEXA1}</strong>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Skill 2 Usage:</span>
                                    <strong className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{char.avgEXA2}</strong>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Charges:</span>
                                    <strong className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{char.avgCharges}</strong>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Sparkings:</span>
                                    <strong className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{char.avgSparking}</strong>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Ki Blasts:</span>
                                    <strong className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{char.avgEnergyBlasts}</strong>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Dragon Dash Mileage:</span>
                                    <strong className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{char.avgDragonDashMileage}</strong>
                                  </div>
                                </div>
                              </div>

                              {/* Most Used Builds Section */}
                              {char.topBuilds && char.topBuilds.length > 0 && (
                                <div className={`rounded-lg p-3 ${darkMode ? 'bg-gray-700' : 'bg-white'}`}>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                      <Package className={`w-5 h-5 mr-2 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                                      <h4 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Most Used Builds</h4>
                                    </div>
                                    {(() => {
                                      const currentBuildIndex = selectedBuildIndex[char.name] || 0;
                                      const currentBuild = char.topBuilds?.[currentBuildIndex];
                                      return (
                                        <PerformanceScoreBadge 
                                          score={currentBuild?.avgPerformanceScore || 0} 
                                          label="Score" 
                                          size="small" 
                                          darkMode={darkMode} 
                                          allScores={combatPerformanceScores} 
                                        />
                                      );
                                    })()}
                                  </div>
                                  {/* Tabs for build selection */}
                                  {char.topBuilds.length > 1 && (
                                    <div className="flex items-center gap-2 mb-3">
                                      {char.topBuilds.map((build, index) => {
                                        const isSelected = (selectedBuildIndex[char.name] || 0) === index;
                                        const labels = ['First', 'Second', 'Third'];
                                        return (
                                          <button
                                            key={index}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedBuildIndex(prev => ({ ...prev, [char.name]: index }));
                                            }}
                                            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                                              isSelected
                                                ? darkMode
                                                  ? 'bg-indigo-600 text-white border-2 border-indigo-500'
                                                  : 'bg-indigo-500 text-white border-2 border-indigo-600'
                                                : darkMode
                                                  ? 'bg-gray-700 text-gray-300 border-2 border-gray-600 hover:bg-gray-600'
                                                  : 'bg-white text-gray-700 border-2 border-gray-300 hover:bg-gray-100'
                                            }`}
                                          >
                                            {labels[index]}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {(() => {
                                    const currentBuildIndex = selectedBuildIndex[char.name] || 0;
                                    const currentBuild = char.topBuilds?.[currentBuildIndex];
                                    const tooltipKey = `${char.name}-build-${currentBuildIndex}`;
                                    
                                    if (!currentBuild) return null;
                                    
                                    return (
                                      <BuildTypeTooltipWrapper
                                        buildComposition={currentBuild.buildComposition}
                                        aiStrategy={currentBuild.aiStrategy}
                                        count={currentBuild.activeCount || currentBuild.count}
                                        equippedCapsules={currentBuild.equippedCapsules}
                                        totalCapsuleCost={currentBuild.totalCapsuleCost}
                                        darkMode={darkMode}
                                        tooltipKey={tooltipKey}
                                      />
                                    );
                                  })()}
                                  {char.primaryTeam && (
                                    <div className={`flex items-center justify-between font-semibold text-sm mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                      <span className={`font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Main Team:</span> 
                                      <span className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{char.primaryTeam}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Forms & Transformations - Expandable Per-Form Stats */}
                          {char.hasMultipleForms && char.formStatsArray && char.formStatsArray.length > 0 && (
                            <PerFormStatsDisplayAggregated
                              formStatsArray={char.formStatsArray}
                              formChangeHistoryText={char.formHistory}
                              darkMode={darkMode}
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            )}
          </div>
        )}

        {/* Position-Based Performance Analysis */}
        {((mode === 'reference' && viewType === 'aggregated') || 
          (mode === 'manual' && viewType === 'aggregated' && manualFiles.filter(f => !f.error).length > 0)) && 
          Object.keys(positionData).length > 0 && (
          <div className={`rounded-2xl shadow-xl p-6 mb-6 ${
            darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'
          }`}>
            <div className="flex items-center justify-between mb-6 cursor-pointer" onClick={() => setSectionCollapsed(prev => ({...prev, position: !prev.position}))}>
              <div className="flex items-center gap-3">
                <Users className={`w-8 h-8 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                <div>
                  <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Character Position Analysis</h2>
                  <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Performance breakdown by team position (Lead, Middle, Anchor)
                  </p>
                </div>
              </div>
              <button 
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  darkMode 
                    ? 'bg-green-900 hover:bg-green-800 text-green-400' 
                    : 'bg-green-100 hover:bg-green-200 text-green-600'
                }`}
                title={sectionCollapsed.position ? "Expand section" : "Collapse section"}
              >
                {sectionCollapsed.position ? '+' : '−'}
              </button>
            </div>
            
            {!sectionCollapsed.position && (
            <div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(position => {
                const posData = positionData[position];
                const positionNames = ['Lead', 'Middle', 'Anchor'];
                const positionColors = [
                  { light: 'text-red-600', dark: 'text-red-400', bg: 'bg-red-50', darkBg: 'bg-red-900/20', border: 'border-red-200', darkBorder: 'border-red-600' },
                  { light: 'text-blue-600', dark: 'text-blue-400', bg: 'bg-blue-50', darkBg: 'bg-blue-900/20', border: 'border-blue-200', darkBorder: 'border-blue-600' },
                  { light: 'text-purple-600', dark: 'text-purple-400', bg: 'bg-purple-50', darkBg: 'bg-purple-900/20', border: 'border-purple-200', darkBorder: 'border-purple-600' }
                ];
                const colors = positionColors[position - 1];
                
                return (
                  <div key={position} className={`rounded-xl border p-4 ${
                    darkMode 
                      ? `${colors.darkBg} ${colors.darkBorder}` 
                      : `${colors.bg} ${colors.border}`
                  }`}>
                    <div className="flex items-center gap-2 mb-4">
                      <Target className={`w-5 h-5 ${darkMode ? colors.dark : colors.light}`} />
                      <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                        Position {position}: {positionNames[position - 1]}
                      </h3>
                    </div>
                    
                    <div className={`text-sm mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Total Matches: {posData.totalMatches}
                    </div>
                    
                    {posData.sortedCharacters.length > 0 ? (
                      <div className="space-y-3">
                        {posData.sortedCharacters.slice(0, 5).map((char, idx) => (
                          <div key={idx} className={`p-3 rounded-lg border ${
                            darkMode 
                              ? 'bg-gray-700 border-gray-600' 
                              : 'bg-white border-gray-200'
                          }`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                                {char.name}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded ${
                                darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-100 text-gray-600'
                              }`}>
                                {char.activeMatchCount || char.matchCount} active match{(char.activeMatchCount || char.matchCount) !== 1 ? 'es' : ''}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div>
                                <div className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Avg Damage</div>
                                <div className={`font-medium ${darkMode ? colors.dark : colors.light}`}>
                                  {formatNumber(Math.round(char.avgDamage))}
                                </div>
                              </div>
                              <div>
                                <div className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Avg Taken</div>
                                <div className={`font-medium ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                                  {formatNumber(Math.round(char.avgTaken))}
                                </div>
                              </div>
                              <div>
                                <div className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Battle Time</div>
                                <div className={`font-medium ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                                  {char.avgBattleTime.toFixed(1)}s
                                </div>
                              </div>
                              <div>
                                <div className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>DPS</div>
                                <div className={`font-medium ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                                  {formatNumber(Math.round(char.totalBattleTime > 0 ? char.totalDamage / char.totalBattleTime : 0))}
                                </div>
                              </div>
                              <div>
                                <div className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Efficiency</div>
                                <div className={`font-medium ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                                  {(char.damageEfficiency).toFixed(1)}x
                                </div>
                              </div>
                              <div>
                                <div className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Avg Health</div>
                                <div className={`font-medium ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                                  {formatNumber(Math.round(char.avgHealth))}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {posData.sortedCharacters.length > 5 && (
                          <div className={`text-center text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            +{posData.sortedCharacters.length - 5} more characters...
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className={`text-center text-sm py-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        No data available for this position
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Position Performance Comparison Chart */}
            <div className={`mt-6 p-4 rounded-xl border ${
              darkMode 
                ? 'bg-gray-700 border-gray-600' 
                : 'bg-gray-50 border-gray-200'
            }`}>
              <h4 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                Cross-Position Performance Comparison
              </h4>
              
              {/* Average damage by position */}
              <div className="mb-6">
                <div className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Average Damage Output by Position
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {[1, 2, 3].map(position => {
                    const posData = positionData[position];
                    const avgDamage = posData.sortedCharacters.length > 0 
                      ? posData.sortedCharacters.reduce((sum, char) => sum + char.avgDamage, 0) / posData.sortedCharacters.length
                      : 0;
                    const maxAvgDamage = Math.max(...[1, 2, 3].map(p => {
                      const pData = positionData[p];
                      return pData.sortedCharacters.length > 0 
                        ? pData.sortedCharacters.reduce((sum, char) => sum + char.avgDamage, 0) / pData.sortedCharacters.length
                        : 0;
                    }));
                    const barWidth = maxAvgDamage > 0 ? (avgDamage / maxAvgDamage) * 100 : 0;
                    
                    return (
                      <div key={position} className="text-center">
                        <div className={`text-sm font-medium mb-1 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                          Position {position}
                        </div>
                        <div className={`text-xs mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {formatNumber(Math.round(avgDamage))}
                        </div>
                        <div className={`w-full h-4 rounded ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
                          <div 
                            className={`h-4 rounded transition-all duration-300 ${
                              position === 1 ? 'bg-red-500' : position === 2 ? 'bg-blue-500' : 'bg-purple-500'
                            }`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Character diversity by position */}
              <div className="mb-6">
                <div className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Character Pool Diversity by Position
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  {[1, 2, 3].map(position => {
                    const posData = positionData[position];
                    const uniqueChars = posData.sortedCharacters.length;
                    const maxUniqueChars = Math.max(...[1, 2, 3].map(p => positionData[p].sortedCharacters.length));
                    const diversityScore = maxUniqueChars > 0 ? (uniqueChars / maxUniqueChars) * 100 : 0;
                    
                    return (
                      <div key={position} className={`p-3 rounded-lg ${
                        darkMode ? 'bg-gray-600' : 'bg-white'
                      }`}>
                        <div className={`text-2xl font-bold ${
                          position === 1 ? (darkMode ? 'text-red-400' : 'text-red-600') :
                          position === 2 ? (darkMode ? 'text-blue-400' : 'text-blue-600') :
                          (darkMode ? 'text-purple-400' : 'text-purple-600')
                        }`}>
                          {uniqueChars}
                        </div>
                        <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Unique Characters
                        </div>
                        <div className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                          {diversityScore.toFixed(0)}% diversity
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            
            {/* Position Meta Summary */}
            <div className={`mt-6 p-4 rounded-xl border ${
              darkMode 
                ? 'bg-gray-700 border-gray-600' 
                : 'bg-gray-50 border-gray-200'
            }`}>
              <h4 className={`text-lg font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                Position Meta Summary
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                {[1, 2, 3].map(position => {
                  const posData = positionData[position];
                  const positionNames = ['Lead', 'Middle', 'Anchor'];
                  const topPerformer = posData.sortedCharacters[0];
                  
                  return (
                    <div key={position} className={`p-3 rounded-lg ${
                      darkMode ? 'bg-gray-600' : 'bg-white'
                    }`}>
                      <div className={`font-semibold mb-1 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                        {positionNames[position - 1]} Position
                      </div>
                      {topPerformer ? (
                        <>
                          <div className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            Top: {topPerformer.name}
                          </div>
                          <div className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {formatNumber(Math.round(topPerformer.avgDamage))} avg damage
                          </div>
                          <div className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {posData.sortedCharacters.length} unique characters
                          </div>
                        </>
                      ) : (
                        <div className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          No data available
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Strategic Position Insights */}
            <div className={`mt-6 p-4 rounded-xl border ${
              darkMode 
                ? 'bg-indigo-900/20 border-indigo-600' 
                : 'bg-indigo-50 border-indigo-200'
            }`}>
              <h4 className={`text-lg font-bold mb-3 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                <Target className={`w-5 h-5 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                Strategic Position Insights
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Lead Position Insights */}
                <div className={`p-3 rounded-lg ${
                  darkMode ? 'bg-red-900/20 border border-red-600' : 'bg-red-50 border border-red-200'
                }`}>
                  <div className={`font-semibold mb-2 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                    🥇 Lead Position (1)
                  </div>
                  <div className={`text-sm space-y-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <div>• First to engage opponents</div>
                    <div>• Should have strong neutral game</div>
                    <div>• Often needs good defensive options</div>
                    <div>• Sets the pace for the team</div>
                  </div>
                  {positionData[1]?.sortedCharacters[0] && (
                    <div className={`mt-2 text-xs ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
                      <strong>Top Pick:</strong> {positionData[1].sortedCharacters[0].name}
                    </div>
                  )}
                </div>
                
                {/* Middle Position Insights */}
                <div className={`p-3 rounded-lg ${
                  darkMode ? 'bg-blue-900/20 border border-blue-600' : 'bg-blue-50 border border-blue-200'
                }`}>
                  <div className={`font-semibold mb-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                    🛡️ Middle Position (2)
                  </div>
                  <div className={`text-sm space-y-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <div>• Balanced role and utility</div>
                    <div>• Can support lead or clean up</div>
                    <div>• Often versatile characters</div>
                    <div>• Adapts to team needs</div>
                  </div>
                  {positionData[2]?.sortedCharacters[0] && (
                    <div className={`mt-2 text-xs ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                      <strong>Top Pick:</strong> {positionData[2].sortedCharacters[0].name}
                    </div>
                  )}
                </div>
                
                {/* Anchor Position Insights */}
                <div className={`p-3 rounded-lg ${
                  darkMode ? 'bg-purple-900/20 border border-purple-600' : 'bg-purple-50 border border-purple-200'
                }`}>
                  <div className={`font-semibold mb-2 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                    ⚡ Anchor Position (3)
                  </div>
                  <div className={`text-sm space-y-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <div>• Last character standing</div>
                    <div>• High damage potential needed</div>
                    <div>• Strong comeback mechanics</div>
                    <div>• Often carries the team</div>
                  </div>
                  {positionData[3]?.sortedCharacters[0] && (
                    <div className={`mt-2 text-xs ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>
                      <strong>Top Pick:</strong> {positionData[3].sortedCharacters[0].name}
                    </div>
                  )}
                </div>
              </div>
            </div>
            </div>
            )}
          </div>
        )}

        {/* Meta Analysis Display */}
        {((mode === 'reference' && viewType === 'meta') || 
          (mode === 'manual' && viewType === 'meta' && manualFiles.filter(f => !f.error).length > 0)) && (
          <div className={`rounded-2xl shadow-xl p-6 mb-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center gap-3 mb-6">
              <Database className={`w-8 h-8 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
              <div>
                <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Build Meta Analysis</h2>
                <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Capsule effectiveness and build archetype trends across all matches
                </p>
              </div>
            </div>
            
            <MetaAnalysisContent aggregatedData={aggregatedData} capsuleMap={capsuleMap} aiStrategies={aiStrategies} darkMode={darkMode} />
          </div>
        )}

        {/* Single File Analysis Results */}
        {((mode === 'reference' && (analysisSelectedFilePath || selectedFilePath) && viewType === 'single') || 
          (mode === 'manual' && viewType === 'single' && (analysisFileContent || fileContent))) && (
          <div className={`rounded-2xl shadow-xl p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="mb-2">  
              <div className={`flex items-center text-sm font-medium mb-2 gap-2 ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                <Search className="w-4 h-4" /> Match Selection
              </div>
              <Combobox
                valueId={analysisSelectedFilePath?.[0] || ''}
                items={mode === 'manual' 
                  ? manualFiles.filter(f => !f.error).map(f => ({ id: f.name, name: f.name }))
                  : Array.isArray(fileContent) 
                    ? fileContent.filter(fc => fc.name).map(fc => ({ id: fc.name, name: fc.name }))
                    : []
                }
                placeholder="Search match to analyze..."
                onSelect={(id, name) => handleHeaderFileSelect(id)}
                getName={(item) => getFileNameFromPath(item.name)}
                darkMode={darkMode}
                focusColor="blue"
                showTooltip={false}
              />
            </div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <FileText className={`w-8 h-8 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                <div>
                  <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Match Analysis</h2>
                  <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Detailed breakdown of this battle</p>
                </div>
              </div>
            </div>
            
            {/* Match Outcome Summary */}

            {battleWinLose && (
              <div className={`mb-6 p-4 rounded-xl border text-center ${
                battleWinLose === 'Win'
                  ? (darkMode 
                      ? 'bg-green-900/20 border-green-600 text-green-400' 
                      : 'bg-green-50 border-green-200 text-green-800')
                  : (darkMode 
                      ? 'bg-red-900/20 border-red-600 text-red-400' 
                      : 'bg-red-50 border-red-200 text-red-800')
              }`}>
                <div className="flex items-center justify-center gap-3">
                  <div>
                    <div className="text-lg font-bold">
                      {battleWinLose === 'Win' ? `${p1TeamName} Victory!` : `${p2TeamName} Victory!`}
                    </div>
                    <div className="text-sm opacity-80">
                      {battleWinLose === 'Win' 
                        ? `${p1TeamName} emerged victorious in this battle` 
                        : `${p2TeamName} emerged victorious in this battle`}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* P1 Team */}
              <div className={`rounded-xl p-6 border ${
                darkMode 
                  ? battleWinLose === 'Win' 
                    ? 'border-green-600 bg-green-900/10' 
                    : 'border-red-600 bg-red-900/10'
                  : battleWinLose === 'Win'
                    ? 'border-green-300 bg-green-50'
                    : 'border-red-300 bg-red-50'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Users className={`w-6 h-6 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                    <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{p1TeamName}</h3>
                    {battleWinLose && (
                      <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                        battleWinLose === 'Win' 
                          ? (darkMode ? 'bg-green-900/50 text-green-400 border border-green-600' : 'bg-green-100 text-green-800 border border-green-200')
                          : (darkMode ? 'bg-red-900/50 text-red-400 border border-red-600' : 'bg-red-100 text-red-800 border border-red-200')
                      }`}>
                        {battleWinLose === 'Win' ? 'VICTORY' : 'DEFEAT'}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <StatBar 
                    value={p1Summary.totalDamage} 
                    maxValue={Math.max(p1Summary.totalDamage, p2Summary.totalDamage)} 
                    type="damage" 
                    label="Total Damage"
                    icon={Target}
                    darkMode={darkMode}
                  />
                  <StatBar 
                    value={(p1Summary.totalHealth / p1Summary.totalHPGaugeValueMax) * 100} 
                    maxValue={100} 
                    displayValue={p1Summary.totalHealth}
                    type="health" 
                    label="HP Remaining"
                    icon={Heart}
                    darkMode={darkMode}
                  />
                  <StatBar 
                    value={p1Summary.totalUltimates} 
                    maxValue={Math.max(p1Summary.totalUltimates, p2Summary.totalUltimates)} 
                    type="ultimate" 
                    label="Ultimates Used"
                    icon={Zap}
                    darkMode={darkMode}
                  />
                </div>

                <h4 className={`font-bold mb-3 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  <Swords className="w-5 h-5" />
                  Characters
                </h4>
                <div className="space-y-3">
                  {(() => {
                    // Collect all character performance scores from both teams for relative scoring
                    const allMatchScores = [...p1Team, ...p2Team].map(char => {
                      const stats = extractStats(char, charMap, capsuleMap, 0, aiStrategies);
                      return calculateMatchPerformanceScore(stats);
                    });
                    
                    return p1Team.map((char, i) => {
                      const stats = extractStats(char, charMap, capsuleMap, i + 1, aiStrategies);
                      const performanceScore = calculateMatchPerformanceScore(stats);
                      const efficiency = stats.damageTaken > 0 ? (stats.damageDone / stats.damageTaken).toFixed(2) : '∞';
                      const dps = stats.battleTime > 0 ? Math.round(stats.damageDone / stats.battleTime) : 0;
                      const play = char.battlePlayCharacter || {};
                      
                      return (
                        <div key={i} className={`rounded-lg p-4 border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                          {/* Header: Name with KOs, Performance Score */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h5 className={`font-semibold text-lg ${darkMode ? 'text-white' : 'text-gray-800'}`}>{stats.name}</h5>
                              <div className="flex items-center gap-2 mt-1">
                                <Trophy className={`w-4 h-4 ${darkMode ? 'text-yellow-400' : 'text-yellow-500'}`} />
                                <span className={`text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{stats.kills} KOs</span>
                              </div>
                            </div>
                            <PerformanceScoreBadge score={performanceScore} label="Score" size="small" darkMode={darkMode} allScores={allMatchScores} />
                          </div>
                          
                          {/* Combat Performance Section */}
                        <StatGroup title="Combat Performance" icon={Target} darkMode={darkMode} iconColor="red">
                          <div className="flex items-center justify-between gap-4">
                            <div className="text-center">
                              <div className={`font-bold text-lg ${darkMode ? 'text-red-400' : 'text-red-600'}`}>{formatNumber(stats.damageDone)}</div>
                              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Damage Done</div>
                            </div>
                            <div className="text-center">
                              <div className={`font-bold text-lg ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{formatNumber(stats.damageTaken)}</div>
                              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Damage Taken</div>
                            </div>
                            <div className="text-center">
                              <div className={`font-bold text-lg ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>{efficiency}×</div>
                              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Efficiency</div>
                            </div>
                            <div className="text-center">
                              <div className={`font-bold text-lg ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>{formatNumber(dps)}</div>
                              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>DPS</div>
                            </div>
                            <div className="text-center">
                              <div className={`font-bold text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{formatBattleTime(stats.battleTime)}</div>
                              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Battle Time</div>
                            </div>
                          </div>
                        </StatGroup>
                        
                        {/* Survival & Health Section */}
                        <StatGroup title="Survival & Health" icon={Heart} darkMode={darkMode} iconColor="green" collapsible={true} defaultCollapsed={false}>
                          <div className="mb-2">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>HP Remaining</span>
                              <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                {formatNumber(stats.hPGaugeValue)} / {formatNumber(stats.hPGaugeValueMax)} ({Math.round((stats.hPGaugeValue / stats.hPGaugeValueMax) * 100)}%)
                              </span>
                            </div>
                            <div className={`w-full rounded-full h-2 ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
                              <div 
                                className="h-2 rounded-full bg-green-500"
                                style={{ width: `${(stats.hPGaugeValue / stats.hPGaugeValueMax) * 100}%` }}
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <MetricDisplay label="Guards" value={stats.guardCount} icon={Shield} color="green" darkMode={darkMode} size="small" />
                            {stats.zCounterCount > 0 && (
                              <MetricDisplay label="Z-Counters" value={stats.zCounterCount} color="blue" darkMode={darkMode} size="small" />
                            )}
                            {stats.superCounterCount > 0 && (
                              <MetricDisplay label="Super Counters" value={stats.superCounterCount} color="purple" darkMode={darkMode} size="small" />
                            )}
                            {stats.revengeCounterCount > 0 && (
                              <MetricDisplay label="Revenge Counters" value={stats.revengeCounterCount} color="orange" darkMode={darkMode} size="small" />
                            )}
                            {stats.tags > 0 && (
                              <MetricDisplay label="Tags" value={stats.tags} color="teal" darkMode={darkMode} size="small" />
                            )}
                          </div>
                        </StatGroup>
                        
                        {/* Special Abilities Section */}
                        <StatGroup title="Special Abilities" icon={Zap} darkMode={darkMode} iconColor="yellow" collapsible={true} defaultCollapsed={false}>
                          {stats.hasAdditionalCounts ? (
                            // New format - show hit/thrown/rate for all blast types
                            <div className="space-y-3">
                              <BlastMetricDisplay 
                                label="Super 1 Blast" 
                                thrown={stats.s1Blast || 0}
                                hit={stats.s1HitBlast || 0}
                                hitRate={stats.s1HitRate ?? null}
                                color="yellow"
                                darkMode={darkMode}
                                size="small"
                                legacyMode={false}
                              />
                              
                              <BlastMetricDisplay 
                                label="Super 2 Blast" 
                                thrown={stats.s2Blast || 0}
                                hit={stats.s2HitBlast || 0}
                                hitRate={stats.s2HitRate ?? null}
                                color="yellow"
                                darkMode={darkMode}
                                size="small"
                                legacyMode={false}
                              />
                              
                              <BlastMetricDisplay 
                                label="Ultimate Blast" 
                                thrown={stats.ultBlast || 0}
                                hit={stats.uLTHitBlast || 0}
                                hitRate={stats.ultHitRate ?? null}
                                color="cyan"
                                darkMode={darkMode}
                                size="small"
                                legacyMode={false}
                              />
                              
                              {/* Other Abilities (always shown) */}
                              <div className={`grid grid-cols-2 gap-2 pt-3 ${
                                darkMode ? 'border-t border-gray-600' : 'border-t border-gray-300'
                              }`}>
                                <MetricDisplay label="Skill 1" value={stats.exa1Count} color="purple" darkMode={darkMode} size="small" />
                                <MetricDisplay label="Skill 2" value={stats.exa2Count} color="purple" darkMode={darkMode} size="small" />
                                <MetricDisplay label="Ki Charges" value={stats.chargeCount} color="blue" darkMode={darkMode} size="small" />
                                <MetricDisplay label="Ki Blasts" value={stats.shotEnergyBulletCount} color="blue" darkMode={darkMode} size="small" />
                                <MetricDisplay label="Sparking Mode" value={stats.sparkingCount} color="yellow" darkMode={darkMode} size="small" />
                                <MetricDisplay label="Dragon Dash Mileage" value={stats.dragonDashMileage} color="gray" darkMode={darkMode} size="small" />
                              </div>
                            </div>
                          ) : (
                            // Old format - show only thrown count for blast types
                            <div className="space-y-3">
                              <BlastMetricDisplay 
                                label="Super 1 Blast" 
                                thrown={stats.spm1Count || 0}
                                color="yellow"
                                darkMode={darkMode}
                                size="small"
                                legacyMode={true}
                              />
                              
                              <BlastMetricDisplay 
                                label="Super 2 Blast" 
                                thrown={stats.spm2Count || 0}
                                color="yellow"
                                darkMode={darkMode}
                                size="small"
                                legacyMode={true}
                              />
                              
                              <BlastMetricDisplay 
                                label="Ultimate Blast" 
                                thrown={stats.ultimatesUsed || 0}
                                color="cyan"
                                darkMode={darkMode}
                                size="small"
                                legacyMode={true}
                              />
                              
                              {/* Other Abilities (always shown) */}
                              <div className={`grid grid-cols-2 gap-2 pt-3 ${
                                darkMode ? 'border-t border-gray-600' : 'border-t border-gray-300'
                              }`}>
                                <MetricDisplay label="Skill 1" value={stats.exa1Count} color="purple" darkMode={darkMode} size="small" />
                                <MetricDisplay label="Skill 2" value={stats.exa2Count} color="purple" darkMode={darkMode} size="small" />
                                <MetricDisplay label="Ki Charges" value={stats.chargeCount} color="blue" darkMode={darkMode} size="small" />
                                <MetricDisplay label="Ki Blasts" value={stats.shotEnergyBulletCount} color="blue" darkMode={darkMode} size="small" />
                                <MetricDisplay label="Sparking Mode" value={stats.sparkingCount} color="yellow" darkMode={darkMode} size="small" />
                                <MetricDisplay label="Dragon Dash Mileage" value={stats.dragonDashMileage} color="gray" darkMode={darkMode} size="small" />
                              </div>
                            </div>
                          )}
                        </StatGroup>

                        {/* Combat Mechanics Section (Collapsible) */}
                        <StatGroup title="Combat Mechanics" icon={Swords} darkMode={darkMode} collapsible={true} defaultCollapsed={true}>
                          <div className="space-y-1">
                            <MetricDisplay label="Max Combo" value={stats.maxComboNum} color="purple" darkMode={darkMode} size="small" />
                            <MetricDisplay label="Max Combo Damage" value={formatNumber(stats.maxComboDamage)} color="red" darkMode={darkMode} size="small" />
                            <MetricDisplay label="Throws" value={stats.throwCount} color="gray" darkMode={darkMode} size="small" />
                            <MetricDisplay label="Lightning Attacks" value={stats.lightningAttackCount} color="yellow" darkMode={darkMode} size="small" />
                            <MetricDisplay label="Vanishing Attacks" value={stats.vanishingAttackCount} color="blue" darkMode={darkMode} size="small" />
                            <MetricDisplay label="Dragon Homing" value={stats.dragonHomingCount} color="purple" darkMode={darkMode} size="small" />
                            {stats.speedImpactCount > 0 && (
                              <>
                                <MetricDisplay label="Speed Impacts" value={stats.speedImpactCount} color="red" darkMode={darkMode} size="small" />
                                <MetricDisplay label="Speed Impact Wins" value={stats.speedImpactWins} color="green" darkMode={darkMode} size="small" />
                              </>
                            )}
                          </div>
                        </StatGroup>
                        
                        {/* Build Section (Collapsible) */}
                        <StatGroup title="Build" icon={Star} darkMode={darkMode} collapsible={true} defaultCollapsed={true}>
                          <BuildDisplay stats={stats} showDetailed={true} darkMode={darkMode} />
                        </StatGroup>
                        
                        {/* Forms Used Display - Expandable Per-Form Stats */}
                        <PerFormStatsDisplay
                          characterRecord={char}
                          characterIdRecord={characterIdRecord}
                          formChangeHistory={char.formChangeHistory}
                          formChangeHistoryText={stats.formChangeHistory}
                          originalCharacterId={play.originalCharacter?.key}
                          charMap={charMap}
                          darkMode={darkMode}
                        />
                      </div>
                    );
                  });
                })()}
                </div>
              </div>

              {/* P2 Team */}
              <div className={`rounded-xl p-6 border ${
                darkMode 
                  ? battleWinLose === 'Lose' 
                    ? 'border-green-600 bg-green-900/10' 
                    : 'border-red-600 bg-red-900/10'
                  : battleWinLose === 'Lose'
                    ? 'border-green-300 bg-green-50'
                    : 'border-red-300 bg-red-50'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Users className={`w-6 h-6 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />
                    <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{p2TeamName}</h3>
                    {battleWinLose && (
                      <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                        battleWinLose === 'Lose' 
                          ? (darkMode ? 'bg-green-900/50 text-green-400 border border-green-600' : 'bg-green-100 text-green-800 border border-green-200')
                          : (darkMode ? 'bg-red-900/50 text-red-400 border border-red-600' : 'bg-red-100 text-red-800 border border-red-200')
                      }`}>
                        {battleWinLose === 'Lose' ? 'VICTORY' : 'DEFEAT'}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <StatBar 
                    value={p2Summary.totalDamage} 
                    maxValue={Math.max(p1Summary.totalDamage, p2Summary.totalDamage)} 
                    type="damage" 
                    label="Total Damage"
                    icon={Target}
                    darkMode={darkMode}
                  />
                  <StatBar 
                    value={(p2Summary.totalHealth / p2Summary.totalHPGaugeValueMax) * 100} 
                    maxValue={100} 
                    displayValue={p2Summary.totalHealth}
                    type="health" 
                    label="HP Remaining"
                    icon={Heart}
                    darkMode={darkMode}
                  />
                  <StatBar 
                    value={p2Summary.totalUltimates} 
                    maxValue={Math.max(p1Summary.totalUltimates, p2Summary.totalUltimates)} 
                    type="ultimate" 
                    label="Ultimates Used"
                    icon={Zap}
                    darkMode={darkMode}
                  />
                </div>

                <h4 className={`font-bold mb-3 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  <Swords className="w-5 h-5" />
                  Characters
                </h4>
                <div className="space-y-3">
                  {(() => {
                    // Collect all character performance scores from both teams for relative scoring
                    const allMatchScores = [...p1Team, ...p2Team].map(char => {
                      const stats = extractStats(char, charMap, capsuleMap, 0, aiStrategies);
                      return calculateMatchPerformanceScore(stats);
                    });
                    
                    return p2Team.map((char, i) => {
                      const stats = extractStats(char, charMap, capsuleMap, i + 1, aiStrategies);
                      const performanceScore = calculateMatchPerformanceScore(stats);
                      const efficiency = stats.damageTaken > 0 ? (stats.damageDone / stats.damageTaken).toFixed(2) : '∞';
                      const dps = stats.battleTime > 0 ? Math.round(stats.damageDone / stats.battleTime) : 0;
                      const play = char.battlePlayCharacter || {};
                      
                      return (
                        <div key={i} className={`rounded-lg p-4 border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                          {/* Header: Name with KOs, Performance Score */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h5 className={`font-semibold text-lg ${darkMode ? 'text-white' : 'text-gray-800'}`}>{stats.name}</h5>
                              <div className="flex items-center gap-2 mt-1">
                                <Trophy className={`w-4 h-4 ${darkMode ? 'text-yellow-400' : 'text-yellow-500'}`} />
                                <span className={`text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{stats.kills} KOs</span>
                              </div>
                            </div>
                            <PerformanceScoreBadge score={performanceScore} label="Score" size="small" darkMode={darkMode} allScores={allMatchScores} />
                          </div>
                          
                          {/* Combat Performance Section */}
                        <StatGroup title="Combat Performance" icon={Target} darkMode={darkMode} iconColor="red">
                          <div className="flex items-center justify-between gap-4">
                            <div className="text-center">
                              <div className={`font-bold text-lg ${darkMode ? 'text-red-400' : 'text-red-600'}`}>{formatNumber(stats.damageDone)}</div>
                              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Damage Done</div>
                            </div>
                            <div className="text-center">
                              <div className={`font-bold text-lg ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{formatNumber(stats.damageTaken)}</div>
                              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Damage Taken</div>
                            </div>
                            <div className="text-center">
                              <div className={`font-bold text-lg ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>{efficiency}×</div>
                              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Efficiency</div>
                            </div>
                            <div className="text-center">
                              <div className={`font-bold text-lg ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>{formatNumber(dps)}</div>
                              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>DPS</div>
                            </div>
                            <div className="text-center">
                              <div className={`font-bold text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{formatBattleTime(stats.battleTime)}</div>
                              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Battle Time</div>
                            </div>
                          </div>
                        </StatGroup>
                        
                        {/* Survival & Health Section */}
                        <StatGroup title="Survival & Health" icon={Heart} darkMode={darkMode} iconColor="green" collapsible={true} defaultCollapsed={false}>
                          <div className="mb-2">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>HP Remaining</span>
                              <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                {formatNumber(stats.hPGaugeValue)} / {formatNumber(stats.hPGaugeValueMax)} ({Math.round((stats.hPGaugeValue / stats.hPGaugeValueMax) * 100)}%)
                              </span>
                            </div>
                            <div className={`w-full rounded-full h-2 ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
                              <div 
                                className="h-2 rounded-full bg-green-500"
                                style={{ width: `${(stats.hPGaugeValue / stats.hPGaugeValueMax) * 100}%` }}
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <MetricDisplay label="Guards" value={stats.guardCount} icon={Shield} color="green" darkMode={darkMode} size="small" />
                            {stats.zCounterCount > 0 && (
                              <MetricDisplay label="Z-Counters" value={stats.zCounterCount} color="blue" darkMode={darkMode} size="small" />
                            )}
                            {stats.superCounterCount > 0 && (
                              <MetricDisplay label="Super Counters" value={stats.superCounterCount} color="purple" darkMode={darkMode} size="small" />
                            )}
                            {stats.revengeCounterCount > 0 && (
                              <MetricDisplay label="Revenge Counters" value={stats.revengeCounterCount} color="orange" darkMode={darkMode} size="small" />
                            )}
                            {stats.tags > 0 && (
                              <MetricDisplay label="Tags" value={stats.tags} color="teal" darkMode={darkMode} size="small" />
                            )}
                          </div>
                        </StatGroup>
                        
                        {/* Special Abilities Section */}
                        <StatGroup title="Special Abilities" icon={Zap} darkMode={darkMode} iconColor="yellow" collapsible={true} defaultCollapsed={false}>
                          {stats.hasAdditionalCounts ? (
                            // New format - show hit/thrown/rate for all blast types
                            <div className="space-y-3">
                              <BlastMetricDisplay 
                                label="Super 1 Blast" 
                                thrown={stats.s1Blast || 0}
                                hit={stats.s1HitBlast || 0}
                                hitRate={stats.s1HitRate ?? null}
                                color="yellow"
                                darkMode={darkMode}
                                size="small"
                                legacyMode={false}
                              />
                              
                              <BlastMetricDisplay 
                                label="Super 2 Blast" 
                                thrown={stats.s2Blast || 0}
                                hit={stats.s2HitBlast || 0}
                                hitRate={stats.s2HitRate ?? null}
                                color="yellow"
                                darkMode={darkMode}
                                size="small"
                                legacyMode={false}
                              />
                              
                              <BlastMetricDisplay 
                                label="Ultimate Blast" 
                                thrown={stats.ultBlast || 0}
                                hit={stats.uLTHitBlast || 0}
                                hitRate={stats.ultHitRate ?? null}
                                color="cyan"
                                darkMode={darkMode}
                                size="small"
                                legacyMode={false}
                              />
                              
                              {/* Other Abilities (always shown) */}
                              <div className={`grid grid-cols-2 gap-2 pt-3 ${
                                darkMode ? 'border-t border-gray-600' : 'border-t border-gray-300'
                              }`}>
                                <MetricDisplay label="Skill 1" value={stats.exa1Count} color="purple" darkMode={darkMode} size="small" />
                                <MetricDisplay label="Skill 2" value={stats.exa2Count} color="purple" darkMode={darkMode} size="small" />
                                <MetricDisplay label="Ki Charges" value={stats.chargeCount} color="blue" darkMode={darkMode} size="small" />
                                <MetricDisplay label="Ki Blasts" value={stats.shotEnergyBulletCount} color="blue" darkMode={darkMode} size="small" />
                                <MetricDisplay label="Sparking Mode" value={stats.sparkingCount} color="yellow" darkMode={darkMode} size="small" />
                                <MetricDisplay label="Dragon Dash Mileage" value={stats.dragonDashMileage} color="gray" darkMode={darkMode} size="small" />
                              </div>
                            </div>
                          ) : (
                            // Old format - show only thrown count for blast types
                            <div className="space-y-3">
                              <BlastMetricDisplay 
                                label="Super 1 Blast" 
                                thrown={stats.spm1Count || 0}
                                color="yellow"
                                darkMode={darkMode}
                                size="small"
                                legacyMode={true}
                              />
                              
                              <BlastMetricDisplay 
                                label="Super 2 Blast" 
                                thrown={stats.spm2Count || 0}
                                color="yellow"
                                darkMode={darkMode}
                                size="small"
                                legacyMode={true}
                              />
                              
                              <BlastMetricDisplay 
                                label="Ultimate Blast" 
                                thrown={stats.ultimatesUsed || 0}
                                color="cyan"
                                darkMode={darkMode}
                                size="small"
                                legacyMode={true}
                              />
                              
                              {/* Other Abilities (always shown) */}
                              <div className={`grid grid-cols-2 gap-2 pt-3 ${
                                darkMode ? 'border-t border-gray-600' : 'border-t border-gray-300'
                              }`}>
                                <MetricDisplay label="Skill 1" value={stats.exa1Count} color="purple" darkMode={darkMode} size="small" />
                                <MetricDisplay label="Skill 2" value={stats.exa2Count} color="purple" darkMode={darkMode} size="small" />
                                <MetricDisplay label="Ki Charges" value={stats.chargeCount} color="blue" darkMode={darkMode} size="small" />
                                <MetricDisplay label="Ki Blasts" value={stats.shotEnergyBulletCount} color="blue" darkMode={darkMode} size="small" />
                                <MetricDisplay label="Sparking Mode" value={stats.sparkingCount} color="yellow" darkMode={darkMode} size="small" />
                                <MetricDisplay label="Dragon Dash Mileage" value={stats.dragonDashMileage} color="gray" darkMode={darkMode} size="small" />
                              </div>
                            </div>
                          )}
                        </StatGroup>

                        {/* Combat Mechanics Section (Collapsible) */}
                        <StatGroup title="Combat Mechanics" icon={Swords} darkMode={darkMode} collapsible={true} defaultCollapsed={true}>
                          <div className="space-y-1">
                            <MetricDisplay label="Max Combo" value={stats.maxComboNum} color="purple" darkMode={darkMode} size="small" />
                            <MetricDisplay label="Max Combo Damage" value={formatNumber(stats.maxComboDamage)} color="red" darkMode={darkMode} size="small" />
                            <MetricDisplay label="Throws" value={stats.throwCount} color="gray" darkMode={darkMode} size="small" />
                            <MetricDisplay label="Lightning Attacks" value={stats.lightningAttackCount} color="yellow" darkMode={darkMode} size="small" />
                            <MetricDisplay label="Vanishing Attacks" value={stats.vanishingAttackCount} color="blue" darkMode={darkMode} size="small" />
                            <MetricDisplay label="Dragon Homing" value={stats.dragonHomingCount} color="purple" darkMode={darkMode} size="small" />
                            {stats.speedImpactCount > 0 && (
                              <>
                                <MetricDisplay label="Speed Impacts" value={stats.speedImpactCount} color="red" darkMode={darkMode} size="small" />
                                <MetricDisplay label="Speed Impact Wins" value={stats.speedImpactWins} color="green" darkMode={darkMode} size="small" />
                              </>
                            )}
                          </div>
                        </StatGroup>
                        
                        {/* Build Section (Collapsible) */}
                        <StatGroup title="Build" icon={Star} darkMode={darkMode} collapsible={true} defaultCollapsed={true}>
                          <BuildDisplay stats={stats} showDetailed={true} darkMode={darkMode} />
                        </StatGroup>
                        
                        {/* Forms Used Display - Expandable Per-Form Stats */}
                        <PerFormStatsDisplay
                          characterRecord={char}
                          characterIdRecord={characterIdRecord}
                          formChangeHistory={char.formChangeHistory}
                          formChangeHistoryText={stats.formChangeHistory}
                          originalCharacterId={play.originalCharacter?.key}
                          charMap={charMap}
                          darkMode={darkMode}
                        />
                      </div>
                    );
                  });
                })()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Data Tables View */}
        {((mode === 'reference' && viewType === 'tables') || 
          (mode === 'manual' && viewType === 'tables' && manualFiles.filter(f => !f.error).length > 0)) && (
          <div className="space-y-6">
            {/* Character Statistics Table */}
            {aggregatedData && Object.keys(aggregatedData).length > 0 && (
              <>
                {/* Excel Export Button */}
                <div className={`rounded-2xl shadow-xl p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Export Data Tables
                      </h3>
                      <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Download all data tables to Excel (.xlsx) with full formatting
                      </p>
                    </div>
                    <button
                      onClick={handleExcelExport}
                      className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl ${
                        darkMode 
                          ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                          : 'bg-blue-500 hover:bg-blue-600 text-white'
                      }`}
                    >
                      <Download size={20} />
                      Export to Excel
                    </button>
                  </div>
                </div>

                {/* Character Averages Table */}
                <div className={`rounded-2xl shadow-xl p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <div className="mb-4">
                    <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Character Performance Averages
                    </h3>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Aggregated statistics showing overall performance across all matches
                    </p>
                  </div>
                  <DataTable
                    data={prepareCharacterAveragesData(aggregatedData)}
                    columns={getCharacterAveragesTableConfig(darkMode).columns}
                    title="Character Performance Averages"
                    exportFileName={`character_averages_${new Date().toISOString().split('T')[0]}`}
                    onExport={handleCharacterAveragesExport}
                    darkMode={darkMode}
                    selectable={true}
                    onSelectionChange={(selectedRows) => {
                      console.log('Selected characters (averages):', selectedRows);
                    }}
                  />
                </div>

                {/* Match Details Table */}
                <div className={`rounded-2xl shadow-xl p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <div className="mb-4">
                    <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Individual Match Performance Details
                    </h3>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Per-match statistics for detailed analysis and trend identification
                    </p>
                  </div>
                  <DataTable
                    data={prepareMatchDetailsData(aggregatedData)}
                    columns={getMatchDetailsTableConfig(darkMode).columns}
                    title="Individual Match Performance Details"
                    exportFileName={`match_details_${new Date().toISOString().split('T')[0]}`}
                    onExport={handleMatchDetailsExport}
                    darkMode={darkMode}
                    selectable={true}
                    onSelectionChange={(selectedRows) => {
                      console.log('Selected match details:', selectedRows);
                    }}
                  />
                </div>
              </>
            )}

            {/* Position Analysis Table - DISABLED FOR NOW */}
            {/* {positionData && Object.keys(positionData).length > 0 && (
              <div className={`rounded-2xl shadow-xl p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <DataTable
                  data={preparePositionData(positionData)}
                  columns={getPositionTableConfig(darkMode).columns}
                  title="Position-Based Performance Analysis"
                  exportFileName={`position_analysis_${new Date().toISOString().split('T')[0]}`}
                  onExport={(exportData, filename) => {
                    console.log('Position data export requested:', { exportData, filename });
                  }}
                  darkMode={darkMode}
                  selectable={true}
                  onSelectionChange={(selectedRows) => {
                    console.log('Selected position data:', selectedRows);
                  }}
                />
              </div>
            )} */}

            {/* Meta Analysis Table - DISABLED FOR NOW */}
            {/* {aggregatedData && Object.keys(aggregatedData).length > 0 && (
              <div className={`rounded-2xl shadow-xl p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <DataTable
                  data={(() => {
                    // Create meta data from aggregated character data
                    const capsuleUsage = {};
                    Object.values(aggregatedData).forEach(char => {
                      if (char.equippedCapsules) {
                        char.equippedCapsules.forEach(capsule => {
                          if (!capsuleUsage[capsule.id]) {
                            capsuleUsage[capsule.id] = {
                              name: capsule.name,
                              usage: 0,
                              winRate: 0,
                              characterCount: 0,
                              type: capsule.type || 'Capsule'
                            };
                          }
                          capsuleUsage[capsule.id].usage++;
                          capsuleUsage[capsule.id].winRate += char.winRate || 0;
                          capsuleUsage[capsule.id].characterCount++;
                        });
                      }
                    });
                    
                    return Object.values(capsuleUsage)
                      .map(capsule => ({
                        ...capsule,
                        winRate: Math.round(capsule.winRate / capsule.characterCount)
                      }))
                      .sort((a, b) => b.usage - a.usage)
                      .slice(0, 50); // Top 50 capsules
                  })()}
                  columns={getMetaTableConfig(darkMode).columns}
                  title="Capsule Meta Analysis"
                  exportFileName={`meta_analysis_${new Date().toISOString().split('T')[0]}`}
                  onExport={(exportData, filename) => {
                    console.log('Meta data export requested:', { exportData, filename });
                  }}
                  darkMode={darkMode}
                  selectable={true}
                  onSelectionChange={(selectedRows) => {
                    console.log('Selected meta data:', selectedRows);
                  }}
                />
              </div>
            )} */}
          </div>
        )}

        {/* Team Rankings Display */}
        {((mode === 'reference' && viewType === 'teams') || 
          (mode === 'manual' && viewType === 'teams' && manualFiles.filter(f => !f.error).length > 0)) && (
          <div className={`rounded-2xl shadow-xl p-6 mb-6 ${
            darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'
          }`}>
            <div className="flex items-center gap-3 mb-6">
              <Users className={`w-8 h-8 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
              <div>
                <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Team Rankings</h2>
                <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Teams ranked by win rate from {mode === 'reference' ? 1 : manualFiles.filter(f => !f.error).length} battle file{(mode === 'reference' ? 1 : manualFiles.filter(f => !f.error).length) !== 1 ? 's' : ''}
                </p>
                <p className={`text-sm ${darkMode ? 'text-amber-400' : 'text-amber-600'} mt-1`}>
                  Team stats calculated from top 5 characters by combat performance score
                </p>
              </div>
            </div>
            
            {teamAggregatedData.length === 0 ? (
              <div className={`text-center py-12 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Team Data Available</h3>
                <p className="text-sm">
                  The uploaded files don't contain team information in the expected format.
                  <br />
                  Make sure your battle result files include team names in the 'teams' array.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
              {teamAggregatedData.map((team, i) => {
                const expanded = expandedRows[`team_${i}`] || false;
                
                return (
                  <div key={team.teamName} className={`p-1 rounded-xl border transition-all ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 hover:border-gray-500' 
                      : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                  }`}>
                    <div 
                      className="p-3 cursor-pointer"
                      onClick={() => toggleRow('team', i)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`text-2xl font-bold ${
                            i === 0 ? 'text-yellow-500' : 
                            i === 1 ? 'text-gray-400' : 
                            i === 2 ? 'text-orange-600' :
                            darkMode ? 'text-gray-300' : 'text-gray-600'
                          }`}>
                            #{i + 1}
                          </div>
                          <div>
                            <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                              {team.teamName}
                            </h3>
                            <div className="flex items-center gap-4 text-sm">
                              <span className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                {team.matches} matches
                              </span>
                              <span className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                {team.wins}W - {team.losses}L
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <div className={`text-2xl font-bold ${
                              team.winRate >= 75 ? 'text-green-600' :
                              team.winRate >= 50 ? 'text-yellow-400' :
                              'text-red-600'
                            }`}>
                              {team.winRate.toFixed(1)}%
                            </div>
                            <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              Win Rate
                            </div>
                          </div>
                          
                          <div className="text-center">
                            <div className={`text-lg font-bold ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                              {team.top5Efficiency ? team.top5Efficiency.toFixed(2) : '0.00'}×
                            </div>
                            <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              Damage Efficiency
                            </div>
                          </div>
                          
                          <div className="text-center">
                            <div className={`text-lg font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                              {team.avgHealthRetention.toFixed(1)}%
                            </div>
                            <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              HP Retention
                            </div>
                          </div>
                          
                          <div className="text-center">
                            <div className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                              {team.uniqueCharactersUsed}
                            </div>
                            <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              Characters Used
                            </div>
                          </div>
                          
                          {expanded ? (
                            <ChevronUp className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                          ) : (
                            <ChevronDown className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {expanded && (
                      <div className={`px-6 pb-6 border-t ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                        {/* Top 5 Performance Stats - Compact Grid */}
                        <div className="mt-4">
                          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg mb-2 ${
                            darkMode ? 'bg-amber-900/30 border border-amber-700/50' : 'bg-amber-50 border border-amber-200'
                          }`}>
                            <Users className={`w-4 h-4 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`} />
                            <span className={`text-sm font-semibold ${darkMode ? 'text-amber-300' : 'text-amber-700'}`}>
                              Top 5 Character Stats
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-2">
                            <div className={`p-3 rounded-lg border ${darkMode ? 'bg-gray-600 border-gray-500' : 'bg-white border-gray-200'}`}>
                              <div className={`text-xs font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                Avg Damage Dealt
                              </div>
                              <div className={`text-base font-bold ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                                {formatNumber(team.avgDamagePerMatch)}
                              </div>
                            </div>
                            
                            <div className={`p-3 rounded-lg border ${darkMode ? 'bg-gray-600 border-gray-500' : 'bg-white border-gray-200'}`}>
                              <div className={`text-xs font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                Avg Damage Taken
                              </div>
                              <div className={`text-base font-bold ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
                                {formatNumber(team.avgDamageTakenPerMatch)}
                              </div>
                            </div>
                            
                            <div className={`p-3 rounded-lg border ${darkMode ? 'bg-gray-600 border-gray-500' : 'bg-white border-gray-200'}`}>
                              <div className={`text-xs font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                Efficiency
                              </div>
                              <div className={`text-base font-bold ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                                {team.top5Efficiency ? team.top5Efficiency.toFixed(2) : '0.00'}×
                              </div>
                            </div>
                            
                            <div className={`p-3 rounded-lg border ${darkMode ? 'bg-gray-600 border-gray-500' : 'bg-white border-gray-200'}`}>
                              <div className={`text-xs font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                DPS
                              </div>
                              <div className={`text-base font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                                {Math.round(team.top5DPS || 0).toLocaleString()}
                              </div>
                            </div>
                            
                            <div className={`p-3 rounded-lg border ${darkMode ? 'bg-gray-600 border-gray-500' : 'bg-white border-gray-200'}`}>
                              <div className={`text-xs font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                Avg Match Duration
                              </div>
                              <div className={`text-base font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                                {Math.floor((team.top5AvgMatchDuration || 0) / 60)}:{String((team.top5AvgMatchDuration || 0) % 60).padStart(2, '0')}
                              </div>
                            </div>
                            
                            <div className={`p-3 rounded-lg border ${darkMode ? 'bg-gray-600 border-gray-500' : 'bg-white border-gray-200'}`}>
                              <div className={`text-xs font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                HP Retention
                              </div>
                              <div className={`text-base font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                                {team.avgHealthRetention.toFixed(1)}%
                              </div>
                            </div>
                            
                            <div className={`p-3 rounded-lg border ${darkMode ? 'bg-gray-600 border-gray-500' : 'bg-white border-gray-200'}`}>
                              <div className={`text-xs font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                Avg HP Remaining
                              </div>
                              <div className={`text-base font-bold ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                {formatNumber(team.top5AvgHPRemaining || 0)}
                              </div>
                            </div>
                            
                            <div className={`p-3 rounded-lg border ${darkMode ? 'bg-gray-600 border-gray-500' : 'bg-white border-gray-200'}`}>
                              <div className={`text-xs font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                Avg Tags
                              </div>
                              <div className={`text-base font-bold ${darkMode ? 'text-teal-400' : 'text-teal-600'}`}>
                                {(team.top5AvgTags || 0).toFixed(1)}
                              </div>
                            </div>
                            
                            <div className={`p-3 rounded-lg border ${darkMode ? 'bg-gray-600 border-gray-500' : 'bg-white border-gray-200'}`}>
                              <div className={`text-xs font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                Total Tags
                              </div>
                              <div className={`text-base font-bold ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                                {team.top5TotalTags || 0}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mt-2">
                          {/* Character Performance - Expandable */}
                          <div className={`rounded-lg border-2 ${darkMode ? 'bg-gray-600 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                            <div 
                              className={`rounded-lg px-4 flex items-center justify-between cursor-pointer transition-colors ${
                                darkMode ? 'hover:bg-gray-500' : 'hover:bg-gray-100'
                              }`}
                              onClick={() => toggleRow('character_performance', i)}
                            >
                              <h4 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                                Character Performances
                              </h4>
                              {expandedRows[`character_performance_${i}`] ? (
                                <ChevronUp className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                              ) : (
                                <ChevronDown className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                              )}
                            </div>
                            
                            {expandedRows[`character_performance_${i}`] && (
                              <div className={`p-3 space-y-2 border-t ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                                {(() => {
                                  // Collect all performance scores for relative scoring
                                  const allCharScores = Object.values(team.characterAverages).map(c => c.performanceScore);
                                  
                                  return Object.entries(team.characterAverages)
                                    .sort((a, b) => b[1].performanceScore - a[1].performanceScore)
                                    .slice(0, 8)
                                    .map(([charName, charStats], charIndex) => {
                                      const avgDamageTaken = charStats.avgDamageTaken || 1;
                                      const dps = charStats.avgDamagePerSecond || 0;
                                      const charKey = `team_${i}_char_${charName}`;
                                      const isCharExpanded = expandedRows[charKey];
                                      const isTop5 = team.top5CharacterNames && team.top5CharacterNames.includes(charName);
                                    
                                    return (
                                      <div key={charName} className={`rounded-lg border-2 ${
                                        isTop5 
                                          ? (darkMode ? 'bg-gray-700 border-yellow-600' : 'bg-white border-yellow-600')
                                          : (darkMode ? 'bg-gray-700 border-gray-500' : 'bg-white border-gray-300')
                                      } transition-all`}>
                                        {/* Header: Name, Primary Stats, Score */}
                                        <div 
                                          className={`p-3 cursor-pointer transition-colors rounded-lg `}
                                          onClick={() => setExpandedRows(prev => ({ ...prev, [charKey]: !prev[charKey] }))}
                                        >
                                          <div className="flex items-center justify-between gap-4">
                                            {/* Character Name with Top 5 Badge */}
                                            <div className="flex items-center gap-2 min-w-[120px]">
                                              <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                                                {charName}
                                              </div>
                                            </div>
                                            
                                            {/* Spacer to push stats to the right */}
                                            <div className="flex-1"></div>
                                            
                                            {/* Stat Panels - Right Justified */}
                                            <div className="flex items-center gap-2">
                                              {/* Avg Damage */}
                                              <div className={`px-3 py-1.5 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                                                <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} whitespace-nowrap`}>Avg Damage</div>
                                                <div className={`text-sm font-bold ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                                                  {formatNumber(charStats.avgDamageDealt)}
                                                </div>
                                              </div>
                                              
                                              {/* Damage/Sec */}
                                              <div className={`px-3 py-1.5 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                                                <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} whitespace-nowrap`}>Damage/Sec</div>
                                                <div className={`text-sm font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                                                  {Math.round(dps).toLocaleString()}
                                                </div>
                                              </div>
                                              
                                              {/* Efficiency */}
                                              <div className={`px-3 py-1.5 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                                                <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Efficiency</div>
                                                <div className={`text-sm font-bold ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                                                  {charStats.avgDamageEfficiency.toFixed(2)}x
                                                </div>
                                              </div>
                                              
                                              {/* Battle Time */}
                                              <div className={`px-3 py-1.5 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                                                <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} whitespace-nowrap`}>Battle Time</div>
                                                <div className={`text-sm font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                                                  {Math.floor(charStats.avgBattleDuration / 60)}:{String(charStats.avgBattleDuration % 60).padStart(2, '0')}
                                                </div>
                                              </div>
                                              
                                              {/* Eliminations */}
                                              <div className={`px-3 py-1.5 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                                                <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Eliminations</div>
                                                <div className={`text-sm font-bold ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                                                  {charStats.avgKills || 0}
                                                </div>
                                              </div>
                                            </div>
                                            
                                            {/* Score and Expand Icon - Rightmost */}
                                            <div className="flex items-center gap-3">
                                              <div className="text-right">
                                                <PerformanceScoreBadge score={charStats.performanceScore} label="Score" size="small" darkMode={darkMode} allScores={allCharScores} />
                                                <div className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                  {charStats.activeMatchesPlayed} matches ({charStats.usageRate}%)
                                                </div>
                                              </div>
                                              {isCharExpanded ? (
                                                <ChevronUp className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                                              ) : (
                                                <ChevronDown className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                        
                                        {/* Expanded Details - Match Aggregated Stats */}
                                        {isCharExpanded && (
                                          <div className={`px-3 pb-3 grid grid-cols-1 sm:grid-cols-1 gap-3 ${darkMode ? 'border-gray-600' : 'border-gray-200'} pt-3`}>
                                            <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
                                              <div className="grid grid-cols-1 sm:grid-cols-1 gap-3">
                                                {/* Combat Performance Section */}
                                                <div className={`rounded-lg p-3 border-2 ${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-500'}`}>
                                                  <div className="flex items-center gap-2 mb-3">
                                                    <Swords className={`w-5 h-5 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />
                                                    <h4 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Combat Performance</h4>
                                                  </div>
                                                  <div className="space-y-2 text-sm mb-3">
                                                    <div className="flex justify-between">
                                                      <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Damage Done:</span>
                                                      <strong className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{formatNumber(charStats.avgDamageDealt)}</strong>
                                                    </div>
                                                    <div className="flex justify-between">
                                                      <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Damage Taken:</span>
                                                      <strong className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{formatNumber(charStats.avgDamageTaken)}</strong>
                                                    </div>
                                                    <div className="flex justify-between">
                                                      <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Damage/Sec:</span>
                                                      <strong className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{Math.round(dps).toLocaleString()}/sec</strong>
                                                    </div>
                                                    <div className="flex justify-between">
                                                      <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Efficiency:</span>
                                                      <strong className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{charStats.avgDamageEfficiency.toFixed(2)}×</strong>
                                                    </div>
                                                  </div>
                                                  <div className={`grid grid-cols-2 gap-x-4 gap-y-2 text-xs pt-2 border-t ${darkMode ? 'border-gray-500' : 'border-gray-200'}`}>
                                                    <div className="flex justify-between">
                                                      <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Throws:</span>
                                                      <strong className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{charStats.avgThrows || 0}</strong>
                                                    </div>
                                                    <div className="flex justify-between">
                                                      <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Vanishing Attacks:</span>
                                                      <strong className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{charStats.avgVanishingAttacks || 0}</strong>
                                                    </div>
                                                    <div className="flex justify-between">
                                                      <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Dragon Homings:</span>
                                                      <strong className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{charStats.avgDragonHoming || 0}</strong>
                                                    </div>
                                                    <div className="flex justify-between">
                                                      <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Lightning Attacks:</span>
                                                      <strong className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{charStats.avgLightningAttacks || 0}</strong>
                                                    </div>
                                                    <div className="flex justify-between">
                                                      <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Speed Impacts:</span>
                                                      <strong className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{charStats.avgSpeedImpacts || 0}</strong>
                                                    </div>
                                                    <div className="flex justify-between">
                                                      <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Speed Impact Wins:</span>
                                                      <strong className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{charStats.avgSpeedImpactWins || 0}</strong>
                                                    </div>
                                                    <div className="flex justify-between">
                                                      <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Max Combo Hits:</span>
                                                      <strong className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{charStats.avgMaxComboNum || 0}</strong>
                                                    </div>
                                                    <div className="flex justify-between">
                                                      <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Max Combo Damage:</span>
                                                      <strong className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{formatNumber(charStats.avgMaxComboDamage || 0)}</strong>
                                                    </div>
                                                    <div className="flex justify-between">
                                                      <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Sparking Combo:</span>
                                                      <strong className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{charStats.avgSparkingCombo || 0}</strong>
                                                    </div>
                                                    <div className="flex justify-between">
                                                      <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Avg Kills:</span>
                                                      <strong className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{charStats.avgKills || 0}</strong>
                                                    </div>
                                                  </div>
                                                </div>
                                                
                                                {/* Survival & Health Section */}
                                                <div className={`rounded-lg p-3 border-2 ${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-500'}`}>
                                                  <div className="flex items-center gap-2 mb-3">
                                                    <Heart className={`w-5 h-5 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                                                    <h4 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Survival & Health</h4>
                                                  </div>
                                                  <div className="space-y-2 text-sm mb-2">
                                                    <div className="flex justify-between">
                                                      <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Max Health:</span>
                                                      <strong className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                                        {formatNumber(charStats.avgHealthMax || 0)}
                                                      </strong>
                                                    </div>
                                                    <div className="flex justify-between">
                                                      <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Health Remaining:</span>
                                                      <strong className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                                        {formatNumber(charStats.avgHealthRemaining || 0)}
                                                      </strong>
                                                    </div>
                                                    <div className="flex justify-between">
                                                      <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Survival Rate:</span>
                                                      <strong className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                                        {(charStats.avgHealthRetention * 100).toFixed(1)}%
                                                      </strong>
                                                    </div>
                                                    <div className="flex justify-between">
                                                      <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Swaps (Tags):</span>
                                                      <strong className={`${darkMode ? 'text-teal-400' : 'text-teal-600'}`}>{charStats.avgTags || 0}</strong>
                                                    </div>
                                                  </div>
                                                  <div className={`grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs pt-2 border-t ${darkMode ? 'border-gray-500' : 'border-gray-200'}`}>
                                                    <div className="flex justify-between">
                                                      <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Guards:</span>
                                                      <strong className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{charStats.avgGuards || 0}</strong>
                                                    </div>
                                                    <div className="flex justify-between">
                                                      <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Super Counters:</span>
                                                      <strong className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{charStats.avgSuperCounters || 0}</strong>
                                                    </div>
                                                    <div className="flex justify-between">
                                                      <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Revenge Counters:</span>
                                                      <strong className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{charStats.avgRevengeCounters || 0}</strong>
                                                    </div>
                                                    <div className="flex justify-between">
                                                      <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Z-Counters:</span>
                                                      <strong className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{charStats.avgZCounters || 0}</strong>
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                              <div className="grid grid-cols-1 sm:grid-cols-1 gap-3">
                                                {/* Special Abilities Section */}
                                                <div className={`rounded-lg p-3 border-2 ${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-500'}`}>
                                                  <div className="flex items-center gap-2 mb-3">
                                                    <Zap className={`w-5 h-5 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                                                    <h4 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Special Abilities</h4>
                                                  </div>
                                                  {/* Display each blast type individually - show hit/thrown format if that specific type has hit rate data, otherwise show legacy format */}
                                                  <div className="space-y-2 text-sm mb-2">
                                                    <div className="flex justify-between">
                                                      <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Super 1 Blasts:</span>
                                                      <div className="flex items-center gap-2">
                                                        {charStats.s1HitRateOverall !== null && charStats.s1HitRateOverall !== undefined ? (
                                                          <>
                                                            <strong className={`${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                                                              {(charStats.avgS1Hit || 0).toFixed(1)}/{(charStats.avgS1Blast || charStats.avgSPM1 || 0).toFixed(1)}
                                                            </strong>
                                                            <span className={`text-xs font-mono ${
                                                              charStats.s1HitRateOverall >= 70 ? (darkMode ? 'text-green-400' : 'text-green-600') :
                                                              charStats.s1HitRateOverall >= 50 ? (darkMode ? 'text-yellow-400' : 'text-yellow-600') :
                                                              (darkMode ? 'text-red-400' : 'text-red-600')
                                                            }`}>
                                                              ({charStats.s1HitRateOverall.toFixed(1)}%)
                                                            </span>
                                                          </>
                                                        ) : (
                                                          <strong className={`${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                                                            {(charStats.avgSPM1 || 0).toFixed(1)}
                                                          </strong>
                                                        )}
                                                      </div>
                                                    </div>
                                                    <div className="flex justify-between">
                                                      <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Super 2 Blasts:</span>
                                                      <div className="flex items-center gap-2">
                                                        {charStats.s2HitRateOverall !== null && charStats.s2HitRateOverall !== undefined ? (
                                                          <>
                                                            <strong className={`${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                                                              {(charStats.avgS2Hit || 0).toFixed(1)}/{(charStats.avgS2Blast || charStats.avgSPM2 || 0).toFixed(1)}
                                                            </strong>
                                                            <span className={`text-xs font-mono ${
                                                              charStats.s2HitRateOverall >= 70 ? (darkMode ? 'text-green-400' : 'text-green-600') :
                                                              charStats.s2HitRateOverall >= 50 ? (darkMode ? 'text-yellow-400' : 'text-yellow-600') :
                                                              (darkMode ? 'text-red-400' : 'text-red-600')
                                                            }`}>
                                                              ({charStats.s2HitRateOverall.toFixed(1)}%)
                                                            </span>
                                                          </>
                                                        ) : (
                                                          <strong className={`${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                                                            {(charStats.avgSPM2 || 0).toFixed(1)}
                                                          </strong>
                                                        )}
                                                      </div>
                                                    </div>
                                                    <div className="flex justify-between">
                                                      <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Ultimate Blasts:</span>
                                                      <div className="flex items-center gap-2">
                                                        {charStats.ultHitRateOverall !== null && charStats.ultHitRateOverall !== undefined ? (
                                                          <>
                                                            <strong className={`${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
                                                              {(charStats.avgUltHit || 0).toFixed(1)}/{(charStats.avgUltBlast || charStats.avgUltimates || 0).toFixed(1)}
                                                            </strong>
                                                            <span className={`text-xs font-mono ${
                                                              charStats.ultHitRateOverall >= 70 ? (darkMode ? 'text-green-400' : 'text-green-600') :
                                                              charStats.ultHitRateOverall >= 50 ? (darkMode ? 'text-yellow-400' : 'text-yellow-600') :
                                                              (darkMode ? 'text-red-400' : 'text-red-600')
                                                            }`}>
                                                              ({charStats.ultHitRateOverall.toFixed(1)}%)
                                                            </span>
                                                          </>
                                                        ) : (
                                                          <strong className={`${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
                                                            {(charStats.avgUltimates || 0).toFixed(1)}
                                                          </strong>
                                                        )}
                                                      </div>
                                                    </div>
                                                  </div>
                                                  <div className={`grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs pt-2 border-t ${darkMode ? 'border-gray-500' : 'border-gray-200'}`}>
                                                    <div className="flex justify-between">
                                                      <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Skill 1 Usage:</span>
                                                      <strong className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{charStats.avgEXA1 || 0}</strong>
                                                    </div>
                                                    <div className="flex justify-between">
                                                      <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Skill 2 Usage:</span>
                                                      <strong className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{charStats.avgEXA2 || 0}</strong>
                                                    </div>
                                                    <div className="flex justify-between">
                                                      <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Charges:</span>
                                                      <strong className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{charStats.avgCharges || 0}</strong>
                                                    </div>
                                                    <div className="flex justify-between">
                                                      <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Sparkings:</span>
                                                      <strong className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{charStats.avgSparking || 0}</strong>
                                                    </div>
                                                    <div className="flex justify-between">
                                                      <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Ki Blasts:</span>
                                                      <strong className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{charStats.avgEnergyBlasts || 0}</strong>
                                                    </div>
                                                    <div className="flex justify-between">
                                                      <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Dragon Dash Mileage:</span>
                                                      <strong className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{charStats.avgDragonDashMileage || 0}</strong>
                                                    </div>
                                                  </div>
                                                </div>
                                                
                                                {/* Most Used Builds Section */}
                                                {charStats.topBuilds && charStats.topBuilds.length > 0 && (
                                                  <div className={`rounded-lg p-3 border-2 ${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-500'}`}>
                                                    <div className="flex items-center justify-between mb-3">
                                                      <div className="flex items-center">
                                                        <Package className={`w-5 h-5 mr-2 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                                                        <h4 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Most Used Builds</h4>
                                                      </div>
                                                      {(() => {
                                                        const currentBuildIndex = selectedBuildIndex[charKey] || 0;
                                                        const currentBuild = charStats.topBuilds?.[currentBuildIndex];
                                                        return (
                                                          <PerformanceScoreBadge 
                                                            score={currentBuild?.avgPerformanceScore || 0} 
                                                            label="Score" 
                                                            size="small" 
                                                            darkMode={darkMode} 
                                                            allScores={allCharScores} 
                                                          />
                                                        );
                                                      })()}
                                                    </div>
                                                    
                                                    {/* Tabs for build selection */}
                                                    {charStats.topBuilds.length > 1 && (
                                                      <div className="flex items-center gap-2 mb-3">
                                                        {charStats.topBuilds.map((build, index) => {
                                                          const isSelected = (selectedBuildIndex[charKey] || 0) === index;
                                                          const labels = ['First', 'Second', 'Third'];
                                                          return (
                                                            <button
                                                              key={index}
                                                              onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedBuildIndex(prev => ({ ...prev, [charKey]: index }));
                                                              }}
                                                              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                                                                isSelected
                                                                  ? darkMode
                                                                    ? 'bg-indigo-600 text-white border-2 border-indigo-500'
                                                                    : 'bg-indigo-500 text-white border-2 border-indigo-600'
                                                                  : darkMode
                                                                    ? 'bg-gray-700 text-gray-300 border-2 border-gray-600 hover:bg-gray-600'
                                                                    : 'bg-white text-gray-700 border-2 border-gray-300 hover:bg-gray-100'
                                                              }`}
                                                            >
                                                              {labels[index]}
                                                            </button>
                                                          );
                                                        })}
                                                      </div>
                                                    )}
                                                    
                                                    {(() => {
                                                      const currentBuildIndex = selectedBuildIndex[charKey] || 0;
                                                      const currentBuild = charStats.topBuilds?.[currentBuildIndex];
                                                      const tooltipKey = `${charKey}-build-${currentBuildIndex}`;
                                                      
                                                      if (!currentBuild) return null;
                                                      
                                                      return (
                                                        <BuildTypeTooltipWrapper
                                                          buildComposition={currentBuild.buildComposition}
                                                          aiStrategy={currentBuild.aiStrategy}
                                                          count={currentBuild.activeCount}
                                                          equippedCapsules={currentBuild.equippedCapsules}
                                                          totalCapsuleCost={currentBuild.totalCapsuleCost}
                                                          darkMode={darkMode}
                                                          tooltipKey={tooltipKey}
                                                        />
                                                      );
                                                    })()}
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                            {/* Per-Form Stats - Aggregated */}
                                            {charStats.formStats && charStats.formStats.length > 0 && (
                                              <div className="col-span-1 sm:col-span-1">
                                                <PerFormStatsDisplayAggregated
                                                  formStatsArray={charStats.formStats}
                                                  formChangeHistoryText={charStats.formChangeHistoryText}
                                                  darkMode={darkMode}
                                                />
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  });
                                })()}
                              </div>
                            )}
                          </div>
                          
                          {/* Head-to-Head Records - Expandable */}
                          <div className={`rounded-lg border-2 ${darkMode ? 'bg-gray-600 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                            <div 
                              className={`rounded-lg px-4 flex items-center justify-between cursor-pointer transition-colors ${
                                darkMode ? 'hover:bg-gray-500' : 'hover:bg-gray-100'
                              }`}
                              onClick={() => toggleRow('head_to_head', i)}
                            >
                              <h4 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                                Head-to-Head Records
                              </h4>
                              {expandedRows[`head_to_head_${i}`] ? (
                                <ChevronUp className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                              ) : (
                                <ChevronDown className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                              )}
                            </div>
                            
                            {expandedRows[`head_to_head_${i}`] && (
                              <div className="p-3 space-y-2">
                                {Object.entries(team.opponentRecords).map(([opponent, record]) => {
                                  // Calculate head-to-head stats
                                  const h2hMatches = team.matchHistory.filter(match => match.opponent === opponent);
                                  const h2hTotalDamageDealt = h2hMatches.reduce((sum, match) => sum + match.damageDealt, 0);
                                  const h2hTotalDamageTaken = h2hMatches.reduce((sum, match) => sum + match.damageTaken, 0);
                                  const h2hTotalHealthRemaining = h2hMatches.reduce((sum, match) => sum + match.healthRemaining, 0);
                                  const h2hTotalHealthMax = h2hMatches.reduce((sum, match) => sum + match.healthMax, 0);
                                  const h2hAvgDamageDealt = h2hMatches.length > 0 ? Math.round(h2hTotalDamageDealt / h2hMatches.length) : 0;
                                  const h2hAvgDamageTaken = h2hMatches.length > 0 ? Math.round(h2hTotalDamageTaken / h2hMatches.length) : 0;
                                  const h2hDamageEfficiency = h2hTotalDamageTaken > 0 ? (h2hTotalDamageDealt / h2hTotalDamageTaken).toFixed(2) : '∞';
                                  const h2hHealthRetention = h2hTotalHealthMax > 0 ? ((h2hTotalHealthRemaining / h2hTotalHealthMax) * 100).toFixed(1) : '0.0';
                                  const h2hWinRate = h2hMatches.length > 0 ? ((record.wins / h2hMatches.length) * 100).toFixed(1) : '0.0';
                                  const h2hTotalBattleTime = h2hMatches.reduce((sum, match) => sum + (match.battleDuration || 0), 0);
                                  const h2hDPS = h2hTotalBattleTime > 0 ? Math.round(h2hTotalDamageDealt / h2hTotalBattleTime) : 0;
                                  
                                  const matchupKey = `matchups_${team.teamName}_vs_${opponent}`;
                                  const isMatchupExpanded = expandedRows[matchupKey] || false;
                                  
                                  // Calculate character matchup stats
                                  const characterMatchups = record.characterMatchups || {};
                                  const matchupStats = Object.values(characterMatchups).map(matchup => {
                                    // Filter for active matches only (battleTime > 0)
                                    const activeMatches = matchup.matches.filter(m => (m.battleTime || 0) > 0);
                                    const matchCount = activeMatches.length;
                                    
                                    const totalDamageDealt = activeMatches.reduce((sum, m) => sum + (m.damageDealt || 0), 0);
                                    const totalDamageTaken = activeMatches.reduce((sum, m) => sum + (m.damageTaken || 0), 0);
                                    const totalBattleTime = activeMatches.reduce((sum, m) => sum + (m.battleTime || 0), 0);
                                    const totalHealthRemaining = activeMatches.reduce((sum, m) => sum + (m.healthRemaining || 0), 0);
                                    const totalHealthMax = activeMatches.reduce((sum, m) => sum + (m.healthMax || 0), 0);
                                    
                                    const avgDamageDealt = matchCount > 0 ? Math.round(totalDamageDealt / matchCount) : 0;
                                    const avgDamageTaken = matchCount > 0 ? Math.round(totalDamageTaken / matchCount) : 0;
                                    const avgBattleTime = matchCount > 0 ? Math.round(totalBattleTime / matchCount) : 0;
                                    // Use total-based efficiency calculation (aggregate then calculate)
                                    const damageEfficiencyNum = totalDamageTaken > 0 ? totalDamageDealt / totalDamageTaken : totalDamageDealt;
                                    const damageEfficiency = damageEfficiencyNum.toFixed(2);
                                    const dps = totalBattleTime > 0 ? Math.round(totalDamageDealt / totalBattleTime) : 0;
                                    const damagePerSecond = avgBattleTime > 0 ? avgDamageDealt / avgBattleTime : 0;
                                    const healthRetention = totalHealthMax > 0 ? totalHealthRemaining / totalHealthMax : 0;
                                    
                                    const baseScore = (
                                      (avgDamageDealt / 100000) * 35 +
                                      (damageEfficiencyNum) * 25 +
                                      (damagePerSecond / 1000) * 25 +
                                      (healthRetention) * 15
                                    );
                                    
                                    // Experience multiplier based on matches played
                                    const experienceMultiplier = Math.min(1.25, 1.0 + (matchCount - 1) * (0.25 / 11));
                                    const avgPerformanceScore = (baseScore * experienceMultiplier).toFixed(2);
                                    
                                    // Get most common build
                                    const mostCommonBuild = Object.entries(matchup.buildUsage || {})
                                      .sort((a, b) => b[1] - a[1])[0];
                                    
                                    // Get build composition data for the most common build
                                    const mostCommonBuildData = mostCommonBuild && matchup.buildCompositionData 
                                      ? matchup.buildCompositionData[mostCommonBuild[0]] 
                                      : null;
                                    
                                    return {
                                      ...matchup,
                                      avgDamageDealt,
                                      avgDamageTaken,
                                      avgBattleTime,
                                      avgPerformanceScore,
                                      damageEfficiency,
                                      dps,
                                      healthRetention: (healthRetention * 100).toFixed(1),
                                      mostCommonBuild: mostCommonBuild ? mostCommonBuild[0] : 'Unknown',
                                      mostCommonBuildData: mostCommonBuildData,
                                      mostCommonBuildCount: mostCommonBuild ? mostCommonBuild[1] : 0,
                                      matchCount
                                    };
                                  }).sort((a, b) => a.position - b.position);
                                  
                                  return (
                                    <div key={opponent} className={`rounded-xl border-2 transition-all ${
                                      darkMode ? 'bg-gray-700 border-gray-600 hover:border-gray-500' : 'bg-white border-gray-200 hover:border-gray-300'
                                    }`}>
                                      <div className="px-4 mb-2">
                                        {/* Header Section with Stats */}
                                        <div className="flex items-center justify-between">
                                          <div>
                                            <h4 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                                              vs {opponent}
                                            </h4>
                                            <div className="flex items-center gap-4 text-sm mt-1">
                                              <span className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                                {h2hMatches.length} match{h2hMatches.length !== 1 ? 'es' : ''}
                                              </span>
                                              <span className={`font-medium ${
                                                parseFloat(h2hWinRate) >= 75 ? (darkMode ? 'text-green-400' : 'text-green-600') :
                                                parseFloat(h2hWinRate) >= 50 ? (darkMode ? 'text-yellow-400' : 'text-yellow-500') :
                                                (darkMode ? 'text-red-400' : 'text-red-600')
                                              }`}>
                                                {record.wins}W - {record.losses}L
                                              </span>
                                            </div>
                                          </div>
                                          
                                          {/* Stats Row */}
                                          <div className="flex items-center gap-6">
                                            {/* Win Rate */}
                                            <div className="text-center">
                                              <div className={`text-2xl font-bold ${
                                                parseFloat(h2hWinRate) >= 75 ? (darkMode ? 'text-green-400' : 'text-green-600') :
                                                parseFloat(h2hWinRate) >= 50 ? (darkMode ? 'text-yellow-400' : 'text-yellow-500') :
                                                (darkMode ? 'text-red-400' : 'text-red-600')
                                              }`}>
                                                {h2hWinRate}%
                                              </div>
                                              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                Win Rate
                                              </div>
                                            </div>
                                            
                                            {/* Damage Efficiency */}
                                            <div className="text-center">
                                              <div className={`text-2xl font-bold ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                                                {h2hDamageEfficiency}×
                                              </div>
                                              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                Damage Efficiency
                                              </div>
                                            </div>
                                            
                                            {/* HP Retention */}
                                            <div className="text-center">
                                              <div className={`text-2xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                                                {h2hHealthRetention}%
                                              </div>
                                              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                HP Retention
                                              </div>
                                            </div>
                                            
                                            {/* Characters Used */}
                                            <div className="text-center">
                                              <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                                                {matchupStats.length}
                                              </div>
                                              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                Characters Used
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                        
                                        {/* Team Stats Expandable */}
                                        <div className={`mt-2 pt-2 border-t ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const teamStatsKey = `team_stats_${team.teamName}_vs_${opponent}`;
                                              setExpandedRows(prev => ({ ...prev, [teamStatsKey]: !prev[teamStatsKey] }));
                                            }}
                                            className={`w-full flex items-center justify-between py-2 px-3 rounded-lg transition-colors ${
                                              darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-300 hover:bg-gray-100'
                                            }`}
                                          >
                                            <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                                              Team Stats
                                            </span>
                                            {expandedRows[`team_stats_${team.teamName}_vs_${opponent}`] ? (
                                              <ChevronUp className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                                            ) : (
                                              <ChevronDown className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                                            )}
                                          </button>
                                          
                                          {expandedRows[`team_stats_${team.teamName}_vs_${opponent}`] && (
                                            <div className="mt-1">
                                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1">
                                                {/* Avg Damage Dealt */}
                                                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50 border border-gray-200'}`}>
                                                  <div className={`text-sm mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                    Avg Damage Dealt
                                                  </div>
                                                  <div className={`text-xl font-bold ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                                                    {formatNumber(h2hAvgDamageDealt)}
                                                  </div>
                                                </div>
                                                
                                                {/* Avg Damage Taken */}
                                                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50 border border-gray-200'}`}>
                                                  <div className={`text-sm mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                    Avg Damage Taken
                                                  </div>
                                                  <div className={`text-xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                                                    {formatNumber(h2hAvgDamageTaken)}
                                                  </div>
                                                </div>
                                                
                                                {/* Efficiency */}
                                                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50 border border-gray-200'}`}>
                                                  <div className={`text-sm mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                    Efficiency
                                                  </div>
                                                  <div className={`text-xl font-bold ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                                                    {h2hDamageEfficiency}×
                                                  </div>
                                                </div>
                                                
                                                {/* DPS */}
                                                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50 border border-gray-200'}`}>
                                                  <div className={`text-sm mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                    DPS
                                                  </div>
                                                  <div className={`text-xl font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                                                    {h2hDPS}
                                                  </div>
                                                </div>
                                                
                                                {/* Avg Match Duration */}
                                                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50 border border-gray-200'}`}>
                                                  <div className={`text-sm mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                    Avg Match Duration
                                                  </div>
                                                  <div className={`text-xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                                                    {(() => {
                                                      const avgDuration = h2hTotalBattleTime > 0 ? Math.round(h2hTotalBattleTime / h2hMatches.length) : 0;
                                                      return `${Math.floor(avgDuration / 60)}:${String(avgDuration % 60).padStart(2, '0')}`;
                                                    })()}
                                                  </div>
                                                </div>
                                                
                                                {/* HP Retention */}
                                                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50 border border-gray-200'}`}>
                                                  <div className={`text-sm mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                    HP Retention
                                                  </div>
                                                  <div className={`text-xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                                                    {h2hHealthRetention}%
                                                  </div>
                                                </div>
                                                
                                                {/* Avg HP Remaining */}
                                                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50 border border-gray-200'}`}>
                                                  <div className={`text-sm mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                    Avg HP Remaining
                                                  </div>
                                                  <div className={`text-xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                                                    {formatNumber(Math.round(h2hTotalHealthRemaining / h2hMatches.length))}
                                                  </div>
                                                </div>
                                                
                                                {/* Avg Tags */}
                                                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50 border border-gray-200'}`}>
                                                  <div className={`text-sm mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                    Avg Tags
                                                  </div>
                                                  <div className={`text-xl font-bold ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
                                                    {(() => {
                                                      const totalTags = h2hMatches.reduce((sum, match) => sum + (match.tags || 0), 0);
                                                      return (totalTags / h2hMatches.length).toFixed(1);
                                                    })()}
                                                  </div>
                                                </div>
                                                
                                                {/* Total Tags */}
                                                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50 border border-gray-200'}`}>
                                                  <div className={`text-sm mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                    Total Tags
                                                  </div>
                                                  <div className={`text-xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                                                    {h2hMatches.reduce((sum, match) => sum + (match.tags || 0), 0)}
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                        
                                        {/* Character Matchups Expandable */}
                                        {matchupStats.length > 0 && (
                                          <div className={`pt-2 ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setExpandedRows(prev => ({ ...prev, [matchupKey]: !prev[matchupKey] }));
                                              }}
                                              className={`w-full flex items-center justify-between py-2 px-3 rounded-lg transition-colors ${
                                                darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-300 hover:bg-gray-100'
                                              }`}
                                            >
                                              <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                                                Character Matchups ({matchupStats.length})
                                              </span>
                                              {isMatchupExpanded ? (
                                                <ChevronUp className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                                              ) : (
                                                <ChevronDown className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                                              )}
                                            </button>
                                            
                                            {isMatchupExpanded && (() => {
                                              // Use same score pool as character performance section for consistent coloring
                                              const allCharScores = Object.values(team.characterAverages).map(c => c.performanceScore);
                                              
                                              // Group matchups by position
                                              const positionGroups = matchupStats.reduce((groups, stat) => {
                                                if (!groups[stat.position]) groups[stat.position] = [];
                                                groups[stat.position].push(stat);
                                                return groups;
                                              }, {});
                                              
                                              // Position labels
                                              const getPositionLabel = (pos) => {
                                                const maxPos = Math.max(...matchupStats.map(s => s.position));
                                                if (pos === 1) return 'Starter';
                                                if (pos === maxPos) return 'Anchor';
                                                if (maxPos === 3) return 'Middle';
                                                // For middle positions in teams with 4+ members
                                                const positionNames = ['', 'Starter', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth'];
                                                return `${positionNames[pos] || `Position ${pos}`} (Middle)`;
                                              };
                                              
                                              return (
                                                <div className="mt-1">
                                                  {Object.entries(positionGroups).sort((a, b) => Number(a[0]) - Number(b[0])).map(([position, stats]) => {
                                                    const posNum = Number(position);
                                                    const isPositionExpanded = expandedPositions?.[opponent]?.[posNum];
                                                    
                                                    // Find best character for this position
                                                    const bestCharacter = stats.reduce((best, current) => {
                                                      const currentScore = parseFloat(current.avgPerformanceScore) || 0;
                                                      const bestScore = parseFloat(best.avgPerformanceScore) || 0;
                                                      return currentScore > bestScore ? current : best;
                                                    }, stats[0]);
                                                    
                                                    return (
                                                      <div key={position} className={`rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-300'}`}>
                                                        <div className="w-full p-3 flex items-center justify-between">
                                                          <div className="flex items-center gap-3">
                                                            <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                                                              {getPositionLabel(posNum)}
                                                            </span>
                                                            <span className={`text-xs px-2 py-0.5 rounded-full ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
                                                              {stats.length} character{stats.length !== 1 ? 's' : ''}
                                                            </span>
                                                          </div>
                                                        </div>
                                                        
                                                        {(
                                                          <div className="px-3 pb-3">
                                                            <div 
                                                              className="flex gap-2 overflow-x-auto pb-2 cursor-grab active:cursor-grabbing select-none"
                                                              style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}
                                                              onMouseDown={(e) => {
                                                                const container = e.currentTarget;
                                                                const startX = e.pageX - container.offsetLeft;
                                                                const scrollLeft = container.scrollLeft;
                                                                let isDown = true;
                                                                
                                                                const handleMouseMove = (e) => {
                                                                  if (!isDown) return;
                                                                  e.preventDefault();
                                                                  const x = e.pageX - container.offsetLeft;
                                                                  const walk = (x - startX) * 2; // Scroll speed multiplier
                                                                  container.scrollLeft = scrollLeft - walk;
                                                                };
                                                                
                                                                const handleMouseUp = () => {
                                                                  isDown = false;
                                                                  document.removeEventListener('mousemove', handleMouseMove);
                                                                  document.removeEventListener('mouseup', handleMouseUp);
                                                                };
                                                                
                                                                document.addEventListener('mousemove', handleMouseMove);
                                                                document.addEventListener('mouseup', handleMouseUp);
                                                              }}
                                                            >
                                                              {stats
                                                                .sort((a, b) => parseFloat(b.avgPerformanceScore) - parseFloat(a.avgPerformanceScore))
                                                                .map((stat) => {
                                                                const isBest = stat.characterName === bestCharacter.characterName;
                                                                const charKey = `${opponent}-${position}-${stat.characterName}`;
                                                                const isCharExpanded = expandedCharacters[charKey];
                                                                
                                                                return (
                                                                  <div key={stat.characterName} className="flex-shrink-0">
                                                                    <div className={`rounded-lg border-2 ${
                                                                      isBest 
                                                                        ? `${darkMode ? 'border-amber-500 bg-gray-800' : 'border-amber-600 bg-white'}`
                                                                        : `${darkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-white'}`
                                                                    }`} style={{minWidth: '400px', maxWidth: '450px'}}>
                                                                      {/* Collapsed Header - Always Visible */}
                                                                      <div 
                                                                        onClick={() => {
                                                                          setExpandedCharacters(prev => ({
                                                                            ...prev,
                                                                            [charKey]: !isCharExpanded
                                                                          }));
                                                                        }}
                                                                        className="px-3 py-2 cursor-pointer hover:bg-opacity-80 transition-colors"
                                                                      >
                                                                        <div className="flex items-center justify-between mb-2">
                                                                          <div className="flex items-center gap-2">
                                                                            <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                                                                              {stat.characterName}
                                                                            </span>
                                                                            {isBest && <span className={`text-sm ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>★</span>}
                                                                          </div>
                                                                          <div className="flex flex-col items-end gap-1">
                                                                            {(() => {
                                                                              const score = parseFloat(stat.avgPerformanceScore) || 0;
                                                                              // Use same score pool as character performance section for consistent coloring
                                                                              const level = getPerformanceLevel(score, allCharScores);
                                                                              const colorClasses = {
                                                                                excellent: darkMode ? 'bg-green-900/30 text-green-300 border-green-600' : 'bg-green-100 text-green-700 border-green-300',
                                                                                good: darkMode ? 'bg-blue-900/30 text-blue-300 border-blue-600' : 'bg-blue-100 text-blue-700 border-blue-300',
                                                                                average: darkMode ? 'bg-yellow-900/30 text-yellow-300 border-yellow-600' : 'bg-yellow-100 text-yellow-700 border-yellow-300',
                                                                                'below-average': darkMode ? 'bg-orange-900/30 text-orange-300 border-orange-600' : 'bg-orange-100 text-orange-700 border-orange-300',
                                                                                poor: darkMode ? 'bg-red-900/30 text-red-300 border-red-600' : 'bg-red-100 text-red-700 border-red-300'
                                                                              };
                                                                              // Ensure we have a valid score to display
                                                                              const displayScore = isNaN(score) ? 0 : Math.round(score);
                                                                              return (
                                                                                <div className={`inline-flex items-center gap-1.5 rounded-lg border font-bold text-sm px-2 ${colorClasses[level]}`}>
                                                                                  <Star className="w-3 h-3"/>
                                                                                  <span>Score: {displayScore}</span>
                                                                                </div>
                                                                              );
                                                                            })()}
                                                                          </div>
                                                                        </div>
                                                                        
                                                                        <div className="flex items-center justify-between">
                                                                          <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                                            vs {stat.opponentName}
                                                                          </div>
                                                                          <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                                            {stat.matchCount} match{stat.matchCount !== 1 ? 'es' : ''}
                                                                          </div>
                                                                        </div>
                                                                        
                                                                        {/* Expand/Collapse Indicator */}
                                                                        <div className="flex justify-center">
                                                                          {isCharExpanded ? (
                                                                            <ChevronUp className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                                                                          ) : (
                                                                            <ChevronDown className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                                                                          )}
                                                                        </div>
                                                                      </div>
                                                                      
                                                                      {/* Expanded Details */}
                                                                      {isCharExpanded && (
                                                                        <div className="px-3 pb-3">
                                                                          <div className="grid grid-cols-2 gap-2 mb-2">
                                                                            <div className={`px-2 py-1.5 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                                                                              <div className={`text-xs mb-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Avg Dealt</div>
                                                                              <div className={`text-sm font-bold ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                                                                                {formatNumber(stat.avgDamageDealt)}
                                                                              </div>
                                                                            </div>
                                                                            <div className={`px-2 py-1.5 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                                                                              <div className={`text-xs mb-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Avg Taken</div>
                                                                              <div className={`text-sm font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                                                                                {formatNumber(stat.avgDamageTaken)}
                                                                              </div>
                                                                            </div>
                                                                            <div className={`px-2 py-1.5 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                                                                              <div className={`text-xs mb-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Efficiency</div>
                                                                              <div className={`text-sm font-bold ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                                                                                {stat.damageEfficiency}×
                                                                              </div>
                                                                            </div>
                                                                            <div className={`px-2 py-1.5 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                                                                              <div className={`text-xs mb-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>DPS</div>
                                                                              <div className={`text-sm font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                                                                                {stat.dps.toLocaleString()}
                                                                              </div>
                                                                            </div>
                                                                            <div className={`px-2 py-1.5 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                                                                              <div className={`text-xs mb-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Battle Time</div>
                                                                              <div className={`text-sm font-bold ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
                                                                                {Math.floor(stat.avgBattleTime / 60)}:{String(stat.avgBattleTime % 60).padStart(2, '0')}
                                                                              </div>
                                                                            </div>
                                                                            <div className={`px-2 py-1.5 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                                                                              <div className={`text-xs mb-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>HP Retention</div>
                                                                              <div className={`text-sm font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                                                                                {stat.healthRetention}%
                                                                              </div>
                                                                            </div>
                                                                          </div>
                                                                          
                                                                          {/* Most Common Build with Tooltip */}
                                                                          {stat.mostCommonBuildData ? (
                                                                            <div className={`pt-2 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                                                                              <BuildTypeTooltipWrapper
                                                                                buildComposition={stat.mostCommonBuildData.buildComposition}
                                                                                aiStrategy={stat.mostCommonBuildData.aiStrategy}
                                                                                count={stat.mostCommonBuildCount}
                                                                                equippedCapsules={stat.mostCommonBuildData.equippedCapsules}
                                                                                totalCapsuleCost={stat.mostCommonBuildData.totalCapsuleCost}
                                                                                darkMode={darkMode}
                                                                                tooltipKey={`${opponent}-${position}-${stat.characterName}-build`}
                                                                              />
                                                                            </div>
                                                                          ) : (
                                                                            <div className={`pt-2 border-t text-xs ${darkMode ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-600'}`}>
                                                                              <span>Most Common Build: </span>
                                                                              <span className={`font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{stat.mostCommonBuild}</span>
                                                                            </div>
                                                                          )}
                                                                        </div>
                                                                      )}
                                                                    </div>
                                                                  </div>
                                                                );
                                                              })}

                                                            </div>
                                                          </div>
                                                        )}
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              );
                                            })()}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {fileContent?.error && (
          <div className={`rounded-2xl shadow-xl p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`flex items-center gap-3 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
              <Shield className="w-8 h-8" />
              <div>
                <h3 className="text-xl font-bold">Error Loading File</h3>
                <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{fileContent.error}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
  // Render Submit Data launcher overlay at the end so it's present across views
  useEffect(() => {
    // no-op, placeholder if we need to coordinate darkMode
  }, [darkMode]);
  return null;
}

// Mount helper: render the UploadWidgetLauncher near root of the app
export function UploadWidgetMount({ darkMode = false }) {
  return <UploadWidgetLauncher darkMode={darkMode} />;
}

// Determine performance level for a value given a distribution of values.
// Returns one of: 'excellent', 'good', 'average', 'below', 'poor'
function getPerformanceLevel(value, allValues = []) {
  // Fallback simple thresholds when no distribution is provided
  if (!Array.isArray(allValues) || allValues.length === 0) {
    if (value >= 90) return 'excellent';
    if (value >= 75) return 'good';
    if (value >= 50) return 'average';
    if (value >= 25) return 'below-average';
    return 'poor';
  }

  // Create a sorted copy and compute percentile (higher is better)
  const sorted = [...allValues].slice().sort((a, b) => a - b);
  // If allValues are identical, avoid divide by zero and return average
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  if (max === min) return 'average';

  // Compute fraction of values less-or-equal to current value.
  // Higher fraction => better performance.
  const lessOrEqualCount = sorted.filter(v => v <= value).length;
  const frac = lessOrEqualCount / sorted.length;

  // percentile ranges: top 10% -> excellent, 70-90% -> good, 40-70% -> average,
  // 20-40% -> below-average, <20% -> poor
  if (frac >= 0.9) return 'excellent';
  if (frac >= 0.7) return 'good';
  if (frac >= 0.4) return 'average';
  if (frac >= 0.2) return 'below-average';
  return 'poor';
}

// Extract filename (without path or .json extension) from a given path or name
function getFileNameFromPath(pathOrName) {
  if (!pathOrName) return '';
  // If it's a full path, split by both / and \\ for windows paths
  const parts = pathOrName.split(/\\|\//g);
  const last = parts[parts.length - 1] || pathOrName;
  return last.replace(/\.json$/i, '');
}
