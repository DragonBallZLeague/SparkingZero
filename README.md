# SparkingZero
DBZ Sparking Zero - A monorepo containing multiple applications

## Applications

This repository contains two applications:

- **Match Builder** (`apps/matchbuilder/`) - Main SZ Match Builder application
- **Analyzer** (`apps/analyzer/`) - Battle Result Analyzer application

## Development

This repository uses a `dev-branch` for ongoing development work. The `main` branch contains stable releases.

### Getting Started

Install dependencies for all workspace apps:
```bash
npm install
```

### Development Commands

**Main Match Builder app:**
```bash
npm run dev              # Start development server
```

**Analyzer app:**
```bash
npm run dev:analyzer     # Start analyzer development server
```

**Build commands:**
```bash
npm run build           # Build main app only
npm run build:analyzer  # Build analyzer app only
npm run build:all       # Build both applications
```

## Deployment

Both applications are automatically deployed to GitHub Pages when changes are pushed to the `main` or `dev-branch` branches.

- Main app: https://dragonballzleague.github.io/SparkingZero/matchbuilder/
- Analyzer app: https://dragonballzleague.github.io/SparkingZero/analyzer/

### Automatic Deployment

The GitHub Actions workflow (`.github/workflows/deploy.yml`) will:
1. Install dependencies for both applications
2. Build both applications using their respective build processes
3. Deploy the combined `dist` folder to GitHub Pages

### Manual Deployment

You can also trigger a deployment manually:
1. Go to the Actions tab in the GitHub repository
2. Select the "Deploy to GitHub Pages" workflow
3. Click "Run workflow" and select the branch to deploy

### Local Build

To build both applications locally:
```bash
npm install
npm run build:all
```

The built files will be in the `dist` directory with the following structure:
```
dist/
├── index.html          # Main app
├── assets/             # Main app assets
└── analyzer/           # Analyzer app
    ├── index.html
    └── assets/
```

### GitHub Pages Configuration

The main application is configured to be served from the `/SparkingZero/` base path (see `apps/matchbuilder/vite.config.js`).
The analyzer application is built to the `/analyzer/` subdirectory.
