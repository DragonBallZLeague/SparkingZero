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
- **Plan lineups by position** — work out who belongs at Starter / Middle / Anchor, given that position drives matchups and that some builds are position-specific.
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
2. Every character, team, and match gets a real, shareable URL. The production fallback that broke these is **fixed** — see the section below.
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
  1. ~~`filteredAggregatedData` is still an inline `useMemo` at `App.jsx:1413`~~ — **closed 2026-09-26** at the start of Phase 3: extracted verbatim to `src/utils/aggregation/filterAggregated.js` (695 lines) and covered by `npm run verify-filters`.
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

**Closed 2026-09-26** (at the start of Phase 3, as planned): `filteredAggregatedData` has now been extracted to `src/utils/aggregation/filterAggregated.js`. The reasoning for deferring it stands as written — `filteredAggregatedData` (`App.jsx:1413`, ~697 lines inline) had *not* been extracted during Phase 1.5 — it is a code-organisation concern rather than a data-layer one, and folding a 697-line refactor into the data change would have put untested stat math at risk for no payload benefit. Do it with the Character page rebuild (Phase 3), where the consuming view is being rewritten anyway. The per-row `seq` ordering key is emitted and ready for trend views, but nothing consumes it yet.

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

### Phase 3 — Character page: in progress

Routing, the Character page itself, `<ShareButton>`, the shared presentational components and the absolute tier pills have shipped. **The Overview tab's design was approved on 2026-09-28** and is ready to implement — see "Overview tab: approved design" under Phase 3 below. Still open: the other tabs' visual design, the share-snippet image card, build comparison and character comparison.

### Phases 4–7: not started

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

- **Characters are addressed by NAME SLUG, with the id as a permanent alias.** `battlePlayCharacter.character.key` / `originalCharacter.key` are stable strings like `0620_00`, resolved through `referencedata/characters.csv` (241 entries) — but a raw key is meaningless to a reader (`0620_00` is **Android 13**), and these links get pasted into Discord. The canonical URL is therefore `/characters/android-13`. See "Character URL scheme" below for the verification behind this. Note `statCalculations.js:51-54` prefers `originalCharacter`, so transformed forms collapse to their base — which is exactly what `fusionSplit.js` and `formStatsCalculator.js` exist to unwind, and what a per-form tab on the Character page should surface.
- **There is no match ID field.** No `matchId`, `id`, `date` or `uuid` exists in any BR_Data file. Match identity is the **relative file path** (`Seasons/Season 0/S0 Week 1 Match 1.json`) — the same key used by `br-data-tags.json`, `BRDataSelector`'s tree ids, and `handleNavigateToMatch`. Those paths contain spaces and slashes, so `/matches/:matchId` needs deliberate encode/decode (`routes.js` already `encodeURIComponent`s, but round-tripping through the router needs testing). Filenames do encode structured info (`OS0 Time Patrol Test 58 Match 1 R3`) if a cleaner slug is preferred later.
- **Team IDs** are plain display names from `tags.team[]` (12 values, e.g. "Master and Student"). Slugging is straightforward but does not exist yet.

### Reusable pieces (unchanged, still sound)

`BRDataSelector` (file picker — note: **hand-rolled tree**, not an MUI `TreeView`), `TagFilterSelector`, `Combobox`/`MultiSelectCombobox`, `DataTable`/`TableConfigs`/`ExportManager`, `PerFormStatsDisplay`, `components/ai-strategy/*` (7 components), `components/capsule-synergy/*` (incl. `BuildAnalyzerTool`).

The **tagging pipeline is a solid foundation**: `scripts/autoTagMatches.js` → `public/br-data-structure.json` (108 KB tree) → `public/br-data-tags.json` (566 KB, 2,232 entries). `br-data-tags.json` alone supports match browsing and filtering **with zero match fetches** — the Matches page should lean on it.

---

## ~~Blocker~~: deep links are broken in production — ✅ FIXED (2026-09-26)

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

**Implemented 2026-09-26.** `scripts/build-404.js` replaces the `cp` step: it keeps the website's markup, so website deep links behave exactly as before with no extra redirect, and injects a dispatcher into `<head>` covering analyzer, matchbuilder, calculator, admin and submit. `restoreDeepLink()` lives in `packages/ui/src/deepLink.js` and is called before the router in `apps/analyzer/src/main.jsx`; `apps/admin/src/main.jsx` carries an inline copy because Admin does not consume `@szl/ui`. `scripts/verify-404.mjs` asserts the routing table — including the awkward case of a match id that ends in `.json`, and an `/assets/` path that must stay a real 404 — and imports the same `resolveRedirect` that is stringified into the page, so the tested and shipped logic cannot diverge. It runs in the deploy workflow. `scripts/serve-dist.js` reproduces the Pages 404 rule locally, which no dev server does.

*Alternative if this proves troublesome:* `HashRouter` for the analyzer only (`/analyzer/#/characters/0620_00`). Zero infra risk, works immediately, but uglier links and diverges from the website's `BrowserRouter` pattern. Prefer the dispatcher.

---

## Character URL scheme — slug, not key (decided 2026-09-26)

**Decision: the canonical character URL carries the name as a slug.** `/analyzer/characters/android-13`, not `/analyzer/characters/0620_00`.

The driver is principle 1 and the share-snippet goal: these links are meant to be pasted into Discord, and an internal key tells the reader nothing. `0620_00` *is* Android 13, and no participant would guess that. A link that names the character is self-describing in exactly the way a tag filter is — the same reasoning that moved default scoping onto visible tag filters rather than a silent folder pre-selection.

### Why this is safe (verified against the real data, not assumed)

| Property | Result |
|---|---|
| Name uniqueness | **241 characters, 241 unique names** — no duplicates at all |
| Slug uniqueness | **241 unique slugs, zero collisions**, including diacritics (`Goku Black Super Saiyan Rosé` → `goku-black-super-saiyan-rose`) and the long form chains (`goku-super-super-saiyan-god-super-saiyan`) |
| Coverage in real data | **194 distinct characters appear across all 2,505 matches; all 194 resolve to a name.** No orphans |
| Name stability | Every commit touching `characters.csv` is a **pure insertion** (209 rows, then 33 DLC additions). **Zero renames, zero deletions** in the file's entire history — which is what makes name-based links safe from rot |
| Namespace separation | All 241 ids match `^\d{4}_\d{2}$`, and **no character name contains an underscore**, so no slug can ever be mistaken for an id |

### Raw ids remain valid forever

`resolveCharacterParam()` accepts a slug *or* a raw id. That is not belt-and-braces, it covers a real failure mode: **a newly released character appears in submitted match data before `characters.csv` gains a row for it.** With no name there is no slug, and a slug-only route would make that character unreachable precisely when curiosity about it peaks. The id route always resolves, and the page degrades to showing the raw key until the CSV catches up. It also means any link shared before a hypothetical future rename keeps working.

Because the two namespaces provably cannot collide, the dispatch is a single regex test rather than a heuristic or a guess-and-fallback.

### What enforces it

- **`apps/analyzer/src/utils/characterSlug.js`** — `slugifyCharacterName()`, `buildCharacterSlugIndex()`, `resolveCharacterParam()`, `characterUrlKey()`. Splits the CSV on the **last** comma, so a name containing a comma (none do today) cannot silently truncate and corrupt a slug.
- **`npm run verify-slugs`** (`scripts/verify-character-slugs.mjs`, wired into `prebuild`) — asserts slug uniqueness, namespace separation, and a lossless `id → slug → id` round trip, and **fails the build** on a violation. Slug uniqueness is true today but nothing else guarantees it: a future DLC name differing from an existing one only by punctuation would silently collide and two characters would fight over one URL. Same philosophy as `verify-404.mjs` and `verify-aggregates` — catch it in CI, not in production. A character present in match data but missing from the CSV is a **warning**, not a failure, since the id route still serves it.
- **`src/routes.js`** stays a pure path builder with no data dependency; `ROUTES.character()` takes the URL key that `characterUrlKey(id, index)` produces.

**Do not change `slugifyCharacterName()` without re-running the verifier** — altering the algorithm silently rots every link already shared.

### Two related findings

- `statCalculations.js:parseCharacterCSV` splits on the *first* comma. Harmless (it only reads the id, and no name contains a comma) but it is why slug parsing deliberately does not reuse it.
- **47 named characters never appear in the corpus.** A `/characters` index built from `characters.csv` would therefore list 47 dead pages — build it from the match data instead.

---

## Performance tiers — decided 2026-09-26, **implemented 2026-09-27**

The leaderboard's performance banding was **percentile-relative to whatever the user had currently filtered to**, which made it self-referential: deselecting "Excellent" re-ranked everyone left, so a character turned green without their score changing. The band was also communicated *only* by colour, named nowhere except the filter chips.

### Decision

**Absolute tier cutoffs, frozen from a recent calibration window.** Tiers are **Z / S / A / B / C** (Z highest, ahead of S — the Dragon Ball convention, not the generic S-at-the-top).

| Tier | Score ≥ | Share of the calibration population |
|---|---|---|
| **Z** | 75.0 | top 10% |
| **S** | 65.4 | next 20% |
| **A** | 55.2 | middle 30% |
| **B** | 48.4 | next 20% |
| **C** | — | bottom 20% |

- `scripts/generate-performance-bands.mjs` (in `prebuild`, also `npm run build-bands`) writes `src/config/performance-bands.json` — **committed**, so a recalibration is a reviewable diff. It refuses to write if the basis matches no matches or fewer than 20 scored characters, rather than emitting nonsense cutoffs.
- `src/utils/tierScale.js` holds the scale (names, percentiles, labels, provisional threshold) with **no imports**, so the generator can read it before its own output exists. `src/utils/performanceTier.js` adds the generated cutoffs and `tierForScore()`.
- `src/components/TierBadge.jsx` — the badge plus `<TierLegend>`. Provisional tiers render dashed with a `?`.
- The five level chips are gone, replaced by a minimum-score slider + number input.
- `npm run verify-filters` asserts the cutoffs descend, that `tierForScore` agrees with them exactly, and — the point of the whole change — that **a character's tier is identical whether computed from the full view or a filtered one**.

Current calibration: 1,350 matches / 148 characters from Seasons 0+1 Ultra, giving Z ≥ 75, A ≥ 65.4, B ≥ 55.2, C ≥ 48.4 and a 16/30/43/29/30 spread.

### Supporting work

- **`src/utils/performanceScore.js`** — `combatEfficiency()` clamps the damage-efficiency term (see that file for why the old code had three different answers for "what if nothing was taken?"). **Proven to change no real score:** 593 character and team entries across four corpus slices are byte-identical before and after.
- **The performance-level filter is replaced by a minimum-score input**, matching the Matches Played control beside it. With absolute cutoffs the five chips are redundant, and a score threshold is self-describing and shareable as a querystring.
- **Badges must be labelled**, not colour-only — `Score: 80 · A` plus a legend naming the basis.

### Still open

- The score formula itself is **duplicated across ~15 sites in 8 files**. `combatEfficiency()` consolidates the part that was broken; consolidating the rest is Phase 3+.
- `PerformanceScoreBadge` in the team and single-match views still measures against team-local or match-local populations. Absolute cutoffs make those consistent for free once adopted.

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
/analyzer/characters/:charSlug      → Single character deep-dive (name slug, e.g. android-13; raw id also accepted)
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
5. ✅ **Done 2026-09-26** — `filteredAggregatedData` extracted verbatim to `src/utils/aggregation/filterAggregated.js`, `getPerformanceLevel` moved to `src/utils/performanceLevel.js`, `App.jsx` down to 5,959 lines. The body was copied byte for byte so behaviour is unchanged, and `npm run verify-filters` is the first coverage this math has ever had. It also surfaced a real pre-existing bug: `getPerformanceLevel` returned `below-average` while the filter UI stored `below`, so below-average characters vanished whenever any level was deselected — **19.8% of rows (202 of 1,018 across all shards)**. Preserved verbatim through the extraction, then **fixed as its own change (`below` → `below-average` in the filter UI)** so the behaviour change was visible rather than buried in a refactor. (The dead `getPositionInsight` import was already removed in Phase 1.5.)
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

**Routing foundation done 2026-09-27**: real `<Route>` entries replace the bare catch-all (a `path="*"` fallback is kept on purpose so stale links still render), `src/routes.js` is imported by `main.jsx` and `App.jsx` and owns the view mapping, `viewType` is derived from the URL instead of state, `TagFilterSelector` has moved from `history.replaceState` to `useSearchParams`, and `/characters/:charParam` resolves a slug or a raw id and canonicalises the id to the slug. `npm run verify-routes` guards the scheme. **Character page done 2026-09-27**: `src/pages/CharacterPage.jsx` renders in place of the leaderboard on a character deep link — identity header with the absolute tier plate, headline stats, usage, the position split, the per-form breakdown (via the existing `PerFormStatsDisplayAggregated`), top builds and recent matches that click through to the match view. It is purely presentational; every number already existed in the aggregated row. `<ShareButton>` copies an absolute deep link to the current view. `npm run verify-character-page` guards the page's data contract by scraping the fields it reads out of its own source. **Still to do in this phase: the share-snippet image card, the Advanced-tab build comparison, and the querystring-driven character comparison below.** The page settled on a **tabbed** layout (compared against a dense single column and a sticky rail with real data); its **visual design is deliberately deferred** to a dedicated design conversation with demos, held once the current structural work is finished, and judged against both participants and casual viewers. The known brief so far: nothing leads the eye, and every surface shares one background and text colour.

#### Overview tab: approved design (2026-09-28)

Settled over a long design conversation with real-data demos. The working demo is the spec: `apps/analyzer/design/character-overview/` (see its README to run it). The page answers two questions for a participant **and** a casual viewer: *how is this character doing on the stats that matter*, and *what kind of fighter is it*.

**Layout, top to bottom**

1. **Identity header**: tier plate and score pill for the current view. Selecting a build switches both to that build's score.
2. **"Showing one build · Show all builds" strip**: appears above the stats only while a build is selected, so a filtered view (including one opened from a shared link) never passes for the whole picture.
3. **Five headline tiles**: Damage dealt, Damage taken, Efficiency, Damage/sec, Battle time. Each has its value, a bar with a league-median tick, and one line reading rank on the left and "League 38,981" on the right. The league number is inline rather than in a tooltip because these are the main comparisons and phones cannot hover. Win rate is deliberately absent. Battle time is neutral (longer is not simply better).
4. **Six move cards**:
   - **Super 1, Super 2, Ultimate**: hit/thrown per match written `1.5/2.3`, with a donut of the hit rate and a league-median tick.
   - **Ki blasts**: blasts fired per match only. There is no ki-blast hit rate: a deflected enemy blast that lands is credited as the deflector's hit, so one cannot be computed honestly (`apps/analyzer/docs/ACTION_CODES.md`).
   - **Skill 1, Skill 2**: uses per match, as a filling circle with a dashed league-median ring.
   - Donuts and circles wear the move's style colour; only the rank text is rank-coloured.
   - A hit rate with fewer than 10 throws in total is not ranked. It shows "Only 6 thrown" and dims its colour, as a thin-sample tier plate does.
   - Hovering or tapping a card shows a **Me / League** table.
5. **Style band**: a left column and a right column.
   - **Left column**, in order:
     - the build picker
     - the fighting-style label (one label, or two with the second smaller)
     - the most common build, as a one-column capsule list grouped by capsule type in the same largest-first order as its cost bar
     - the most used AI (or "Varied" when strategies tie)
   - **Right column**: "How it fights", with **Radar (default) / Bars** views over six styles, always in this order: **Melee, Ki Blasts, Blasts, Ultimates, Skills, Defense**.
     - **Bars** use aligned **Per min | League | Rank** columns, with sub-bars two to a line: Rush/Heavy, Super 1/2, Skill 1/2, and Guards/Counters/Tags/Survival.
     - **Radar** names are white with a style-colour square, the rank sits below each name, and hovering shows a Me / League table including the sub-stats.
   - The league median appears as a tick on the bars and as a dashed hexagon on the radar.

**What is measured**

- **Frozen league baseline**, the same window as the tier cutoffs: the last two seasons, Ultra difficulty only, characters with 5+ appearances (126 today). A character, or a single build, is always ranked against this baseline, never against whatever is filtered on screen.
- **Style rates are per minute on the field**, so an Anchor with long fights is not rated a heavier user than a Starter.
  - **Melee** = rush hits + heavy hits (`ACTION_CODES.md`).
  - **Blasts** = supers cast. **Ultimates** = ultimates cast.
  - **Skills** = `runBlastCount` EXA1 + EXA2 (never `eXACount`, which is broken in Season 1 files).
  - **Ki Blasts** = blasts fired.
  - **Defense** = a blend of percentiles, re-ranked: guards 40%, counters 30%, time on field 15%, tags 10%, survival 5%. Deflects are excluded because many are automatic.
- **Per-match figures** are per match the character actually fought in.
- **Fighting-style labels**: Melee Fighter, Ki-Blast Spammer, Blast User, Ult Spammer, Skill User, Defensive Fighter, and All-Rounder when nothing reaches the 75th percentile. A second label shows when two styles are within 15 points.
- **A raw zero draws an empty bar and reads "Never"**, never a tied rank.

**Display conventions** (also recorded as standing preferences)

- **Rank reads `#42/126`**, with the pool in faint grey. Each metric shows its own pool, since hit rates exclude characters who never threw.
- **Colour appears only at the ends**: the top fifth of the pool in green, the bottom fifth in red, everything between neutral. Banded, not a gradient, so #3 and #10 are the same green. Dark mode uses `#16e05a` / `#ff2b3a`; light mode uses `#047a2e` / `#c8102e`. Every colour reads at 4.5:1 or better as text.
- **Style colours are the build-type colours** (`getBuildTypeColor`), with pink for Ultimates. They go on graphics; labels stay white with a style square.
- **No "·" separators**: use aligned columns or separate elements.

**The build filter**

- **A build is the leaderboard's definition**: exact capsule set plus AI strategy.
- **The page reuses `filterAggregatedData`** with that build key, so a build's numbers are identical to the leaderboard's.
- **The picker shows four things**: build type, AI, uses and score.
  - A fifth line naming the capsules that differ appears only when two builds share both type and AI.
  - Score pills for builds under 5 uses are dimmed.
- **URL**: `?build=<short code>`.

**Implementation steps**

1. ✅ **Shared action-code classifier** (done 2026-09-28): `src/utils/actionCodes.js`, from `ACTION_CODES.md`.
   - Per-entry rush, heavy and ki-blast hits travel through the compact corpus as `styleHits` (corpus v2).
   - `extractStats` exposes them as `rushHits` / `heavyHits` / `kiBlastHits`, and they are carried into per-match rows. `verify-aggregates` proves raw and compact identical.
   - `npm run verify-action-codes` (in prebuild) spot-checks the classifier against the doc.
2. ✅ **`extractStats` fixes** (done 2026-09-28):
   - `skillsUsed` is EXA1 + EXA2. The leaderboard had counted 12,761 skill uses across the data against 8,266 real ones.
   - The `actRI*` speed-impact fallback is gone. It had credited 13,845 phantom speed impacts to 5,207 character entries with none.
3. **A style-baseline generator**, beside `generate-performance-bands`.
   - Frozen and committed (e.g. `src/config/style-baseline.json`), holding the sorted per-metric values and medians that ranks need.
   - Idempotent, with the timestamp carried over, so a rebuild without a recalibration leaves no diff.
4. **One shared build-key function**.
   - Today the key is written out three times: `BuildTableView`, `filterAggregated`, `App.jsx`.
   - Add a short-code encoding for `?build=`.
5. **The Overview components** (Tailwind, theme-aware), replacing the current Overview blocks. Extend `verify-character-page` and `smoke-character-page` to cover them.
6. **Delete `design/character-overview/`** once the tab matches it.

This is also where the participant workflow starts paying off, and the page should be shaped by principles 1 and 4 rather than by what `App.jsx` currently renders:

- **Default view** = a handful of legible headline stats, scoped to the current active season, with the scope visible and changeable.
- **Build comparison** behind an Advanced tab: the same character across capsule builds and AI strategies, side by side. `BuildTableView` / `BuildDisplay` (currently inside `App.jsx`) are the raw material.
- **Build recommendations surfaced here**, not left in Meta Analysis — `generateRecommendedBuilds` and `suggestBuildImprovements` already exist in `buildRecommendationEngine.js` and this is where the decision is made.
- **Position breakdown** as a tab on this page, per the original feature audit — but see Phase 4 for the standalone lineup-planning surface.
- **Character comparison** (2–3 side by side) as a querystring-driven mode on the leaderboard, so a comparison is itself shareable.

### 4. Team page + Match page rebuild

Reuse the shared aggregation and `<ShareButton>` proven in step 3. Define and test the match-ID encoding scheme (relative path, spaces and slashes, round-tripped through the router). Retire MUI here with the Matches browser rebuild.

Two participant-facing additions belong here, both flowing from principle 4:

- **Lineup planning as a first-class surface on the Team page.** Since a lineup is (character × AI strategy × capsules × position) and position drives matchups, a team member should be able to reason about Starter / Middle / Anchor in one place rather than by filtering a character table. `positionAggregation.js` already provides the math.
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
- **Performance tiers are Z/A/B/C/D with absolute cutoffs**, calibrated from a rolling last-2-seasons Ultra-only window, not percentiles relative to the current filter. The level filter becomes a minimum-score input. See "Performance tiers" below. **Decided 2026-09-26.**
- **Character URLs use the name slug, not the internal key.** `/characters/android-13`, not `/characters/0620_00`. Raw ids stay valid forever as an alias. Verified and enforced at build time — see "Character URL scheme" below. **Decided 2026-09-26.**
- **Deep-link production fix:** smart 404 dispatcher in the deploy workflow — **implemented 2026-09-26** (`scripts/build-404.js` + `restoreDeepLink()`), so Phase 3 is unblocked. HashRouter was the fallback and was not needed.
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
