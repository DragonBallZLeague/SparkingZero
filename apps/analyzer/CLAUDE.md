# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Scope

Battle Result Analyzer (`/analyzer/`) — statistics, per-character/per-form breakdowns, capsule synergy, and AI-strategy analysis over submitted match JSON data in `BR_Data/`. Part of the root npm workspace (Match Builder/Analyzer/Calculator) — install/build via the root `package.json` scripts. See root `CLAUDE.md` for the deploy pipeline, `referencedata/` sharing rules, and the Submit→Admin data submission pipeline that populates `BR_Data/`.

Dev: `npm run dev:analyzer` (repo root) → `:5173`. Build: `npm run build:analyzer`.

## ⚠️ Active redesign in progress

This app is mid-rewrite per **`docs/ANALYZER_REDESIGN_PLAN.md`** (audited and revised 2026-09-25) — read that file's **"What the Analyzer is for"** section (the product north star, including how the league's lineup → CPU-vs-CPU match loop works and the six design principles that break ties) and its "Progress" section before starting any analyzer work. Summary:
- **Phase 1 (Foundation): done.** `react-router-dom` is wired in `src/main.jsx` behind a single catch-all route (`<Route path="/*" element={<App />} />`) with `basename={import.meta.env.BASE_URL}`, so today's behavior is unchanged — real per-page routes don't exist yet. The **aggregation extraction is genuinely complete**: `src/utils/aggregation/` holds 3 files / 8 exports, `App.jsx` imports and calls them, and no duplicate definitions remain in `App.jsx`. One loose end remains: `src/routes.js` is **imported by nothing** (no router hooks are used anywhere in `src/`) — Phase 3 fixes that. `filteredAggregatedData` **has now been extracted** (see Phase 3 below). The dead `getPositionInsight` import was removed in Phase 1.5.
- **Phase 1.5 (Data layer): ✅ core complete.** The app no longer fetches ~2,232 files / ~67 MB on load — the default view is **2 requests / ~101 KB gzipped**. See "The compact match corpus" below. The one item deferred out of this phase, `filteredAggregatedData`, was extracted at the start of Phase 3.
- **Phase 2a (Tailwind + tokens + dependency cleanup): ✅ complete.** Real Tailwind v3 runs now; shared tokens live in `packages/ui/src/tokens.js`; `xlsx`, `@mui/x-tree-view`, `@mui/lab` and a duplicate `@vitejs/plugin-react` are gone. See "Styling: Tailwind and App.css coexist" below — **the CSS load order is load-bearing, read it before touching styles.**
- **Phase 2b (App.css teardown) is next**: retire the 2,062-line `App.css` and the 1,199 `darkMode` ternaries incrementally, per component, as pages get rebuilt — using Tailwind's `dark:` variant plus a `ThemeContext`. Then **2c** (responsive shell, accessibility, state persistence).
- **Phase 3 (Character page) started.** First step done: the 695-line `filteredAggregatedData` `useMemo` is out of `App.jsx` and into `src/utils/aggregation/filterAggregated.js`, with `getPerformanceLevel` moved to `src/utils/performanceLevel.js`. **The body was copied verbatim** — behaviour is unchanged — and `npm run verify-filters` now covers it. Still to do in this phase: real `<Route>` entries, importing `routes.js`, wiring `characterSlug.js`, moving `TagFilterSelector` to `useSearchParams`, and the Character page itself.
- **Character URLs are name slugs, decided 2026-09-26.** `/characters/android-13`, not `/characters/0620_00` — see "Character URLs are name slugs" below before building the Phase 3 Character page.
- **Deep links now survive a refresh.** `scripts/build-404.js` generates the site-root `dist/404.html` with a dispatcher that redirects sub-app paths into the right app; `restoreDeepLink()` from `@szl/ui` (called at the top of `src/main.jsx`, before the router) puts the original URL back. This was the Phase 3 prerequisite. See the root `CLAUDE.md` for how it works, and note that **no dev server reproduces the Pages 404 rule** — use `node scripts/serve-dist.js` against a build to test deep links.
- **Phases 3–7 (Character/Team/Match page rebuilds, stats-only Home page, Meta page, Sandbox polish, share-snippet image export): not started.**

Do the phases in order. Phase 1.5 precedes the design work so the new pages aren't built on a 67 MB page load; the `App.css` teardown is deliberately *not* a gate on page rebuilds.

## Current architecture (pre-redesign)

`src/App.jsx` is a 5,959-line monolith (`src/App.css` is 2,062): a `mode` (Reference Data / Manual Upload) × `viewType` (Single Match / Aggregated / Team Rankings / Data Tables / Meta Analysis) matrix, all rendered conditionally from one file, with ~30 `useState` hooks at the top of `App()`. **13 presentational components are still defined inside it** above `export default function App()` at line 1285 (`StatBar`:95, `PerformanceIndicator`:163, `StatGroup`:298, `MetricDisplay`:332, `BuildTableView`:710, `BuildDisplay`:1023, `MetaAnalysisContent`:1200, …) — moving those out is Phase 2c. The aggregation functions have **all** been extracted to `src/utils/aggregation/` — including `filteredAggregatedData`, which became `filterAggregated.js` in Phase 3, so no aggregation math is inlined in this file any more. `src/pages/` and `src/hooks/` do not exist yet; `src/api/` exists and is empty. Don't add new features by growing this file further; where practical, follow the redesign plan's target structure for anything new.

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
5. `scripts/verify-character-slugs.mjs` — guards the character URL scheme (see "Character URLs are name slugs" below). **Fails the build** on a slug collision.

If match data looks stale/missing in the UI after adding files directly (rather than through a PR), re-run `npm run dev` (which triggers Vite) or manually run these three scripts — they don't run automatically on file save, only on build/prebuild.

Separately, `scripts/fix-json-encoding.js` (`npm run fix-json`) and `scripts/watch-br-data.js` handle encoding issues (UTF-16 LE / UTF-8 BOM) in submitted JSON — this also runs in CI (`.github/workflows/deploy.yml` and `.github/workflows/validate-json.yml`, see root `CLAUDE.md`). `scripts/br-data-api-server.js` and `scripts/generateCapsuleMetadata.js`/`src/config/capsuleMetadata.json` support local tooling — check their headers before assuming they run in the build.

## Character URLs are name slugs (read before building the Character page)

Characters are addressed in URLs by a slug of their name, **not** by the internal CSV key: `/analyzer/characters/android-13`, not `/analyzer/characters/0620_00`. Deep links get shared in Discord, and `0620_00` (which is Android 13) tells the reader nothing.

- **`src/utils/characterSlug.js`** owns this. `buildCharacterSlugIndex(csvText)` returns `{ idToName, idToSlug, slugToId, collisions }`; `characterUrlKey(id, index)` gives the URL form; `resolveCharacterParam(param, index)` turns a URL param back into an id.
- **Raw ids still resolve, permanently.** This is not redundancy — a newly released character can appear in submitted match data *before* `referencedata/characters.csv` gains a row, and with no name there is no slug. The id route keeps that character reachable, displaying the raw key until the CSV catches up. It also protects links shared before any future rename.
- **The two namespaces provably cannot collide**: every id matches `CHARACTER_ID_PATTERN` (`^\d{4}_\d{2}$`) and no character name contains an underscore, so the dispatch is one regex test rather than a guess.
- **`npm run verify-slugs`** (`scripts/verify-character-slugs.mjs`, in `prebuild`) asserts slug uniqueness, namespace separation and a lossless `id -> slug -> id` round trip, and **fails the build** on a violation. All 241 characters currently pass with zero collisions. **Do not change `slugifyCharacterName()` without re-running it** — altering the algorithm silently rots every link already shared. A character in match data but missing from the CSV is a warning, not a failure.
- `src/routes.js` stays a pure path builder; `ROUTES.character()` takes the URL key, not an id. Phase 3 should **redirect a raw-id URL to its slug** so the canonical form lands in the address bar.
- Two related gotchas: `statCalculations.js:parseCharacterCSV` splits on the *first* comma (harmless — it only reads the id — but it is why slug parsing does not reuse it), and **47 named characters never appear in the corpus**, so build a `/characters` index from match data, not from the CSV, or it will list dead pages.

## `filterAggregatedData` (the extracted leaderboard filter)

`src/utils/aggregation/filterAggregated.js` filters and sorts the aggregated per-character rows. It was a 695-line `useMemo` inlined in `App.jsx`; the body was moved **verbatim** in Phase 3, so it carries the original behaviour exactly, quirks included.

- **Option defaults mirror `App.jsx`'s `useState` initial values**, not some other idea of "unfiltered" — `minMatches: 1`, `maxMatches: 999`, `sortBy: 'combatScore'`, and `performanceFilters` listing all five levels. The block skips the performance filter entirely unless between 1 and 4 levels are selected, so passing all five is what "off" means.
- Valid `sortBy` values are `combatScore`, `totalDamage`, `avgDamage`, `dps`, `efficiency`, `matches`, `name`. Anything else silently falls back to combat score.
- **`npm run verify-filters`** (`scripts/verify-filter-aggregated.mjs`) runs it over a real corpus shard: sorting in both directions for every key, the match-count window, character selection, purity (it must not mutate its input — the page calls it on every render), and junk input. It is **not** in `prebuild` because it aggregates a real shard and is slower than the other verifiers; run it when you change this function.
- It needs `node --import ./scripts/json-import-hook.mjs` because the aggregation modules `import` a `.json` file the way Vite allows but plain Node does not. The npm script already passes it.

**The five level strings are a contract.** `getPerformanceLevel` (`src/utils/performanceLevel.js`) returns exactly one of `excellent`, `good`, `average`, `below-average`, `poor`, and three groups of code key off them: the badge `switch`es and style maps in `App.jsx`, and the leaderboard's performance-filter chips. **Renaming one means updating every consumer.**

They disagreed until 2026-09-26: the filter UI stored the fourth level as `'below'` while the function returned `'below-average'`, so **19.8% of character rows (202 of 1,018 across all 15 shards) silently vanished as soon as a user deselected any performance level.** Fixed by moving the UI onto `'below-average'` — the function was right and had five consumers agreeing with it, the filter had one. `verify-filters` now asserts that the five levels **partition** the whole view, so no row is unreachable; that check is what catches this class of bug, and it is why a level rename cannot regress silently again.

## Performance scoring and tiers

**`src/utils/performanceScore.js` owns the damage-efficiency term.** Efficiency is damage dealt over damage taken, carries 25% of the score weight un-normalised, and is therefore unbounded. The codebase had **three different answers** for "what if nothing was taken?" — return raw damage (mixing units, a five-figure number where a single-digit ratio belongs), return a `999` sentinel, or return `avgDamage/1000`. All three could inflate a score into the hundreds of thousands on a narrow selection. `combatEfficiency(dealt, taken)` replaces all of them with one clamp at `EFFICIENCY_CAP = 5`, about 3x the highest ratio ever observed in league play.

It is a guard rail, **not** a rebalancing: on S0 in-season data real ratios run 0.26–1.73 (median 1.00), and 593 character/team entries across four corpus slices are identical before and after the change. **If the cap starts binding on real data, that is a signal worth investigating, not a number to raise.**

**Performance levels must never be measured against the filtered list.** `App.jsx`'s `performanceReference` memo is the population a character's level and stat bars are compared against. The rule: filters that change *which matches count* (team, AI strategy, map, build filters) define the field because they genuinely change each character's stats; filters that only change *what you are looking at* (performance level, character selection, the match-count window) must not. Measuring against the post-filter list made the levels self-referential — deselecting "Excellent" re-ranked whoever remained, so a character turned green without their score changing.

**`PERFORMANCE_LEVELS` in `performanceLevel.js` is the single source of the level names.** They are a contract shared by the badge switches, the style maps and the filter, and they drifted once already.

Phase 3 replaces all of this with **absolute Z/A/B/C/D cutoffs** calibrated from a rolling last-2-seasons, Ultra-only window — see `docs/ANALYZER_REDESIGN_PLAN.md` "Performance tiers". At that point no reference population is needed at all. Note the score formula is still **duplicated across ~15 sites in 8 files**; consolidating it is outstanding.

## Reference data

Imports `characters.csv`/`capsules.csv` directly from `/referencedata/` at build time via Vite's `?raw` import (see root `CLAUDE.md` — **edit those files at the repo root, never the local `referencedata/` copy that `vite.config.js`'s `copy-shared-referencedata` plugin writes here**, it's overwritten on every build). `src/config/buildRules.js` and `src/config/capsule-rules.yaml` encode capsule-restriction/build-legality rules used by the synergy/AI-strategy analysis.

## Gotchas

- `@szl/ui` (aliased in `vite.config.js`) provides the shared `NavBar` — see `packages/ui/CLAUDE.md`.
- No test suite. Validate changes by running `npm run dev:analyzer` and checking the relevant view in the browser; for BR_Data/tagging changes, confirm the generated `public/br-data-*.json` files actually changed after a build.
