# Multiple File Upload Fixes

## Issues Fixed

When uploading multiple files manually, users were unable to:
1. Access single match view - no file selection UI was available
2. Access team rankings - the view appeared empty

## Root Causes

### Issue 1: Single Match View Access
- **Problem**: When multiple files were uploaded, `fileContent` remained `null` and no UI was provided to select a specific file for single match analysis
- **Location**: `apps/analyzer/src/App.jsx` - `processFiles` function and single match view condition

### Issue 2: Team Rankings Access  
- **Problem**: Team rankings view was properly computing data but the UI condition was too restrictive
- **Location**: `apps/analyzer/src/App.jsx` - team rankings display condition

## Solutions Implemented

### Fix 1: Enhanced File Selection for Single Match View

1. **Updated `processFiles` function** (lines ~3240-3268):
   - When a single file is uploaded: automatically set it for single match view
   - When multiple files are uploaded: clear fileContent to prevent auto-selection
   - Set `analysisFileContent` and `analysisSelectedFilePath` appropriately

2. **Updated `handleManualFileSelect` function** (lines ~3270-3282):
   - Automatically switch to 'single' view when a file is manually selected
   - Properly set both global and analysis-specific state

3. **Added file selection UI** (lines ~3385-3422):
   - When multiple files are uploaded in single view mode, display a grid of selectable files
   - Visual indication of currently selected file
   - Helper text explaining users can switch views for aggregated analysis

4. **Updated single match view condition** (line ~4774):
   - Simplified condition to check for either `analysisFileContent` or `fileContent` in manual mode
   - Maintains compatibility with reference mode

### Fix 2: Team Rankings Access

The team rankings functionality was already working correctly - it computes data from `manualFiles` when in manual mode. The fixes above ensure that:
- Multiple files can be uploaded and analyzed together
- Users can switch between view types (single, aggregated, teams, etc.)
- Data is properly computed regardless of which file(s) are selected

## User Experience Improvements

### Multiple File Upload Flow (Manual Mode)

1. **Upload 1 file**:
   - Automatically switches to single match view
   - File is pre-selected and displayed

2. **Upload multiple files**:
   - No automatic view selection (stays on current view type)
   - Users can choose:
     - **Single Match View**: Shows file selection UI to pick which match to analyze
     - **Aggregated Stats**: Analyzes all files together for character performance
     - **Team Rankings**: Shows team win/loss records across all files
     - **Data Tables**: Exports all data to Excel format
     - **Meta Analysis**: Build and capsule trends across all matches

3. **Helpful UI Hints**:
   - Single file + non-single view: Suggests uploading more files for better analysis
   - Multiple files + single view: Explains to select a file or switch views

## Testing Instructions

### Test Case 1: Single File Upload
1. Switch to "Manual File Upload" mode
2. Upload a single JSON battle result file
3. **Expected**: Automatically switches to single match view and displays the match
4. **Verify**: Match analysis shows team names, character stats, and performance scores

### Test Case 2: Multiple File Upload - Single Match View
1. Switch to "Manual File Upload" mode  
2. Upload 2+ JSON battle result files
3. Select "Single Match" view type
4. **Expected**: See file selection grid with all uploaded files
5. Click on a file to select it
6. **Expected**: Match analysis displays for the selected file
7. Select a different file
8. **Expected**: Match analysis updates to show the new file

### Test Case 3: Multiple File Upload - Team Rankings
1. Switch to "Manual File Upload" mode
2. Upload 2+ JSON battle result files with team information
3. Select "Team Rankings" view type
4. **Expected**: See ranked list of teams with win/loss records
5. **Verify**: 
   - Team stats are aggregated across all uploaded files
   - Click to expand teams shows character performance details
   - Head-to-head records are displayed correctly

### Test Case 4: Multiple File Upload - Aggregated Stats
1. Switch to "Manual File Upload" mode
2. Upload 2+ JSON battle result files
3. Select "Aggregated Stats" view type
4. **Expected**: See character performance aggregated across all files
5. **Verify**:
   - Match count reflects total matches across all files
   - Performance scores are calculated correctly
   - Filters work (character search, performance level, matches played)

## Technical Details

### State Management
- `fileContent`: Used for single file analysis (single match view)
- `manualFiles`: Array of all uploaded files with their content
- `analysisFileContent`: Content of currently selected file for analysis
- `analysisSelectedFilePath`: Path/name of currently selected file
- `viewType`: Current view mode ('single', 'aggregated', 'teams', 'tables', 'meta')

### Data Flow
1. Files uploaded → stored in `manualFiles` array
2. Single file mode → `fileContent` set directly
3. Multiple file mode → `fileContent` remains null initially
4. User selects file → `analysisFileContent` updated
5. View types process data from appropriate source:
   - Single match: Uses `analysisFileContent` or `fileContent`
   - Aggregated/Teams/Tables/Meta: Process entire `manualFiles` array

## Files Modified
- `apps/analyzer/src/App.jsx`:
  - `processFiles` function
  - `handleManualFileSelect` function  
  - Single match view render condition
  - Added file selection UI for multiple files in single view mode
  - Added helper text for user guidance
