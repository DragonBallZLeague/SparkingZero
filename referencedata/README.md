# Shared Reference Data

This directory contains the shared reference data files used by both the **Match Builder** and **Analyzer** applications.

## Files

- **characters.csv** - List of all characters with their IDs
- **capsules.csv** - List of all capsules, costumes, AI strategies, and Sparking BGM with their IDs, costs, and effects
- **capsule-rules.yaml** - Ruleset definitions for capsule restrictions in matches

## Usage

### Analyzer App
The analyzer imports these files directly at build time using Vite's raw import feature:
```javascript
import charactersCSV from '../../../referencedata/characters.csv?raw';
import capsulesCSV from '../../../referencedata/capsules.csv?raw';
```

### Match Builder App
The match builder copies these files to its public folder during build via a Vite plugin, then fetches them at runtime:
```javascript
const response = await fetch("characters.csv");
```

## Updating Data

**Important**: When updating character or capsule data, only edit the files in this `/referencedata` directory at the root level. Both apps will automatically use the updated data on their next build.

### Steps to Update:
1. Edit the appropriate CSV or YAML file in `/referencedata/`
2. Rebuild both apps:
   ```bash
   cd apps/analyzer && npm run build
   cd ../matchbuilder && npm run build
   ```
3. The updated data will be included in both builds

## Build Process

Both apps have Vite plugins configured to handle these shared files:

- **Analyzer**: Copies files from shared location to local referencedata during build (for consistency)
- **Match Builder**: Copies files from shared location to public folder during build (for runtime access)

This ensures both apps always use the same exact dataset without duplication of the source files.
