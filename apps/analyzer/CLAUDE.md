# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Scope

Battle Result Analyzer (`/analyzer/`) — statistics, per-character/per-form breakdowns, capsule synergy, and AI-strategy analysis over submitted match JSON data in `BR_Data/`. Part of the root npm workspace (Match Builder/Analyzer/Calculator) — install/build via the root `package.json` scripts. See root `CLAUDE.md` for the deploy pipeline, `referencedata/` sharing rules, and the Submit→Admin data submission pipeline that populates `BR_Data/`.

Dev: `npm run dev:analyzer` (repo root) → `:5173`. Build: `npm run build:analyzer`.

## ⚠️ Active redesign in progress

This app is mid-rewrite per **`docs/ANALYZER_REDESIGN_PLAN.md`** (audited and revised 2026-09-25) — read that file's **"What the Analyzer is for"** section (the product north star, including how the league's lineup → CPU-vs-CPU match loop works and the six design principles that break ties) and its "Progress" section before starting any analyzer work. Summary:
- **Phase 1 (Foundation): done.** `react-router-dom` is wired in `src/main.jsx` behind a single catch-all route (`<Route path="/*" element={<App />} />`) with `basename={import.meta.env.BASE_URL}`, so today's behavior is unchanged — real per-page routes don't exist yet. The **aggregation extraction is genuinely complete**: `src/utils/aggregation/` holds 3 files / 8 exports, `App.jsx` imports and calls them, and no duplicate definitions remain in `App.jsx`. Both loose ends are now closed: `src/routes.js` is imported by `main.jsx` and `App.jsx`, and router hooks are in use. `filteredAggregatedData` **has now been extracted** (see Phase 3 below). The dead `getPositionInsight` import was removed in Phase 1.5.
- **Phase 1.5 (Data layer): ✅ core complete.** The app no longer fetches ~2,232 files / ~67 MB on load — the default view is **2 requests / ~101 KB gzipped**. See "The compact match corpus" below. The one item deferred out of this phase, `filteredAggregatedData`, was extracted at the start of Phase 3.
- **Phase 2a (Tailwind + tokens + dependency cleanup): ✅ complete.** Real Tailwind v3 runs now; shared tokens live in `packages/ui/src/tokens.js`; `xlsx`, `@mui/x-tree-view`, `@mui/lab` and a duplicate `@vitejs/plugin-react` are gone. See "Styling" below — **read it before touching styles.**
- **Phase 2b (App.css teardown): in progress.** Since 2026-09-28 Tailwind is authoritative: `App.css` is in the `legacy` cascade layer and today's look lives in the Tailwind theme (see "Styling" below). **The redesign restyles freely**: keeping the old look is not a goal, and the league has a list of styling fixes to bring. What remains is retiring `App.css` rules and the 1,199 `darkMode` ternaries as components are restyled. Then **2c** (responsive shell, accessibility, state persistence).
- **Phase 3 (Character page): routing and the Character page are done.** In order: the 695-line `filteredAggregatedData` `useMemo` came out of `App.jsx` into `src/utils/aggregation/filterAggregated.js` (body copied **verbatim**, behaviour unchanged, covered by `npm run verify-filters`), with `getPerformanceLevel` moved to `src/utils/performanceLevel.js`; then routing (see "Routing" below); then `src/pages/CharacterPage.jsx`, the first real page — see "The Character page" below. Its **Overview tab shipped 2026-09-28** to the approved design, with the one-build `?build=` filter. **Still to do in this phase:** the other tabs' visual design, the share-snippet image card (`<ShareButton>` copies a deep link today), plus the Advanced-tab build comparison and the querystring-driven character comparison the plan describes.
- **The app-wide visual direction was decided on 2026-09-28.** Read "Visual direction" in the plan before designing or restyling any page. In short:
  - a tab row and a one-line sticky scope bar replace the mode and view panels
  - one level of flat panels, with nothing boxed inside a section
  - rows, not cards, for anything compared
  - colour only where it has a job, with plain numbers white
  - medium density, with dense tables
  - phone-first for the pages people view, and desktop-first for power tools
  - a tier-list view beside the leaderboard
  - character portraits, resized at build time from the Calculator's face icons

  **The page-by-page review followed the same day** ("Page-by-page review" in the plan). It says what every page holds:
  - Home becomes a dashboard, and the Team page is new.
  - Matches becomes a filterable list instead of the file tree.
  - Meta gains a league-wide Builds table, where capsules always show as the one-column list.
  - The Data Tables page goes, but the full Excel workbook stays in the scope bar.
  - Team names show the website's spelling through a shared list, while tags and `BR_Data` folders keep their names.

  The real-data demo of the shell, the Characters table, the tier list and the Meta Builds table is in `design/shell-demo/`. It is plain HTML generated from the app's own aggregation (see its README). The league reviewed it on 2026-09-28, and the verdict is in the plan under "Settled on the demo". In short: Builds use compact rows with the capsule list beside them, scores are tier pills in every table, filter chips are multi-select, and **win % is a team measure**, so for characters and builds it goes last and is never a default. The demo is a throwaway, like the Overview demo before it. Every page it shows is now built to it, the Meta Builds table last. Delete it once the league has signed the real pages off.
- **Phase 2c's shell and the Characters page are built (2026-09-28)**, to the demo. See "The shell" and "The Characters and Home pages" below:
  - The section tabs and the sticky, multi-select scope bar replaced the Analysis Mode and View Type panels, the tag-filter panel and the file tree.
  - Data now loads from the scope in the URL.
  - `/characters` is a table with a tier-list view.
  - `/` is Home, whose first cut is the tier list.
  - The single-match viewer moved to `/matches`, and the Sandbox (uploads) lives at `/sandbox/...`.
  - Portraits are in `public/portraits/`.
  - Matches and the Data Tables view still render their old panels inside the new shell until their rebuilds.
  - `/teams` is a table and `/teams/<slug>` the new Team page (Roster · Lineups · Opponents · Matches), with the website's team names and logos from `referencedata/teams.json`. See "The Teams and Team pages" below.
  - `/meta` is built too: the league-wide Builds table (layout A), with the old AI strategy and capsule analyses behind its other two tabs. See "The Meta page" below.
- **Character URLs are name slugs, decided 2026-09-26.** `/characters/android-13`, not `/characters/0620_00` — see "Character URLs are name slugs" below before touching anything that emits a character link.
- **Deep links now survive a refresh.** `scripts/build-404.js` generates the site-root `dist/404.html` with a dispatcher that redirects sub-app paths into the right app; `restoreDeepLink()` from `@szl/ui` (called at the top of `src/main.jsx`, before the router) puts the original URL back. This was the Phase 3 prerequisite. See the root `CLAUDE.md` for how it works, and note that **no dev server reproduces the Pages 404 rule** — use `node scripts/serve-dist.js` against a build to test deep links.
- **Phases 4–7 (Team/Match page rebuilds, stats-only Home page, Meta page consolidation, Sandbox polish, share-snippet image export): not started**, apart from Home's first cut (the tier list) and the Sandbox moving to `/sandbox`, both done with the shell, the Meta page's Builds tab, and Phase 4's Teams table and Team page.

Do the phases in order. Phase 1.5 precedes the design work so the new pages aren't built on a 67 MB page load; the `App.css` teardown is deliberately *not* a gate on page rebuilds.

## Current architecture (pre-redesign)

`src/App.jsx` is a ~3,340-line monolith (4,967 before the shell rebuild removed the old panels, the card leaderboard and Position Analysis; `src/App.css` is 2,062). It is a `mode` × `viewType` matrix rendered conditionally from one file, with ~30 `useState` hooks at the top of `App()`. **Both come from the URL now**:
- `viewType` (home / aggregated / teams / single / tables / meta) comes through `viewForPath()`.
- `mode` is `'manual'` under `/sandbox` and `'reference'` elsewhere (`isSandboxPath()`).

The **13 presentational components that used to live inside it are now in `src/components/`** — see "Shared presentational components" below; do not define new ones in `App.jsx`. The aggregation functions have **all** been extracted to `src/utils/aggregation/` — including `filteredAggregatedData`, which became `filterAggregated.js` in Phase 3, so no aggregation math is inlined in this file any more. `src/pages/` holds `CharacterPage.jsx`, `CharactersPage.jsx`, `HomePage.jsx`, `MetaPage.jsx`, `TeamsPage.jsx` and `TeamPage.jsx`, and `src/shell/` the tab row, scope bar and their hooks. `src/api/` exists and is empty. Don't add new features by growing this file further; where practical, follow the redesign plan's target structure for anything new.

Theming is prop-drilled from a single `useState(true)` at `App.jsx:1315` through **1,199 `darkMode ? 'x' : 'y'` ternaries across `src/`** (704 in `App.jsx`). Styling is class-driven (1,125 `className=` vs 23 `style={{`), but **light mode was removed on purpose** (see "Styling"), so collapsing each ternary to its dark branch is the simplest replacement. The new shell and pages are dark-only and take no `darkMode` prop. The one use of `localStorage` is the phone Characters table's two column choices, a per-viewer convenience. Everything a link should carry is in the query string.

Reusable, already-decoupled pieces worth knowing about:
- `src/components/BRDataSelector.jsx` — the old file picker over `BR_Data/`. **Nothing renders it any more**: the scope bar decides what loads. It retires with the Matches list, together with MUI, which only it uses (the plan's Phase 4). `scripts/generate-br-data-structure.js` and `public/br-data-structure.json` exist only for it.
- `TagFilterSelector.jsx` was **deleted** on 2026-09-28. Its tag-filter logic, URL format and current-season default live on in `src/shell/scopeModel.js` and `useScope.js` (see "The shell").
- `src/components/Combobox.jsx` / `MultiSelectCombobox.jsx`, `DataTable.jsx` / `TableConfigs.jsx` / `ExportManager.jsx` (Excel export), `PerFormStatsDisplay.jsx`.
- `src/components/ai-strategy/*` (7 components) and `src/components/capsule-synergy/IndividualCapsulePerformance.jsx`: the "Meta Analysis" feature set. `MetaPage.jsx` shows `AIStrategyAnalysis` and `CapsuleSynergyAnalysis` as its AI strategies and Capsules tabs, unchanged; flattening them is still to do.
  - The Build Analyzer and Synergy Pairs views never shipped, and their files were deleted on 2026-09-28.
  - Their logic stays, unused, for a later look at build recommendations: `utils/buildRecommendationEngine.js`, `config/buildRules.js`, `utils/capsuleEffectParser.js`, and the pair-synergy functions in `utils/capsuleSynergyCalculator.js`.
  - `ExportManager.jsx` and `ai-strategy/AIStrategyCard.jsx` are unused too.

## Styling (read before touching styles)

**What to build towards is "Visual direction" in `docs/ANALYZER_REDESIGN_PLAN.md`.** This section covers the mechanics of styling.

**Tailwind is the styling authority; `App.css` is legacy that always loses.** Since 2026-09-28 everything in `App.css` is inside `@layer legacy { … }`. In CSS an unlayered rule beats a layered one whatever the selector's specificity or the load order, and Tailwind (`src/index.css`) is unlayered. So any Tailwind class wins over `App.css`. `App.css` only styles what no Tailwind class on an element touches, and import order no longer matters.

- **Why it changed:** `App.css` used to load after Tailwind and win every tie. That preserved the old look, but it also meant `grid-cols-2 sm:grid-cols-5` stayed two columns at every width and `hidden sm:inline-flex` never showed, since `App.css`'s base class beat Tailwind's responsive variant. The Character page Overview hit both. The league wants the redesign to restyle freely, so new styling must never lose to old CSS.
- **Today's look is in `tailwind.config.js`, not `App.css`.** `App.css` ended with a "modern redesign layer" that re-skinned the app by redefining Tailwind's own class names. Its values are now theme entries:
  - radii (`rounded-lg/xl/2xl` = 0.875/1.125/1.5rem)
  - soft `shadow-lg/xl/2xl`
  - the navy surfaces (`bg-gray-800` `#1e2434`, `bg-gray-700` `#2b3245`)
  - the shell palette (`shell-panel` `#1a2031`, `shell-pop` `#222a3b`, `shell-track` `#262e40`, `shell-fill` `#56627a`). **Every page's panel is `bg-shell-panel`** with `border-gray-700`, `rounded-[10px]`: the redesigned pages, the Character page and the old pages' outer panels alike, so the site reads as one surface. Menus and tooltips sit on `shell-pop`, bars and rings use `shell-track`, and muted text is slate (`text-slate-400`, `-500`), not gray. `bg-gray-800` is the chip colour, not a panel colour.
  - the faint hairline `border-gray-700` (slate at 18%; its alpha is scaled, so `border-gray-700/60` is still fainter, not brighter)
  - display letter-spacing on `text-2xl`–`4xl`
  - the page column, `max-w-page` (1352px), set as `px-4 sm:px-6` outside and `max-w-page mx-auto` inside by the tab row, the scope bar and App's page wrapper, so all three edges line up. It is the shell demo's 1400px column with its 24px gutter (16px on a phone). It replaced a fluid `max-w-7xl` up to 1760px, which spread a table row too wide to read across on a big monitor.

  **Restyle by changing those values, or the classes in components.** Never by adding rules to `App.css`.
- **The font is the system UI font**, set on `body` in `src/index.css`: Segoe UI on Windows, Roboto on Android, San Francisco on Apple, as the shell demo and the website render. Inter from Google Fonts was dropped on 2026-09-28. **Form controls inherit the family** from the same file. Without preflight they would not, and buttons rendered in Arial beside system-font text.
- **Phone density lives in `src/index.css`**, after the utilities. Under 640px, `p-6`, `p-4`, `gap-6`, `gap-4`, `mb-6` and `text-xl`–`4xl` tighten app-wide. It is carried over from `App.css`'s phone pass and is deliberate; delete it in one go if the restyle moves to per-component `sm:` classes. The phone pass's other rule, collapsing every 3–5 column grid to two, was not carried over: grids say `grid-cols-2 sm:grid-cols-N` themselves.
- **Checking style work: `scripts/dev/`** (see its README). `npm run shot` screenshots a served page at any width, including after opening the build picker, switching to Bars or hovering a tooltip. `npm run css-diff` compares every element's computed style between two builds, view by view, and groups the changes by cause. The switch to Tailwind-first was checked with it across every view at 1280px and 390px. Run it before merging any sweeping style change: screenshots miss small shifts, and computed styles cannot judge a layout.
- **Preflight is off** (`corePlugins.preflight: false` plus no `@tailwind base`), so border utilities do not behave as the Tailwind docs describe. Preflight normally sets `border-width: 0` on everything; without it, `border-width` keeps its CSS initial value of **`medium` (~3px) on every side**, hidden only because `border-style` defaults to `none`. Three rules follow:
  - **A full border** needs `border border-solid` — `border` alone draws nothing.
  - **A single side** needs `border-0 border-b border-solid` (or `-t`/`-l`/`-r`). **Without `border-0`, `border-solid` switches on all four sides** and `border-b` only narrows the bottom one, giving a 1px rule inside a ~3px box. That shipped once — every section heading, table row and the tab bar on the Character page rendered as a box — because an earlier version of this bullet said only "add `border-solid`". `border-0` is emitted before the side utilities in the built CSS, so the single side survives.
  - A bare `<button>` also keeps the UA's grey fill and border — state `bg-transparent border-0`, or an explicit background.

  Preflight turns on once `App.css` is gone, at which point `border-0` becomes redundant but harmless.
- **Dark is the only theme.** The user removed light mode on purpose on 2026-09-05 (commit `8e816462`): it was harsh and hard to read, and it is not planned to return. `darkMode` is `useState(true)` in `App.jsx` and `setDarkMode` has no caller, **by design, not a bug**. Components still take a `darkMode` prop and render both themes (the smoke test covers both), but only dark needs visual review.
- **Design tokens come from `packages/ui/src/tokens.js`** (CommonJS, shared by all four apps). Canonical accent is `#f97316`. Legacy names (`dragon-*` here, `dbz.*` on the website, `sz-*` on the calculator) are aliases onto the shared values — prefer `brand.*` in new work.
- `App.css` repurposes Tailwind's real `bg-gradient-to-br` class name to mean one specific gradient. Tailwind's real class now wins, but its only user is the **light-mode** root background (`App.jsx`, the `darkMode` ternary on the root `div`), which nothing renders any more. Delete both with the light-mode branches rather than reviving it.

## The compact match corpus (`public/br-aggregates/`)

This is how match data reaches the client. **Do not add code that fetches `BR_Data/` files in bulk** — that is the pattern Phase 1.5 removed.

- `scripts/generate-br-aggregates.js` (prebuild, after `generate-br-data-tags.js`; also `npm run build-aggregates`) writes 15 shards — one per `BR_Data/<Top>/<Sub>` folder — plus `index.json`. 2,497 matches, 68.5 MB → 14.6 MB; the Season 0 shard is 1.17 MB raw / ~101 KB gzipped.
- **Shards keep the original match JSON shape** (`TeamBattleResults.battleResult.characterRecord`), with every field no consumer reads stripped out. That is deliberate: `statCalculations.js` and `utils/aggregation/*` consume a shard **unchanged**. `runBlastCount` is pre-summed into a synthetic dict whose keys still satisfy `extractStats`' `includes()` checks, and `attackHitCount` (~230 per-move codes) is replaced by `battleCount.styleHits` — rush / heavy / ki-blast hits, classified by the shared `src/utils/actionCodes.js` that `extractStats` also applies to raw files. The corpus is version 2 (`CORPUS_VERSION` in the generator, `EXPECTED_CORPUS_VERSION` in `src/utils/corpusLoader.js` — bump both together).
- **If you make anything read a new raw field, add it to the keep-lists in the generator**, or it will silently read `undefined` from a shard. Then re-run `npm run verify-aggregates` (`scripts/verify-br-aggregates.mjs`): it compares raw vs compact field-by-field and runs the real `extractStats()` over both sides for all 2,497 matches / 11,914 character entries. It currently passes; treat a failure as a blocker, since a dropped field corrupts published statistics rather than crashing.
- `src/utils/corpusLoader.js` (`loadMatches`) does the client-side loading, falling back to per-file fetches if the corpus is missing, version-mismatched, or lacks a requested match. Single-match navigation (`handleNavigateToMatch`) still fetches the raw file from `public/BR_Data/` — one request, full fidelity.
- **What loads is the scope, a TAG filter in the URL.** `shell/useScope.js` reads it and turns it into match paths through `public/br-data-tags.json`, with no match fetches. `shell/useScopedMatches.js` hands those paths to `loadMatches`. `defaultScope()` gives a scope-less league URL `matchType: Season` plus the newest season with league matches. Tags are visible and self-describing, so a viewer sees at a glance that the data is scoped and how; a silently pre-selected folder looks like the whole dataset. **Do not reintroduce folder pre-selection.**
- **Nothing may load before the scope is final.** `useScope` reports `ready` only once the tag index is in and the URL has a scope, the default having been written in if needed. `paths` stays `null` until then, and `useScopedMatches` loads nothing for `null`. Without that gate the first render would load all ~2,500 matches and pull every shard, undoing Phase 1.5. (The old file tree needed the same gate, through a three-state `tagFilterPaths`.)

## `BR_Data/` and the tagging pipeline

`BR_Data/` is organized `Seasons/`, `Events/`, `Tests/`, each further split into subfolders (team/event names). Files land here via the Submit→Admin PR pipeline documented in root `CLAUDE.md`. On every build, `prebuild` (in `package.json`) runs, **in order**:
1. `scripts/autoTagMatches.js` — auto-tags each match file with `seasonNumber`, `seasonPhase`, `team`, `matchType`, `difficulty`, `matchSize` based on its path/content.
2. `scripts/generate-br-data-structure.js` — builds `public/br-data-structure.json`, the file tree `BRDataSelector` reads (no longer rendered; see above).
3. `scripts/generate-br-data-tags.js` — builds the tag index (`public/br-data-tags.json`) that the scope bar filters against (`src/shell/scopeModel.js`).
4. `scripts/generate-br-aggregates.js` — builds the compact match corpus in `public/br-aggregates/` (see above).
5. `scripts/verify-character-slugs.mjs` — guards the character URL scheme (see "Character URLs are name slugs" below). **Fails the build** on a slug collision.
6. `scripts/verify-portraits.mjs` — warns (never fails) about any character in `characters.csv` without a portrait in `public/portraits/` or its 192px cut in `public/portraits/192/` (see "The Characters and Home pages").

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
- **A build is `buildKey()` in `src/utils/buildKey.js`** — the exact capsule set plus the AI strategy — and every build table, build filter and aggregation grouping uses it (it had been written out by hand in six places). Its `buildCode()` makes the short code for `?build=` links; a code is always resolved against one character's own builds with `findBuildByCode()`, never globally. `verify-character-page` checks that no two builds of one character share a code across every real build.

**The five level strings are a contract.** `getPerformanceLevel` (`src/utils/performanceLevel.js`) returns exactly one of `excellent`, `good`, `average`, `below-average`, `poor`, and three groups of code key off them: the badge `switch`es and style maps in `App.jsx`, and the leaderboard's performance-filter chips. **Renaming one means updating every consumer.**

They disagreed until 2026-09-26: the filter UI stored the fourth level as `'below'` while the function returned `'below-average'`, so **19.8% of character rows (202 of 1,018 across all 15 shards) silently vanished as soon as a user deselected any performance level.** Fixed by moving the UI onto `'below-average'` — the function was right and had five consumers agreeing with it, the filter had one. `verify-filters` now asserts that the five levels **partition** the whole view, so no row is unreachable; that check is what catches this class of bug, and it is why a level rename cannot regress silently again.

## Performance scoring and tiers

**Tiers are Z/S/A/B/C (Z highest), absolute, and frozen at build time.** `scripts/generate-performance-bands.mjs` runs in `prebuild` and writes `src/config/performance-bands.json`, which is **committed on purpose** — a recalibration should appear as a reviewable diff, not drift silently between deploys. Basis: a rolling window of the last 2 seasons, Ultra difficulty only, all match types, no minimum match count. Read that script's header before changing any of those rules; each one was chosen against measured data.

Two modules, split for a reason: **`src/utils/tierScale.js`** holds the scale and imports nothing, so the generator can read it before its own output file exists; **`src/utils/performanceTier.js`** adds the generated cutoffs and `tierForScore()`. Merging them reintroduces a bootstrap cycle where the build cannot run on a clean checkout.

`src/components/TierPlate.jsx` renders the tier. The artwork is an SVG string built by `src/utils/tierPlateSvg.js`, which also exports `tierPillColors()` so the score pill is tinted from the **same** palette and cannot drift from the plate. **Never pass TierPlate a reference population** — that is the bug it was built to replace. For "how does this stat compare to what is on screen", `PerformanceIndicator`'s relative comparison is still correct.

Three plate states exist and must stay distinguishable: normal, **provisional** (thin sample, stays in colour), and **deselected** (a filter switched off, fully greyscale). They fold into the SVG's single `style` attribute — emitting a second `style=` is silently dropped by the HTML parser, which once left deselected plates in colour.

**The score pill is one component, and its colour is absolute.** `src/components/stats/PerformanceScoreBadge.jsx` renders every "Score: 105" in the app, tinted by `tierForScore` + `tierPillColors` — the same palette as the plate. It used to take an `allScores` prop and colour the score **relative to whatever else was on screen**, so the same character scoring 64 was green in one panel and orange in another, and a pill inside a 2-character match was graded against a single opponent. **Do not reintroduce `allScores`**; for "how does this stat compare to what is on screen", `PerformanceIndicator` is the right component and its relative colouring is still correct. Removing it made `allMatchScores`, `allCharScores` and `combatPerformanceScores` in `App.jsx` dead, along with a third hand-rolled copy of the pill; all are gone.

The leaderboard filter is **tier toggle buttons plus a two-thumb score range** (`src/components/RangeSlider.jsx`), combined with AND. Cutoff numbers are deliberately not shown in the UI; a tooltip explains the scale instead.

Z is the top tier, ahead of S — the Dragon Ball convention, not the generic S-at-the-top. Z keeps a blue slab with a red letter as the Dragon Ball Z mark; S→C follow the loot-rarity ramp (purple, gold, blue, grey). Red and blue-to-red slabs for Z were both tried and rejected — with a red letter there is too little separating the glyph from its own floor at small sizes. **Z's red is crimson (`#ff8fa0` / `#c8102e`, hue ~350°), not orange-red** — the earlier pair sat at ~8–20° and read as bronze at pill size, a warm metal rather than a top-tier mark. **The Z score pill is the one exception to "pill = tint of the plate"**: a dark crimson-black fill (`#2a1418`), a bright crimson ring (`#e0284a`) and a halo that slowly breathes, chosen after four rounds of side-by-side demos (flat, sheen, gold, embers, smouldering border, flame). `tierPillColors('Z')` returns the fill, ring and a resting glow; the breathing lives in `src/index.css` as `.szl-tier-pill-z`, applied via `tierPillClass(tier)`. **Every site that uses `tierPillColors()` must also use `tierPillClass()`**, or Z quietly stops breathing there; `smoke-character-page` checks the badge. Reduced motion keeps the resting glow. Each tier's `letter` pair does three jobs at once: the plate glyph's gradient, the dark-theme pill's text colour (the light one) and its border and background tint (the deep one), so judge any change on the plate **and** the pill, at real sizes. **The pill is theme-aware: `tierPillColors(tier, darkMode)`, and every caller must pass `darkMode`.** It used to take no theme, and on a white page the light letter colour measured 1.0–1.1:1 contrast — S/A/B/C pills were effectively blank in light mode. Light mode writes in the tier's deep **plate** colour on a faint tint of it (the deep letter colour is still too bright for gold on white); Z keeps its dark fill in both themes. `smoke-character-page` measures WCAG text contrast of every tier's pill against its own tinted background in both themes and fails below 4.5:1 — the older "distinct colour per tier" check passed the whole time light mode was broken.



**`src/utils/performanceScore.js` owns the damage-efficiency term.** Efficiency is damage dealt over damage taken, carries 25% of the score weight un-normalised, and is therefore unbounded. The codebase had **three different answers** for "what if nothing was taken?" — return raw damage (mixing units, a five-figure number where a single-digit ratio belongs), return a `999` sentinel, or return `avgDamage/1000`. All three could inflate a score into the hundreds of thousands on a narrow selection. `combatEfficiency(dealt, taken)` replaces all of them with one clamp at `EFFICIENCY_CAP = 5`, about 3x the highest ratio ever observed in league play.

It is a guard rail, **not** a rebalancing: on S0 in-season data real ratios run 0.26–1.73 (median 1.00), and 593 character/team entries across four corpus slices are identical before and after the change. **If the cap starts binding on real data, that is a signal worth investigating, not a number to raise.**

**Performance levels must never be measured against the filtered list.** `App.jsx`'s `performanceReference` memo is the population a character's level and stat bars are compared against. The rule: filters that change *which matches count* (team, AI strategy, map, build filters) define the field because they genuinely change each character's stats; filters that only change *what you are looking at* (performance level, character selection, the match-count window) must not. Measuring against the post-filter list made the levels self-referential — deselecting "Excellent" re-ranked whoever remained, so a character turned green without their score changing.

**`PERFORMANCE_LEVELS` in `performanceLevel.js` is the single source of the level names.** They are a contract shared by the badge switches, the style maps and the filter, and they drifted once already.

Phase 3 replaces all of this with **absolute Z/A/B/C/D cutoffs** calibrated from a rolling last-2-seasons, Ultra-only window — see `docs/ANALYZER_REDESIGN_PLAN.md` "Performance tiers". At that point no reference population is needed at all. Note the score formula is still **duplicated across ~15 sites in 8 files**; consolidating it is outstanding.

## The Character page's league reference (`src/config/style-baseline.json`)

Every rank and "League" number on the Character page Overview (`#12/126`, the league median on a tile, a style's rank) is measured against a **frozen** reference, not against whatever is filtered on screen, for the same reason the tier cutoffs are frozen: a rank that moves when a filter changes is not a rank.

- **Built by `scripts/generate-style-baseline.mjs`** (in prebuild, after the tier bands; `npm run build-style-baseline`) over the **same window as the tier cutoffs**, `scripts/calibration-basis.mjs`, which both generators share: last two seasons, Ultra only. The pool is characters with 5+ appearances (126 today). It stores every pooled character's value per figure, sorted (a rank needs the whole distribution), plus the medians and 95th percentiles the page shows. Committed; rewritten only when the reference actually changes.
- **`src/utils/characterOverview.js` computes a character's figures** from its per-match rows, and the generator runs that **same code** over the whole pool, so a character and the league are measured identically. `overviewFromMatches(matches)` works on all of a character's matches or on one build's (the build filter), and `placeOverview(overview, baseline)` gives `{ pct, rank, pool }`. A single build is ranked against the same reference: where it would place among the characters.
- **Values are rounded to 4 decimals on both sides** (`round4`) before a rank is taken, so a character is never ranked against a rounded copy of itself that sorts a hair below it.
- **Fusions: one rule everywhere, set by the league (2026-09-29).** From the moment a character fuses with a teammate, everything it does is split half and half between it and that partner, in every per-character figure: the leaderboard, the Character page, the team figures and roster, positions and the match viewer. `utils/fusionSplit.js` states the rule. `characterAggregation.js` applies it inline (Phase 3); every other aggregation calls `computeMatchFusionDeltas()` once per match and `applyFusionSplit()` on each character's `extractStats()`. **A split stays on its side of the match**: deltas are keyed `side:originalFormId`, and Phase 3 adjusts this file's row on the fusion's own side (`rowOf`), because a team's test against itself fields the same character on both sides. The split carries the per-slot skill counts and the fighting-style hits too; before 2026-09-28 it moved battle time without the hits, which skewed both partners' per-minute rates.

## Routing (read before adding a page)

`src/routes.js` is the **single definition of the URL scheme** and is now load-bearing: `main.jsx` builds its `<Route>` entries from it, and `App.jsx` derives which view to render from the pathname via `viewForPath()`.

- **`viewType` is not state any more — it comes from the URL.** `setViewType` was kept with the same name and signature but now navigates, so the existing call sites and the view dropdowns were untouched while every view became linkable, refreshable and shareable. Don't reintroduce a `useState` for it.
- **The routes, since the shell rebuild (2026-09-28):**
  - `/` is Home (view `home`).
  - `/characters` is the Characters page.
  - `/matches` is the old single-match viewer (view `single`, which used to be the home page) until the Matches list and Match page replace it.
  - `/teams` is the Teams table and **`/teams/:teamParam` the Team page**. The param resolves by team slug (or the raw tag, for hand-typed links) and is rewritten to the slug with `replace: true`, as a character's is.
  - `/meta` and `/tables` as before. Tables has no tab and is due to redirect to `/characters`.
  - **`/sandbox/...` is the Sandbox**: the same views over uploaded files. `pathForView(view, { sandbox: true })` and `isSandboxPath()` handle the prefix, and a Sandbox path's fallback is its landing view (`single`).
- App still renders every view itself, apart from the Character, Characters, Home, Meta, Teams and Team pages. These routes make that switch addressable; splitting the remaining views into per-route pages happens in Phases 4–6 and **does not change the paths**.
- **The trailing `path="*"` catch-all is deliberate.** An unknown or stale URL renders the app rather than a blank page, which matters because links to this app get pasted into Discord and outlive whatever scheme was current when they were posted.
- **`/characters/:charParam` canonicalises.** A raw id is accepted forever, but if that character has a slug the URL is rewritten to it with `replace: true`, so what a viewer copies out of the address bar is the legible form. See "Character URLs are name slugs" below.
- **`npm run verify-routes`** (`scripts/verify-routes.mjs`, in `prebuild`) asserts every view round-trips through its path, in the league and in the Sandbox. It also checks that a prefix like `/charactersomething` or `/sandboxes` is not mistaken for its section, that malformed input falls back to Home instead of throwing, and that a match id — a file path containing spaces and slashes — encodes to a **single** URL segment. A mistake here does not crash; it quietly shows the wrong view.

## The shell (`src/shell/`)

The tab row and scope bar every page sits under ("Visual direction" decisions 1–2 in the plan, as settled on the shell demo). `verify-self-contained` covers this folder.

**It is styled to the demo's measurements**: widths, chip and button sizes, 8px corners on chips and buttons, 46px table rows and the slate text colours (`text-slate-400` for muted text, `-500` for faint). When restyling, compare against `design/shell-demo/` at the same viewport, element by element.

- **`TabRow.jsx`**: Home · Characters · Teams · Matches · Meta · Sandbox, as links carrying the scope params. **It holds the site's sections and nothing else.** A switch that changes only the current page (Table / Tier list) goes in that page's own control row: the league found it in the tab row read as site-wide.
- **`ScopeBar.jsx`**: one sticky line (`NAV_H` 61 + `SCOPE_H` 52 are exported for sticky table headers).
  - **Chips:** Season, Match type, Difficulty and Team always. Season phase and Match size come through "+ Filter", and show once set. A set chip is tinted orange.
  - **Page chips** (`pageChips`, same shape) come after a divider. Characters has Position; Meta's Builds tab has Uses, Character, AI strategy and Capsule (`pages/meta/buildChips.jsx`); the Character page has **Played for** (`for=`, the character's matches for one team); the Team page has **Opponent** (`vs=`).
  - **Right end:** the match count, and the **Excel** button for the full workbook (App's `handleExcelExport`, which aggregates on demand on pages that do not).
  - **On a phone:** a "Filters (n)" button opens a sheet listing every chip. In the Sandbox the chips give way to a note about the uploads.
- **`ChipMenu.jsx`**: a chip plus its option list, as a floating-ui popover on desktop or a bottom `Sheet` on a phone.
  - **Semantics:** multi-select is OR within a chip and AND between chips. A multi list starts with an "All …" row that clears it, stays open while ticking, and floats picked values to the top when it has a search box.
  - **Labels:** `multiLabel()` makes the chip label ("Season matches, Events", or "Tests +2").
- **`scopeModel.js`** (pure) is the scope: `SCOPE_DIMS`, parse/write, `defaultScope`, `scopePaths`, per-value `valueCounts`, `describeScope`.
  - **The URL format is TagFilterSelector's** (`?seasonNumber=0&matchType=Season,Test`), so old shared links still open on the same data.
  - **Clearing every chip writes `scope=all`.** A URL with no scope means "the default", so an "everything" link needs the marker to survive.
- **`useScope.js`** holds the scope in the URL only. It writes the default into a scope-less league URL (not in the Sandbox), and is `ready` once that is done. **`useScopedMatches.js`** loads the scope's matches, with a generation counter so a stale batch never lands.
- **`tableParts.jsx`**: the list tables' header type (`HEAD`), sortable header cell (`SortHead`), stat cell (`StatCell`), search box (`SearchBox`) and "Show more" foot (`ShowMore`, `PAGE` = 25), shared by the Characters, Builds, Teams and Team page tables.
- **`useQueryUpdate.js`**: every query-string write goes through it (replace, no Back stop). `prettySearch()` keeps commas readable, because `URLSearchParams` writes `%2C` and these links get pasted into Discord.
- **App's side:**
  - `fileContent` / `selectedFilePath` are fed from the scope, so the old views work unchanged.
  - Opening one match (`handleNavigateToMatch`) fills only `analysisFileContent`, and moving between the league and the Sandbox clears it.
  - `scopeOnlySearch` (scope params only) is what tabs and character links carry, so a page's own params stay on that page.

## The Characters and Home pages

- **`pages/CharactersPage.jsx`** (`/characters`): the leaderboard as a table, or the same rows as a tier list.
  - **All its state is in the URL,** so any view of it is a link (Home's curated boards will be such links): `view=tiers`, `sort`/`dir`, and `pos` for the Position chip. The sort keys in `characters/characterRows.js` `CHAR_STATS` appear in shared URLs, so **do not rename them**.
  - **Positions:** `rowsForPositions()` cuts each character's matches to the chosen positions and re-runs `filterAggregatedData`. "Starter, Middle" pools both.
  - **Win % is the last column and never a phone default.** It is a team measure; see "Settled on the demo" in the plan.
- **`characters/CharacterTable.jsx`**: the table and its colour rules.
  - **Layout:** a CSS-grid table with a sticky header, and each row a link to the character's page (plain in the Sandbox).
  - **Numbers are white;** each stat cell's thin bar turns green or red only for the top or bottom fifth of the pool (`placements()`). A thin sample keeps its colour, faded.
  - **Fading needs settled rows to contrast with.** `fadesThinSamples()` (`utils/performanceTier.js`) is false when every row is under 5 matches, as after a narrow filter or with a few Sandbox uploads. Then nothing fades (plates, pills, bars, tier-list portraits, the Builds table and the build menu), and `fadeLegend()` says so under the list. `TierPlate` takes `fade={false}` for this; its tooltip still states the sample.
  - **Tier:** a plate on desktop, and the score as a `TierScorePill` everywhere.
  - **Phone:** the score and two stats picked with two pickers, kept in `localStorage`.
- **`characters/TierList.jsx`**: rows Z to C of portraits. Each row is tinted in its tier pill's ring colour (13% behind the plate, 5% behind the portraits); not the plate colour, since Z and B share a blue plate.
- **`pages/HomePage.jsx`** (`/`): the first cut of Home is the tier list for the scope in the bar. The curated boards and latest results are next.
- **Portraits**: `components/Portrait.jsx` shows `public/portraits/<id>.webp`, and falls back to a neutral tile with the initial.
  - **Files:** two sizes, cut from the same crop of the Calculator's face icons by `npm run build-portraits` (`scripts/build-portraits.mjs`, via headless Edge, since no image library is installed). The **96px** set (241 files, ~1 MB) is sharp up to a 48px slot on a 2x screen: tables, lineups. The **192px** set in `portraits/192/` (~2.3 MB) is for larger views. `<Portrait>` offers it through `srcset` whenever it is drawn above 48px (the Character page header, the tier list), so the browser fetches it only where the screen needs it, and it falls back to the 96px file if a 192px cut is missing.
  - **Committed on purpose,** so the deploy never needs a browser. Re-run the script when a character is added; `verify-portraits` warns until you do.
  - **Naming:** every icon is `T_UI_FaceP1_<id>_00.png` except `0080_01` (`0080_00_01`).
  - **Lookup:** App's `charIdFor(name)` gives the id.

## The Meta page

- **`pages/MetaPage.jsx`** (`/meta`): tabs Builds · AI strategies · Capsules (`tab=ai|capsules`). The tabs, the count and the "Best per character | All builds" switch share one row on a desktop and stack on a phone.
- **Builds** is the league-wide build table, the answer to "what should I submit?", built to the shell demo's layout A.
  - **A build** is a character's exact capsules plus AI strategy. Each row comes from `characterBuilds()`, the Character page's build picker, so its score is the one that character's page shows under `?build=`. `meta/buildRows.js` `leagueBuilds()` flattens them for the scope. App computes that once (~240ms over the whole corpus) because the chips need it too.
  - **Filters live in the URL** as readable slugs: `uses` (the floor, default 5, 1 in the Sandbox), `char`, `ai`, `cap`, `group=best`, `sort`/`dir`. OR within character and AI strategy; **a build must contain every capsule picked**. The floor is a visible chip that starts set, never a hidden rule.
  - **`meta/BuildsTable.jsx`**: 46px rows (portrait, character, the compact build-type pill and a capsule-type cost bar, AI strategy, uses, average damage, efficiency, score pill, win % last). 25 rows, then "Show more".
  - **The selected row's capsules** show as the one-column list (grouped by type, AI strategy last) in a sticky side panel from 1180px up. Narrower, a row opens its list underneath. The panel and the phone leave win % out.
  - **Type:** its text inherits the demo's 14px / 1.45 line height from the page's wrapper, not from `body`, so the older pages do not change. Buttons and `text-[10px]`/`text-[11px]` (which App.css gives a 1.4 line height) state `leading-[1.45]` themselves.
  - **`npm run verify-meta-builds`** checks the rules on the real corpus: uses add up to matches, every filter including the all-capsules rule, best per character, sorting, the URL defaults, and that no two names share a slug. Not in prebuild.

## The Teams and Team pages

- **Team names and logos come from `referencedata/teams.json`** (see its README entry): each team's **tag** (the identifier in match files, `BR_Data` folders, the scope bar's `team=` param and every aggregation, never renamed) and its **name** as the website spells it ("Master & Student", "Sentai Squad"), plus its URL slug and logo. `utils/teams.js` (`teamByTag`, `teamName`, `teamBySlug`) is the lookup: **show `teamName(tag)`, never the raw tag**. A tag missing from the list still works, shown as itself.
  - **Logos:** `components/TeamLogo.jsx` shows `public/team-logos/<slug>.webp`, 96px copies of the website's logos made by `npm run build-team-logos` (headless Edge, committed like the portraits). The analyzer's second cross-app asset dependency.
  - **`verify-teams`** (in prebuild) fails on a list that would break links (a duplicate tag or slug, a slug that is not plain URL text) and warns about a team tag in the data with no entry, or a team without a logo.
  - The scope bar's Team chip shows names (`scopeModel.js` formats the `team` dimension) while its URL keeps the tags, so old links still work.
- **A team's figures are its TOP 5's**: the five characters with the best score over its matches, each one's per-match average summed, as the league reads a team. **The league breaks in-season ties on the top 5's average damage**, so do not change this definition (it was briefly whole-team, and the league asked for it back). `getTeamAggregatedData` computes them (`avgDamagePerMatch`, `top5Efficiency`, `top5DPS`, `top5CharacterNames`…); `teams/teamRows.js` `teamRow()` reads them, and `TEAM_STATS` lists them: win %, average damage dealt and taken, efficiency, DPS, HP kept (and HP left), match time, tags (and the total) and characters used. The record, match time and characters used are whole-team.
- **`pages/TeamsPage.jsx`** (`/teams`): one row per team: logo, name, record, then every `TEAM_STATS` figure. It is the Characters table's design (`StatCell` bars coloured at the ends only, sticky header, `sort`/`dir` in the URL). **Win % leads and is the default sort**: it is a team measure. Ties go to the top 5's damage. A "League standings" link under it goes to the website's `/season` page: standings stay the website's.
- **`pages/TeamPage.jsx`** (`/teams/<slug>`): header (logo, record, matches, characters, rank by win %, Share, "Team info" to the team's profile on the website, a back button), eight headline tiles ranked against the teams in scope, then **Roster · Lineups · Opponents · Matches** (`tab=` in the URL). Laid out like the Meta page, not the Character page: the header sits on the page and each tab's table is the one panel, so nothing nests.
  - **Roster** (`team/RosterTable.jsx`): each character the team fielded, **from the same team entry as the figures** (`rosterRows(source)`, its `characterAverages`), so the five best scores are exactly the five the figures use and their damage adds up to the team's. Their place numbers are orange, unless the team fielded five or fewer. Starter / Middle / Anchor counts, win % last and muted. **A row opens the Character page with `for=<team slug>`** ("Played for"), so it opens on that team's matches only, and every row there agrees with the roster, fusion partners included (both apply the fusion rule, "Fusions" above).
  - **Lineups** (`team/LineupList.jsx`): each match, newest first, with **both lineups**, the opponent's under the team's, slot by slot, so a column is one slot's matchup: each character's build pill and damage on desktop, the cost bar on a phone. **Each side is its own band headed by its team's logo and name** (a label column on a desktop, a line above on a phone; the opponent's band is shaded and its name links to its page), so the two lineups never read as one team of six. Order is exact: `characterAggregation.js` keeps each match row's `slot` (1 = Starter, then each member in turn) and `side` (1 or 2), the only way to split a team's test against itself into two lineups.
  - **Opponents** (`team/TeamOpponents.jsx`): one row per team it played, with the same figures over those matches only (`opponentRows()`: `getTeamAggregatedData` over the pair's files, passed in as `aggregate`). A row is a filter: picking it sets **`vs=<slug>`**, which cuts the whole page to that opponent. The tiles then rank among the team's matchups and show its overall figure where the league median was, and the scope bar gains an **Opponent** chip. Tests against itself are left out.
  - **Matches** (`team/TeamMatches.jsx`): the matches, newest first, with damage dealt and taken, HP kept and time; a match opens in the match viewer, an opponent its Team page.
  - Lineups and Matches share a search box (match, opponent or, for lineups, any character on either side) and show 25 at a time with "Show more" (`PAGE`, `ShowMore` and `SearchBox` in `shell/tableParts.jsx`, which Meta's Builds table uses too).
  - **`npm run verify-team-page`** checks the joins on the real corpus: the top 5 are the roster's five best and add up, every roster row matches the leaderboard cut to that team, every match row carries what the fusion rule gives it (plus a made-up test against itself, since the corpus has no fusion with the same character on both sides), the head-to-heads cover every match and agree with the record, one lineup per match with one Starter per side, and a `vs` cut keeps only that opponent. Not in prebuild.
- **Back buttons go back where you came from** (`shell/useCameFrom.js`): the Character and Team pages' button reads "Budokai", "Meta", "Characters" and returns there with `navigate(-1)`, as it was left. Opened from a pasted link or refreshed, the page has no origin and the button offers its list. Each history entry remembers the page that pushed it; a replace (filter, tab, canonical URL) keeps it.
- **Match order is chronological by name** (`utils/matchOrder.js` `compareMatchTime`): season, then pre-season / season / playoffs / off-season, then the playoff round, then natural order (Week 2 before Week 10). BR_Data has no dates, and plain name order put Week 10 before Week 2 and the playoffs before Week 1. Use it wherever matches are listed.
- The old team cards (about 1,100 lines of `App.jsx`) are gone, with the state only they used.

## Shared presentational components (read before building any page)

`StatBar`, `PerformanceIndicator`, `PerformanceScoreBadge`, `StatGroup`, `MetricDisplay`, `BlastMetricDisplay`, `BattleTimeVariance`, `BuildYamlButtons`, `BuildTypeTooltipWrapper`, `BuildTableView`, `BuildDisplay` and `MetaAnalysisContent` were all defined **inside `App.jsx`**, which meant they were unreachable from anywhere else. The first Character page reinvented the build display as a result, and shipped a worse version of something that already existed. They now live in:

- **`src/components/stats/`** (barrel: `index.js`) — the stat primitives.
- **`src/components/build/`** (barrel: `index.js`) — the build-display family, plus `buildYaml.js` (`generateBuildYaml`, `useCopyFeedback`).
- `MetaAnalysisContent` was deleted on 2026-09-28, when `pages/MetaPage.jsx` put its two analyses behind tabs.

**`BuildTypeTooltipWrapper` is the canonical way to show a build**: a colour-coded build-type pill (`getBuildTypeColor`) with the cost breakdown on hover. Use it rather than writing another one. Note `buildComposition` is an object — `.label` is the display string.

The bodies moved **verbatim**; the only edit to any moved line was an `export ` prefix. Two things worth knowing about that move:

- **`parseCapsules` was deleted**, not moved — it was defined and never called.
- **`npm run smoke-character-page`** (`scripts/smoke-character-page.mjs`) renders the character page through `react-dom/server` against real corpus rows, across every layout and both themes, and prints a stack trace when it throws. `verify-character-page` checks the DATA contract and cannot catch a render bug; those surface in the browser as a **blank white page** with the real error buried in the console. It loads app modules through Vite’s SSR pipeline so aliases and `?raw` imports resolve as they do in a build, but imports React, react-dom and react-router **natively** — they are CommonJS, which Vite’s SSR runner cannot evaluate.
- **`React` is deliberately not whitelisted** in `verify-self-contained`. The automatic JSX runtime means JSX never names the identifier, but an explicit `React.useState(...)` or `React.Fragment` still needs the import. Whitelisting it once made that checker blind to exactly its own bug class: `useCopyFeedback` moved out of `App.jsx` still calling `React.useState`, which blanked both the character page and any expanded leaderboard row.
- **`npm run verify-self-contained`** (`scripts/verify-self-contained.mjs`, in `prebuild`) parses every file under `src/components/`, `src/pages/` and `src/shell/` and reports any identifier it references but does not import. This exists because **a Vite build does not catch that class of mistake**: a component that used to reach something `App.jsx` imported becomes a runtime `ReferenceError` on whichever path touches it, so a rarely expanded panel could stay broken indefinitely. It globs rather than reading a list, so it cannot fall behind as Phases 4–6 move more components out.

## The Character page (`src/pages/CharacterPage.jsx`)

The first real page of the redesign, behind `/characters/<name-slug>`.

- **It computes nothing of its own.** The Usage, Builds, Forms and Matches tabs read an aggregated row that `characterAggregation.js` already computed. The Overview works from that row's per-match rows through `src/utils/characterOverview.js`, the same code that builds the league reference. A wrong stat is an upstream bug.
- **`App.jsx` renders it in place of the Characters page** when `deepLinkedCharacter` resolves; `CharactersPage` is gated on `!deepLinkedCharacter`. App still owns data loading, so the page takes everything as props.
- **Three files**: `CharacterPage.jsx` owns the four states and nothing else, `character/CharacterBlocks.jsx` holds the content with no opinion about arrangement, and `character/CharacterTabs.jsx` arranges it. **Tabs were chosen** over a dense single column and a sticky-rail variant, which were built alongside and compared with real data — tabs won on navigation and, more importantly, on extensibility: a new kind of analysis becomes a new tab rather than another band competing for space. `TABS` in that file is a plain registry; adding one means a row there and a case in the panel switch. The tabs are Overview, Usage (usual team/position/AI/map and the by-position table), Builds, Forms and Matches.
- **The header leads with the character's portrait** (80px, like a Team page's logo; the 192px cut keeps it sharp), then the name and, under it, **four equal figures: Tier, Score, Rank, Matches**, each a small label over its value like the Overview tiles (`IdentityBlock` and `HeaderFigure` in `CharacterBlocks.jsx`). The tier is its plate, and the score keeps its tier pill, so a Z score still breathes. On a phone the portrait (56px) and name share a row and the four figures run under them, full width. Chosen on 2026-09-29 over a badge row and a plate docked on the portrait. App passes `portraitId`, the id the URL resolved to.
- **The Overview tab lives in `character/overview/`** and implements the approved design (plan: "Overview tab: approved design"):
  - `OverviewTab.jsx` places the view against `src/config/style-baseline.json`.
  - `Headline.jsx` holds the five tiles and six move cards.
  - `StyleBand.jsx` holds the fighting style, build, AI and the Radar / Bars "How it fights".
  - `BuildPicker.jsx` is the build filter.
  - `parts.jsx` has the rank text, score pill, `Tip` / `TipTable` (floating-ui Me / League tooltips) and `MedianTrack`.
  - Colours come from `src/utils/overviewPalette.js`: style colours, and rank colour for the top and bottom fifth only.
  - The old always-visible `HeadlineBlock` strip (win rate, KOs, HP retention) is no longer rendered. The design leaves win rate out on purpose.
- **One build at a time, via `?build=<code>`.** `overview/characterBuilds.js` lists a character's builds (key, short code, label, AI, capsules, score). Each build's `row` is `filterAggregatedData([character], { activeBuildFilters: { [name]: key }, charMap })`, the leaderboard's own build filter. `CharacterTabs` resolves the code with `findBuildByCode`, then shows that `viewRow` everywhere except the Builds tab: identity (with the build's score, and no leaderboard rank since the leaderboard ranks characters), Overview, Usage, Forms and Matches. A "Showing one build" strip says so. An unknown code falls back to all builds. `App.jsx`'s `scopeSearch` strips `build` (and the page params `for` and `vs`) from the query string on the way to the leaderboard, other views or another character; `charMap` is passed down for form names on a filtered row.
- **The Characters table and tier list link in.** Every row and tile is a `<Link>` to the character's page. `characterLinkFor(name)` in `App.jsx` uses `charUrlKeyByName`: a name slug, or the raw id for a character missing from the CSV. It carries the scope params, so the page's numbers cover the same matches as the list.
- **A shared link always lands on Overview.** The active tab is component state, not URL state, so "look at this character's builds" is not currently linkable — a real cost given these URLs exist to be pasted. Putting the tab in the query string is the fix if it starts to matter.
- **Rank comes from `performanceReference`, not `filteredAggregatedData`.** Same reasoning as the tiers: the population is defined by the filters that change *which matches count*, so "#12 of 107" means the same thing whatever the visitor has sorted or selected. The deep-link effect therefore **must not** set `selectedCharacters` — that would flatten the rank to #1 of 1.
- **Four states, and the differences matter:** loading, empty-scope, not-found, and rendered (`reason` prop). **Do not infer loading from an empty list** — that was a bug: a tag filter matching no files (`S1 + Season` is empty today, since every Season 1 file is tagged `Test`) leaves the list empty forever, and the spinner never resolved. App decides from the real signals: an empty scope (`scopeState.paths` is `[]`) is empty-scope, and a scope that is not `ready` or whose matches are still arriving (`dataLoading`) is loading.
- **The data scope is printed on the page**, built from the scope in the query string (`describeScope()` in `shell/scopeModel.js`) rather than from component state — so the page's description of its scope and the link someone pasted come from the same source and cannot disagree.
- **Watch for object-valued fields.** `topBuilds[].buildComposition` is an object (`{ primary, label, type, breakdown }`) whose display string is `.label`, and `equippedCapsules[]` entries are objects carrying their own `.name`/`.capsule.cost` — **not** ids to look up. Both render as `[object Object]` or throw if treated as strings. Note this **depends on `capsuleMap` being populated**: with an empty one, `buildComposition` comes back as the string `'No Build'`, which is why the verifier below feeds the real lookups.
- **`npm run verify-character-page`** (`scripts/verify-character-page.mjs`) is the guard, and it exists because this page **cannot crash on missing data** — it renders an em dash, or `NaN`, or silently drops a section. It **scrapes the `character.` / `viewRow.` / `allRow.` field reads out of the page source**, so the field list cannot drift from what ships. It then asserts:
  - each field exists on real rows, and headline stats are finite on every row
  - text-rendered fields are never objects
  - the `slug → id → name → row` join holds for every character in the corpus
  - every `m.<field>` the Overview reads exists on real match rows
  - build codes are unique per character
  - each build's filtered row has the build's match count
  - all six fighting styles place for every character

  Not in `prebuild` (it aggregates real shards, like `verify-filters`). Until 2026-09-28 its source glob tested `[\/]` for the path separator, which on Windows scanned only `Character*.jsx` files and skipped everything under `character/`.
- **`npm run smoke-character-page`** renders the page through Vite's SSR pipeline with real rows, in both themes. It covers the Overview's content, the Bars view (via `StyleBand`'s `initialView` prop, since a server render cannot click), every other tab, a `?build=` link and an unknown code, and it fails on visible `NaN` / `undefined` / `null` text. It cannot see layout: the `App.css`-beats-Tailwind bugs described under "Styling" passed it. For layout, build, serve with `node scripts/serve-dist.js`, and screenshot with `npm run shot` (`scripts/dev/`).

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

Imports `characters.csv`/`capsules.csv` directly from `/referencedata/` at build time via Vite's `?raw` import, and `teams.json` as JSON (`src/utils/teams.js`) (see root `CLAUDE.md` — **edit those files at the repo root, never the local `referencedata/` copy that `vite.config.js`'s `copy-shared-referencedata` plugin writes here**, it's overwritten on every build). `src/config/buildRules.js` and `src/config/capsule-rules.yaml` encode capsule-restriction/build-legality rules used by the synergy/AI-strategy analysis.

## Gotchas

- `@szl/ui` (aliased in `vite.config.js`) provides the shared `NavBar` — see `packages/ui/CLAUDE.md`.
- No test suite. Validate changes by running `npm run dev:analyzer` and checking the relevant view in the browser; for BR_Data/tagging changes, confirm the generated `public/br-data-*.json` files actually changed after a build.
- **Count skill uses from `runBlastCount` (`EXA1` / `EXA2`), never from `battleNumCount.eXACount`.** The two agree in every Season 0 file (99–100%). In Season 1 files `eXACount` inflates: ~12× its Season 0 rate per minute on the field while every other `battleNumCount` counter stays within 0.7–1.4×, and it records the impossible — Panzy logs `eXACount: 10` in an 88-second match (`BR_Data/Tests/Tiny Terrors/OS1 Tiny Terrors Test 16 Match 1 R1.json`) when her skill points allow about 4 uses. `EXA1`/`EXA2` hold steady across seasons and match the match footage (checked by the league against a test video: 2 uses of Skill 1 where `EXA1: 2`). They also give the per-slot split. `extractStats.skillsUsed` is EXA1 + EXA2 since 2026-09-28; it used to be `eXACount`, which inflated the leaderboard's skill figures (12,761 uses across the data against 8,266 real ones).
- **There is no reliable ki-blast hit rate — do not build one from `attackHitCount`.** The ki-blast hit codes (`RSB`, `DRSB`, `JRB`, `JSBN`) credit a deflected *enemy* blast that lands to the deflector, as if it were their own hit. Confirmed against match footage (`BR_Data/Seasons/Season 0/PS0 Week 1 Match 3.json`: Bardock fired 3, 2 hit, and 3 enemy blasts bounced back into the opponent — the file records 5 hits from 3 fired). About half of all character-matches include deflections, so the true league rate sits anywhere between roughly 29% and 38%, and the error favours characters who deflect a lot. Use `shotEnergyBulletCount` (blasts fired) for ki-blast volume instead. `battleNumCount.reflectEnergyBulletCount` is **enemy blasts this character deflected** — it tracks the opponent's blasts fired (r = 0.77) and never exceeds them in any of 1,824 one-on-one pairings — but it is **not** a measure of defensive skill: characters auto-deflect while dragon dashing or in max power, so never weight it into a defensive rating.
- **What each `attackHitCount` move code means** (rush vs heavy melee, rush vs smash ki blasts, counters, movement, reactions), and how sure we are of each, is in **`docs/ACTION_CODES.md`**. Read it before building any stat on per-move hits.
