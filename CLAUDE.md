# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository overview

Monorepo powering the Dragon Ball Sparking Zero League (DBSZL)'s public web infrastructure. All apps are served from a single domain (`dragonballzleague.github.io/SparkingZero/`) as independently-built sub-apps under one path each. There is no test suite or lint script configured anywhere in the repo — don't invent `npm test`/`npm run lint` commands.

Each app/package below has its **own `CLAUDE.md`** with app-specific architecture, gotchas, and conventions — read it before working inside that directory. This root file covers only cross-cutting concerns: the overall map, shared infra, the deploy pipeline, and how the apps connect to each other and to shared data.

| App | Path | Route | Purpose | Details |
|-----|------|-------|---------|---------|
| Website | `apps/website/` | `/` | Public site — home, teams, standings, events (season-scoped off-shoot competitions), rules, community, archives. React Router SPA, content driven by YAML files in `public/content/`. Its Vite build has a second entry for the `/cms` Decap CMS admin panel, whose preview pane renders the site's own page components; it also serves the standalone `/schedule-import` tool. | `apps/website/CLAUDE.md` |
| Analyzer | `apps/analyzer/` | `/analyzer/` | Battle Result Analyzer — stats, per-character/per-form breakdowns, capsule synergy, AI-strategy analysis over submitted match JSON data (`BR_Data/`). Mid-redesign, see "In-progress work" below. | `apps/analyzer/CLAUDE.md` |
| Match Builder | `apps/matchbuilder/` | `/matchbuilder/` | Builds/records matches (teams, capsules, AI, results); exports/imports as YAML. | `apps/matchbuilder/CLAUDE.md` |
| Character Calculator | `apps/calculator/` | `/calculator/` | Character data/stat viewer with capsule/skill build comparison. **Has its own independent dataset, does not consume `/referencedata/`** — see that app's CLAUDE.md. | `apps/calculator/CLAUDE.md` |
| Admin Dashboard | `apps/admin/` | `/admin/` | GitHub OAuth–gated dashboard to review/approve/reject community data-submission PRs. Requires push access to the repo. | `apps/admin/CLAUDE.md` |
| Submit | `apps/submit/` | `/submit/` | Standalone static (vanilla JS) page for uploading battle-result JSON as a PR without needing the full Analyzer or Admin access. | `apps/submit/CLAUDE.md` |

Supporting infra:
- `referencedata/` — shared source-of-truth CSV/YAML (characters, capsules, maps, transformations, capsule rules), consumed by Analyzer, Match Builder, and Website at build time — **not** by Calculator, which keeps its own dataset (see `apps/calculator/CLAUDE.md`). **Only edit data here**, then rebuild the consuming apps — see "Shared reference data" below.
- `packages/ui/` (`@szl/ui`) — shared, no-build-step UI (nav bar, cross-app link constants) consumed via Vite alias by Website, Analyzer, Match Builder, and Calculator — **not** Admin. See `packages/ui/CLAUDE.md`.
- `vercel-api/` — the deployed Vercel serverless API (GitHub OAuth, submission validation, admin approve/reject, BR_Data file listing, Decap CMS auth) backing Admin, Submit, and Website's `/cms`. `vercel.json` at repo root points Vercel at this directory. See `vercel-api/CLAUDE.md`.
- `api/` — older duplicate of some `vercel-api` functions; **not** referenced by the active deployment. Reference only, don't extend it.
- `docs/` — design docs/implementation notes for the admin dashboard, upload pipeline, and reference-data tagging.
- `GSTest/`, `NADFileTesting/` — local data-extraction/experimentation scripts, not part of the deployed site.

## Development commands

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
npm run build:analyzer    # Analyzer (prebuild also runs autoTagMatches.js, generate-br-data-structure.js, generate-br-data-tags.js, generate-br-aggregates.js over BR_Data)
npm run build:calculator  # Calculator
npm run build:all         # Match Builder + Analyzer + Calculator
(cd apps/website && npm run build)
(cd apps/admin && npm run build)
```

Since Match Builder/Analyzer/Calculator share one npm workspace root, always run their dev/build scripts via the root `package.json` scripts (`npm run dev:analyzer`, etc.) rather than `cd`-ing into the app and running `npm run dev` directly, unless intentionally testing that app's own script in isolation.

There's no single-test-runner command to give — there are no automated tests in this repo. Validate changes by running the relevant app's dev server and exercising the feature in the browser.

## Deployment

All apps deploy together to GitHub Pages via `.github/workflows/deploy.yml` on push to `main` or `dev-branch` (or manual `workflow_dispatch`). Order matters: Match Builder → Analyzer (after `scripts/fix-json-encoding.js` runs on `BR_Data`) → Admin → Calculator → Submit (copied as static files) → sync `referencedata/transformations.json` into Website/Match Builder → Website built last, directly into `dist/` root with `--emptyOutDir=false` so it doesn't wipe the other apps' output → `dist/index.html` copied to `dist/404.html` for SPA client-side routing on refresh.

Each app's `vite.config.js` sets its own `base` to match its GitHub Pages subpath (`/SparkingZero/<app>/`, or `/SparkingZero/` for Website). Admin's base is passed at build time (`--base=/SparkingZero/admin/`) rather than set in its config. If assets 404 in production, check that base path first. Full troubleshooting steps are in `DEPLOYMENT.md`.

## Shared reference data (`referencedata/`)

`characters.csv`, `capsules.csv`, `maps.csv`, `capsule-rules.yaml`, and `transformations.json` are the single source of truth for character/capsule/map data, consumed differently by each app:
- **Analyzer** imports the CSVs directly at build time via Vite's `?raw` import.
- **Match Builder** copies them into its `public/` folder at build time and `fetch`es them at runtime.
- **Website**/**Match Builder** get `transformations.json` synced in by the deploy workflow (and must be synced manually for local builds — see `referencedata/README.md`).

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

The Analyzer app is mid-redesign per `docs/ANALYZER_REDESIGN_PLAN.md`, audited and revised 2026-09-25 (splitting the 6,678-line `App.jsx` into routed pages, real Tailwind, shared design tokens, deep-linkable Character/Team/Match pages, share-snippet export). **Phase 1 (Foundation)** is done: `react-router-dom` is wired in `src/main.jsx` behind a catch-all route, `src/routes.js` defines the target URL scheme (though nothing imports it yet), and the aggregation math has been fully extracted into `src/utils/aggregation/`. **Phase 1.5 (Data layer)** is done: a build-time compact match corpus (`apps/analyzer/scripts/generate-br-aggregates.js` → `public/br-aggregates/`, wired into the analyzer prebuild) replaced the old ~2,232-file / ~67 MB page load with 2 requests / ~101 KB gzipped, verified against the raw data by `npm run verify-aggregates`. **Phase 2a (real Tailwind + shared tokens) is next.** Two cross-cutting items from that plan touch this file's concerns: the deploy workflow's `cp dist/index.html dist/404.html` means **analyzer deep links 404 into the website SPA** and needs a smart dispatcher, and the shared design tokens (canonical accent `#f97316`) are planned to live in `packages/ui`. Check that doc's "Progress" section before starting analyzer redesign work, and keep it updated as phases complete.

## Website content model

The Website app has no traditional backend/database — all page content (season standings, team rosters, events, rules, archives, community info) lives as YAML under `apps/website/public/content/` (`site.yaml`, `season.yaml`, `archives.yaml`, `community.yaml`, and per-season files under `seasons/`, `teams/`, `events/`, `lineups/`, `rules/`). It can be edited either directly in Git or through the **Decap CMS** admin UI at `/cms/` (`apps/website/cms/`, with `config.yml` in `apps/website/public/cms/`), which authenticates via `vercel-api`'s `/api/oauth` and commits straight to `dev-branch`. Its preview pane renders the real page components, so page components are split into a data-fetching container and a presentational `XView` — see `apps/website/CLAUDE.md` before changing a page's shape. `src/utils/contentLoader.js` fetches and parses the YAML at runtime; pages under `src/pages/` render whatever content the loader returns. Updating standings/rosters/rules is a YAML (or CMS) edit, not a component change — most recent commits to this repo are exactly that (see git log for "Update Team Rosters" / ruleset commits). Full details, including the CMS's field schema and the separate `/schedule-import` static tool, are in `apps/website/CLAUDE.md`.
