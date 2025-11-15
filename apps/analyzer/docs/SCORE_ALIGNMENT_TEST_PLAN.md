# Score Alignment Testing Plan

## Issue
Character-level performance scores and build-level performance scores are showing slight differences even when a character uses only one build across all matches.

## Expected Behavior
When a character has only used one build configuration across all active matches, the character's overall performance score should **exactly match** the build's performance score.

## Testing Approach

### 1. **Console Logging (Implemented)**

Added comprehensive debug logging to trace exact values through both calculation paths:

#### Build-Level Logging
- Triggers for characters with ≤30 active matches where activeCount === count
- Logs:
  - Total stats (damage dealt/taken, battle duration, health)
  - Calculated averages
  - Derived stats (efficiency, DPS, health retention)
  - Score formula components breakdown
  - Final score

#### Character-Level Logging  
- Triggers for specific characters (e.g., Baby Vegeta GT with 25 matches)
- Logs same metrics as build-level for direct comparison

#### Cross-Check Logging
- Identifies all single-build characters
- Compares character score vs build score
- Reports any differences > 0.01
- Shows totals and averages from both calculations

### 2. **Key Metrics to Compare**

For each discrepancy found, verify:

| Metric | Character Path | Build Path | Should Match? |
|--------|---------------|------------|---------------|
| **Totals** |
| Total Damage | `char.totalDamage` | `build.totalDamageDealt` | ✅ YES |
| Total Taken | `char.totalTaken` | `build.totalDamageTaken` | ✅ YES |
| Total Battle Time | `char.totalBattleTime` | `build.totalBattleDuration` | ✅ YES |
| Total Health | `char.totalHealth` | `build.totalHealthRemaining` | ✅ YES |
| Total Max HP | `char.totalHPGaugeValueMax` | `build.totalHealthMax` | ✅ YES |
| **Averages** |
| Avg Damage | `Math.round(totalDamage/activeCount)` | `Math.round(totalDamageDealt/activeCount)` | ✅ YES |
| Avg Health | `Math.round(totalHealth/activeCount)` | `Math.round(totalHealthRemaining/activeCount)` | ✅ YES |
| Avg Max HP | `Math.round(totalHPGaugeValueMax/activeCount)` | `Math.round(totalHealthMax/activeCount)` | ✅ YES |
| Avg Battle Time | `Math.round((totalBattleTime/activeCount)*10)/10` | `Math.round((totalBattleDuration/activeCount)*10)/10` | ✅ YES |
| **Derived Stats** |
| Damage Efficiency | `totalDamage / totalTaken` | `totalDamageDealt / totalDamageTaken` | ✅ YES |
| DPS | `totalDamage / totalBattleTime` | `totalDamageDealt / totalBattleDuration` | ✅ YES |
| Health Retention | `avgHealth / avgHPGaugeValueMax` | `avgHealthRemaining / avgHealthMax` | ✅ YES |
| **Score Calculation** |
| Base Score | `(avgDmg/100k)*35 + eff*25 + dps/1000*25 + hpRet*15` | Same formula | ✅ YES |
| Experience Multiplier | `min(1.25, 1.0 + (activeCount-1)*(0.25/11))` | `min(1.25, 1.0 + (activeCount-1)*(0.25/11))` | ✅ YES |
| Final Score | `Math.round((base*exp)*100)/100` | `Math.round((base*exp)*100)/100` | ✅ YES |

### 3. **Potential Root Causes**

Based on code analysis, check for:

#### ✅ Already Fixed:
1. ✅ Inactive matches in character totals (NOW: only active matches accumulated)
2. ✅ Inactive matches in build totals (NOW: only active matches accumulated)
3. ✅ Rounding differences in averages (NOW: both use `Math.round()`)
4. ✅ Health retention using totals vs averages (NOW: both use averages)
5. ✅ DPS rounding before formula (NOW: both use raw totals)

#### ⚠️ Still to Investigate:
1. **Floating point precision** - JavaScript floating point arithmetic may cause tiny differences
2. **Order of operations** - Rounding at different stages might compound differently
3. **Data source** - Character vs build might be reading from slightly different match sets
4. **Accumulation order** - Stats accumulated in different loop iterations

### 4. **Test Cases**

Run the app and check console output for:

1. **Baby Vegeta (GT)** - 25 active matches, should show detailed comparison
2. **Any character with ≤30 matches and only 1 build** - Will trigger build logging
3. **Cross-check summary** - Lists all single-build characters with score differences

### 5. **Validation Steps**

1. Open browser console
2. Load analyzer with BR_Data
3. Search console for:
   - `=== BUILD SCORE CALCULATION ===`
   - `=== CHARACTER SCORE CALCULATION ===`
   - `=== SINGLE-BUILD CHARACTER SCORE COMPARISON ===`
4. For each reported difference:
   - Compare totals (should be identical)
   - Compare averages (should be identical after rounding)
   - Compare derived stats (should be identical)
   - Compare score components (identify which component differs)
   - Trace backwards to find source of difference

### 6. **Expected Console Output Format**

```
=== BUILD SCORE CALCULATION ===
Build Label: Pure Blast
Active Matches: 25
Totals: { totalDamageDealt: 1392375, totalDamageTaken: 953473, ... }
Averages: { avgDamageDealt: 55695, avgDamageTaken: 38139, ... }
Derived Stats: { damageEfficiency: 1.460, damagePerSecond: 376.02, ... }
Score Components: { damage/100k*35: 19.49, efficiency*25: 36.50, ... }

=== CHARACTER SCORE CALCULATION ===
Character: Baby Vegeta (GT)
Active Matches: 25
Totals: { totalDamage: 1392375, totalTaken: 953473, ... }
Averages: { avgDamage: 55695, avgTaken: 38139, ... }
Derived Stats: { damageEfficiency: 1.460, damagePerSecond: 376.02, ... }
Score Components: { damage/100k*35: 19.49, efficiency*25: 36.50, ... }

=== SINGLE-BUILD CHARACTER SCORE COMPARISON ===
Baby Vegeta (GT) (25 matches):
  Character Score: 86.23
  Build Score: 84.15
  Difference: 2.0800
  [Detailed metric comparison...]
```

### 7. **Resolution Strategy**

If differences persist after logging analysis:

1. **Identify the diverging component** - Which of the 4 score components differs?
2. **Trace to source** - Work backwards through the calculation
3. **Check data integrity** - Verify totals match exactly
4. **Verify rounding order** - Ensure rounding happens at same points
5. **Consider precision limits** - May need to accept differences < 0.01 due to floating point

### 8. **Success Criteria**

- All single-build characters show score difference ≤ 0.01 (acceptable floating point variance)
- Totals match exactly between character and build
- Derived stats match to reasonable precision (2-3 decimal places)
- Score components differ by < 0.01 each

## Implementation Status

✅ Debug logging added to both calculation paths
✅ Cross-check comparison implemented  
✅ Automatic filtering for single-build characters
⏳ Awaiting console output analysis
⏳ Root cause identification pending
