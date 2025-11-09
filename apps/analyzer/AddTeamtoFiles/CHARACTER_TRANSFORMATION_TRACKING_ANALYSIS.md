# Character Transformation Tracking Analysis

## Overview
The battle result JSON files contain a sophisticated system for tracking character statistics through transformations during a match. This document explains how the data is structured and what each section represents.

## Key Data Sections

### 1. `characterRecord`
**Purpose**: Contains the **final state** of each character at the end of the match.

**Structure**: Keyed by spawn/position identifiers:
- `"１ＶＳ１の１Ｐの開始地点"` - Player 1's starting position
- `"１ＶＳ１の２Ｐの開始地点"` - Player 2's starting position  
- `"AlliesTeamMember1"` - Ally team member slot 1
- `"AlliesTeamMember2"` - Ally team member slot 2
- `"EnemyTeamMember1"` - Enemy team member slot 1

**Key Fields**:
- `battlePlayCharacter.character.key` - The character ID at match end (final form)
- `battlePlayCharacter.originalCharacter.key` - The character ID at match start (base form)
- `battleCount` - **Cumulative stats for the entire match** (all forms combined)
- `battleCount.battleNumCount.transform` - **Total number of transformations performed during the match**
- `formChangeHistory[]` - Array of transformation keys showing which forms the character transformed into during the match (count should match `transform` counter)

### 2. `originalCharacterIdRecord`
**Purpose**: ~~Contains **complete match statistics** for characters who transformed, organized by their **starting form**.~~

**⚠️ IGNORE THIS SECTION**: This section only populates in specific game modes and is **not consistently available**. Do not rely on this data for analysis or processing.

~~**Structure**: Keyed by the original/starting character ID (e.g., `"0000_40"` for Goku Base).~~

~~**Data Content**: Contains the same `battleCount` structure as found in `characterRecord`, representing the **total cumulative stats** from the entire match (all transformations combined).~~

~~**Important Note**: This is NOT a snapshot at transformation - it's the final total stats attributed to the original form.~~

### 3. `characterIdRecord`
**Purpose**: Contains **point-in-time snapshots** of character stats captured when transformations occur.

**Structure**: Keyed by character IDs that the character transformed **from** (not to).

**Important Details**:
- `battleNumCount.transform` - Counts transformations completed **up to this point** in the match
- `formChangeHistory[]` - If populated, indicates the character had **already transformed at least once before** reaching this form
  - Example: If Vegeta transforms Base → SSJ → SSJ God, when he transforms from SSJ to SSJ God, the SSJ snapshot will have `formChangeHistory: ["0020_61"]` showing he previously transformed into SSJ

#### How It Works - Transformation Chain Example:

**Example from New Json.json - Vegeta (Super):**
- Started as: `0020_60` (Vegeta Super - Base)
- First transformation to: `0020_61` (Vegeta Super - Super Saiyan)
- Second transformation to: `0022_62` (Vegeta Super - Super Saiyan Blue)

**Resulting entries in `characterIdRecord`:**

1. **Key: `"0020_60"` (Base form)**
   - `battlePlayCharacter.character.key`: `"0020_61"` (what he became)
   - `battleCount.givenDamage`: 14,368 damage done **before the first transformation**
   - `battleCount.takenDamage`: 4,188 damage taken **before the first transformation**
   - `formChangeHistory`: Empty (no transformations while in base)

2. **Key: `"0020_61"` (Super Saiyan form)**
   - `battlePlayCharacter.character.key`: `"0022_62"` (what he became)
   - `battleCount.givenDamage`: 23,665 damage **cumulative up to second transformation** (14,368 base + 9,297 as SSJ)
   - `battleCount.takenDamage`: 6,336 damage **cumulative up to second transformation**
   - `formChangeHistory`: Contains `"0020_61"` (showing he went through this form)

### 4. Transformation Tracking Pattern

#### Single Transformation Example (BattleResult_6.json - Goku):
**Starting form**: `0000_40` (Goku Super - Base)
**Final form**: `0000_41` (Goku Super - Super Saiyan)

**In `characterRecord` (Final state)**:
- `character.key`: `"0000_41"` (ended as SSJ)
- `originalCharacter.key`: `"0000_40"` (started as Base)
- `battleCount.givenDamage`: 49,044 (total for entire match)
- `formChangeHistory`: `["0000_41"]` (transformed to SSJ)

**In `characterIdRecord`**:
- Key `"0000_40"`:
  - `character.key`: `"0000_41"` (shows what he transformed into)
  - `battleCount.givenDamage`: 9,341 (damage done while in base form only)
  - `battleCount.takenDamage`: 10,080 (damage taken while in base form only)

#### Multiple Transformation Example (New Json.json - Vegeta):
**Chain**: Base (`0020_60`) → SSJ (`0020_61`) → SSJ Blue (`0022_62`)

**In `characterRecord` (Final state)**:
- `character.key`: `"0022_62"` (ended as SSJ Blue)
- `originalCharacter.key`: `"0020_60"` (started as Base)
- `battleCount.givenDamage`: 39,603 (total for entire match)
- `formChangeHistory`: `["0020_61", "0022_62"]` (transformation sequence)

**In `characterIdRecord`**:

**Snapshot 1** - Key `"0020_60"` (Stats when leaving Base):
- `character.key`: `"0020_61"` (next form)
- `givenDamage`: 14,368
- `takenDamage`: 4,188
- `sPMCount`: 2 (used 2 special moves)
- `transform`: NOT present (counter of transformations while in this form)

**Snapshot 2** - Key `"0020_61"` (Stats when leaving SSJ):
- `character.key`: `"0022_62"` (next form)
- `givenDamage`: 23,665 (cumulative: 14,368 from base + 9,297 as SSJ)
- `takenDamage`: 6,336 (cumulative)
- `sPMCount`: 3 (total special moves up to this point)
- `transform`: 1 (total transformations completed up to this point - from base to SSJ)
- `formChangeHistory`: `["0020_61"]` (indicates character already transformed once to reach SSJ)

## Data Flow Example - Complete Vegeta Match

### Vegeta's Journey (New Json.json):

**Phase 1: Base Form (`0020_60`)**
- Time: First 29.65 seconds
- Damage dealt: 14,368
- Special moves used: 2

**[TRANSFORMATION EVENT → Super Saiyan]**

**Phase 2: Super Saiyan Form (`0020_61`)**  
- Time: 24.1 seconds more
- Damage dealt this phase: 9,297
- Cumulative damage: 23,665
- Special moves used this phase: 1
- Total special moves: 3

**[TRANSFORMATION EVENT → Super Saiyan Blue]**

**Phase 3: Super Saiyan Blue (`0022_62`)** (Final Form)
- Time: 3.45 seconds
- Damage dealt this phase: 15,938
- **Final cumulative damage: 39,603**
- Special moves used this phase: 0
- **Final total special moves: 3**
- Ultimate used: 1

### How Stats are Stored:

1. **`characterRecord["AlliesTeamMember1"]`** (Current/Final state):
   - Shows current form: `0022_62` (SSJ Blue)
   - Shows original form: `0020_60` (Base)
   - **Total stats**: 39,603 damage, 3 special moves, 1 ultimate
   - `transform`: 2 (total transformations: Base→SSJ, SSJ→SSJ Blue)
   - `formChangeHistory`: `["0020_61", "0022_62"]` (both transformations listed)
   
2. ~~**`originalCharacterIdRecord["0020_60"]`**:~~
   - ~~**Same total stats**: 39,603 damage, 3 special moves, 1 ultimate~~
   - ~~Attributes entire match performance to original character~~
   - **⚠️ IGNORE - Not consistently available**

3. **`characterIdRecord["0020_60"]`** (Base → SSJ snapshot):
   - Damage: 14,368 (what was done **while in base**)
   - Special moves: 2
   - Current form shown: `0020_61` (where he's going)
   - `transform`: Not present (no transformations completed yet)
   - `formChangeHistory`: Empty (this is the starting form)

4. **`characterIdRecord["0020_61"]`** (SSJ → SSJ Blue snapshot):
   - Damage: 23,665 (cumulative: base + SSJ phases)
   - Special moves: 3
   - Current form shown: `0022_62` (where he's going)
   - `transform`: 1 (one transformation completed: Base→SSJ)
   - `formChangeHistory`: `["0020_61"]` (shows he transformed into SSJ)

## Key Insights

### Cumulative Nature of `characterIdRecord`
The stats in `characterIdRecord` are **cumulative up to the point of transformation**, not isolated to that form. To calculate stats for a specific form:
- **First form stats** = `characterIdRecord[original_form].battleCount`
- **Middle form stats** = `characterIdRecord[middle_form].battleCount` - `characterIdRecord[previous_form].battleCount`
- **Final form stats** = `characterRecord.battleCount` - `characterIdRecord[last_pre_final_form].battleCount`

### Transform Counter Behavior
The `battleNumCount.transform` counter:
- Tracks **total transformations completed up to that point**
- Increments with each transformation
- In `characterRecord`: Shows total transformations for the entire match
- In `characterIdRecord` snapshots: Shows transformations completed before entering that form
- Should match the length of `formChangeHistory` array in `characterRecord`

### Characters Without Transformations
If a character doesn't transform:
- They appear in `characterRecord` only
- `originalCharacter.key` equals `character.key`
- `formChangeHistory` is empty
- `battleNumCount.transform` is not present or equals 0
- They do NOT appear in `characterIdRecord`

### Identifying Transformation Sequence
1. Check `characterRecord[position].formChangeHistory[]`
2. Array is in chronological order of transformations
3. Each entry represents a form the character took
4. The final form is `characterRecord[position].character.key`
5. The count of entries should match `battleNumCount.transform`

### Battle Time Tracking
- Each `characterIdRecord` entry includes `battleTime` 
- This represents **cumulative time in combat** up to that transformation
- NOT the time spent in that specific form
- Actual time in a form = current snapshot's time - previous snapshot's time

## Example Calculation - Vegeta's SSJ Phase Stats

From New Json.json, to calculate what Vegeta did **specifically as Super Saiyan**:

**Given Damage as SSJ only:**
```
characterIdRecord["0020_61"].givenDamage - characterIdRecord["0020_60"].givenDamage
= 23,665 - 14,368
= 9,297 damage
```

**Time as SSJ:**
```
characterIdRecord["0020_61"].battleTime - characterIdRecord["0020_60"].battleTime  
= 53.77 seconds - 29.65 seconds
= 24.12 seconds
```

## Summary - All Questions Answered ✓

### Understanding the Data Structure

**1. `originalCharacterIdRecord`**
- **IGNORE**: Only populates in specific game modes. Not consistently available.

**2. `battleNumCount.transform`**
- **ANSWER**: Counts total transformations completed **up to that point** in the match.
- In final `characterRecord`: Total transformations for entire match
- In `characterIdRecord` snapshots: Transformations completed before entering that form

**3. `formChangeHistory` in snapshots**
- **ANSWER**: Indicates the character had **already transformed at least once before** reaching this form.
- Shows the transformation path taken to reach the current form
- Empty in the first form (starting form)

**4. Final form stats calculation**
- **ANSWER**: Yes, use this formula:
  ```
  Final form only stats = characterRecord.battleCount - characterIdRecord[last_transformation].battleCount
  ```

## Use Cases

### For Analytics:
1. **Per-form performance**: Calculate damage/stats for each individual transformation
2. **Transformation timing**: Analyze when players choose to transform
3. **Form effectiveness**: Compare performance across different forms
4. **Match progression**: Track how a character's performance changes through transformations

### For Data Processing:
1. **Character attribution**: Decide whether to attribute stats to original form or final form
2. **Time-based analysis**: Calculate performance per second in each form
3. **Transformation impact**: Measure immediate impact of transforming
4. **Build optimization**: Analyze which transformation paths are most effective
