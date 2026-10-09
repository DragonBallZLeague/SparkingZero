# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository overview

Monorepo powering the Dragon Ball Sparking Zero League (DBSZL)'s public web infrastructure. All apps are served from a single domain (`dragonballzleague.github.io/SparkingZero/`) as independently-built sub-apps under one path each. There is no test suite or lint script configured anywhere in the repo — don't invent `npm test`/`npm run lint` commands.

Each app/package below has its **own `CLAUDE.md`** with app-specific architecture, gotchas, and conventions — read it before working inside that directory. This root file covers only cross-cutting concerns: the overall map, shared infra, the deploy pipeline, and how the apps connect to each other and to shared data.

| App | Path | Route | Purpose | Details |
|-----|------|-------|---------|---------|
| Website | `apps/website/` | `/` | Public site — home, teams, standings, events (season-scoped off-shoot competitions), rules, community, archives. React Router SPA, content driven by YAML files in `public/content/`. Its Vite build has a second entry for the `/cms` Decap CMS admin panel, whose preview pane renders the site's own page components; it also serves the standalone `/schedule-import` tool. | `apps/website/CLAUDE.md` |
| Analyzer | `apps/analyzer/` | `/analyzer/` | Battle Result Analyzer — stats, per-character/per-form breakdowns, capsule synergy, AI-strategy analysis over submitted match JSON data (`BR_Data/`). Redesigned (the restyle and Home closed 2026-09-30); the next phase's features are ahead, see "In-progress work" below. | `apps/analyzer/CLAUDE.md` |
| Match Builder | `apps/matchbuilder/` | `/matchbuilder/` | Builds/records matches (teams, capsules, AI, results); exports/imports as YAML. | `apps/matchbuilder/CLAUDE.md` |
| Character Calculator | `apps/calculator/` | `/calculator/` | Character data/stat viewer with capsule/skill build comparison. Its `public/data/` is **generated** by `scripts/build-data.mjs` from committed snapshots of three game-data spreadsheets, curated CSVs and `/referencedata/` (joined by character id); a snapshot of the game files themselves (an FModel export, `data/snapshots/fmodel/`) is being adopted as the primary source — see that app's CLAUDE.md and `data/README.md`. | `apps/calculator/CLAUDE.md` |
| Admin Dashboard | `apps/admin/` | `/admin/` | GitHub OAuth–gated dashboard to review/approve/reject community data-submission PRs. Requires push access to the repo. | `apps/admin/CLAUDE.md` |
| Submit | `apps/submit/` | `/submit/` | Standalone static (vanilla JS) page for uploading battle-result JSON as a PR without needing the full Analyzer or Admin access. | `apps/submit/CLAUDE.md` |

Supporting infra:
- `referencedata/` — shared source-of-truth CSV/YAML/JSON (characters, capsules, maps, transformations, capsule rules, teams), consumed by Analyzer, Match Builder, Website and (through its data build, `apps/calculator/scripts/build-data.mjs`) Calculator at build time. **Only edit data here**, then rebuild the consuming apps — see "Shared reference data" below.
- `packages/ui/` (`@szl/ui`) — shared, no-build-step UI (nav bar, cross-app link constants) plus `src/tokens.js`, the shared Tailwind design tokens every app's `tailwind.config.js` sources its palette from. Consumed via Vite alias by Website, Analyzer, Match Builder, and Calculator — **not** Admin. See `packages/ui/CLAUDE.md`.
- `vercel-api/` — the deployed Vercel serverless API (GitHub OAuth, submission validation, admin approve/reject, BR_Data file listing, Decap CMS auth) backing Admin, Submit, and Website's `/cms`. `vercel.json` at repo root points Vercel at this directory. See `vercel-api/CLAUDE.md`.
- `api/` — older duplicate of some `vercel-api` functions; **not** referenced by the active deployment. Reference only, don't extend it.
- `docs/` — design docs/implementation notes for the admin dashboard, upload pipeline, and reference-data tagging.
- `GSTest/`, `NADFileTesting/` — local data-extraction/experimentation scripts, not part of the deployed site. `GSTest/extract-data.js` produced the calculator's old hand-edited JSON; it is superseded by `apps/calculator/scripts/` (`pull-sheets` / `build-data`) and nothing reads its output.

## Development commands

Node **22** is required (pinned in the root `.nvmrc`, which both `deploy.yml` and `validate-json.yml` read via `node-version-file`) — match it locally, since build scripts use Node 22 APIs such as `module.registerHooks` in `apps/analyzer/scripts/json-import-hook.mjs`, which also keeps a Node 20 fallback.

The root `package.json` npm workspace covers **only** Match Builder, Analyzer, and Calculator. Website and Admin have their own independent `package.json`/`node_modules`.

```bash
# Install
npm install                          # Match Builder / Analyzer / Calculator workspace
cd apps/website && npm install       # Website
cd apps/admin && npm install         # Admin (needs VITE_ADMIN_CLIENT_ID, see .env.example)

# Dev servers (from repo root unless noted)
npm run dev              # Match Builder      -> :5173
npm run dev:analyzer     # Analyzer           -> :5173
npm run dev:calculator   # Calculator         -> :5175
(cd apps/website && npm run dev)   # Website  -> :5173
(cd apps/admin && npm run dev)     # Admin    -> :5174
# Submit is static: open apps/submit/index.html or serve the folder directly

# Build
npm run build             # Match Builder
npm run build:analyzer    # Analyzer (prebuild also runs autoTagMatches.js, generate-br-data-structure.js, generate-br-data-tags.js, verify-action-codes.mjs, generate-br-aggregates.js and generate-performance-bands.mjs over BR_Data, then verify-character-slugs, verify-match-slugs, verify-portraits, verify-teams, verify-transformations, verify-routes and verify-self-contained)
npm run build:calculator  # Calculator
npm run build:all         # Match Builder + Analyzer + Calculator
(cd apps/website && npm run build)
(cd apps/admin && npm run build)
```

Since Match Builder/Analyzer/Calculator share one npm workspace root, always run their dev/build scripts via the root `package.json` scripts (`npm run dev:analyzer`, etc.) rather than `cd`-ing into the app and running `npm run dev` directly, unless intentionally testing that app's own script in isolation.

There's no single-test-runner command to give — there are no automated tests in this repo. Validate changes by running the relevant app's dev server and exercising the feature in the browser.

## Deployment

All apps deploy together to GitHub Pages via `.github/workflows/deploy.yml` on push to `main` or `dev-branch` (or manual `workflow_dispatch`). Its checkout takes the **full git history, without file contents** (`fetch-depth: 0`, `filter: blob:none`): the Analyzer's prebuild dates each test and event upload by the commit that added it (`apps/analyzer/scripts/generate-recent-uploads.mjs`), so do not make it shallow again. Order matters: Match Builder → Analyzer (after `scripts/fix-json-encoding.js` runs on `BR_Data`) → Admin → Calculator → Submit (copied as static files) → sync `referencedata/transformations.json` into Website/Match Builder → Website built last, directly into `dist/` root with `--emptyOutDir=false` so it doesn't wipe the other apps' output → `scripts/build-404.js` generates `dist/404.html` for SPA client-side routing on refresh (see "The site-root 404 fallback" below), verified by `scripts/verify-404.mjs`.

### The site-root 404 fallback

GitHub Pages serves the **site-root** `dist/404.html` for every path that is not a real file — including paths inside a sub-app. It used to be a plain `cp dist/index.html dist/404.html`, i.e. the *website's* bundle, so `/SparkingZero/analyzer/characters/0620_00` loaded the website, whose router (basename `/SparkingZero`) has no such route, and rendered an empty page. Every sub-app deep link broke on refresh or when shared.

`scripts/build-404.js` now keeps the website markup — so website deep links like `/SparkingZero/teams/x/schedule` behave exactly as before, with no extra redirect — and injects a dispatcher into `<head>` that stashes the original URL in `sessionStorage` and redirects sub-app paths into the right app. Each routed sub-app restores the URL before its router mounts: `packages/ui/src/deepLink.js` (`restoreDeepLink`), called in `apps/analyzer/src/main.jsx`, and duplicated inline in `apps/admin/src/main.jsx` since Admin does not consume `@szl/ui`. **The `sessionStorage` key must stay in sync across those three files.**

`node scripts/verify-404.mjs` asserts the routing table (it imports the same `resolveRedirect` that is stringified into the page, so tests cannot drift from what ships) and runs in the deploy workflow. **No dev server reproduces this behaviour** — Vite rewrites unknown paths to its own app's index.html, so a broken fallback looks fine locally. To test deep links for real: build, then `node scripts/build-404.js`, then `node scripts/serve-dist.js`, which serves `dist/` under `/SparkingZero/` with the Pages 404 rule.

Each app's `vite.config.js` sets its own `base` to match its GitHub Pages subpath (`/SparkingZero/<app>/`, or `/SparkingZero/` for Website). Admin's base is passed at build time (`--base=/SparkingZero/admin/`) rather than set in its config. If assets 404 in production, check that base path first. Full troubleshooting steps are in `DEPLOYMENT.md`.

## Shared reference data (`referencedata/`)

`characters.csv`, `capsules.csv`, `maps.csv`, `capsule-rules.yaml`, `transformations.json` and `teams.json` are the single source of truth for character/capsule/map/team data, consumed differently by each app:
- **Analyzer** imports the CSVs directly at build time via Vite's `?raw` import, and `teams.json` (each team's ASCII tag, the website's display name, slugs, logo) as JSON. It shows the website's team names and logos from it; team tags and `BR_Data` folders never change.
- **Match Builder** copies them into its `public/` folder at build time and `fetch`es them at runtime.
- **Calculator** reads `characters.csv` (ids, names, order), `transformations.json` (forms, for team pools), `capsules.csv` and `capsule-rules.yaml` in its `build-data` step, plus the website's `public/content/teams/<season>.yaml` master lists. Its `public/data/characters.json` is in turn fetched from production by the Website's Teams page (names must equal referencedata's).
- **Website**/**Match Builder** get `transformations.json` synced in by the deploy workflow (and must be synced manually for local builds — see `referencedata/README.md`). The **Analyzer** imports it directly from the root (forms, the fusion rule, and how transformations are counted: `apps/analyzer/src/utils/transformation.js`, guarded by `verify-transformations` in its prebuild).
- **Edit `transformations.json` only at the root.** The August 2026 DLC entries went into Match Builder's copy instead, and since the deploy copies the root file over it, production lost them until they were merged back on 2026-09-30.

Always edit these files only in `/referencedata/` at the repo root, never in an app's local copy — local copies are generated/synced, not sources of truth. After editing, rebuild the Analyzer and Match Builder to pick up the change locally.

## Data submission pipeline (Submit → Admin)

1. **Submit** app (or the Analyzer's upload UI) posts battle-result JSON files to `vercel-api/api/submit.js`, which validates JSON structure/size/encoding, creates a branch (`submission/<name>-<timestamp>`) off `dev-branch`, commits files under `apps/analyzer/BR_Data/<targetPath>/`, and opens a **draft PR** labeled `data-submission`.
2. **Admin Dashboard** authenticates via GitHub OAuth Device Flow (`vercel-api/api/oauth.js`, `github-device-start.js`, `github-device-token.js`, `admin/auth.js` — gated to users with push access) and lists/reviews these PRs (`admin/submissions.js`, `admin/submission-details.js`).
3. Approving (`admin/approve.js`) merges the PR and deletes the branch; rejecting (`admin/reject.js`) closes it with a reason.
4. On the next deploy, the Analyzer's prebuild scripts (`autoTagMatches.js`, `generate-br-data-structure.js`, `generate-br-data-tags.js`) reprocess `BR_Data/` (organized under `Seasons/`, `Events/`, `Tests/`) into the structure/tags the Analyzer UI reads.

`vercel-api/` is the live API (deployed root per `vercel.json`); the top-level `api/` directory is a stale duplicate — don't add new endpoints there.

## Other CI workflows on `BR_Data`

Beyond `deploy.yml`, three more workflows gate/automate changes under `apps/analyzer/BR_Data/`:
- `.github/workflows/validate-br-pr.yml` — on PRs into `dev-branch`, fails unless the only changed files are `.json` under `BR_Data/`; parses each to confirm valid JSON; labels the PR `valid` or `needs-fix`.
- `.github/workflows/validate-json.yml` — on PRs touching `BR_Data/**/*.json`, runs `scripts/fix-json-encoding.js` and auto-commits/pushes any encoding/formatting fixes straight to the PR branch.
- `.github/workflows/intake-issue-to-pr.yml` — when an issue gets the `intake` label (via the "Submit BR Data" issue template, `.github/ISSUE_TEMPLATE/submit-br.yml`), downloads any `.json` links from the issue body, validates them, and opens a PR against `dev-branch` under `apps/analyzer/BR_Data/intake/` labeled `pending-validation`.

`.github/CODEOWNERS` requires review from `@DragonBallZLeague`/`@Ge0m` for any change under `apps/analyzer/BR_Data/`, `apps/analyzer/**`, or `.github/workflows/*` — expect PRs touching those paths to need admin sign-off regardless of who opens them.

## In-progress work

The Analyzer app is mid-redesign per `docs/ANALYZER_REDESIGN_PLAN.md`, audited and revised 2026-09-25 (splitting the (originally 6,678-line) `App.jsx` into routed pages, real Tailwind, shared design tokens, deep-linkable Character/Team/Match pages, share-snippet export). **Phase 1 (Foundation)** is done: `react-router-dom` is wired in `src/main.jsx` behind a catch-all route, `src/routes.js` defines the target URL scheme (though nothing imports it yet), and the aggregation math has been fully extracted into `src/utils/aggregation/`. **Phase 1.5 (Data layer)** is done: a build-time compact match corpus (`apps/analyzer/scripts/generate-br-aggregates.js` → `public/br-aggregates/`, wired into the analyzer prebuild) replaced the old ~2,232-file / ~67 MB page load with 2 requests / ~101 KB gzipped, verified against the raw data by `npm run verify-aggregates`. **Phase 2a is done** too: real Tailwind v3 now runs in the analyzer, and since 2026-09-30 it is the only stylesheet (the legacy App.css is deleted and preflight is on; the app's look lives in its Tailwind theme, see that app's CLAUDE.md), and shared design tokens live in `packages/ui/src/tokens.js`, consumed by all four Tailwind configs with each app's legacy token names kept as aliases. Canonical accent is `#f97316`. **Phase 2b (App.css teardown)** is done (2026-09-30: App.css deleted, preflight on, the light-mode code gone), and the redesign restyled freely rather than preserving the old look; **Phase 3 is largely done**: the 695-line `filteredAggregatedData` memo became `apps/analyzer/src/utils/aggregation/filterAggregated.js` (covered by `npm run verify-filters`); `src/routes.js` is now load-bearing, with real `<Route>` entries in `main.jsx` and the view derived from the pathname rather than component state (`npm run verify-routes`); and `apps/analyzer/src/pages/CharacterPage.jsx` is the first real page, rendered on a character deep link, with a reusable `<ShareButton>` that copies an absolute link to the current view (`npm run verify-character-page`). Its **Overview tab** follows the design approved on 2026-09-28: ranks against a frozen league reference, fighting styles, and a one-build `?build=` filter. What remains in Phase 3 is the other tabs' design and the share-snippet **image** card. **The app-wide visual direction was decided on 2026-09-28** ("Visual direction" in the plan). It covers a tab row and a one-line scope bar, one level of flat panels, rows instead of cards, phone-first viewing pages, a tier-list view, and character portraits reused from the Calculator's face icons. That is the first cross-app asset dependency, resized at build time. **The page-by-page review was settled the same day** ("Page-by-page review" in the plan). Home becomes a dashboard, the Team page is new, Matches becomes a list instead of a file tree, Meta gains a Builds table, and the Data Tables page goes while its full Excel workbook stays. The analyzer shows the website's team names and logos through a shared team list in `referencedata/`, the second cross-app asset dependency, while team tags and `BR_Data` folders keep their ASCII names. A real-data demo of the shell (`apps/analyzer/design/shell-demo/`, deleted once the real pages were signed off) was reviewed the same day ("Settled on the demo" in the plan). **The shell is now built to it**: section tabs and a sticky multi-select scope bar replaced the old mode/view panels and the file tree, data loads from the scope in the URL, `/characters` is a table with a tier-list view, `/` (Home) leads with the tier list, the Sandbox lives at `/sandbox/...`. Character portraits are committed in `apps/analyzer/public/portraits/` (`npm run build-portraits`). `/meta` followed: its new Builds tab is the league-wide build table (layout A), and every page, old or new, now sits on the shell's one panel colour. Then Phase 4 began with the shared team list (`referencedata/teams.json`, the website's names and logos), the `/teams` table and the new Team page (`/teams/<slug>`: Roster · Lineups · Opponents · Matches), followed by the Matches list (`/matches`) and the Match page (`/matches/<slug>`, a match addressed by its file name as a slug), which replaced the single-match viewer and the file tree and retired MUI from the analyzer. **On 2026-09-29 every remaining table moved onto one template** (`apps/analyzer/src/shell/StatTable.jsx`, with each page's filters as scope-bar chips): the Performances view of `/matches`, the Character page's Usage, Builds, Forms and Matches tabs, and Meta's AI strategies and Capsules tabs. The Data Tables page was removed (`/tables` redirects to `/characters`) once the Excel workbook gained Position, AI Strategies and Capsules sheets. The league wanted the old styling and setup gone entirely by the end of the restyle, and **the restyle closed on 2026-09-30** with that done (the plan's "Restyle closed" section): every table on the one template, the league's last review worked through, App.css and the light-mode code deleted. **The Home page (Phase 5) followed the same day**, reworked after the league's first look: the latest results lead (the newest season week, or the newest test or event uploads, dated from git history, which the deploy workflow now checks out in full, blobless), then six curated top-5 boards that are presets over the Characters table (the three core fighting styles, then the three positions, 5+ matches), then the tier list's top row. Wide tables got a tablet layout at the same time. Next come the next phase's features (share image card, build and character comparison, trends, matchup analysis, an accessibility pass). It settled two rules the league wants: **win % is a team measure**, so for individual characters and builds it goes last and is never a default column; and **a team's figures are its top 5 characters' by score**, since the league breaks in-season ties on the top 5's average damage. The 404 dispatcher that Phase 3 depended on is **done** — sub-app deep links now survive a refresh (see "The site-root 404 fallback" above). The **character URL scheme is settled too**: characters are addressed by name slug (`/analyzer/characters/android-13`, not `/analyzer/characters/0620_00`), with raw ids kept as a permanent alias, enforced by `apps/analyzer/scripts/verify-character-slugs.mjs` in the analyzer prebuild. Check that doc's "Progress" section before starting analyzer redesign work, and keep it updated as phases complete. **Starting the next phase: read its "Handoff for the next phase" first** (where the code is, how work is checked, where each next item starts).

## Website content model

The Website app has no traditional backend/database — all page content (season standings, team rosters, events, rules, archives, community info) lives as YAML under `apps/website/public/content/` (`site.yaml`, `season.yaml`, `archives.yaml`, `community.yaml`, and per-season files under `seasons/`, `teams/`, `events/`, `lineups/`, `rules/`). It can be edited either directly in Git or through the **Decap CMS** admin UI at `/cms/` (`apps/website/cms/`, with `config.yml` in `apps/website/public/cms/`), which authenticates via `vercel-api`'s `/api/oauth` and commits straight to `dev-branch`. Its preview pane renders the real page components, so page components are split into a data-fetching container and a presentational `XView` — see `apps/website/CLAUDE.md` before changing a page's shape. `src/utils/contentLoader.js` fetches and parses the YAML at runtime; pages under `src/pages/` render whatever content the loader returns. Updating standings/rosters/rules is a YAML (or CMS) edit, not a component change — most recent commits to this repo are exactly that (see git log for "Update Team Rosters" / ruleset commits). Full details, including the CMS's field schema and the separate `/schedule-import` static tool, are in `apps/website/CLAUDE.md`.
