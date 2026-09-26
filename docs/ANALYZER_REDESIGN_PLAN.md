# Analyzer App Cleanup, Reorganization & Redesign Plan

Status: **In progress**. Originally approved 2026-09-06; **audited and revised 2026-09-25** against the code as it actually stands (see "Progress" and "Current-state findings"). Phase 1 is complete. **Phase 1.5 (Data layer) is next** — it is new in this revision and deliberately precedes the design-system work.

---

## What the Analyzer is for

**This section is the north star. When a design decision is ambiguous, resolve it against this, not against what is easiest to build.**

The Analyzer is Dragon Ball Z League's window onto its own match data — season matches, event matches, and team tests alike. It exists to serve two audiences, and a change that serves neither is not worth making.

### How the league actually works (essential context)

Understanding the competitive loop is a prerequisite for designing this app, because it determines what a "useful insight" even is:

1. Participants build **lineups** and submit them for each of their team's season matches. A lineup is three interlocking decisions per character:
   - **AI strategy** — guides how the character behaves in battle.
   - **Capsules** — stat buffs, bonuses, and sometimes deliberate debuffs.
   - **Position in the lineup** — which matters for matchups against the opposing character in that slot, and because some capsules and builds are specifically designed for earlier or later positions.
2. The league runs those lineups as **AI vs AI (CPU vs CPU)** matches.
3. Teams separately request **tests**, choosing their own lineups and opponents, which are run the same way.
4. The resulting battle-result files are what lands in `BR_Data/` and what this app reads.

**The single most important consequence:** there is no human execution variable. Outcomes are a function of character, capsules, AI strategy, position, matchup and map — all of which are in the data. That makes this dataset unusually clean and the analyzer unusually able to be *genuinely predictive*, in a way a stats site for a human-played game could never be. Design for that. The team-facing half of this app is not a stats museum; it is **decision support for the next lineup submission.**

### The two audiences

**Active participants** — team members preparing a lineup. Their loop is: look at what happened → decide what to submit next. Concretely they need to:

- **Compare builds on one character** — how the same character performs across different capsule builds and AI strategies, side by side, in order to pick one.
- **Compare characters head-to-head** — put 2–3 candidates next to each other rather than scanning a table.
- **Plan lineups by position** — work out who belongs at Lead / Middle / Anchor, given that position drives matchups and that some builds are position-specific.
- **Track their own team over time** — is this character, build, or team trending up or down across a season or a run of tests?

The test corpus is theirs: 2,385 of ~2,500 files are team tests, and that is where build tuning actually happens.

**Casual viewers** — community members who want a quick, fun way to explore the league's trove of data with no prior knowledge of the stat model. They want to see how teams are doing in the current season, and which characters are best at particular things. They should be able to get something interesting within seconds of landing, without configuring a single filter.

### Design principles

These are the tie-breakers. Each one is testable against a proposed change:

1. **Something interesting within seconds, depth on demand.** Every page opens with a small number of legible, high-signal facts. Power-user density lives behind an "Advanced" expand, a tab, or a filter — never in the default view. A casual viewer must never have to configure anything to see something worth seeing.
2. **Recency is reliability.** The game receives active updates and the league's own rules change between seasons, so **the newest season's data is usually the most reliable and most useful**, and older data decays in relevance rather than becoming worthless. Defaults everywhere should favour the current active season. Different users legitimately favour different slices, so scope must always be **changeable and always visible** — a stat with no indication of which data produced it is a bug, not a simplification.
3. **All data is public, but not all data is equally prominent.** Team test data is fully public and must stay easy to reach for anyone who wants it — no gating, no hiding. It simply isn't the default lens for someone who arrived to see how the season is going.
4. **Team-facing features answer "what should I submit?"** If a view shows a participant something true but does not help them choose an AI strategy, a capsule build, or a position, it is a lower priority than one that does. `buildRecommendationEngine.js` already has `generateRecommendedBuilds` and `suggestBuildImprovements`; they are buried in Meta Analysis and should be surfaced where the decision is actually made.
5. **Every page stands on its own.** People arrive both by browsing in from the league website and by clicking a link someone pasted in Discord. A deep-linked page must be self-explanatory to someone with no context, and must offer obvious paths to explore further.
6. **The data model is the product.** Character, capsules, AI strategy, position, matchup and map are the axes that decide matches. They should be first-class, filterable, comparable dimensions throughout the app — not fields buried in a table.

### Concrete goals

1. Serve both audiences well, per the above — not one at the other's expense.
2. Every character, team, and match gets a real, shareable URL. **⚠️ Blocked in production today — see "Deep links are broken in production" below.**
3. A "share snippet" image card on Character/Team/Match pages and the Sandbox, for pasting into Discord. (Depends on goal 2.)
4. Clean up and consolidate the codebase.
5. Modernize the visuals and fix mobile compatibility.
6. Stop downloading ~67 MB on every page load.

---

## Progress

### Phase 1 — Foundation: ✅ Complete (with three loose ends)

- `react-router-dom@^6.28.0` is a real dependency and is wired in `src/main.jsx`:
  ```jsx
  <BrowserRouter basename={import.meta.env.BASE_URL}>
    <Routes><Route path="/*" element={<App />} /></Routes>
  </BrowserRouter>
  ```
  The `basename` derives from Vite's `base` automatically, so it cannot drift from `vite.config.js`. (This is better than the website app, which hardcodes `basename="/SparkingZero"` — copy the analyzer's approach, not the website's.)
- **Aggregation extraction is genuinely done.** `src/utils/aggregation/` holds three files (2,497 lines, 8 exports); `App.jsx` imports all 8 at lines 24–26 and calls them. **No duplicate definitions remain in `App.jsx`** — the "~4 near-duplicate implementations" problem is 3/4 resolved. Commit `a01ba921` removed 3,034 net lines from `App.jsx`.

  | File | Lines | Exports |
  |---|---|---|
  | `characterAggregation.js` | 1,115 | `getAggregatedCharacterData` |
  | `teamAggregation.js` | 1,090 | `recomputeTeamCharStats`, `getTeamAggregatedData`, `getTeamStats` |
  | `positionAggregation.js` | 292 | `getPositionBasedData`, `calculatePositionAverage`, `calculatePositionSurvivalRate`, `getPositionInsight` |

- **Loose ends to close in a later phase:**
  1. `filteredAggregatedData` is still an inline `useMemo` at `App.jsx:1413` — it filters *and re-derives* per-match stats, so it is the surviving 4th implementation of the aggregation math.
  2. `src/routes.js` defines the URL scheme but is **imported by nothing**. Grep for `useNavigate|useParams|useSearchParams|useLocation` across `apps/analyzer/src/` returns **zero hits** — no component consumes the router yet. The catch-all renders the same monolith at every URL.
  3. `getPositionInsight` is imported into `App.jsx` but never called — dead import.

### Phase 1.5 — Data layer: ✅ **Core complete** (2026-09-25)

The ~67 MB / ~2,232-request page load is gone. **The default view is now 2 requests and ~101 KB gzipped.**

- `scripts/generate-br-aggregates.js` emits a compact match corpus to `public/br-aggregates/` — 15 shards, one per `BR_Data/<Top>/<Sub>` folder, plus an `index.json` manifest. Wired into `prebuild` after `generate-br-data-tags.js`. 2,497 matches, 68.5 MB → 14.6 MB (Season 0 shard: 1.17 MB raw / **101 KB gzipped**).
- **Design change from the original plan.** The plan called for retargeting `src/utils/aggregation/*` at a new row shape. Instead the corpus **preserves the original match JSON shape** and simply drops every field no consumer reads. The payload reduction is the same, but `statCalculations.js` and all three aggregation modules consume it **completely unchanged** — which matters a great deal given ~2,200 lines of stat math with no test suite. The two heavy legacy-fallback dicts (`attackHitCount`, `runBlastCount`) are pre-summed into synthetic dicts whose keys still satisfy `extractStats`' own `includes()` checks, so it computes identical results without carrying them.
- `scripts/verify-br-aggregates.mjs` (`npm run verify-aggregates`) proves it: over **all 2,497 matches / 11,914 character entries**, it compares raw vs compact field-by-field *and* runs the real `extractStats()` on both sides, deep-comparing the full output. **Currently passing.** Re-run it whenever the generator's keep-lists change.
- `src/utils/corpusLoader.js` loads shards on the client, with a per-file fallback if the corpus is missing, stale-versioned, or lacks a requested match — so the app degrades instead of emptying.
- Encoding: the generator handles UTF-16 LE / UTF-8 BOM directly. Without it, 6 files were silently dropped — all of them Season 0 Playoffs and Allstars.
- Default scoping is applied as a **tag filter**, not a folder pre-selection: `BRDataSelector` keeps everything selected and `TagFilterSelector.computeDefaultFilters()` narrows to `matchType: Season` + the newest season number found in the tag index (so it needs no edit when Season 1 starts). Chosen because tags are visible and self-describing — the header pills show an unfamiliar viewer both that the data is scoped and how, and let them widen it without understanding the folder layout. Same result as before: 105 matches, one shard, 1.17 MB.
- Dead `getPositionInsight` import removed from `App.jsx` (Phase 1 loose end 3).

**Still open in this phase:** `filteredAggregatedData` (`App.jsx:1413`, ~697 lines inline) has *not* been extracted — it is a code-organisation concern rather than a data-layer one, and folding a 697-line refactor into the data change would have put untested stat math at risk for no payload benefit. Do it with the Character page rebuild (Phase 3), where the consuming view is being rewritten anyway. The per-row `seq` ordering key is emitted and ready for trend views, but nothing consumes it yet.

### Phase 2a — Tailwind + tokens + dependency cleanup: ✅ Complete (2026-09-25)

- **Real Tailwind v3 is running.** `postcss.config.js` added (CommonJS — this package has no `"type": "module"` and its prebuild scripts must stay CJS), `src/index.css` holds the directives, imported by `main.jsx` **before** `App.css`.
- **That load order is load-bearing.** An audit found `App.css` defines 713 single-class rules, **123 of which collide with a class Tailwind generates** — and some collisions change rendering, not just colour notation: `.gap-4` is `0.6rem` here vs Tailwind's `1rem`; `.max-w-4xl` and `.max-w-7xl` add `margin: 0 auto`; `.border-b` and `.border-l-2` carry an explicit `border-style`; and several violet/teal shades use genuinely different hex values than Tailwind's palette. Emitting Tailwind first means `App.css` wins every tie at equal specificity, so **turning Tailwind on changed nothing that already rendered** — confirmed by inspecting the built bundle, where the App.css value is last in all three spot-checked cases.
- **Preflight is deliberately OFF** (`corePlugins.preflight: false`, and `@tailwind base` omitted). It would reset headings, margins and border defaults across a component tree never written against it. It gets enabled in 2b once `App.css` is gone. Until then, border-width utilities need an explicit border-style.
- **All 9 previously-broken responsive classes now generate**, and the `xl:` breakpoint has a media query for the first time.
- **Shared tokens live in `packages/ui/src/tokens.js`** — CommonJS, so both the CJS configs (analyzer, match builder) and the ESM ones (website, calculator) can load it. All four Tailwind configs now source from it and scan `packages/ui`. Each app keeps its existing token **names** as aliases onto the shared values, so no existing markup changed: the website's `dbz.*`, the calculator's `sz-*`, the analyzer's `dragon-*`. New work should prefer the shared `brand.*` names.
- **One deliberate visual change**: the analyzer's app background gradient's first stop moved from amber `#f59e0b` to the canonical `#f97316` (`App.css:22`). The `amber-500` utilities at lines 163/491/501 correctly keep `#f59e0b` — that is a real amber, not a brand accent. That line also shadows Tailwind's real `bg-gradient-to-br`; 2b should rename it.
- **Dependencies**: removed `xlsx` (its two trivial call sites moved onto `exceljs` via the new `src/utils/exportSheet.js`), `@mui/x-tree-view` and `@mui/lab` (zero imports anywhere), and the duplicate `@vitejs/plugin-react` devDependency. **Analyzer JS went 2,267 kB → 1,981 kB (gzip 622 → 526 kB).**
- Match builder's 47-entry `safelist` was **kept**. It exists because that app assembles class names at runtime where Tailwind's scanner cannot see them, so removing entries needs per-class verification. Noted as future work rather than done blind.

### Phase 2b — App.css teardown: not started

### Phase 2c — Responsive shell, accessibility, persistence: not started

### Phases 3–7: not started

---

## Current-state findings (re-audited 2026-09-25)

The 2026-09-06 audit is superseded. Several of its figures were stale by the time Phase 1 landed, and one claim was wrong when written. Verified numbers:

### Size and structure

- **`src/App.jsx`: 6,678 lines** (not ~9,600 — that figure predates commit `a01ba921`). **`src/App.css`: 2,062 lines.**
- `App.jsx` still contains **13 presentational components** defined above `export default function App()` at line 1285: `StatBar`:95, `PerformanceIndicator`:163, `PerformanceIndicatorLabel`:212, `PerformanceScoreBadge`:254, `StatGroup`:298, `MetricDisplay`:332, `BlastMetricDisplay`:367, `BattleTimeVariance`:430, `BuildYamlButtons`:523, `BuildTypeTooltipWrapper`:589, `BuildTableView`:710, `BuildDisplay`:1023, `MetaAnalysisContent`:1200.
- **`src/pages/` and `src/hooks/` do not exist.** `src/api/` exists and is empty.
- The app is a `mode` (Reference Data / Manual Upload) × `viewType` (single / aggregated / teams / tables / meta) matrix rendered conditionally from one file, with ~30 `useState` hooks at the top of `App()`.

### Styling and theming

- **`tailwind.config.js` exists but is inert.** There is no `postcss.config.js` in `apps/analyzer/`, no `@tailwind` directives in `App.css` (grep for `@tailwind|@layer` → 0 hits), and `tailwindcss` is not a dependency. Tailwind has never run on this app. Sibling apps (website, matchbuilder, calculator) all run **real Tailwind v3** with a `postcss.config.js` and `@tailwind` directives.
- **Correction to the previous audit:** it claimed `App.css` defines *zero* `.md\:`/`.lg\:`/`.sm\:`/`.xl\:` rules. That was inaccurate then and is inaccurate now. `App.css` has **7 `@media` blocks defining 12 escaped responsive rules** (lines 381–396, 1626–1634), plus a hand-written `max-width` mobile pass at 1994–2028 that overrides plain utilities. These were added 2025-10-15, 2026-02-08 and 2026-08-26 respectively.
- **The real breakpoint bug is narrower but genuine.** Of 16 unique responsive class names used across 49 occurrences in 8 files (23 in `App.jsx`):
  - **Work (7):** `sm:grid-cols-1`, `sm:grid-cols-2`, `md:grid-cols-2`, `md:grid-cols-3`, `md:grid-cols-4`, `lg:grid-cols-4`, `lg:grid-cols-5`
  - **Inert — used but undefined (9):** `lg:grid-cols-2`, `lg:grid-cols-3`, `lg:grid-cols-7`, `sm:col-span-1`, `xl:grid-cols-9`, and `sm:max-w-sm`/`md:max-w-lg`/`lg:max-w-xl`/`xl:max-w-2xl` (all four in `Combobox.jsx`)
  - **Defined but unused (4):** `md:col-span-2`, `lg:col-span-2`, `lg:col-span-3`, `lg:grid-cols-6`
  - **`xl:` has genuinely zero rules** and no `@media (min-width: 1280px)` block at all.
- **1,199 `darkMode ? 'x' : 'y'` ternaries across `src/`** (704 in `App.jsx`; then `AIStrategyExpandedPanel` 159, `AIStrategyTable` 77, `BehaviorInsightsSection` 59, `TableConfigs` 50, `PerFormStatsDisplay` 38, `DataTable` 36, …). All prop-drilled from one `useState(true)` at `App.jsx:1315`. Styling is class-driven (1,125 `className=` vs 23 `style={{` in `App.jsx`), so Tailwind's `dark:` variant is a direct fit.

### State and URLs

- **Zero persistence.** No `localStorage` or `sessionStorage` anywhere in `apps/analyzer/src/`. Dark mode, filters, selection and view type all reset on reload — so a shared deep link will always open in default dark mode with default filters.
- `TagFilterSelector` syncs its filters to the URL with raw `URLSearchParams` + `history.replaceState` (`:60-61`), **bypassing react-router entirely**. It must be reconciled to `useSearchParams` when real routes land, or the two will fight over the URL.

### Identity for deep links

- **Character IDs are stable.** `battlePlayCharacter.character.key` / `originalCharacter.key` are strings like `0620_00`, resolved through `referencedata/characters.csv` (241 entries). `/characters/0620_00` works directly. Note `statCalculations.js:51-54` prefers `originalCharacter`, so transformed forms collapse to their base — which is exactly what `fusionSplit.js` and `formStatsCalculator.js` exist to unwind, and what a per-form tab on the Character page should surface.
- **There is no match ID field.** No `matchId`, `id`, `date` or `uuid` exists in any BR_Data file. Match identity is the **relative file path** (`Seasons/Season 0/S0 Week 1 Match 1.json`) — the same key used by `br-data-tags.json`, `BRDataSelector`'s tree ids, and `handleNavigateToMatch`. Those paths contain spaces and slashes, so `/matches/:matchId` needs deliberate encode/decode (`routes.js` already `encodeURIComponent`s, but round-tripping through the router needs testing). Filenames do encode structured info (`OS0 Time Patrol Test 58 Match 1 R3`) if a cleaner slug is preferred later.
- **Team IDs** are plain display names from `tags.team[]` (12 values, e.g. "Master and Student"). Slugging is straightforward but does not exist yet.

### Reusable pieces (unchanged, still sound)

`BRDataSelector` (file picker — note: **hand-rolled tree**, not an MUI `TreeView`), `TagFilterSelector`, `Combobox`/`MultiSelectCombobox`, `DataTable`/`TableConfigs`/`ExportManager`, `PerFormStatsDisplay`, `components/ai-strategy/*` (7 components), `components/capsule-synergy/*` (incl. `BuildAnalyzerTool`).

The **tagging pipeline is a solid foundation**: `scripts/autoTagMatches.js` → `public/br-data-structure.json` (108 KB tree) → `public/br-data-tags.json` (566 KB, 2,232 entries). `br-data-tags.json` alone supports match browsing and filtering **with zero match fetches** — the Matches page should lean on it.

---

## ⚠️ Blocker: deep links are broken in production

`.github/workflows/deploy.yml:90-92` does:

```yaml
- name: Create 404.html for SPA client-side routing
  run: cp dist/index.html dist/404.html
```

`dist/index.html` is the **website** app. GitHub Pages serves the root `404.html` for every unmatched path, so a direct hit on `/SparkingZero/analyzer/characters/0620_00` loads the *website's* bundle, whose router (`basename="/SparkingZero"`, `apps/website/src/App.jsx`) has no matching route, and renders an empty `<main>`.

**Every deep link and every share snippet this plan promises would break the moment someone pastes one into Discord.** Goals #2 and #3 are unreachable until this is fixed. It is not a cosmetic issue and it is a prerequisite of Phase 3, not a later cleanup.

**Fix — smart 404 dispatcher.** Replace the naive copy with a `404.html` that:

1. Reads `location.pathname`. If it matches `/SparkingZero/<subapp>/…` for a known sub-app (`analyzer`, `matchbuilder`, `calculator`, `admin`), stash the full original path + search + hash in `sessionStorage` and redirect to `/SparkingZero/<subapp>/`.
2. Otherwise fall through to the website SPA exactly as today.
3. Each sub-app's `index.html` (or the top of `main.jsx`, before the router mounts) checks that `sessionStorage` key and, if present, clears it and `history.replaceState`s back to the original URL.

This is the standard `spa-github-pages` pattern. One workflow change plus a few lines per sub-app entry, and it fixes deep linking for every sub-app at once — not just the analyzer.

*Alternative if this proves troublesome:* `HashRouter` for the analyzer only (`/analyzer/#/characters/0620_00`). Zero infra risk, works immediately, but uglier links and diverges from the website's `BrowserRouter` pattern. Prefer the dispatcher.

---

## Feature audit — keep / merge / rebuild / cut

| Feature | Audience | Recommendation |
|---|---|---|
| Single Match view | Both | Keep, rebuild as its own route/page |
| Aggregated Character Stats | Team/power-user | Keep, becomes the "Character" page — simplified default view + "Advanced" expand |
| Team Rankings | Both | Keep, becomes the "Team" page |
| Position Analysis | Team/power-user | Merge into Character page (as a filter/tab), not a standalone section |
| Data Tables + Excel export | Team/power-user | Keep, consolidate into one reusable "Export" surface instead of per-view buttons |
| Meta Analysis (AI Strategy + Capsule Synergy) | Team/power-user | Keep, becomes its own "Meta/Builds" page |
| Build Analyzer Tool | Team/power-user | Keep, folds into Meta/Builds page |
| Manual File Upload mode | Team (testing) | Keep as a distinct "Sandbox" mode, clearly separated from the public league dataset |
| Tag filtering | Both | Keep and extend (already URL-synced — good foundation, but move it onto `useSearchParams`) |
| Reference-data mode + BRDataSelector tree | Both | Rebuild UX around real navigation/routes instead of mode/viewType radios |
| Fusion-split logic, per-form stats | Both | Keep logic; the aggregation extraction (Phase 1) already covers most of it |
| **Build recommendations** (`generate­RecommendedBuilds`, `suggestBuildImprovements` in `buildRecommendationEngine.js`) | Team | **Surface, don't just keep.** Already implemented but buried in Meta Analysis. Principle 4 puts these on the Character page, where the build decision is actually made. |
| **Character comparison (head-to-head)** | Team | **New.** 2–3 characters side by side. Nothing supports this today beyond scanning a table. |
| **Build comparison on one character** | Team | **New surface over existing math.** Same character across capsule builds / AI strategies, side by side. `BuildTableView` and `BuildDisplay` (in `App.jsx`) are the raw material. |
| **Position / lineup planning** | Team | **Promote.** Position drives matchups and some builds are position-specific, so this is a first-class planning surface, not just a filter on the Character page. See the Phase 3/4 note. |
| **Trend over time** | Team | **New.** Is this character/build/team rising or falling across a season or test run? Nothing in the app is time-aware today. Depends on Phase 1.5's index carrying an ordering key. |
| **Matchup analysis** (character vs opposing character) | Team | **Candidate, not committed.** Opponent data already flows through `characterAggregation.js`/`teamAggregation.js`. Principle 6 argues it should be first-class; scope it once the Character and Team pages exist. |

---

## Target information architecture (routing)

```
/analyzer/                          → Home: stats-only landing (see Phase 5 — NOT standings)
/analyzer/characters                → Character leaderboard (searchable, sortable)
/analyzer/characters/:charId        → Single character deep-dive (charId = e.g. 0620_00)
/analyzer/teams                     → Team rankings
/analyzer/teams/:teamSlug           → Single team deep-dive
/analyzer/matches                   → Match browser (BRDataSelector + tag filters, driven by br-data-tags.json)
/analyzer/matches/:matchId          → Single match report (matchId = encoded relative file path)
/analyzer/meta                      → Build/AI/capsule meta analysis
/analyzer/sandbox                   → Manual upload / testing workspace
```

Filters become querystring state on these routes, extending what `TagFilterSelector` already proves out — so a filtered view is shareable, not just the base page. `src/routes.js` already defines these paths; it just needs to actually be imported.

---

## Share-snippet feature

- Reusable `<ShareButton>` used on Character/Team/Match pages and in the Sandbox.
- **On league-data pages:** copies the deep link to the current view **and** offers "copy as image card" (renders the on-screen key-stats block via canvas/`html-to-image`).
- **In the Sandbox:** image-card export only, no deep link — sandbox data isn't persisted, so a link wouldn't resolve for anyone else.
- Format priority: **image card first** (this is what gets pasted into Discord); text/markdown fallback deferred.
- **Prerequisite:** the 404 dispatcher above. A share button that emits broken links is worse than no share button.

---

## Phased rollout

### 1. Foundation — ✅ complete

See "Progress". Router wired, aggregation extracted, URL scheme defined.

### 1.5 Data layer — ✅ core complete, see "Progress" for what shipped and what is still open

**The problem the original plan missed.** `BRDataSelector.jsx:44` sets `DEFAULT_SELECTION = 'all'` and on mount selects every file and fires `onSelect`. `App.jsx:2836-2867` then fetches them in 12 sequential batches of 200, calling `setFileContent` after each batch:

- **~2,232 HTTP requests, ~67 MB downloaded**, held in React state as one array, with 12 full re-renders of a 6,678-line component — on every page load.
- This is the app's dominant performance characteristic. It is hostile on mobile, which is precisely what Phase 2 is meant to fix.
- The planned Home dashboard and cross-match character leaderboard sit *directly* on top of this cost. Building them first would bake it in.

**Work:**

1. New prebuild script `scripts/generate-br-aggregates.js`, running after `generate-br-data-tags.js`, emitting a **slim per-character-appearance row index**: one row per character per match, carrying only the fields the aggregation functions actually consume — damage given/taken, kills, max combo num/damage, battle time, equipped capsule IDs, AI strategy key, map key, slot/position, KO/ring-out flags, result — keyed by the same relative path `br-data-tags.json` uses.
2. Sizing target ≈ 14k rows (2,232 matches × ~6 characters). If a single file exceeds a few MB, shard by `matchType` or season and fetch shards on demand; `br-data-tags.json` already tells the client which shards a filter needs.
3. Retarget `src/utils/aggregation/*` to consume index rows instead of raw file contents. Because aggregation still happens client-side over rows, **arbitrary filter combinations keep working** — nothing needs precomputing per-combination.
4. Full match JSON is fetched **only** when opening a single match. `handleNavigateToMatch` (`App.jsx:2248`) already does exactly this and is the model.
5. Fold in the surviving `filteredAggregatedData` inline `useMemo` (`App.jsx:1413`) while the aggregation functions are being reshaped — this closes Phase 1's loose end #1 at the natural moment. Delete the dead `getPositionInsight` import.
6. Cheap win in the same phase: change `DEFAULT_SELECTION` off `'all'`. Per principle 2, **the default is the current active season**, with the scope shown and changeable in the UI. The index must therefore carry `seasonNumber`/`seasonPhase`/`matchType` per row so a season-scoped default costs one filter rather than a different fetch strategy.
7. **Carry an ordering key per row** (match sequence, or at minimum the season/phase/file ordering already implicit in the filenames) so the "trend over time" feature in the audit above is possible later without regenerating the index. Nothing in the app is time-aware today; adding the key now is nearly free, retrofitting it is not.
8. Keep the index's row shape **stable and documented** — it becomes the interface every aggregation, leaderboard, comparison and trend view is written against.
9. The **Sandbox keeps the raw-file aggregation path**, since uploaded data has no prebuilt index. This is the one place both code paths must coexist — keep the row shape as the shared interface and give the Sandbox a raw-file → rows adapter.

> **Note:** `apps/analyzer/public/BR_Data/` is a git-tracked copy of `apps/analyzer/BR_Data/`, regenerated by `generate-br-data-structure.js` on every prebuild. This is a **deliberate deployment artifact** consumed by the gh-pages build and refreshed on every push to `dev-branch`/`main`. Do not gitignore it, and do not treat a local file-count difference as staleness.

### 2a. Tailwind + design tokens + dependency consolidation

- **Install real Tailwind v3**, matching siblings: `tailwindcss`/`postcss`/`autoprefixer` as devDependencies, add `apps/analyzer/postcss.config.js`, add `@tailwind base/components/utilities` to the CSS entry. The existing `tailwind.config.js` becomes live. This alone fixes the 9 used-but-undefined breakpoint classes and the missing `xl:` breakpoint.
- **Design tokens in `packages/ui`.** It has no build step and is consumed by Vite alias, so a plain `packages/ui/src/tokens.js` can be imported by each app's `tailwind.config.js` and spread into `theme.extend.colors` with zero new infra. **Canonical accent is `#f97316`** — already used by website (`dbz.orange`) and calculator (`sz-orange`). The analyzer shifts off `dragon-orange` `#f59e0b`, including the hardcoded gradient at `App.css:22`. One shared token name replaces `dbz.orange`/`sz-orange`/`dragon-orange`; matchbuilder's 47-entry `safelist` + `colors: require('tailwindcss/colors')` hack goes too. *Caveat:* if tokens ever ship as Tailwind classes used inside `packages/ui` components, every consumer's `content` array needs `'../../packages/ui/src/**/*.{js,jsx}'` added — none currently include it.
- **Dependency consolidation:**
  - `@vitejs/plugin-react` is declared in **both** `dependencies` (`^5.0.4`) and `devDependencies` (`^4.0.0`). Remove the devDependency.
  - **`@mui/x-tree-view` and `@mui/lab` are entirely unused** — zero imports anywhere in `src/`. Free removal.
  - **Two Excel libraries.** `exceljs` is the real path (`src/utils/excelExport.js`, 1,648 lines). `xlsx` is used in exactly two places — `IndividualCapsulePerformance.jsx:132-135` and `SynergyPairsAnalysis.jsx:117-120`, four trivial lines each (`json_to_sheet` → `book_new` → `book_append_sheet` → `writeFile`). Port both to `exceljs` and drop `xlsx`. (`ExportManager.jsx:2-3` already has both imports commented out.)
  - Remaining MUI surface is small and portable — `Autocomplete` + `TextField` (`App.jsx:4-5`), and 8 `@mui/material` components + 7 `@mui/icons-material` icons (`BRDataSelector.jsx:2-16`). **Retire in Phase 4** with the Matches page rebuild, dropping `@mui/material`, `@mui/icons-material` and `@emotion/*`. Icons map onto `lucide-react`, already a dependency.

### 2b. `App.css` teardown — incremental, **not** a gate

Retire the 2,062-line hand-rolled `App.css` and the 1,199 `darkMode` ternaries **per component, as each page is rebuilt**, rather than as one up-front migration. Replace prop-drilled `darkMode` with Tailwind's `dark:` variant plus a small `ThemeContext` (the website prop-drills `darkMode` through every route — explicitly do *not* copy that).

This is the key sequencing change from the original plan: the CSS teardown rides along with visible work instead of blocking it, and the regression surface is one component at a time rather than a 6,678-line file at once.

### 2c. Responsive shell, accessibility, persistence

- Rebuild the app shell: replace the wide mode/view-type card row with something that degrades on mobile (segmented control / scrollable tabs); give the sticky filter panel a mobile collapsed/slide-over treatment; give `DataTable` a mobile strategy (horizontal scroll with sticky first column, or card-per-row under a breakpoint).
- Consolidate the 13 inline stat primitives out of `App.jsx` into theme-aware, responsive components under `src/components/`.
- Reuse `packages/ui/NavBar.jsx`'s existing mobile hamburger pattern rather than inventing a new one.
- Accessibility: contrast, focus states, 44px touch targets, keyboard nav for the tree selector and comboboxes.
- **Add persistence** (new): a small `localStorage` layer for dark mode and filter state. There is none today, so a shared deep link always opens in defaults.
- Validate at 375px / 768px / 1280px with real builds.

### 3. Character page rebuild

**Prerequisite: the 404 dispatcher must ship first.**

First page on the new architecture. Real `<Route>` entries replace the catch-all; `src/routes.js` finally gets imported; `TagFilterSelector` moves from `history.replaceState` to `useSearchParams`; `<ShareButton>` is introduced here. Per-form/fusion tabs surface what `fusionSplit.js` and `formStatsCalculator.js` already compute.

This is also where the participant workflow starts paying off, and the page should be shaped by principles 1 and 4 rather than by what `App.jsx` currently renders:

- **Default view** = a handful of legible headline stats, scoped to the current active season, with the scope visible and changeable.
- **Build comparison** behind an Advanced tab: the same character across capsule builds and AI strategies, side by side. `BuildTableView` / `BuildDisplay` (currently inside `App.jsx`) are the raw material.
- **Build recommendations surfaced here**, not left in Meta Analysis — `generateRecommendedBuilds` and `suggestBuildImprovements` already exist in `buildRecommendationEngine.js` and this is where the decision is made.
- **Position breakdown** as a tab on this page, per the original feature audit — but see Phase 4 for the standalone lineup-planning surface.
- **Character comparison** (2–3 side by side) as a querystring-driven mode on the leaderboard, so a comparison is itself shareable.

### 4. Team page + Match page rebuild

Reuse the shared aggregation and `<ShareButton>` proven in step 3. Define and test the match-ID encoding scheme (relative path, spaces and slashes, round-tripped through the router). Retire MUI here with the Matches browser rebuild.

Two participant-facing additions belong here, both flowing from principle 4:

- **Lineup planning as a first-class surface on the Team page.** Since a lineup is (character × AI strategy × capsules × position) and position drives matchups, a team member should be able to reason about Lead / Middle / Anchor in one place rather than by filtering a character table. `positionAggregation.js` already provides the math.
- **Trend over time** for a team and its characters across a season or test run, using the ordering key added to the index in Phase 1.5.

**Matchup analysis** (how character A actually fares against character B, by position) is a strong candidate here — opponent data already flows through `characterAggregation.js` and `teamAggregation.js`, and principle 6 argues it should be first-class. Scope it once the Character and Team pages are real; don't commit to it before then.

### 5. Home dashboard — **rescoped**

**Stats-only. No standings.** The website app already owns standings, teams and events as its core content; duplicating them here creates two sources of truth and a sync obligation. Link across to the website for standings via `@szl/ui`'s `APPS` constants.

This is the casual viewer's front door, so principle 1 governs it absolutely: **something interesting within seconds, zero configuration.** It is scoped to the current active season by default (principle 2), with the scope stated on the page and changeable.

- **Curated category leaderboard cards** — named, opinionated boards a newcomer grasps instantly: Top Damage Dealer, Best Survivor, Best Lead, Best Anchor, Best Combo, Most Efficient. **Implement these as presets over the single Character leaderboard, not as separate features** — each card is a saved querystring that links into the full table pre-filtered and pre-sorted. One implementation, one source of truth, and a casual viewer who clicks through lands somewhere they can keep exploring.
- Spotlight character / team stat cards.
- Meta movers — what has risen or fallen since the last season phase (uses the Phase 1.5 ordering key).
- Notable recent matches by damage / combo / upset.
- Clear entry points into Characters / Teams / Matches / Meta / Sandbox.

Team test data is reachable from here but is not the default lens (principle 3) — a viewer who arrived to see how the season is going should see the season.

### 6. Meta/Builds page consolidation

Merge AI Strategy Analysis + Capsule Synergy Analysis + Build Analyzer Tool into one page with tabs.

### 7. Sandbox polish

Manual Upload mode gets the new design system and image-card sharing (no deep links — data isn't persisted). Retains the raw-file aggregation path established in Phase 1.5.

---

## Decisions locked in

- **Share snippet format:** image card first (canvas/`html-to-image`), text/markdown fallback deferred.
- **Routing:** react-router `BrowserRouter`, with `basename={import.meta.env.BASE_URL}` (the analyzer's existing approach — better than the website's hardcoded literal).
- **Deep-link production fix:** smart 404 dispatcher in the deploy workflow, prerequisite of Phase 3. HashRouter is the fallback if it proves troublesome.
- **Data loading:** build-time slim aggregate index (Phase 1.5), before any page rebuild.
- **Rollout order:** Foundation → **Data layer** → Tailwind/tokens → Character → Team/Match → Home → Meta → Sandbox, with the `App.css` teardown running incrementally alongside the page rebuilds rather than gating them.
- **Canonical accent color:** `#f97316`. The analyzer shifts off `#f59e0b`.
- **Home page scope:** analyzer-specific stats only; standings stay with the website app.
- **Team test data is fully public** and must stay easy to reach for anyone. No gating, no hiding — it is simply not the default lens.
- **Default data scope is the current active season**, everywhere, because active game updates and league rule changes make the newest season the most reliable. Scope is always visible and always changeable.
- **Curated leaderboards are presets, not features.** Category cards (Top Damage Dealer, Best Survivor, Best Anchor, …) are saved querystrings over the one Character leaderboard.
- **Plan for both entry points.** Home is a real orientation page *and* every deep-linked page is self-contained with a share card. Neither is traded off against the other.
- **The team-facing half is decision support for the next lineup submission** — AI strategy, capsules, position — not a stats archive. The four participant workflows (build comparison, character comparison, lineup/position planning, trend over time) are all in scope; matchup analysis is a strong candidate to be scoped after Phases 3–4.
- **Dependency consolidation in scope:** drop `@mui/x-tree-view`, `@mui/lab`, `xlsx`, and the duplicate `@vitejs/plugin-react` devDependency now; drop `@mui/material`/`@mui/icons-material`/`@emotion/*` in Phase 4.
- **Sandbox** stays fully separate from the public league dataset (no persistence, no deep links to uploaded files), but gets the same image-snippet share button since it's a pure client-side render.
