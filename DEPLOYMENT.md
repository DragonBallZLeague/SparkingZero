# GitHub Pages Deployment Setup

## Overview

This document explains the GitHub Pages deployment configuration for the SparkingZero monorepo. The repository contains multiple apps under `apps/`, all published together to one GitHub Pages site:

- `apps/website` — Core public site, built to the site **root** (`/`)
- `apps/analyzer` — Battle Result Analyzer (`/analyzer/`)
- `apps/matchbuilder` — Match Builder (`/matchbuilder/`)
- `apps/calculator` — Character Calculator (`/calculator/`)
- `apps/admin` — Admin Dashboard (`/admin/`)
- `apps/submit` — Static submission page, copied as-is (`/submit/`)

## Project Structure

Match Builder, Analyzer, and Calculator are npm workspaces defined in the root `package.json`. Website and Admin have their own independent `package.json`/`node_modules` and are installed/built separately in the workflow.

## Configuration Files

### 1. `.github/workflows/deploy.yml`
The GitHub Actions workflow that builds every app and deploys them together to GitHub Pages.

**Triggers:**
- Push to `main` branch
- Push to `dev-branch` branch
- Manual trigger via `workflow_dispatch`

**Permissions:**
- `contents: read` - Read repository contents
- `pages: write` - Write to GitHub Pages
- `id-token: write` - Required for GitHub Pages deployment

**Build job steps (in order):**
1. Checkout + set up Node 20
2. Install deps and build **Match Builder** → `dist/matchbuilder`
3. Install deps for **Analyzer**, run `scripts/fix-json-encoding.js` on `BR_Data`, build → `dist/analyzer`
4. Install deps and build **Admin** (with `VITE_ADMIN_CLIENT_ID` secret, base `/SparkingZero/admin/`) → `dist/admin`
5. Install deps and build **Calculator** → `dist/calculator`
6. Copy the static **Submit** app as-is → `dist/submit`
7. Sync `referencedata/transformations.json` into `apps/website/public/content/` and `apps/matchbuilder/public/`
8. Install deps and build **Website** directly into `dist/` (root, `--emptyOutDir=false` so earlier app builds aren't wiped)
9. Copy `dist/index.html` → `dist/404.html` so the Website's client-side (React Router) routes survive a hard refresh
10. Upload `dist/` as the Pages artifact

**deploy job:**
- Depends on `build`
- Deploys the uploaded artifact to GitHub Pages

### 2. Per-app `vite.config.js` `base` paths
Each tool app sets its own `base` so assets resolve correctly under its subpath:

- `apps/matchbuilder/vite.config.js` → `base: '/SparkingZero/matchbuilder/'`
- `apps/analyzer/vite.config.js` → `base: '/SparkingZero/analyzer/'`
- `apps/calculator/vite.config.js` → `base: '/SparkingZero/calculator/'`
- `apps/admin` → base is passed at build time via `--base=/SparkingZero/admin/` in the workflow
- `apps/website/vite.config.js` → `base: '/SparkingZero/'` (site root)

### 3. Root `package.json`
Contains the workspace configuration (Match Builder, Analyzer, Calculator) and monorepo build scripts.

**Key Scripts:**
- `build` - Builds Match Builder
- `build:analyzer` - Builds Analyzer
- `build:calculator` - Builds Calculator
- `build:all` - Builds Match Builder + Analyzer + Calculator
- `dev` / `dev:analyzer` / `dev:calculator` - Run each app's dev server
- `predeploy` / `deploy` - Manual `gh-pages` publish helper (CI uses the Actions workflow above, not this script)

Website and Admin are **not** part of this workspace — build/dev them from within `apps/website/` and `apps/admin/` respectively.

## GitHub Repository Settings

To complete the deployment setup, ensure the following settings are configured in the GitHub repository:

1. Go to **Settings** > **Pages**
2. Under **Source**, select **GitHub Actions**
3. The site will be published to: `https://dragonballzleague.github.io/SparkingZero/`

## Deployment Process

### Automatic Deployment
1. Push changes to `main` or `dev-branch` branch
2. GitHub Actions workflow automatically triggers
3. All apps are built as described above
4. Built files are deployed to GitHub Pages:
   - Website (root): `https://dragonballzleague.github.io/SparkingZero/`
   - Analyzer: `https://dragonballzleague.github.io/SparkingZero/analyzer/`
   - Match Builder: `https://dragonballzleague.github.io/SparkingZero/matchbuilder/`
   - Character Calculator: `https://dragonballzleague.github.io/SparkingZero/calculator/`
   - Admin Dashboard: `https://dragonballzleague.github.io/SparkingZero/admin/`
   - Submit: `https://dragonballzleague.github.io/SparkingZero/submit/`

### Manual Deployment via GitHub UI
1. Go to the **Actions** tab in the repository
2. Select **Deploy to GitHub Pages** workflow
3. Click **Run workflow**
4. Select the branch to deploy from
5. Click **Run workflow** button

### Local Development

```bash
npm install              # Match Builder / Analyzer / Calculator workspace deps
npm run dev               # Match Builder dev server
npm run dev:analyzer       # Analyzer dev server
npm run dev:calculator     # Calculator dev server
```

```bash
cd apps/website && npm install && npm run dev   # Website dev server
cd apps/admin && npm install && npm run dev      # Admin dev server (needs VITE_ADMIN_CLIENT_ID, see .env.example)
```

### Local Build Testing

```bash
npm install
npm run build:all        # Match Builder + Analyzer + Calculator into dist/
cd apps/website && npm run build -- --outDir=../../dist --emptyOutDir=false
cd apps/admin && npm run build -- --outDir=../../dist/admin --base=/SparkingZero/admin/
mkdir -p dist/submit && cp -r apps/submit/* dist/submit/
```

You can then serve the `dist` directory to test how all the apps behave together when deployed.

## Troubleshooting

### Common Issues

**Issue: Assets not loading (404 errors)**
- Verify the affected app's `base` matches its `dist/<app>` subfolder (see the `vite.config.js` list above)
- Check that the repository name (`SparkingZero`) matches the base path prefix
- For Analyzer, ensure the build output is correctly set to `../../dist/analyzer`

**Issue: Workflow fails on build**
- Check Node.js version compatibility (workflow uses Node 20)
- Ensure all dependencies are declared in the relevant app's `package.json`
- Review build logs in the Actions tab
- Verify `working-directory` paths in the workflow are correct for the step that failed

**Issue: One app works but another doesn't**
- Check that every build step in `deploy.yml` completed successfully
- Verify each `--outDir` matches the URL/table above
- Ensure each app's dependencies were installed in its own step (they are not shared, except the Match Builder/Analyzer/Calculator workspace)

**Issue: Website routes 404 on refresh (e.g. `/teams`)**
- Confirm the "Create 404.html for SPA client-side routing" step ran and `dist/404.html` exists
- GitHub Pages serves `404.html` for any unmatched path, which lets the Website's React Router take over

**Issue: Admin Dashboard fails to authenticate**
- Confirm the `VITE_ADMIN_CLIENT_ID` repository secret is set
- See [docs/ADMIN_DASHBOARD_SETUP.md](docs/ADMIN_DASHBOARD_SETUP.md) for GitHub OAuth App setup

**Issue: Pages not updating**
- Check if workflow completed successfully
- Verify GitHub Pages is set to use GitHub Actions
- Clear browser cache

## Repository URLs

- **Repository**: https://github.com/DragonBallZLeague/SparkingZero
- **Website (root)**: https://dragonballzleague.github.io/SparkingZero/
- **Analyzer**: https://dragonballzleague.github.io/SparkingZero/analyzer/
- **Match Builder**: https://dragonballzleague.github.io/SparkingZero/matchbuilder/
- **Character Calculator**: https://dragonballzleague.github.io/SparkingZero/calculator/
- **Admin Dashboard**: https://dragonballzleague.github.io/SparkingZero/admin/
- **Submit**: https://dragonballzleague.github.io/SparkingZero/submit/
- **Workflow Runs**: https://github.com/DragonBallZLeague/SparkingZero/actions

