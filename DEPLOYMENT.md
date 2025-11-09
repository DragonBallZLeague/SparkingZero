# GitHub Pages Deployment Setup

## Overview

This document explains the GitHub Pages deployment configuration for the SparkingZero monorepo application. The repository now contains multiple apps under the `apps/` directory:
- `apps/matchbuilder` - Main SZ Match Builder application
- `apps/analyzer` - Battle Result Analyzer application

## Project Structure

This is now a monorepo with workspaces configured in the root `package.json`. Each app has its own build configuration while being deployed together to GitHub Pages.

## Configuration Files

### 1. `.github/workflows/deploy.yml`
The GitHub Actions workflow that automates the build and deployment process for both applications.

**Triggers:**
- Push to `main` branch
- Push to `dev-branch` branch  
- Manual trigger via `workflow_dispatch`

**Permissions:**
- `contents: read` - Read repository contents
- `pages: write` - Write to GitHub Pages
- `id-token: write` - Required for GitHub Pages deployment

**Jobs:**
1. **build** - Builds both applications
   - Checks out the code
   - Sets up Node.js 20
   - Installs dependencies for the main app with `npm ci` in `apps/matchbuilder`
   - Builds the main app with output to `../../dist/matchbuilder`
   - Installs dependencies for the analyzer app in `apps/analyzer`
   - Builds the analyzer app with output to `../../dist/analyzer`
   - Uploads the `dist` folder as a Pages artifact

2. **deploy** - Deploys to GitHub Pages
   - Depends on the build job
   - Deploys the artifact to GitHub Pages
   - Sets the deployment URL in the environment

### 2. `apps/matchbuilder/vite.config.js`
Configures the base path for the main application.

```javascript
base: '/SparkingZero/matchbuilder/'
```

This ensures all assets are loaded correctly when the app is served from the `/SparkingZero/matchbuilder/` subdirectory on GitHub Pages.

### 3. Root `package.json`
Contains the workspace configuration and monorepo build scripts.

**Workspaces:**
- `apps/matchbuilder`
- `apps/analyzer`

**Key Scripts:**
- `build` - Builds the main matchbuilder app
- `build:analyzer` - Builds the analyzer app
- `build:all` - Builds both applications
- `dev` - Runs the main app in development mode
- `dev:analyzer` - Runs the analyzer app in development mode
- `predeploy` - Runs before deploy (calls build:all)
- `deploy` - Deploys to gh-pages (for manual deployment)

### 4. `apps/matchbuilder/package.json`
Contains the main app dependencies and build scripts.

**Key Scripts:**
- `build` - Builds the application using Vite
- `dev` - Runs development server
- `preview` - Preview the built app

**Key Dependencies:**
- `vite` - Build tool
- React and related dependencies
- Tailwind CSS and related tools

## GitHub Repository Settings

To complete the deployment setup, ensure the following settings are configured in the GitHub repository:

1. Go to **Settings** > **Pages**
2. Under **Source**, select **GitHub Actions**
3. The site will be published to: `https://dragonballzleague.github.io/SparkingZero/`

## Deployment Process

### Automatic Deployment
1. Push changes to `main` or `dev-branch` branch
2. GitHub Actions workflow automatically triggers
3. Both applications are built
4. Built files are deployed to GitHub Pages
   - Landing page: `https://dragonballzleague.github.io/SparkingZero/`
   - Main app: `https://dragonballzleague.github.io/SparkingZero/matchbuilder/`
   - Analyzer app: `https://dragonballzleague.github.io/SparkingZero/analyzer/`

### Manual Deployment via GitHub UI
1. Go to the **Actions** tab in the repository
2. Select **Deploy to GitHub Pages** workflow
3. Click **Run workflow**
4. Select the branch to deploy from
5. Click **Run workflow** button

### Local Development
To work with the main matchbuilder app:

```bash
npm install  # Install workspace dependencies
npm run dev  # Start main app development server
```

To work with the analyzer app:

```bash
npm run dev:analyzer  # Start analyzer development server
```

### Local Testing
To test the build locally:

```bash
npm install
npm run build:all  # Build both apps
```

You can then serve the `dist` directory to test how both apps will work when deployed.

## Troubleshooting

### Common Issues

**Issue: Assets not loading (404 errors)**
- Verify `base: '/SparkingZero/matchbuilder/'` is set in `apps/matchbuilder/vite.config.js`
- Check that the repository name matches the base path
- For the analyzer app, ensure the build output is correctly set to `../../dist/analyzer`

**Issue: Workflow fails on build**
- Check Node.js version compatibility (now using Node 20)
- Ensure all dependencies are in respective app `package.json` files
- Review build logs in Actions tab
- Verify working directory paths in workflow are correct

**Issue: One app works but the other doesn't**
- Check that both build steps completed successfully
- Verify output directories are correct (`../../dist/matchbuilder` for main app, `../../dist/analyzer` for analyzer)
- Ensure both apps have their dependencies installed separately

**Issue: Pages not updating**
- Check if workflow completed successfully
- Verify GitHub Pages is set to use GitHub Actions
- Clear browser cache

## Files Modified/Created

1. `.github/workflows/deploy.yml` - Updated for monorepo structure
2. `package.json` - Updated to workspace configuration
3. `apps/matchbuilder/` - New location for main app files
4. `DEPLOYMENT.md` - Updated for monorepo documentation

## Repository URLs

- **Repository**: https://github.com/DragonBallZLeague/SparkingZero
- **Landing Page**: https://dragonballzleague.github.io/SparkingZero/
- **Main App**: https://dragonballzleague.github.io/SparkingZero/matchbuilder/
- **Analyzer App**: https://dragonballzleague.github.io/SparkingZero/analyzer/
- **Workflow Runs**: https://github.com/DragonBallZLeague/SparkingZero/actions
