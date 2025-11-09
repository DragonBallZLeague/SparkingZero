# Debugging Plan: Team Rankings vs Aggregated Stats Blast Display Issue

## Problem
Panzy's Super 1 Blasts show as `0.0/11.4` in Team Rankings view but show correctly as `11.4` in Aggregated Stats view (legacy format).

## Diagnostic Logging Added

### 1. **getAggregatedCharacterData** (Aggregated Stats data processing)
Located around line ~1220
```javascript
// Logs when processing each match for Panzy:
- Match file name
- stats.hasAdditionalCounts (should be false for legacy data)
- stats.s1Blast value
- stats.s1HitBlast value (should be undefined/null for legacy)
- Running totals for totalS1Blast, totalS1HitBlast, totalS1BlastTrackable
```

Located around line ~1555
```javascript
// Logs final calculated values:
- totalS1Blast
- totalS1HitBlast
- totalS1BlastTrackable (should be 0 for pure legacy data)
- Match counts
- avgS1Blast, avgS1Hit
- s1HitRateOverall (should be null for pure legacy data)
```

### 2. **getTeamAggregatedData** (Team Rankings data processing)
Located around line ~2030
```javascript
// Logs match details for Panzy:
- All match data with s1Blast, s2Blast, s1HitBlast, s2HitBlast values
- totalS1Blast, totalS1HitBlast
- totalS1BlastTrackable (should be 0 for pure legacy data)
```

Located around line ~2050
```javascript
// Logs final calculated values:
- avgS1Blast, avgS1Hit, avgSPM1
- s1HitRateOverall (should be null for pure legacy data)
```

### 3. **Aggregated Stats UI** (Display layer)
Located around line ~4347
```javascript
// Logs what the UI component receives:
- Full char object
- avgS1Hit, avgS1Blast, avgSPM1
- s1HitRateOverall
```

### 4. **Team Rankings UI** (Display layer)
Located around line ~6157
```javascript
// Logs what the UI component receives:
- Full charStats object
- avgS1Hit, avgS1Blast, avgSPM1
- s1HitRateOverall
```

## Testing Steps

1. **Build Complete**: The app has been built with debug logging

2. **Open the App**: Navigate to `http://localhost:5173` (or your dev server)

3. **Load Panzy's Data**:
   - If using manual upload: Upload the battle file(s) containing Panzy
   - If using BR_Data: Navigate to the folder containing Panzy's matches

4. **View Aggregated Stats**:
   - Switch to "Aggregated Stats" view
   - Find Panzy in the character list
   - Expand her details to trigger the UI logging
   - Open browser console (F12) and look for "AGGREGATED STATS" logs

5. **View Team Rankings**:
   - Switch to "Team Rankings" view
   - Find the team Panzy is on
   - Expand the team, then expand Panzy's character details
   - Look for "TEAM RANKINGS" logs in console

## What to Look For

### Key Questions the Logs Will Answer:

1. **Are both functions receiving the same raw data?**
   - Compare the match data logged in both functions
   - Check if s1HitBlast, s2HitBlast values are the same

2. **Is stats.hasAdditionalCounts being set correctly?**
   - In Aggregated Stats, this should be `false` for legacy data
   - This controls whether blasts are added to totalS1BlastTrackable

3. **What are the totalS1BlastTrackable values?**
   - Should be `0` in both functions for pure legacy data
   - If non-zero in Team Rankings but zero in Aggregated Stats, that's the bug

4. **What is s1HitRateOverall in each function?**
   - Should be `null` in both for pure legacy data
   - If `null` in Aggregated Stats but a number in Team Rankings, that's the bug

5. **What does the UI actually receive?**
   - Compare charStats (Team Rankings) vs char (Aggregated Stats)
   - Check if s1HitRateOverall values match what was calculated

## Expected Results for Pure Legacy Data (Panzy)

### Aggregated Stats:
```
totalS1Blast: 11.4 (or similar)
totalS1HitBlast: 0
totalS1BlastTrackable: 0
s1HitRateOverall: null
avgS1Blast: 11.4
avgS1Hit: 0.0
avgSPM1: 11.4
```

### Team Rankings (should match):
```
totalS1Blast: 11.4 (or similar)
totalS1HitBlast: 0
totalS1BlastTrackable: 0
s1HitRateOverall: null
avgS1Blast: 11.4
avgS1Hit: 0.0
avgSPM1: 11.4
```

### UI Display Logic:
Both should display:
- `s1HitRateOverall === null` → Show legacy format (just the thrown count: `11.4`)
- `s1HitRateOverall !== null` → Show new format (hit/thrown: `0.0/11.4`)

## Common Issues to Check

1. **Different data source**: Team Rankings might be using different files than Aggregated Stats
2. **Data structure mismatch**: Match objects might have different property names
3. **Calculation bug**: The fix to check each blast type individually might not be working
4. **UI condition bug**: The per-blast-type display logic might have an error

## Next Steps After Viewing Logs

Once you run the app and check the console:
1. Copy the console output
2. Compare the values between Aggregated Stats and Team Rankings
3. Identify where the values diverge
4. That will pinpoint the exact location of the bug
