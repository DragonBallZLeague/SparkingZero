# Shared Reference Data

This directory contains the shared reference data files used by both the **Match Builder** and **Analyzer** applications.

## Files

- **characters.csv** - List of all characters with their IDs
- **capsules.csv** - List of all capsules, costumes, AI strategies, and Sparking BGM with their IDs, costs, and effects
- **capsule-rules.yaml** - Ruleset definitions for capsule restrictions in matches
- **teams.json** - The league's teams: each team's `tag` (the ASCII identifier in match files, `BR_Data` folders, `tagConfig.js` and the Submit app), its display `name` (the website's spelling, e.g. `Master & Student`, `Sentai Squad`), the analyzer's URL `slug`, the website's `websiteSlug`, the `logo` file in `apps/website/public/images/` and the website's team `color`. **Tags never change**: they are identifiers baked into file paths and shared links. Names are display data, so a rename is a one-line edit here. Consumed by the Analyzer (names in every view, logos via `npm run build-team-logos`).

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
