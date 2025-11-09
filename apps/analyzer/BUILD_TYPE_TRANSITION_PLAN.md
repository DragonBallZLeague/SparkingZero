# Build Type System Transition Plan

**Date**: November 7, 2025  
**Status**: Planning Phase  
**Goal**: Replace old 3-category archetype system (Aggressive/Defensive/Technical) with new 7-category build type system (Melee/Blast/Ki Blast/Defense/Skill/Ki Efficiency/Utility)

---

## Current State Analysis

### Old System (Aggressive/Defensive/Technical)
- **Location**: `App.jsx` - `getBuildArchetype()` function (line 617)
- **Logic**: Pattern matching on capsule names/effects
  - **Aggressive**: Capsules with "attack boost", "damage", "blast", "power"
  - **Defensive**: Capsules with "body", "guard", "defense", "training", "health"
  - **Technical**: Capsules with "ki", "speed", "movement", "dash", "sparking"
  - **Hybrid**: When no clear majority
- **Usage**: Character build displays, team analysis, build archetype tracking

### New System (7 Build Types)
- **Location**: `capsuleMetadata.json` + `capsuleDataProcessor.js`
- **Categories**:
  1. **Melee**: Rush attacks, melee damage, melee-specific mechanics
  2. **Blast**: Blast attacks, blast damage (not ki blasts)
  3. **Ki Blast**: Ki blast attacks and ki blast damage
  4. **Defense**: Health, guard, damage reduction, flinch resistance
  5. **Skill**: Skill count, skill damage, action-specific boosts
  6. **Ki Efficiency**: Ki cost reduction, ki recovery, auto-ki
  7. **Utility**: Movement, sparking gauge, transformation, status effects
- **Current Usage**: Meta Analysis - Individual Capsule Performance only

---

## Areas Using Old System

### 1. **Character Stats Extraction** (`App.jsx`)
**Function**: `extractStats()` - Lines 372-615
- **Line 416-447**: `capsuleTypes` categorization (damage/defensive/utility)
- **Line 548**: `buildArchetype: getBuildArchetype(capsuleTypes, totalCapsuleCost)`
- **Impact**: Every character's stats include old archetype
- **Data Flow**: Used in character cards, aggregated data, team analysis

### 2. **Build Archetype Function** (`App.jsx`)
**Function**: `getBuildArchetype()` - Lines 617-632
- **Current Logic**:
  ```javascript
  if (damage >= defensive && damage >= utility) return 'Aggressive';
  else if (defensive >= damage && defensive >= utility) return 'Defensive';
  else if (utility >= damage && utility >= defensive) return 'Technical';
  else return 'Hybrid';
  ```
- **Issue**: Relies on 3-category counts, needs complete rewrite

### 3. **Build Display Component** (`App.jsx`)
**Component**: `BuildDisplay` - Lines 634-730
- **Line 647-652**: `getBuildColor()` function - color coding by old archetype
- **Line 657-661**: Archetype badge display
- **Impact**: Visual representation of build archetype in UI

### 4. **Aggregated Data Tracking** (`App.jsx`)
**Function**: `getAggregatedCharacterData()` - Line 1075
- **Line 1075**: `buildArchetypes: {}` - Tracks archetype usage counts
- **Line 1170**: Build archetype usage aggregation
- **Impact**: Meta-level statistics

### 5. **Team Performance Matrix** (`teamPerformanceMatrix.js`)
**File**: `src/utils/teamPerformanceMatrix.js`
- **Line 322**: `buildArchetype: getMostCommon(top5Characters, 'buildArchetype')`
- **Line 324**: `top5TotalDefenseCapsules: sumTop5(top5Characters, 'avgDefensiveCaps')`
- **Impact**: Team composition analysis

### 6. **Capsule Synergy Calculator** (`capsuleSynergyCalculator.js`)
**File**: `src/utils/capsuleSynergyCalculator.js`
- **Line 40**: `primaryArchetype: capsuleData.primaryArchetype || 'utility'`
- **Lines 154-155**: Synergy pairs use `cap1.archetype`, `cap2.archetype`
- **Impact**: Currently using new system fallback (`.archetype` maps to `buildType`)

### 7. **Backward Compatibility Layer** (`capsuleDataProcessor.js`)
**File**: `src/utils/capsuleDataProcessor.js`
- **Line 119-120**: `archetype: metadata.buildType` - Aliasing new to old
- **Line 238-239**: `archetypeCounts: buildTypeCounts` - Aliasing counts
- **Purpose**: Allows new system to work with old code expecting `archetype` field

---

## Transition Strategy

### Phase 1: Foundation (Prerequisite - Already Complete ✅)
- [x] Create `capsuleMetadata.json` with build types for all 94 capsules
- [x] Create `capsuleDataProcessor.js` to load and enrich capsule data
- [x] Add backward compatibility layer (`archetype` alias)
- [x] Implement in Meta Analysis tab

### Phase 2: Data Layer Migration
**Goal**: Switch character stat extraction to use new build type system

#### 2.1 Update Capsule Type Categorization (`App.jsx`)
**Current** (Lines 416-447):
```javascript
const capsuleTypes = {
  damage: equippedCapsules.filter(/* name/effect pattern matching */),
  defensive: equippedCapsules.filter(/* name/effect pattern matching */),
  utility: equippedCapsules.filter(/* name/effect pattern matching */)
};
```

**New Approach**:
```javascript
const capsuleTypes = {
  melee: equippedCapsules.filter(c => c.capsule.buildType === 'melee').length,
  blast: equippedCapsules.filter(c => c.capsule.buildType === 'blast').length,
  kiBlast: equippedCapsules.filter(c => c.capsule.buildType === 'ki blast').length,
  defense: equippedCapsules.filter(c => c.capsule.buildType === 'defense').length,
  skill: equippedCapsules.filter(c => c.capsule.buildType === 'skill').length,
  kiEfficiency: equippedCapsules.filter(c => c.capsule.buildType === 'ki efficiency').length,
  utility: equippedCapsules.filter(c => c.capsule.buildType === 'utility').length
};
```

**Challenge**: Need to ensure `capsuleMap` with metadata is available in `extractStats()`
- Currently `extractStats()` receives `capsuleMap` parameter
- Need to verify it contains enriched data (with `buildType` field)

#### 2.2 Replace `getBuildArchetype()` Function
**Current**: Returns Aggressive/Defensive/Technical/Hybrid based on 3 categories

**Option A - Direct Replacement**:
Replace with build type-aware function that returns most common type or combination:
```javascript
function getBuildArchetype(capsuleTypes) {
  const { melee, blast, kiBlast, defense, skill, kiEfficiency, utility } = capsuleTypes;
  const total = melee + blast + kiBlast + defense + skill + kiEfficiency + utility;
  
  if (total === 0) return 'No Build';
  
  // Find primary and secondary types
  const types = [
    { name: 'Melee', count: melee },
    { name: 'Blast', count: blast },
    { name: 'Ki Blast', count: kiBlast },
    { name: 'Defense', count: defense },
    { name: 'Skill', count: skill },
    { name: 'Ki Efficiency', count: kiEfficiency },
    { name: 'Utility', count: utility }
  ];
  
  types.sort((a, b) => b.count - a.count);
  
  const primary = types[0];
  const secondary = types[1];
  
  // If primary is dominant (40%+), return single type
  if (primary.count / total >= 0.4) {
    return primary.name;
  }
  
  // If top 2 types are close, return hybrid
  if (secondary.count / total >= 0.3) {
    return `${primary.name}/${secondary.name}`;
  }
  
  return 'Hybrid';
}
```

**Option B - Dual System** (Recommended for safety):
Keep old function, add new one, phase out gradually:
```javascript
function getBuildArchetypeLegacy(capsuleTypes) { /* existing code */ }
function getBuildComposition(capsuleTypes) { /* new 7-type logic */ }
```

#### 2.3 Update `capsuleMap` Loading in App.jsx
**Current** (Line 2639):
```javascript
const { capsules: capsuleMap, aiStrategies } = useMemo(() => parseCapsules(capsulesCSV), []);
```

**Issue**: `parseCapsules()` is old function that doesn't add metadata

**Fix**: Replace with `loadCapsuleData()`:
```javascript
const capsuleInfo = useMemo(() => loadCapsuleData(capsulesCSV), []);
const capsuleMap = capsuleInfo.capsuleMap;
const aiStrategies = capsuleInfo.aiStrategies;
```

**Impact**: All `extractStats()` calls will now receive enriched capsule data

### Phase 3: UI Layer Migration
**Goal**: Update all UI components to display new build types

#### 3.1 Update `BuildDisplay` Component
- Rewrite `getBuildColor()` for 7 types + hybrids
- Update archetype badge display to handle combinations
- Add visual indicators for hybrid builds

#### 3.2 Update Character Cards
- Replace archetype badge
- Add build composition breakdown (if showing detailed stats)

#### 3.3 Update Team Performance Matrix
- Replace `buildArchetype` with new composition system
- Update defensive caps tracking to use `defense` type specifically

### Phase 4: Analytics Migration
**Goal**: Update aggregation and tracking systems

#### 4.1 Update `getAggregatedCharacterData()`
- Replace `buildArchetypes: {}` tracking
- Add `buildCompositions: {}` or similar

#### 4.2 Update Team Analysis
- Modify team performance matrix calculations
- Update top 5 character composition analysis

### Phase 5: Cleanup
**Goal**: Remove old system completely

#### 5.1 Remove Backward Compatibility
- Remove `archetype` alias from `capsuleDataProcessor.js`
- Remove `archetypeCounts` alias

#### 5.2 Delete Old Functions
- Remove `getBuildArchetype()` (if using Option A)
- Remove old pattern matching code

#### 5.3 Update Variable Names
- Rename `buildArchetype` → `buildComposition` throughout codebase
- Update all references

---

## Implementation Order (Recommended)

### Sprint 1: Data Foundation
1. ✅ Already complete - metadata system exists
2. Update `capsuleMap` loading in `App.jsx` to use `loadCapsuleData()`
3. Verify enriched data flows through `extractStats()`
4. Add console logging to verify `buildType` field is present

### Sprint 2: Build Categorization
1. Update `capsuleTypes` extraction in `extractStats()` to use 7 categories
2. Create new `getBuildComposition()` function
3. Update `extractStats()` to use new function (keep old data for comparison)
4. Test with sample data, verify results make sense

### Sprint 3: UI Updates
1. Update `getBuildColor()` for new types
2. Update `BuildDisplay` component
3. Update character cards and displays
4. Visual testing and refinement

### Sprint 4: Analytics
1. Update aggregated data tracking
2. Update team performance matrix
3. Verify all meta-level stats still work

### Sprint 5: Polish & Cleanup
1. Remove backward compatibility layer
2. Delete old functions
3. Rename variables for consistency
4. Full regression testing

---

## Testing Checklist

### Data Integrity
- [ ] All 94 capsules have valid `buildType` in metadata
- [ ] `capsuleMap` contains enriched data with `buildType` field
- [ ] Character stats correctly categorize equipped capsules

### Functional Testing
- [ ] Character cards display correct build composition
- [ ] Build colors render correctly for all 7 types
- [ ] Hybrid builds display properly
- [ ] Team analysis calculates correct compositions
- [ ] Meta Analysis Individual Performance still works

### Edge Cases
- [ ] Characters with no capsules show "No Build"
- [ ] Characters with only 1 capsule type
- [ ] Characters with perfectly balanced builds (Hybrid)
- [ ] Characters with unknown/unclassified capsules

### Backward Compatibility (During Migration)
- [ ] Old data files still load correctly
- [ ] Existing saved analyses still work
- [ ] No errors on missing `buildType` field (graceful fallback)

---

## Risks & Mitigation

### Risk 1: Breaking Existing Features
**Mitigation**: 
- Keep backward compatibility layer during migration
- Dual-track approach (old + new side by side)
- Extensive testing before removing old code

### Risk 2: UI Becomes Too Complex
**Concern**: 7 types + hybrids = potentially confusing displays
**Mitigation**:
- Use clear color coding
- Show primary type prominently
- Add tooltips/legends for build composition breakdown
- Consider simplified view vs. detailed view

### Risk 3: Performance Impact
**Concern**: More granular categorization = more processing
**Mitigation**:
- Metadata lookup is fast (simple object access)
- No pattern matching overhead (compared to old system)
- Should actually be faster than old regex-based approach

### Risk 4: Incomplete Metadata
**Concern**: Some capsules might have wrong `buildType`
**Mitigation**:
- Already generated for all 94 capsules
- Manual review process available
- Easy to update JSON file if issues found

---

## Next Steps

1. **Review this plan** - Confirm approach and priorities
2. **Choose implementation option** - Option A (direct replace) vs Option B (dual system)
3. **Start Sprint 1** - Update capsuleMap loading
4. **Create test data** - Sample characters with known capsule loadouts for validation

---

## Questions for Discussion

1. **Hybrid Naming**: How should we display hybrid builds?
   - Option A: "Melee/Defense" (top 2 types)
   - Option B: "Hybrid (Melee-focused)" (primary + label)
   - Option C: Just show percentages/counts, no label

2. **Granularity**: Should we track all 7 types separately everywhere, or group some?
   - Could combine Blast + Ki Blast into "Ranged"
   - Could combine Skill + Utility into "Technical"
   - Would reduce complexity but lose precision

3. **Migration Timeline**: All at once or gradual rollout?
   - Gradual: Safer, allows testing, more work
   - All at once: Cleaner, less code duplication, riskier

4. **Old Data**: What to do with historical analyses using old system?
   - Ignore - accept they'll break
   - Convert - attempt to map old to new
   - Archive - keep old system in read-only mode for legacy data
