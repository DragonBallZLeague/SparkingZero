# Submit Page Bug Fixes - Testing Guide

## Bugs Fixed

### Bug 1: Form Values Not Recognized After "Submit More Data"
**Issue:** After submitting data and clicking "Submit More Data", form fields appeared auto-filled from the previous submission but were not recognized when trying to resubmit.

**Root Cause:** The `resetState()` function cleared all AppState while DOM elements retained their values, creating a state/DOM mismatch. Additionally, calling `init()` again re-fetched data unnecessarily and attempted to add duplicate event listeners.

**Fix Implemented:**
1. Added `listenersSetup` flag to AppState to track if event listeners are already set up
2. Modified `setupEventListeners()` to check flag and skip if already set up
3. Created new `resetFilesOnly()` function that preserves user inputs while clearing only file-related state
4. Modified "Submit More Data" button handler to:
   - Use `resetFilesOnly()` instead of `resetState()`
   - Not call `init()` again (preventing duplicate listeners and unnecessary API calls)
   - Call `updateUI()` to sync form with state
5. Added `syncFormInputs()` function to ensure DOM elements reflect AppState values
6. Integrated `syncFormInputs()` into `updateUI()` master function

### Bug 2: Dropdown Glitching After Multiple Submissions
**Issue:** After several submissions, category & teams dropdowns glitched, automatically selecting the first item (events/budokai).

**Root Cause:** Each time `init()` was called (on every "Submit More Data" click), `setupEventListeners()` added new event listeners without removing old ones. After multiple submissions, elements had multiple listeners attached, causing race conditions and unpredictable behavior.

**Fix Implemented:**
1. Prevented duplicate event listeners by checking `AppState.listenersSetup` flag
2. Eliminated `init()` call in "Submit More Data" handler, preventing listener duplication
3. Event listeners are now set up only once during initial page load

## Testing Steps

### Test 1: Verify Form State Persistence

1. **Initial Setup:**
   - Open http://localhost:8080/index.html (or the deployed URL)
   - Fill in all form fields:
     - Name: "TestUser123"
     - Category: Select "Seasons" (or any non-default)
     - Folder: Select a specific folder
     - Check "Set Team Data"
     - Team 1: Select "Z-Fighters"
     - Team 2: Select "Cold Kingdom"
     - Comments: "Test submission 1"
   - Select test JSON files

2. **Submit Data:**
   - Click "Upload Files" button
   - Wait for success message
   - Note the PR URL shown

3. **Test Persistence:**
   - Click "Submit More Data" button
   - **Verify:** Form fields should retain previous values:
     - ✅ Name field shows "TestUser123"
     - ✅ Category shows "Seasons" (or selected category)
     - ✅ Folder shows previously selected folder
     - ✅ "Set Team Data" checkbox is still checked
     - ✅ Team 1 shows "Z-Fighters"
     - ✅ Team 2 shows "Cold Kingdom"
     - ✅ Comments field shows "Test submission 1"
   - **Verify:** File selection should be cleared:
     - ✅ File input is empty
     - ✅ Files list shows "No files selected"
     - ✅ Files preview is hidden

4. **Test Re-submission:**
   - Select new test JSON files
   - Click "Upload Files" button
   - **Verify:** Submission succeeds with preserved values
   - **Verify:** No errors about missing name or folder selection

### Test 2: Verify No Dropdown Glitching

1. **Perform Multiple Submissions:**
   - Complete a full submission (as in Test 1)
   - Click "Submit More Data"
   - Change Category dropdown to "Events"
   - **Verify:** Selection stays on "Events", doesn't jump to another option
   - Submit again
   - Repeat this cycle 5 times

2. **Test Dropdown Stability:**
   - After 5+ submissions, interact with dropdowns:
     - Change Category dropdown multiple times
     - **Verify:** No auto-selection or jumping to first item
     - Change Team 1 dropdown multiple times
     - **Verify:** No auto-selection or glitching
     - Change Team 2 dropdown multiple times
     - **Verify:** No auto-selection or glitching

3. **Check Browser Console:**
   - Open browser DevTools (F12)
   - Go to Console tab
   - **Verify:** Should see "[App] Event listeners already set up, skipping" after first submission
   - **Verify:** No errors or warnings
   - **Verify:** No duplicate API calls to fetch paths

### Test 3: Verify Edge Cases

1. **Empty Optional Fields:**
   - Submit with only required fields filled
   - Click "Submit More Data"
   - **Verify:** Required fields are preserved
   - **Verify:** Optional fields remain empty
   - **Verify:** Can resubmit successfully

2. **Unchecked Team Data:**
   - Submit without checking "Set Team Data"
   - Click "Submit More Data"
   - **Verify:** Checkbox remains unchecked
   - **Verify:** Team dropdowns remain hidden
   - **Verify:** Can resubmit successfully

3. **Maximum Fields:**
   - Fill name with 80 characters
   - Fill comments with 500 characters
   - Submit and click "Submit More Data"
   - **Verify:** Both fields retain full text
   - **Verify:** Can resubmit successfully

## Expected Console Output

After implementing fixes, console should show:

```
[App] Initializing...
[App] Setting up event listeners...
[App] Event listeners setup complete
[App] Initialization complete

// After first submission and "Submit More Data":
[App] Submit More Data clicked - preserving form state
[UI] Form inputs synced with state

// After subsequent "Submit More Data" clicks:
[App] Submit More Data clicked - preserving form state
[App] Event listeners already set up, skipping
[UI] Form inputs synced with state
```

## Files Modified

1. `apps/submit/js/state.js`:
   - Added `listenersSetup` flag to AppState
   - Created `resetFilesOnly()` function

2. `apps/submit/js/app.js`:
   - Modified `setupEventListeners()` to check `listenersSetup` flag
   - Updated "Submit More Data" button handler

3. `apps/submit/js/ui.js`:
   - Added `syncFormInputs()` function
   - Updated `updateUI()` to include `syncFormInputs()`

## Rollback Instructions

If issues occur, revert these commits or restore from backup:
- `state.js` - Restore original `resetState()` and AppState
- `app.js` - Restore original `setupEventListeners()` and button handler
- `ui.js` - Restore original `updateUI()` function
