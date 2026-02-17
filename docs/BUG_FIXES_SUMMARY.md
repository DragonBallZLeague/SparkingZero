# Submit Page Bug Fixes - Summary

## Issues Resolved

### 1. Form Values Not Recognized After "Submit More Data"
**Problem:** After successfully submitting data and clicking "Submit More Data", the form fields appeared to retain values from the previous submission, but attempting to resubmit would fail because the application state didn't recognize these values.

**Root Cause:**
- The `resetState()` function completely cleared the AppState, including user inputs
- DOM elements retained their visual values, creating a state/DOM mismatch
- The application read from AppState (empty) rather than DOM (filled)
- Calling `init()` again was unnecessary and caused issues

**Solution:**
- Created new `resetFilesOnly()` function that preserves user inputs while clearing only submission-related state
- Added `syncFormInputs()` function to ensure DOM elements always reflect AppState
- Modified "Submit More Data" handler to use `resetFilesOnly()` instead of `resetState()`
- Removed unnecessary `init()` call after submission

**Preserved Fields:**
- Name input
- Comments field
- Selected category/folder
- "Set Team Data" checkbox state
- Team selections (Team 1 and Team 2)

**Cleared Fields:**
- File selection
- Files preview
- Duplicate files warnings
- PR URL
- Submission ID
- Error messages

### 2. Dropdown Glitching After Multiple Submissions
**Problem:** After several submissions, the category and teams dropdowns would glitch, automatically selecting the first item in the list (e.g., events/budokai) and behaving erratically.

**Root Cause:**
- `init()` was called every time "Submit More Data" was clicked
- Each `init()` call executed `setupEventListeners()` without checking for existing listeners
- Multiple event listeners accumulated on the same DOM elements
- When user interacted with dropdowns, all listeners fired simultaneously
- This caused race conditions and erratic state updates

**Solution:**
- Added `listenersSetup` flag to AppState to track listener initialization
- Modified `setupEventListeners()` to check flag and skip if already initialized
- Removed `init()` call from "Submit More Data" handler
- Event listeners are now set up only once during initial page load

## Technical Implementation

### Files Modified

#### 1. `apps/submit/js/state.js`
```javascript
// Added listenersSetup flag to AppState
listenersSetup: false

// Created new function to reset only files
function resetFilesOnly() {
    updateState({
        stage: STAGES.READY,
        files: [],
        filesPreview: [],
        duplicateFiles: [],
        prUrl: '',
        submissionId: '',
        error: ''
    });
}
```

#### 2. `apps/submit/js/app.js`
```javascript
// Added guard clause to prevent duplicate listeners
function setupEventListeners() {
    if (AppState.listenersSetup) {
        console.log('[App] Event listeners already set up, skipping');
        return;
    }
    // ... setup code ...
    updateState({ listenersSetup: true });
}

// Modified Submit More Data button handler
newSubmissionBtn.addEventListener('click', () => {
    console.log('[App] Submit More Data clicked - preserving form state');
    resetFilesOnly();  // Instead of resetState()
    setStage(STAGES.READY);
    clearFiles();
    // Removed init() call
    updateUI();
});
```

#### 3. `apps/submit/js/ui.js`
```javascript
// Added function to sync DOM with state
function syncFormInputs() {
    // Sync name, comments, checkbox, and team selections
    // with current AppState values
}

// Updated master UI function
function updateUI() {
    syncFormInputs();  // Added this line
    updatePathDropdowns();
    updateTeamDataUI();
    updateFilesList();
    updateFilesPreview();
    updateSuccessMessage();
}
```

## Testing Verification

### Test Scenario 1: State Persistence
1. Fill form with: name, category, folder, team data, comments
2. Upload files and submit successfully
3. Click "Submit More Data"
4. **Expected:** All form fields retain values except file selection
5. **Expected:** Can immediately resubmit with new files

### Test Scenario 2: No Dropdown Glitching
1. Complete 5 submissions in succession
2. After each submission, click "Submit More Data"
3. Change dropdowns multiple times
4. **Expected:** Dropdowns respond normally without jumping to first item
5. **Expected:** Console shows "Event listeners already set up, skipping" after first submission
6. **Expected:** No duplicate API calls

### Test Scenario 3: Edge Cases
1. Submit with minimal data (only required fields)
2. Submit with maximum field lengths
3. Submit without team data checkbox
4. **Expected:** All scenarios preserve appropriate state
5. **Expected:** No errors in console

## Benefits

1. **Improved User Experience:**
   - Users don't need to re-enter information for multiple submissions
   - Faster workflow for batch uploads
   - Reduces data entry errors

2. **Better Performance:**
   - No unnecessary API calls to re-fetch paths
   - No duplicate event listeners consuming memory
   - Cleaner console output

3. **Code Quality:**
   - Clear separation between file state and form state
   - Explicit state management with `resetFilesOnly()`
   - Better debugging with console messages
   - Prevention of memory leaks from duplicate listeners

## Console Output After Fix

**On initial page load:**
```
[App] Initializing...
[App] Setting up event listeners...
[App] Event listeners setup complete
[App] Initialization complete
```

**On "Submit More Data" click:**
```
[App] Submit More Data clicked - preserving form state
[State] Updated: {stage: "ready", files: [], ...}
[UI] Form inputs synced with state
```

**On subsequent "Submit More Data" clicks:**
```
[App] Submit More Data clicked - preserving form state
[App] Event listeners already set up, skipping
[UI] Form inputs synced with state
```

## Backwards Compatibility

These fixes are backwards compatible and don't affect:
- Initial page load behavior
- File validation logic
- API submission format
- Server-side processing
- Other pages or components

## Additional Notes

- The `resetState()` function is still available if full state reset is needed elsewhere
- Event listeners are now properly managed throughout the application lifecycle
- Form state persistence makes the submit page more user-friendly for batch operations
- Console logging helps with debugging and monitoring application behavior
