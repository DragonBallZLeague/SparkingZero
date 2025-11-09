# Blast Tracking Implementation Plan

## Overview
Implementation of new blast tracking fields to replace the current method with more accurate tracking that differentiates between blasts thrown vs. blasts that hit opponents.

**Date:** November 3, 2025  
**Status:** IMPLEMENTATION COMPLETE - Ready for Testing

**Progress Summary:**
- ✅ Phase 1: Data Extraction COMPLETE
- ✅ Phase 2: Aggregation Updates COMPLETE  
- ✅ Phase 3: UI Display Updates COMPLETE
- ✅ Phase 4: Excel Export Updates COMPLETE
- ✅ Phase 5: Team Performance Matrix COMPLETE
- 🔲 Testing & Validation PENDING

---

## Current State Analysis

### Current Blast Tracking Method:
- App parses `runBlastCount` from battle data
- Extracts counts by looking for keys containing `SPM1`, `SPM2`, `SPM3`
- Stored as `spm1Count` and `spm2Count`
- Ultimate blasts tracked separately via `uLTCount` from `battleNumCount`
- **Problem:** No way to differentiate between blasts thrown vs blasts that hit

### New Data Structure:
```json
"additionalCounts": {
  "s1Blast": 2,        // Super 1 thrown
  "s2Blast": 1,        // Super 2 thrown  
  "ultBlast": 1,       // Ultimate thrown
  "s1HitBlast": 2,     // Super 1 hit
  "s2HitBlast": 1,     // Super 2 hit
  "uLTHitBlast": 1,    // Ultimate hit
  "tags": 2            // Character swaps
}
```

---

## Implementation Phases

### **Phase 1: Data Extraction & Core Integration** ✅ CURRENT

#### 1.1 Update `extractStats()` Function
**File:** `apps/analyzer/src/App.jsx` (~line 285)

**Changes:**
- Add parsing for `additionalCounts` object
- Extract new fields: `s1Blast`, `s2Blast`, `ultBlast`, `s1HitBlast`, `s2HitBlast`, `uLTHitBlast`, `tags`
- Calculate hit rates: `(hits / thrown) * 100`
- **Fallback Logic:** If `additionalCounts` doesn't exist, fall back to old `runBlastCount` method

**Code to Add:**
```javascript
// Around line 308, after parsing runBlastCount
const additionalCounts = char.additionalCounts || {};

// New blast tracking (preferred method)
const s1Blast = additionalCounts.s1Blast ?? spm1Count; // Fallback to old method
const s2Blast = additionalCounts.s2Blast ?? spm2Count;
const ultBlast = additionalCounts.ultBlast ?? (numCount.uLTCount || 0);
const s1HitBlast = additionalCounts.s1HitBlast ?? 0;
const s2HitBlast = additionalCounts.s2HitBlast ?? 0;
const uLTHitBlast = additionalCounts.uLTHitBlast ?? 0;
const tags = additionalCounts.tags ?? 0;

// Calculate hit rates
const s1HitRate = s1Blast > 0 ? (s1HitBlast / s1Blast) * 100 : 0;
const s2HitRate = s2Blast > 0 ? (s2HitBlast / s2Blast) * 100 : 0;
const ultHitRate = ultBlast > 0 ? (uLTHitBlast / ultBlast) * 100 : 0;
```

#### 1.2 Update Return Object from `extractStats()`
**Add to return object (~line 428):**
```javascript
return {
  // ...existing fields...
  
  // New blast tracking (replaces old spm1Count, spm2Count)
  s1Blast,
  s2Blast,
  ultBlast,
  s1HitBlast,
  s2HitBlast,
  uLTHitBlast,
  s1HitRate,
  s2HitRate,
  ultHitRate,
  
  // New swap tracking (add to Survival & Health)
  tags,
  
  // Keep old fields for backwards compatibility
  spm1Count: s1Blast,
  spm2Count: s2Blast,
};
```

---

### **Phase 2: Aggregation Updates** 🔲 PENDING

#### 2.1 Update `getAggregatedCharacterData()`
**File:** `apps/analyzer/src/App.jsx` (~line 1000)

**Changes:**
- Add totals for new fields: `totalS1Blast`, `totalS2Blast`, `totalUltBlast`, etc.
- Accumulate in character data loop
- Calculate averages and hit rates

**Code Structure:**
```javascript
characterStats[aggregationKey] = {
  // ...existing fields...
  
  // New blast totals
  totalS1Blast: 0,
  totalS2Blast: 0,
  totalUltBlast: 0,
  totalS1HitBlast: 0,
  totalS2HitBlast: 0,
  totalULTHitBlast: 0,
  totalTags: 0,
  
  // Keep old for backwards compatibility
  totalSPM1: 0,
  totalSPM2: 0,
};

// In accumulation loop (~line 1100):
charData.totalS1Blast += stats.s1Blast;
charData.totalS2Blast += stats.s2Blast;
charData.totalUltBlast += stats.ultBlast;
charData.totalS1HitBlast += stats.s1HitBlast;
charData.totalS2HitBlast += stats.s2HitBlast;
charData.totalULTHitBlast += stats.uLTHitBlast;
charData.totalTags += stats.tags;
```

#### 2.2 Calculate Averages & Hit Rates
**Location:** ~line 1400
```javascript
// New blast averages
avgS1Blast: Math.round((char.totalS1Blast / denom) * 10) / 10,
avgS2Blast: Math.round((char.totalS2Blast / denom) * 10) / 10,
avgUltBlast: Math.round((char.totalUltBlast / denom) * 10) / 10,
avgS1Hit: Math.round((char.totalS1HitBlast / denom) * 10) / 10,
avgS2Hit: Math.round((char.totalS2HitBlast / denom) * 10) / 10,
avgUltHit: Math.round((char.totalULTHitBlast / denom) * 10) / 10,

// Hit rates (overall across all matches)
s1HitRateOverall: char.totalS1Blast > 0 ? Math.round((char.totalS1HitBlast / char.totalS1Blast) * 1000) / 10 : 0,
s2HitRateOverall: char.totalS2Blast > 0 ? Math.round((char.totalS2HitBlast / char.totalS2Blast) * 1000) / 10 : 0,
ultHitRateOverall: char.totalUltBlast > 0 ? Math.round((char.totalULTHitBlast / char.totalUltBlast) * 1000) / 10 : 0,

// Tags
avgTags: Math.round((char.totalTags / denom) * 10) / 10,
```

---

### **Phase 3: UI Display Updates** 🔲 PENDING

#### 3.1 TableConfigs.jsx - Character Averages Table
**File:** `apps/analyzer/src/components/TableConfigs.jsx`

**Replace existing Super 1/Super 2 columns with new blast columns:**

**Special Abilities Group** (~line 379):
```javascript
{
  key: 'avgS1Blast',
  header: 'Avg S1 Thrown',
  accessor: (row) => row.avgS1Blast || row.avgSPM1 || 0,
  sortType: 'number',
  sortable: true,
  group: 'Special Abilities',
  exportFormat: { alignment: 'right', numFmt: '0.0' },
  render: (row, value) => (
    <span className="font-mono text-orange-600">{value.toFixed(1)}</span>
  )
},
{
  key: 'avgS1Hit',
  header: 'Avg S1 Hit',
  accessor: (row) => row.avgS1Hit || 0,
  sortType: 'number',
  sortable: true,
  group: 'Special Abilities',
  exportFormat: { alignment: 'right', numFmt: '0.0' },
  render: (row, value) => (
    <span className="font-mono text-orange-600">{value.toFixed(1)}</span>
  )
},
{
  key: 's1HitRate',
  header: 'S1 Hit Rate %',
  accessor: (row) => row.s1HitRateOverall || 0,
  sortType: 'number',
  sortable: true,
  group: 'Special Abilities',
  exportFormat: { alignment: 'right', numFmt: '0.0"%"', trafficLights: true },
  render: (row, value) => {
    const thrown = row.avgS1Blast || row.avgSPM1 || 0;
    const hit = row.avgS1Hit || 0;
    const displayText = thrown > 0 ? `${hit.toFixed(1)}/${thrown.toFixed(1)} (${value.toFixed(1)}%)` : '—';
    return (
      <span className={`font-mono ${
        value >= 80 ? 'text-green-600' : 
        value >= 50 ? 'text-yellow-600' : 'text-red-600'
      }`}>
        {displayText}
      </span>
    );
  }
},
// Repeat for S2 and Ultimate (3 columns each = 9 total)
```

**Survival & Health Group** (~line 280):
```javascript
{
  key: 'avgTags',
  header: 'Avg Swaps',
  accessor: (row) => row.avgTags || 0,
  sortType: 'number',
  sortable: true,
  group: 'Survival & Health',
  exportFormat: { alignment: 'right', numFmt: '0.0' },
  render: (row, value) => (
    <div className="flex items-center gap-1">
      <Users className="w-4 h-4 text-purple-500" />
      <span className="font-mono">{value.toFixed(1)}</span>
    </div>
  )
}
```

#### 3.2 Match Details Table
Similar updates for individual match display.

#### 3.3 UI Panels (Match Analysis View)
**File:** `App.jsx` ~line 4764

**Special Abilities Section:**
```jsx
<MetricDisplay 
  label="Super 1 (Hit/Thrown)" 
  value={`${stats.s1HitBlast}/${stats.s1Blast} (${stats.s1HitRate.toFixed(1)}%)`}
  color="orange" 
  darkMode={darkMode} 
/>
```

**Survival & Health Section** (~line 4750):
```jsx
<MetricDisplay 
  label="Character Swaps" 
  value={stats.tags} 
  icon={Users}
  color="purple" 
  darkMode={darkMode} 
/>
```

---

### **Phase 4: Excel Export Updates** 🔲 PENDING

#### 4.1 Update Column Definitions
**File:** `apps/analyzer/src/utils/excelExport.js`

**Column Width Calculations** (~line 734):
```javascript
'avgS1Blast': 8,
'avgS1Hit': 8,
's1HitRate': 12,  // Wider for "X/Y (Z%)" format
'avgS2Blast': 8,
'avgS2Hit': 8,
's2HitRate': 12,
'avgUltBlast': 8,
'avgUltHit': 8,
'ultHitRate': 12,
'avgTags': 8,
```

#### 4.2 Update Formatting Rules
**Add conditional formatting for hit rates:**
```javascript
// In applyColumnFormatting() function
if (['s1HitRate', 's2HitRate', 'ultHitRate'].includes(key)) {
  // Green for high hit rates, red for low
  if (value >= 80) {
    cell.font = { color: { argb: 'FF008000' }, bold: true }; // Green
  } else if (value >= 50) {
    cell.font = { color: { argb: 'FFFFA500' } }; // Orange
  } else {
    cell.font = { color: { argb: 'FFFF0000' } }; // Red
  }
}
```

---

### **Phase 5: Team Performance Matrix** 🔲 PENDING

#### 5.1 Update Team Stats Calculation
**File:** `apps/analyzer/src/utils/teamPerformanceMatrix.js` (~line 88)

```javascript
const totalS1Blast = teamMatches.reduce((sum, m) => sum + (m.s1Blast || m.spm1Count || 0), 0);
const totalS2Blast = teamMatches.reduce((sum, m) => sum + (m.s2Blast || m.spm2Count || 0), 0);
const totalUltBlast = teamMatches.reduce((sum, m) => sum + (m.ultBlast || 0), 0);
const totalS1Hit = teamMatches.reduce((sum, m) => sum + (m.s1HitBlast || 0), 0);
const totalS2Hit = teamMatches.reduce((sum, m) => sum + (m.s2HitBlast || 0), 0);
const totalUltHit = teamMatches.reduce((sum, m) => sum + (m.uLTHitBlast || 0), 0);
const totalTags = teamMatches.reduce((sum, m) => sum + (m.tags || 0), 0);
```

---

## Testing Strategy

### Test Cases:

1. **Backwards Compatibility Test**
   - Load old JSON files without `additionalCounts`
   - Verify old blast tracking still works via `runBlastCount`
   - Confirm no errors or crashes

2. **New Format Test**
   - Load your new JSON file with `additionalCounts`
   - Verify all new fields parse correctly
   - Check hit rate calculations

3. **Mixed Data Test**
   - Load combination of old and new files
   - Ensure aggregation handles both formats
   - Validate averages are correct

4. **UI Display Test**
   - Check all tables show new columns
   - Verify hit rate formatting (X/Y (Z%))
   - Confirm tags appear in Survival section

5. **Excel Export Test**
   - Export to Excel
   - Verify new columns present
   - Check conditional formatting on hit rates
   - Validate column widths

6. **Edge Cases**
   - Zero blasts thrown (division by zero)
   - Missing additionalCounts object
   - Partial data (some fields present, others missing)

---

## Summary & Key Metrics

### Key Benefits:
✅ **More Accurate Tracking** - Separate thrown vs hit counts  
✅ **Better Performance Metrics** - Hit rate shows blast efficiency  
✅ **Enhanced Team Strategy** - Swap tracking reveals team coordination  
✅ **Backwards Compatible** - Old files still work  
✅ **Comprehensive Analytics** - New insights across all views  

### Estimated Impact:
- **Files to Modify:** 5 main files
- **New Columns Added:** 10 (3 thrown, 3 hit, 3 hit rates, 1 tags)
- **Replaced Columns:** 2 (avgSPM1, avgSPM2 enhanced with hit rates)
- **Lines of Code:** ~300-400 total changes

### Display Format:
- **Tables:** "Hit/Thrown (Rate%)" format (e.g., "1.5/2.0 (75.0%)")
- **Panels:** Separate metrics for thrown, hit, and rate
- **Excel:** Individual columns with conditional formatting

---

## Progress Tracking

- [x] Analysis & Planning Complete
- [x] Reference Document Created
- [x] **Phase 1: Data Extraction - COMPLETED ✅**
  - [x] Added `additionalCounts` parsing in `extractStats()`
  - [x] Implemented new blast fields: s1Blast, s2Blast, ultBlast, s1HitBlast, s2HitBlast, uLTHitBlast
  - [x] Added tags field for character swaps
  - [x] Calculated hit rates: s1HitRate, s2HitRate, ultHitRate
  - [x] Maintained backwards compatibility with legacy spm1Count/spm2Count
  - [x] Added fallback logic to old runBlastCount method
- [ ] Phase 2: Aggregation Updates (NEXT)
- [ ] Phase 3: UI Display Updates
- [ ] Phase 4: Excel Export Updates
- [ ] Phase 5: Team Performance Matrix
- [ ] Testing Complete
- [ ] Documentation Updated
