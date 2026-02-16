# AI Strategy Effectiveness - Character Filter Implementation Plan

## Overview
Add a character filter to the AI Strategy Effectiveness section that allows users to filter all AI strategy data by a specific character. The filter will appear to the left of the existing "Filter by Type" dropdown and provide a searchable character selection interface.

## Current State Analysis

### Existing Components
- **AIStrategyAnalysis.jsx** - Main component with filtering/sorting logic
- **AIStrategyCard.jsx** - Individual AI strategy card display
- **AIStrategyExpandedPanel.jsx** - Detailed view with expanded metrics
- **BehaviorInsightsSection.jsx** - Behavioral pattern analysis
- **aiStrategyCalculator.js** - Data calculation and aggregation

### Current Filters
1. **Filter by Type** - Attack, Defense, Balanced, All Types
2. **Sort By** - Most Used, Highest Win Rate, Best Performance
3. **Min Matches** - Slider (1-50+ matches)

### Data Structure
```javascript
aiMetrics = {
  "Balanced Strategy: Melee": {
    name: "Balanced Strategy: Melee",
    type: "Balanced",
    totalMatches: 91,
    characterUsage: {
      "Goku (Super)": {
        name: "Goku (Super)",
        matches: 15,
        wins: 10,
        winRate: 66.7,
        totalDamage: 45000,
        buildTypeUsage: { "Melee Focus": 12, "Hybrid": 3 }
      },
      // ... more characters
    },
    // ... other metrics
  },
  // ... more AI strategies
}
```

## Implementation Plan

### Phase 1: Character List Preparation

#### 1.1 Extract Unique Characters
**File:** `src/utils/aiStrategyCalculator.js`

Add function to extract all unique characters across all AI strategies:

```javascript
/**
 * Extract all unique characters used across all AI strategies
 * @param {Object} aiMetrics - All AI metrics
 * @returns {Array} Sorted array of unique character names
 */
export function extractUniqueCharacters(aiMetrics) {
  const characterSet = new Set();
  
  Object.values(aiMetrics).forEach(ai => {
    Object.keys(ai.characterUsage || {}).forEach(charName => {
      characterSet.add(charName);
    });
  });
  
  return Array.from(characterSet).sort();
}
```

**Location:** Add after `calculateAIStrategyMetrics` function (around line 700)

**Why:** Provides a centralized list of all characters that have been used with any AI strategy.

---

### Phase 2: Character Search Component

#### 2.1 Create CharacterSearchInput Component
**File:** `src/components/ai-strategy/CharacterSearchInput.jsx` (NEW)

**Purpose:** Reusable searchable dropdown for character selection

```jsx
import React, { useState, useRef, useEffect } from 'react';
import { Search, X, User } from 'lucide-react';

/**
 * CharacterSearchInput Component
 * 
 * Searchable dropdown for character selection with type-to-search functionality
 */
export default function CharacterSearchInput({ 
  characters, 
  selectedCharacter, 
  onSelect, 
  darkMode = false,
  disabled = false 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);
  
  // Filter characters based on search term
  const filteredCharacters = characters.filter(char =>
    char.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Handle character selection
  const handleSelect = (character) => {
    onSelect(character);
    setIsOpen(false);
    setSearchTerm('');
  };
  
  // Clear selection
  const handleClear = (e) => {
    e.stopPropagation();
    onSelect(null);
    setSearchTerm('');
  };
  
  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selected Display / Search Trigger */}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-3 py-2 rounded-lg border flex items-center justify-between ${
          disabled 
            ? darkMode ? 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed' 
                       : 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
            : darkMode 
              ? 'bg-gray-800 border-gray-600 text-white hover:border-purple-500' 
              : 'bg-white border-gray-300 text-gray-900 hover:border-purple-400'
        } focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-colors`}
      >
        <span className="flex items-center gap-2 flex-1 text-left truncate">
          <User className="w-4 h-4 flex-shrink-0" />
          {selectedCharacter ? (
            <span className="truncate">{selectedCharacter}</span>
          ) : (
            <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
              All Characters
            </span>
          )}
        </span>
        
        {selectedCharacter ? (
          <X 
            className="w-4 h-4 flex-shrink-0 hover:text-red-500" 
            onClick={handleClear}
          />
        ) : (
          <Search className="w-4 h-4 flex-shrink-0" />
        )}
      </button>
      
      {/* Dropdown */}
      {isOpen && (
        <div className={`absolute z-50 mt-2 w-full max-h-80 rounded-lg border shadow-xl overflow-hidden ${
          darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'
        }`}>
          {/* Search Input */}
          <div className={`p-2 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
                darkMode ? 'text-gray-400' : 'text-gray-500'
              }`} />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search characters..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
                className={`w-full pl-9 pr-3 py-2 rounded border ${
                  darkMode 
                    ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-500' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                } focus:outline-none focus:ring-2 focus:ring-purple-500/50`}
              />
            </div>
          </div>
          
          {/* Character List */}
          <div className="overflow-y-auto max-h-64">
            {/* All Characters Option */}
            <button
              onClick={() => handleSelect(null)}
              className={`w-full px-4 py-2 text-left transition-colors ${
                !selectedCharacter
                  ? darkMode ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-700'
                  : darkMode ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-100 text-gray-900'
              }`}
            >
              All Characters
            </button>
            
            {filteredCharacters.length > 0 ? (
              filteredCharacters.map(character => (
                <button
                  key={character}
                  onClick={() => handleSelect(character)}
                  className={`w-full px-4 py-2 text-left transition-colors ${
                    selectedCharacter === character
                      ? darkMode ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-700'
                      : darkMode ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-100 text-gray-900'
                  }`}
                >
                  {character}
                </button>
              ))
            ) : (
              <div className={`px-4 py-8 text-center text-sm ${
                darkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                No characters found matching "{searchTerm}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

**Features:**
- Type-to-search functionality
- Clear selection button (X icon)
- "All Characters" option to reset filter
- Keyboard and mouse interaction support
- Scrollable dropdown for many characters
- Dark mode support
- Click-outside-to-close behavior

---

### Phase 3: Filter Integration

#### 3.1 Update AIStrategyAnalysis Component
**File:** `src/components/ai-strategy/AIStrategyAnalysis.jsx`

**Changes:**

1. **Import Character Search Component**
```jsx
// Add to imports (line ~7)
import CharacterSearchInput from './CharacterSearchInput.jsx';
import { extractUniqueCharacters } from '../../utils/aiStrategyCalculator.js';
```

2. **Add State for Character Filter**
```jsx
// Add to state declarations (after line 27)
const [selectedCharacter, setSelectedCharacter] = useState(null);
```

3. **Extract Character List**
```jsx
// Add after insights useMemo (around line 24)
const availableCharacters = useMemo(() => {
  return extractUniqueCharacters(aiMetrics);
}, [aiMetrics]);
```

4. **Update Filtering Logic**

**Current filtering logic** (lines 47-75):
```jsx
// Filter and sort strategies
const filteredAndSortedStrategies = useMemo(() => {
  let strategies = Object.values(aiMetrics);
  
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
}, [aiMetrics, filterType, sortBy, minMatches]);
```

**Updated filtering logic:**
```jsx
// Filter and sort strategies
const filteredAndSortedStrategies = useMemo(() => {
  let strategies = Object.values(aiMetrics);
  
  // Filter by character (NEW)
  if (selectedCharacter) {
    strategies = strategies.filter(ai => 
      ai.characterUsage && ai.characterUsage[selectedCharacter]
    );
  }
  
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
}, [aiMetrics, filterType, sortBy, minMatches, selectedCharacter]); // Add selectedCharacter dependency
```

5. **Update Controls Section Layout**

**Current layout** (lines 116-151 - 3 columns):
```jsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  {/* Filter by Type */}
  {/* Sort By */}
  {/* Minimum Matches */}
</div>
```

**Updated layout** (4 columns with character filter first):
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  {/* Character Filter - NEW */}
  <div>
    <label className={`text-sm font-medium mb-2 block ${
      darkMode ? 'text-gray-300' : 'text-gray-700'
    }`}>
      <User className="w-4 h-4 inline mr-1" />
      Filter by Character
    </label>
    <CharacterSearchInput
      characters={availableCharacters}
      selectedCharacter={selectedCharacter}
      onSelect={setSelectedCharacter}
      darkMode={darkMode}
      disabled={availableCharacters.length === 0}
    />
  </div>
  
  {/* Filter by Type */}
  <div>
    {/* Existing Filter by Type code */}
  </div>
  
  {/* Sort By */}
  <div>
    {/* Existing Sort By code */}
  </div>
  
  {/* Minimum Matches */}
  <div>
    {/* Existing Min Matches code */}
  </div>
</div>
```

6. **Import User Icon**
```jsx
// Update imports (line 3)
import { Brain, Filter, TrendingUp, Target, User } from 'lucide-react';
```

---

### Phase 4: Character-Filtered Data in Cards and Panels

#### 4.1 Filter Character-Specific Metrics in aiStrategyCalculator

**File:** `src/utils/aiStrategyCalculator.js`

Add function to filter AI metrics by character:

```javascript
/**
 * Filter AI metrics to show only data for a specific character
 * @param {Object} aiMetrics - AI strategy metrics
 * @param {string} characterName - Character to filter by
 * @returns {Object} Filtered AI metrics with character-specific data
 */
export function filterAIMetricsByCharacter(aiMetrics, characterName) {
  if (!characterName) return aiMetrics;
  
  const filtered = {};
  
  Object.entries(aiMetrics).forEach(([aiName, ai]) => {
    const charUsage = ai.characterUsage?.[characterName];
    
    // Only include AI if this character was used with it
    if (charUsage) {
      filtered[aiName] = {
        ...ai,
        // Override metrics with character-specific data where available
        characterFilteredData: {
          matches: charUsage.matches,
          winRate: charUsage.winRate,
          totalDamage: charUsage.totalDamage,
          buildTypeUsage: charUsage.buildTypeUsage
        },
        // Keep original data for reference
        _unfilteredTotalMatches: ai.totalMatches,
        _unfilteredWinRate: ai.winRate
      };
    }
  });
  
  return filtered;
}
```

**Location:** Add after `extractUniqueCharacters` function

**Why:** Provides character-specific metrics while preserving original aggregate data.

#### 4.2 Update AIStrategyAnalysis to Pass Filtered Data

**Changes in AIStrategyAnalysis.jsx:**

1. **Create filtered metrics for display**
```jsx
// Add after filteredAndSortedStrategies useMemo (around line 75)
const displayMetrics = useMemo(() => {
  if (!selectedCharacter) return aiMetrics;
  return filterAIMetricsByCharacter(aiMetrics, selectedCharacter);
}, [aiMetrics, selectedCharacter]);
```

2. **Update AIStrategyCard to use filtered data**
```jsx
// Update in Strategy Cards section (around line 223)
{filteredAndSortedStrategies.map(ai => {
  const displayAI = displayMetrics[ai.name] || ai;
  return (
    <AIStrategyCard
      key={ai.name}
      aiMetrics={displayAI}
      darkMode={darkMode}
      onClick={() => setSelectedAI(displayAI)}
      characterFiltered={!!selectedCharacter}
      selectedCharacter={selectedCharacter}
    />
  );
})}
```

3. **Update AIStrategyExpandedPanel to use filtered data**
```jsx
// Update in Expanded Panel Modal section (around line 251)
<AIStrategyExpandedPanel
  aiMetrics={selectedAI}
  allAIMetrics={displayMetrics}
  darkMode={darkMode}
  onClose={() => setSelectedAI(null)}
  characterFiltered={!!selectedCharacter}
  selectedCharacter={selectedCharacter}
/>
```

#### 4.3 Update AIStrategyCard Component

**File:** `src/components/ai-strategy/AIStrategyCard.jsx`

**Changes:**

1. **Update props**
```jsx
// Update function signature (line 10)
export default function AIStrategyCard({ 
  aiMetrics, 
  darkMode = false, 
  onClick,
  characterFiltered = false,
  selectedCharacter = null
}) {
```

2. **Add character filter indicator badge**
```jsx
// Add in header section after type badge (around line 120)
{characterFiltered && (
  <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded border ${
    darkMode 
      ? 'bg-purple-900/30 text-purple-300 border-purple-700' 
      : 'bg-purple-50 text-purple-700 border-purple-300'
  }`}>
    <User className="w-3 h-3" />
    {selectedCharacter}
  </div>
)}
```

3. **Show character-specific metrics if available**
```jsx
// Add conditional display logic for character-filtered data (after main metrics)
{characterFiltered && aiMetrics.characterFilteredData && (
  <div className={`mt-3 pt-3 border-t text-xs ${
    darkMode ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-600'
  }`}>
    <div className="flex justify-between">
      <span>Character Matches:</span>
      <span className="font-semibold">{aiMetrics.characterFilteredData.matches}</span>
    </div>
    <div className="flex justify-between">
      <span>Character Win Rate:</span>
      <span className={`font-semibold ${getWinRateColor()}`}>
        {aiMetrics.characterFilteredData.winRate.toFixed(1)}%
      </span>
    </div>
  </div>
)}
```

#### 4.4 Update AIStrategyExpandedPanel Component

**File:** `src/components/ai-strategy/AIStrategyExpandedPanel.jsx`

**Changes:**

1. **Update props**
```jsx
// Update function signature (line 28)
export default function AIStrategyExpandedPanel({ 
  aiMetrics, 
  allAIMetrics, 
  darkMode = false, 
  onClose,
  characterFiltered = false,
  selectedCharacter = null
}) {
```

2. **Add character filter indicator in header**
```jsx
// Add after AI name/type display (around line 180)
{characterFiltered && (
  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-sm border ${
    darkMode 
      ? 'bg-purple-900/30 text-purple-300 border-purple-700' 
      : 'bg-purple-50 text-purple-700 border-purple-300'
  }`}>
    <User className="w-4 h-4" />
    <span className="font-medium">Filtered by: {selectedCharacter}</span>
  </div>
)}
```

3. **Filter character list to show only selected character when filtered**
```jsx
// Update character display logic (around line 450)
const displayCharacters = useMemo(() => {
  let chars = characterUsage;
  
  // If character filtered, only show that character
  if (characterFiltered && selectedCharacter) {
    chars = chars.filter(char => char.name === selectedCharacter);
  }
  
  // Apply sorting
  chars.sort((a, b) => {
    switch (characterSortBy) {
      case 'matches':
        return b.matches - a.matches;
      case 'winRate':
        return b.winRate - a.winRate;
      case 'damage':
        return b.avgDamage - a.avgDamage;
      default:
        return b.matches - a.matches;
    }
  });
  
  return showAllCharacters ? chars : chars.slice(0, 10);
}, [characterUsage, characterSortBy, showAllCharacters, characterFiltered, selectedCharacter]);
```

4. **Update character count display**
```jsx
// Update character count text (around line 480)
<p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
  {characterFiltered 
    ? `Showing data for ${selectedCharacter}`
    : `Used with ${uniqueCharacters} unique character${uniqueCharacters !== 1 ? 's' : ''}`
  }
</p>
```

#### 4.5 Update BehaviorInsightsSection Component

**File:** `src/components/ai-strategy/BehaviorInsightsSection.jsx`

**Changes:**

1. **Update props**
```jsx
// Update function signature (line 38)
export default function BehaviorInsightsSection({ 
  aiMetrics, 
  allAIMetrics, 
  darkMode = false,
  characterFiltered = false,
  selectedCharacter = null
}) {
```

2. **Add character context to insights header**
```jsx
// Update header (around line 80)
<h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
  Behavior Insights
  {characterFiltered && (
    <span className={`ml-2 text-sm font-normal ${
      darkMode ? 'text-purple-400' : 'text-purple-600'
    }`}>
      for {selectedCharacter}
    </span>
  )}
</h3>
```

3. **Filter behavioral data by character** (if needed)
```jsx
// Add note about character-specific behavioral patterns
{characterFiltered && (
  <div className={`text-xs px-3 py-2 rounded border ${
    darkMode 
      ? 'bg-blue-900/20 border-blue-700 text-blue-300' 
      : 'bg-blue-50 border-blue-200 text-blue-700'
  }`}>
    <strong>Note:</strong> Behavioral insights are calculated from aggregate AI strategy 
    data. Character-specific behavioral patterns may vary.
  </div>
)}
```

---

### Phase 5: Reset Filters Enhancement

#### 5.1 Update Reset Filters Button

**File:** `src/components/ai-strategy/AIStrategyAnalysis.jsx`

**Changes:**

Update the reset filters button in "No Results Message" section (around line 206):

```jsx
<button
  onClick={() => {
    setSelectedCharacter(null); // NEW: Reset character filter
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
```

#### 5.2 Add Clear All Filters Button

Add a new "Clear All Filters" button next to the controls (optional enhancement):

```jsx
// Add after the controls grid (around line 200)
{(selectedCharacter || filterType !== 'all' || minMatches > 1) && (
  <div className="flex justify-end">
    <button
      onClick={() => {
        setSelectedCharacter(null);
        setFilterType('all');
        setMinMatches(1);
      }}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 ${
        darkMode
          ? 'bg-gray-700 hover:bg-gray-600 text-gray-300 border border-gray-600'
          : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
      }`}
    >
      <X className="w-3.5 h-3.5" />
      Clear All Filters
    </button>
  </div>
)}
```

---

## Testing Checklist

### Functional Testing
- [ ] Character filter dropdown opens and closes correctly
- [ ] Type-to-search filters characters as expected
- [ ] Selecting a character filters AI strategies correctly
- [ ] "All Characters" option clears the filter
- [ ] Clear button (X icon) works correctly
- [ ] Character filter works with other filters (Type, Min Matches)
- [ ] Character filter works with sorting options
- [ ] AI Strategy cards show character-specific data when filtered
- [ ] Expanded panel shows character-specific data when filtered
- [ ] Behavioral insights still work with character filter active
- [ ] Character list in expanded panel filters to selected character
- [ ] Reset filters button clears character filter
- [ ] No strategies shown when character has no matches with any AI

### Visual Testing
- [ ] Character filter aligns with other filter controls
- [ ] Dropdown appears correctly in light mode
- [ ] Dropdown appears correctly in dark mode
- [ ] Character filter indicator badges display correctly on cards
- [ ] Character filter indicator displays correctly in expanded panel
- [ ] Scrolling works in dropdown with many characters
- [ ] Search input has proper focus styling
- [ ] Hover states work correctly on character options
- [ ] Selected character is highlighted in dropdown
- [ ] Layout is responsive on mobile/tablet/desktop

### Edge Cases
- [ ] No characters available (empty dataset)
- [ ] Single character in dataset
- [ ] Very long character names (truncation)
- [ ] Special characters in character names
- [ ] Character selected, then data changes (character no longer in list)
- [ ] Multiple rapid filter changes
- [ ] Character filter + Type filter results in zero matches
- [ ] Keyboard navigation (Tab, Enter, Escape)

### Performance Testing
- [ ] Filter response is immediate with large datasets (200+ characters)
- [ ] Search input typing is responsive
- [ ] No lag when opening/closing dropdown
- [ ] Filtered results render quickly

---

## Future Enhancements (Optional)

### Multi-Character Selection
Allow selecting multiple characters to compare their performance across AI strategies:
- Checkbox-based selection
- Shows how multiple characters perform with each AI
- Compare button to view side-by-side analysis

### Character Statistics Summary
Add a summary panel showing:
- Total matches for selected character across all AIs
- Best performing AI for this character
- Win rate across all AIs
- Most used build type

### Favorite Characters
- Save frequently used characters as favorites
- Quick access buttons for favorite characters
- Persist favorites in localStorage

### Character Grouping
Group characters by:
- Series (Z, GT, Super)
- Power level tier
- Character type (Saiyan, Namekian, etc.)
- Form variations (base, SSJ, SSJ2, etc.)

---

## Files to Create/Modify Summary

### New Files
1. `src/components/ai-strategy/CharacterSearchInput.jsx` - Character search dropdown component
2. `docs/AI_STRATEGY_CHARACTER_FILTER_PLAN.md` - This implementation plan

### Modified Files
1. `src/utils/aiStrategyCalculator.js`
   - Add `extractUniqueCharacters()` function
   - Add `filterAIMetricsByCharacter()` function

2. `src/components/ai-strategy/AIStrategyAnalysis.jsx`
   - Add character filter state
   - Add CharacterSearchInput component
   - Update filtering logic
   - Update controls layout (3 cols → 4 cols)
   - Pass filtered data to child components

3. `src/components/ai-strategy/AIStrategyCard.jsx`
   - Add character filter props
   - Add character filter badge
   - Show character-specific metrics

4. `src/components/ai-strategy/AIStrategyExpandedPanel.jsx`
   - Add character filter props
   - Add character filter indicator
   - Filter character list display
   - Update character count text

5. `src/components/ai-strategy/BehaviorInsightsSection.jsx`
   - Add character filter props
   - Add character context to header
   - Add character filter note

---

## Implementation Order

1. **Phase 1** - Character list extraction utility function (~30 min)
2. **Phase 2** - CharacterSearchInput component (~1-2 hours)
3. **Phase 3** - Filter integration in AIStrategyAnalysis (~1 hour)
4. **Phase 4** - Character-filtered data in cards/panels (~2-3 hours)
5. **Phase 5** - Reset filters enhancement (~30 min)
6. **Testing** - Comprehensive testing (~1-2 hours)

**Total Estimated Time:** 6-9 hours

---

## Technical Considerations

### Performance
- Character list is memoized to avoid recalculation
- Filtering uses efficient object lookups
- Dropdown uses virtualization for large character lists (if needed in future)

### Data Integrity
- Handles missing data gracefully (undefined character usage)
- Preserves original aggregate data while showing filtered view
- Validates character exists before filtering

### User Experience
- Instant feedback on filter changes
- Clear visual indication when filters are active
- Easy to reset/clear filters
- Keyboard accessible (Tab, Enter, Escape)
- Click-outside-to-close for dropdown

### Accessibility
- Proper ARIA labels for screen readers
- Keyboard navigation support
- Focus management
- Color contrast meets WCAG standards

---

## Success Criteria

1. ✅ Character filter appears to the left of "Filter by Type"
2. ✅ Users can type to search for characters
3. ✅ Selecting a character filters ALL AI strategy data
4. ✅ Expanded panel shows character-specific metrics
5. ✅ Behavioral insights work with character filter
6. ✅ Clear visual indication of active character filter
7. ✅ Easy to clear/reset character filter
8. ✅ Works seamlessly with existing filters
9. ✅ Responsive design works on all screen sizes
10. ✅ Dark mode support throughout

---

## Notes

- Character names come from `characterUsage` objects in AI metrics
- No need to read from characters.csv - data is already in aggregatedData
- Filter applies to ALL views: cards, expanded panel, and behavioral insights
- Character-specific metrics are calculated at display time, not during initial aggregation
- Preserves aggregate AI data for comparison purposes
