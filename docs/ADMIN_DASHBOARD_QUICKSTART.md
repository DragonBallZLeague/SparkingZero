# Admin Dashboard Quick Start

## Prerequisites Checklist

- [ ] GitHub repository with push access
- [ ] Vercel project for API endpoints
- [ ] GitHub account with admin/push rights

## 5-Minute Setup

### Step 1: Create GitHub OAuth App (2 min)

1. Go to: https://github.com/settings/developers
2. Click **OAuth Apps** → **New OAuth App**
3. Fill in:
   - Name: `SparkingZero Admin`
   - Homepage: `https://dragonballzleague.github.io/SparkingZero/admin/`
   - Description: `Admin dashboard`
   - Callback URL: (leave empty, not needed for Device Flow)
4. Click **Register**
5. **Enable Device Flow** in the app settings
6. Copy the **Client ID**

### Step 2: Configure Vercel (1 min)

Add environment variables in your Vercel project:

```bash
GITHUB_TOKEN=ghp_xxxxxxxxxxxx  # Personal Access Token with 'repo' scope
OWNER=DragonBallZLeague
REPO=SparkingZero
BASE_BRANCH=dev-branch
```

To create GITHUB_TOKEN:
- Go to: https://github.com/settings/tokens
- Generate new token (classic)
- Select `repo` scope
- Copy token

### Step 3: Update Admin Client ID (1 min)

**Option A**: Environment Variable (Recommended)
Add to your build environment:
```bash
VITE_ADMIN_CLIENT_ID=<your-oauth-client-id>
```

**Option B**: Direct Update
Edit `apps/admin/src/components/LoginPage.jsx`:
```javascript
const ADMIN_CLIENT_ID = 'your-oauth-client-id-here';
```

### Step 4: Deploy (1 min)

```bash
git add .
git commit -m "Add admin dashboard"
git push origin dev-branch
```

GitHub Actions will automatically build and deploy.

### Step 5: Access & Test

Visit: `https://dragonballzleague.github.io/SparkingZero/admin/`

1. Click "Sign in with GitHub"
2. Enter device code on GitHub
3. You should see the admin dashboard

## Troubleshooting

**"Invalid Client ID"**
- Double-check the Client ID
- Ensure Device Flow is enabled

**"Insufficient Permissions"**
- Verify you have push access to the repository

**"Failed to fetch submissions"**
- Check Vercel environment variables
- Verify GITHUB_TOKEN is valid
- Check Vercel function logs

## Local Development

```bash
cd apps/admin
npm install
npm run dev
```

Access at: http://localhost:5174

## Usage

### View Submissions
- Dashboard shows all pending submissions
- Search by submitter or path
- Click to view details

### Approve Submission
1. Review details and team data
2. Click "Approve & Merge"
3. PR is merged and branch deleted

### Reject Submission
1. Click "Reject"
2. Enter reason
3. PR is closed and branch deleted

## What Gets Labeled?

All submissions created via the analyzer will have the `data-submission` label automatically added.

## Need Help?

Full documentation: [docs/ADMIN_DASHBOARD_SETUP.md](ADMIN_DASHBOARD_SETUP.md)
