# Expandable Per-Form Stats Feature - Comprehensive Implementation Plan

## Executive Summary

This document outlines the plan to implement an expandable stats breakout view showing per-form statistics for characters that transform during battles. The feature will extend existing "Forms Used" displays into interactive, expandable panels showing detailed statistics for each form a character used.

**Target Views:**
1. **Single Match View** - Expand on existing form change history info blurb
2. **Aggregated Stats View** - Expand on existing form change history info blurb  
3. **Team Rankings View** - NEW addition to character performance panels

---

## Current State Analysis

### Existing Form Display Implementation

**Location:** `apps/analyzer/src/App.jsx`

#### Single Match View (Lines ~5303-5320)
```jsx
{/* Forms Used Display */}
{stats.formChangeHistory && (
  <div className={`mt-3 p-3 rounded-lg ${darkMode ? 'bg-yellow-900/20 border border-yellow-700' : 'bg-yellow-50 border border-yellow-200'}`}>
    <div className="flex items-center gap-2 mb-1">
      <Star className={`w-4 h-4 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
      <span className={`text-sm font-semibold ${darkMode ? 'text-yellow-300' : 'text-yellow-800'}`}>Forms Used</span>
    </div>
    <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
      {stats.formChangeHistory}
    </div>
  </div>
)}
```

**Current Behavior:**
- Simple text display showing transformation chain (e.g., "Vegeta (Base) → Vegeta (Super Saiyan) → Vegeta (Super Saiyan Blue)")
- Non-interactive
- No detailed stats breakdown

#### Aggregated Stats View (Lines ~5589-5606)
Identical implementation as Single Match View.

#### Team Rankings View
**Currently NO form change display exists** - this will be a completely new addition.

### Data Structure Already Available

#### From `CHARACTER_TRANSFORMATION_TRACKING_ANALYSIS.md`:

**characterIdRecord** contains per-form snapshots:
```json
"characterIdRecord": {
  "0020_60": {  // Vegeta Base form
    "damageDone": 150000,
    "damageTaken": 50000,
    "battleTime": 120.5,
    "battleCount": 3,
    "formChangeHistory": []
  },
  "0020_61": {  // Vegeta SSJ (snapshot at SSJ → SSJ Blue transformation)
    "damageDone": 280000,
    "damageTaken": 120000,
    "battleTime": 210.3,
    "battleCount": 6,
    "formChangeHistory": [{"key": "0020_60"}]
  }
}
```

**Calculation Method (User-confirmed):**
- **Final Form Stats** = `characterRecord[stat] - characterIdRecord[lastTransformKey][stat]`
- **Middle Form Stats** = `characterIdRecord[currentFormKey][stat] - characterIdRecord[previousFormKey][stat]`
- **First Form Stats** = `characterIdRecord[firstTransformKey][stat]` (direct value)

---

## Feature Design

### UI/UX Mockup

```
┌─────────────────────────────────────────────────────────────┐
│ ✨ Forms Used                                      [▼]       │ ← Clickable header
├─────────────────────────────────────────────────────────────┤
│ Vegeta (Base) → Vegeta (Super Saiyan) → Vegeta (SSJ Blue)  │ ← Summary text
└─────────────────────────────────────────────────────────────┘

When expanded ▼:

┌─────────────────────────────────────────────────────────────┐
│ ✨ Forms Used                                      [▲]       │
├─────────────────────────────────────────────────────────────┤
│ Vegeta (Base) → Vegeta (Super Saiyan) → Vegeta (SSJ Blue)  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ 📊 Form 1: Vegeta (Base)                              │   │
│ │                                                         │   │
│ │ ⚔️  Combat               💚 Survival                   │   │
│ │ • Damage Done:  150,000  • HP Remaining: 450,000      │   │
│ │ • Damage Taken:  50,000  • Battle Time:   120.5s      │   │
│ │ • Damage/Sec:    1,244   • Battles:       3           │   │
│ │                                                         │   │
│ │ ⭐ Special Abilities     🎯 Combat Mechanics          │   │
│ │ • Special Moves:    5    • Max Combo:      25         │   │
│ │ • Ultimates:        2    • Throws:         3          │   │
│ │ • Skills:           8    • Vanishing:      7          │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                               │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ 📊 Form 2: Vegeta (Super Saiyan)                      │   │
│ │                                                         │   │
│ │ ⚔️  Combat               💚 Survival                   │   │
│ │ • Damage Done:  130,000  • HP Remaining: 300,000      │   │
│ │ • Damage Taken:  70,000  • Battle Time:    89.8s      │   │
│ │ • Damage/Sec:    1,448   • Battles:       3           │   │
│ │ ...                                                     │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                               │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ 📊 Form 3: Vegeta (Super Saiyan Blue) [FINAL FORM]   │   │
│ │                                                         │   │
│ │ ⚔️  Combat               💚 Survival                   │   │
│ │ • Damage Done:  220,000  • HP Remaining: 750,000      │   │
│ │ • Damage/Sec:    2,150   • Battle Time:   102.3s      │   │
│ │ ...                                                     │   │
│ └───────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Interaction Flow

1. **Collapsed State (Default):**
   - Shows existing text: "Form 1 → Form 2 → Form 3"
   - Header shows chevron down icon (▼)
   - Minimal space usage

2. **Expanded State:**
   - Chevron flips to up icon (▲)
   - Smooth animation reveals per-form breakdown cards
   - Each form gets its own card with organized stat sections
   - Forms displayed in chronological order (Base → Final)

3. **Per-Form Card Structure:**
   - **Header:** Form number + character name + form name
   - **Sections:** 
     - Combat Performance (damage, efficiency, DPS)
     - Survival & Health (HP, battle time, battle count)
     - Special Abilities (special moves, ultimates, skills, blast tracking)
     - Combat Mechanics (combos, throws, counters, etc.)
   - **Layout:** 2-column grid on larger screens, single column on mobile

---

## Technical Implementation

### Phase 1: Data Processing Utilities

**File:** `apps/analyzer/src/utils/formStatsCalculator.js` (NEW)

```javascript
/**
 * Calculate per-form statistics from characterRecord and characterIdRecord
 * @param {Object} characterRecord - Final state from JSON
 * @param {Object} characterIdRecord - Transformation snapshots
 * @param {Array} formChangeHistory - Ordered list of transformations
 * @returns {Array} Array of per-form stat objects
 */
export function calculatePerFormStats(characterRecord, characterIdRecord, formChangeHistory) {
  // Implementation based on documented calculation method
  // Returns array of form stat objects with all metrics
}

/**
 * Format per-form stats for display in UI
 * @param {Array} perFormStats - Raw calculated stats
 * @param {Object} charMap - Character ID to name mapping
 * @returns {Array} Display-ready form stat objects
 */
export function formatPerFormStatsForDisplay(perFormStats, charMap) {
  // Formats numbers, applies character names, organizes sections
}
```

**Key Calculation Logic:**

```javascript
function calculatePerFormStats(characterRecord, characterIdRecord, formChangeHistory) {
  const formsUsed = [];
  
  // If no transformations occurred
  if (!formChangeHistory || formChangeHistory.length === 0) {
    return [createFormStatsObject(characterRecord, 1, characterRecord.originalCharacterId, true)];
  }
  
  // Build transformation chain
  const transformChain = [
    characterRecord.originalCharacterId,
    ...formChangeHistory.map(f => f.key)
  ];
  
  // Calculate stats for each form
  for (let i = 0; i < transformChain.length; i++) {
    const currentFormId = transformChain[i];
    const isFirstForm = i === 0;
    const isFinalForm = i === transformChain.length - 1;
    
    let formStats;
    
    if (isFirstForm) {
      // First form: use snapshot directly
      const firstTransformKey = formChangeHistory[0].key;
      formStats = characterIdRecord[firstTransformKey];
    } else if (isFinalForm) {
      // Final form: subtract last snapshot from characterRecord
      const lastTransformKey = formChangeHistory[formChangeHistory.length - 1].key;
      formStats = subtractStats(characterRecord, characterIdRecord[lastTransformKey]);
    } else {
      // Middle forms: subtract previous snapshot from current snapshot
      const currentSnapshot = characterIdRecord[transformChain[i + 1]]; // Next transformation point
      const previousSnapshot = characterIdRecord[transformChain[i]];
      formStats = subtractStats(currentSnapshot, previousSnapshot);
    }
    
    formsUsed.push({
      formNumber: i + 1,
      formId: currentFormId,
      isFirstForm,
      isFinalForm,
      ...formStats
    });
  }
  
  return formsUsed;
}

function subtractStats(finalStats, snapshotStats) {
  // Subtract all numeric stats: damage, battleCount, etc.
  return {
    damageDone: finalStats.damageDone - snapshotStats.damageDone,
    damageTaken: finalStats.damageTaken - snapshotStats.damageTaken,
    battleTime: finalStats.battleTime - snapshotStats.battleTime,
    battleCount: finalStats.battleCount - snapshotStats.battleCount,
    // ... all other numeric stats
  };
}
```

### Phase 2: React Component

**File:** `apps/analyzer/src/components/PerFormStatsDisplay.jsx` (NEW)

```jsx
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Star } from 'lucide-react';
import { calculatePerFormStats, formatPerFormStatsForDisplay } from '../utils/formStatsCalculator';

/**
 * Expandable per-form stats display component
 */
export function PerFormStatsDisplay({ 
  characterRecord, 
  characterIdRecord, 
  formChangeHistory, 
  formChangeHistoryText,
  charMap,
  darkMode,
  context // 'single-match' | 'aggregated' | 'team-rankings'
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Calculate per-form stats
  const perFormStats = calculatePerFormStats(
    characterRecord, 
    characterIdRecord, 
    formChangeHistory
  );
  
  const displayStats = formatPerFormStatsForDisplay(perFormStats, charMap);
  
  // Only show if character transformed
  if (!formChangeHistory || formChangeHistory.length === 0) {
    return null;
  }
  
  return (
    <div className={`mt-3 rounded-lg ${
      darkMode 
        ? 'bg-yellow-900/20 border border-yellow-700' 
        : 'bg-yellow-50 border border-yellow-200'
    }`}>
      {/* Header - Clickable */}
      <div 
        className={`p-3 flex items-center justify-between cursor-pointer hover:${
          darkMode ? 'bg-yellow-900/30' : 'bg-yellow-100'
        } transition-colors rounded-t-lg`}
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
      
      {/* Summary Text */}
      <div className={`px-3 ${!isExpanded ? 'pb-3' : 'pb-2'} text-sm ${
        darkMode ? 'text-gray-400' : 'text-gray-500'
      }`}>
        {formChangeHistoryText}
      </div>
      
      {/* Expanded Per-Form Breakdown */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3">
          {displayStats.map((formStat, idx) => (
            <FormStatCard 
              key={idx}
              formStat={formStat}
              darkMode={darkMode}
              context={context}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Individual form stat card component
 */
function FormStatCard({ formStat, darkMode, context }) {
  return (
    <div className={`rounded-lg border-2 p-3 ${
      darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
    }`}>
      {/* Form Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`px-2 py-1 rounded text-xs font-bold ${
            darkMode ? 'bg-yellow-900/40 text-yellow-300' : 'bg-yellow-100 text-yellow-800'
          }`}>
            Form {formStat.formNumber}
          </div>
          <div className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {formStat.characterName}
          </div>
        </div>
        {formStat.isFinalForm && (
          <div className={`text-xs px-2 py-1 rounded ${
            darkMode ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-100 text-blue-800'
          }`}>
            FINAL FORM
          </div>
        )}
      </div>
      
      {/* Stats Grid - 2 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Combat Performance */}
        <StatSection
          title="Combat"
          icon="⚔️"
          stats={[
            { label: 'Damage Done', value: formatNumber(formStat.damageDone), color: 'red' },
            { label: 'Damage Taken', value: formatNumber(formStat.damageTaken), color: 'orange' },
            { label: 'Damage/Sec', value: Math.round(formStat.damagePerSecond).toLocaleString(), color: 'purple' }
          ]}
          darkMode={darkMode}
        />
        
        {/* Survival & Health */}
        <StatSection
          title="Survival"
          icon="💚"
          stats={[
            { label: 'HP Remaining', value: formatNumber(formStat.hpRemaining), color: 'green' },
            { label: 'Battle Time', value: `${Math.round(formStat.battleTime)}s`, color: 'blue' },
            { label: 'Battles', value: formStat.battleCount, color: 'gray' }
          ]}
          darkMode={darkMode}
        />
        
        {/* Only show detailed sections if context allows (not team-rankings for space) */}
        {context !== 'team-rankings' && (
          <>
            {/* Special Abilities */}
            <StatSection
              title="Special Abilities"
              icon="⭐"
              stats={[
                { label: 'Special Moves', value: formStat.specialMovesUsed || 0 },
                { label: 'Ultimates', value: formStat.ultimatesUsed || 0 },
                { label: 'Skills', value: formStat.skillsUsed || 0 }
              ]}
              darkMode={darkMode}
            />
            
            {/* Combat Mechanics */}
            <StatSection
              title="Combat Mechanics"
              icon="🎯"
              stats={[
                { label: 'Max Combo', value: formStat.maxComboNum || 0 },
                { label: 'Throws', value: formStat.throwCount || 0 },
                { label: 'Vanishing Attacks', value: formStat.vanishingAttackCount || 0 }
              ]}
              darkMode={darkMode}
            />
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Reusable stat section component
 */
function StatSection({ title, icon, stats, darkMode }) {
  return (
    <div>
      <div className={`flex items-center gap-2 mb-2 text-sm font-semibold ${
        darkMode ? 'text-gray-300' : 'text-gray-700'
      }`}>
        <span>{icon}</span>
        <span>{title}</span>
      </div>
      <div className="space-y-1">
        {stats.map((stat, idx) => (
          <div key={idx} className="flex justify-between text-sm">
            <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
              {stat.label}:
            </span>
            <strong className={darkMode ? 'text-white' : 'text-gray-900'}>
              {stat.value}
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Phase 3: Integration into Existing Views

#### 3.1 Single Match View Integration

**File:** `apps/analyzer/src/App.jsx`

**Location:** Replace existing "Forms Used Display" section (lines ~5303-5320)

```jsx
import { PerFormStatsDisplay } from './components/PerFormStatsDisplay';

// Inside Single Match character panel rendering:
{/* Forms Used Display - NEW: Expandable */}
{stats.formChangeHistory && (
  <PerFormStatsDisplay
    characterRecord={char} // Full character object from JSON
    characterIdRecord={char.characterIdRecord}
    formChangeHistory={char.formChangeHistory}
    formChangeHistoryText={stats.formChangeHistory}
    charMap={charMap}
    darkMode={darkMode}
    context="single-match"
  />
)}
```

**Data Requirements:**
- Need to pass full `char` object (not just processed `stats`) to access `characterIdRecord`
- Ensure `char.characterIdRecord` is available in scope

#### 3.2 Aggregated Stats View Integration

**File:** `apps/analyzer/src/App.jsx`

**Location:** Replace existing "Forms Used Display" section (lines ~5589-5606)

**Challenge:** Aggregated view doesn't have `characterIdRecord` readily available - need to aggregate per-form stats across all matches.

**Solution:** Create aggregated per-form data in `getAggregatedData()` function:

```javascript
// In getAggregatedData() function (lines ~1100-1600)
// Add new processing to aggregate per-form stats

// For each character, track per-form aggregated stats
charData.perFormAggregated = {}; // NEW: { formId: { damageDone: X, ... } }

// When processing matches:
if (characterIdRecord && formChangeHistory && formChangeHistory.length > 0) {
  const perFormStats = calculatePerFormStats(char, characterIdRecord, formChangeHistory);
  
  perFormStats.forEach(formStat => {
    if (!charData.perFormAggregated[formStat.formId]) {
      charData.perFormAggregated[formStat.formId] = {
        damageDone: 0,
        damageTaken: 0,
        battleTime: 0,
        battleCount: 0,
        matchCount: 0,
        // ... all other stats initialized to 0
      };
    }
    
    // Accumulate stats for this form across all matches
    const formAgg = charData.perFormAggregated[formStat.formId];
    formAgg.damageDone += formStat.damageDone;
    formAgg.damageTaken += formStat.damageTaken;
    formAgg.battleTime += formStat.battleTime;
    formAgg.battleCount += formStat.battleCount;
    formAgg.matchCount += 1;
    // ... accumulate all other stats
  });
}
```

**Integration:**
```jsx
{/* Forms Used Display - Aggregated */}
{stats.formChangeHistory && stats.perFormAggregated && (
  <PerFormStatsDisplay
    // Pass aggregated per-form data instead of single match data
    perFormAggregatedData={stats.perFormAggregated}
    formChangeHistory={charData.allFormsUsed} // Array of all form IDs used
    formChangeHistoryText={stats.formChangeHistory}
    charMap={charMap}
    darkMode={darkMode}
    context="aggregated"
    isAggregated={true} // Flag to handle averaging
  />
)}
```

#### 3.3 Team Rankings View Integration (NEW)

**File:** `apps/analyzer/src/App.jsx`

**Location:** Inside character performance expanded panel (after line ~6140)

**Current Structure:**
```jsx
{/* Expanded Details - Match Aggregated Stats */}
{isCharExpanded && (
  <div className={`px-3 pb-3`}>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {/* Combat Performance Section */}
      {/* Survival & Health Section */}
      {/* NEW: Add Per-Form Stats here */}
    </div>
  </div>
)}
```

**New Addition:**
```jsx
{/* Expanded Details */}
{isCharExpanded && (
  <div className={`px-3 pb-3`}>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {/* Existing sections... */}
    </div>
    
    {/* NEW: Per-Form Stats - Full Width Below Other Stats */}
    {charStats.perFormAggregated && Object.keys(charStats.perFormAggregated).length > 0 && (
      <div className="mt-3">
        <PerFormStatsDisplay
          perFormAggregatedData={charStats.perFormAggregated}
          formChangeHistory={charStats.allFormsUsed}
          formChangeHistoryText={charStats.formChangeHistoryText}
          charMap={charMap}
          darkMode={darkMode}
          context="team-rankings"
          isAggregated={true}
        />
      </div>
    )}
  </div>
)}
```

**Data Requirements:**
- `getTeamAggregatedData()` function (lines ~1674+) needs to calculate per-form aggregated stats
- Add same logic as aggregated view to track `perFormAggregated` for each character
- Include form change history text generation

---

## Implementation Checklist

### Phase 1: Foundation (Data Processing)
- [ ] Create `apps/analyzer/src/utils/formStatsCalculator.js`
- [ ] Implement `calculatePerFormStats()` function
  - [ ] Handle first form (direct snapshot)
  - [ ] Handle middle forms (snapshot subtraction)
  - [ ] Handle final form (characterRecord - last snapshot)
  - [ ] Include all stat fields (damage, time, abilities, mechanics, etc.)
- [ ] Implement `formatPerFormStatsForDisplay()` function
  - [ ] Apply character name mapping
  - [ ] Calculate derived stats (DPS, efficiency, etc.)
  - [ ] Format numbers for display
- [ ] Add unit tests for calculation logic
  - [ ] Test with Vegeta 3-form example from `New Json.json`
  - [ ] Test with Goku 2-form example from `BattleResult_6.json`
  - [ ] Test edge case: no transformations

### Phase 2: Component Development
- [ ] Create `apps/analyzer/src/components/PerFormStatsDisplay.jsx`
- [ ] Implement `PerFormStatsDisplay` main component
  - [ ] Expandable/collapsible state management
  - [ ] Support both single-match and aggregated contexts
  - [ ] Dark mode styling
  - [ ] Responsive layout (mobile/desktop)
- [ ] Implement `FormStatCard` sub-component
  - [ ] Form header with number and name
  - [ ] Combat section with damage stats
  - [ ] Survival section with HP/time stats
  - [ ] Special abilities section (conditional on context)
  - [ ] Combat mechanics section (conditional on context)
  - [ ] Final form badge
- [ ] Implement `StatSection` utility component
  - [ ] Reusable stat grouping
  - [ ] Icon support
  - [ ] Consistent styling

### Phase 3: Single Match Integration
- [ ] Import `PerFormStatsDisplay` in `App.jsx`
- [ ] Modify character data passing to include full `char` object
- [ ] Replace existing forms display (lines ~5303-5320 for P1)
- [ ] Replace existing forms display (lines ~5589-5606 for P2)
- [ ] Test with transformation examples
  - [ ] Verify calculations match expected values
  - [ ] Verify UI renders correctly
  - [ ] Test expand/collapse interaction

### Phase 4: Aggregated Stats Integration
- [ ] Modify `getAggregatedData()` function (lines ~1100-1600)
  - [ ] Add `perFormAggregated` object to character data
  - [ ] Process `characterIdRecord` in each match
  - [ ] Accumulate per-form stats across matches
  - [ ] Calculate averages for display
- [ ] Add `formChangeHistoryText` to aggregated character data
- [ ] Add `allFormsUsed` array to track all forms
- [ ] Replace existing forms display in aggregated view
- [ ] Test with multi-match datasets
  - [ ] Verify aggregation accuracy
  - [ ] Verify averages calculated correctly

### Phase 5: Team Rankings Integration (NEW)
- [ ] Modify `getTeamAggregatedData()` function (lines ~1674+)
  - [ ] Add same per-form aggregation logic as aggregated view
  - [ ] Include per-form data in `team.characterAverages[charName]`
  - [ ] Generate form change history text
- [ ] Add per-form stats display in character expanded panel (after line ~6140)
- [ ] Position below existing Combat/Survival sections
- [ ] Test with team ranking data
  - [ ] Verify form stats appear for transformed characters
  - [ ] Verify stats are accurate
  - [ ] Verify layout works in team context

### Phase 6: Polish & Testing
- [ ] Ensure consistent dark mode styling across all views
- [ ] Verify responsive behavior (mobile, tablet, desktop)
- [ ] Test expand/collapse animations smooth
- [ ] Test with edge cases:
  - [ ] Character never transforms
  - [ ] Character transforms multiple times (3+ forms)
  - [ ] Missing `characterIdRecord` data
  - [ ] Incomplete transformation data
- [ ] Performance testing with large datasets
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)

### Phase 7: Documentation
- [ ] Update README.md with new feature description
- [ ] Add screenshots/GIFs of expandable view
- [ ] Document data requirements for per-form stats
- [ ] Add code comments explaining calculation logic
- [ ] Update any existing docs referencing form displays

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Battle Result JSON File                      │
│                                                                   │
│  • characterRecord (final state)                                │
│  • characterIdRecord (transformation snapshots)                 │
│  • formChangeHistory (transformation sequence)                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
         ┌───────────────────────────────────┐
         │  formStatsCalculator.js           │
         │                                    │
         │  calculatePerFormStats()           │
         │  • Extract transformation chain    │
         │  • Calculate stats per form        │
         │  • Apply subtraction formula       │
         └───────────────┬───────────────────┘
                         │
                         ▼
         ┌───────────────────────────────────┐
         │  Per-Form Stats Array              │
         │                                    │
         │  [                                 │
         │    { formNumber: 1, formId, ... }, │
         │    { formNumber: 2, formId, ... }, │
         │    { formNumber: 3, formId, ... }  │
         │  ]                                 │
         └───────────────┬───────────────────┘
                         │
         ┌───────────────┴──────────────────┐
         │                                   │
         ▼                                   ▼
┌────────────────────┐          ┌──────────────────────────┐
│  Single Match      │          │  Aggregated / Rankings   │
│  (Direct Stats)    │          │  (Accumulated Stats)     │
└────────┬───────────┘          └───────────┬──────────────┘
         │                                   │
         ▼                                   ▼
┌─────────────────────────────────────────────────────────┐
│            PerFormStatsDisplay Component                │
│                                                           │
│  • Expandable header                                     │
│  • Summary text (form chain)                             │
│  • Per-form breakdown cards (when expanded)              │
└───────────────────────────────────────────────────────────┘
```

---

## Edge Cases & Error Handling

### 1. No Transformations
**Scenario:** Character never transforms during match  
**Behavior:** Don't display per-form stats component at all  
**Implementation:** Early return if `formChangeHistory` is empty or null

### 2. Missing characterIdRecord
**Scenario:** Older JSON files or incomplete data  
**Behavior:** Gracefully degrade - show summary text only, disable expansion  
**Implementation:** Check for `characterIdRecord` existence before calculating

### 3. Incomplete Snapshot Data
**Scenario:** Snapshot missing specific stat fields  
**Behavior:** Default missing stats to 0, show warning in console  
**Implementation:** Use optional chaining and nullish coalescing

### 4. Multiple Rapid Transformations
**Scenario:** Character transforms 4+ times in single match  
**Behavior:** Display all forms, consider adding scroll for space constraints  
**Implementation:** No special handling needed, grid layout handles overflow

### 5. Aggregated Data with Inconsistent Forms
**Scenario:** Character uses different forms across different matches  
**Behavior:** Track all unique forms, show aggregate for each  
**Implementation:** Use Set to collect unique form IDs, aggregate separately

### 6. Zero Battle Time in Form
**Scenario:** Instant transformation before any actions  
**Behavior:** Show 0 values, avoid division by zero in DPS calculation  
**Implementation:** Check for zero before dividing: `battleTime > 0 ? ... : 0`

---

## Performance Considerations

### 1. Calculation Caching
- Calculate per-form stats once when data loads
- Store results in component state or memoized value
- Avoid recalculating on every render

### 2. Conditional Rendering
- Only render expanded content when expanded
- Use React lazy loading if stats components become heavy
- Consider virtualization if 5+ forms become common

### 3. Data Size
- Per-form breakdown adds ~1-3 KB per transformed character
- Minimal impact on overall app performance
- No backend/API changes needed (all client-side calculation)

---

## Future Enhancements (Out of Scope for Initial Implementation)

1. **Per-Form Performance Scores:**
   - Calculate individual performance scores for each form
   - Compare forms to identify strongest transformation

2. **Form Comparison Charts:**
   - Side-by-side bar charts comparing stats across forms
   - Visual representation of damage progression

3. **Form Usage Analytics:**
   - Track which forms are used most frequently
   - Identify optimal transformation timing

4. **Export Per-Form Stats:**
   - Include per-form breakdown in Excel export
   - Separate sheets for each form

5. **Animation Transitions:**
   - Smooth number counting when expanding
   - Visual flow between form transitions

---

## Success Criteria

✅ **Feature Complete When:**
1. Per-form stats display in all three views (Single Match, Aggregated, Team Rankings)
2. Calculations match documented formulas exactly
3. Expandable UI works smoothly with responsive design
4. Dark mode fully supported
5. No breaking changes to existing functionality
6. Edge cases handled gracefully
7. Performance remains fast with large datasets

✅ **Testing Complete When:**
1. Manual testing confirms accuracy with known data examples
2. All three views tested with transform & non-transform characters
3. Mobile and desktop layouts verified
4. Dark/light mode styling confirmed
5. Edge cases tested (no transforms, missing data, etc.)

---

## Timeline Estimate

- **Phase 1 (Data Processing):** 2-3 hours
- **Phase 2 (Component Development):** 3-4 hours
- **Phase 3 (Single Match Integration):** 1-2 hours
- **Phase 4 (Aggregated Integration):** 2-3 hours
- **Phase 5 (Team Rankings Integration):** 2-3 hours
- **Phase 6 (Polish & Testing):** 2-3 hours
- **Phase 7 (Documentation):** 1 hour

**Total Estimated Time:** 13-19 hours of development work

---

## Questions for Clarification

1. **Priority Order:** Which view should we implement first? (Recommendation: Single Match → Aggregated → Team Rankings)

2. **Default State:** Should the per-form stats be expanded or collapsed by default?

3. **Mobile Layout:** For mobile, should we show all stat sections or condense to essential stats only?

4. **Stat Selection:** Are there specific stats that are MORE important for per-form breakdown? (Currently showing all available)

5. **Visual Distinction:** Should final form have special styling beyond the badge? (e.g., different border color, highlight)

6. **Team Rankings Space:** Team Rankings already has a lot of info - should per-form stats be in a separate collapsible section or integrated into existing layout?

---

## References

- **Transformation Data Analysis:** `CHARACTER_TRANSFORMATION_TRACKING_ANALYSIS.md`
- **Example Data Files:** 
  - `AddTeamtoFiles/New Json.json` (Vegeta 3-form example)
  - `AddTeamtoFiles/BattleResult_6.json` (Goku 2-form example)
- **Current Implementation:** `apps/analyzer/src/App.jsx` lines ~5303, ~5589, ~6140
