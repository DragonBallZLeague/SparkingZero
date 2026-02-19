# Map Data Table Integration Plan

## Overview
This document outlines the implementation plan for integrating map data into the Character Performance Averages table, Individual Match Performance Details table, and their corresponding Excel exports in the SparkingZero Battle Analyzer.

**Date Created:** February 19, 2026  
**Status:** Planning  
**Priority:** Medium  

---

## Requirements Summary

### 1. Character Performance Averages Table
- **Column Name:** "Main Map"
- **Data Source:** `char.primaryMap` (most frequently used map)
- **Location:** Add to "Identity & Context" column group (after "Primary AI Strategy" would be logical, or after "Primary Team")
- **Excel Export:** Include in Character Averages sheet with standard text formatting

### 2. Individual Match Performance Details Table
- **Column Name:** "Map"
- **Data Source:** `match.map` (friendly map name from mapsMap lookup)
- **Location:** Add to "Match Identity" column group (after "Opponent" or before "Result")
- **Excel Export:** Include in Match Details sheet with standard text formatting

### 3. Excel Export Integration
- Update `excelExport.js` to handle the new map columns
- Ensure proper column width calculation
- Apply appropriate formatting (left-aligned text)
- Include map data in both export sheets

---

## Current System Analysis

### Data Availability
✅ **Already Implemented:**
- `primaryMap` field exists in aggregated character data (line 2065 of App.jsx)
- `map` field exists in match data (line 1728 of App.jsx)
- `mapId` field exists in match data for reference
- Map friendly names resolved via `mapsMap` lookup

### Table Configuration Structure
**Location:** `apps/analyzer/src/components/TableConfigs.jsx` (2405 lines)

**Character Averages:**
- Column groups defined starting at line 40
- Current "Identity & Context" has: name, primaryTeam, matchCount, wins, losses
- "Build & Equipment" group includes primaryAIStrategy (line 921)
- Data preparation: `prepareCharacterAveragesData()` at line 998

**Match Details:**
- Column groups defined starting at line 1101
- Current "Match Identity" has: name, matchNumber, team, opponentTeam, matchResult, fileName
- Data preparation: `prepareMatchDetailsData()` at line 2054

### Excel Export Structure
**Location:** `apps/analyzer/src/utils/excelExport.js` (1646 lines)

- Import table configs from TableConfigs.jsx (line 21)
- Character Averages sheet generation: `generateCharacterAveragesSheet()` (~line 77)
- Match Details sheet generation: `generateMatchDetailsSheet()`
- Column width calculation: `calculateColumnWidth()` function
- Uses ExcelJS library for formatting

---

## Implementation Plan

### Phase 1: Update Character Performance Averages Table ⏱️ ~15 mins

#### 1.1 Add "Main Map" Column to TableConfigs.jsx
**File:** `apps/analyzer/src/components/TableConfigs.jsx`

**Location:** After the `primaryAIStrategy` column definition (~line 933)

**Changes:**
```javascript
{
  key: 'primaryMap',
  header: 'Main Map',
  accessor: (row) => row.primaryMap || 'Unknown',
  sortable: true,
  filterable: true,
  group: 'Build & Equipment', // Or move to 'Identity & Context' if preferred
  exportFormat: { alignment: 'left' },
  render: (row, value) => (
    <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
      {value}
    </span>
  )
}
```

**Note:** Decide whether "Main Map" belongs in:
- **Option A:** "Build & Equipment" group (alongside Primary Team/AI Strategy)
- **Option B:** "Identity & Context" group (after matchCount/wins/losses)

#### 1.2 Update Column Group Definition
Add `'primaryMap'` to the appropriate columnGroups array at line 40 or 45.

**If adding to Build & Equipment (line 45):**
```javascript
{ name: 'Build & Equipment', columns: ['buildComposition', 'meleeCost', 'blastCost', 'kiBlastCost', 'defenseCost', 'skillCost', 'kiEfficiencyCost', 'utilityCost', 'topCapsules', 'primaryAIStrategy', 'primaryMap'] },
```

**OR if adding to Identity & Context (line 40):**
```javascript
{ name: 'Identity & Context', columns: ['name', 'primaryTeam', 'primaryMap', 'matchCount', 'wins', 'losses'] },
```

#### 1.3 Update prepareCharacterAveragesData()
**Location:** Line 1006-1007

Add:
```javascript
primaryTeam: char.primaryTeam || 'Unknown',
primaryAIStrategy: char.primaryAIStrategy || 'Unknown',
primaryMap: char.primaryMap || 'Unknown', // ADD THIS LINE
```

---

### Phase 2: Update Individual Match Performance Details Table ⏱️ ~15 mins

#### 2.1 Add "Map" Column to TableConfigs.jsx
**File:** `apps/analyzer/src/components/TableConfigs.jsx`

**Location:** In the Match Identity section, after `opponentTeam` column (~line 1173)

**Changes:**
```javascript
{
  key: 'map',
  header: 'Map',
  accessor: (row) => row.map || 'Unknown',
  sortable: true,
  filterable: true,
  group: 'Match Identity',
  exportFormat: { alignment: 'left' },
  render: (row, value) => (
    <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
      {value}
    </span>
  )
}
```

#### 2.2 Update Column Group Definition
Add `'map'` to the Match Identity columnGroups array at line 1101.

**Update:**
```javascript
{ name: 'Match Identity', columns: ['name', 'matchNumber', 'team', 'opponentTeam', 'map', 'matchResult', 'fileName'] },
```

#### 2.3 Update prepareMatchDetailsData()
**Location:** Line 2064-2069

Add map field:
```javascript
team: match.team || char.primaryTeam || 'Unknown',
opponentTeam: match.opponentTeam || 'Unknown',
map: match.map || 'Unknown', // ADD THIS LINE
matchResult: match.won ? 'Win' : 'Loss',
fileName: match.fileName || match.source || '',
```

---

### Phase 3: Update Excel Export ⏱️ ~10 mins

#### 3.1 No Code Changes Required! ✨
The Excel export system in `excelExport.js` **automatically reads the column configuration** from `TableConfigs.jsx`:

```javascript
// Line 21: Import table configs
import { getCharacterAveragesTableConfig, getMatchDetailsTableConfig } from '../components/TableConfigs';

// Line 85: Get column configuration dynamically
const config = getCharacterAveragesTableConfig();
const columns = config.columns;
```

This means:
- ✅ New columns added to TableConfigs will automatically appear in Excel exports
- ✅ Column widths will be auto-calculated
- ✅ Export format (alignment, styling) comes from the column definition
- ✅ No manual Excel code changes needed

#### 3.2 Verify Column Width Calculation
The `calculateColumnWidth()` function should handle "Main Map" and "Map" appropriately:
- Default text width calculation based on header length
- Maps are typically short names (e.g., "Namek", "Cell Games Arena")
- Estimated width: 15-20 characters should be sufficient

---

### Phase 4: Testing & Validation ⏱️ ~15 mins

#### 4.1 UI Table Testing
1. **Load aggregated stats view** with battle result files
2. **Character Performance Averages Table:**
   - ✅ Verify "Main Map" column appears
   - ✅ Verify correct map name displays (most used map)
   - ✅ Test sorting by map
   - ✅ Test filtering by map (if applicable)
   - ✅ Verify column grouping/header displays correctly

3. **Individual Match Performance Details Table:**
   - ✅ Verify "Map" column appears
   - ✅ Verify correct map name for each match
   - ✅ Test sorting by map
   - ✅ Test filtering by map
   - ✅ Verify column grouping/header displays correctly

#### 4.2 Excel Export Testing
1. **Export Character Averages only**
   - ✅ "Main Map" column present in Excel
   - ✅ Data matches UI table
   - ✅ Column width appropriate
   - ✅ Text alignment left

2. **Export Match Details only**
   - ✅ "Map" column present in Excel
   - ✅ Data matches UI table
   - ✅ Column width appropriate
   - ✅ Text alignment left

3. **Export full workbook (both sheets)**
   - ✅ Both sheets contain map columns
   - ✅ Formatting consistent
   - ✅ No layout issues

#### 4.3 Edge Case Testing
- ✅ Characters with no primaryMap (should show "Unknown")
- ✅ Matches with null/undefined map (should show "Unknown")
- ✅ Map filtering interaction with team/AI strategy filters
- ✅ Map data with various battle result file formats

---

## File Modification Summary

### Files to Modify: 1
1. **apps/analyzer/src/components/TableConfigs.jsx**
   - Add `primaryMap` column to Character Averages config
   - Add `map` column to Match Details config
   - Update column group definitions
   - Update data preparation functions

### Files NOT Modified: 2
1. **apps/analyzer/src/App.jsx** - No changes needed (data already available)
2. **apps/analyzer/src/utils/excelExport.js** - No changes needed (auto-reads config)

---

## Column Placement Recommendations

### Recommended Placement: Option A (Build & Equipment Group)
**Character Averages:** Place "Main Map" in "Build & Equipment" group after "Primary AI Strategy"

**Reasoning:**
- Keeps contextual metadata together (Team, AI Strategy, Map)
- Maintains "Identity & Context" focused on character identity and match counts
- Parallels the match details structure

### Alternative: Option B (Identity & Context Group)
**Character Averages:** Place "Main Map" in "Identity & Context" after "Primary Team"

**Reasoning:**
- Map is contextual information about where matches were played
- Groups all "primary" fields together (primaryTeam, primaryMap)
- More visible in the leftmost columns

### Match Details Recommendation
**Place "Map" in "Match Identity" group** after "Opponent Team" and before "Result"

**Reasoning:**
- Map is match context, like team and opponent
- Maintains logical flow: Character → Match# → Team → Opponent → **Map** → Result → File
- Keeps all match metadata together

---

## Data Flow Diagram

```
Battle Result JSON
       ↓
   [App.jsx]
  Extract MapID → Lookup mapsMap → Store as match.map
       ↓
  Aggregate Data → Calculate primaryMap (most used)
       ↓
+-----------------+-------------------+
|                 |                   |
[TableConfigs]    [TableConfigs]
Character Avg     Match Details
       ↓                  ↓
primaryMap column    map column
       ↓                  ↓
  [DataTable]       [DataTable]
  UI Render         UI Render
       ↓                  ↓
+-----------------+-------------------+
                  |
            [excelExport.js]
      Auto-reads column configs
                  ↓
           Excel Workbook
      - Character Averages sheet
      - Match Details sheet
```

---

## Implementation Checklist

### Phase 1: Character Averages
- [ ] Add `primaryMap` column definition to getCharacterAveragesTableConfig
- [ ] Update columnGroups array to include 'primaryMap'
- [ ] Add `primaryMap` field to prepareCharacterAveragesData()
- [ ] Test UI table rendering
- [ ] Test sorting/filtering

### Phase 2: Match Details
- [ ] Add `map` column definition to getMatchDetailsTableConfig
- [ ] Update columnGroups array to include 'map'
- [ ] Add `map` field to prepareMatchDetailsData()
- [ ] Test UI table rendering
- [ ] Test sorting/filtering

### Phase 3: Excel Export
- [ ] Verify Character Averages Excel export includes "Main Map"
- [ ] Verify Match Details Excel export includes "Map"
- [ ] Test full workbook export
- [ ] Verify column widths and formatting

### Phase 4: Integration Testing
- [ ] Test with multiple battle result files
- [ ] Test edge cases (missing map data)
- [ ] Test with existing filters (team, AI strategy)
- [ ] Verify no console errors
- [ ] Build production version (`npm run build`)

---

## Risk Assessment

### Low Risk ✅
- **Data Availability:** Map data already exists in both character and match objects
- **Excel Auto-Config:** Export system automatically reads new columns
- **Existing Pattern:** Following established pattern for primaryTeam/primaryAIStrategy

### Minimal Impact 🟡
- **Table Width:** Adding one column to each table (may require horizontal scrolling)
- **Excel File Size:** Negligible increase (text data)
- **Performance:** No performance impact expected

### No Breaking Changes 🟢
- No changes to data aggregation logic
- No changes to filtering system
- No changes to existing columns
- Backwards compatible with existing data

---

## Estimated Implementation Time

| Phase | Task | Time |
|-------|------|------|
| 1 | Character Averages Table | 15 min |
| 2 | Match Details Table | 15 min |
| 3 | Excel Export (verification) | 10 min |
| 4 | Testing & Validation | 15 min |
| **Total** | **End-to-End Implementation** | **~55 min** |

---

## Success Criteria

✅ "Main Map" column visible in Character Performance Averages table  
✅ "Map" column visible in Individual Match Performance Details table  
✅ Map data displays correctly in both tables  
✅ Map columns included in Excel exports  
✅ Sorting and filtering work correctly  
✅ No console errors or warnings  
✅ Production build succeeds  
✅ Edge cases handled gracefully (missing map data shows "Unknown")

---

## Future Enhancements (Out of Scope)

- Map usage statistics (e.g., win rate by map)
- Map thumbnail images in UI
- Map-based performance analysis
- Map recommendation system
- Heatmap visualization of map preferences
- Filter aggregated stats by map (already implemented via map filter UI)

---

## Conclusion

This implementation is **straightforward and low-risk** due to:
1. Map data already available in data structures
2. Excel export auto-reads column configurations
3. Following established patterns for similar columns
4. No breaking changes to existing functionality

The estimated implementation time is **~55 minutes** including testing.

**Recommended Starting Point:** Begin with Phase 1 (Character Averages) to validate the approach, then proceed to Phase 2 (Match Details).
