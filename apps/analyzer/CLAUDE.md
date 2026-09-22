# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Scope

Battle Result Analyzer (`/analyzer/`) — statistics, per-character/per-form breakdowns, capsule synergy, and AI-strategy analysis over submitted match JSON data in `BR_Data/`. Part of the root npm workspace (Match Builder/Analyzer/Calculator) — install/build via the root `package.json` scripts. See root `CLAUDE.md` for the deploy pipeline, `referencedata/` sharing rules, and the Submit→Admin data submission pipeline that populates `BR_Data/`.

Dev: `npm run dev:analyzer` (repo root) → `:5173`. Build: `npm run build:analyzer`.

## ⚠️ Active redesign in progress

This app is mid-rewrite per **`docs/ANALYZER_REDESIGN_PLAN.md`** — read that file's "Progress" section before starting any analyzer work. Summary as of the last update:
- **Phase 1 (Foundation): done.** `react-router-dom` is wired in `src/main.jsx` behind a single catch-all route (`<Route path="/*" element={<App />} />`), so today's behavior is unchanged — real per-page routes don't exist yet. `src/routes.js` defines the target URL scheme (`/characters`, `/characters/:charId`, `/teams`, `/matches/:matchId`, `/meta`, `/sandbox`) for when pages actually get split out. Aggregation math has started moving into `src/utils/aggregation/` (`characterAggregation.js`, `teamAggregation.js`, `positionAggregation.js`) — **verify whether `App.jsx`'s remaining duplicate aggregation logic has actually been switched to call these yet**, since that consolidation may still be pending.
- **Phase 2 (Design System & Mobile Foundation) is next**: migrate to real Tailwind (retiring the ~2,000-line hand-rolled `App.css`, which defines zero actual `.md:`/`.lg:`/`.sm:` breakpoint rules despite the app using Tailwind breakpoint class names everywhere — this is why "responsive" grids currently render at a fixed column count on all screen sizes), unify design tokens, rebuild the app shell for mobile.
- **Phases 3–7 (Character/Team/Match page rebuilds, Home dashboard, Meta page, Sandbox polish, share-snippet image export): not started.**

Do the phases in order — Phase 2 is deliberately scheduled before any page rebuild so no page gets built twice (once in old styling, once redesigned).

## Current architecture (pre-redesign)

`src/App.jsx` is a ~6,700-line monolith: a `mode` (Reference Data / Manual Upload) × `viewType` (Single Match / Aggregated / Team Rankings / Data Tables / Meta Analysis) matrix, all rendered conditionally from one file. Presentational primitives (`StatBar`, `MetricDisplay`, `PerformanceIndicator`, `StatGroup`, `BuildTableView`, etc.) and the ~4 duplicate aggregation implementations (`getAggregatedCharacterData`, `getTeamAggregatedData`, `getPositionBasedData`, plus another inline in a `filteredAggregatedData` `useMemo`) all currently live inside this one file — extracting these out is exactly what the redesign plan's Phase 1/technical-refactor section targets. Don't add new features by growing this file further; where practical, follow the redesign plan's target structure (`src/hooks/`, `src/pages/`) for anything new.

Reusable, already-decoupled pieces worth knowing about:
- `src/components/BRDataSelector.jsx` — MUI tree file picker over `BR_Data/`.
- `src/components/TagFilterSelector.jsx` — already syncs filters (season/team/matchType/difficulty/matchSize) to the URL via `URLSearchParams` + `history.replaceState`. This is the existing pattern the redesign's URL-state layer extends to other selections (match/character/team).
- `src/components/Combobox.jsx` / `MultiSelectCombobox.jsx`, `DataTable.jsx` / `TableConfigs.jsx` / `ExportManager.jsx` (Excel export), `PerFormStatsDisplay.jsx`.
- `src/components/ai-strategy/*` (7 components) and `src/components/capsule-synergy/*` (including `BuildAnalyzerTool`) — the "Meta Analysis" feature set, planned to consolidate into one Meta/Builds page in Phase 6.

## `BR_Data/` and the tagging pipeline

`BR_Data/` is organized `Seasons/`, `Events/`, `Tests/`, each further split into subfolders (team/event names). Files land here via the Submit→Admin PR pipeline documented in root `CLAUDE.md`. On every build, `prebuild` (in `package.json`) runs, **in order**:
1. `scripts/autoTagMatches.js` — auto-tags each match file with `seasonNumber`, `seasonPhase`, `team`, `matchType`, `difficulty`, `matchSize` based on its path/content.
2. `scripts/generate-br-data-structure.js` — builds `public/br-data-structure.json`, the file tree `BRDataSelector` reads.
3. `scripts/generate-br-data-tags.js` — builds the tag index (`public/br-data-tags.json`) that `TagFilterSelector` filters against.

If match data looks stale/missing in the UI after adding files directly (rather than through a PR), re-run `npm run dev` (which triggers Vite) or manually run these three scripts — they don't run automatically on file save, only on build/prebuild.

Separately, `scripts/fix-json-encoding.js` (`npm run fix-json`) and `scripts/watch-br-data.js` handle encoding issues (UTF-16 LE / UTF-8 BOM) in submitted JSON — this also runs in CI (`.github/workflows/deploy.yml` and `.github/workflows/validate-json.yml`, see root `CLAUDE.md`). `scripts/br-data-api-server.js` and `scripts/generateCapsuleMetadata.js`/`src/config/capsuleMetadata.json` support local tooling — check their headers before assuming they run in the build.

## Reference data

Imports `characters.csv`/`capsules.csv` directly from `/referencedata/` at build time via Vite's `?raw` import (see root `CLAUDE.md` — **edit those files at the repo root, never the local `referencedata/` copy that `vite.config.js`'s `copy-shared-referencedata` plugin writes here**, it's overwritten on every build). `src/config/buildRules.js` and `src/config/capsule-rules.yaml` encode capsule-restriction/build-legality rules used by the synergy/AI-strategy analysis.

## Gotchas

- `@szl/ui` (aliased in `vite.config.js`) provides the shared `NavBar` — see `packages/ui/CLAUDE.md`.
- No test suite. Validate changes by running `npm run dev:analyzer` and checking the relevant view in the browser; for BR_Data/tagging changes, confirm the generated `public/br-data-*.json` files actually changed after a build.
