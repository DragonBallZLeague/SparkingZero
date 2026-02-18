# Admin Dashboard Implementation Summary

## What Was Built

A complete administrator dashboard for managing data submissions to the SparkingZero Battle Results Analyzer.

## Components Created

### Frontend (`apps/admin/`)

```
apps/admin/
├── package.json              # Dependencies and scripts
├── vite.config.js           # Vite config with base path /SparkingZero/admin/
├── index.html               # Entry HTML
├── README.md                # App documentation
├── .env.example             # Environment variable template
├── .gitignore              # Git ignore rules
└── src/
    ├── main.jsx            # React entry point
    ├── index.css           # Global styles
    ├── App.jsx             # Main app router with auth guard
    ├── components/
    │   ├── LoginPage.jsx          # GitHub OAuth login page
    │   ├── Dashboard.jsx          # Submissions list with search
    │   └── SubmissionDetail.jsx  # Detailed view with team data
    └── utils/
        ├── api.js          # API client functions
        └── githubAuth.js   # OAuth Device Flow implementation
```

### Backend (`vercel-api/api/admin/`)

```
vercel-api/api/admin/
├── auth.js                 # POST - Verify token & check permissions
├── submissions.js          # GET - List all pending submissions
├── submission-details.js   # GET - Get PR details with team data
├── approve.js             # POST - Merge PR & delete branch
└── reject.js              # POST - Close PR & delete branch
```

## Key Features

### 1. Authentication & Authorization
- GitHub OAuth Device Flow for user login
- Verifies user has **push access** to repository
- Token stored in sessionStorage (cleared on tab close)

### 2. Submissions Dashboard
- Lists all open PRs with `data-submission` label
- Search/filter by submitter, target path, or title
- Shows submission date, file count, and status
- Refresh button to reload submissions

### 3. Submission Detail View
- **Metadata**: Submitter, target path, comments, branch name
- **Files Section**: 
  - Expandable file list
  - **Team Data Display**: Shows team name, event, season (when available)
  - JSON content preview with syntax highlighting
  - Download individual files
- **Actions**:
  - **Approve**: Mark ready, merge PR, delete branch
  - **Reject**: Add comment with reason, close PR, delete branch

### 4. Team Data Extraction
- Parses both standard and TeamBattleResults wrapper formats
- Displays team, event, and season metadata per file
- Visual indicator for files with team data

## Modified Files

### 1. Submit Endpoint Enhancement
**File**: `vercel-api/api/submit.js`
- Added `data-submission` label to all created PRs
- Enables easy filtering for admin dashboard

### 2. GitHub Actions Workflow
**File**: `.github/workflows/deploy.yml`
- Added admin app build steps
- Deploys to `/SparkingZero/admin/` path

### 3. Documentation
**Files**:
- `README.md` - Updated to include admin app
- `docs/ADMIN_DASHBOARD_SETUP.md` - Complete setup guide

## Security Features

1. **Token Validation**: Every API call verifies user token
2. **Permission Check**: Requires push/maintain/admin access
3. **Bot Token**: Separate GitHub token for merge operations
4. **Audit Trail**: All actions logged as PR comments
5. **Session Storage**: Tokens cleared when tab closes

## Configuration Required

### 1. GitHub OAuth App
- Create new OAuth App for admin dashboard
- Enable Device Flow
- Note Client ID

### 2. Vercel Environment Variables
```
GITHUB_TOKEN=<bot-token-with-repo-scope>
OWNER=DragonBallZLeague
REPO=SparkingZero
BASE_BRANCH=dev-branch
```

### 3. Admin App Environment Variable
```
VITE_ADMIN_CLIENT_ID=<oauth-app-client-id>
```

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/admin/auth` | POST | Verify token & permissions |
| `/api/admin/submissions` | GET | List pending submissions |
| `/api/admin/submission-details` | GET | Get PR details & files |
| `/api/admin/approve` | POST | Merge PR & delete branch |
| `/api/admin/reject` | POST | Close PR & delete branch |

## Deployment

Automatic deployment via GitHub Actions:
1. Push to `main` or `dev-branch`
2. Workflow builds admin app
3. Deployed to GitHub Pages at `/SparkingZero/admin/`

## Next Steps

1. **Create GitHub OAuth App**
   - Go to GitHub Settings → Developer settings → OAuth Apps
   - Create new OAuth App with Device Flow enabled
   - Note the Client ID

2. **Configure Vercel**
   - Add `GITHUB_TOKEN` environment variable
   - Verify other variables are set

3. **Set Admin Client ID**
   - Add `VITE_ADMIN_CLIENT_ID` to deployment environment
   - OR update `LoginPage.jsx` directly

4. **Deploy**
   - Push changes to `dev-branch`
   - GitHub Actions will build and deploy
   - Access at: `https://<username>.github.io/SparkingZero/admin/`

5. **Test**
   - Create a test submission via analyzer
   - Login to admin dashboard
   - Verify you can view, approve, or reject

## Benefits

- ✅ Streamlined submission review process
- ✅ No manual PR management needed
- ✅ Team data visibility for better validation
- ✅ Automatic branch cleanup
- ✅ Audit trail of all actions
- ✅ Only accessible to contributors

## Support

See `docs/ADMIN_DASHBOARD_SETUP.md` for detailed setup instructions and troubleshooting.
