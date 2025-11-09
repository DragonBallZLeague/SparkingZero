# Phase 1.1 Discussion Summary
**Capsule Synergy Analysis - Design Decisions**

**Date**: November 5, 2025  
**Status**: Design Finalized, Ready for Implementation

---

## Overview

This document summarizes the key design decisions made during the Phase 1.1 (Capsule Synergy Analysis) planning discussion. These decisions should guide implementation and serve as reference for understanding the "why" behind design choices.

---

## Core Question 1: Single Capsules vs Pairs vs Both?

### Decision: ✅ **Display BOTH**

**UI Structure**: 3-Tab Layout
1. **Tab 1**: Individual Capsule Performance
2. **Tab 2**: Synergy Pairs (Heatmap + Cards)
3. **Tab 3**: Build Analyzer (Interactive Tool)

### Rationale

**Why not ONLY singles?**
- Doesn't reveal synergies
- Misses strategic depth of combinations
- Limited actionable insight for build creation

**Why not ONLY pairs?**
- Lacks baseline understanding
- Can't identify "universally good" capsules
- Harder to compare individual capsule value

**Why BOTH?**
- Singles provide baseline: "Rush Attack Boost 3 has 65% win rate"
- Pairs reveal synergies: "Rush Attack Boost 3 + Super Warrior = 78% win rate (+13% synergy!)"
- More complete picture for decision-making

### Example Use Case

**Team Manager Workflow**:
1. Check Tab 1 to see "which capsules are performing well overall?"
2. Check Tab 2 to see "which combinations have special synergy?"
3. Use Tab 3 to build/test their own combinations with real-time feedback

---

## Core Question 2: How to Handle AI Strategies?

### Decision: ✅ **Integrate AI Strategy + Capsule Analysis**

**New Feature**: AI Strategy + Build Compatibility Matrix

### Rationale

AI strategies fundamentally change how characters fight:
- `Attack Strategy: Ultimate Blasts` → Should pair with ult-boosting capsules
- `Defense Strategy: Counters` → Synergizes with counter-focused builds
- `Balanced Strategy: Ki Blasts` → Works best with ki management capsules

**Without AI integration**: We'd recommend builds that don't match the AI's playstyle  
**With AI integration**: Recommendations are holistic and actually work in practice

### Implementation Approach

**Data to Track**:
```javascript
{
  aiStrategyCapsuleSynergy: {
    "Attack Strategy: Ultimate Blasts": {
      topCapsules: [
        { name: "Divine Blow", winRate: 72.3, usage: 45 },
        { name: "Ultimate Burst", winRate: 69.8, usage: 38 }
      ],
      topArchetype: "Aggressive",
      recommendedBuild: { ... }
    }
  }
}
```

**UI Addition**:
- AI Strategy selector in Build Analyzer
- "Top Capsules for This Strategy" section
- Recommended builds filtered by AI strategy

---

## Core Question 3: Build Rules & Constraints

### Decision: ✅ **Configurable Rules via Config File**

**Current Rules** (Nov 2025):
- Max Cost: 20 points
- Max Capsules: 7 slots

**Implementation**: `buildRules.js` configuration file

### Rationale

**Why configurable?**
- League rules may change seasonally
- Avoids hardcoding values throughout codebase
- Single source of truth for rule updates
- Easy to adjust without code changes

**Why config file instead of database?**
- Simple to update (just edit one file)
- Version controllable
- No need for admin interface yet
- Fast to read (no database query)

### Code Structure

```javascript
// apps/analyzer/src/config/buildRules.js
export const BUILD_RULES = {
  version: "1.0",
  lastUpdated: "2025-11-05",
  rules: {
    maxCost: 20,
    maxCapsules: 7,
    // Future-proofing
    minCost: null,
    bannedCapsules: [],
    requiredCapsules: [],
    slotRestrictions: null
  },
  notes: "Update when league rules change"
};
```

### Build Validator

All build recommendations must pass validation:

```javascript
function validateBuild(capsules) {
  const totalCost = capsules.reduce((sum, c) => sum + c.cost, 0);
  return {
    costValid: totalCost <= BUILD_RULES.rules.maxCost,
    countValid: capsules.length <= BUILD_RULES.rules.maxCapsules,
    totalCost,
    remainingCost: BUILD_RULES.rules.maxCost - totalCost,
    remainingSlots: BUILD_RULES.rules.maxCapsules - capsules.length
  };
}
```

**UI Display**:
```
Your Build:
├── Total Cost: 18/20 ✓
├── Capsules Used: 6/7 ✓
└── Valid: YES
```

---

## Core Question 4: How to Use Capsule Effects?

### Decision: ✅ **Parse Effects for Intelligent Synergy Detection**

**Source**: `capsules.csv` Effect column

### Rationale

The Effect column provides rich semantic information:
- "Increases Blast damage by 7.5%" → Tag as `damage`, `blast`
- "Reduces ki cost for Dragon Dashes by 25%" → Tag as `ki`, `movement`
- "Increases maximum health by 5,000 HP" → Tag as `health`, `defensive`

**Why parse instead of manual tagging?**
- Automated and scalable
- Single source of truth (the CSV)
- Reduces manual maintenance
- Can detect new capsules automatically

### Effect Categorization System

**Archetype Mapping Rules**:
- **Aggressive**: High damage effects (damage boosts, attack increases, blast/ultimate damage)
- **Defensive**: Damage reduction, armor, health, guards, counters, tagging/switching
- **Technical**: Ki management, movement, skills, skill gauge, transformations

**Multi-Category Handling**:
- Some capsules fit multiple archetypes (e.g., "Secret to Counters" = Defensive + Technical)
- **Solution**: Assign to the **most prominent** archetype based on primary effect
- Example: "Secret to Counters" → **Defensive** (primary benefit is more counters, secondary is skill efficiency)

```javascript
function parseCapsuleEffect(effect, capsuleName) {
  // Define archetype patterns with priority weighting
  const archetypePatterns = {
    aggressive: {
      patterns: [
        /increases.*damage/i,
        /increases.*attack/i,
        /blast.*damage/i,
        /ultimate.*damage/i,
        /burst.*damage/i,
        /power/i,
        /combo.*damage/i
      ],
      weight: 0
    },
    defensive: {
      patterns: [
        /reduces.*damage taken/i,
        /armor/i,
        /guard/i,
        /defense/i,
        /health.*recovery/i,
        /HP.*recovery|recovers.*HP/i,
        /maximum health|max.*HP/i,
        /counter/i,
        /switch/i,
        /tag/i,
        /standby/i,
        /damage resistance/i,
        /flinch/i
      ],
      weight: 0
    },
    technical: {
      patterns: [
        /ki.*cost/i,
        /ki.*recovery|ki.*gain/i,
        /ki gauge/i,
        /dash/i,
        /movement/i,
        /skill.*gauge|skill count/i,
        /transformation|fusion/i,
        /sparking mode/i,
        /charging time/i,
        /speed/i
      ],
      weight: 0
    }
  };
  
  // Score each archetype based on pattern matches
  for (const [archetype, config] of Object.entries(archetypePatterns)) {
    for (const pattern of config.patterns) {
      if (pattern.test(effect)) {
        config.weight++;
      }
    }
  }
  
  // Determine primary archetype (highest weight)
  let primaryArchetype = 'hybrid';
  let maxWeight = 0;
  const archetypeTags = [];
  
  for (const [archetype, config] of Object.entries(archetypePatterns)) {
    if (config.weight > 0) {
      archetypeTags.push(archetype);
      if (config.weight > maxWeight) {
        maxWeight = config.weight;
        primaryArchetype = archetype;
      }
    }
  }
  
  // Handle ties or no matches
  if (archetypeTags.length === 0) {
    primaryArchetype = 'utility'; // Catch-all for misc capsules
  } else if (archetypeTags.length > 1 && 
             archetypePatterns[archetypeTags[0]].weight === 
             archetypePatterns[archetypeTags[1]].weight) {
    // Tie-breaker: Use most impactful archetype based on effect description
    primaryArchetype = determineTieBreakerArchetype(effect, capsuleName, archetypeTags);
  }
  
  return {
    primaryArchetype,      // Single archetype for build classification
    allTags: archetypeTags, // All applicable archetypes
    effectDescription: effect
  };
}

// Tie-breaker logic for capsules that match multiple archetypes equally
function determineTieBreakerArchetype(effect, capsuleName, tags) {
  // Priority order for tie-breaking: aggressive > defensive > technical
  // Rationale: Damage is typically the most impactful in competitive play
  const priorityOrder = ['aggressive', 'defensive', 'technical'];
  
  for (const archetype of priorityOrder) {
    if (tags.includes(archetype)) {
      return archetype;
    }
  }
  
  return tags[0]; // Fallback to first match
}
```

**Examples of Archetype Assignment**:

| Capsule | Effect | Tags Matched | Primary Archetype | Reasoning |
|---------|--------|--------------|-------------------|-----------|
| Rush Attack Boost 3 | "Increases Rush Attack damage by 7.5%" | aggressive | **Aggressive** | Pure damage boost |
| The Secret to Counters | "Reduces Skill Count needed for Super Z-Counters by 1" | defensive, technical | **Defensive** | Primary benefit is counters (defensive mechanic) |
| God Ki | "Reduces ki cost for Blasts by 50%. Recovers 1 bar of ki after unsuccessful Blast." | technical | **Technical** | Ki management |
| Power Body | "Increases combatives armor level by 3. Reduces melee defense by 20%. Reduces blast defense by 10%." | defensive | **Defensive** | Net defensive (armor > defense reduction) |
| Warming Up | "Increases health recovery while on standby in Team Battles by 50%" | defensive | **Defensive** | Health recovery + tagging synergy |
| Master Strike | "Increases Rush Attack damage by 5%. Increases Smash Attack damage by 5%. Increases Rush Chain damage by 5%. Reduces maximum health by 5,000 HP" | aggressive, defensive | **Aggressive** | Primary is damage (defensive penalty is secondary) |
| Super Transformation | "Reduces Skill Count needed for Transformations and Fusions by 1" | technical | **Technical** | Transformation efficiency |

### Synergy Detection Logic

**Three Types of Synergy**:

1. **Multiplicative Synergy** (Same Category)
   - Example: `Blast Attack Boost 3` + `Fury!` + `Divine Blow`
   - All boost blast damage → Effects stack multiplicatively
   - Score: HIGH

2. **Complementary Synergy** (Different Categories)
   - Example: `Blast Attack Boost 3` + `God Ki` + `Indomitable Fighting Spirit`
   - Damage boost + ki cost reduction + ki recovery → Sustainable blast spam
   - Score: MEDIUM-HIGH

3. **Anti-Synergy** (Conflicting Effects)
   - Example: `Power Body` (reduces defense) + no healing capsules
   - Taking more damage without sustain → Risky
   - Score: NEGATIVE

### Build Recommendation Engine

**Process**:
1. Parse all capsule effects → Categorize by primary archetype
2. Calculate individual capsule performance scores
3. Calculate pair synergies (usage + win rate)
4. Group by archetype:
   - **Aggressive**: High damage effects
   - **Defensive**: Damage reduction, armor, health, guards, counters, tagging
   - **Technical**: Ki management, movement, skills, skill gauge, transformations
5. Validate against build rules (cost ≤20, slots ≤7)
6. Rank by performance score
7. Include AI strategy recommendation

**Archetype Composition Guidelines**:
- **Pure Aggressive**: 5-7 aggressive capsules (glass cannon)
- **Pure Defensive**: 5-7 defensive capsules (tank build)
- **Pure Technical**: 5-7 technical capsules (utility/setup)
- **Balanced**: Mix of 2-3 from each category
- **Hybrid**: Dominant archetype (4+) with supporting capsules (1-3)

**Output Example**:
```
Recommended Build: "Blast Master"
Archetype: Aggressive (Primary) + Technical (Support)
Strategy: Capitalize on blast damage scaling with ki sustainability

Capsules (Cost: 19/20, Slots: 5/7):
├── [A] Blast Attack Boost 3 (5) - Base blast +7.5%
├── [A] Fury! (4) - Additional +15% at low HP  
├── [A] Divine Blow (3) - Ultimate +5%
├── [T] God Ki (5) - Blast cost -50%, ki recovery on miss
└── [T] Indomitable Fighting Spirit (3) - Ki gain +20%

Legend: [A]=Aggressive, [D]=Defensive, [T]=Technical

Composition: 3 Aggressive + 2 Technical
Primary Archetype: Aggressive (60%)

Synergy Analysis:
├── Blast Damage Stacking: 29% total boost (multiplicative)
├── Ki Sustainability: God Ki + Indomitable = endless blasts
└── Low HP Clutch: Fury! rewards aggressive play

Best Used With:
├── AI Strategy: "Balanced Strategy: Blasts"
├── Characters: Frieza, Cell, Golden Frieza
└── Position: Mid/Anchor (benefit from low HP)
```

---

## Implementation Checklist

### Data Layer
- [ ] Create `buildRules.js` config file
- [ ] Implement capsule effect parser
- [ ] Build synergy calculator (pairs)
- [ ] Aggregate match data for capsule performance
- [ ] Calculate AI strategy + capsule compatibility
- [ ] Build recommendation engine

### UI Components
- [ ] Tab 1: Individual Capsule Performance Table
  - Sortable columns (win rate, damage, usage)
  - Filters (cost, archetype, effect type)
  - Character compatibility scores
  
- [ ] Tab 2: Synergy Pairs View
  - Heatmap visualization (co-occurrence)
  - Top 20 synergy cards (ranked by performance)
  - Synergy score badges (+X% vs individual avg)
  
- [ ] Tab 3: Build Analyzer Tool
  - Drag-drop capsule builder
  - Real-time cost/slot validation
  - Synergy score calculator
  - Performance prediction
  - AI strategy selector
  - Export build function

### Testing
- [ ] Verify build validator respects rules
- [ ] Test effect parser on all capsules
- [ ] Validate synergy calculations
- [ ] UI responsiveness testing
- [ ] Performance with large datasets

---

## Success Metrics

**How we'll know it's working**:
1. **Usability**: Users can build valid loadouts in <2 minutes
2. **Accuracy**: Recommended builds have ≥5% higher win rate than random builds
3. **Adoption**: 80%+ of team managers use the tool for build decisions
4. **Performance**: All calculations complete in <2 seconds
5. **Insights**: Users report discovering synergies they didn't know existed

---

## Next Steps

1. ✅ Finalize design decisions (DONE)
2. ⬜ Create `buildRules.js`
3. ⬜ Implement effect parser
4. ⬜ Build data aggregation layer
5. ⬜ Design UI wireframes
6. ⬜ Implement UI components
7. ⬜ Testing & iteration
8. ⬜ Deploy to production

---

## Questions for Future Discussion

- Should we include triple-capsule synergies? (Complexity vs value trade-off)
- How to handle character-specific capsule effectiveness?
- Should we track map-based capsule performance? (Power of Namek, etc.)
- Community build library submission system?

---

**Document Status**: ✅ Approved for Implementation  
**Next Update**: When implementation begins
