# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Scope

Battle Result Analyzer (`/analyzer/`) — statistics, per-character/per-form breakdowns, capsule synergy, and AI-strategy analysis over submitted match JSON data in `BR_Data/`. Part of the root npm workspace (Match Builder/Analyzer/Calculator) — install/build via the root `package.json` scripts. See root `CLAUDE.md` for the deploy pipeline, `referencedata/` sharing rules, and the Submit→Admin data submission pipeline that populates `BR_Data/`.

Dev: `npm run dev:analyzer` (repo root) → `:5173`. Build: `npm run build:analyzer`.

## ⚠️ Active redesign in progress

This app is mid-rewrite per **`docs/ANALYZER_REDESIGN_PLAN.md`** (audited and revised 2026-09-25) — read that file's **"What the Analyzer is for"** section (the product north star, including how the league's lineup → CPU-vs-CPU match loop works and the six design principles that break ties) and its "Progress" section before starting any analyzer work. Summary:
- **Phase 1 (Foundation): done.** `react-router-dom` is wired in `src/main.jsx` behind a single catch-all route (`<Route path="/*" element={<App />} />`) with `basename={import.meta.env.BASE_URL}`, so today's behavior is unchanged — real per-page routes don't exist yet. The **aggregation extraction is genuinely complete**: `src/utils/aggregation/` holds 3 files / 8 exports, `App.jsx` imports and calls them, and no duplicate definitions remain in `App.jsx`. Both loose ends are now closed: `src/routes.js` is imported by `main.jsx` and `App.jsx`, and router hooks are in use. `filteredAggregatedData` **has now been extracted** (see Phase 3 below). The dead `getPositionInsight` import was removed in Phase 1.5.
- **Phase 1.5 (Data layer): ✅ core complete.** The app no longer fetches ~2,232 files / ~67 MB on load — the default view is **2 requests / ~101 KB gzipped**. See "The compact match corpus" below. The one item deferred out of this phase, `filteredAggregatedData`, was extracted at the start of Phase 3.
- **Phase 2a (Tailwind + tokens + dependency cleanup): ✅ complete.** Real Tailwind v3 runs now; shared tokens live in `packages/ui/src/tokens.js`; `xlsx`, `@mui/x-tree-view`, `@mui/lab` and a duplicate `@vitejs/plugin-react` are gone. See "Styling: Tailwind and App.css coexist" below — **the CSS load order is load-bearing, read it before touching styles.**
- **Phase 2b (App.css teardown) is next**: retire the 2,062-line `App.css` and the 1,199 `darkMode` ternaries incrementally, per component, as pages get rebuilt — using Tailwind's `dark:` variant plus a `ThemeContext`. Then **2c** (responsive shell, accessibility, state persistence).
- **Phase 3 (Character page): routing and the Character page are done.** In order: the 695-line `filteredAggregatedData` `useMemo` came out of `App.jsx` into `src/utils/aggregation/filterAggregated.js` (body copied **verbatim**, behaviour unchanged, covered by `npm run verify-filters`), with `getPerformanceLevel` moved to `src/utils/performanceLevel.js`; then routing (see "Routing" below); then `src/pages/CharacterPage.jsx`, the first real page — see "The Character page" below. **Still to do in this phase: the share-snippet image card** (`<ShareButton>` copies a deep link today), plus the Advanced-tab build comparison and the querystring-driven character comparison the plan describes.
- **Character URLs are name slugs, decided 2026-09-26.** `/characters/android-13`, not `/characters/0620_00` — see "Character URLs are name slugs" below before touching anything that emits a character link.
- **Deep links now survive a refresh.** `scripts/build-404.js` generates the site-root `dist/404.html` with a dispatcher that redirects sub-app paths into the right app; `restoreDeepLink()` from `@szl/ui` (called at the top of `src/main.jsx`, before the router) puts the original URL back. This was the Phase 3 prerequisite. See the root `CLAUDE.md` for how it works, and note that **no dev server reproduces the Pages 404 rule** — use `node scripts/serve-dist.js` against a build to test deep links.
- **Phases 4–7 (Team/Match page rebuilds, stats-only Home page, Meta page consolidation, Sandbox polish, share-snippet image export): not started.**

Do the phases in order. Phase 1.5 precedes the design work so the new pages aren't built on a 67 MB page load; the `App.css` teardown is deliberately *not* a gate on page rebuilds.

## Current architecture (pre-redesign)

`src/App.jsx` is a 4,967-line monolith (`src/App.css` is 2,062): a `mode` (Reference Data / Manual Upload) × `viewType` (Single Match / Aggregated / Team Rankings / Data Tables / Meta Analysis) matrix, all rendered conditionally from one file, with ~30 `useState` hooks at the top of `App()`. The **13 presentational components that used to live inside it are now in `src/components/`** — see "Shared presentational components" below; do not define new ones in `App.jsx`. The aggregation functions have **all** been extracted to `src/utils/aggregation/` — including `filteredAggregatedData`, which became `filterAggregated.js` in Phase 3, so no aggregation math is inlined in this file any more. `src/pages/` now holds `CharacterPage.jsx`; `src/hooks/` does not exist yet and `src/api/` exists and is empty. Don't add new features by growing this file further; where practical, follow the redesign plan's target structure for anything new.

Theming is prop-drilled from a single `useState(true)` at `App.jsx:1315` through **1,199 `darkMode ? 'x' : 'y'` ternaries across `src/`** (704 in `App.jsx`). Styling is class-driven (1,125 `className=` vs 23 `style={{`), so Tailwind's `dark:` variant plus a `ThemeContext` is the planned replacement. There is **no `localStorage`/`sessionStorage` anywhere** — dark mode, filters and selection all reset on reload.

Reusable, already-decoupled pieces worth knowing about:
- `src/components/BRDataSelector.jsx` — file picker over `BR_Data/`. The tree is **hand-rolled**, not an MUI `TreeView` (`@mui/x-tree-view` and `@mui/lab` are declared dependencies but imported nowhere); it does use a handful of `@mui/material` components and icons.
- `src/components/TagFilterSelector.jsx` — syncs filters (season/team/matchType/difficulty/matchSize) to the query string through react-router's `useSearchParams`. It edits a **copy of the current params** and touches only its own keys, so it cannot clobber query state owned by anything else, and it writes only on a real difference so `setSearchParams` cannot loop. It uses `replace: true`, keeping filter tweaks out of the back-button history. It filters against `br-data-tags.json` with zero match fetches — lean on that for the Matches browser.
- `src/components/Combobox.jsx` / `MultiSelectCombobox.jsx`, `DataTable.jsx` / `TableConfigs.jsx` / `ExportManager.jsx` (Excel export), `PerFormStatsDisplay.jsx`.
- `src/components/ai-strategy/*` (7 components) and `src/components/capsule-synergy/*` (including `BuildAnalyzerTool`) — the "Meta Analysis" feature set, planned to consolidate into one Meta/Builds page in Phase 6.

## Styling: Tailwind and App.css coexist (read before touching styles)

Real Tailwind v3 runs here as of Phase 2a, **alongside** the legacy `App.css`. The arrangement is deliberate and fragile in one specific way:

- `src/main.jsx` imports `src/index.css` **before** `App.jsx` pulls in `App.css`. **Do not reorder those imports.** `App.css` hand-rolls 713 utility classes, 123 of which share a name with a class Tailwind generates, and some differ in ways that change rendering — `.gap-4` is `0.6rem` here vs Tailwind's `1rem`, `.max-w-4xl`/`.max-w-7xl` add `margin: 0 auto`, `.border-b`/`.border-l-2` carry an explicit `border-style`, and several violet/teal shades use different hex values. Tailwind emitting first means `App.css` wins every tie, which is what keeps the existing UI looking identical.
- **Preflight is off** (`corePlugins.preflight: false` plus no `@tailwind base`), so border utilities do not behave as the Tailwind docs describe. Preflight normally sets `border-width: 0` on everything; without it, `border-width` keeps its CSS initial value of **`medium` (~3px) on every side**, hidden only because `border-style` defaults to `none`. Two rules follow:
  - **A full border** needs `border border-solid` — `border` alone draws nothing.
  - **A single side** needs `border-0 border-b border-solid` (or `-t`/`-l`/`-r`). **Without `border-0`, `border-solid` switches on all four sides** and `border-b` only narrows the bottom one, giving a 1px rule inside a ~3px box. That shipped once — every section heading, table row and the tab bar on the Character page rendered as a box — because an earlier version of this bullet said only "add `border-solid`". `border-0` is emitted before the side utilities in the built CSS, so the single side survives.
  - A bare `<button>` also keeps the UA's grey fill and border — state `bg-transparent border-0`, or an explicit background.

  Preflight turns on in Phase 2b once `App.css` is gone, at which point `border-0` becomes redundant but harmless.
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

**Tiers are Z/S/A/B/C (Z highest), absolute, and frozen at build time.** `scripts/generate-performance-bands.mjs` runs in `prebuild` and writes `src/config/performance-bands.json`, which is **committed on purpose** — a recalibration should appear as a reviewable diff, not drift silently between deploys. Basis: a rolling window of the last 2 seasons, Ultra difficulty only, all match types, no minimum match count. Read that script's header before changing any of those rules; each one was chosen against measured data.

Two modules, split for a reason: **`src/utils/tierScale.js`** holds the scale and imports nothing, so the generator can read it before its own output file exists; **`src/utils/performanceTier.js`** adds the generated cutoffs and `tierForScore()`. Merging them reintroduces a bootstrap cycle where the build cannot run on a clean checkout.

`src/components/TierPlate.jsx` renders the tier. The artwork is an SVG string built by `src/utils/tierPlateSvg.js`, which also exports `tierPillColors()` so the score pill is tinted from the **same** palette and cannot drift from the plate. **Never pass TierPlate a reference population** — that is the bug it was built to replace. For "how does this stat compare to what is on screen", `PerformanceIndicator`'s relative comparison is still correct.

Three plate states exist and must stay distinguishable: normal, **provisional** (thin sample, stays in colour), and **deselected** (a filter switched off, fully greyscale). They fold into the SVG's single `style` attribute — emitting a second `style=` is silently dropped by the HTML parser, which once left deselected plates in colour.

**The score pill is one component, and its colour is absolute.** `src/components/stats/PerformanceScoreBadge.jsx` renders every "Score: 105" in the app, tinted by `tierForScore` + `tierPillColors` — the same palette as the plate. It used to take an `allScores` prop and colour the score **relative to whatever else was on screen**, so the same character scoring 64 was green in one panel and orange in another, and a pill inside a 2-character match was graded against a single opponent. **Do not reintroduce `allScores`**; for "how does this stat compare to what is on screen", `PerformanceIndicator` is the right component and its relative colouring is still correct. Removing it made `allMatchScores`, `allCharScores` and `combatPerformanceScores` in `App.jsx` dead, along with a third hand-rolled copy of the pill; all are gone.

The leaderboard filter is **tier toggle buttons plus a two-thumb score range** (`src/components/RangeSlider.jsx`), combined with AND. Cutoff numbers are deliberately not shown in the UI; a tooltip explains the scale instead.

Z is the top tier, ahead of S — the Dragon Ball convention, not the generic S-at-the-top. Z keeps a blue slab with a red letter as the Dragon Ball Z mark; S→C follow the loot-rarity ramp (purple, gold, blue, grey). Red and blue-to-red slabs for Z were both tried and rejected — with a red letter there is too little separating the glyph from its own floor at small sizes. **Z's red is crimson (`#ff8fa0` / `#c8102e`, hue ~350°), not orange-red** — the earlier pair sat at ~8–20° and read as bronze at pill size, a warm metal rather than a top-tier mark. **The Z score pill is the one exception to "pill = tint of the plate"**: a dark crimson-black fill (`#2a1418`), a bright crimson ring (`#e0284a`) and a halo that slowly breathes, chosen after four rounds of side-by-side demos (flat, sheen, gold, embers, smouldering border, flame). `tierPillColors('Z')` returns the fill, ring and a resting glow; the breathing lives in `src/index.css` as `.szl-tier-pill-z`, applied via `tierPillClass(tier)`. **Every site that uses `tierPillColors()` must also use `tierPillClass()`**, or Z quietly stops breathing there; `smoke-character-page` checks the badge. Reduced motion keeps the resting glow. Each tier's `letter` pair does three jobs at once: the plate glyph's gradient, the pill's text colour (the light one) and the pill's border and background tint (the deep one), so judge any change on the plate **and** the pill, at real sizes.



**`src/utils/performanceScore.js` owns the damage-efficiency term.** Efficiency is damage dealt over damage taken, carries 25% of the score weight un-normalised, and is therefore unbounded. The codebase had **three different answers** for "what if nothing was taken?" — return raw damage (mixing units, a five-figure number where a single-digit ratio belongs), return a `999` sentinel, or return `avgDamage/1000`. All three could inflate a score into the hundreds of thousands on a narrow selection. `combatEfficiency(dealt, taken)` replaces all of them with one clamp at `EFFICIENCY_CAP = 5`, about 3x the highest ratio ever observed in league play.

It is a guard rail, **not** a rebalancing: on S0 in-season data real ratios run 0.26–1.73 (median 1.00), and 593 character/team entries across four corpus slices are identical before and after the change. **If the cap starts binding on real data, that is a signal worth investigating, not a number to raise.**

**Performance levels must never be measured against the filtered list.** `App.jsx`'s `performanceReference` memo is the population a character's level and stat bars are compared against. The rule: filters that change *which matches count* (team, AI strategy, map, build filters) define the field because they genuinely change each character's stats; filters that only change *what you are looking at* (performance level, character selection, the match-count window) must not. Measuring against the post-filter list made the levels self-referential — deselecting "Excellent" re-ranked whoever remained, so a character turned green without their score changing.

**`PERFORMANCE_LEVELS` in `performanceLevel.js` is the single source of the level names.** They are a contract shared by the badge switches, the style maps and the filter, and they drifted once already.

Phase 3 replaces all of this with **absolute Z/A/B/C/D cutoffs** calibrated from a rolling last-2-seasons, Ultra-only window — see `docs/ANALYZER_REDESIGN_PLAN.md` "Performance tiers". At that point no reference population is needed at all. Note the score formula is still **duplicated across ~15 sites in 8 files**; consolidating it is outstanding.

## Routing (read before adding a page)

`src/routes.js` is the **single definition of the URL scheme** and is now load-bearing: `main.jsx` builds its `<Route>` entries from it, and `App.jsx` derives which view to render from the pathname via `viewForPath()`.

- **`viewType` is not state any more — it comes from the URL.** `setViewType` was kept with the same name and signature but now navigates, so the existing call sites and the view dropdowns were untouched while every view became linkable, refreshable and shareable. Don't reintroduce a `useState` for it.
- App still renders every view itself, apart from the Character page. These routes make that switch addressable; splitting the remaining views into per-route pages happens in Phases 4–6 and **does not change the paths**.
- **The trailing `path="*"` catch-all is deliberate.** An unknown or stale URL renders the app rather than a blank page, which matters because links to this app get pasted into Discord and outlive whatever scheme was current when they were posted.
- **`/characters/:charParam` canonicalises.** A raw id is accepted forever, but if that character has a slug the URL is rewritten to it with `replace: true`, so what a viewer copies out of the address bar is the legible form. See "Character URLs are name slugs" below.
- **`npm run verify-routes`** (`scripts/verify-routes.mjs`, in `prebuild`) asserts every view round-trips through its path, that a prefix like `/charactersomething` is not mistaken for the `/characters` section, that malformed input falls back instead of throwing, and that a match id — a file path containing spaces and slashes — encodes to a **single** URL segment. A mistake here does not crash; it quietly shows the wrong view.

## Shared presentational components (read before building any page)

`StatBar`, `PerformanceIndicator`, `PerformanceScoreBadge`, `StatGroup`, `MetricDisplay`, `BlastMetricDisplay`, `BattleTimeVariance`, `BuildYamlButtons`, `BuildTypeTooltipWrapper`, `BuildTableView`, `BuildDisplay` and `MetaAnalysisContent` were all defined **inside `App.jsx`**, which meant they were unreachable from anywhere else. The first Character page reinvented the build display as a result, and shipped a worse version of something that already existed. They now live in:

- **`src/components/stats/`** (barrel: `index.js`) — the stat primitives.
- **`src/components/build/`** (barrel: `index.js`) — the build-display family, plus `buildYaml.js` (`generateBuildYaml`, `useCopyFeedback`).
- **`src/components/MetaAnalysisContent.jsx`** — the Meta Analysis block, which becomes the Meta page in Phase 6.

**`BuildTypeTooltipWrapper` is the canonical way to show a build**: a colour-coded build-type pill (`getBuildTypeColor`) with the cost breakdown on hover. Use it rather than writing another one. Note `buildComposition` is an object — `.label` is the display string.

The bodies moved **verbatim**; the only edit to any moved line was an `export ` prefix. Two things worth knowing about that move:

- **`parseCapsules` was deleted**, not moved — it was defined and never called.
- **`npm run smoke-character-page`** (`scripts/smoke-character-page.mjs`) renders the character page through `react-dom/server` against real corpus rows, across every layout and both themes, and prints a stack trace when it throws. `verify-character-page` checks the DATA contract and cannot catch a render bug; those surface in the browser as a **blank white page** with the real error buried in the console. It loads app modules through Vite’s SSR pipeline so aliases and `?raw` imports resolve as they do in a build, but imports React, react-dom and react-router **natively** — they are CommonJS, which Vite’s SSR runner cannot evaluate.
- **`React` is deliberately not whitelisted** in `verify-self-contained`. The automatic JSX runtime means JSX never names the identifier, but an explicit `React.useState(...)` or `React.Fragment` still needs the import. Whitelisting it once made that checker blind to exactly its own bug class: `useCopyFeedback` moved out of `App.jsx` still calling `React.useState`, which blanked both the character page and any expanded leaderboard row.
- **`npm run verify-self-contained`** (`scripts/verify-self-contained.mjs`, in `prebuild`) parses every file under `src/components/` and `src/pages/` and reports any identifier it references but does not import. This exists because **a Vite build does not catch that class of mistake**: a component that used to reach something `App.jsx` imported becomes a runtime `ReferenceError` on whichever path touches it, so a rarely expanded panel could stay broken indefinitely. It globs rather than reading a list, so it cannot fall behind as Phases 4–6 move more components out.

## The Character page (`src/pages/CharacterPage.jsx`)

The first real page of the redesign, behind `/characters/<name-slug>`. `src/pages/` exists now; this is its only occupant.

- **It is purely presentational.** Every number comes from an aggregated row that `characterAggregation.js` already computed — nothing is recalculated here. A wrong stat is an upstream bug.
- **`App.jsx` renders it in place of the leaderboard** when `deepLinkedCharacter` resolves; both aggregated sections are gated on `!deepLinkedCharacter`. App still owns data loading, so the page takes everything as props.
- **Three files**: `CharacterPage.jsx` owns the four states and nothing else, `character/CharacterBlocks.jsx` holds the content with no opinion about arrangement, and `character/CharacterTabs.jsx` arranges it. **Tabs were chosen** over a dense single column and a sticky-rail variant, which were built alongside and compared with real data — tabs won on navigation and, more importantly, on extensibility: a new kind of analysis becomes a new tab rather than another band competing for space. `TABS` in that file is a plain registry; adding one means a row there and a case in the panel switch.
- **A shared link always lands on Overview.** The active tab is component state, not URL state, so "look at this character's builds" is not currently linkable — a real cost given these URLs exist to be pasted. Putting the tab in the query string is the fix if it starts to matter.
- **Rank comes from `performanceReference`, not `filteredAggregatedData`.** Same reasoning as the tiers: the population is defined by the filters that change *which matches count*, so "#12 of 107" means the same thing whatever the visitor has sorted or selected. The deep-link effect therefore **must not** set `selectedCharacters` — that would flatten the rank to #1 of 1.
- **Four states, and the differences matter:** loading, empty-scope, not-found, and rendered (`reason` prop). **Do not infer loading from an empty list** — that was a bug: a tag filter matching no files (`S1 + Season` is empty today, since every Season 1 file is tagged `Test`) leaves the list empty forever, and the spinner never resolved. App decides from the real signals: `tagFilterPaths === undefined`, or files chosen with no `fileContent` yet.
- **The data scope is printed on the page**, built from the query string (`describeTagFilters()` in `TagFilterSelector.jsx`) rather than from component state — so the page's description of its scope and the link someone pasted come from the same source and cannot disagree.
- **Watch for object-valued fields.** `topBuilds[].buildComposition` is an object (`{ primary, label, type, breakdown }`) whose display string is `.label`, and `equippedCapsules[]` entries are objects carrying their own `.name`/`.capsule.cost` — **not** ids to look up. Both render as `[object Object]` or throw if treated as strings. Note this **depends on `capsuleMap` being populated**: with an empty one, `buildComposition` comes back as the string `'No Build'`, which is why the verifier below feeds the real lookups.
- **`npm run verify-character-page`** (`scripts/verify-character-page.mjs`) is the guard, and it exists because this page **cannot crash on missing data** — it renders an em dash, or `NaN`, or silently drops a section. It **scrapes the `character.<field>` reads out of the page source**, so the field list cannot drift from what ships, then asserts each one exists on real rows, that headline stats are finite on every row, that text-rendered fields are never objects, and that the `slug → id → name → row` join holds for every character in the corpus. Not in `prebuild` (it aggregates real shards, like `verify-filters`).

## `<ShareButton>` (`src/components/ShareButton.jsx`)

Copies an **absolute** link to the current view — origin + `BASE_URL` + pathname + query, the same `BASE_URL` `main.jsx` gives `BrowserRouter` as its basename. Relative paths are useless in a Discord message, which is the entire point of the URL scheme.

It shares the live location by default, query string included, so a scoped or filtered view travels with the link. `navigator.clipboard` needs a secure context and is absent over plain-HTTP LAN testing, so there is an `execCommand` fallback. **Image-card export is not built yet** — that is the remaining piece of the share-snippet goal.

## Team positions: Starter / Middle / Anchor

The league calls the first slot the **Starter**, never "Lead". **`src/utils/positions.js` is the single source** for every user-facing position label: `POSITION_NAMES`, `positionSlot()` and `positionLabel()`. It imports nothing, so aggregation code and build scripts can use it.

- The raw data stores position as a **number** (`matches[].position` is 1/2/3), while `primaryPosition` is a **word**. Anything that displays a position must go through `positionLabel()`, or a table shows "1 / 2 / 3" — which shipped once on the Character page.
- The app used to mix both names: Position Analysis, its table and the Excel export said "Lead"; `characterAggregation.js` and the team panel said "Starter". All now read `POSITION_NAMES`.
- **Key colour maps and lookups on the slot number, not the word.** `preparePositionData()` emits the label and the Position column colour-coded rows by matching that same string, so renaming one side alone would have silently uncoloured the rows. That map is now keyed by `positionSlot(value)`.
- `positionSlot()` still accepts `"Lead"`, so anything carrying the old word resolves rather than breaking.
- The team panel's richer ordinal model for 4v4/5v5 ("Second (Middle)", …) is separate and intentional; only its slot-1 name comes from here.
- `smoke-character-page` asserts slot 1 renders as Starter and fails if it is renamed back.

## Reference data

Imports `characters.csv`/`capsules.csv` directly from `/referencedata/` at build time via Vite's `?raw` import (see root `CLAUDE.md` — **edit those files at the repo root, never the local `referencedata/` copy that `vite.config.js`'s `copy-shared-referencedata` plugin writes here**, it's overwritten on every build). `src/config/buildRules.js` and `src/config/capsule-rules.yaml` encode capsule-restriction/build-legality rules used by the synergy/AI-strategy analysis.

## Gotchas

- `@szl/ui` (aliased in `vite.config.js`) provides the shared `NavBar` — see `packages/ui/CLAUDE.md`.
- No test suite. Validate changes by running `npm run dev:analyzer` and checking the relevant view in the browser; for BR_Data/tagging changes, confirm the generated `public/br-data-*.json` files actually changed after a build.
