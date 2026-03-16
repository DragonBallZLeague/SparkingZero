# Map Filtering Implementation Plan

## Overview
Add Map data tracking and filtering functionality to the analyzer app's Aggregated Stats view. This will allow users to filter character performance statistics by the maps they fought on, similar to the existing Team filtering functionality.

## Current State Analysis

### Existing Team Filter Implementation
- **State Management**: Uses `selectedTeams` array state (line 3226 in App.jsx)
- **UI Component**: MultiSelectCombobox component for team selection
- **Chip Display**: Selected teams shown as removable chips above the combobox
- **Data Flow**: 
  1. Teams extracted from battle results and stored in `TeamBattleResults.teams` array
  2. Each character match records `team` and `opponentTeam` fields (line 1719)
  3. `availableTeams` computed via `useMemo` from aggregated data (line 3921-3929)
  4. Filter applied in aggregated data processing (line 3295-3299)
  5. Stats recalculated based on filtered matches (line 3313+)

### Map Data Location in Battle Results JSON
- **Primary Field**: `battleResult.originalMap.key` (e.g., "Map006")
- **Secondary Field**: `battleResult.mapRecord` (contains map-specific battle stats)
- **Format**: Map IDs like "Map000", "Map001", "Map005", etc.

### Reference Data
- **File Created**: `referencedata/maps.csv`
- **Structure**: `map_name,map_id`
- **Example Entries**:
  - Planet Namek,Map000
  - Tournament of Power Arena,Map005
  - Hyperbolic Time Chamber,Map006
  - City (Daytime),Map003

## Implementation Plan

### Phase 1: Map Reference Data Loading

#### 1.1 Import Map CSV Data
**File**: `apps/analyzer/src/App.jsx`

**Location**: After line 56 (after capsulesCSV import)

```javascript
import mapsCSV from '../../../referencedata/maps.csv?raw';
```

#### 1.2 Parse Map CSV to Create Map Lookup
**File**: `apps/analyzer/src/App.jsx`

**Location**: After the character and capsule parsing logic (around line 110-200)

**Implementation**:
```javascript
// Parse maps.csv
const mapsMap = useMemo(() => {
  const map = {};
  const lines = mapsCSV.trim().split('\n');
  
  for (let i = 1; i < lines.length; i++) { // Skip header
    const line = lines[i].trim();
    if (!line) continue;
    
    const [mapName, mapId] = line.split(',').map(s => s.trim());
    if (mapId && mapName) {
      map[mapId] = mapName;
    }
  }
  
  return map;
}, []);
```

**Purpose**: Create a lookup table to convert Map IDs (e.g., "Map006") to human-readable names (e.g., "Hyperbolic Time Chamber")

---

### Phase 2: Extract Map Data from Battle Results

#### 2.1 Add Map Extraction Logic
**File**: `apps/analyzer/src/App.jsx`

**Location**: In the battle result processing sections where teams are extracted

**Areas to Modify**:

##### A. Manual Files Processing (around line 1880-1900)
After extracting teams, extract map data:

```javascript
let teams, battleWinLose, mapId;

if (file.content.TeamBattleResults) {
  teams = file.content.TeamBattleResults.teams;
  
  // Extract map data
  if (file.content.TeamBattleResults.battleResult?.originalMap?.key) {
    mapId = file.content.TeamBattleResults.battleResult.originalMap.key;
  } else if (file.content.TeamBattleResults.BattleResults?.originalMap?.key) {
    mapId = file.content.TeamBattleResults.BattleResults.originalMap.key;
  }
  
  // ... rest of existing code
}
```

##### B. Reference Files Processing (around line 2290-2320)
Similar map extraction for reference data files:

```javascript
let teams, battleWinLose, mapId;

if (file.content.TeamBattleResults) {
  teams = file.content.TeamBattleResults.teams;
  
  if (file.content.TeamBattleResults.battleResult?.originalMap?.key) {
    mapId = file.content.TeamBattleResults.battleResult.originalMap.key;
  } else if (file.content.TeamBattleResults.BattleResults?.originalMap?.key) {
    mapId = file.content.TeamBattleResults.BattleResults.originalMap.key;
  }
  
  // ... rest of existing code
}
```

#### 2.2 Pass Map Data to Character Record Processing
**File**: `apps/analyzer/src/App.jsx`

**Modification Points**:

1. **Update processCharacterRecord function signature** (line 1209):
   ```javascript
   function processCharacterRecord(characterRecord, characterIdRecord = null, teams = null, fileName = '', battleWinLose = '', mapId = null)
   ```

2. **Update all processCharacterRecord calls**:
   - Line ~1410: Manual file processing
   - Line ~1924: Team array format processing
   - Line ~1950: Reference file processing

   Example:
   ```javascript
   processCharacterRecord(characterRecord, characterIdRecord, teams, fileName, battleWinLose, mapId);
   ```

---

### Phase 3: Store Map Data in Character Matches

#### 3.1 Add Map Fields to Character Data Structure
**File**: `apps/analyzer/src/App.jsx`

**Location**: In character stats initialization (around line 1490-1570)

**Addition**:
```javascript
if (!characterStats[aggregationKey]) {
  characterStats[aggregationKey] = {
    name: aggregationKey,
    // ... existing fields ...
    matches: [],
    teamsUsed: {},
    aiStrategiesUsed: {},
    mapsUsed: {}, // NEW: Track maps this character fought on
    // ... rest of fields ...
  };
}
```

#### 3.2 Track Map Usage Per Character
**File**: `apps/analyzer/src/App.jsx`

**Location**: Where team data is tracked (around line 1566)

**Addition**:
```javascript
// Track which team this character was on
if (teamName) {
  charData.teamsUsed[teamName] = (charData.teamsUsed[teamName] || 0) + 1;
}

// Track which maps this character fought on
if (mapId) {
  const mapName = mapsMap[mapId] || mapId; // Use friendly name or fall back to ID
  charData.mapsUsed[mapName] = (charData.mapsUsed[mapName] || 0) + 1;
}
```

#### 3.3 Add Map to Individual Match Records
**File**: `apps/analyzer/src/App.jsx`

**Location**: In the match push (around line 1705-1780)

**Addition**:
```javascript
charData.matches.push({
  damageDone: stats.damageDone,
  damageTaken: stats.damageTaken,
  // ... existing fields ...
  team: teamName,
  opponentTeam: opponentTeam,
  aiStrategy: aiStrategy,
  map: mapId ? (mapsMap[mapId] || mapId) : null, // NEW: Add map info
  mapId: mapId, // NEW: Store raw map ID for reference
  // ... rest of fields ...
});
```

---

### Phase 4: Prepare Map Data for Aggregated Stats

#### 4.1 Calculate Maps Used Per Character
**File**: `apps/analyzer/src/App.jsx`

**Location**: In aggregation finalization (around line 1956-1975)

**Addition**:
```javascript
const teamsArray = Object.keys(char.teamsUsed);
const aiStrategiesArray = Object.keys(char.aiStrategiesUsed);
const mapsArray = Object.keys(char.mapsUsed); // NEW

const primaryTeam = teamsArray.length > 0 
  ? teamsArray.reduce((a, b) => char.teamsUsed[a] > char.teamsUsed[b] ? a : b)
  : null;

const primaryAIStrategy = aiStrategiesArray.length > 0
  ? aiStrategiesArray.reduce((a, b) => char.aiStrategiesUsed[a] > char.aiStrategiesUsed[b] ? a : b)
  : null;

const primaryMap = mapsArray.length > 0 // NEW
  ? mapsArray.reduce((a, b) => char.mapsUsed[a] > char.mapsUsed[b] ? a : b)
  : null;

// ... later when creating character object ...
name: charName,
matches: char.matches,
teamsUsed: teamsArray,
aiStrategiesUsed: aiStrategiesArray,
mapsUsed: mapsArray, // NEW
primaryTeam: primaryTeam,
primaryAIStrategy: primaryAIStrategy,
primaryMap: primaryMap, // NEW
```

---

### Phase 5: Add Map Filtering State and Logic

#### 5.1 Add State for Selected Maps
**File**: `apps/analyzer/src/App.jsx`

**Location**: After selectedTeams and selectedAIStrategies state (around line 3226-3227)

```javascript
const [selectedTeams, setSelectedTeams] = useState([]);
const [selectedAIStrategies, setSelectedAIStrategies] = useState([]);
const [selectedMaps, setSelectedMaps] = useState([]); // NEW
```

#### 5.2 Create Available Maps Memo
**File**: `apps/analyzer/src/App.jsx`

**Location**: After availableAIStrategies memo (around line 3932-3941)

```javascript
const availableAIStrategies = useMemo(() => {
  const strategies = new Set();
  aggregatedData.forEach(char => {
    if (char.aiStrategiesUsed) {
      char.aiStrategiesUsed.forEach(ai => strategies.add(ai));
    }
  });
  return Array.from(strategies).sort();
}, [aggregatedData]);

// NEW: Available maps from aggregated data
const availableMaps = useMemo(() => {
  const maps = new Set();
  aggregatedData.forEach(char => {
    if (char.mapsUsed) {
      char.mapsUsed.forEach(map => maps.add(map));
    }
  });
  return Array.from(maps).sort();
}, [aggregatedData]);
```

#### 5.3 Apply Map Filter in Processing
**File**: `apps/analyzer/src/App.jsx`

**Location**: In filterAndRecalculateAggregatedStats function (around line 3295-3307)

```javascript
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

// Apply map filter to matches - NEW
if (selectedMaps.length > 0) {
  filteredMatches = filteredMatches.filter(match => 
    match.map && selectedMaps.includes(match.map)
  );
}
```

#### 5.4 Update Dependency Array
**File**: `apps/analyzer/src/App.jsx`

**Location**: useMemo dependency array (around line 3914)

```javascript
}, [aggregatedData, selectedCharacters, performanceFilters, minMatches, maxMatches, 
    sortBy, sortDirection, selectedTeams, selectedAIStrategies, selectedMaps]); // Added selectedMaps
```

---

### Phase 6: Add Map Filter UI Component

#### 6.1 Add Map Filter Section
**File**: `apps/analyzer/src/App.jsx`

**Location**: After AI Strategy Filter section (around line 5180-5220)

```jsx
{/* AI Strategy Filter */}
{availableAIStrategies.length > 0 && (
  <div className="mb-4">
    {/* ... existing AI strategy filter UI ... */}
  </div>
)}

{/* Map Filter - NEW */}
{availableMaps.length > 0 && (
  <div className="mb-4">
    {/* Selected Maps as Chips */}
    {selectedMaps.length > 0 && (
      <div className="flex flex-wrap gap-2 mb-2">
        {selectedMaps.map(map => (
          <button
            key={map}
            onClick={() => {
              setSelectedMaps(prev => prev.filter(m => m !== map));
            }}
            className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all flex items-center gap-1 ${
              darkMode 
                ? 'bg-green-900 border-green-600 text-green-300 hover:bg-green-800' 
                : 'bg-green-100 border-green-500 text-green-700 hover:bg-green-200'
            }`}
          >
            {map}
            <X className="w-3 h-3" />
          </button>
        ))}
        <button
          onClick={() => setSelectedMaps([])}
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
        <Target className="w-5 h-5" />
        Maps
      </div>
      <MultiSelectCombobox
        items={availableMaps.map(map => ({ id: map, name: map }))}
        selectedIds={selectedMaps}
        placeholder="Search and select maps..."
        onAdd={(id) => setSelectedMaps(prev => [...prev, id])}
        darkMode={darkMode}
        focusColor="green"
      />
    </div>
  </div>
)}
```

**Note**: Using green color theme for maps to differentiate from teams (blue) and AI strategies (purple)

---

### Phase 7: Update Recalculated Stats Display

#### 7.1 Recalculate Maps Used from Filtered Matches
**File**: `apps/analyzer/src/App.jsx`

**Location**: In filterAndRecalculateAggregatedStats function (around line 3378-3395)

```javascript
// Recalculate teams and AI strategies used from filtered matches
const teamsUsed = {};
const aiStrategiesUsed = {};
const mapsUsed = {}; // NEW

filteredMatches.forEach(match => {
  if (match.team) {
    teamsUsed[match.team] = (teamsUsed[match.team] || 0) + 1;
  }
  if (match.aiStrategy) {
    aiStrategiesUsed[match.aiStrategy] = (aiStrategiesUsed[match.aiStrategy] || 0) + 1;
  }
  if (match.map) { // NEW
    mapsUsed[match.map] = (mapsUsed[match.map] || 0) + 1;
  }
});

const teamsArray = Object.keys(teamsUsed);
const aiStrategiesArray = Object.keys(aiStrategiesUsed);
const mapsArray = Object.keys(mapsUsed); // NEW

const primaryTeam = teamsArray.length > 0 
  ? teamsArray.reduce((a, b) => teamsUsed[a] > teamsUsed[b] ? a : b)
  : null;

const primaryAIStrategy = aiStrategiesArray.length > 0
  ? aiStrategiesArray.reduce((a, b) => aiStrategiesUsed[a] > aiStrategiesUsed[b] ? a : b)
  : null;

const primaryMap = mapsArray.length > 0 // NEW
  ? mapsArray.reduce((a, b) => mapsUsed[a] > mapsUsed[b] ? a : b)
  : null;
```

#### 7.2 Include Map Data in Returned Character Object
**File**: `apps/analyzer/src/App.jsx`

**Location**: In the return statement of filterAndRecalculateAggregatedStats (around line 3880-3900)

```javascript
return {
  ...char,
  matchCount,
  activeMatchCount,
  // ... all the recalculated stats ...
  teamsUsed: teamsArray,
  aiStrategiesUsed: aiStrategiesArray,
  mapsUsed: mapsArray, // NEW
  primaryTeam,
  primaryAIStrategy,
  primaryMap, // NEW
  // ... rest of fields ...
};
```

---

### Phase 8: Testing and Validation

#### 8.1 Test Cases

1. **Map Data Extraction**
   - Verify map IDs are correctly extracted from battle result JSON files
   - Verify map names are correctly resolved from maps.csv
   - Test with files using different JSON structures (TeamBattleResults.battleResult vs BattleResults)

2. **Map Tracking Per Character**
   - Verify each character's matches include map information
   - Verify `mapsUsed` array is correctly populated
   - Verify `primaryMap` is calculated correctly

3. **Map Filter Functionality**
   - Test selecting single map - verify stats recalculate correctly
   - Test selecting multiple maps - verify OR logic works
   - Test combining map filter with team filter - verify AND logic works
   - Test combining map + team + AI strategy filters together
   - Test clearing map filters - verify stats return to unfiltered state

4. **UI Interactions**
   - Test map combobox search functionality
   - Test adding maps via combobox
   - Test removing maps via chip close button
   - Test "Clear all" button
   - Test dark mode styling for map filter components

5. **Edge Cases**
   - Battle result with missing originalMap field
   - Map ID not found in maps.csv (should fall back to showing map ID)
   - Character with no map data (should handle gracefully)
   - Filtering to zero results (should show empty state)

#### 8.2 Validation Criteria

- [ ] Map data correctly extracted from all test battle result files
- [ ] Map names display in human-readable format (not just Map IDs)
- [ ] Filter correctly reduces character list to only those with matches on selected maps
- [ ] Stats recalculate accurately based on filtered matches
- [ ] Multiple filters (team + map + AI strategy) work together correctly
- [ ] UI components match existing design patterns
- [ ] Performance remains acceptable with large datasets
- [ ] No console errors or warnings

---

## Implementation Order Summary

1. **Phase 1**: Import and parse maps.csv reference data
2. **Phase 2**: Extract map data from battle results during file processing
3. **Phase 3**: Store map data in character match records
4. **Phase 4**: Add map aggregation to character statistics
5. **Phase 5**: Implement map filtering state and logic
6. **Phase 6**: Add map filter UI components
7. **Phase 7**: Update stat recalculation to handle map filtering
8. **Phase 8**: Test and validate all functionality

## Files to Modify

1. **apps/analyzer/src/App.jsx** (primary file)
   - Import maps CSV
   - Parse maps data
   - Extract map from battle results
   - Store map in match records
   - Add filtering state and logic
   - Add UI components

2. **No new files needed** - all changes are in existing App.jsx

## Benefits

1. **Performance Analysis by Map**: Users can see how characters perform on different stages
2. **Stage Counter-picking**: Identify which characters excel on which maps
3. **Meta Insights**: Discover if certain maps favor certain playstyles or character types
4. **Consistent UX**: Uses same filtering pattern as teams and AI strategies

## Future Enhancements

1. Add map-specific statistics (e.g., destruction count from mapRecord)
2. Add visual map icons/thumbnails to the filter UI
3. Add map performance summary view (similar to team rivalry matrix)
4. Export map analysis data in Excel reports
5. Add map recommendations based on character selection

## Notes

- Map IDs in battle results use format: "Map000", "Map001", etc.
- Some maps have variants (daytime/evening/night) that are tracked separately
- Story mode exclusive maps are included in the reference data
- Filter uses friendly map names from CSV, not raw Map IDs
- Color scheme: Maps use green theme to differentiate from teams (blue) and AI strategies (purple)
