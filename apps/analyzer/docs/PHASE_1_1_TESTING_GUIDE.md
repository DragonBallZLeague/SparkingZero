# Phase 1.1 Testing Guide
## Quick Start for Testing Capsule Synergy Analysis

---

## 🧪 Pre-Testing Checklist

- [ ] Node.js and npm installed
- [ ] All dependencies installed (`npm install` in `/apps/analyzer/`)
- [ ] Battle result JSON files available
- [ ] Development server running (`npm run dev`)

---

## 🚀 Quick Test Procedure

### 1. Start the Development Server

```bash
cd apps/analyzer
npm run dev
```

The analyzer should open at `http://localhost:5173` (or similar).

---

### 2. Load Test Data

**Option A: Use Reference Data**
1. Click **"Reference Data"** mode
2. Navigate through the file browser
3. Select JSON files from `BR_Data/` folders

**Option B: Upload Manual Files**
1. Click **"Manual Upload"** mode
2. Drag and drop or select JSON files
3. Files should be in Battle Result format

**Recommended Test Files:**
- `BR_Data/Tests/` folders contain team-specific matches
- Season 0 data for larger datasets

---

### 3. Navigate to Meta Analysis

1. After files are loaded, look for the **"Meta Analysis"** button/tab
2. Click to switch to Meta Analysis view
3. Scroll to find the **"Capsule Synergy Analysis"** section (marked with Phase 1.1 badge)

---

### 4. Test Individual Performance Tab

**Basic Tests:**
- [ ] Table renders with capsule data
- [ ] Sorting works (click column headers)
- [ ] Search box filters capsules by name
- [ ] Archetype filter dropdown works
- [ ] AI Strategy filter dropdown works (if strategies present)
- [ ] Composite scores are color-coded correctly
- [ ] Win rates display with proper colors

**Advanced Tests:**
- [ ] Export to Excel button creates downloadable file
- [ ] Excel file contains all visible columns
- [ ] Combining filters (search + archetype)
- [ ] No capsules message appears when filtered to empty

**Expected Results:**
- Capsules ranked by composite score (default sort)
- Green scores (70+), blue (50-70), yellow (30-50), gray (<30)
- Win rates: green (60%+), blue (50-60%), yellow (40-50%), red (<40%)

---

### 5. Test Synergy Pairs Tab

**Basic Tests:**
- [ ] Pair table renders with synergy data
- [ ] Synergy Type filter works (Cross-Archetype, Same-Archetype, Effect-Based)
- [ ] Archetype filter shows pairs with that archetype
- [ ] Min Appearances slider/input filters correctly
- [ ] Synergy Bonus column shows positive/negative values

**Heatmap Tests:**
- [ ] Click "Show Heatmap" button
- [ ] Heatmap renders with top 20 capsules
- [ ] Color coding shows synergy strength
- [ ] Hover tooltips show capsule pair and bonus value
- [ ] Click "Show Table" returns to table view

**Advanced Tests:**
- [ ] Export to Excel from pair table
- [ ] Sort by different columns (Win %, Bonus, Appearances)
- [ ] Filter by synergy type + archetype combination

**Expected Results:**
- Positive synergy bonuses in green/blue
- Negative bonuses in orange/red
- Heatmap cells colored by value (green = high synergy, red = negative)

---

### 6. Test Build Analyzer Tool

#### Custom Build Mode

**Basic Build Creation:**
- [ ] Search for capsules in the selection panel
- [ ] Filter by archetype
- [ ] Click capsules to add to build
- [ ] Remove capsules with × button
- [ ] Clear All button empties build

**Validation Tests:**
- [ ] Add capsules until cost exceeds 20 → "Invalid" status
- [ ] Add more than 7 capsules → "Invalid" status
- [ ] Valid build shows green ✓ Valid
- [ ] Total cost displays correctly (X/20)
- [ ] Capsule count shows correctly (X/7)

**Score Breakdown Tests:**
- [ ] Overall score displays prominently
- [ ] Five score bars render (Performance, Synergy, AI, Archetype, Cost)
- [ ] Archetype composition shows primary archetype
- [ ] Archetype bars show correct proportions

**Improvement Suggestions:**
- [ ] Click "Show Improvement Suggestions"
- [ ] Suggestions appear with impact scores
- [ ] Click suggestion to add capsule to build
- [ ] Suggestions respect build rules (won't exceed cost/count)

#### Recommended Builds Mode

**Generation Tests:**
- [ ] Switch to "Recommended Builds" tab
- [ ] Select AI Strategy filter (if available)
- [ ] Select Archetype filter
- [ ] Set number of builds (1-10)
- [ ] Click "Generate Recommended Builds"
- [ ] Builds appear sorted by score

**Build Loading:**
- [ ] Click "Load Build" on any recommendation
- [ ] Switch to Custom Build mode
- [ ] Loaded build appears in current build panel
- [ ] Can modify loaded build

**Expected Results:**
- Builds respect league rules (≤20 cost, ≤7 capsules)
- Builds vary (not all identical)
- Scores are reasonable (0-100 range)
- Higher-ranked builds have better scores

---

## 🔍 Edge Case Testing

### No Data Scenarios
- [ ] View tabs with no battle results loaded
- [ ] Should show "No data available" messages
- [ ] No errors in browser console

### Minimal Data
- [ ] Load only 1 battle result file
- [ ] Performance tab should work
- [ ] Pairs tab may show "not enough data"
- [ ] Build analyzer should work but with limited recommendations

### Large Dataset
- [ ] Load 50+ battle result files
- [ ] Performance remains acceptable
- [ ] Heatmap renders properly (top 20 only)
- [ ] Build generation completes in reasonable time (<5 seconds)

### Filter Combinations
- [ ] Apply multiple filters simultaneously
- [ ] Empty results show appropriate message
- [ ] Clear filters to restore data

---

## 🎨 UI/UX Testing

### Dark Mode
- [ ] Toggle dark mode on/off
- [ ] All tabs render correctly in both modes
- [ ] Colors remain readable
- [ ] Badges and highlights adapt properly

### Responsive Design
- [ ] Resize browser window
- [ ] Tables remain scrollable horizontally if needed
- [ ] Build analyzer two-column layout adapts on narrow screens
- [ ] Buttons and controls remain accessible

### Interactions
- [ ] Hover states work on table rows
- [ ] Buttons show hover effects
- [ ] Click feedback is immediate
- [ ] Sort direction indicators toggle correctly

---

## 📊 Data Validation

### Performance Metrics
- [ ] Composite scores are in 0-100 range
- [ ] Win rates are 0-100%
- [ ] Damage values are positive integers
- [ ] Efficiency ratios are positive decimals

### Synergy Calculations
- [ ] Synergy bonuses can be positive or negative
- [ ] Pair appearances match individual appearances
- [ ] Expected performance calculations make sense

### Build Validation
- [ ] Cost calculation is accurate (sum of capsule costs)
- [ ] Capsule count is correct
- [ ] No duplicate capsules in a build
- [ ] Archetype counts sum to total capsules

---

## 🐛 Common Issues & Solutions

### Issue: Capsule data not loading
**Solution:** Check browser console for errors. Ensure `capsules.csv` is in `/public/` or `/referencedata/`

### Issue: No synergy data showing
**Solution:** Need at least 3 matches with capsule pairs. Load more battle results.

### Issue: Build recommendations are identical
**Solution:** Limited capsule pool or very strong performance bias. Try different filters.

### Issue: Heatmap is blank
**Solution:** Need sufficient pair data. Check min appearances threshold.

### Issue: Excel export fails
**Solution:** Check browser allows downloads. Try different browser if blocked.

---

## ✅ Success Criteria

Phase 1.1 is working correctly if:

1. ✅ All three tabs render without errors
2. ✅ Tables display data from loaded battle results
3. ✅ Sorting and filtering work correctly
4. ✅ Excel exports succeed
5. ✅ Custom builds can be created and validated
6. ✅ Build recommendations generate successfully
7. ✅ No console errors during normal use
8. ✅ Dark mode works throughout
9. ✅ Performance is acceptable (no lag on typical datasets)

---

## 📸 Screenshot Checklist

For documentation/bug reports, capture:

1. Individual Performance tab (sorted view)
2. Synergy Pairs table view
3. Synergy Pairs heatmap view
4. Build Analyzer with valid custom build
5. Build Analyzer showing recommendations
6. Dark mode version of any tab

---

## 🔧 Developer Testing

### Console Commands
Open browser console and test:

```javascript
// Check capsule data loaded
console.log('Capsules:', window.capsuleData);

// Check performance data
console.log('Performance:', window.performanceData);

// Check synergy data
console.log('Synergies:', window.synergyData);
```

### React DevTools
- Inspect component state
- Check props passed to child components
- Verify memoization is working (no unnecessary re-renders)

---

## 📝 Bug Report Template

If you find issues, report with:

```
**Feature:** [Tab name or component]
**Action:** [What you did]
**Expected:** [What should happen]
**Actual:** [What actually happened]
**Console Errors:** [Any error messages]
**Browser:** [Chrome/Firefox/etc.]
**Dark Mode:** [On/Off]
**Data Size:** [Number of files loaded]
```

---

## 🎯 Performance Benchmarks

**Acceptable Load Times:**
- Tab switching: <500ms
- Sorting/filtering: <200ms
- Build generation (5 builds): <3 seconds
- Excel export: <2 seconds
- Heatmap render: <1 second

**Memory Usage:**
- Should not exceed 500MB with typical dataset (10-20 files)
- No memory leaks on repeated tab switches

---

## 🚦 Testing Status

Use this checklist to track testing progress:

### Individual Performance Tab
- [ ] Basic rendering
- [ ] Sorting
- [ ] Filtering
- [ ] Search
- [ ] Excel export
- [ ] Dark mode

### Synergy Pairs Tab
- [ ] Table view
- [ ] Heatmap view
- [ ] Filters
- [ ] Excel export
- [ ] Dark mode

### Build Analyzer Tool
- [ ] Custom build creation
- [ ] Build validation
- [ ] Score display
- [ ] Suggestions
- [ ] Recommendation generation
- [ ] Build loading
- [ ] Dark mode

### Integration
- [ ] Works with reference data
- [ ] Works with manual upload
- [ ] No conflicts with existing features
- [ ] Proper error handling

---

**Happy Testing! 🎉**

Report any issues or unexpected behavior for investigation.
