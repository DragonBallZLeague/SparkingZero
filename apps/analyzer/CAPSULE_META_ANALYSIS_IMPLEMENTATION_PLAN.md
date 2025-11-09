# Capsule Meta Analysis - Implementation Plan
## Dragon Ball Z League - Sparking Zero Match Analyzer

---

## 📋 Document Info

**Created**: November 6, 2025  
**Status**: Planning Phase  
**Parent Document**: `META_ANALYSIS_EXPANSION_PLAN.md`  
**Focus**: Simplified, data-driven capsule and AI strategy analysis

---

## Executive Summary

This plan replaces the overly complex Phase 1.1 implementation with a simpler, more maintainable approach focused on three core features:

1. **Individual Capsule Performance** (keep & polish)
2. **Popular Build Combinations** (replace Synergy Pairs)
3. **Build Validator + Explorer** (simplify Build Analyzer)

Key improvements:
- **Manual capsule categorization** with human-curated metadata
- **League-aligned build type system** - Uses existing meta terminology (Melee, Blasts, Ki Blast, Defense, Skill, Ki Efficiency, Utility)
- **AI strategy as first-class dimension** in all analysis
- **Combat action tracking** for deeper capsule effectiveness insights
- **Data-driven approach** - let patterns emerge from usage, not assumptions

---

## Part 1: Capsule Categorization System

### Problem Statement
Automated pattern matching for capsule categorization is fragile and error-prone. New capsules with novel effects will break assumptions. Need a maintainable, human-curated system.

### Solution: Manual Metadata with Automation Assistance

#### Approach
1. **Create curated capsule metadata file** (`capsuleMetadata.json`)
2. **Run automated classifier ONCE** to generate initial metadata
3. **Human reviews and corrects** classifications
4. **Store final classifications** in version-controlled metadata file
5. **When new capsules added**: Run classifier → human review → update metadata

#### League Build Type System

The league already has established build type terminology that team managers understand. We align our categorization with these existing meta concepts:

| Build Type | Description | Example Capsules |
|------------|-------------|------------------|
| **Melee Build** | Rush attacks, smash attacks, combos, vanishing attacks, throws | Rush Attack Boost 3, Smash Attack Boost 3, Dragon Assault, Dragon Rush |
| **Blast Build** | Blast supers and ultimate blast damage | Blast Attack Boost 3, Divine Blow, Fury!, Ultimate Burst |
| **Ki Blast Build** | Ki blast projectiles and energy attacks | Ki Blast Attack Boost 3, Energy Saver 3 |
| **Defense Build** | Survivability, damage reduction, armor, health, dodging | Perfect Guard, Light Body, Miracle Master, Latent Power!, Mirage |
| **Skill Build** | Skill gauge, transformations, sparking mode | Super Transformation, Dragon Spirit, Sparking Cheer |
| **Ki Efficiency Build** | Ki management, ki cost reduction, ki recovery, dash costs | Indomitable Fighting Spirit, God Ki, Z-Burst Dash Master, Crisis Avoided |
| **Utility** | Situational, environmental, niche mechanics | Power of Namek, Waters Blessing, Map-specific effects |

**Why this system?**
- ✅ Aligns with league's existing meta discussions
- ✅ Team managers already think in these terms
- ✅ Clear, intuitive categories
- ✅ Covers all capsule types comprehensively
- ✅ Flexible enough for future capsules

#### Category System (6 Build Types + Utility)

Using the league's established meta terminology:

```javascript
// Primary categories (one per capsule) - Based on league build types
const BUILD_TYPES = {
  MELEE: {
    id: 'melee',
    label: 'Melee Build',
    description: 'Rush attacks, smash attacks, combos, vanishing attacks, throws',
    color: '#ef4444', // red
    keywords: ['rush', 'smash', 'combo', 'melee', 'physical', 'vanishing', 'throw']
  },
  blast: {
    id: 'blast',
    label: 'Blast Build', 
    description: 'Blast supers and ultimate blast damage',
    color: '#f97316', // orange
    keywords: ['blast', 'ultimate', 'super']
  },
  KI_BLAST: {
    id: 'ki-blast',
    label: 'Ki Blast Build',
    description: 'Ki blast projectiles and energy attacks',
    color: '#eab308', // yellow
    keywords: ['ki blast', 'energy bullet', 'projectile']
  },
  DEFENSE: {
    id: 'defense',
    label: 'Defense Build',
    description: 'Survivability, damage reduction, armor, health, dodging',
    color: '#3b82f6', // blue
    keywords: ['defense', 'armor', 'guard', 'health', 'damage resistance', 'recovery', 'dodge', 'evade']
  },
  SKILL: {
    id: 'skill',
    label: 'Skill Build',
    description: 'Skill gauge, transformations, sparking mode',
    color: '#8b5cf6', // purple
    keywords: ['skill', 'transformation', 'fusion', 'sparking']
  },
  KI_EFFICIENCY: {
    id: 'ki-efficiency',
    label: 'Ki Efficiency Build',
    description: 'Ki management, ki cost reduction, ki recovery, dash costs',
    color: '#10b981', // green
    keywords: ['ki cost', 'ki recovery', 'ki gain', 'ki gauge', 'energy', 'dash']
  },
    label: 'Ki Efficiency Build',
    description: 'Ki management, ki cost reduction, ki recovery',
    color: '#10b981', // green
    keywords: ['ki cost', 'ki recovery', 'ki gain', 'ki gauge', 'energy']
  },
  UTILITY: {
    id: 'utility',
    label: 'Utility',
    description: 'Situational, environmental, niche mechanics',
    color: '#64748b', // gray
    keywords: ['map', 'water', 'environmental', 'niche']
  }
};
```

#### Effect Tags (Multi-label)

Effect tags provide granular classification for filtering and synergy detection:

```javascript
const EFFECT_TAGS = {
  // Melee Build subcategories
  'rush-damage': 'Rush attack damage boost',
  'smash-damage': 'Smash attack damage boost',
  'combo-damage': 'Combo/chain damage boost',
  'melee-charge': 'Melee attack charging speed',
  'armor-break': 'Armor breaking/penetration',
  'vanishing': 'Vanishing attack/assault effects',
  'throw': 'Throw damage/mechanics',
  
  // Blast Build subcategories
  'blast-damage': 'Blast/Super damage boost',
  'ultimate-damage': 'Ultimate blast damage boost',
  'blast-cost': 'Blast ki cost modification',
  
  // Ki Blast Build subcategories
  'ki-blast-damage': 'Ki blast damage boost',
  'ki-blast-cost': 'Ki blast cost reduction',
  'ki-blast-charge': 'Ki blast charging speed',
  'energy-bullet': 'Energy projectile effects',
  
  // Defense Build subcategories
  'damage-reduction': 'Reduces damage taken',
  'armor': 'Armor/flinch resistance',
  'health-boost': 'Max HP increase',
  'health-regen': 'HP recovery over time',
  'guard': 'Guard/blocking enhancement',
  'counter': 'Counter/revenge mechanics',
  'standby-recovery': 'Team battle standby healing',
  'dodge': 'Dodging/evasion effects',
  'auto-dodge': 'Automatic dodge mechanics',
  
  // Skill Build subcategories
  'skill-gauge': 'Skill count/gauge effects',
  'transformation': 'Transform/fusion assistance',
  'sparking-gauge': 'Sparking mode gauge effects',
  'sparking-damage': 'Sparking mode damage boost',
  
  // Ki Efficiency Build subcategories
  'ki-cost-reduction': 'Reduces ki costs',
  'ki-generation': 'Increases ki gain',
  'ki-starting': 'Starting ki boost',
  'ki-regen': 'Passive ki recovery',
  'dash': 'Dash cost/speed improvements',
  
  // Cross-category tags
  'movement-speed': 'General movement enhancement',
  'switch-gauge': 'Tag/switch gauge effects',
  'conditional': 'Situational/condition-based',
  'environmental': 'Map-specific effects',
  'special-mechanic': 'Unique/niche mechanics'
};
```

#### Capsule Metadata Structure

```json
{
  "version": "1.0.0",
  "lastUpdated": "2025-11-06",
  "lastReviewedBy": "human",
  "buildTypes": [
    "melee",
    "blasts", 
    "ki-blast",
    "defense",
    "skill",
    "ki-efficiency",
    "utility"
  ],
  "capsules": {
    "00_0_0007": {
      "id": "00_0_0007",
      "name": "Rush Attack Boost 3",
      "cost": 5,
      "effect": "Increases Rush Attack damage by 7.5%.",
      "buildType": "melee",
      "effectTags": ["rush-damage"],
      "trackedActions": ["actRSHA1", "actRSHA2", "actRSH*"],
      "notes": ""
    },
    "00_0_0101": {
      "id": "00_0_0101",
      "name": "Miracle Master",
      "cost": 1,
      "effect": "Automatically dodges melee attacks when downed (excludes Ki Blasts).",
      "buildType": "defense",
      "effectTags": ["special-mechanic"],
      "trackedActions": [],
      "notes": "Auto-dodge is defensive survivability mechanic"
    },
    "00_0_0040": {
      "id": "00_0_0040",
      "name": "Indomitable Fighting Spirit",
      "cost": 3,
      "effect": "Increases ki gained from landing attacks by 20%.",
      "buildType": "ki-efficiency",
      "effectTags": ["ki-generation"],
      "trackedActions": ["attackHitCount"],
      "notes": "Synergizes with aggressive playstyles"
    },
    "00_0_0038": {
      "id": "00_0_0038",
      "name": "Fury!",
      "cost": 4,
      "effect": "Increases Blast damage by 5% at 75% HP. Increases Blast damage by additional 5% (10% total) at 50% HP. Increases Blast damage by additional 5% (15% total) at 25% HP. Increases Blast Combo damage by same amounts.",
      "buildType": "blasts",
      "effectTags": ["blast-damage", "conditional"],
      "trackedActions": ["useBlastGroupCount", "blastHitDemoInfo"],
      "notes": "Health-based conditional damage boost"
    },
    "00_0_0030": {
      "id": "00_0_0030",
      "name": "Blast Attack Boost 3",
      "cost": 5,
      "effect": "Increases Blast damage by 7.5%. Increases Blast Combo damage by 7.5%. Increases Ultimate Blast damage by 7.5%.",
      "buildType": "blasts",
      "effectTags": ["blast-damage", "ultimate-damage"],
      "trackedActions": ["useBlastGroupCount", "blastHitDemoInfo", "s2Blast", "ultBlast"],
      "notes": "Covers both supers and ultimates"
    },
    "00_0_0016": {
      "id": "00_0_0016",
      "name": "Ki Blast Attack Boost 3",
      "cost": 5,
      "effect": "Increases Rush Ki Blast damage by 7.5%. Increases Smash Ki Blast damage by 7.5%.",
      "buildType": "ki-blast",
      "effectTags": ["ki-blast-damage"],
      "trackedActions": ["shotEnergyBulletCount", "reflectEnergyBulletCount"],
      "notes": "Projectile-focused damage"
    },
    "00_0_0066": {
      "id": "00_0_0066",
      "name": "Super Transformation",
      "cost": 1,
      "effect": "Reduces Skill Count needed for Transformations and Fusions by 1 (minimum 1).",
      "buildType": "skill",
      "effectTags": ["transformation", "skill-gauge"],
      "trackedActions": ["formChangeHistory"],
      "notes": "Enables faster transformation access"
    }
  }
}
```

#### Implementation Steps

**Step 1.1**: Create automated classifier script
- Read `capsules.csv`
- Apply pattern matching (current `capsuleEffectParser.js` logic)
- Generate initial `capsuleMetadata.json` with all capsules

**Step 1.2**: Human review process
- Create simple web UI or spreadsheet export for review
- Sort by category for bulk review
- Flag uncertain classifications for manual review
- Add effect tags based on effect text
- Add tracked action mappings (see Part 3)

**Step 1.3**: Validation & storage
- Validate metadata structure
- Store in `src/config/capsuleMetadata.json`
- Version control for change tracking

**Step 1.4**: Update workflow for new capsules
- When new season CSV imported, detect new capsule IDs
- Run classifier on new capsules only
- Flag for human review before adding to metadata

---

## Part 2: AI Strategy Integration

### Problem Statement
AI strategies fundamentally change character playstyles. Capsule effectiveness varies significantly by AI strategy, but current implementation treats AI as secondary consideration.

### Solution: AI Strategy as First-Class Analysis Dimension

#### AI Strategy Data Structure

```javascript
// Enhance capsule performance tracking with AI strategy dimension
{
  capsulePerformance: {
    "00_0_0030": { // Blast Attack Boost 3
      overall: {
        usage: 124,
        winRate: 65.3,
        avgDamage: 168000,
        avgPerformanceScore: 178.5
      },
      byAIStrategy: {
        "00_7_0007": { // Attack Strategy: Ultimate Blasts
          strategyName: "Attack Strategy: Ultimate Blasts",
          usage: 45,
          winRate: 72.8,
          avgDamage: 185000,
          avgPerformanceScore: 192.3,
          topCharacters: ["Frieza", "Cell", "Golden Frieza"]
        },
        "00_7_0009": { // Balanced Strategy: Blasts
          strategyName: "Balanced Strategy: Blasts",
          usage: 38,
          winRate: 69.2,
          avgDamage: 172000,
          avgPerformanceScore: 181.5,
          topCharacters: ["Goku", "Vegeta"]
        },
        "00_7_0003": { // Attack Strategy: Combos
          strategyName: "Attack Strategy: Combos",
          usage: 12,
          winRate: 51.2,
          avgDamage: 145000,
          avgPerformanceScore: 158.3,
          topCharacters: ["Gohan"]
        }
      },
      topAIStrategies: [
        { id: "00_7_0007", name: "Attack Strategy: Ultimate Blasts", winRate: 72.8 },
        { id: "00_7_0009", name: "Balanced Strategy: Blasts", winRate: 69.2 }
      ]
    }
  }
}
```

#### AI Strategy Compatibility Analysis

Track which capsule build types/effects perform best with which AI strategies:

```javascript
{
  aiStrategyAnalysis: {
    "00_7_0007": { // Attack Strategy: Ultimate Blasts
      name: "Attack Strategy: Ultimate Blasts",
      usage: 156,
      winRate: 68.5,
      
      // Build type performance breakdown
      buildTypePerformance: {
        blast: {
          usage: 124,
          winRate: 71.2,
          avgCapsulesPerBuild: 4.2,
          topCapsules: [
            { id: "00_0_0030", name: "Blast Attack Boost 3", winRate: 72.8 },
            { id: "00_0_0070", name: "Divine Blow", winRate: 71.5 },
            { id: "00_0_0027", name: "Ultimate Burst", winRate: 69.8 }
          ]
        },
        'ki-efficiency': {
          usage: 89,
          winRate: 66.4,
          avgCapsulesPerBuild: 2.1,
          topCapsules: [
            { id: "00_0_0040", name: "Indomitable Fighting Spirit", winRate: 68.2 },
            { id: "00_0_0131", name: "God Ki", winRate: 67.9 }
          ]
        },
        defense: {
          usage: 34,
          winRate: 58.2,
          avgCapsulesPerBuild: 0.8,
          topCapsules: []
        }
      },
      
      // Effect tag performance
      topEffectTags: [
        { tag: "blast-damage", usage: 98, winRate: 72.1 },
        { tag: "ultimate-damage", usage: 76, winRate: 71.8 },
        { tag: "ki-generation", usage: 62, winRate: 67.5 }
      ],
      
      // Recommended build composition
      recommendedComposition: {
        blast: { min: 3, max: 5, optimal: 4 },
        'ki-efficiency': { min: 1, max: 3, optimal: 2 },
        defense: { min: 0, max: 2, optimal: 1 }
      }
    }
  }
}
```

#### Character + AI Strategy Affinity

Track which characters excel with which AI strategies:

```javascript
{
  characterAIAffinity: {
    "Frieza": {
      totalMatches: 45,
      
      aiStrategies: [
        {
          id: "00_7_0007",
          name: "Attack Strategy: Ultimate Blasts",
          usage: 18,
          winRate: 77.8,
          avgDamage: 195000,
          avgPerformanceScore: 198.5,
          topBuilds: [...]
        },
        {
          id: "00_7_0009",
          name: "Balanced Strategy: Blasts",
          usage: 12,
          winRate: 66.7,
          avgDamage: 178000,
          avgPerformanceScore: 182.3,
          topBuilds: [...]
        }
      ],
      
      recommendedStrategy: {
        id: "00_7_0007",
        name: "Attack Strategy: Ultimate Blasts",
        confidence: "high", // based on usage + winRate
        reason: "77.8% win rate across 18 matches"
      }
    }
  }
}
```

---

## Part 3: Combat Action Tracking

### Problem Statement
Battle result JSONs contain detailed combat action data that directly correlates to capsule effectiveness, but this data is currently unused.

### Solution: Map Capsules to Tracked Actions

#### Action Tracking Examples

**Example 1: Vanishing Attack Capsules**
- **Capsule**: Dragon Assault (`00_0_0122`) - "Reduces ki cost for Vanishing Assaults by 15%"
- **Capsule**: Vanishing Break (add when found) - "Adds +1 Vanishing Attack limit"
- **Tracked Data**: `battleNumCount.vanishingAttackCount` (from JSON)
- **Metrics**:
  - Avg vanishing attacks WITH capsule vs WITHOUT
  - Damage per vanishing attack
  - Win rate correlation with vanishing attack frequency

**Example 2: Blast Damage Capsules**
- **Capsule**: Blast Attack Boost 3 (`00_0_0030`)
- **Tracked Data**: 
  - `useBlastGroupCount` - Which blasts were used
  - `blastHitDemoInfo` - Blast hit confirmations
  - `s2Blast`, `s2HitBlast` - Super blast usage and hits
- **Metrics**:
  - Blast usage frequency WITH vs WITHOUT capsule
  - Blast hit rate (hits / attempts)
  - Avg damage contribution from blasts

**Example 3: Counter Capsules**
- **Capsule**: The Secret to Counters (`00_0_0037`)
- **Tracked Data**: 
  - `battleNumCount.revengeCounter` - Counter attempts
  - `battleNumCount.superCounterCount` - Z-Counter usage
- **Metrics**:
  - Counter usage frequency
  - Success rate
  - Damage contribution from counters

#### Action Mapping Structure

Add to capsule metadata:

```json
{
  "00_0_0122": {
    "id": "00_0_0122",
    "name": "Dragon Assault",
    "trackedActions": {
      "primary": ["vanishingAttackCount"],
      "secondary": ["actVASN"]
    },
    "expectedBehaviorChange": {
      "metric": "vanishingAttackCount",
      "expectedIncrease": "Higher usage due to reduced ki cost",
      "comparisonType": "average"
    }
  },
  "00_0_0030": {
    "id": "00_0_0030", 
    "name": "Blast Attack Boost 3",
    "trackedActions": {
      "primary": ["useBlastGroupCount", "s2Blast", "ultBlast"],
      "secondary": ["blastHitDemoInfo", "s2HitBlast", "uLTHitBlast"]
    },
    "expectedBehaviorChange": {
      "metric": "blastUsageRate",
      "expectedIncrease": "Higher blast usage, more damage per blast",
      "comparisonType": "average"
    }
  }
}
```

#### Analysis Enhancement

**Enhanced Capsule Performance**:
```javascript
{
  "00_0_0030": { // Blast Attack Boost 3
    overall: {
      usage: 124,
      winRate: 65.3,
      avgDamage: 168000
    },
    actionMetrics: {
      avgBlastsPerMatch: 4.8,
      avgBlastHitRate: 72.5, // % of blasts that hit
      avgBlastDamageContribution: 58000, // damage from blasts
      comparisonToBaseline: {
        blastsPerMatch: +1.2, // +1.2 more blasts than builds without this capsule
        blastDamageContribution: +18000 // +18k more blast damage
      }
    }
  }
}
```

---

## Part 4: Three Core Features

### Feature 1: Individual Capsule Performance (Keep & Polish)

**Current State**: Mostly complete, needs refinement

**Changes**:
1. Replace "Archetype" column with "Build Type" (using new league build type system)
2. Add "Effect Tags" column (comma-separated tags)
3. Add "Top AI Strategies" column (top 3 AI strategies by win rate)
4. Add "Action Impact" column (if tracked actions available)
5. Improve filtering: by build type, by effect tag, by AI strategy
6. Add "Characters" filter to show capsule performance for specific character

**UI Enhancements**:
```
┌─────────────────────────────────────────────────────────────────┐
│ Individual Capsule Performance                                 │
├─────────────────────────────────────────────────────────────────┤
│ Filters:                                                        │
│ [Build Type ▾] [Effect Tag ▾] [AI Strategy ▾] [Character ▾]    │
│                                                   [Search: ___] │
├─────────────────────────────────────────────────────────────────┤
│ Name                 │Cost│Type    │Tags        │W/R  │Usage│Top AI│
├──────────────────────┼────┼────────┼────────────┼─────┼─────┼──────┤
│ Blast Attack Boost 3 │ 5  │Blasts  │blast-dmg   │72.3%│ 124 │Ult+3 │
│ Divine Blow          │ 3  │Blasts  │ult-dmg     │71.5%│  98 │Ult+3 │
│ Fury!                │ 4  │Blasts  │blast,cond  │69.8%│  87 │Blst+2│
│ ...                                                             │
└─────────────────────────────────────────────────────────────────┘

Click row to expand:
┌─────────────────────────────────────────────────────────────────┐
│ Blast Attack Boost 3 - Detailed Performance                    │
├─────────────────────────────────────────────────────────────────┤
│ Overall: 72.3% WR | 124 uses | 168k avg damage                 │
│ Build Type: Blast Build                                        │
│                                                                 │
│ Top AI Strategies:                                              │
│  1. Attack Strategy: Ultimate Blasts - 77.8% WR (45 uses)       │
│  2. Balanced Strategy: Blasts - 69.2% WR (38 uses)              │
│  3. Attack Strategy: Barrage - 66.1% WR (22 uses)               │
│                                                                 │
│ Top Characters:                                                 │
│  1. Frieza - 80.5% WR (18 uses)                                 │
│  2. Cell - 75.2% WR (15 uses)                                   │
│  3. Golden Frieza - 71.8% WR (12 uses)                          │
│                                                                 │
│ Action Impact:                                                  │
│  Avg blasts per match: 4.8 (+1.2 vs baseline)                  │
│  Blast hit rate: 72.5%                                          │
│  Blast damage contribution: 58k (+18k vs baseline)              │
│                                                                 │
│ Most Paired With:                                               │
│  - Divine Blow (67 times, 74.2% WR together)                    │
│  - Indomitable Fighting Spirit (52 times, 71.8% WR)             │
│  - Fury! (48 times, 76.5% WR)                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

### Feature 2: Popular Build Combinations (Replace Synergy Pairs)

**Goal**: Show complete, real builds that performed well (not abstract pair synergies)

**Data Structure**:
```javascript
{
  popularBuilds: [
    {
      id: "build_1",
      capsules: [
        { id: "00_0_0030", name: "Blast Attack Boost 3", cost: 5 },
        { id: "00_0_0070", name: "Divine Blow", cost: 3 },
        { id: "00_0_0038", name: "Fury!", cost: 4 },
        { id: "00_0_0040", name: "Indomitable Fighting Spirit", cost: 3 },
        { id: "00_0_0131", name: "God Ki", cost: 5 }
      ],
      totalCost: 20,
      totalSlots: 5,
      usage: 12, // times this exact build was used
      winRate: 75.0,
      avgDamage: 172000,
      avgPerformanceScore: 185.2,
      
      buildTypeComposition: {
        blast: 3,
        'ki-efficiency': 2
      },
      primaryBuildType: "blasts",
      buildLabel: "Blast-Focused (Ki Sustain)",
      
      topAIStrategies: [
        { id: "00_7_0007", name: "Attack Strategy: Ultimate Blasts", usage: 8, winRate: 87.5 }
      ],
      topCharacters: [
        { name: "Frieza", usage: 5, winRate: 80.0 }
      ],
      
      notes: "High-cost blast spam build. Excellent ki sustainability."
    }
  ]
}
```

**UI Design**:
```
┌─────────────────────────────────────────────────────────────────┐
│ Popular Build Combinations                                     │
├─────────────────────────────────────────────────────────────────┤
│ Filters:                                                        │
│ [Min WR: 60%] [Min Usage: 5] [Cost: Any ▾] [Build Type: Any ▾] │
│ [AI Strategy: Any ▾] [Character: Any ▾]                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ Build #1: Blast-Focused (Ki Sustain)                       ││
│ │ 75.0% WR | 12 uses | 20/20 cost | 5/7 slots                ││
│ ├─────────────────────────────────────────────────────────────┤│
│ │ Capsules:                                                   ││
│ │ • Blast Attack Boost 3 (5) [Blasts]                         ││
│ │ • Divine Blow (3) [Blasts]                                  ││
│ │ • Fury! (4) [Blasts]                                        ││
│ │ • Indomitable Fighting Spirit (3) [Ki Efficiency]           ││
│ │ • God Ki (5) [Ki Efficiency]                                ││
│ │                                                             ││
│ │ Best with:                                                  ││
│ │ AI: Attack Strategy: Ultimate Blasts (87.5% WR, 8 uses)     ││
│ │ Characters: Frieza (80%), Cell (75%), Golden Frieza (71%)   ││
│ │                                                             ││
│ │ [Copy Build] [Export] [View Matches]                        ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ Build #2: Melee Pressure (Defense Support)                 ││
│ │ 71.2% WR | 18 uses | 19/20 cost | 6/7 slots                ││
│ └─────────────────────────────────────────────────────────────┘│
│ ...                                                             │
└─────────────────────────────────────────────────────────────────┘
```

**Algorithm**:
1. Hash each character's build (sorted capsule IDs)
2. Count exact matches across all battle results
3. Calculate win rate, avg damage, performance score per build
4. Filter builds with minimum usage threshold (5+ uses)
5. Track which AI strategies and characters used each build
6. Sort by win rate or usage

---

### Feature 3: Build Validator + Explorer (Simplify Build Analyzer)

**Goal**: Practical tool for validating builds and exploring similar real builds

**Remove**:
- ❌ Synergy score calculation
- ❌ Performance prediction
- ❌ AI strategy auto-selector
- ❌ Template-based recommendations

**Keep & Add**:
- ✅ Capsule selection (drag-drop or checkboxes)
- ✅ Cost/slot validation
- ✅ Export build
- ✅ **NEW**: "Show similar builds" - finds real builds from data with ≥3 matching capsules
- ✅ **NEW**: AI strategy suggestion based on selected capsules
- ✅ **NEW**: Character suggestions based on data

**UI Design**:
```
┌─────────────────────────────────────────────────────────────────┐
│ Build Validator & Explorer                                     │
├─────────────────────────────────────────────────────────────────┤
│ Your Build:                                      [Clear Build]  │
│                                                                 │
│ Selected Capsules (3):                     Cost: 12/20  Slots: 3/7│
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ • Blast Attack Boost 3 (5 cost) [Blasts]          [Remove] ││
│ │ • Divine Blow (3 cost) [Blasts]                   [Remove] ││
│ │ • Fury! (4 cost) [Blasts]                         [Remove] ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ Available Capsules:                           [Search: _____]  │
│ [Build Type: All ▾] [Effect Tag: All ▾] [Cost: All ▾]          │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ Name                      Cost  Type       Tags       [Add] ││
│ │ Indomitable Fighting Spir  3    Ki Eff     ki-gen     [+]  ││
│ │ God Ki                     5    Ki Eff     ki-cost    [+]  ││
│ │ Perfect Guard              5    Defense    guard      [+]  ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ Build Status: ✓ Valid (8 cost remaining, 4 slots remaining)    │
│ Current Build Type: Blast Build (3/3 capsules)                │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ AI Strategy Recommendations (based on capsules):            ││
│ │ 1. Attack Strategy: Ultimate Blasts (72.8% avg WR)          ││
│ │ 2. Balanced Strategy: Blasts (69.2% avg WR)                 ││
│ │ 3. Attack Strategy: Barrage (66.1% avg WR)                  ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ Similar Builds Used in Matches (3+ matching capsules):      ││
│ │                                                             ││
│ │ Build Match: 5/5 capsules                                   ││
│ │ + Indomitable Fighting Spirit (3) [Ki Efficiency]           ││
│ │ + God Ki (5) [Ki Efficiency]                                ││
│ │ WR: 75.0% | 12 uses | Best with Frieza (Attack Ult Blasts)  ││
│ │ [View Full Build]                                           ││
│ │                                                             ││
│ │ Build Match: 3/6 capsules                                   ││
│ │ + Perfect Guard (5) [Defense]                               ││
│ │ + Light Body (4) [Defense]                                  ││
│ │ + Speed Up (1) [Utility]                                    ││
│ │ WR: 68.5% | 8 uses | Best with Cell (Balanced Blasts)       ││
│ │ [View Full Build]                                           ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ [Export Build] [Copy to Clipboard] [Save]                      │
└─────────────────────────────────────────────────────────────────┘
```

**Key Features**:
1. **Real-time validation** - Cost/slot checks as you add capsules
2. **Smart suggestions** - Based on what YOU selected, what do real builds use?
3. **AI strategy recommendation** - Based on selected capsule categories/tags
4. **Character suggestions** - Which characters performed well with similar builds?

---

## Implementation Roadmap

### Phase 1: Foundation (Data & Metadata)

**1.1 Create Capsule Metadata System**
- [ ] Create automated classifier script (`generateCapsuleMetadata.js`)
- [ ] Run classifier on `capsules.csv` → generate initial `capsuleMetadata.json`
- [ ] Create review UI or export to spreadsheet for human curation
- [ ] Manually review and correct all capsule classifications
- [ ] Add effect tags to all capsules
- [ ] Add tracked actions mapping (where applicable)
- [ ] Store final metadata in `src/config/capsuleMetadata.json`

**1.2 Update Data Processors**
- [ ] Modify `capsuleDataProcessor.js` to load from metadata file (not pattern matching)
- [ ] Add AI strategy data loading
- [ ] Add action tracking data extraction from battle results
- [ ] Create `aiStrategyProcessor.js` for AI-specific analysis

**1.3 Data Analysis Functions**
- [ ] Create `calculateCapsulePerformanceByAI.js`
- [ ] Create `calculateAIStrategyCompatibility.js`
- [ ] Create `calculateActionMetrics.js` (for tracked actions)
- [ ] Create `findPopularBuilds.js` (build hashing and aggregation)
- [ ] Create `findSimilarBuilds.js` (for Build Explorer)

**Estimated Time**: 2-3 days

---

### Phase 2: Feature Implementation

**2.1 Individual Capsule Performance (Polish)**
- [ ] Update component to use new build type system
- [ ] Add effect tags column
- [ ] Add "Top AI Strategies" column
- [ ] Add expandable row details (AI breakdown, character breakdown, action metrics)
- [ ] Add filtering by build type, effect tag, AI strategy, character
- [ ] Improve sorting and search

**Estimated Time**: 1 day

**2.2 Popular Build Combinations (New)**
- [ ] Create `PopularBuildCombinations.jsx` component
- [ ] Implement build card display
- [ ] Add filtering (min WR, min usage, cost, build type, AI, character)
- [ ] Add "Copy Build" and "Export" functionality
- [ ] Add "View Matches" to show individual match results

**Estimated Time**: 1-2 days

**2.3 Build Validator + Explorer (Redesign)**
- [ ] Simplify existing `BuildAnalyzerTool.jsx`
- [ ] Remove synergy calculation, performance prediction
- [ ] Keep capsule selection UI
- [ ] Add cost/slot validation with visual feedback
- [ ] Add "Similar Builds" section using `findSimilarBuilds()`
- [ ] Add AI strategy recommendation based on selected capsules
- [ ] Add character suggestions
- [ ] Add export functionality

**Estimated Time**: 1-2 days

---

### Phase 3: Testing & Refinement

**3.1 Data Quality Validation**
- [ ] Verify capsule metadata accuracy (spot check classifications)
- [ ] Test AI strategy data aggregation
- [ ] Test action tracking metrics (ensure data exists and is meaningful)
- [ ] Test build hashing and matching

**3.2 UI/UX Testing**
- [ ] Test performance with large datasets
- [ ] Test filtering and sorting across all features
- [ ] Test responsiveness and mobile layout
- [ ] Test export/copy functionality

**3.3 Documentation**
- [ ] Update user guide for new features
- [ ] Document metadata update process for new seasons
- [ ] Document data structures for future developers

**Estimated Time**: 1 day

---

### Total Estimated Timeline: 5-8 days

---

## Data Structures Reference

### Capsule Metadata File
**Location**: `src/config/capsuleMetadata.json`

See Part 1 for full structure.

### Capsule Performance Data
```javascript
{
  capsulePerformance: {
    [capsuleId]: {
      overall: { usage, winRate, avgDamage, avgPerformanceScore },
      byAIStrategy: { [aiId]: { strategyName, usage, winRate, avgDamage, topCharacters } },
      byCharacter: { [characterName]: { usage, winRate, avgDamage } },
      actionMetrics: { avgActionCount, comparisonToBaseline },
      topAIStrategies: [...],
      topCharacters: [...],
      mostPairedWith: [...]
    }
  }
}
```

### AI Strategy Analysis
```javascript
{
  aiStrategyAnalysis: {
    [aiId]: {
      name, usage, winRate,
      categoryPerformance: { [category]: { usage, winRate, topCapsules } },
      topEffectTags: [...],
      recommendedComposition: { [category]: { min, max, optimal } }
    }
  }
}
```

### Popular Builds
```javascript
{
  popularBuilds: [
    {
      id, capsules, totalCost, totalSlots,
      usage, winRate, avgDamage, avgPerformanceScore,
      categoryComposition, buildType,
      topAIStrategies, topCharacters
    }
  ]
}
```

---

## Future Enhancements (Post-MVP)

### Phase 4: Advanced Features (Optional)
- **Action Impact Visualizations**: Charts showing action frequency with/without capsules
- **Build Comparison Tool**: Side-by-side comparison of 2-3 builds
- **AI Strategy Deep Dive**: Dedicated view for each AI strategy with full analysis
- **Character Build Recommendations**: "Best builds for Frieza" page
- **Seasonal Trends**: Track how popular builds change over time
- **Export to League Dashboard**: Share build data with team managers

### Phase 5: Machine Learning (Long-term)
- **Build Performance Prediction**: ML model to predict build effectiveness
- **Optimal Build Generator**: AI-generated builds based on constraints (character, AI, cost)
- **Anomaly Detection**: Flag unusual performances (outliers worth investigating)

---

## Success Criteria

### Functionality
- ✅ All capsules correctly categorized by build type (>95% accuracy)
- ✅ AI strategy data integrated across all features
- ✅ Build validator correctly enforces cost/slot limits
- ✅ Similar builds algorithm finds relevant matches
- ✅ Popular builds reflect real usage patterns (min 5 uses filter)

### Performance
- ✅ Page load time <2s
- ✅ Filter/sort response <300ms
- ✅ Handles 100+ capsules, 50+ AI strategies, 1000+ builds

### Usability
- ✅ Team managers can quickly find high-performing capsules
- ✅ Team managers can discover effective build combinations
- ✅ Team managers can validate builds before matches
- ✅ Data is clear, accurate, and actionable
- ✅ Build types align with league's existing terminology

---

## Migration from Current Implementation

### Files to Modify
- `src/utils/capsuleEffectParser.js` → Use metadata instead of pattern matching
- `src/utils/capsuleDataProcessor.js` → Load from metadata file
- `src/utils/capsuleSynergyCalculator.js` → Remove or repurpose for Popular Builds
- `src/components/CapsuleSynergyAnalysis.jsx` → Rename/restructure
- `src/components/capsule-synergy/IndividualCapsulePerformance.jsx` → Update columns
- `src/components/capsule-synergy/SynergyPairsAnalysis.jsx` → **REMOVE**, replace with `PopularBuildCombinations.jsx`
- `src/components/capsule-synergy/BuildAnalyzerTool.jsx` → Simplify to Build Validator

### Files to Create
- `src/config/capsuleMetadata.json` → Manual metadata
- `src/utils/aiStrategyProcessor.js` → AI analysis
- `src/utils/actionMetricsCalculator.js` → Combat action tracking
- `src/utils/popularBuildsCalculator.js` → Build aggregation
- `src/utils/similarBuildsCalculator.js` → Build matching
- `src/components/meta-analysis/PopularBuildCombinations.jsx` → New feature
- `scripts/generateCapsuleMetadata.js` → One-time metadata generator

### Files to Remove
- `src/components/capsule-synergy/SynergyPairsAnalysis.jsx`
- Any synergy heatmap components

---

## Questions & Decisions Log

### November 6, 2025 - Planning Session

**Q1**: How should capsule categories be assigned?  
**A**: Hybrid approach - automated classifier generates initial metadata, human reviews and corrects, stored in version-controlled JSON file.

**Q2**: How to handle AI strategies in analysis?  
**A**: Make AI strategy a first-class dimension. Track capsule performance BY AI strategy, show AI compatibility in all features.

**Q3**: How to use combat action tracking data?  
**A**: Map capsules to relevant actions (e.g., Vanishing capsules → vanishingAttackCount), calculate metrics (avg usage, damage contribution), show comparisons to baseline.

**Q4**: What to do with overly complex features?  
**A**: Simplify to 3 core features - Individual Performance (polish), Popular Builds (replace Synergy Pairs), Build Validator (simplify Build Analyzer).

---

## Appendix: Combat Actions Reference

### Available Actions in Battle Results JSON

From `battleNumCount`:
- `chargeCount` - Charge-up attacks
- `guardCount` - Guard/blocking
- `revengeCounter` - Revenge counter usage
- `sPMCount` - Sparking mode activations
- `reflectEnergyBulletCount` - Ki blast reflects
- `shotEnergyBulletCount` - Ki blasts fired
- `speedImpactCount` - Speed impact clashes
- `superCounterCount` - Z-Counter usage
- `sparkingCount` - Sparking mode count
- `vanishingAttackCount` - Vanishing attacks performed

From `additionalCounts`:
- `s1Blast`, `s2Blast`, `ultBlast` - Blast tier usage
- `s1HitBlast`, `s2HitBlast`, `uLTHitBlast` - Blast hits
- `tags` - Tag/switch count

From `attackHitCount`:
- Various action IDs (e.g., `actRSHA1`, `actVASN`, `actDDS`)

### Example Capsule-to-Action Mappings

| Capsule | Primary Actions | Secondary Actions |
|---------|----------------|-------------------|
| Dragon Assault | vanishingAttackCount | actVASN |
| The Secret to Counters | superCounterCount, revengeCounter | - |
| Blast Attack Boost 3 | useBlastGroupCount, s2Blast | blastHitDemoInfo, s2HitBlast |
| Z-Burst Dash Master | dragonDashMileage | actDDS |
| Perfect Guard | guardCount | takenDamage (should be 0 while guarding) |
| Sparking Cheer | sparkingCount, sPMCount | - |

---

## End of Implementation Plan

**Status**: ✅ **APPROVED** - November 6, 2025

**Key Decisions Summary**:
1. ✅ **Build Type System**: Using league's existing meta (Melee, Blasts, Ki Blast, Defense, Skill, Ki Efficiency, Utility)
2. ✅ **Hybrid Categorization**: Automated classifier generates initial metadata → Human reviews → Store in `capsuleMetadata.json`
3. ✅ **AI Strategy Integration**: First-class dimension across all features, no assumptions
4. ✅ **Combat Action Tracking**: Map capsules to tracked actions for effectiveness measurement
5. ✅ **Simplified Features**: 3 focused tools (Individual Performance, Popular Builds, Build Validator)

**Major Changes from Original Plan**:
- ❌ Removed 5 generic categories (Offensive, Defensive, Resource, Mobility, Utility)
- ✅ Adopted 7 league-specific build types (better alignment with team manager thinking)
- ✅ Emphasizes manual curation over automated pattern matching
- ✅ Integrates AI strategies more deeply (performance tracked BY AI strategy)
- ✅ Leverages combat action data from battle results

**Next Steps**: 
1. Begin Phase 1.1 - Create capsule metadata system
2. Generate initial metadata with automated classifier
3. Human review of all ~200 capsule classifications
4. Proceed with feature implementation

**Questions/Feedback**: None pending - ready for implementation


