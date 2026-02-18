# SparkingZero
DBZ Sparking Zero - A monorepo containing multiple applications

## Applications

This repository contains three applications:

- **Match Builder** (`apps/matchbuilder/`) - Main SZ Match Builder application
- **Analyzer** (`apps/analyzer/`) - Battle Result Analyzer application
- **Admin Dashboard** (`apps/admin/`) - Administrator dashboard for managing data submissions

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

**Admin Dashboard:**
```bash
cd apps/admin
npm install
npm run dev             # Start admin dashboard on port 5174
```

**Build commands:**
```bash
All three applications are automatically deployed to GitHub Pages when changes are pushed to the `main` or `dev-branch` branches.

- Main app: https://dragonballzleague.github.io/SparkingZero/matchbuilder/
- Analyzer app: https://dragonballzleague.github.io/SparkingZero/analyzer/
- Admin Dashboard: https://dragonballzleague.github.io/SparkingZero/admin/

**Note:** The Admin Dashboard requires GitHub OAuth authentication and push access to the repository. See [docs/ADMIN_DASHBOARD_SETUP.md](docs/ADMIN_DASHBOARD_SETUP.md) for setup instructions.

## Deployment

Both applications are automatically deployed to GitHub Pages when changes are pushed to the `main` or `dev-branch` branches.

- Main app: https://dragonballzleague.github.io/SparkingZero/matchbuilder/
- Analyzer app: https://dragonballzleague.github.io/SparkingZero/analyzer/

### Automatic Deploymentall applications
2. Build all
The GitHub Actions workflow (`.github/workflows/deploy.yml`) will:
1. Install dependencies for both applications
2. Build both applications using their respective build processes
3. Deploy the combined `dist` folder to GitHub Pages

### Manual Deployment

You can also trigger a deployment manually:
1. Go to the Actions tab in the GitHub repository
2. Select the "Deploy to GitHub Pages" workflow
3. Click "Run workflow" and select the branch to deploy
all applications locally:
```bash
npm install
npm run build:all
```

The built files will be in the `dist` directory with the following structure:
```
dist/
├── matchbuilder/       # Main app
│   ├── index.html
│   └── assets/
├── analyzer/           # Analyzer app
│   ├── index.html
│   └── assets/
└── admin/              # Admin dashboard
├── index.html          # Main app
├── assets/             # Main app assets
└── analyzer/           # Analyzer appmatchbuilder/` base path.
The analyzer application is served from `/SparkingZero/analyzer/`.
The admin dashboard is served from `/SparkingZero/admin/`.

See each app's `vite.config.js` for base path configuration.

## Admin Dashboard

The Admin Dashboard allows repository contributors with push access to manage data submissions. Features include:

- View pending data submissions (draft PRs with `data-submission` label)
- Review submission details with team metadata
- Approve submissions (auto-merge and delete branch)
- Reject submissions with reasons

For setup instructions, see [docs/ADMIN_DASHBOARD_SETUP.md](docs/ADMIN_DASHBOARD_SETUP.md)
    └── assets/
```

### GitHub Pages Configuration

The main application is configured to be served from the `/SparkingZero/` base path (see `apps/matchbuilder/vite.config.js`).
The analyzer application is built to the `/analyzer/` subdirectory.
