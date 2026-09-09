# Analyzer App Cleanup, Reorganization & Redesign Plan

Status: **Approved** (2026-09-06). Implementation not yet started — this document is the reference plan for future work sessions.

## Goals

1. Make the analyzer serve two audiences well instead of one: **teams** (offseason testing, build/lineup tuning) and the **community** (casual viewers wanting quick, digestible insight).
2. Every character, team, and match gets a real, shareable URL (deep links).
3. A "share snippet" button on Character/Team/Match pages (and the Sandbox) that exports a shareable image card of the on-screen stats.
4. Clean up and consolidate the codebase (currently one ~9,600-line `App.jsx` with heavily duplicated aggregation logic).
5. Modernize the visuals and fix mobile compatibility.

## Current-state findings (as of 2026-09-06)

- **Monolithic `App.jsx`**: a `mode` (Reference Data / Manual Upload) × `viewType` (Single Match / Aggregated / Team Rankings / Data Tables / Meta Analysis) matrix, all rendered conditionally from one file.
- **Duplicated aggregation logic**: character/team/position stat aggregation (damage, efficiency, DPS, build grouping, fusion-split math) is independently reimplemented at least 4 times — `getAggregatedCharacterData`, `getTeamAggregatedData`, `getPositionBasedData`, and again inline inside the `filteredAggregatedData` `useMemo`. Any stat fix/addition currently needs to be made in multiple places.
- **No deep links except tag filters**: `TagFilterSelector` already syncs its filters (season/team/matchType/difficulty/matchSize) to URL query params via `URLSearchParams` + `history.replaceState`. Nothing else (selected match, character, team, view type) is reflected in the URL.
- **No sharing mechanism** exists today.
- **Responsive classes are broken**: `App.jsx` uses 17+ instances of Tailwind breakpoint syntax (`md:grid-cols-*`, `lg:grid-cols-*`, `sm:grid-cols-*`), but `App.css` hand-rolls a "Tailwind-lookalike" utility set instead of running real Tailwind, and defines **zero** `.md\:`/`.lg\:`/`.sm\:`/`.xl\:` rules. Every "responsive" grid in the app currently renders at a single fixed column count regardless of screen size — mobile included.
- **Existing supporting components** (reusable as-is or with minor changes): `BRDataSelector` (MUI tree file picker), `TagFilterSelector`, `Combobox`/`MultiSelectCombobox`, `DataTable`/`TableConfigs`/`ExportManager` (Excel export), `PerFormStatsDisplay`, `components/ai-strategy/*` (7 components), `components/capsule-synergy/*` (incl. `BuildAnalyzerTool`).
- **Tagging system already implemented**: `tags` object per match file (`seasonNumber`, `seasonPhase`, `team`, `matchType`, `difficulty`, `matchSize`), auto-tagged at build time (`scripts/autoTagMatches.js`), indexed into `public/br-data-tags.json`, file tree in `public/br-data-structure.json`. This is a solid foundation for filtering and for the Matches browser.
- **Shared nav**: `packages/ui/NavBar.jsx` already provides a cross-app nav bar with a working mobile hamburger pattern (see repo memory `architecture.md` Phase 2b/2c) — reuse this pattern for other mobile nav needs instead of inventing a new one.
- **Cross-app design-token debt already flagged** in repo memory: "unify sz-orange/dragon-orange/dbz.orange into one palette" — this plan's Design System phase should close that out.

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
| Tag filtering | Both | Keep and extend (already URL-synced — good foundation) |
| Reference-data mode + BRDataSelector tree | Both | Rebuild UX around real navigation/routes instead of mode/viewType radios |
| Fusion-split logic, per-form stats | Both | Keep logic, extract into shared hooks (currently duplicated per-view) |

A more granular component-level pass happens at the start of each phase below.

## Target information architecture (routing)

Introduce `react-router` (matching the pattern already used by the `website` app) with URL-addressable pages:

```
/analyzer/                          → Home: season/league dashboard (standings snapshot, recent notable matches, spotlight character/team)
/analyzer/characters                → Character leaderboard (searchable, sortable)
/analyzer/characters/:charId        → Single character deep-dive (deep-linkable)
/analyzer/teams                     → Team rankings
/analyzer/teams/:teamSlug           → Single team deep-dive (deep-linkable)
/analyzer/matches                   → Match browser (BRDataSelector + tag filters)
/analyzer/matches/:matchId          → Single match report (deep-linkable)
/analyzer/meta                       → Build/AI/capsule meta analysis
/analyzer/sandbox                   → Manual upload / testing workspace
```

Filters (team/AI/map/build/performance) become querystring state on these routes — extending the pattern `TagFilterSelector` already proves out — so a filtered view is also shareable, not just the base page.

## Share-snippet feature

- Reusable `<ShareButton>` component used on Character/Team/Match pages and in the Sandbox.
- **On league-data pages** (Character/Team/Match): copies the deep link to the current view **and** offers "copy as image card" (renders the on-screen key-stats block to an image via canvas/`html-to-image`).
- **In the Sandbox**: image-card export only, no deep link — sandbox data isn't persisted/hosted, so a link wouldn't resolve for anyone else. Purely a client-side render of on-screen stats.
- Format priority: **image card first** (this is what gets pasted into Discord); a text/markdown fallback can be added later if requested.

## Technical refactor plan

- Extract aggregation math out of `App.jsx` into `src/hooks/` (`useAggregatedCharacters`, `useTeamAggregates`, `usePositionAnalysis`, `useFusionAdjustedStats`, etc.) — one implementation reused by the leaderboard, deep-dive pages, and Excel export, replacing today's ~4 near-duplicate implementations.
- Split `App.jsx` into route components under `src/pages/`; move existing presentational pieces (`StatBar`, `MetricDisplay`, `PerformanceIndicator`, `StatGroup`, `BuildTableView`, `PerFormStatsDisplay`, etc.) out of the monolith into their own modules under `src/components/`.
- Introduce a small "current selection" URL-state layer (`?match=...`, `?team=...`, `?char=...`, filter params), consistent with `TagFilterSelector`'s existing URL-sync approach.
- Do this incrementally per view (Characters → Teams → Matches → Meta) so the site stays functional throughout — no big-bang rewrite.

## Phased rollout (final order)

1. **Foundation** — add `react-router`, define the URL scheme above, extract shared aggregation hooks. No visible UX change; behavior-preserving structural refactor, verified with real builds (not just diagnostics) at each step.
2. **Design System & Mobile Foundation** —
   - Migrate analyzer to real Tailwind (`tailwindcss` + `postcss.config.js`), matching website/matchbuilder/calculator. Fixes the broken-breakpoint issue and retires the ~2,000-line hand-rolled `App.css`.
   - Define shared design tokens (color palette unification, spacing/type/radius/shadow scales) via `packages/ui`, closing out the previously-flagged cross-app token debt.
   - Rebuild the responsive app shell: replace the wide mode/view-type card row with a pattern that degrades gracefully on mobile (segmented control / scrollable tabs), give the sticky filter panel a mobile-specific collapsed/slide-over treatment, and give `DataTable` a mobile strategy (horizontal scroll with sticky first column, or card-per-row under a breakpoint).
   - Consolidate the repeated inline stat-display primitives (`StatBar`, `MetricDisplay`, `PerformanceIndicator`, `StatGroup`, etc. — currently hand-styled with `darkMode ? 'x' : 'y'` repeated hundreds of times) into a small set of theme-aware, responsive components.
   - Accessibility pass: color contrast, focus states, touch target sizing (44px minimum), keyboard nav for tree selector/comboboxes.
   - Validate at 375px/768px/1280px breakpoints with real builds + visual checks.
3. **Character page rebuild** — first page built on the new architecture + design system; introduces the `<ShareButton>` pattern.
4. **Team page + Match page rebuild** — reuse the same shared hooks and `<ShareButton>` component proven in step 3.
5. **Home dashboard** — new: season/league snapshot, spotlight character/team, recent notable matches. Directly addresses the community-facing gap.
6. **Meta/Builds page consolidation** — merge AI Strategy Analysis + Capsule Synergy Analysis + Build Analyzer Tool into one page with tabs.
7. **Sandbox polish** — Manual Upload mode gets the new design system + image-card sharing (no deep links, since data isn't persisted).

## Decisions locked in

- Share snippet format: **image card first** (canvas/`html-to-image`), text/markdown fallback deferred.
- Routing: **react-router**, matching the `website` app.
- Rollout order: as listed above (Foundation → Design System & Mobile → Character → Team/Match → Home → Meta → Sandbox).
- Sandbox stays fully separate from the public league dataset (no persistence, no deep links to uploaded files), but gets the same image-snippet share button since it's a pure client-side render.
- Design System phase (2) sits **after** Foundation and **before** any page rebuild, so no page gets built twice (once in old styling, once redesigned) and structural refactor (verifiable) stays separate from visual redesign (subjective, needs review).
