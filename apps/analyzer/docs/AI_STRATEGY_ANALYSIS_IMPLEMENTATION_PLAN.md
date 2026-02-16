# AI Strategy Effectiveness Analysis - Implementation Plan

## Overview
Implement a comprehensive AI Strategy analysis system in the Meta Analysis view with card-based interface and detailed drill-down panels.

## User Requirements Summary
- **Primary View:** Card grid layout (Option B)
- **Interaction:** Click card → large expanded panel with detailed analysis
- **Data Display:** Raw averages for accuracy + normalized scores for comparisons
- **Character Compatibility:** Significant delta view (default) + expandable full list
- **Additional Metrics:** Usage consistency analysis, character variety metrics
- **Match Count:** Visible on each card

## Architecture

### 1. Data Layer

#### New Utility File: `utils/aiStrategyCalculator.js`

**Core Function: `calculateAIStrategyMetrics(aggregatedData)`**

**Input:** Array of character aggregated data (with `matches` arrays)

**Output:** Object structure:
```javascript
{
  "Attack Strategy: Combos": {
    // Identification
    name: "Attack Strategy: Combos",
    id: "00_7_0003",
    type: "Attack", // Attack, Balanced, Defense
    
    // Usage Statistics
    totalMatches: 47,
    usageRate: 12.3, // percentage
    uniqueCharacters: 8,
    
    // Core Performance Metrics (Raw)
    winCount: 32,
    lossCount: 15,
    winRate: 68.1, // percentage
    avgDamageDealt: 28450,
    avgDamageTaken: 22100,
    avgSurvivalRate: 65.2,
    avgKills: 1.4,
    combatPerformanceScore: 78.4,
    
    // Offensive Behavior (Raw Averages)
    avgMaxCombo: 15.2,
    avgS1Blast: 2.1,
    avgS2Blast: 3.8,
    avgUltBlast: 0.9,
    avgThrows: 1.2,
    avgVanishingAttacks: 2.5,
    
    // Defensive Behavior (Raw Averages)
    avgGuards: 8.3,
    avgZCounters: 1.4,
    avgSuperCounters: 2.1,
    avgRevengeCounters: 0.8,
    avgDamageTakenPerSecond: 135.2,
    
    // Tactical Behavior (Raw Averages)
    avgSparkingCount: 1.1,
    avgDragonDashDistance: 8500,
    avgEnergyBlasts: 12.5,
    avgCharges: 7.2,
    avgTags: 0.4,
    
    // Normalized Scores (0-100 for radar charts)
    normalizedScores: {
      offense: 85.2,
      defense: 54.3,
      aggression: 72.1,
      zoning: 45.2,
      resourceManagement: 68.5,
      comboFocus: 92.1
    },
    
    // Character Usage Details
    characterUsage: [
      {
        name: "Gogeta (Super) SSGSS",
        matches: 15,
        winRate: 73.3,
        avgPerformanceScore: 82.1,
        performanceDelta: 8.5 // vs character's overall average
      },
      // ... more characters
    ],
    
    // Build Type Distribution
    buildTypeDistribution: {
      "Melee-Heavy": { count: 20, winRate: 70.0 },
      "Balanced": { count: 15, winRate: 66.7 },
      // ... more build types
    },
    
    // Top Capsules
    topCapsules: [
      { id: "00_0_0030", name: "Blast Attack Boost 3", count: 35, winRate: 71.4 },
      // ... top 10
    ],
    
    // Build Cost Analysis (Raw Averages)
    avgBuildCosts: {
      melee: 8.2,
      blast: 5.1,
      kiBlast: 3.5,
      defense: 4.2,
      skill: 2.8,
      kiEfficiency: 1.9,
      utility: 1.3
    },
    
    // Data Quality Indicators
    dataQuality: {
      sampleSize: 47,
      confidence: "High", // High (>30), Medium (10-30), Low (<10)
      characterDiversity: 8,
      diversityScore: 0.65 // 0-1, higher = more diverse usage
    }
  },
  // ... 14 more AI strategies
}
```

#### Helper Functions:
- `categorizeAIStrategy(aiName)` → returns "Attack", "Balanced", or "Defense"
- `calculateNormalizedScores(rawStats, allAIStats)` → returns 0-100 normalized values
- `calculateDataQuality(matches, uniqueChars)` → returns quality metadata
- `calculateBehavioralFingerprint(stats)` → returns distinctive behaviors

### 2. Component Structure

```
src/
  components/
    ai-strategy/
      AIStrategyAnalysis.jsx          // Main component
      AIStrategyCard.jsx               // Individual card
      AIStrategyExpandedPanel.jsx     // Detailed drill-down panel
      BehavioralRadarChart.jsx         // Radar chart for behaviors
      CharacterCompatibilityTable.jsx  // Character usage table
      BuildTypeDistribution.jsx        // Build analysis view
```

### 3. Implementation Phases

#### **Phase 1: Data Layer & Basic Cards** ✓ Start Here
**Goal:** Calculate AI metrics and display basic card grid

**Tasks:**
1. Create `utils/aiStrategyCalculator.js`
   - Implement `calculateAIStrategyMetrics()`
   - Implement helper functions for categorization
   - Add data quality calculation
   - Add normalized scoring

2. Create `components/ai-strategy/AIStrategyCard.jsx`
   - Card layout with:
     - AI name + category badge
     - Match count
     - Win rate (large, prominent)
     - Performance score
     - Quick stats (3-4 key metrics)
     - Character diversity indicator
     - Data quality badge (if low sample)
   - Hover effects
   - Click handler for expansion

3. Create `components/ai-strategy/AIStrategyAnalysis.jsx`
   - Import and call `calculateAIStrategyMetrics()`
   - Grid layout (responsive: 1 col mobile, 2 tablet, 3 desktop)
   - Group by type (Balanced, Attack, Defense) with headers
   - Sort options: Usage, Win Rate, Performance Score
   - Filter options: By type, minimum matches
   - Loading state handling

4. Integrate into MetaAnalysisContent in `App.jsx`
   - Add new section after Capsule Performance Analysis
   - Pass aggregatedData prop
   - Theme integration (darkMode)

**Acceptance Criteria:**
- All 15 AI strategies displayed as cards
- Grouped by type with visual distinction
- Accurate metrics calculated from match data
- Sort and filter working
- Responsive layout

---

#### **Phase 2: Expanded Panel** 
**Goal:** Detailed drill-down when card is clicked

**Tasks:**
1. Create `components/ai-strategy/AIStrategyExpandedPanel.jsx`
   - Modal/Panel overlay (covers 80-90% of viewport)
   - Close button (X) and backdrop click to close
   - Sections:
     - **Header:** AI name, badge, close button
     - **Overview Section:** 
       - Large win rate display
       - Performance score vs average comparison
       - Match count & data quality indicators
       - Usage statistics
     - **Performance Metrics Section:**
       - Raw averages table (offense, defense, tactical)
       - Comparison to overall average ("+15% vs avg")
       - Color-coded performance indicators
     - **Behavioral Profile Section:**
       - Radar chart (normalized 0-100)
       - Distinctive behaviors callout
     - **Character Compatibility Section:**
       - Significant delta table (default view)
       - "Show All Characters" expandable
       - Sortable columns
     - **Build Analysis Section:**
       - Build type distribution (bar chart or table)
       - Optimal cost allocation
       - Top capsules list
     - **Combat Statistics Section:**
       - Detailed combat breakdown
       - Comparison table (This AI vs Overall)

2. State management in AIStrategyAnalysis
   - `selectedAI` state
   - `expandedPanelOpen` state
   - Card click handler to open panel

**Acceptance Criteria:**
- Panel opens smoothly on card click
- All sections render with correct data
- Panel is scrollable if content exceeds viewport
- Close button and backdrop click work
- Responsive on all screen sizes

---

#### **Phase 3: Behavioral Radar Chart**
**Goal:** Visual representation of AI behavior patterns

**Tasks:**
1. Create `components/ai-strategy/BehavioralRadarChart.jsx`
   - Use Canvas or SVG for radar chart
   - 6 axes: Offense, Defense, Aggression, Zoning, Resource Mgmt, Combo Focus
   - Normalized scores (0-100)
   - Overlay average line for comparison
   - Interactive tooltips
   - Dark mode support

**Acceptance Criteria:**
- Chart renders correctly with 6 axes
- Data points plotted accurately
- Tooltips show raw values on hover
- Visually distinct in light/dark mode

---

#### **Phase 4: Character Compatibility Table**
**Goal:** Show which characters perform best with each AI

**Tasks:**
1. Create `components/ai-strategy/CharacterCompatibilityTable.jsx`
   - Default view: Top 5 characters by performance delta
   - Columns: Character, Matches, Win Rate, Avg Score, Delta
   - "Show All" toggle button
   - Expanded view: All characters with pagination/virtual scroll
   - Sort by: Delta, Win Rate, Matches, Score
   - Color-coded delta values (+green, -red)

**Acceptance Criteria:**
- Initial view shows top 5 significant deltas
- Expand shows all characters with AI
- Sorting works on all columns
- Performance delta calculated correctly

---

#### **Phase 5: Build Type Distribution**
**Goal:** Analyze build preferences and performance

**Tasks:**
1. Create `components/ai-strategy/BuildTypeDistribution.jsx`
   - Stacked/grouped bar chart or table
   - Build type distribution (percentage)
   - Win rate by build type
   - Average costs per build category
   - Top 10 capsules with usage %

**Acceptance Criteria:**
- Distribution shows accurate percentages
- Win rates displayed per build type
- Capsule list shows top 10 by usage
- Visual chart or table format

---

#### **Phase 6: Polish & Insights**
**Goal:** Auto-generated insights and UX refinements

**Tasks:**
1. Add insight generation in calculator
   - Highest win rate AI
   - Most offensive/defensive AI
   - Best character synergies
   - Build recommendations

2. Add insights display in panel
   - Callout boxes with key findings
   - "Did you know?" style tips

3. UX improvements
   - Loading skeletons for cards
   - Smooth animations (panel slide-in)
   - Keyboard navigation (ESC to close)
   - Export AI report button

**Acceptance Criteria:**
- 3-5 auto-generated insights per AI
- Smooth animations and transitions
- Keyboard shortcuts work
- Export functionality operational

---

## Data Normalization Strategy

### When to Use Normalized (0-100):
- **Radar charts** - Visual comparison needs consistent scale
- **Performance scores** - Composite metric for ranking
- **Quick comparison badges** - "High offense", "Low defense"

### When to Use Raw Averages:
- **Detailed stat tables** - User needs exact numbers
- **Combat statistics section** - Precise values important
- **Build cost analysis** - Actual costs matter
- **Character compatibility metrics** - Real win rates and damage

### Implementation:
- Always calculate BOTH in data layer
- UI components choose which to display
- Tooltip on normalized values shows raw value
- Hover on radar chart shows actual numbers

---

## Technical Considerations

### Performance
- Memoize `calculateAIStrategyMetrics()` with useMemo
- Only recalculate when aggregatedData changes
- Lazy load expanded panel components
- Virtual scrolling for large character lists

### Accessibility
- ARIA labels on interactive elements
- Keyboard navigation support
- Screen reader friendly descriptions
- Focus management in modal

### Responsive Design
- Cards: 1 col mobile, 2 tablet, 3 desktop, 4+ large screens
- Panel: Full screen mobile, 90% tablet/desktop
- Tables: Horizontal scroll on mobile
- Charts: Responsive sizing

---

## Testing Checklist

### Data Integrity
- [ ] All 15 AI strategies present
- [ ] Match counts accurate
- [ ] Win rates calculated correctly
- [ ] Character usage tracked properly
- [ ] Build distributions sum to 100%

### UI/UX
- [ ] Cards clickable and hover states work
- [ ] Panel opens/closes smoothly
- [ ] All sections render without errors
- [ ] Dark mode works throughout
- [ ] Responsive on mobile/tablet/desktop

### Edge Cases
- [ ] AI with 0 matches handled
- [ ] AI with 1 match handled
- [ ] Missing character data handled
- [ ] Missing build data handled
- [ ] Very long AI names don't break layout

---

## File Changes Summary

### New Files
- `apps/analyzer/src/utils/aiStrategyCalculator.js`
- `apps/analyzer/src/components/ai-strategy/AIStrategyAnalysis.jsx`
- `apps/analyzer/src/components/ai-strategy/AIStrategyCard.jsx`
- `apps/analyzer/src/components/ai-strategy/AIStrategyExpandedPanel.jsx`
- `apps/analyzer/src/components/ai-strategy/BehavioralRadarChart.jsx`
- `apps/analyzer/src/components/ai-strategy/CharacterCompatibilityTable.jsx`
- `apps/analyzer/src/components/ai-strategy/BuildTypeDistribution.jsx`

### Modified Files
- `apps/analyzer/src/App.jsx` - Add AIStrategyAnalysis section to MetaAnalysisContent
- `apps/analyzer/src/components/CapsuleSynergyAnalysis.jsx` - Import icons if needed

---

## Timeline Estimate

- **Phase 1 (Data + Cards):** 2-3 hours
- **Phase 2 (Expanded Panel):** 2 hours
- **Phase 3 (Radar Chart):** 1 hour
- **Phase 4 (Character Table):** 1 hour
- **Phase 5 (Build Distribution):** 1 hour
- **Phase 6 (Polish):** 1 hour

**Total:** ~8-9 hours

---

## Success Metrics

✅ All 15 AI strategies displayed with accurate data
✅ Card → Panel interaction smooth and intuitive
✅ Users can identify best AI for their playstyle
✅ Data quality indicators help assess reliability
✅ Character and build insights actionable
✅ No performance issues with large datasets

---

## Start Implementation: Phase 1
Now proceeding with data layer and card grid implementation...
