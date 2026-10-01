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

### The restyle: ✅ closed 2026-09-30

The league's call, after going through what was left of the plan: the restyle (the shell, every page's redesign, the table template, the league's last review and the removal of the old styling and setup) is done. What closed it, on 2026-09-30:
- **The old setup is gone.** `App.css` (2,062 lines, in the losing `legacy` layer since 2026-09-28) was deleted once no class the app used depended on it, and Tailwind's preflight turned on, with two of its defaults put back (line height `normal`, borders in the text colour) because the pages were measured against the approved demo without them; a computed-style diff of every view at 1280px and 390px showed nothing else that draws. The light-mode code went (the `darkMode` state and its last 306 mentions, the light palettes), `components/TableConfigs.jsx` became `utils/workbookColumns.js` without the deleted Data Tables page's render functions, the old per-form aggregation (`formStatsArray`, a team's `formStats`) went, and so did the throwaway shell demo, an unused `Test.jsx` prototype and a stale note. The workbook came out identical, cell for cell, on all six sheets.
- **Every stat table is on the one template** (`shell/StatTable.jsx`): the Characters, Teams, Team page Roster and Opponents and Meta Builds tables moved onto it, looking as they did.
- **The Character page's open tab is in the URL** (`?tab=`), as the page-by-page review asked, so "look at Goku's builds" is a link.
- **The Bars view has a phone layout of its own**: beside four figure columns the bars shrank to stubs and the sub-figures ran off the right edge. Now each style is a block, its name, rate and rank on one line over a full-width bar, and its sub-figures two to a line under it, each over a half-width bar.
- **Decided with the league:** the Home page (Phase 5: the six curated boards and the latest week's results beside the tier list) is the **immediate next step**; the small export on each table is **dropped** (the scope bar's full workbook covers it); the accessibility pass moves to the next phase (only the Bars view's phone layout was done now).

**Home (Phase 5) followed the same day** (see "Phases 4–7" below), with the Characters page's Styles view and a tablet layout for every wide table. **That closed the restyle work**: the league approved it, the local `analyzer-restyle` branch was merged into `dev-branch`, and the league pulled the remote's data submissions into it and pushed it (2026-09-30).

**Next phase**, from the plan's remaining work:
- **transformations, brought back** (decided 2026-09-30; see "Transformations" below): steps 1 and 2 of 4 done
- the share-snippet image card (Phase 3 and 7)
- build comparison and the querystring-driven character comparison (Phase 3)
- trends over time, and deeper matchup analysis (Phase 4)
- the accessibility pass (Phase 2c: keyboard order through the chip lists, focus in the phone sheets, 44px targets)
- consolidating the score formula, still written out in about 15 places ("Performance tiers", "Still open")

### Handoff for the next phase (written 2026-09-30, when the restyle closed)

For a fresh start on the next phase: where things stand, how work was checked, and where each item begins. Read "What the Analyzer is for", "Decisions locked in" and `apps/analyzer/CLAUDE.md` first, as before.

**Where the code is.**
- The restyle and Home are on **`dev-branch`, pushed** (2026-09-30: `6b6d1352`, merged with the remote's data submissions in `a0467a21`). The local `analyzer-restyle` branch is kept at `6b6d1352`. Start new work on a new local branch off `dev-branch`, and keep it local until the league approves it (pushing is the league's call).
- **The deploy workflow now checks out the full history, blobless** (`fetch-depth: 0`, `filter: blob:none`), which Home's upload dates need (`generate-recent-uploads.mjs`). The first deploy with it is the one to check: Home's Tests and Events switches should show upload days.

**How work was checked** (the bar every change in the restyle and Home met):
- Build: `npx vite build` in `apps/analyzer` for code changes; `npm run build:analyzer` from the root when data or prebuild scripts change (it runs prebuild). Serve with `node scripts/serve-dist.js 8080` from the root (the Pages 404 rule; dev servers do not reproduce deep links).
- `npm run sweep -- 1280,390` (`scripts/dev/sweep.mjs`): every view, no errors, no sideways scroll, nothing blank. Add tablet widths (640 to 1100) for table work. `npm run shot` for screenshots at both widths; `npm run css-diff` before any sweeping style change.
- The verifiers, all passing on 2026-09-30: `verify-routes`, `verify-self-contained` (both in prebuild), `verify-filters`, `verify-character-page`, `smoke-character-page`, `verify-team-page`, `verify-match-page`, `verify-meta-builds`, `verify-home`. The last six aggregate the real corpus and are not in prebuild: run the ones a change touches. A new page gets a verifier of its own in the same style.
- Many source files use CRLF line endings: keep a file's endings when editing it. `smoke-character-page` prints `useLayoutEffect` server-render warnings from react-router's `MemoryRouter` and `CharacterTabs`; they are harmless.

**Where each item starts.**
- **Transformations** ("Transformations" below): steps 1 and 2 (the rules in `utils/transformation.js`, the reference fixes, `verify-transformations`; the Meta AI strategies column and box) are on the local `analyzer-transformations` branch. Steps 2–4 read a transformation only through that module: `transformationSummary(matches, { id, lineups })` over any set of one character's matches, with `lineupIndex(rows, charIdFor)` built once per scope. The AI comparison belongs beside the style shifts in `meta/aiShift.js`, under the same `MIN_OTHER` rule.
- **The share image card** ("Share-snippet feature" below): Character, Team and Match pages and the Sandbox, image first, for pasting into Discord. `components/ShareButton.jsx` copies the link today. No image library is installed yet (the plan names canvas or `html-to-image`). What the card shows is undecided: settle it with the league on a real-data demo, as the Overview was.
- **Build comparison and character comparison** (Phase 3's list): the Character page's Builds tab (`character/CharacterBuilds.jsx` on Meta's `BuildsTable`, with the `?build=` cut) is the raw material for comparing builds. Build recommendations are to be rebuilt on the league's own score (the old engine was deleted). Character comparison is a querystring mode on `/characters`, 2-3 side by side, so a comparison is a link; its design is open.
- **Trends over time** (Phase 4): match files carry no dates. `utils/matchOrder.js` orders matches by name (season, phase, round, week), the natural axis for season matches; per-file upload dates are available from git, as `generate-recent-uploads.mjs` reads them.
- **Matchup analysis** (Phase 4): start from item 14's findings in the league's last review above. Who faced whom is exact only in matches where nobody tags (43% of Season 0's league matches); the "Opponent AI" filter built on that was dropped as too narrow.
- **The accessibility pass** (Phase 2c): keyboard order through the chip lists, focus in the phone sheets, 44px touch targets.
- **One score formula**: "Performance tiers" › "Still open" (about 15 places in 8 files).
- **Sandbox polish** (Phase 7): the image card there too, with no deep links.

**Small things left open.**
- A value below the whole reference pool ranks "#127/126" (the Overview, and the Styles view's tooltips). "Below all 126" was proposed and not yet answered.
- Many OS1 test matches show no map ("—") in match rows; not investigated (the file's map id, or `referencedata/maps.csv`).

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
- **That load order was load-bearing** (superseded 2026-09-28, see Phase 2b below: `App.css` now sits in a cascade layer and always loses to Tailwind). An audit found `App.css` defines 713 single-class rules, **123 of which collide with a class Tailwind generates** — and some collisions change rendering, not just colour notation: `.gap-4` is `0.6rem` here vs Tailwind's `1rem`; `.max-w-4xl` and `.max-w-7xl` add `margin: 0 auto`; `.border-b` and `.border-l-2` carry an explicit `border-style`; and several violet/teal shades use genuinely different hex values than Tailwind's palette. Emitting Tailwind first means `App.css` wins every tie at equal specificity, so **turning Tailwind on changed nothing that already rendered** — confirmed by inspecting the built bundle, where the App.css value is last in all three spot-checked cases.
- **Preflight is deliberately OFF** (`corePlugins.preflight: false`, and `@tailwind base` omitted). It would reset headings, margins and border defaults across a component tree never written against it. It gets enabled in 2b once `App.css` is gone. Until then, border-width utilities need an explicit border-style. (Enabled 2026-09-30.)
- **All 9 previously-broken responsive classes now generate**, and the `xl:` breakpoint has a media query for the first time.
- **Shared tokens live in `packages/ui/src/tokens.js`** — CommonJS, so both the CJS configs (analyzer, match builder) and the ESM ones (website, calculator) can load it. All four Tailwind configs now source from it and scan `packages/ui`. Each app keeps its existing token **names** as aliases onto the shared values, so no existing markup changed: the website's `dbz.*`, the calculator's `sz-*`, the analyzer's `dragon-*`. New work should prefer the shared `brand.*` names.
- **One deliberate visual change**: the analyzer's app background gradient's first stop moved from amber `#f59e0b` to the canonical `#f97316` (`App.css:22`). The `amber-500` utilities at lines 163/491/501 correctly keep `#f59e0b` — that is a real amber, not a brand accent. That line also shadows Tailwind's real `bg-gradient-to-br`; 2b should rename it.
- **Dependencies**: removed `xlsx` (its two trivial call sites moved onto `exceljs` via the new `src/utils/exportSheet.js`), `@mui/x-tree-view` and `@mui/lab` (zero imports anywhere), and the duplicate `@vitejs/plugin-react` devDependency. **Analyzer JS went 2,267 kB → 1,981 kB (gzip 622 → 526 kB).**
- Match builder's 47-entry `safelist` was **kept**. It exists because that app assembles class names at runtime where Tailwind's scanner cannot see them, so removing entries needs per-class verification. Noted as future work rather than done blind.

### Phase 2b — App.css teardown: ✅ Complete (2026-09-30)

**Decision (2026-09-28): the redesign restyles freely.** Keeping the legacy UI "looking identical" is no longer a goal; new styling must win over `App.css`, and the league has a list of styling fixes of its own to bring. Light mode was removed on purpose (commit `8e816462`, 2026-09-05, because it was harsh and hard to read) and is not planned to return, so dark is the only theme that matters.

- ✅ **Tailwind is authoritative.** `App.css` is wrapped in `@layer legacy { … }` (its font `@import` stays above it). An unlayered style beats a layered one whatever the specificity or order, so every Tailwind class now wins over `App.css`, and `App.css` only styles what no Tailwind class on an element touches. That ended the trap where `App.css`'s base classes beat Tailwind's responsive variants (`grid-cols-2 sm:grid-cols-5` stayed two columns; `hidden sm:inline-flex` never showed), which the Character page Overview hit first.
- ✅ **Today's look moved into the Tailwind theme.** The end of `App.css` was a "modern redesign layer" that re-skinned the app by redefining Tailwind's own class names. Its values are now in `apps/analyzer/tailwind.config.js`: radii, soft shadows, the navy card surface (`bg-gray-800` `#1e2434`, `bg-gray-700` `#2b3245`), the faint hairline `border-gray-700` (alpha scaled, so `/60` still means fainter), display letter-spacing, and the fluid `max-w-7xl` shell up to 1760px (replaced on 2026-09-28 by the demo's 1400px column, `max-w-page`; see Phase 2c). Its phone pass is an explicit "phone density" block in `src/index.css`. **Restyle there.**
- ✅ **Checked element by element.** Every element's computed style was diffed before and after, across every view at 1280px and 390px. What remains is intended:
  - surfaces unified, a few RGB units apart
  - table dividers now the same hairline as other borders
  - the tables' teal/violet now match their names; `App.css` had tinted them, and its dark teal was barely readable
  - responsive classes that never applied now do, including `lg:grid-cols-3` on the three position panels. At 1280px that was cramped, so it became `2xl:grid-cols-3`.
  - Eight grids that relied on `App.css` collapsing every 3–5 column grid to two on a phone now say `grid-cols-2 sm:grid-cols-N` themselves.
- ✅ **The league's styling list** is done (its last review, below), and on 2026-09-30 `App.css` was deleted and preflight turned on (see "The restyle: closed" above).

### Visual direction: decided 2026-09-28

The app-wide layout and styling direction is settled. It covers the tab row, the one-line scope bar, one level of flat panels, rows instead of cards, colour roles, density, phone-first for viewing pages, the tier-list view and character portraits. See "Visual direction" below.

### Page-by-page review: decided 2026-09-28

Every page has a verdict and a content list; see "Page-by-page review" below. In short:
- **New or reshaped:** Home becomes a dashboard, the Team page is new, Matches becomes a list instead of a file tree, and Meta gains a league-wide Builds table.
- **Removed:** the Data Tables page, and the Position Analysis section under the leaderboard. The full Excel workbook stays, in the scope bar.
- **Team names:** the analyzer shows the website's team names through a shared list, while tags and folders keep their names.
- **Deleted:** the never-shipped Build Analyzer and Synergy Pairs files.

**The real-data demo followed** (`apps/analyzer/design/shell-demo/`) and was reviewed the same day; see "Settled on the demo". The shell and the Characters page were then rebuilt in React to match it (Phase 2c, below).

### Phase 2c — Responsive shell, accessibility, persistence: shell built (2026-09-28)

**Done**, to the demo and "Settled on the demo" (details in `apps/analyzer/CLAUDE.md`, "The shell" and "The Characters and Home pages"):
- **The shell** (`src/shell/`):
  - The section tabs and the sticky one-line scope bar replaced the Analysis Mode and View Type panels, the tag-filter panel and the file tree.
  - Multi-select chips: OR within a chip, AND between chips. Position is Characters' page chip.
  - The Excel button downloads the full workbook from any page.
  - On a phone, "Filters (n)" opens a sheet, and every chip list is a bottom sheet.
- **Data comes from the scope.**
  - The URL's tag filter decides what loads, and the old URL format is kept, so links shared before the rebuild still open on the same data.
  - Readable commas: links say `matchType=Season,Test`, not `%2C`.
  - Clearing every chip writes `scope=all`, so "everything" survives a reload.
- **Routes:**
  - `/` is Home. Its first cut is the tier list.
  - `/characters` is the table with a tier-list view.
  - The single-match viewer moved to `/matches` until the Matches list replaced it (Phase 4, 2026-09-29).
  - The Sandbox is `/sandbox/...`, the same views over uploads, with no scope and no links to league pages.
- **Portraits:** 241 files in `public/portraits/`, committed, with `npm run build-portraits` and a warn-only `verify-portraits` in prebuild. Since 2026-09-29 there is also a sharper 192px set in `public/portraits/192/`, which `<Portrait>` offers for any portrait drawn above 48px (the Character page header, the tier list).
- **Cleanup:**
  - `App.jsx` went from 4,973 to ~3,340 lines: the card leaderboard, its 751px filter form and the Character Position Analysis section are gone.
  - `TagFilterSelector.jsx` is deleted. `BRDataSelector.jsx` went with MUI in Phase 4 (2026-09-29).
- **Matched to the demo's CSS**:
  - **Width:** the page is now the demo's 1400px column (`max-w-page`, 1352px of content inside a 24px gutter), not the fluid 1760px shell.
  - **Font:** the system UI font, as the demo and the website render, and buttons inherit it (they had fallen back to Arial).
  - **Details:** chip and button corners and padding, the segmented control's height, 46px rows, header alignment, and slate text.
  - Measured element by element against the demo at 1600px and 390px: within 1px, apart from scrollbar width.
- **One panel colour site-wide:**
  - The Character page and the old Teams, Matches, Meta, Data Tables and Sandbox panels now sit on `bg-shell-panel` with the hairline border, as the Characters table does. They had been on `bg-gray-800`, the chip colour.
  - Inside the Character page, greys are slate like the shell's. Its buttons are the scope bar's outline button, its menus and tooltips use the popover surface, bars and rings use the shell's track colour, and the Radar/Bars switch is the shell's segmented control.
  - Tokens `shell-track` and `shell-fill` joined `shell-panel` and `shell-pop`.
- **Fading only where it tells something apart** (the league's request). A narrow filter or a few Sandbox uploads can leave every character under 5 matches. Fading all of them only washed the list out, so a list fades thin samples only while it also has settled rows (`fadesThinSamples()`). Otherwise nothing fades, and the legend says why. The same rule covers the Builds table and the Character page's build menu. A single Character page still fades its own plate, since its note gives the match count.
- **Measured on a build**:
  - Characters is 3.2 desktop screens at 1917px and 3.8 on a phone (23 and 16.5 before).
  - No script errors on any page at 1280px or 390px.
  - `verify-routes`, `verify-self-contained`, `verify-character-page`, `smoke-character-page` and `verify-filters` all pass.

**Still open in 2c:**
- **Accessibility pass:** keyboard order through the chip lists, focus management in the phone sheets, 44px targets. **Moved to the next phase** (the league, 2026-09-30); only the Bars view's phone layout was fixed with the restyle's close.
- ✅ **Old panels in the new shell:** the Sandbox's upload panel was the last, rebuilt on 2026-09-29. Data Tables is gone (`/tables` redirects to `/characters`, and the workbook gained Position, AI Strategies and Capsules sheets), and Meta's AI strategies and Capsules tabs are rebuilt (2026-09-29).
- ✅ (fixed 2026-09-29, the rule is deleted) **Menus and tooltips slid in from the top left the first time they opened.** This has been happening since long before the redesign. It affects the scope bar's chip menus, the build picker, the Overview's tooltips and the older build tooltips.
  - **Cause:** App.css (legacy layer) sets `* { transition: all .2s }`. floating-ui first renders a menu at the top left, then moves it into place, and that rule animates the move. Later opens start from the last position, so they look right.
  - **Fix:** narrow that rule to colours instead of `all`, or remove it. Also hide each floating element until it is placed, using floating-ui's `isPositioned` (`Combobox.jsx` already does this by hand).

### Phase 3 — Character page: ✅ redesigned; its features move to the next phase

Routing, the Character page itself, `<ShareButton>`, the shared presentational components and the absolute tier pills have shipped. **The Overview tab's design was approved on 2026-09-28 and shipped the same day**, with the one-build `?build=` filter. See "Overview tab: approved design" under Phase 3 below. The other tabs followed "Visual direction" on the table template (2026-09-29), and the open tab went into the URL (2026-09-30). The share-snippet image card, build comparison and character comparison are next-phase features.

### Phases 4–7: Phase 4's pages, Home (Phase 5) and Phase 6 built

**Home (Phase 5) is built (2026-09-30)**, to "Page by page" and "5. Home dashboard", then **reworked after the league's first look** the same day (details in `apps/analyzer/CLAUDE.md`, "The Characters and Home pages"). The league's changes: the tier list took most of the page and hid the rest; the latest results make a better lead (what visitors come for: how did the match I watched go?); participants need to find the test they just uploaded; and the boards should show the league's three core fighting styles and the three positions.
- **Latest results lead**, with a **Season | Tests | Events** switch (`latest=tests|events`):
  - Season: the newest week of season matches in scope, in play order, as the Matches list's rows (Season 0: the Playoffs Semi-finals, Week 1). A scope without season matches says so.
  - Tests and Events: the newest uploads of each from every team, whatever the scope, grouped by upload day (in play order within a day), 6 then "Show more". **Match files carry no date**, so a build step (`generate-recent-uploads.mjs`) dates each by the commit that added it (for a submission, its upload), which needs the git history: **the deploy workflow now checks out the full history, blobless**. Without it the step falls back to name order and shows no dates. Events were added at the league's ask, which it said covers everything.
- **Leaderboards: six curated boards**, top 5 each. **Top Brawlers** (Melee), **Top Spammers** (blasts and ultimates: the league's "spammer") and **Top Tanks** (Defense), each showing the figure it ranks by: melee hits and blasts-plus-ultimates a minute, and Defense's 0-100 rating ("37.3/min", "5.47/min", "77/100"). A first cut showed the league rank ("#7/126"); beside the board's own 1-5 it read as a second ranking in another scope, so it moved to the tooltip, and the Styles view shows the figures too; then **Best Starters, Best Middles, Best Anchors** by score in that position. **Each is still a preset over the Characters table** ("Curated leaderboards are presets"), checked by `npm run verify-home`:
  - **The style boards needed a table to open into**, so the Characters page gained a **Styles** view (Stats | Styles | Tier list): each style's league rank per character, sortable.
  - **Spam is volume**: blasts and ultimates thrown a minute, each throw counting once, so 10 blasts and no ultimate out-spam 5 blasts and 2 ultimates (the league's rule). A first cut blended the two ranks half and half, which let a few rare ultimates outweigh twice the blasts.
  - **5+ matches** (the league's rule): a board shows only characters the table does not fade, unless fewer than five have that many; then the best of the rest fill it, faded. A desktop shows all six boards, three to a line; a phone one at a time from a two-line switch.
  - The first cut's boards (Top damage, Best survivor, Best combo, Most efficient) and the "Best combo" column they added to the Characters table are gone.
- **Top tier** comes last: the tier list's top row only, linking to the full list on the Characters page (the league's pick over dropping it; the whole list was two phone screens). Home is now 1.4 desktop screens and 1.5 phone screens.
- **Tablets fixed with it** (the league's ask): between 640px and about 1,100px the Characters, Teams and Team page tables were wider than the screen. Every wide table now has a tablet size, the phone layout with four stat columns instead of two, until its full layout fits (`useTableSize`; see "Tablets" in `apps/analyzer/CLAUDE.md`).

**Phase 4 began (2026-09-28) with the team side** (details in `apps/analyzer/CLAUDE.md`, "The Teams and Team pages"):
- **The shared team list is in** (`referencedata/teams.json`): tag, website name, slug, website slug, logo and colour for all 13 teams. The analyzer shows the website's names everywhere, including the scope bar's Team chip. Links keep the tags, so old ones still work.
  - Logos are 96px copies in `public/team-logos/` (`npm run build-team-logos`, 47 KB for all 13). Outlaw Stars uses the website's `image.png`, which its Season 1 page already shows.
  - `verify-teams` (in prebuild) fails on duplicate tags or slugs, and warns about unknown tags or missing logos.
- **`/teams` is a table**, as the review settled: logo, name, record, win %, damage dealt and taken, efficiency, DPS, HP kept, match time, tags, characters used. Win % leads and is the default sort, ties going to damage.
  - **A team's figures are its top 5 characters' by score**, as the old cards had them. The league asked for them back after a brief switch to whole-team figures: it is the view members expect, and **the league breaks in-season ties on the top 5's average damage**.
  - A "League standings" link goes to the website's `/season` page.
- **`/teams/<slug>` is the new Team page:**
  - A header with eight headline figures ranked against the other teams (Avg taken, DPS, match time and tags joined; HP kept shows the HP left, tags the total).
  - Then **Roster · Lineups · Opponents · Matches**, with the open tab in the URL:
    - Roster: from the same team figures, so the top 5 are marked (orange) and add up. A row opens the Character page "Played for" that team (`for=`), on the same numbers.
    - Lineups: each match's lineup and the opponent's under it, slot by slot, so each column is a matchup. Each side is its own band headed by its team's logo and name, with the opponent's shaded, so the two never read as one team of six. The exact slot order is in the data now, and a test against itself splits into its two sides.
    - Opponents: the team's figures against each team it played. Picking one cuts the whole page to that head-to-head (`vs=`, also an Opponent chip in the scope bar): the tiles show the matchup against the team's overall figures.
    - Matches: the matches, newest first.
    - Lineups and Matches have a search and show 25 at a time.
  - "Team info" links to the team's profile on the website: description, roster and master list.
  - The back button goes back where you came from ("Budokai", "Meta"), on the Character page too.
- **Matches now list in chronological order** (`utils/matchOrder.js`). File names carry no date, and plain name order put Week 10 before Week 2 and the playoffs first.
- The old team cards, about 1,100 lines of `App.jsx`, are gone.
- Fixed on the way: a test file naming only one team (`["Malevolent Souls"]`) lost its team in the character data, so its lineup and results went missing; its side now counts for that team, as the team figures always had it.
- **The fusion split is now the rule everywhere (2026-09-29, the league's call).** Once a character fuses with a teammate, what it does from then on is split half and half between the two. The leaderboard always did this; the team figures, positions and the match viewer did not, so a fusion partner's numbers differed between a Team page's roster and its own page. All of them now share `utils/fusionSplit.js`, and the split stays on its own side of the match, which a team's test against itself needs. `verify-team-page` checks every match row against the rule.
- The Character page header was redone (2026-09-29): an 80px portrait, the name, and under it four equal figures, Tier · Score · Rank · Matches, each a small label over its value. The score keeps its tier pill, so a Z score still breathes. It was chosen on real pages over a badge row and a plate docked on the portrait.
- **The Matches list and the Match page are built (2026-09-29)** (details in `apps/analyzer/CLAUDE.md`, "The Matches list and the Match page"):
  - **Match URLs are the file name as a slug**: `/matches/s0-week-3-match-5`. All 2,505 are unique, `verify-match-slugs` (in prebuild) fails the build on a collision, and the file's path stays a permanent alias. This is the match-ID scheme step 4 asked for. A slug resolves against every match, not the scope, so a link works whatever the scope bar says.
  - **`/matches`**: one row per match in scope, newest first. Each side has its own line (result, team, lineup Starter first, slots aligned), then size, difficulty and map. Search, 25 at a time, and the **Matches | Performances** switch, whose second view is one row per character per match (rebuilt on the new table template, below).
  - **`/matches/<slug>`**: the teams and result, then season, phase, type, size, map and difficulty as label-over-value figures, then a table per team in lineup order: position, character, build, damage, taken, HP left and the score as a tier pill. A row opens the rest of the character's numbers under it, flat, with its build as the one-column list and a flat forms table. This replaced the four levels of nested cards.
  - Every "open match" (Team page lineups and matches, a character's recent matches, the Performances table) now goes to the match's page, with a back button to where you came from. The Sandbox has both pages over the uploads.
  - The Match page applies the fusion rule, and `verify-match-page` checks it against the character aggregation for all 11,028 character rows: same characters in the same slots, same results, same damage, taken and HP.
  - **MUI and Emotion are gone from the analyzer**, with the file tree (`BRDataSelector.jsx`), the last thing that used them. `App.jsx` is down to ~1,250 lines.
  - **Settled: a fused form's per-form figures are the fusion's whole output** (the league's call, 2026-09-29: "a better indication of how the match actually went"). The character's own totals follow the fusion rule.
- **Match page follow-ups (2026-09-29, the league's review):**
  - Each team's header is tinted green or red for its result, as the tier list tints its rows. The Matches list's Teams column no longer lets the lineups spill over Size and Difficulty at in-between widths.
  - **The opened character row was redesigned** from the Character page Overview's pieces: the five headline figures on league tracks (coloured only in the top or bottom fifth), the move rings and circles, Attack / Defense / Mechanics lists beside the build, then the forms. A match is placed among **single matches**, a new `perMatch` block in `style-baseline.json`, not among characters' averages.
  - **Forms are now one column per form** (`components/FormBreakdown.jsx`), under a timeline of time spent in each, replacing a ten-column row-per-form table. It is written to take the Character page Forms tab's averages next.
  - Fixed on the way: five per-form counters (Z-counters, lightning, vanishing, dragon homing, speed-impact wins) were read under key names no file has, so they were always 0.
  - Second review: the detail's parts got the Character page's borders back (tile grid, move cards, a box per list), the forms' figures start closed behind "Show figures", and **picking a form filters the detail to it**, with an orange "Showing one form" strip and swatch (the build filter's look, now a shared `FilterStrip`). A form's rates keep the league comparison; its amounts show as a share of all its forms.
  - Found by the new checks: when both sides field the same transforming character (a team's test against itself), the file keeps one set of form snapshots for the two, so one side's forms were the other fighter's. The Match page now leaves those figures out (16 records, all tests).
  - Mechanics lists Dragon homing first; Attack has Throws above Best combo (the league's order).
- **Performances rebuilt (2026-09-29), and one table template for every table.** The league asked for the Performances view in the table style and filters the new pages use, then **every other table moved onto the same template, and the old styling and setup removed entirely by the end of the restyle**.
  - `shell/StatTable.jsx` is that template (see `apps/analyzer/CLAUDE.md`, "Shared presentational components"). Performances is its first user.
  - Performances: chips in the scope bar (Character, Played for, Position, Result), search in the control row, a Columns switch between the Match page detail's groups (Combat, Moves, Attack, Defense, Mechanics, Build), the match's score as a tier pill, 25 rows then "Show more", and a row opens the Match page with that character's row open (`?open=`). It replaced a 60-column `DataTable` with a settings gear, per-column filter boxes and its own export.
  - `verify-match-page` checks all 11,028 performances against the Match page, their links, and the chips, sort and search.
- **The table transition, in progress** (each old component is deleted when its replacement lands):
  1. ✅ **Character page › Matches**: the Performances table without its Character column (group switch and sort as local state), rows opening the Match page on the character, and "Open in Performances ↗". Replaced `MatchesBlock` (the latest 12 only).
  2. ✅ **Character page › Usage**: the facts as header figures, then By position and By team on `StatTable` with the Characters table's columns, each row recomputed by the leaderboard filter; a team row opens the page "Played for" it. Replaced `UsageBlock`/`PositionBlock`.
  3. ✅ **Character page › Builds**: Meta's Builds table for one character (`showCharacter={false}`), most used first; "Show only this build" sets `?build=`; Copy YAML / Download under every capsule list, now on Meta's Builds too. Replaced `BuildsBlock`; `BuildTypeTooltipWrapper`, `BuildDisplay`, `BuildTableView` deleted.
  4. ✅ **Character page › Forms**: `FormBreakdown` fed `averageForms()` over the `forms` the aggregation now stores on each match row (the Match page's `matchForms()`, so shared-snapshot records are left out there too), a "Reached" row only when forms differ in it. Replaced `PerFormStatsDisplay.jsx` (deleted). `smoke-character-page` renders the four new tabs; `verify-character-page` checks the averages add back up (875 of 894 transformed matches usable).
  5. ✅ **Meta › AI strategies**: a row per strategy on the **pooled table** (`meta/PooledTab.jsx`), each the leaderboard's own figures over every match run with it (`meta/aiRows.js`), with the Characters table's columns; Type and Character chips; the detail (beside the table from 1400px, under the row below) gives its fighting style as the Overview reads one and who ran it most. The insight cards, filter form, 15-column table, pop-up panel and the separate calculator (`aiStrategyCalculator.js`, with a score formula no other page used) are deleted.
  6. ✅ **Meta › Capsules**: the same pooled table, a row per capsule (`meta/capsuleRows.js`): type, cost, the Characters columns; Capsule type, AI strategy and Character chips and a search; the detail gives its effect, the capsules it is most often equipped with, and who used it. `CapsuleSynergyAnalysis.jsx` and `capsule-synergy/*` are deleted; `verify-meta-builds` checks both tabs.
  7. ✅ **`/tables`**: the workbook gained Position, AI Strategies and Capsules sheets (`utils/workbookSheets.js`, from the pages' own row builders, checked by downloading it in a headless browser), then the page went and `/tables` redirects to `/characters` with the scope kept. `DataTable.jsx` is deleted; `TableConfigs.jsx` stays as the workbook's column spec, its render functions now dead.
  - **Dead code cleared**: `ExportManager.jsx`, `RangeSlider.jsx`, `Combobox.jsx`, `MultiSelectCombobox.jsx`, `components/stats/*` (the smoke test now checks `TierScorePill`, the pill that ships), `utils/exportSheet.js`, and the old build display family. Kept on purpose: `utils/performanceLevel.js` (`verify-filter-aggregated` uses it), `utils/readDataStructure.js` (`generate-br-data-structure.js`), and, until the league's review later that day, the build-recommendation logic (now deleted, see below).
- ✅ **Legacy still standing after the table transition** (for the "old setup removed entirely" goal), **all gone by 2026-09-30** (see "The restyle: closed"):
  - The Sandbox's upload panel and its View Type radio switcher, the Sandbox's only way between its views (Phase 7).
  - `TableConfigs.jsx`'s dead render functions, and the old `formStatsArray` per-form aggregation, which only the workbook's columns read (and which, unlike the Forms tab, still counts shared-snapshot records).
  - The Characters, Teams, Team page and Builds tables draw the template's look by hand; they could move onto `StatTable` itself.
  - `App.css` (legacy layer) and the remaining `darkMode` ternaries, in `App.jsx` above all.
- ✅ **The league's last review before calling the restyle done (2026-09-29 to 30).** Committed on the local `analyzer-restyle` branch (`15e92ef7`, `7a285ce5`). Status per item:
  1. ✅ **Sandbox upload panel and View Type switcher**: now `pages/sandbox/SandboxPanel.jsx`, one flat panel: a drop zone when empty, then the files as rows (a readable one opens its Match page, a broken one says so, each removable), Clear and Add files, and the Sandbox's views (Matches · Characters · Teams · Meta) as underline tabs at its foot, links like the section tabs. Uploads now join the set instead of replacing it (same name replaces). The old card, collapsible list and 4-card radio grid are gone from `App.jsx`.
  2. ✅ **Tooltips and dropdowns slide in from a corner.** Cause: `App.css` (legacy layer) has `* { transition: all 0.2s ease-in-out; }`, so anything positioned when it opens animates from its starting coordinates. Fixed: the rule is deleted.
  3. ✅ **Character page tabs show light grey lines beside the picked tab.** Cause: `App.css`'s `button:focus { box-shadow: 0 0 0 3px … }` leaves a ring on the clicked `<button>`, and the tab row's `overflow-x-auto` clips its top and bottom, leaving the sides. The section tabs (`shell/TabRow.jsx`) are links, so they never had it. Fixed: the legacy rule is deleted, and `index.css` gives buttons and links a `:focus-visible` ring for keyboards. The dead `.szl-range` CSS (the deleted RangeSlider's) went too.
  4–5. ✅ **Every cut on the Character page is click-to-toggle, and shown at the top.** Built for position, team and build (2026-09-29) and form (2026-09-30, option (a), the Match page's rule: the Overview shows the form's own figures, amounts as a share of all its forms; `character/characterCuts.js`; see `apps/analyzer/CLAUDE.md`, "The page's cuts"). Usage's position rows (new `pos=`), team rows (`for=`, today a link that only applies), Builds' rows (`build=`, today a "Show only this build" button) and the Forms tab's forms (new `form=`) each apply their filter on click and remove it on a second click. Every applied filter shows at the top of the page in the build strip's style (`components/FilterStrip.jsx`), one clear per filter. Each list keeps all its own options while filtered (the position table lists all three positions under `pos=`), computed with the *other* filters applied.
     - **Open question, the form filter's meaning:** the Match page's rule would cut the page to that form's own figures (per-form stats; the character rows' `forms` currently strip them, `characterAggregation.js`), or the simpler reading is "matches that reached the form". Decide with the league before building it.
  6. ✅ **Header figures** (Tier · Score · Rank · Matches, `character/CharacterBlocks.jsx` `IdentityBlock`) sat slightly left of the name (flush boxes, but the 30px name's first letter sits ~2px inside its box): the gap above cut from 10px to 6px; on 2026-09-30 each label was centred over its value instead of nudging (item 11).
  7. ✅ **AI strategies: drop the Balanced / Attack / Defense pill** (`meta/AIStrategiesTab.jsx` `TypePill`): the type is already in each strategy's name. Keep the Type chip as a filter.
  8. ✅ **Capsules: add a Cost chip** (`cost=1,3`; `meta/capsuleChips.jsx`, `capsuleRows(…, { costs })`, `readCapsuleFilters`), checked in `verify-meta-builds`.
  10. ✅ **Sandbox Characters: a character opens its own page over the uploads** (asked 2026-09-30): `/sandbox/characters/<slug>`, read from the Sandbox splat in App (`charParam`, `charPath`). Every character link in the Sandbox goes there (the Characters table and tier list, the Match page, Meta's build links); its match rows open the uploaded match; no Share (uploads are not stored) and no Performances link (the Sandbox hides its chips). The Overview still places the character against the league reference.
  11. ✅ **Header labels centred over their values** (Tier · Score · Rank · Matches, `IdentityBlock`; asked 2026-09-30 with a mock-up: each small label centred above its value).
  13. ✅ **AI strategies tuning** (the league's review, 2026-09-30): the style shift became league ranks (a ratio ran to +1,328% near zero), the table's columns became the six style shifts (sortable, to find the strategy that suits a style; the pooled figures moved into the detail), and the detail opens full width under its row in bordered boxes. See `apps/analyzer/CLAUDE.md`, "The Meta page".
  14. ✖ **Dropped (the league, 2026-09-30): a filter for the AI a character faced**, too narrow for what it would cost. What was found, for the record: The league asked for it in "Same characters, other AIs" (which compares a strategy's characters with themselves on other AIs, not with opponents), and asked first how "who fought whom" could be known in team matches. The findings, 2026-09-30:
     - A battle-result file has no timeline: per character only whole-match totals, time on the field, tags, and who finished the match.
     - Guessing from the opposing side's AIs is not exact: in Season 0's league matches 93% of character-matches faced 4-5 opponents, and only 1% faced a side on one AI (or a single opponent).
     - **Both sides' time on the field agrees within 2 seconds in 100% of matches**, so exactly one fighter per side is on the field at any moment. In a match where **nobody tags**, fighters enter in lineup order and stay until KO'd, so the two sides' time lines can be laid side by side to give who faced whom, and for how many seconds, exactly. That holds for 43% of Season 0's league matches and 70% of all. Still to check before building: that entry order is the slot order (the finishing character should be the winner's last fighter in slot order), and how fusions and mid-match lineup changes fit.
     - It was proposed as an "Opponent AI" filter over the tag-free matches only. The league also confirmed the detail's comparison (a strategy's characters' own figures on their other AIs) is wanted, and asked for its separate box to go: its totals repeated the tiles with different numbers, so only its changes remain, as a "vs other AIs" line on the Score, Damage, Efficiency and Taken tiles.
  15. ✅ **Capsules tab redesign** (asked 2026-09-30: it has the AI table's old problems, the Characters columns and a thin detail; the league wants AI strategy and build type at its core). **Proposed and built 2026-09-30** as below, with the league's two calls: lineup position is a detail box only (a position-bound capsule works or does not; position does not change how well one works), and **no Score column** (casual readers would take a capsule's pooled score, mostly its builds', for how good it is). See `apps/analyzer/CLAUDE.md`, "The Meta page". Measured first:
     - **A capsule's own effect barely separates from its build.** It is one of ~7 (median) in a build, so the same character with and without it mostly compares builds: in Season 0, Blast Attack Boost 3 reads +40% damage and +15.8 score, because 75% of its uses are in Blast builds. Holding the build type fixed too (same character, same build type) leaves 14 capsules with 30+ comparable uses in Season 0, and they do not repeat across two random halves of the matches; over all data 74 have enough, and the halves agree only moderately (r ≈ 0.6 for score and damage). Match files carry only total damage, so "Blast damage +5%" cannot be checked against blast damage.
     - **Where a capsule goes is very stable**: its share of each build type's builds agrees between halves at r = 0.94 in Season 0 alone (1.00 over all). Today's pooled columns barely separate capsules (popular ones sit within ±4% of the league's damage).
     - **Lineup position matters for some**: Savior is never on a Starter (it fires on the first switch-in), Smash Attack Boost 3 is 85% Starter, Finishing Blow 78% Starter, Divine Blow 56% Anchor (all builds: 45 / 26 / 29%).
     - **Pairings by raw share just list popular capsules** (Fury! sits with everything at ~1.7× chance); by lift, real combos surface (Divine Blow + Style of the Strong 8×, Ultimate Burst + Savior 5×). 8 capsule families have 2+ tiers in use (Rush / Blast / Smash Attack Boost, Energy Saver, Latent Power Unleashed, Melee Charge…).
     - **Proposal** (built, less the Score column). Table: Capsule (type, cost) · Data · Score · Uses, then one column per build type (Melee · Blast · Ki Blast · Defense · Skill · Ki Efficiency · Hybrid): the share of that type's builds that run it, sortable to find what a build type runs; a phone picks two; the AI strategy chip narrows it to one AI's builds. Detail in bordered boxes under the row: header figures and the effect text; tiles (the pooled figures ranked among capsules, with a "vs other capsules" change from the same characters in the same build type, hidden when Low); Build types; AI strategies (share against each AI's usual share); Lineup position; Goes with (by lift); Other tiers (a family's tiers side by side: cost, uses, score); Used most by. No style shift: capsules change numbers, not how the AI fights, and the within-character shift mostly picks up the build.
  12. ✅ **A character search on `/characters`** (asked 2026-09-30): a search box beside the count, as the Matches list has, over the table and the tier list; rows keep their place numbers. **The same day it became a character filter**, at the league's request: the Performances view's Character chip (search, then tick any number), beside the view switch and kept in the URL as `char=`, so a picked set is a link. It stays in the control row, not the scope bar, so it works in the Sandbox too. It is drawn as a plain chip: drawn as a search field, the league found it still looked like a box to type in.
  9. ✅ **AI strategies detail: bring back the old panel's substance.** Built 2026-09-30 as proposed below (`meta/aiShift.js`, `meta/AIStrategiesTab.jsx`; see `apps/analyzer/CLAUDE.md`, "The Meta page"). Checked on real data: Ultimate Blasts shows ultimates +92%, Counters guards +85%, Melee melee +26%. The old pop-up (`git show 50b72a60:apps/analyzer/src/components/ai-strategy/AIStrategyExpandedPanel.jsx`, `BehaviorInsightsSection.jsx`, `utils/aiStrategyInsights.js`, `utils/aiStrategyCalculator.js`) had a Data Quality box (High/Medium/Low from matches and character diversity, `calculateDataQuality`), behaviour insights (each action against the other strategies, or, filtered to one character, against that character's own baseline), archetype labels, build and capsule effects, character compatibility, build types and most used capsules. The league wants a version of it, with the Character page Overview's fighting-style approach, and suggested data quality as a table column. **Proposed 2026-09-29, approved by the league 2026-09-30 (build it as written):**
     - **The problem with today's detail:** its fighting style is pooled over whoever ran the strategy, so it mostly shows *which characters* get it (Ultimate Blasts goes on characters with strong ultimates), not what it does. The fix is the old panel's character-filtered idea, made the default: **compare the same characters with the strategy and on their other strategies**, averaged over those characters by uses. Measured: over everything, 96–100% of each strategy's uses have such a comparison; in the default scope (Season 1, 105 matches) 13–100%, with 7–189 uses and 3–31 characters per strategy.
     - **Table:** a **Data** column after Uses, a three-step signal (Low / Medium / High from uses and characters; first cut: Low under 30 uses or 5 characters, High from 100 uses and 15 characters), its tooltip "189 uses over 31 characters, 119 comparable". Low rows fade as thin samples do. Per the markers rule it hides when every row has the same level (over everything, all are High).
     - **Detail, top to bottom:** (1) Uses, Characters, Data, "compared on N of M uses"; (2) **fighting-style shift**: the six styles as bars either side of the characters' own usual ("Blast +34%"), headed by the style it pushes toward; (3) **biggest changes**: the top five single actions by shift (throws, vanishes, dragon homing, guards, counters, sparking, charges, skills, supers, ultimates) as "+45% throws", replacing the insight prose; (4) **results**: damage, taken, efficiency and score against their other strategies, then **Suits best / Suits worst**, the characters that gain or lose the most score on it (3+ uses each way), replacing "character compatibility"; (5) **run with**: build types by share and the most equipped capsules; (6) Used most by, as now.
     - With one character picked (the Character chip), every shift is that character's own, as the old panel did.
     - Dropped: the archetype names from threshold tables (Melee Fighter, Blast Spammer…), since the fighting-style labels do that job, and the insight prose.
     - Code: a pure `meta/aiShift.js` (per character, `overviewFromMatches` with vs without, weighted by uses), checked in `verify-meta-builds` (a one-character shift equals the direct computation; weights add up).
     - **Also open, item 4–5's form filter:** (a) the Match page's rule, the page shows the form's own figures (needs the per-form stats the character rows strip today; amounts need the Match page's "share of its forms" treatment), or (b) matches that reached the form (simple, but mostly measures match length, and the base form cuts nothing). **The league chose (a) on 2026-09-30.**
  - Also settled (the league left it to Claude): the build-recommendation logic was deleted on 2026-09-29 (`utils/buildRecommendationEngine.js`, `config/buildRules.js`, `utils/capsuleEffectParser.js`, `utils/capsuleSynergyCalculator.js`; `git show 50b72a60:apps/analyzer/src/utils/buildRecommendationEngine.js` has them). It ranked builds on the old capsule composite score, keyword-parsed capsule archetypes and hand-set weights, the scoring the table transition replaced; a recommender should be rebuilt on the league's own score, as the pooled Meta tables are. The idea itself stays on the list (Phase 3's "Build recommendations surfaced here").
- Still to do in Phase 4 (next phase):
  - trends over time
  - deeper matchup analysis (per-slot results beyond the side-by-side lineups)

**Phase 6's Builds tab is built (2026-09-28)**, to the demo's layout A (details in `apps/analyzer/CLAUDE.md`, "The Meta page"):
- `/meta` has tabs Builds · AI strategies · Capsules. The last two were rebuilt on the pooled table (2026-09-29) and redesigned by the league's review (2026-09-30: items 9, 13 and 15 above).
- **Builds:**
  - One 46px row per build: character, build type and cost bar, AI strategy, uses, average damage, efficiency, score, and win % last.
  - The selected build's capsules show as the one-column list in a side panel from 1180px up, and under the row when narrower.
  - "Best per character | All builds" sits in the page's own row. The Uses floor (default 5), Character, AI strategy and Capsule chips sit in the scope bar.
  - Everything is in the URL, as readable slugs.
- **The numbers match the plan's table:** 368 builds in the default scope and 47 at 5+ uses; 2,554 and 492 over everything.
- **Measured against the demo** at 1600px, 1100px and 390px: within 1px apart from scrollbar width.
- `npm run verify-meta-builds` checks the filters on the real corpus. It covers the rule that a build must hold every capsule picked, and best per character.
- The old `MetaAnalysisContent.jsx` is deleted.

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
| Position Analysis | Team/power-user | Merge into Character page (as a filter/tab), not a standalone section. **2026-09-28:** the section is removed; position becomes the picker on Characters, the Character page's Usage tab and the Team page's Lineups tab. |
| Data Tables + Excel export | Team/power-user | **2026-09-28:** the page is removed. Each table gets its own export, and the full workbook moves to the scope bar. See "Page-by-page review". |
| Meta Analysis (AI Strategy + Capsule Synergy) | Team/power-user | Keep, becomes its own "Meta/Builds" page |
| Build Analyzer Tool | Team/power-user | ~~Keep, folds into Meta/Builds page~~. **It never shipped** (taken off the page in November 2025), and its file was deleted on 2026-09-28. The recommendation logic is kept for later. |
| Manual File Upload mode | Team (testing) | Keep as a distinct "Sandbox" mode, clearly separated from the public league dataset |
| Tag filtering | Both | Keep and extend (already URL-synced — good foundation, but move it onto `useSearchParams`) |
| Reference-data mode + BRDataSelector tree | Both | Rebuild UX around real navigation/routes instead of mode/viewType radios |
| Fusion-split logic, per-form stats | Both | Keep logic; the aggregation extraction (Phase 1) already covers most of it |
| **Build recommendations** (were `generate­RecommendedBuilds`, `suggestBuildImprovements` in `buildRecommendationEngine.js`, deleted 2026-09-29 to be rebuilt on the league's score) | Team | **Surface, don't just keep.** Principle 4 puts these on the Character page, where the build decision is actually made. |
| **Character comparison (head-to-head)** | Team | **New.** 2–3 characters side by side. Nothing supports this today beyond scanning a table. |
| **Build comparison on one character** | Team | **New surface over existing math.** Same character across capsule builds / AI strategies, side by side. `BuildTableView` and `BuildDisplay` (in `App.jsx`) are the raw material. |
| **Position / lineup planning** | Team | **Promote.** Position drives matchups and some builds are position-specific, so this is a first-class planning surface, not just a filter on the Character page. See the Phase 3/4 note. |
| **Trend over time** | Team | **New.** Is this character/build/team rising or falling across a season or test run? Nothing in the app is time-aware today. Depends on Phase 1.5's index carrying an ordering key. |
| **Matchup analysis** (character vs opposing character) | Team | **Candidate, not committed.** Opponent data already flows through `characterAggregation.js`/`teamAggregation.js`. Principle 6 argues it should be first-class; scope it once the Character and Team pages exist. |

---

## Target information architecture (routing)

```
/analyzer/                          → Home: stats-only landing (see Phase 5 — NOT standings)
/analyzer/characters                → Character leaderboard (searchable, sortable), with a Tier list view
/analyzer/characters/:charSlug      → Single character deep-dive (name slug, e.g. android-13; raw id also accepted)
/analyzer/teams                     → Team rankings
/analyzer/teams/:teamSlug           → Single team deep-dive
/analyzer/matches                   → Match browser (BRDataSelector + tag filters, driven by br-data-tags.json)
/analyzer/matches/:matchId          → Single match report (matchId = encoded relative file path)
/analyzer/meta                      → Build/AI/capsule meta analysis
/analyzer/sandbox                   → Manual upload / testing workspace
/analyzer/tables                    → Redirects to /characters (the Data Tables page was removed 2026-09-28)
```

Filters become querystring state on these routes, extending what `TagFilterSelector` already proves out — so a filtered view is shareable, not just the base page. `src/routes.js` already defines these paths; it just needs to actually be imported.

---

## Visual direction — decided 2026-09-28

The league asked for the whole analyzer's layout and styling to be rebuilt. The two named complaints were the "panel in panel in panel" look and how bloated and long some pages feel. This section is the app-wide direction every page rebuild follows. It was settled in a design conversation that measured the current app and reviewed a dozen comparable stats sites. **The page-by-page decisions come next** (which pages stay, go or change, and what data each one holds) and build on it.

### The baseline to beat (measured)

A real build in a headless browser at 1280px and 390px, in the default scope (Season 0, Season matches, 105 matches):

| Problem | Measured |
|---|---|
| Settings before data | Every view opens with the Analysis Mode panel, the View Type cards and the full tag-filter panel. A view's own content starts ~1,020px down at 1280px, below a 900px screen, and ~1,630px down at 390px. |
| Cards for comparable items | The character leaderboard shows 62 characters as cards of five tiles: 20,743px tall (23 desktop screens), with ~550 boxed surfaces. |
| Nesting | Single Match nests four levels: page panel → team panel → character card → a box per Super. Data Tables gives the outer panel and the table panel inside it the same heading. |
| A sticky filter form | The leaderboard's "Filters & Sorting" is 751px tall and sticky. While scrolling it covers 83% of a desktop screen and 99% of a phone screen, and it overflows sideways at 390px. |
| Colour without meaning | Match cards give every stat its own colour (damage red, taken blue, efficiency purple, DPS orange), so nothing stands out. |

### What comparable sites do

Reviewed: u.gg, op.gg, Lolalytics, Dotabuff, MetaTFT, tactics.tools, tracker.gg, 17Lands, Statlocker, Pikalytics, Basketball-Reference and Puddle Farm.

- **Scope fits on one line**: a row of dropdown chips (op.gg, Lolalytics, MetaTFT, 17Lands, tracker.gg). u.gg writes it into the page title ("Ahri Build for Mid, Emerald+, Patch 26.19").
- **Navigation is a row of section tabs** under the global nav, never a settings panel.
- **One level of surface.** Dotabuff's hero page is flat section panels with a table in each and nothing boxed inside them. Summary numbers sit in one row with hairline dividers (u.gg), not in separate tiles.
- **Rows for anything homogeneous.** tracker.gg's tier list is one table grouped into tier bands. MetaTFT shows each team comp, the closest analogue to a DBSZL build, as a ~105px row with its pieces inline and aligned stat columns. Dotabuff draws bars inside table cells. Clicking a row opens a page; it does not expand into a large card.
- **Two views of one dataset**: 17Lands' Grades / Table switch.
- **Every one of them leads with character portraits.**
- The usability research agrees. Nielsen Norman Group finds cards harder to scan and compare than lists, finds that disclosure deeper than two levels loses people, and says sticky elements must stay small.

### The decisions

1. **Navigation, not settings.** A slim tab row replaces the Analysis Mode and View Type panels: Home · Characters · Teams · Matches · Meta · Sandbox, one tab per route in `src/routes.js`.
   - Manual upload becomes the Sandbox tab.
   - The file tree (`BRDataSelector`) moves to Matches, where choosing files is the task.
   - Target: data starts ~150px from the top of the page.
2. **A one-line scope bar, shared by every page.**
   - Season, match type, difficulty, team and "+ Filter" as dropdown chips, with the match count.
   - Sticky, and no taller than ~50px.
   - Page-specific filters (tier, score, AI strategy, map) join the same bar instead of a separate form.
   - Chips are multi-select, with OR within a chip and AND between chips. See "Settled on the demo" for the details.
   - On a phone it becomes a "Filters (n)" button that opens a bottom sheet, with the active chips on one horizontally scrolling line.
   - Scope stays visible, self-describing and in the query string, for the same reason default scoping is a tag filter.
3. **One level of flat panels.** The layers are page background, then section panel, then content.
   - A section may sit on a flat panel. Nothing inside it is another panel.
   - Inside a section, separate things with spacing, hairline dividers, alignment and type weight.
   - Popovers and tooltips are the only raised surface.
   - Corner radii shrink from today's `rounded-xl`/`2xl` (1.125rem / 1.5rem).
   - No icon on every heading, and no heading repeated by a nested container.
4. **Rows, not cards, for anything compared**: characters, teams, builds, capsules and AI strategies.
   - A sortable table with right-aligned tabular figures, bars inside cells and a sticky header row.
   - A row click opens the detail page, replacing inline expansion.
   - Builds get one row each, like MetaTFT's team comps, but the capsules stay the familiar one-column list (grouped by type, AI strategy last), never spread one per column. See the Meta Builds tab in "Page-by-page review" for how.
   - On a phone a row shows portrait, name, score and 2–3 stats. The rest come from a column picker, or from sideways scrolling with the name column frozen.
   - Target: the leaderboard at ~3 desktop screens instead of 23.
5. **Colour has jobs; plain numbers are white.** The Character Overview's colour rules apply app-wide:
   - rank green or red only at the ends (the top and bottom fifth of the pool)
   - style colours on graphics
   - the tier palette on plates and pills
   - the accent orange only on active or interactive elements
6. **Medium density by default, dense inside tables.** The analyzer serves casual viewers as much as participants, so default views must not read like a spreadsheet. Tables can pack tightly.
7. **One layout for every detail page**: identity and scope line, then one headline strip, then tabs, then content, with a right-hand column at 1280px and wider.
   - The Character page already has this shape; the Team and Match pages follow it.
   - The Overview tab keeps its approved design and loses only the chrome and outer panel around it.
8. **Phone-first for the pages people view; desktop-first for power tools.** About half the traffic is on phones.
   - **Phone-first**: Home, the Characters list, and the Character, Team and Match pages.
   - **Desktop-first**: data export, the Meta tables, build and character comparison, and Sandbox. These must still work on a phone, where sideways scrolling is acceptable.
   - **Accepted tradeoffs:**
     - Desktop layouts are designed deliberately, not a stretched phone layout.
     - Nothing important lives only in a hover: tooltips open on tap, and key numbers are inline.
     - Comparisons fit two side by side on a phone, not three.
     - Changing filters on a phone takes one extra tap.
   - Check every page at 390px and 1280px with `npm run shot` (`apps/analyzer/scripts/dev/`).
9. **A tier-list view, added alongside the leaderboard rather than replacing it.**
   - It has rows Z, S, A, B and C, each holding the portraits and names of the characters in that tier. Tapping one opens that character's page.
   - It computes nothing new: it groups the existing absolute tiers, under the same scope bar, at a URL of its own.
   - It appears in two places:
     - as a "Table | Tier list" switch on the Characters page, in the page's own control row (not the tab row)
     - as the first thing on Home: the current-season tier list, a format casual fans already recognise
   - **Position is a picker, not columns.** An All / Starter / Middle / Anchor picker sits above the list, and a character with few matches at that position is dimmed like any provisional sample.
     - Columns per position were rejected on the data. In the default scope only 19 characters have 5+ matches as Starter, 47 as Middle and 19 as Anchor, and the typical character has ~5 matches at each position it plays. Across all data, tests included, the counts are 111 / 101 / 102.
     - Check whether the score needs a position adjustment (Anchors fight longer) before the picker ships.
10. **Character portraits wherever a character appears**: tables, the tier list, match pages and the Character page header.
    - **Source: the Calculator's in-game face icons**, `apps/calculator/public/char_thumbnails/T_UI_FaceP1_<id>_00.png` (square, 512×512). The league approved reusing them.
    - **One file breaks the pattern.** Trunks (Sword) Super Saiyan (`0080_01`) is `T_UI_FaceP1_0080_00_01.png`, so the build step keeps a one-entry override map. With it, every id in `referencedata/characters.csv` has a portrait (241 of 241), and so does every id in the match data.
    - The other `_01`-suffixed files (`0810_01_01`, `0811_00_01`) are alternate icons that no id uses. Don't use the Calculator's name-keyed `public/data/characterImages.json` for lookup: its names differ from the reference data and it covers only 205 of the 241.
    - They are too heavy to use directly: 190 KB on average and up to ~345 KB each, so ~12 MB for a 62-character leaderboard. A build step makes small copies for the analyzer, around 96px WebP.
    - A character without a portrait falls back to a neutral placeholder. New characters reach match data before any asset exists, which is the same reason raw ids stay valid URLs.
    - This is the analyzer's first dependency on a Calculator asset. The Calculator's own dataset stays independent.

### Still open

- ~~The page-by-page review~~: done, see the next section.
- **A real-data demo before the rebuild**, judged side by side at both widths the way the Overview was settled. It covers the shell (tab row and scope bar), the table leaderboard, the tier list and the two candidate layouts for the Meta Builds table. **Built 2026-09-28** in `apps/analyzer/design/shell-demo/` (a throwaway; its README says how to run it). **The league gave its verdict the same day**; see "Settled on the demo" under "Page-by-page review". Measured on it:
  - The Characters table is 3.6 desktop screens (23 today) and 3.9 phone screens (16.5 today).
  - The first data row sits 263px down on a desktop and 259px on a phone. It was 216px on a desktop before the view switch moved into the page's own row, a deliberate trade against the ~150px target.
  - The tier list is 1.2 desktop screens.
  - For 25 rows, Builds layout A is 1.8 screens and layout B 5.3.

---

## Page-by-page review — decided 2026-09-28

Which pages stay, which go, which change, and what each one holds. It builds on "Visual direction" above, and was settled with the league the same day.

### What the review found

- **The leaderboard view is really two pages.** Below the 62 character cards sits a second section, "Character Position Analysis", with a panel per position full of more character cards. It is a large part of the leaderboard's 23 screens.
- **The Build Analyzer and Synergy Pairs views never shipped.** Both were built on 5 November 2025 as tabs 2 and 3 of the capsule analysis and taken off the page the next day, before they were ever committed wired in; only the files were left behind. **Both files were deleted on 2026-09-28.** The logic behind them is kept, unused, for a later look at build recommendations on the Character page's Builds tab: `utils/buildRecommendationEngine.js`, `config/buildRules.js`, `utils/capsuleEffectParser.js`, and `calculatePairSynergies` / `enrichPairSynergies` in `utils/capsuleSynergyCalculator.js`. Nobody has checked how good the recommendations are, so they are not shown until someone does.
- **Every match already carries the tags a match list needs.** All 2,505 matches have season, season phase, match type, both teams, size and difficulty, and the name says the week and match number ("PS0 Week 3 Match 2"). The scope bar can filter a plain list of matches, so the file tree is not needed.
- **A league-wide build table needs a floor.** A build is a character's exact capsule set plus AI strategy (`buildKey()`), and a typical one has 6 or 7 capsules:

  | Scope | Matches | Builds | Used 3+ times | Used 5+ times | Used 10+ times |
  |---|---|---|---|---|---|
  | Season 0 season matches (the default) | 105 | 368 | 96 | 47 | 16 |
  | Season 0, tests included | 2,135 | 2,240 | 958 | 447 | 193 |
  | Everything | 2,505 | 2,554 | 1,076 | 492 | 214 |

### The page map

| Today | Verdict | Becomes |
|---|---|---|
| Home: a viewer for one picked match | Change | A dashboard. The match viewer becomes the Match page. |
| Character leaderboard (cards) | Change | Characters, with a Table / Tier list switch |
| Character Position Analysis | Remove the section | The position picker on Characters, the Usage tab on the Character page, the Lineups tab on the Team page |
| Character page | Keep | The other four tabs restyled; the open tab in the URL |
| Team Rankings (expanding cards) | Change | A Teams table; a row opens the Team page |
| none | New | Team page |
| File tree for picking matches (`BRDataSelector`) | Replace | Matches: a filterable list of matches |
| Data Tables | Remove | An export on each table, plus the full workbook in the scope bar |
| Meta: AI strategy and capsules | Change | Meta with tabs Builds · AI strategies · Capsules |
| Build Analyzer, Synergy Pairs (never shipped) | Deleted | The logic is kept for later |
| Manual upload mode | Change | Sandbox |

### Page by page

- **Home** (phone first). v1 holds three things, in this order:
  - the current-season tier list
  - the six curated boards (Top Damage, Best Survivor, Best Starter, Best Anchor, Best Combo, Most Efficient) as top-5 lists, each linking into the Characters table already sorted
  - the latest week's season results, as match rows

  "Meta movers" waits for time-ordered data, and the spotlight cards are left out.
- **Characters** (phone first).
  - One row per character: portrait, name, tier plate, score pill, matches, average damage, damage per second, efficiency, survival, damage taken, battle time, and win % last.
  - On a phone: portrait, name, score pill, and two stat columns picked with two pickers above the table. They default to average damage and efficiency, never win %.
  - A Position chip (Starter / Middle / Anchor, any combination) in the scope bar.
  - A control row under the scope bar: the Table / Tier list switch on the left and the character count on the right. On a phone the table's two column pickers take the count's place, and the table header carries the count.
  - In the tier list, each tier's row is tinted in its own colour: crimson for Z, then purple, gold, blue and grey. The colour is the tier pill's ring, not the plate, because Z and B share a blue plate.
  - A row opens the Character page. The stats that used to expand inside each card belong to that page now.
  - Its export button carries the position split, which was the Data Tables page's position table.
- **Character page** (phone first).
  - Overview stays as approved.
  - Usage, Builds, Forms and Matches are restyled to "Visual direction". Builds are one row per build with the capsules as the one-column list (see Meta below).
  - When Usage is restyled, its position table (`PositionBlock`) moves Win rate from the third column to the last (see "Win % is a team measure" below).
  - The open tab goes into the query string, so "look at Goku's builds" is a link. ✅ 2026-09-30 (`?tab=`).
- **Teams** (phone first).
  - 13 rows: logo, name, record in the current scope, win rate, damage, efficiency, HP kept, characters used.
  - A row opens the Team page. A link goes to the website's standings, which stay the website's.
- **Team page** (new, phone first, the detail-page layout).
  - A headline strip: record, win rate, efficiency, characters used.
  - **Roster**: every character the team fielded, with its matches, how often it played each position, and its score. The character's own win % goes last, if it is shown at all.
  - **Lineups**: each match's lineup from Starter to Anchor, with builds. This is the lineup-planning page the plan asks for.
  - **Matches**: the team's matches as match rows.
- **Matches** (phone first).
  - One row per match: name, both teams, winner, size, map, difficulty, and each side's portraits.
  - Filtered by the scope bar. The file tree (`BRDataSelector`, 1,154 lines) retires, and MUI with it.
  - A "Matches | Performances" switch shows the old one-row-per-character-per-match table for power users.
- **Match page** (phone first).
  - Teams, result, map and size at the top.
  - Then a table per team in lineup order: position, portrait, build, damage, damage taken, HP left, score. Tapping a row shows the rest of that character's numbers.
  - This replaces the four levels of nested cards.
- **Meta** (desktop first). Three tabs:
  - **Builds** (new): every build across every character, the most direct answer to "what should I submit?". To keep it manageable:
    - It shows builds used **5+ times** by default, the same cutoff below which a build counts as a thin sample. The floor is a visible chip in the scope bar, not a hidden rule. That is 47 rows in the default scope and about 450 with tests.
    - It shows 25 rows, then "Show more", with character, AI strategy and "contains capsule" filters, sorted by score.
    - A "Best per character | All builds" switch gives one row per character as the short version.
    - **Capsules are always the familiar one-column list**, grouped by capsule type with the AI strategy last, never spread across columns.
    - **Layout: compact rows with the list beside them** (layout A, chosen on the demo over a list inside every row).
      - Each row is about 46px: portrait, character, the build-type pill and a capsule-type cost bar, AI strategy, uses, average damage, efficiency, score pill, and win % last.
      - The selected row's one-column list, with uses, average damage, efficiency and score, shows in the right-hand column from 1180px up. Narrower, including on a phone, it opens under the row.
      - On a phone a row shows the character, the cost bar, uses, efficiency and score.
  - **AI strategies**: the existing table, flattened. Its expanded panel becomes a detail view rather than an inline box.
  - **Capsules**: the existing capsule table.
- **Sandbox** (desktop first).
  - A drop zone and a file list, then the same Match, Characters, Teams and Meta views run over the uploaded files, labelled clearly as your uploads.
  - No share links, because uploads are not stored. The image card comes with the share-snippet work.
- **Data export** (replaces the Data Tables page).
  - ~~Every table has a small export of what it shows.~~ Dropped (the league, 2026-09-30): the full workbook covers it.
  - **The full workbook stays for power users** who want to work on all the underlying data by hand. It is today's "Export to Excel": Character Averages, Match Details and the Team Performance Matrix.
    - It becomes a "Download all data (.xlsx)" button at the right end of the scope bar on every page, and in the Filters sheet on a phone.
    - It exports the current scope, so widening the scope to everything exports everything.
    - It gains a Position sheet and a Capsules sheet, so it still holds everything the Data Tables page had.
  - `/tables` redirects to `/characters`, so old links land somewhere.

### Settled on the demo (2026-09-28)

The league reviewed the real-data demo in `apps/analyzer/design/shell-demo/` and settled these:

- **Builds: layout A**, compact rows with the list beside them. It was "significantly more appealing" than a list in every row.
- **Table colour stays as designed.** Numbers are white, and each cell's thin bar turns green for the top fifth of the column and red for the bottom fifth. The top rows of a score-sorted table come out mostly green, and that is accepted.
- **The Z pill's pulse is slower**: 3.6s a cycle, down from 2.6s, in `src/index.css` as well as the demo. It stays on in tables.
- **A score is a tier-coloured pill in every table**, on desktop and phone alike. A desktop table also keeps the tier plate column, which carries the letter. A phone drops the plate and keeps the pill.
- **Win % is a team measure.** One character's win % mostly reflects the team around it, so it is unreliable as a measure of that character or its build.
  - For characters and builds it is the last column and never a default. It is left out wherever only a few stats fit: phone column pickers, the build side panel, headline strips.
  - Prefer the measures a character controls: efficiency, damage taken, average damage, damage per second, survival and the score.
  - On team views (Teams, the Team page, records) win % is fine to lead. The Character Overview already leaves it out on purpose.
- **Filters are multi-select.** Every chip except the Builds floor takes several values:
  - **OR within a chip, AND between chips.** "Season matches, Events" means either kind; "Starter, Middle" pools the matches at either position.
  - **Capsules are the exception**: a build must contain every capsule picked, which is what someone planning a build means.
  - Each list starts with an "All …" row that clears the chip, and picking every value collapses back to "all".
  - The list stays open while values are ticked. In long searchable lists (characters, capsules) the picked values rise to the top.
  - An unset chip shows its name ("Team"). A set one shows its values ("Season matches, Events"), or the first value and a count ("Tests +2") when that runs long, or "With 2 capsules".
  - A phone gets the same lists as bottom sheets with a Done button.
- **A page's own controls stay in the page.** The tab row holds only the site's sections. A switch that changes just the current page goes in a control row inside the page, below the scope bar. That covers Characters' Table / Tier list, Meta's "Best per character | All builds" and Matches' "Matches | Performances". The demo first put Table / Tier list in the tab row, where it read as part of the whole site.
- **Tier-list rows are tinted in their tier's colour**, a little stronger behind the plate than behind the portraits: 13% opacity and 5%, lowered from 7% at the league's request.

### How pages get their data

Today one list of loaded matches lives at the top of `App`: the file tree decides what loads, the tag filter narrows it, and every view recomputes from it.

- **Scope comes from the URL.** The shell reads the scope bar's query string into one scope object.
- **Loading follows scope.** A single hook loads only the corpus shards that scope needs and caches the aggregations.
- **Each page derives its own rows** (characters, teams, builds, matches) from those matches. Detail pages read their character, team or match from the URL.
- **Sandbox swaps the source** for the uploaded files, and every page works unchanged.

This is also what lets `App.jsx` come apart one page at a time.

### Team names: display the website's names, keep the tags

The analyzer's team tags and `BR_Data/Tests/` folders say "Master and Student" and "Sentai"; the website says "Master & Student" and "Sentai Squad". **Decided:** a shared team list in `referencedata/` maps each tag to its display name, slug, website slug and logo. The analyzer shows the website's names from the start, and the Teams and Team pages reuse the website's logos (in `apps/website/public/images/`; Outlaw Stars has none). That is the second cross-app asset dependency, after portraits.

**The tags and folders keep their ASCII names.** They are identifiers, not labels, and the Submit app already works this way (`value: 'Master and Student', label: 'Master & Student'`). Why `&` is a problem, found while checking:

- **It already breaks a website link.** `apps/website/src/pages/HomePage.jsx` links each team to `/teams?team=${team.slug}` unencoded. For `master-&-student` the query reads as `team=master-`, so that team's card does not open from the home page. This is probably the problem remembered from when the name was first chosen.
- **In a path it survives but gets ugly.** `ROUTES.team()` encodes it, giving `/analyzer/teams/master-%26-student` in a Discord link. The analyzer's team slug is `master-and-student`.
- **Renaming the tags or folders would be expensive and gains nothing** once names are display data. It changes the path of every file in the team's test folder (paths become match ids in URLs), the tags of every match the team played (464 for Master and Student), `scripts/tagConfig.js`, the Submit app's value, and filter links already shared. If it is ever done, do it before match pages ship.
- **YAML is fine.** `&` only means something at the start of a value, so `name: Master & Student` is safe.
- **The shared list shipped** (2026-09-28): `referencedata/teams.json`, used by the analyzer for names, slugs and logos.
- **The website link is fixed** (2026-09-28): `HomePage.jsx` now encodes the slug. Every other team link on the website puts the slug in the path, where `&` is harmless. Still worth considering on the website side, outside this plan: `master-and-student` as its slug, keeping the old one working.

---

## Share-snippet feature

- Reusable `<ShareButton>` used on Character/Team/Match pages and in the Sandbox.
- **On league-data pages:** copies the deep link to the current view **and** offers "copy as image card" (renders the on-screen key-stats block via canvas/`html-to-image`).
- **In the Sandbox:** image-card export only, no deep link — sandbox data isn't persisted, so a link wouldn't resolve for anyone else.
- Format priority: **image card first** (this is what gets pasted into Discord); text/markdown fallback deferred.
- **Prerequisite:** the 404 dispatcher above. A share button that emits broken links is worse than no share button.

---

## Transformations — decided 2026-09-30

The redesign dropped the transformation figures the old app had: an average count per match, per character and per AI strategy, with a sortable column on the old AI strategy table (`d068efba`). Participants read them to pick the AI that gets a character to transform, and to see how often one does. Only the workbook and the Forms tab's "Changed form in X of N" line kept them. The league settled their return on 2026-09-30.

**Measured first** (the real corpus, 2026-09-30):
- **The old average mostly said who runs an AI.** Pooled over every character and match, it counted characters whose only move is back to base (Trunks (Kid) Super Saiyan, 0 of 227), fusions as plain form changes, and matches with Broly's Ring, which blocks transforming (no match with it transformed).
- **Compared within each character, the AI's effect is real and stable**: the same characters on an AI against their other AIs. Random halves of the data agree at r = 0.90 on the last two seasons, Ultra (0.87 over everything). Attack: Evasion leads (+42 points there, +24 over everything); Ultimate Blasts, Barrage, Combos and Counters sit at the bottom.
- **Skill gauge capsules** (transformations and fusions spend the gauge: 1 count for most transformations, 2 or 3 for some, almost always 3 for a fusion, the league's account). League-wide, none moves the rate past the ±12 points unrelated capsules swing by (same character, same build type, last two seasons, Ultra: Super Transformation +4). Super Transformation cannot lower a 1-count transformation, so its effect is per character. Skills do not visibly compete with transforming for counts: 0.23 skills a minute whether the character transformed or not.
- The median time on the field before the first transformation is 54 seconds.
- **The default scope is too thin to compare AIs**: Season 0's league matches (105) leave 11 of 13 AI rows at Low data, while the last two seasons, Ultra (1,350 matches) give 7 High, 6 Medium and 2 Low.

**The rules** (`apps/analyzer/src/utils/transformation.js`, guarded by `verify-transformations` in prebuild):
- **A transformation is any form change the character makes itself, fusions included** (the league: the AI treats the two as one behaviour). A fusion counts for the character that starts it, whose record holds it. Form changes after a fusion are the fusion's.
- **Counted matches**: it fought, it was not fused in from the bench by a teammate, it carried no Broly's Ring, and a character that can only fuse (Goku Black Super Saiyan Rosé, Zamasu, Vegeta (GT) Super Saiyan 4) had its partner on its team. A match it transformed in always counts.
- **Reverts are not transformations.** A move back to the family's base form is set aside, so a form whose only move is down cannot transform (17 forms; `npm run verify-transformations -- --list`).
- **The "Default" AI** is a since-fixed file bug that transforming set off (all 30 such matches transformed). Those matches count for the character, never in an AI comparison, and the Default row leaves Meta's AI strategies.
- **The figures**: the transform rate (transformed / counted matches) and the median time on the field before the first transformation.
- **Everything follows the scope bar** (the league's pick, over changing the site's default scope or pinning these figures to the reference window). Where most rows are Low, a link offers "Widen to the last 2 seasons, Ultra" and sets those chips, visibly.

**Where it shows**, in order:
1. ✅ **Rules, reference fixes and verifier** (2026-09-30). `referencedata/transformations.json` took the 33 DLC entries that had gone only into Match Builder's copy (Bardock Super Saiyan, Vegeta (GT), Trunks (GT) and Ma Junior with their forms, the fusion Super 17 (GT), and 25 characters with no moves) and Bardock's move to Super Saiyan; the deploy copies the root file over Match Builder's, so production had been losing them. It also took two moves the match files record: Vegeta (Z - Scouter) → Great Ape Vegeta, and Super Buu → Super Buu (Gohan Absorbed) directly. The copies in the analyzer, Match Builder and the website are synced.
2. ✅ **Meta › AI strategies** (built 2026-10-01): a **Transform** column, the change in points for the same characters on this AI against their other AIs, as a diverging bar, sortable (`sort=transform`), pickable on a phone. With the Character chip on one character it is that character's own, and for a character that cannot transform the column switches off with a line saying so. A **Transformations** box in the detail: the rate and the time to the first transformation, on this AI against other AIs, and the characters it raises and lowers most. The Default row goes. Built as written, plus one thing the default scope showed: a Transform figure rests on far fewer matches than its row (only the counted matches of characters that transform), so it carries its own data quality, and a Low one is faded with the reason in its tooltip; the Widen link also appears when most Transform figures are Low. See `apps/analyzer/CLAUDE.md`, "The Meta page".
3. **Character page**: the Forms tab becomes **Transformations** (`?tab=forms` still opens it), shown for every character that can transform or fuse. Header figures (transformed x/N, first transformation, fused when it applies), a **By AI strategy** table (uses, transform %, first transformation; under 5 uses faded; a row opens Meta › AI strategies on this character), a **skill gauge capsules** box (Super Transformation, Secret Measures, Dragon Spirit, Dragon Heart and Broly's Ring, with and without, for this character), then the per-form averages. A fusion-only character whose partner was never on its team says so.
4. **Smaller additions**: a Transform % column on the Character page's Builds tab; a transformation line in Meta › Capsules' detail for those five capsules, under the tab's own rule (hidden at Low data, neutral below the threshold); the count beside the Performances table's Forms path, sortable by it; transform columns on the workbook's Character Averages and AI Strategies sheets.

Not doing: a Transform column on the Characters table (the league: too much for too little, and a character's own tabs have it).

**Open, for the league:**
- Each transformation's skill count (1, 2 or 3) is not in the reference. With it, the Transformations tab could show the cost beside each form and say when Super Transformation cannot help. Optional.
- ✅ **Found on the way, fixed 2026-09-30 at the league's request:** a partner absorbed into a fusion from the bench had no record in 12 of the 32 fusions' files (11 of them Goku Black → Fused Zamasu), and THE FUSION RULE was skipped there: the initiator kept the whole fusion and the partner had no appearance. `withAbsorbedPartners()` (`utils/fusionSplit.js`) now adds the record the game writes in the other 20, without the build the file does not have; see `apps/analyzer/CLAUDE.md`, "Fusions". Over everything, 260,027 damage moved to the partners: Goku Black Super Saiyan Rosé 43,388 → 41,925 average damage (score 62.2 → 61.6), Zamasu 229 → 240 matches. A partner fused in from the bench is also left out of its own transformation rate: it never fought as itself.

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

Retire the 2,062-line hand-rolled `App.css` and the 1,199 `darkMode` ternaries **per component, as each page is rebuilt**, rather than as one up-front migration. Since 2026-09-28 `App.css` sits in the `legacy` cascade layer and always loses to Tailwind, so restyling a component in Tailwind is enough to take it off `App.css`; delete the dead rules as you go.

The original plan here was to replace prop-drilled `darkMode` with Tailwind's `dark:` variant plus a small `ThemeContext`. With light mode removed for the foreseeable future, **collapsing each ternary to its dark branch** is simpler and loses nothing; build a theme mechanism only if light mode ever comes back.

This is the key sequencing change from the original plan: the CSS teardown rides along with visible work instead of blocking it, and the regression surface is one component at a time rather than a 6,678-line file at once.

### 2c. Responsive shell, accessibility, persistence

- Rebuild the app shell as decided in "Visual direction":
  - A slim tab row replaces the mode and view-type panels.
  - A one-line sticky scope bar replaces both the tag panel and the leaderboard's 751px "Filters & Sorting" form. On a phone it becomes a "Filters (n)" button and a bottom sheet.
  - On a phone, `DataTable` scrolls sideways with a frozen name column or offers a column picker. It does not switch to cards.
- Consolidate the 13 inline stat primitives out of `App.jsx` into theme-aware, responsive components under `src/components/`.
- Reuse `packages/ui/NavBar.jsx`'s existing mobile hamburger pattern rather than inventing a new one.
- Accessibility: contrast, focus states, 44px touch targets, keyboard nav for the tree selector and comboboxes.
- **Add persistence** (new): a small `localStorage` layer for filter state. There is none today, so a shared deep link always opens in defaults. (Dark mode needs none: it is the only theme.)
- Validate at 375px / 768px / 1280px with real builds.

### 3. Character page rebuild

**Prerequisite: the 404 dispatcher must ship first.**

**Routing foundation done 2026-09-27**: real `<Route>` entries replace the bare catch-all (a `path="*"` fallback is kept on purpose so stale links still render), `src/routes.js` is imported by `main.jsx` and `App.jsx` and owns the view mapping, `viewType` is derived from the URL instead of state, `TagFilterSelector` has moved from `history.replaceState` to `useSearchParams`, and `/characters/:charParam` resolves a slug or a raw id and canonicalises the id to the slug. `npm run verify-routes` guards the scheme. **Character page done 2026-09-27**: `src/pages/CharacterPage.jsx` renders in place of the leaderboard on a character deep link — identity header with the absolute tier plate, headline stats, usage, the position split, the per-form breakdown (via the existing `PerFormStatsDisplayAggregated`), top builds and recent matches that click through to the match view. It is purely presentational; every number already existed in the aggregated row. `<ShareButton>` copies an absolute deep link to the current view. `npm run verify-character-page` guards the page's data contract by scraping the fields it reads out of its own source. **Still to do in this phase: the share-snippet image card, the Advanced-tab build comparison, and the querystring-driven character comparison below.** The page settled on a **tabbed** layout (compared against a dense single column and a sticky rail with real data); its **visual design is deliberately deferred** to a dedicated design conversation with demos, held once the current structural work is finished, and judged against both participants and casual viewers. The known brief so far: nothing leads the eye, and every surface shares one background and text colour. **The Overview was designed that way (below). Since 2026-09-28 the app-wide "Visual direction" also applies**, so the remaining tabs follow it: rows rather than cards, one level of flat panels, and portraits.

#### Overview tab: approved design (2026-09-28)

Settled over a long design conversation with real-data demos. The demo was deleted once the tab shipped and matched it (2026-09-28); the tab itself, `apps/analyzer/src/pages/character/overview/`, is now the reference. The page answers two questions for a participant **and** a casual viewer: *how is this character doing on the stats that matter*, and *what kind of fighter is it*.

**Layout, top to bottom**

1. **Identity header**: tier plate and score pill for the current view. Selecting a build switches both to that build's score.
2. **"Showing one build · Show all builds" strip**: appears above the stats only while a build is selected, so a filtered view (including one opened from a shared link) never passes for the whole picture.
3. **Five headline tiles**: Damage dealt, Damage taken, Efficiency, Damage/sec, Battle time. Each has its value, a bar with a league-median tick, and one line reading rank on the left and "League 38,981" on the right. The league number is inline rather than in a tooltip because these are the main comparisons and phones cannot hover. Win rate is deliberately absent. Battle time was neutral in the approved design; at the league's request (2026-09-28) its rank now takes the end colours like every other, #1 being the longest time on the field.
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
- **Colour appears only at the ends**: the top fifth of the pool in green, the bottom fifth in red, everything between neutral. **Every rank on the page follows this**, including battle time and the volume cards (ki blasts, skills), which were neutral until 2026-09-28. Banded, not a gradient, so #3 and #10 are the same green. Dark mode uses `#16e05a` / `#ff2b3a`; light mode uses `#047a2e` / `#c8102e`. Every colour reads at 4.5:1 or better as text.
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
3. ✅ **Style-baseline generator** (done 2026-09-28): `scripts/generate-style-baseline.mjs` → `src/config/style-baseline.json`, in prebuild.
   - Uses the tier cutoffs' window via the shared `scripts/calibration-basis.mjs`, and the page's own `src/utils/characterOverview.js`, so a character and the league are measured identically.
   - Idempotent: a rebuild without a recalibration leaves no diff.
   - Found along the way: the fusion split moved battle time without the new hit totals, and three more places (the per-form stats and both fusion splits) still counted skills from `eXACount`. All now use the per-slot counts via `skillSlotUses()`.
4. ✅ **One shared build-key function** (done 2026-09-28): `src/utils/buildKey.js`.
   - It replaced six hand-written copies (the build table, the filter, both aggregations' build grouping, the team aggregation and `App.jsx`).
   - `buildCode()` / `findBuildByCode()` make and resolve the short `?build=` code. All 3,617 real builds get a unique code within their character, checked by `verify-character-page`.
5. ✅ **The Overview components** (done 2026-09-28): `src/pages/character/overview/`, Tailwind, both themes, checked at desktop and phone width against the served build.
   - The old Overview blocks moved to a new **Usage** tab. The always-visible `HeadlineBlock` strip is gone, since the tiles replace it and win rate is left out on purpose.
   - `?build=` filters the whole page except the Builds tab, with the "Showing one build" strip. `App.jsx` strips the param on the way off the page.
   - `verify-character-page` checks the Overview's per-match fields, the build list against the leaderboard's filter, and that every style places. `smoke-character-page` renders the Overview, the Bars view and a `?build=` link.
   - Found on the way: `App.css` base classes beat Tailwind's responsive variants (the tiles stayed two columns wide). That led to making Tailwind authoritative; see Phase 2b.
6. ✅ **Deleted `design/character-overview/`** (2026-09-28), once the tab matched it.

This is also where the participant workflow starts paying off, and the page should be shaped by principles 1 and 4 rather than by what `App.jsx` currently renders:

- **Default view** = a handful of legible headline stats, scoped to the current active season, with the scope visible and changeable.
- **Build comparison** behind an Advanced tab: the same character across capsule builds and AI strategies, side by side. `BuildTableView` / `BuildDisplay` (currently inside `App.jsx`) are the raw material.
- **Build recommendations surfaced here**, since this is where the decision is made. The old engine (`buildRecommendationEngine.js`) was deleted on 2026-09-29, being built on the capsule composite score the redesign dropped: rebuild it on the league's own score (the pooled Meta tables' `filterAggregatedData` rows, and `capsuleRows`' pairs).
- **Position breakdown** as a tab on this page, per the original feature audit — but see Phase 4 for the standalone lineup-planning surface.
- **Character comparison** (2–3 side by side) as a querystring-driven mode on the leaderboard, so a comparison is itself shareable.

### 4. Team page + Match page rebuild

Reuse the shared aggregation and `<ShareButton>` proven in step 3. Define and test the match-ID encoding scheme (relative path, spaces and slashes, round-tripped through the router). Retire MUI here with the Matches browser rebuild.

What the Teams list, the Team page (Roster · Lineups · Matches), the Matches list and the Match page hold is settled in "Page-by-page review". That section also covers the shared team list in `referencedata/`, which comes first so that names, slugs and logos are right from the start.

Two participant-facing additions belong here, both flowing from principle 4:

- **Lineup planning as a first-class surface on the Team page.** Since a lineup is (character × AI strategy × capsules × position) and position drives matchups, a team member should be able to reason about Starter / Middle / Anchor in one place rather than by filtering a character table. `positionAggregation.js` already provides the math.
- **Trend over time** for a team and its characters across a season or test run, using the ordering key added to the index in Phase 1.5.

**Matchup analysis** (how character A actually fares against character B, by position) is a strong candidate here — opponent data already flows through `characterAggregation.js` and `teamAggregation.js`, and principle 6 argues it should be first-class. Scope it once the Character and Team pages are real; don't commit to it before then.

### 5. Home dashboard — **rescoped**; ✅ v1 built 2026-09-30 (see "Progress", Phases 4–7)

**Stats-only. No standings.** The website app already owns standings, teams and events as its core content; duplicating them here creates two sources of truth and a sync obligation. Link across to the website for standings via `@szl/ui`'s `APPS` constants.

This is the casual viewer's front door, so principle 1 governs it absolutely: **something interesting within seconds, zero configuration.** It is scoped to the current active season by default (principle 2), with the scope stated on the page and changeable.

- **The current-season tier list leads the page** (see "Visual direction", decision 9). It is the same view as the Characters page's Tier list, and each portrait links to that character's page.
- **Curated category leaderboard cards** — named, opinionated boards a newcomer grasps instantly: Top Damage Dealer, Best Survivor, Best Starter, Best Anchor, Best Combo, Most Efficient. **Implement these as presets over the single Character leaderboard, not as separate features** — each card is a saved querystring that links into the full table pre-filtered and pre-sorted. One implementation, one source of truth, and a casual viewer who clicks through lands somewhere they can keep exploring.
- The latest week's season results, as match rows.
- **Later, not in v1** (decided 2026-09-28):
  - Spotlight character and team stat cards.
  - Meta movers: what has risen or fallen since the last season phase. It needs the Phase 1.5 ordering key.
  - Notable recent matches by damage, combo or upset.
- Clear entry points into Characters / Teams / Matches / Meta / Sandbox.

Team test data is reachable from here but is not the default lens (principle 3) — a viewer who arrived to see how the season is going should see the season.

### 6. Meta/Builds page consolidation

One page with tabs: **Builds** (new, a league-wide build table; **built 2026-09-28**, see "Progress"), **AI strategies** and **Capsules**. See "Page-by-page review" for the Builds table's floor, filters and layout (compact rows with the capsule list beside them, chosen on the demo). The Build Analyzer Tool is no longer part of this: it never shipped and was deleted on 2026-09-28.

### 7. Sandbox polish

Manual Upload mode gets the new design system and image-card sharing (no deep links — data isn't persisted). Retains the raw-file aggregation path established in Phase 1.5. It runs the same Match, Characters, Teams and Meta views over the uploaded files, so it needs no page components of its own.

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
- **Visual direction** (decided 2026-09-28, see "Visual direction"):
  - a tab row instead of the mode and view panels
  - a one-line sticky scope bar
  - one level of flat panels, with nothing boxed inside a section
  - rows, not cards, for anything compared
  - colour only where it means something, with plain numbers white
  - medium density by default and dense tables, because casual viewers matter as much as participants
- **Phone-first for viewing pages, desktop-first for power tools.** About half the traffic is on phones. **Decided 2026-09-28.**
- **The tier list is an addition, not a replacement.** It is a view of the Characters page and the lead of Home, with position as a picker rather than columns. **Decided 2026-09-28.**
- **Character portraits come from the Calculator's face icons**, resized at build time. **Decided 2026-09-28.**
- **Page-by-page review** (decided 2026-09-28, see "Page-by-page review"):
  - Data Tables goes, and each table exports itself. The full Excel workbook stays for power users, in the scope bar, and gains Position and Capsules sheets.
  - The Build Analyzer and Synergy Pairs files are deleted. Recommendations get another look later.
  - Meta gains a Builds table with a visible 5+ uses floor. Capsules always show as the one-column list.
  - Team names come from a shared list with the website's names and logos. Tags and folders keep their ASCII names, and the analyzer's slug avoids `&`.
  - Home v1 is the tier list, the curated boards and the latest results.
- **Settled on the shell demo** (2026-09-28, see "Settled on the demo"):
  - Builds use layout A, compact rows with the capsule list beside them.
  - Table colour stays as designed, and the Z pulse slows to 3.6s.
  - A score is a tier-coloured pill in every table.
  - Win % is a team measure: it goes last for characters and builds, and is never a default there.
  - Filter chips are multi-select, OR within a chip and AND between chips, except capsules, which must all be in the build.
