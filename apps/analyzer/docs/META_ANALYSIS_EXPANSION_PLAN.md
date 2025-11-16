
# Meta Analysis Expansion Plan
## Dragon Ball Z League - Sparking Zero Match Analyzer

---

## 📋 **Document Usage & Continuity Note**

**Purpose**: This document serves as both a planning roadmap and implementation tracker for Meta Analysis feature development. It should be referenced by any AI assistant working on this project to maintain consistency and understand project context.

**Current Status**: In Discussion - Phase 1.1
**Last Updated**: November 5, 2025
**Active Discussion**: Capsule Synergy Analysis design decisions

**For AI Assistants**: 
- Read this document fully before implementing features
- Update progress tracking sections as features are completed
- Add new decisions/notes to relevant sections
- Maintain the "Implementation Progress" section at the bottom

---

## Executive Summary

This document outlines a comprehensive expansion plan for the Meta Analysis view of the DBZL Sparking Zero Match Analyzer. The goal is to transform the current basic meta view into a powerful strategic tool that team managers can use to make data-driven decisions about character selections, build compositions, lineup ordering, and matchup strategies.

---

## Current State Analysis

### What We Have
- **Build Archetype Tracking**: Aggressive, Defensive, Technical, Hybrid classifications
- **Capsule Usage Statistics**: Top 10 most-used capsules with character counts
- **Basic Metrics**: Average damage, survival rates per archetype
- **Character-Level Data**: Individual match records with builds, teams, and performance

### What's Missing
- **Matchup Analysis**: No insights into character vs character or team vs team performance
- **Lineup Optimization**: No data on position-based effectiveness
- **Trend Analysis**: No week-over-week or seasonal trends
- **Comparative Analytics**: Limited ability to compare builds, strategies, or teams
- **Predictive Insights**: No win probability or outcome prediction features

---

## League Build Rules (Configurable)

**Current Rules** (as of November 5, 2025):
- **Max Capsule Cost**: 20 points
- **Max Capsule Slots**: 7 capsules
- **Notes**: These rules may change seasonally. All build recommendations must respect these constraints.

**Implementation**: Build rules stored in `buildRules.js` configuration file for easy updates without code changes.

```javascript
// buildRules.js - Update when league rules change
export const BUILD_RULES = {
  version: "1.0",
  lastUpdated: "2025-11-05",
  rules: {
    maxCost: 20,
    maxCapsules: 7,
    minCost: null,           // Future-proofing
    bannedCapsules: [],      // Future-proofing
    requiredCapsules: [],    // Future-proofing
    slotRestrictions: null   // Future-proofing
  }
};
```

---

## Expansion Ideas & Action Plan

### 🎯 **Phase 1: Enhanced Build & Capsule Analysis**

#### 1.1 Capsule Synergy Analysis
**Status**: 🟡 In Discussion  
**Goal**: Identify which capsule combinations perform best together

**Design Decisions** (from Nov 5, 2025 discussion):

1. **Single vs Pair Performance Display**
   - **Decision**: Show BOTH individual capsule performance AND pair synergies
   - **Rationale**: 
     - Singles provide baseline understanding
     - Pairs reveal synergies that exceed sum of parts
     - Example: `Blast Attack Boost 3` alone = 65% WR, but `Blast Attack Boost 3 + Fury!` = 78% WR (+13% synergy bonus)
   - **UI Structure**: 3 tabs
     - Tab 1: Individual Capsule Performance (sortable table)
     - Tab 2: Top Synergy Pairs (heatmap + detailed cards)
     - Tab 3: Build Analyzer (test custom combinations)

2. **AI Strategy Integration**
   - **Decision**: Include AI Strategy + Capsule/Build compatibility analysis
   - **Rationale**: AI strategies fundamentally change playstyle; certain capsules synergize with specific strategies
   - **Examples**:
     - `Attack Strategy: Ultimate Blasts` + `Divine Blow` + `Ultimate Burst` = High synergy
     - `Defense Strategy: Counters` + `The Secret to Counters` = Optimal pairing
     - `Balanced Strategy: Ki Blasts` + `God Ki` + `Ki Blast Attack Boost 3` = Ki spam build
   - **New Feature**: AI Strategy + Build Compatibility Matrix

3. **Build Rule Constraints**
   - **Decision**: Make build rules configurable, not hardcoded
   - **Current Constraints**: Max cost 20, max 7 capsules
   - **Implementation**: Config file approach (see League Build Rules section above)
   - **Build Validator**: Check cost and slot limits, show remaining budget/slots

4. **Capsule Effect Parsing**
   - **Decision**: Use `capsules.csv` Effect column for intelligent build recommendations
   - **Approach**: Parse effects to categorize capsules by primary archetype:
     - **Aggressive**: High damage effects (damage boosts, attack increases, blast/ultimate damage)
     - **Defensive**: Damage reduction, armor, health, guards, counters, tagging/switching
     - **Technical**: Ki management, movement, skills, skill gauge, transformations
   - **Multi-Category Handling**: Capsules matching multiple archetypes assigned to most prominent one
     - Example: "Secret to Counters" fits Defensive (counters) + Technical (skill efficiency) → Primary: **Defensive**
   - **Synergy Detection**:
     - Same-category = Multiplicative synergy (e.g., multiple blast boosts stack)
     - Complementary categories = Sustainable synergy (damage + ki recovery)
     - Conflicting effects = Anti-synergy penalty (e.g., reduced defense + no healing)

**Features**:
- ✅ **Individual Capsule Performance Table**
  - Win rate, average damage, usage frequency
  - Sortable by performance metrics
  - Character compatibility scores

- ✅ **Capsule Pair Correlation Matrix**
  - Show which capsules are frequently equipped together
  - Heatmap visualization of co-occurrence rates
  
- ✅ **Synergy Performance Scores**
  - Track win rates and average damage for common 2-3 capsule combinations
  - Highlight pairs that outperform individual capsule averages
  - Show usage count and character diversity
  
- ✅ **AI Strategy + Capsule Compatibility**
  - Top capsules per AI strategy
  - Recommended builds by AI strategy
  - Strategy + archetype performance matrix

- ✅ **Anti-Synergy Detection**
  - Identify capsule combinations that underperform expectations
  - Flag conflicting effects (e.g., cost increases + ki recovery decreases)
  - Warn about risky combinations
  
- ✅ **Build Templates / Recommended Builds**
  - Generate builds based on high-performing combinations
  - Respect current league rules (cost ≤20, slots ≤7)
  - Effect-based synergy grouping
  - Show alternative cheaper versions if over budget
  - Include AI strategy recommendation

**Data Structure**:
```javascript
{
  // Individual capsule performance
  capsulePerformance: {
    "00_0_0007": {  // Rush Attack Boost 3
      name: "Rush Attack Boost 3",
      cost: 5,
      usage: 124,
      winRate: 65.3,
      avgDamage: 142000,
      avgPerformanceScore: 178.5,
      topCharacters: ["Goku", "Vegeta", "Gohan"],
      effects: ["damage", "melee"],
      effectDescription: "Increases Rush Attack damage by 7.5%"
    }
  },
  
  // Pair synergies
  capsulePairs: {
    "00_0_0007+00_0_0124": {  // Rush Attack Boost 3 + Speed Up
      capsule1: "00_0_0007",
      capsule2: "00_0_0124",
      usage: 45,
      avgDamage: 125000,
      winRate: 67.5,
      synergyBonus: +13.2,  // % improvement over individual avg
      characters: ["Goku", "Vegeta"],
      combinedCost: 8,
      effectSynergy: "complementary"  // or "multiplicative", "anti-synergy"
    }
  },
  
  // AI Strategy pairings
  aiStrategyCapsuleSynergy: {
    "Attack Strategy: Ultimate Blasts": {
      topCapsules: [
        { id: "00_0_0070", name: "Divine Blow", winRate: 72.3, usage: 45 },
        { id: "00_0_0027", name: "Ultimate Burst", winRate: 69.8, usage: 38 }
      ],
      topArchetype: "Aggressive",
      avgPerformanceScore: 185.2,
      recommendedBuild: {
        capsules: [...],
        totalCost: 19,
        winRate: 74.5
      }
    }
  },
  
  // Recommended builds
  buildTemplates: {
    "Blast Master": {
      archetype: "Aggressive",
      aiStrategy: "Balanced Strategy: Blasts",
      capsules: [
        { id: "00_0_0030", name: "Blast Attack Boost 3", cost: 5 },
        { id: "00_0_0038", name: "Fury!", cost: 4 },
        { id: "00_0_0070", name: "Divine Blow", cost: 3 },
        { id: "00_0_0131", name: "God Ki", cost: 5 },
        { id: "00_0_0040", name: "Indomitable Fighting Spirit", cost: 3 }
      ],
      totalCost: 20,
      slotsUsed: 5,
      winRate: 76.8,
      avgDamage: 168000,
      synergies: [
        "Blast damage stacking: 3 capsules multiply for ~29% total boost",
        "Ki sustainability: God Ki + Indomitable = endless blasts"
      ],
      bestCharacters: ["Frieza", "Cell", "Golden Frieza"],
      bestPosition: "Mid/Anchor"
    }
  }
}
```

**UI Components**:
- **Tab 1**: Sortable capsule performance table with filters
- **Tab 2**: Interactive heatmap showing synergy pairs + detailed cards
- **Tab 3**: Build analyzer with drag-drop capsule builder
  - Real-time cost/slot validation
  - Synergy score calculator
  - Performance prediction based on historical data
  - AI strategy selector
  - Export build to clipboard/file

---

#### 1.2 Build Archetype Deep Dive
**Goal**: Provide granular insights into each archetype's performance

**Features**:
- **Archetype vs Archetype Win Rates**: Show how Aggressive builds perform vs Defensive, etc.
- **Character Archetype Affinity**: Which characters excel with which archetypes
- **Cost Efficiency Analysis**: Performance per capsule cost point
- **Situational Performance**: How archetypes perform at different positions (Lead/Mid/Anchor)

**Metrics**:
- Win rate by archetype matchup matrix
- Average performance score per archetype per character
- Cost-to-performance ratio (damage per cost point)
- Position-based archetype effectiveness

---

#### 1.3 AI Strategy Effectiveness
**Goal**: Determine which AI strategies work best for different scenarios

**Features**:
- **Strategy Performance Rankings**: Overall effectiveness of each AI strategy
- **Character-Strategy Compatibility**: Best strategies for specific characters
- **Strategy vs Archetype Performance**: How strategies perform with different build types
- **Counter-Strategy Analysis**: Which strategies beat which other strategies

**Data Points**:
- Win rate per AI strategy
- Average combat performance score per strategy
- Character success stories (top 5 characters per strategy)
- Strategy meta shifts over time

---

### 🎯 **Phase 2: Matchup & Counter Analysis**

#### 2.1 Character Matchup Matrix
**Goal**: Comprehensive head-to-head performance tracking

**Features**:
- **Character vs Character Win Rates**: Full matchup table for all characters
- **Damage Differential Analysis**: Who out-damages whom consistently
- **Kill Probability**: Likelihood of securing eliminations in specific matchups
- **Transformation Advantages**: How form changes affect matchup dynamics

**Visualization**:
- Interactive matchup grid (heatmap style)
- Detailed matchup cards showing stats breakdown
- "Hard counter" and "soft counter" badges
- Historical matchup trends

**Key Metrics**:
```javascript
{
  characterMatchups: {
    "Goku": {
      "Vegeta": {
        wins: 15,
        losses: 12,
        winRate: 55.6,
        avgDamageAdvantage: +8500,
        avgTimeToWin: 145,
        commonCounterBuilds: [...]
      }
    }
  }
}
```

---

#### 2.2 Team Composition Analysis
**Goal**: Identify winning team compositions and synergies

**Features**:
- **Team Synergy Scores**: Measure how well specific character combinations work together
- **Role Distribution Analysis**: Balance of damage dealers, tanks, support characters
- **Team Build Diversity**: Track archetype distribution within winning teams
- **Clone vs Mix Strategies**: Performance comparison of same-build teams vs diverse builds

**Insights**:
- Best 3-character combinations
- Optimal build distribution (e.g., 2 Aggressive + 1 Defensive)
- Character combinations with highest tag-team effectiveness
- Team cost optimization (performance vs total capsule cost)

---

#### 2.3 Position-Based Meta
**Goal**: Optimize lineup order for maximum effectiveness

**Features**:
- **Position Performance Heatmap**: Which characters excel in Lead/Mid/Anchor positions
- **Position-Specific Build Recommendations**: Best archetypes per position
- **Lead Matchup Optimization**: Identify best leads against specific opponent teams
- **Anchor Effectiveness**: Clutch performance metrics for anchor characters

**Metrics**:
- Average performance score by position for each character
- Win rate when character is placed in specific position
- Survival rate and battle duration by position
- Tag frequency and timing patterns

---

### 🎯 **Phase 3: Temporal & Trend Analysis**

#### 3.1 Meta Evolution Tracking
**Goal**: Show how the meta shifts over time (weekly, seasonally)

**Features**:
- **Weekly Meta Reports**: Top characters, builds, and strategies for each week
- **Trend Graphs**: Usage and win rate trends over time
- **Meta Shift Detection**: Highlight sudden changes in character/build popularity
- **Historical Comparisons**: Compare current week to previous weeks or seasons

**Visualizations**:
- Line graphs showing character popularity over time
- Stacked area charts for archetype distribution trends
- Highlight boxes for "rising stars" and "falling favorites"
- Week-over-week change percentages

---

#### 3.2 Seasonal Performance Analysis
**Goal**: Compare main season vs playoff performance

**Features**:
- **Regular Season vs Playoffs**: Performance differences in high-stakes matches
- **Pressure Performance Index**: Which characters/builds perform better under pressure
- **Adaptation Tracking**: How teams adjust strategies between seasons
- **Championship Builds**: Analyze builds used in finals matches

**Metrics**:
- Win rate differential (playoffs vs regular season)
- Average damage variance in playoff matches
- Build diversity in elimination rounds
- Clutch performance indicators

---

#### 3.3 Opponent Adaptation Analysis
**Goal**: Track how teams adapt to specific opponents

**Features**:
- **Head-to-Head History**: Complete match history between any two teams
- **Build Counter-Picking**: Track if teams change builds based on opponent
- **Lineup Order Adjustments**: Position changes in response to opponent trends
- **Learning Curve Metrics**: Performance improvement over repeated matchups

**Insights**:
- Win rate progression in rematches
- Build changes between first and subsequent meetings
- Success rate of counter-strategies
- Most "adaptive" teams ranking

---

### 🎯 **Phase 4: Advanced Strategic Insights**

#### 4.1 Win Probability Calculator
**Goal**: Predict match outcomes based on team compositions and builds

**Features**:
- **Pre-Match Win Probability**: Estimate chances based on historical data
- **Lineup Simulator**: Test different lineup configurations
- **Build Optimizer**: Suggest optimal builds for specific matchups
- **Risk Assessment**: Identify high-risk, high-reward strategies

**Calculation Factors**:
- Historical head-to-head performance
- Character matchup strengths/weaknesses
- Build archetype effectiveness
- Position ordering advantages
- Recent form/momentum

**UI Elements**:
- Win probability percentage with confidence interval
- Key factors breakdown (what drives the prediction)
- Alternative lineup suggestions
- Risk/reward sliders

---

#### 4.2 Ban/Pick Strategy Tool (Future Feature)
**Goal**: Support draft-style tournament formats

**Features**:
- **Pick Priority Rankings**: Most valuable characters to secure first
- **Ban Impact Analysis**: Which bans hurt which teams most
- **Draft Simulator**: Practice ban/pick scenarios
- **Counter-Pick Suggestions**: Optimal character selections based on opponent picks

**Metrics**:
- Character value scores (win contribution)
- Team-specific must-pick characters
- Ban efficiency ratings
- Pick order optimization

---

#### 4.3 Clutch Performance Analytics
**Goal**: Identify characters who perform best in critical moments

**Features**:
- **Anchor Comeback Rate**: Success rate when down 0-2 in team battles
- **Low Health Performance**: Damage output when below 25% HP
- **Time Pressure Effectiveness**: Performance in final 30 seconds of matches
- **Sparking Mode Efficiency**: Damage and survival during Sparking

**Clutch Metrics**:
```javascript
{
  characterClutch: {
    "Vegeta": {
      comebackRate: 34.5,  // % of 0-2 deficit wins
      lowHPDamageBonus: +15.2,  // % damage increase <25% HP
      sparkingEfficiency: 1.85,  // damage multiplier in Sparking
      pressurePerformance: 92  // composite score
    }
  }
}
```

---

### 🎯 **Phase 5: Team Manager Tools**

#### 5.1 Team Performance Dashboard
**Goal**: Comprehensive view of a specific team's performance

**Features**:
- **Team Overview Stats**: W/L record, average damage, survival rates
- **Character Usage Breakdown**: Most/least used characters
- **Build Strategy Patterns**: Preferred archetypes and capsules
- **Opponent Analysis**: Performance against specific teams
- **Strength & Weakness Summary**: What works, what doesn't

**Dashboard Sections**:
1. Quick Stats (wins, losses, win rate)
2. Character Performance Table (sortable by various metrics)
3. Build Trends Graph
4. Head-to-Head Records
5. Recommendations Panel

---

#### 5.2 Character Performance Reports
**Goal**: Detailed individual character analysis for team roster decisions

**Features**:
- **Character Comparison Tool**: Compare multiple characters side-by-side
- **Form Analysis**: Performance across transformations
- **Build Experimentation Results**: Track performance with different builds
- **Position Flexibility**: How character performs in different lineup spots
- **Improvement Tracking**: Performance trends over time

**Report Components**:
- Overall stats card
- Build performance breakdown
- Matchup win/loss record
- Position effectiveness chart
- Recommended builds section

---

#### 5.3 Scouting Reports
**Goal**: Pre-match preparation tool for opponent analysis

**Features**:
- **Opponent Team Profile**: Historical data on upcoming opponent
- **Expected Lineup Prediction**: Based on past patterns
- **Counter-Strategy Suggestions**: Recommended builds and lineups
- **Key Threats Identification**: Opponent's strongest characters
- **Weakness Exploitation**: Areas to target

**Scouting Report Includes**:
- Opponent's record and recent form
- Most-used characters and builds
- Win conditions and patterns
- Suggested counter-compositions
- Historical matchup results

---

### 🎯 **Phase 6: Data Visualization Enhancements**

#### 6.1 Interactive Charts & Graphs
**Goal**: Make data exploration intuitive and engaging

**New Visualizations**:
- **Radar Charts**: Multi-metric character comparisons (damage, defense, speed impacts, etc.)
- **Scatter Plots**: Build cost vs performance effectiveness
- **Network Graphs**: Team composition synergies
- **Sankey Diagrams**: Build evolution and adaptation flows
- **Box Plots**: Performance distribution ranges

---

#### 6.2 Filtering & Drill-Down Capabilities
**Goal**: Allow deep exploration of specific scenarios

**Filter Options**:
- Date ranges (specific weeks, seasons)
- Teams (single, multiple, all)
- Characters (individual, by transformation family)
- Build archetypes
- Match types (regular season, playoffs, showcases)
- Win/loss outcomes

**Drill-Down Paths**:
1. Meta Overview → Archetype → Specific Build → Individual Matches
2. Team Performance → Character → Build Variants → Matchup Details
3. Capsule Popularity → Character Usage → Win Rate Analysis

---

### 🎯 **Phase 7: Export & Sharing Features**

#### 7.1 Enhanced Export Options
**Goal**: Share insights in multiple formats

**Export Types**:
- **PDF Reports**: Formatted scouting reports and team performance summaries
- **Excel Workbooks**: Multiple sheets with different analysis views
- **CSV Data Sets**: Raw data for external analysis
- **JSON API**: Queryable data endpoint for custom tools
- **Image Exports**: Charts and graphs as PNG/SVG

---

#### 7.2 Custom Report Builder
**Goal**: Let users create personalized analysis reports

**Features**:
- Drag-and-drop report components
- Template library (scouting report, team review, meta snapshot)
- Customizable metrics and visualizations
- Save report configurations
- Schedule automated reports (weekly meta updates)

---

## 📊 Implementation Progress Tracker

**Last Updated**: November 5, 2025

### Phase 1: Enhanced Build & Capsule Analysis

#### 1.1 Capsule Synergy Analysis
- **Status**: � In Progress (Implementation Started)
- **Design Completion**: ✅ November 5, 2025
- **Implementation Status**: 🟡 In Progress
- **Components**:
  - 🟢 Build validator (rule checker) - ✅ **COMPLETE** (Nov 5, 2025)
  - � Capsule effect parser - ✅ **COMPLETE** (Nov 5, 2025)
  - 🟡 Individual capsule performance calculator - **IN PROGRESS**
  - ⬜ Pair synergy detection algorithm
  - ⬜ AI strategy compatibility analyzer
  - ⬜ Build recommendation engine
  - ⬜ UI Tab 1: Individual Performance Table
  - ⬜ UI Tab 2: Synergy Pairs & Heatmap
  - ⬜ UI Tab 3: Build Analyzer Tool
- **Key Decisions Logged**: ✅
  - Single + Pair performance display
  - AI strategy integration
  - Configurable build rules
  - Effect-based capsule parsing
- **Completed Steps**: 
  1. ✅ Created `buildRules.js` configuration file (Nov 5, 2025)
  2. ✅ Implemented capsule effect parser with archetype classification (Nov 5, 2025)
- **Next Steps**: 
  3. Build capsule data processor (parse CSV)
  4. Implement synergy calculator
  5. Build data aggregation functions for performance metrics

#### 1.2 Build Archetype Deep Dive
- **Status**: ⬜ Not Started
- **Implementation**: Pending

#### 1.3 AI Strategy Effectiveness
- **Status**: 🟡 Partially Covered (integrated into 1.1)
- **Implementation**: Will be part of 1.1 deliverable

### Phase 2: Matchup & Counter Analysis
- **Status**: ⬜ Not Started

### Phase 3: Temporal & Trend Analysis
- **Status**: ⬜ Not Started

### Phase 4: Advanced Strategic Insights
- **Status**: ⬜ Not Started

### Phase 5: Team Manager Tools
- **Status**: ⬜ Not Started

### Phase 6: Data Visualization Enhancements
- **Status**: ⬜ Not Started

### Phase 7: Export & Sharing Features
- **Status**: ⬜ Not Started

---

## 📝 Development Notes & Decisions Log

### November 5, 2025 - Phase 1.1 Discussion
**Participants**: User + AI Assistant  
**Topic**: Capsule Synergy Analysis design decisions

**Key Decisions**:
1. ✅ Display both individual capsule performance AND pair synergies (not one or the other)
2. ✅ Integrate AI strategy analysis with capsule/build recommendations
3. ✅ Make build rules configurable via `buildRules.js` instead of hardcoding
4. ✅ Parse capsule effects from CSV to intelligently detect synergies
5. ✅ Prioritize pairs over triples for initial implementation (complexity vs value)
6. ✅ Archetype mapping refined:
   - **Aggressive**: High damage effects
   - **Defensive**: Damage reduction, armor, health, guards, counters, tagging
   - **Technical**: Ki management, movement, skills, skill gauge, transformations
   - Multi-category capsules assigned to most prominent archetype

**Rationale Archive**:
- **Why pairs over singles only**: Pairs reveal synergies that exceed sum of parts; provides strategic depth
- **Why AI integration**: AI strategies fundamentally change playstyle; capsule effectiveness varies by strategy
- **Why configurable rules**: League rules may change seasonally; avoid code changes for rule updates
- **Why effect parsing**: Enables smart synergy detection (multiplicative vs complementary vs anti-synergy)
- **Why primary archetype assignment**: Simplifies build classification while preserving nuance via secondary tags

**Action Items**:
- [ ] Create `buildRules.js` with current constraints (max cost 20, max 7 capsules)
- [ ] Design capsule effect categorization system with archetype weighting
- [ ] Implement synergy scoring algorithm
- [ ] Create UI wireframes for 3-tab layout

---

## 🔮 Future Considerations & Parking Lot

**Ideas to Revisit Later**:
- Triple capsule synergies (Phase 1.1 extension)
- Character-specific capsule affinity scores
- Map-based capsule effectiveness (Power of Namek, etc.)
- Seasonal capsule meta shifts visualization
- Community-submitted build library

**Technical Debt**:
- None yet (project starting fresh)

**Questions for User**:
- None pending

---

## Technical Implementation Roadmap

### Priority 1 (Immediate Value)
1. **Capsule Synergy Analysis** (1.1)
2. **Character Matchup Matrix** (2.1)
3. **Position-Based Meta** (2.3)
4. **Team Performance Dashboard** (5.1)

### Priority 2 (Strategic Depth)
5. **Build Archetype Deep Dive** (1.2)
6. **AI Strategy Effectiveness** (1.3)
7. **Team Composition Analysis** (2.2)
8. **Meta Evolution Tracking** (3.1)

### Priority 3 (Advanced Features)
9. **Win Probability Calculator** (4.1)
10. **Clutch Performance Analytics** (4.3)
11. **Character Performance Reports** (5.2)
12. **Interactive Charts** (6.1)

### Priority 4 (Long-term Goals)
13. **Seasonal Performance Analysis** (3.2)
14. **Opponent Adaptation Analysis** (3.3)
15. **Scouting Reports** (5.3)
16. **Custom Report Builder** (7.2)

---

## Data Requirements

### New Data Points to Track
- Capsule co-occurrence matrices
- Character vs character win/loss records
- Position-specific performance metrics
- Week/season timestamp metadata
- Match importance flags (regular/playoff)
- Team composition hash keys
- Sparking mode usage duration
- Low health (<25%) damage dealt
- Tag timing and frequency
- Speed impact success rates
- Blast hit/miss accuracy (already tracked)

### Storage Considerations
- Aggregated data caching for performance
- Historical snapshot preservation
- Incremental calculation updates
- Pre-computed matchup matrices

---

## UI/UX Improvements

### Navigation Structure
```
Meta Analysis
├── Overview Dashboard
├── Build Analysis
│   ├── Capsule Synergies
│   ├── Archetype Performance
│   └── AI Strategy Effectiveness
├── Matchup Analysis
│   ├── Character Matchups
│   ├── Team Compositions
│   └── Position Meta
├── Trends & History
│   ├── Meta Evolution
│   ├── Seasonal Analysis
│   └── Adaptation Tracking
├── Strategic Tools
│   ├── Win Probability
│   ├── Lineup Simulator
│   └── Clutch Analytics
└── Team Manager
    ├── Team Dashboard
    ├── Character Reports
    └── Scouting Reports
```

### Design Principles
- **Data-Dense but Scannable**: Show maximum info without overwhelming
- **Progressive Disclosure**: Start with summaries, drill down for details
- **Visual Hierarchy**: Use color, size, and position to guide attention
- **Contextual Help**: Tooltips and info icons explaining metrics
- **Responsive Design**: Works on desktop and tablet devices

---

## Success Metrics

### User Engagement
- Time spent in Meta Analysis view
- Number of filter/drill-down interactions
- Export feature usage
- Return visitor rate

### Competitive Impact
- Teams report using insights for roster decisions
- Build diversity increases across the league
- Closer matches (reduced win margin variance)
- Increased strategic counter-picking

### Technical Performance
- Page load time <2s
- Chart rendering time <500ms
- Data refresh time <1s
- Export generation time <5s

---

## Future Considerations

### Machine Learning Opportunities
- **Build Recommendation Engine**: AI-suggested builds based on opponent
- **Outcome Prediction Models**: More accurate win probability using ML
- **Anomaly Detection**: Identify unusual performances or strategies
- **Character Clustering**: Group characters by playstyle similarity

### Community Features
- **Public Build Library**: Share successful builds with community
- **Strategy Discussions**: Comment threads on meta analysis insights
- **League Rankings**: Comprehensive team and player standings
- **Achievement System**: Badges for unique accomplishments

### Integration Possibilities
- **Discord Bot**: Query meta stats from Discord
- **Match Scheduler**: Integrate with league scheduling system
- **Live Match Tracking**: Real-time updates during matches
- **Mobile App**: Companion app for on-the-go analysis

---

## Conclusion

This expansion plan transforms the Meta Analysis view from a basic statistical overview into a comprehensive strategic intelligence platform. By implementing these features in phases, the analyzer becomes an indispensable tool for team managers to:

1. **Make Informed Decisions**: Data-driven roster, build, and lineup choices
2. **Identify Trends**: Stay ahead of meta shifts and adapt strategies
3. **Exploit Weaknesses**: Find and target opponent vulnerabilities
4. **Optimize Performance**: Maximize team potential through analytics
5. **Predict Outcomes**: Estimate match results and plan accordingly

The phased approach ensures steady progress while delivering value at each stage. Priority 1 features provide immediate strategic benefits, while later phases add depth and sophistication to the analytical capabilities.

---

## Appendix: Sample Metrics Showcase

### Example: Character Matchup Detail
```
Goku (Base) vs Frieza (Final Form)

Overall: 12W - 8L (60% win rate)

Average Stats:
├── Damage Dealt: 145,000 (+12,000 vs avg)
├── Damage Taken: 98,000 (-7,000 vs avg)
├── Battle Duration: 142s
└── Survival Rate: 75%

Build Performance:
├── Aggressive: 8W-3L (73%)
├── Defensive: 2W-4L (33%)
└── Technical: 2W-1L (67%)

Best Builds vs Frieza:
1. Rush Attack Boost 3 + Blast Burst + Z-Burst Dash Master (85% WR)
2. Ki Blast Attack Boost 3 + Indomitable Fighting Spirit (80% WR)

Position Performance:
├── Lead: 5W-2L (71%)
├── Mid: 4W-4L (50%)
└── Anchor: 3W-2L (60%)
```

This level of detail empowers team managers to make precise strategic decisions based on comprehensive historical data.
