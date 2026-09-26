# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Scope

Battle Result Analyzer (`/analyzer/`) — statistics, per-character/per-form breakdowns, capsule synergy, and AI-strategy analysis over submitted match JSON data in `BR_Data/`. Part of the root npm workspace (Match Builder/Analyzer/Calculator) — install/build via the root `package.json` scripts. See root `CLAUDE.md` for the deploy pipeline, `referencedata/` sharing rules, and the Submit→Admin data submission pipeline that populates `BR_Data/`.

Dev: `npm run dev:analyzer` (repo root) → `:5173`. Build: `npm run build:analyzer`.

## ⚠️ Active redesign in progress

This app is mid-rewrite per **`docs/ANALYZER_REDESIGN_PLAN.md`** (audited and revised 2026-09-25) — read that file's **"What the Analyzer is for"** section (the product north star, including how the league's lineup → CPU-vs-CPU match loop works and the six design principles that break ties) and its "Progress" section before starting any analyzer work. Summary:
- **Phase 1 (Foundation): done.** `react-router-dom` is wired in `src/main.jsx` behind a single catch-all route (`<Route path="/*" element={<App />} />`) with `basename={import.meta.env.BASE_URL}`, so today's behavior is unchanged — real per-page routes don't exist yet. The **aggregation extraction is genuinely complete**: `src/utils/aggregation/` holds 3 files / 8 exports, `App.jsx` imports and calls them, and no duplicate definitions remain in `App.jsx`. Two loose ends remain: `src/routes.js` is **imported by nothing** (no router hooks are used anywhere in `src/`), and `filteredAggregatedData` is still an inline `useMemo` at `App.jsx:1413` (the surviving 4th aggregation implementation). The dead `getPositionInsight` import was removed in Phase 1.5.
- **Phase 1.5 (Data layer): ✅ core complete.** The app no longer fetches ~2,232 files / ~67 MB on load — the default view is **2 requests / ~101 KB gzipped**. See "The compact match corpus" below. Still open: `filteredAggregatedData` (`App.jsx:1413`, ~697 lines inline) is deferred to the Phase 3 Character page rebuild.
- **Phase 2a (Tailwind + tokens + dependency cleanup): ✅ complete.** Real Tailwind v3 runs now; shared tokens live in `packages/ui/src/tokens.js`; `xlsx`, `@mui/x-tree-view`, `@mui/lab` and a duplicate `@vitejs/plugin-react` are gone. See "Styling: Tailwind and App.css coexist" below — **the CSS load order is load-bearing, read it before touching styles.**
- **Phase 2b (App.css teardown) is next**: retire the 2,062-line `App.css` and the 1,199 `darkMode` ternaries incrementally, per component, as pages get rebuilt — using Tailwind's `dark:` variant plus a `ThemeContext`. Then **2c** (responsive shell, accessibility, state persistence).
- **⚠️ Deep links are broken in production.** `deploy.yml` does `cp dist/index.html dist/404.html`, so any unmatched path serves the *website's* SPA. `/SparkingZero/analyzer/characters/0620_00` renders nothing. A smart 404 dispatcher is a **prerequisite of Phase 3**, which ships the first real deep link and the share button.
- **Phases 3–7 (Character/Team/Match page rebuilds, stats-only Home page, Meta page, Sandbox polish, share-snippet image export): not started.**

Do the phases in order. Phase 1.5 precedes the design work so the new pages aren't built on a 67 MB page load; the `App.css` teardown is deliberately *not* a gate on page rebuilds.

## Current architecture (pre-redesign)

`src/App.jsx` is a 6,678-line monolith (`src/App.css` is 2,062): a `mode` (Reference Data / Manual Upload) × `viewType` (Single Match / Aggregated / Team Rankings / Data Tables / Meta Analysis) matrix, all rendered conditionally from one file, with ~30 `useState` hooks at the top of `App()`. **13 presentational components are still defined inside it** above `export default function App()` at line 1285 (`StatBar`:95, `PerformanceIndicator`:163, `StatGroup`:298, `MetricDisplay`:332, `BuildTableView`:710, `BuildDisplay`:1023, `MetaAnalysisContent`:1200, …) — moving those out is Phase 2c. The aggregation functions have **already** been extracted to `src/utils/aggregation/`; only the inline `filteredAggregatedData` `useMemo` (`App.jsx:1413`) remains. `src/pages/` and `src/hooks/` do not exist yet; `src/api/` exists and is empty. Don't add new features by growing this file further; where practical, follow the redesign plan's target structure for anything new.

Theming is prop-drilled from a single `useState(true)` at `App.jsx:1315` through **1,199 `darkMode ? 'x' : 'y'` ternaries across `src/`** (704 in `App.jsx`). Styling is class-driven (1,125 `className=` vs 23 `style={{`), so Tailwind's `dark:` variant plus a `ThemeContext` is the planned replacement. There is **no `localStorage`/`sessionStorage` anywhere** — dark mode, filters and selection all reset on reload.

Reusable, already-decoupled pieces worth knowing about:
- `src/components/BRDataSelector.jsx` — file picker over `BR_Data/`. The tree is **hand-rolled**, not an MUI `TreeView` (`@mui/x-tree-view` and `@mui/lab` are declared dependencies but imported nowhere); it does use a handful of `@mui/material` components and icons.
- `src/components/TagFilterSelector.jsx` — syncs filters (season/team/matchType/difficulty/matchSize) to the URL via `URLSearchParams` + `history.replaceState` at `:60-61`, which **bypasses react-router entirely**. It must be reconciled to `useSearchParams` when real routes land in Phase 3, or the two will fight over the URL. It filters against `br-data-tags.json` with zero match fetches — lean on that for the Matches browser.
- `src/components/Combobox.jsx` / `MultiSelectCombobox.jsx`, `DataTable.jsx` / `TableConfigs.jsx` / `ExportManager.jsx` (Excel export), `PerFormStatsDisplay.jsx`.
- `src/components/ai-strategy/*` (7 components) and `src/components/capsule-synergy/*` (including `BuildAnalyzerTool`) — the "Meta Analysis" feature set, planned to consolidate into one Meta/Builds page in Phase 6.

## Styling: Tailwind and App.css coexist (read before touching styles)

Real Tailwind v3 runs here as of Phase 2a, **alongside** the legacy `App.css`. The arrangement is deliberate and fragile in one specific way:

- `src/main.jsx` imports `src/index.css` **before** `App.jsx` pulls in `App.css`. **Do not reorder those imports.** `App.css` hand-rolls 713 utility classes, 123 of which share a name with a class Tailwind generates, and some differ in ways that change rendering — `.gap-4` is `0.6rem` here vs Tailwind's `1rem`, `.max-w-4xl`/`.max-w-7xl` add `margin: 0 auto`, `.border-b`/`.border-l-2` carry an explicit `border-style`, and several violet/teal shades use different hex values. Tailwind emitting first means `App.css` wins every tie, which is what keeps the existing UI looking identical.
- **Preflight is off** (`corePlugins.preflight: false` plus no `@tailwind base`). Consequence: a bare `border`/`border-b` utility renders no visible border unless a `border-style` is also set. `App.css`'s versions include one; new Tailwind-only markup must add `border-solid` explicitly. Preflight turns on in Phase 2b once `App.css` is gone.
- **Design tokens come from `packages/ui/src/tokens.js`** (CommonJS, shared by all four apps). Canonical accent is `#f97316`. Legacy names (`dragon-*` here, `dbz.*` on the website, `sz-*` on the calculator) are aliases onto the shared values — prefer `brand.*` in new work.
- `App.css:22` repurposes Tailwind's real `bg-gradient-to-br` class name to mean one specific gradient. Rename it in 2b rather than adding more like it.

## The compact match corpus (`public/br-aggregates/`)

This is how match data reaches the client. **Do not add code that fetches `BR_Data/` files in bulk** — that is the pattern Phase 1.5 removed.

- `scripts/generate-br-aggregates.js` (prebuild, after `generate-br-data-tags.js`; also `npm run build-aggregates`) writes 15 shards — one per `BR_Data/<Top>/<Sub>` folder — plus `index.json`. 2,497 matches, 68.5 MB → 14.6 MB; the Season 0 shard is 1.17 MB raw / ~101 KB gzipped.
- **Shards keep the original match JSON shape** (`TeamBattleResults.battleResult.characterRecord`), with every field no consumer reads stripped out. That is deliberate: `statCalculations.js` and `utils/aggregation/*` consume a shard **unchanged**. `attackHitCount` and `runBlastCount` are pre-summed into synthetic dicts whose keys still satisfy `extractStats`' `includes()` checks.
- **If you make anything read a new raw field, add it to the keep-lists in the generator**, or it will silently read `undefined` from a shard. Then re-run `npm run verify-aggregates` (`scripts/verify-br-aggregates.mjs`): it compares raw vs compact field-by-field and runs the real `extractStats()` over both sides for all 2,497 matches / 11,914 character entries. It currently passes; treat a failure as a blocker, since a dropped field corrupts published statistics rather than crashing.
- `src/utils/corpusLoader.js` (`loadMatches`) does the client-side loading, falling back to per-file fetches if the corpus is missing, version-mismatched, or lacks a requested match. Single-match navigation (`handleNavigateToMatch`) still fetches the raw file from `public/BR_Data/` — one request, full fidelity.
- **Default scoping is a TAG filter, not a folder selection.** `BRDataSelector`'s `DEFAULT_SELECTION` is `'all'` — the tree stays fully selected — and `TagFilterSelector.computeDefaultFilters()` narrows the first view to `matchType: Season` plus the newest season number present. Tags are visible and self-describing, so a viewer sees at a glance that the data is scoped and how; a silently pre-selected folder looks like the whole dataset. **Do not reintroduce folder pre-selection.**
- The two selectors hand off through `tagFilterPaths` in `App.jsx`, and the three states are meaningful: `undefined` = TagFilterSelector has not reported yet, `null` = ready with no filter, array = matching paths. `BRDataSelector` **waits** while it is `undefined` and its initial-load branch deliberately does not call `onSelect`. Without that gate the tree would fire with all ~2,500 files before the default filter arrives and pull every shard, undoing Phase 1.5.

## `BR_Data/` and the tagging pipeline

`BR_Data/` is organized `Seasons/`, `Events/`, `Tests/`, each further split into subfolders (team/event names). Files land here via the Submit→Admin PR pipeline documented in root `CLAUDE.md`. On every build, `prebuild` (in `package.json`) runs, **in order**:
1. `scripts/autoTagMatches.js` — auto-tags each match file with `seasonNumber`, `seasonPhase`, `team`, `matchType`, `difficulty`, `matchSize` based on its path/content.
2. `scripts/generate-br-data-structure.js` — builds `public/br-data-structure.json`, the file tree `BRDataSelector` reads.
3. `scripts/generate-br-data-tags.js` — builds the tag index (`public/br-data-tags.json`) that `TagFilterSelector` filters against.
4. `scripts/generate-br-aggregates.js` — builds the compact match corpus in `public/br-aggregates/` (see above).

If match data looks stale/missing in the UI after adding files directly (rather than through a PR), re-run `npm run dev` (which triggers Vite) or manually run these three scripts — they don't run automatically on file save, only on build/prebuild.

Separately, `scripts/fix-json-encoding.js` (`npm run fix-json`) and `scripts/watch-br-data.js` handle encoding issues (UTF-16 LE / UTF-8 BOM) in submitted JSON — this also runs in CI (`.github/workflows/deploy.yml` and `.github/workflows/validate-json.yml`, see root `CLAUDE.md`). `scripts/br-data-api-server.js` and `scripts/generateCapsuleMetadata.js`/`src/config/capsuleMetadata.json` support local tooling — check their headers before assuming they run in the build.

## Reference data

Imports `characters.csv`/`capsules.csv` directly from `/referencedata/` at build time via Vite's `?raw` import (see root `CLAUDE.md` — **edit those files at the repo root, never the local `referencedata/` copy that `vite.config.js`'s `copy-shared-referencedata` plugin writes here**, it's overwritten on every build). `src/config/buildRules.js` and `src/config/capsule-rules.yaml` encode capsule-restriction/build-legality rules used by the synergy/AI-strategy analysis.

## Gotchas

- `@szl/ui` (aliased in `vite.config.js`) provides the shared `NavBar` — see `packages/ui/CLAUDE.md`.
- No test suite. Validate changes by running `npm run dev:analyzer` and checking the relevant view in the browser; for BR_Data/tagging changes, confirm the generated `public/br-data-*.json` files actually changed after a build.
