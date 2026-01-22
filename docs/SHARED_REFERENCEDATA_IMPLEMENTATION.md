# Shared Reference Data Implementation

## Summary
Both the Match Builder and Analyzer apps now use the exact same dataset for characters and capsules from a shared `/referencedata` folder at the repository root.

## Changes Made

### 1. Created Shared Data Directory
- **Location**: `/referencedata/` (repository root)
- **Files**:
  - `characters.csv` - All character names and IDs
  - `capsules.csv` - All capsules, costumes, AI strategies, and Sparking BGM
  - `capsule-rules.yaml` - Match ruleset definitions
  - `README.md` - Documentation for the shared data

### 2. Updated Analyzer App

**Files Modified**:
- `apps/analyzer/src/App.jsx` - Updated import path from `../referencedata/` to `../../../referencedata/`
- `apps/analyzer/src/components/CapsuleSynergyAnalysis.jsx` - Updated import path
- `apps/analyzer/vite.config.js` - Added plugin to copy shared files during build

**How It Works**:
- Analyzer uses Vite's raw import feature to bundle CSV data at build time
- A Vite plugin copies the shared files to the local referencedata folder for consistency
- No runtime fetch needed - data is embedded in the bundle

### 3. Updated Match Builder App

**Files Modified**:
- `apps/matchbuilder/vite.config.js` - Added plugin to copy shared files to public folder during build

**How It Works**:
- Match Builder fetches CSV files at runtime via standard fetch API
- A Vite plugin copies shared files from `/referencedata/` to `/apps/matchbuilder/public/` during build
- Files are included in the dist output for runtime access
- Existing fetch logic remains unchanged

### 4. Build Process

Both apps now have Vite plugins that run during `buildStart`:

```javascript
{
  name: 'copy-shared-referencedata',
  buildStart() {
    // Copy shared referencedata files during build
    const sharedPath = resolve(__dirname, '../../referencedata')
    const targetPath = resolve(__dirname, 'public') // or 'referencedata' for analyzer
    copyFileSync(`${sharedPath}/characters.csv`, `${targetPath}/characters.csv`)
    copyFileSync(`${sharedPath}/capsules.csv`, `${targetPath}/capsules.csv`)
    // etc.
  }
}
```

## Benefits

1. **Single Source of Truth**: Only one set of CSV files needs to be maintained
2. **Consistency**: Both apps always use identical data
3. **Easy Updates**: Edit files once in `/referencedata/`, both apps get the update
4. **Build Compatibility**: Works with existing GitHub Actions workflow
5. **No Breaking Changes**: Both apps build and deploy successfully

## Testing

✅ Analyzer build: Success
✅ Match Builder build: Success
✅ Files copied correctly to dist folders
✅ Import paths resolved correctly
✅ No breaking changes to existing functionality

## Future Maintenance

To update character or capsule data:

1. Edit the appropriate CSV file in `/referencedata/`
2. Rebuild both apps (or push to trigger GitHub Actions)
3. Deploy - both apps will use the updated data

**Important**: Do NOT edit the CSV files in app-specific folders (`apps/analyzer/referencedata/` or `apps/matchbuilder/public/`). These are now copied from the shared location during build and any changes will be overwritten.
