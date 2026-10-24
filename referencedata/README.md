# Shared Reference Data

This directory contains the shared reference data files used by the **Match Builder**, **Analyzer**, **Website** and **Character Calculator** applications.

## Files

- **characters.csv** - List of all characters with their IDs
- **capsules.csv** - List of all capsules, costumes, AI strategies, and Sparking BGM with their IDs, costs, and effects. The league's own capsules are `DBZL_Cap_<n>`, the ids the mod writes into match files. A retired league capsule stays in the file (old matches still show its name) and is banned; if the mod reuses its number, it moves to a named id, as Sore Loser did (`DBZL_Cap_30` → `DBZL_Cap_SoreLoser`, 2026-10-23, with its old matches in `apps/analyzer/BR_Data` and `public/BR_Data` updated) so the new capsule can take the number.
- **capsule-types.json** - Each capsule's build type (Melee, Blast, Ki Blast, Defense, Skill, Ki Efficiency, Utility), keyed by its id in `capsules.csv`: one list for every app, so a capsule is the same type in the Analyzer's build pills, cost bars and Meta tables and in the Character Calculator's build rows. Started 2026-10-11 from the Analyzer's own types (94 capsules) plus the league's 9 custom capsules. A new capsule needs a row here; the calculator's `verify-data` fails without one, and the Analyzer shows it as Unknown. Each app colours the types from its own palette.
- **capsule-rules.yaml** - Ruleset definitions for capsule restrictions in matches. Restriction types: `unique-per-character`, `unique-per-team`, `banned-ids`, `max-same-per-team` (a default count per team, with per-capsule `overrides`, e.g. the league capsules allowed once per team), `max-cost-group-per-character` (the attack-boost star cap), `mutually-exclusive-team` (the Roshi / King Kai health rule) and `exclusive-group-per-character` (at most `maxCount` capsules of a named group on one character, e.g. the Halo capsules; added 2026-10-21). Match Builder enforces all of them (`apps/matchbuilder/src/App.jsx`); the Calculator reads the bans, the attack-boost cap and the exclusive groups. Match Builder reads only the **first** entry of each type, so add groups inside one entry rather than a second entry of the same type. The top-level `freeSlots` list names the capsules that don't use one of a character's 7 capsule slots (Flight, Broly's Ring, Supreme Kai's Potara, I Fight Alone!; the league's mod lets the game take them on top of the 7, added 2026-10-23). Every other rule still applies to them, and the "Form Lock" exclusive group keeps the three that block transforming or fusing to one per character. Match Builder and Calculator show them under "Free Slots"; saved builds still list them in the character's `capsules`.
- **archive/** - Frozen copies of earlier capsule data and rulesets, kept for the record (`archive/pre-2026-10-capsule-update/`: before the October 2026 capsule update). No app reads them; a shelved design for letting older matches use them is in `docs/CAPSULE_VERSIONING_IDEA.md`.
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

### Character Calculator
The calculator's data build (`apps/calculator/scripts/build-data.mjs`, run before every calculator dev server and build) reads `characters.csv` (ids, names, order), `transformations.json`, `capsules.csv` (rows of Type `Capsule`), `capsule-types.json` and `capsule-rules.yaml`, and joins its game-data snapshots to them by character id. Renaming a character here renames it in the calculator; add the old name to `apps/calculator/data/curated/aliases.csv` so old share links keep working. See `apps/calculator/data/README.md`.

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
