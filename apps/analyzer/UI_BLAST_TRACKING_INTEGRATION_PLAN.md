# UI Blast Tracking Integration Plan

## Overview
Plan to integrate new blast tracking statistics into the analyzer's UI views: Single Match Analysis, Team Rankings, and Aggregated Stats displays.

**Date:** November 3, 2025  
**Status:** Planning Phase

---

## Current UI Structure Analysis

### View Types in the Analyzer:
1. **Single Match View** (`viewType === 'single'`)
   - Displays individual match analysis with Team 1 vs Team 2
   - Shows character-by-character breakdown in panels
   - Uses collapsible sections (Combat Performance, Survival & Health, Special Abilities, Combat Mechanics, Build)

2. **Aggregated Character Performance** (`viewType === 'aggregated'`)
   - Shows combined statistics across all matches
   - Character cards with overall performance metrics
   - Currently displays old blast tracking (SPM1/SPM2)

3. **Team Rankings** (`viewType === 'teams'`)
   - Team-level aggregated statistics
   - Top 5 character performance per team
   - Team comparison metrics

4. **Tables View** (`viewType === 'tables'`)
   - **✅ ALREADY COMPLETE** - TableConfigs.jsx updated in Phase 3
   - Character Averages Table
   - Match Details Table

5. **Meta Analysis** (`viewType === 'meta'`)
   - Capsule usage statistics
   - AI strategy analysis
   - Build archetype trends

---

## Implementation Phases

### **Phase 6: Single Match Analysis UI Updates**

#### Current State
**Location:** `App.jsx` lines ~4850-4900  
**Component:** Character detail panels in match view

Currently displays in "Special Abilities" section:
```jsx
<StatGroup title="Special Abilities" icon={Zap} darkMode={darkMode} iconColor="yellow">
  <div className="grid grid-cols-2 gap-2">
    <MetricDisplay label="Super 1 Blasts" value={stats.spm1Count} />
    <MetricDisplay label="Super 2 Blasts" value={stats.spm2Count} />
    <MetricDisplay label="Skill 1" value={stats.exa1Count} />
    <MetricDisplay label="Skill 2" value={stats.exa2Count} />
    <MetricDisplay label="Ultimates" value={stats.ultimatesUsed} />
    <MetricDisplay label="Sparking Mode" value={stats.sparkingCount} />
    <MetricDisplay label="Ki Charges" value={stats.chargeCount} />
    <MetricDisplay label="Ki Blasts" value={stats.shotEnergyBulletCount} />
  </div>
</StatGroup>
```

#### Required Changes

**6.1 Update Special Abilities Section**
- Replace simple count displays with new format showing "Hit/Thrown (Rate%)"
- Add 3 new rows for Super 1, Super 2, and Ultimate blast tracking
- Use color coding for hit rates (green ≥70%, yellow ≥50%, red <50%)
- Keep Skills, Sparking, Ki Charges, Ki Blasts as-is

**Proposed UI Layout:**
```jsx
<StatGroup title="Special Abilities" icon={Zap} darkMode={darkMode} iconColor="yellow">
  <div className="space-y-3">
    {/* Super 1 Blast Tracking */}
    <BlastMetricDisplay 
      label="Super 1 Blast" 
      thrown={stats.s1Blast}
      hit={stats.s1HitBlast}
      hitRate={stats.s1HitRate}
      color="orange"
      darkMode={darkMode}
    />
    
    {/* Super 2 Blast Tracking */}
    <BlastMetricDisplay 
      label="Super 2 Blast" 
      thrown={stats.s2Blast}
      hit={stats.s2HitBlast}
      hitRate={stats.s2HitRate}
      color="red"
      darkMode={darkMode}
    />
    
    {/* Ultimate Blast Tracking */}
    <BlastMetricDisplay 
      label="Ultimate Blast" 
      thrown={stats.ultBlast}
      hit={stats.uLTHitBlast}
      hitRate={stats.ultHitRate}
      color="yellow"
      darkMode={darkMode}
    />
    
    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-600">
      <MetricDisplay label="Skill 1" value={stats.exa1Count} />
      <MetricDisplay label="Skill 2" value={stats.exa2Count} />
      <MetricDisplay label="Ultimates" value={stats.ultimatesUsed} />
      <MetricDisplay label="Sparking Mode" value={stats.sparkingCount} />
      <MetricDisplay label="Ki Charges" value={stats.chargeCount} />
      <MetricDisplay label="Ki Blasts" value={stats.shotEnergyBulletCount} />
    </div>
  </div>
</StatGroup>
```

**6.2 Create New BlastMetricDisplay Component**
**Location:** Add to `App.jsx` before main App component (~line 600)

```jsx
/**
 * Display blast tracking metric with hit/thrown/rate format
 * Format: "X/Y (Z%)" where X=hit, Y=thrown, Z=hit rate
 */
function BlastMetricDisplay({ label, thrown, hit, hitRate, color = 'blue', darkMode = false, size = 'medium' }) {
  const getColorClass = () => {
    const colors = {
      orange: darkMode ? 'text-orange-400' : 'text-orange-600',
      red: darkMode ? 'text-red-400' : 'text-red-600',
      yellow: darkMode ? 'text-yellow-400' : 'text-yellow-600',
      purple: darkMode ? 'text-purple-400' : 'text-purple-600',
      blue: darkMode ? 'text-blue-400' : 'text-blue-600',
    };
    return colors[color] || colors.blue;
  };

  const getRateColorClass = () => {
    if (hitRate >= 70) return darkMode ? 'text-green-400' : 'text-green-600';
    if (hitRate >= 50) return darkMode ? 'text-yellow-400' : 'text-yellow-600';
    return darkMode ? 'text-red-400' : 'text-red-600';
  };

  const sizeClasses = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base'
  };

  return (
    <div className={`flex items-center justify-between p-2 rounded ${
      darkMode ? 'bg-gray-800/50' : 'bg-gray-100'
    }`}>
      <span className={`${sizeClasses[size]} ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        {label}
      </span>
      <div className="flex items-center gap-2">
        <span className={`font-mono font-bold ${sizeClasses[size]} ${getColorClass()}`}>
          {hit}/{thrown}
        </span>
        <span className={`font-mono font-bold ${sizeClasses[size]} ${getRateColorClass()}`}>
          ({hitRate.toFixed(1)}%)
        </span>
      </div>
    </div>
  );
}
```

**6.3 Add Tags to Survival & Health Section**
**Location:** `App.jsx` lines ~4830-4850

Add after the counter displays:
```jsx
{stats.tags > 0 && (
  <MetricDisplay label="Character Swaps (Tags)" value={stats.tags} color="teal" darkMode={darkMode} size="small" />
)}
```

**6.4 Update Team Summary StatBars (Optional Enhancement)**
Consider adding blast accuracy to the top-level team summary:
- Total Super Blasts Hit Rate
- Total Ultimate Blast Hit Rate

---

### **Phase 7: Aggregated Character Performance UI Updates**

#### Current State
**Location:** Need to find AggregatedCharacterContent component  
**Function:** `getAggregatedCharacterData()` already provides new fields

Currently displays character cards with averaged statistics across all matches.

#### Required Changes

**7.1 Search for Aggregated View Component**
```
Action: Find where aggregated character cards are rendered
Expected location: Around line 600-1000 in App.jsx
```

**7.2 Update Character Cards in Aggregated View**
- Replace old "Avg Super 1: X" with new "Super 1: X/Y (Z%)" format
- Show averaged blast data with hit rates
- Use BlastMetricDisplay component (same as single match)
- Add "Avg Tags" to character cards

**7.3 Add Hit Rate Visualization**
Consider adding small progress bars for visual hit rate indication:
```jsx
<div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
  <div 
    className={`h-1.5 rounded-full ${hitRate >= 70 ? 'bg-green-500' : hitRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
    style={{ width: `${hitRate}%` }}
  />
</div>
```

**7.4 Update Stat Groupings**
Reorganize "Special Abilities" section in character cards:
- **Blast Accuracy** subsection (S1, S2, Ult with rates)
- **Ability Usage** subsection (Skills, Ultimates count, Sparking, Ki stats)

---

### **Phase 8: Team Rankings UI Updates**

#### Current State
**Location:** `getTeamAggregatedData()` function (line ~1566)  
**Component:** Team rankings view showing team-level statistics

Team Performance Matrix already updated in Phase 5 with new blast totals.

#### Required Changes

**8.1 Update Team Display Cards**
Add new blast tracking metrics to team summary cards:
- Top 5 Total Super 1 Hit Rate
- Top 5 Total Super 2 Hit Rate  
- Top 5 Total Ultimate Hit Rate
- Top 5 Total Tags

**8.2 Team Comparison Metrics**
Add visual comparison of blast accuracy between teams:
```jsx
<div className="space-y-2">
  <ComparisonMetric
    label="Super 1 Accuracy"
    team1Value={team1.top5S1HitRate}
    team2Value={team2.top5S1HitRate}
    team1Name={team1.name}
    team2Name={team2.name}
    format="percentage"
    darkMode={darkMode}
  />
  <ComparisonMetric
    label="Super 2 Accuracy"
    team1Value={team1.top5S2HitRate}
    team2Value={team2.top5S2HitRate}
    team1Name={team1.name}
    team2Name={team2.name}
    format="percentage"
    darkMode={darkMode}
  />
  <ComparisonMetric
    label="Ultimate Accuracy"
    team1Value={team1.top5UltHitRate}
    team2Value={team2.top5UltHitRate}
    team1Name={team1.name}
    team2Name={team2.name}
    format="percentage"
    darkMode={darkMode}
  />
</div>
```

**8.3 Create ComparisonMetric Component**
Visual component showing side-by-side comparison with progress bars:
```jsx
function ComparisonMetric({ label, team1Value, team2Value, team1Name, team2Name, format = 'number', darkMode = false }) {
  const formatValue = (val) => {
    if (format === 'percentage') return `${val.toFixed(1)}%`;
    if (format === 'number') return formatNumber(val);
    return val;
  };

  const team1Pct = (team1Value / Math.max(team1Value, team2Value)) * 100;
  const team2Pct = (team2Value / Math.max(team1Value, team2Value)) * 100;

  return (
    <div className={`p-3 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
      <div className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        {label}
      </div>
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="flex justify-between text-xs mb-1">
            <span className={darkMode ? 'text-blue-400' : 'text-blue-600'}>{team1Name}</span>
            <span className="font-mono">{formatValue(team1Value)}</span>
          </div>
          <div className={`w-full rounded-full h-2 ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
            <div className="h-2 rounded-full bg-blue-500" style={{ width: `${team1Pct}%` }} />
          </div>
        </div>
        <div className="flex-1">
          <div className="flex justify-between text-xs mb-1">
            <span className={darkMode ? 'text-red-400' : 'text-red-600'}>{team2Name}</span>
            <span className="font-mono">{formatValue(team2Value)}</span>
          </div>
          <div className={`w-full rounded-full h-2 ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
            <div className="h-2 rounded-full bg-red-500" style={{ width: `${team2Pct}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## Component Inventory

### New Components to Create
1. **BlastMetricDisplay** - Shows "Hit/Thrown (Rate%)" format with color coding
2. **ComparisonMetric** - Side-by-side team comparison with progress bars
3. **BlastAccuracyBadge** - Small badge showing hit rate percentage with color

### Existing Components to Modify
1. **MetricDisplay** - Keep as-is for non-blast metrics
2. **StatGroup** - Keep as-is, update content inside
3. **StatBar** - Keep as-is
4. **PerformanceScoreBadge** - Keep as-is

---

## Data Flow Validation

### ✅ Already Complete:
1. **Data Extraction** - `extractStats()` provides all new fields
2. **Character Aggregation** - `getAggregatedCharacterData()` calculates averages and rates
3. **Team Aggregation** - `getTeamAggregatedData()` includes team character details with new fields
4. **Team Performance Matrix** - `teamPerformanceMatrix.js` calculates top5 blast totals and rates
5. **Table Configurations** - `TableConfigs.jsx` updated with new columns
6. **Excel Export** - `excelExport.js` updated with formatting and mappings

### 🔄 Need UI Display Updates:
1. **Single Match View** - Character panels need blast tracking display
2. **Aggregated View** - Character cards need new blast format
3. **Team Rankings** - Team cards need hit rate comparisons

---

## Color Coding Standards

### Hit Rate Colors
- **Green** (≥70%): Excellent accuracy
- **Yellow** (50-69%): Moderate accuracy  
- **Red** (<50%): Poor accuracy

### Blast Type Colors
- **Super 1**: Orange
- **Super 2**: Red
- **Ultimate**: Yellow/Gold
- **Tags**: Teal/Cyan

---

## Implementation Priority

### High Priority (Phase 6)
- [ ] Create BlastMetricDisplay component
- [ ] Update Single Match View character panels
- [ ] Add tags to Survival & Health section
- [ ] Test with new JSON file in single match view

### Medium Priority (Phase 7)
- [ ] Locate aggregated character cards rendering code
- [ ] Update aggregated view with new blast format
- [ ] Add hit rate visualizations
- [ ] Test aggregated view with multiple matches

### Medium Priority (Phase 8)
- [ ] Create ComparisonMetric component
- [ ] Update team rankings with blast accuracy
- [ ] Add team-level hit rate comparisons
- [ ] Test team view with full dataset

### Low Priority (Polish)
- [ ] Add tooltips explaining hit rate calculation
- [ ] Add filtering by hit rate ranges
- [ ] Add sorting by blast accuracy in tables
- [ ] Performance optimizations for large datasets

---

## Testing Checklist

### Single Match View
- [ ] New JSON format displays correctly
- [ ] Old JSON format still works (backwards compatibility)
- [ ] Hit rates calculate correctly (including 0/0 = 0% edge case)
- [ ] Color coding matches standards
- [ ] Tags display in Survival section
- [ ] Mobile responsive layout

### Aggregated View  
- [ ] Averaged blast data displays correctly
- [ ] Overall hit rates calculate properly
- [ ] Legacy fields (SPM1/SPM2) still accessible
- [ ] Character cards layout not broken

### Team Rankings
- [ ] Top 5 blast totals display correctly
- [ ] Team hit rate comparisons accurate
- [ ] ComparisonMetric component works
- [ ] Team ordering by metrics works

### Cross-View Consistency
- [ ] Same data displays consistently across all views
- [ ] Dark mode works in all new components
- [ ] Icons and colors consistent
- [ ] Number formatting consistent

---

## File Modification Summary

### Files to Modify:
1. **`App.jsx`** (~lines 4850-4900, 600-1000)
   - Add BlastMetricDisplay component
   - Add ComparisonMetric component  
   - Update Single Match character panels
   - Update Aggregated character cards
   - Update Team rankings display

### Files Already Modified (Phases 1-5):
1. ✅ `App.jsx` - Data extraction and aggregation
2. ✅ `TableConfigs.jsx` - Table column configurations
3. ✅ `excelExport.js` - Excel export formatting
4. ✅ `teamPerformanceMatrix.js` - Team aggregation calculations

---

## Notes

- **Backwards Compatibility:** All new UI components must handle missing data gracefully (old JSON files)
- **Performance:** BlastMetricDisplay renders ~6-9 times per character, optimize for re-renders
- **Accessibility:** Ensure color coding has text labels (not color-only indication)
- **Responsive Design:** New components must work on mobile/tablet layouts
- **Dark Mode:** All new components must support dark mode prop

---

## Next Actions

1. **Immediate:** Locate aggregated character cards rendering code in App.jsx
2. **Create:** BlastMetricDisplay component
3. **Start:** Phase 6 implementation (Single Match View)
4. **Test:** With sample new JSON file
5. **Iterate:** Gather feedback and refine UI

