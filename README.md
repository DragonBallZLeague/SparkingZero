# SparkingZero — DBZ Sparking Zero League

Monorepo powering the Dragon Ball Sparking Zero League (DBSZL)'s public web infrastructure: the league website plus three community tools for match analysis, match/build creation, and character data lookup.

## Applications

The site is served as a single domain (`dragonballzleague.github.io/SparkingZero/`) made up of several independently-built apps:

| App | Path | Route (production) | Purpose |
|-----|------|---------------------|---------|
| **Website** | `apps/website/` | `/` | Core public site — home, teams, season standings, rules, community, archives. React Router SPA, YAML-driven content (`public/content/*.yaml`). |
| **Analyzer** | `apps/analyzer/` | `/analyzer/` | Battle Result Analyzer — statistics, per-character/per-form breakdowns, capsule synergy and AI-strategy analysis over submitted match data. |
| **Match Builder** | `apps/matchbuilder/` | `/matchbuilder/` | Community tool for building and recording matches (teams, capsules, AI, results) and exporting/importing them as YAML. |
| **Character Calculator** | `apps/calculator/` | `/calculator/` | Public Sparking Zero character data/stat viewer with build (capsule/skill) comparison. |
| **Admin Dashboard** | `apps/admin/` | `/admin/` | GitHub OAuth–gated dashboard for reviewing and approving/rejecting community data-submission pull requests. Push access required. |
| **Submit** | `apps/submit/` | `/submit/` | Standalone static (vanilla JS) page for uploading battle-result JSON files as a PR without needing the full Analyzer or Admin access. |

Supporting infrastructure:

- **`referencedata/`** — Shared source-of-truth CSV/YAML data (characters, capsules, maps, transformations, capsule rules) consumed by Analyzer, Match Builder, and Website at build time.
- **`vercel-api/`** — Deployed Vercel serverless API (GitHub Device Flow OAuth, submission validation, admin approve/reject, BR_Data file listing) backing the Admin and Submit apps. `vercel.json` at the repo root points Vercel at this directory.
- **`api/`** — Older duplicate of some of the functions above; not referenced by the active Vercel deployment. Kept for reference only.
- **`docs/`** — Design docs and implementation notes for admin dashboard, upload pipeline, and data tagging.
- **`GSTest/`**, **`NADFileTesting/`** — Local data-extraction/experimentation scripts, not part of the deployed site.

## Development

This repository uses a `dev-branch` for ongoing development. The `main` branch contains stable releases.

### Getting Started

The root `package.json` defines an npm workspace for **Match Builder, Analyzer, and Calculator** only. **Website** and **Admin** manage their own dependencies separately.

```bash
# Match Builder / Analyzer / Calculator
npm install

# Website
cd apps/website && npm install

# Admin Dashboard
cd apps/admin && npm install
```

### Development Commands

| App | Command | Default port |
|-----|---------|---------------|
| Match Builder | `npm run dev` (repo root) | 5173 |
| Analyzer | `npm run dev:analyzer` (repo root) | 5173 |
| Calculator | `npm run dev:calculator` (repo root) | 5175 |
| Website | `npm run dev` (from `apps/website/`) | 5173 |
| Admin | `npm run dev` (from `apps/admin/`) | 5174 |
| Submit | Static HTML — open `apps/submit/index.html` or serve the folder directly | — |

### Build Commands

```bash
npm run build            # Match Builder
npm run build:analyzer   # Analyzer
npm run build:calculator # Calculator
npm run build:all        # Match Builder + Analyzer + Calculator

# Website and Admin build independently:
cd apps/website && npm run build
cd apps/admin && npm run build
```

## Deployment

All apps are automatically deployed together to GitHub Pages on push to `main` or `dev-branch` via [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). The workflow:

1. Builds Match Builder, Analyzer, Admin, and Calculator into `dist/matchbuilder`, `dist/analyzer`, `dist/admin`, `dist/calculator` respectively.
2. Copies the static Submit app into `dist/submit`.
3. Syncs `referencedata/transformations.json` into the apps that need it at build time.
4. Builds Website last, directly into `dist/` (root), so it owns the top-level route.
5. Copies `dist/index.html` to `dist/404.html` so the Website's client-side routing works on refresh/deep links.
6. Publishes `dist/` to GitHub Pages.

Live URLs:
- Website: https://dragonballzleague.github.io/SparkingZero/
- Analyzer: https://dragonballzleague.github.io/SparkingZero/analyzer/
- Match Builder: https://dragonballzleague.github.io/SparkingZero/matchbuilder/
- Character Calculator: https://dragonballzleague.github.io/SparkingZero/calculator/
- Admin Dashboard: https://dragonballzleague.github.io/SparkingZero/admin/
- Submit: https://dragonballzleague.github.io/SparkingZero/submit/

The Admin Dashboard additionally requires a GitHub OAuth App and push access to the repo — see [docs/ADMIN_DASHBOARD_SETUP.md](docs/ADMIN_DASHBOARD_SETUP.md).

See [DEPLOYMENT.md](DEPLOYMENT.md) for the full workflow breakdown and troubleshooting.

## Documentation

Additional design docs and implementation notes live in [`docs/`](docs/), including admin dashboard setup, the upload/data-submission pipeline, and reference-data tagging plans.
