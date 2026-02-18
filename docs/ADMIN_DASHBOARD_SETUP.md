# Admin Dashboard Setup Guide

This guide explains how to set up and configure the Admin Dashboard for managing data submissions to the SparkingZero Battle Results Analyzer.

## Overview

The Admin Dashboard is a web application that allows repository contributors with **push access** to:
- View pending data submissions (draft PRs)
- Review submission details and team metadata
- Approve submissions (auto-merge and delete branch)
- Reject submissions with reasons

## Architecture

- **Frontend**: React app deployed to GitHub Pages at `/SparkingZero/admin/`
- **Backend**: Vercel serverless functions at `/api/admin/*`
- **Authentication**: GitHub OAuth Device Flow
- **Authorization**: Verified via GitHub API (requires push access)

## Prerequisites

1. GitHub repository with data submissions
2. Vercel account for hosting API endpoints
3. GitHub account with push access to the repository

## Setup Instructions

### 1. Create GitHub OAuth App for Admin Access

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in the details:
   - **Application name**: SparkingZero Admin Dashboard
   - **Homepage URL**: `https://<your-username>.github.io/SparkingZero/admin/`
   - **Authorization callback URL**: Not used (Device Flow doesn't require callback)
   - **Application description**: Admin dashboard for managing battle result submissions
4. Click "Register application"
5. Note down the **Client ID** (you'll need this later)
6. **Important**: Enable Device Flow for this OAuth App:
   - In the OAuth App settings, scroll down to "Device Flow"
   - Check the box to enable it

### 2. Configure Environment Variables in Vercel

Add the following environment variables to your Vercel project:

```
GITHUB_TOKEN=<your-personal-access-token>
OWNER=DragonBallZLeague
REPO=SparkingZero
BASE_BRANCH=dev-branch
```

**Note about GITHUB_TOKEN:**
- This should be a Personal Access Token (PAT) with `repo` scope
- It's used by the bot to perform merge and delete branch operations
- Create it at: GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
- Required permissions: `repo` (full control of private repositories)

### 3. Configure the Admin App

The admin app needs the GitHub OAuth App Client ID:

**Option A: Environment Variable (Recommended)**

In your deployment environment (Vercel, GitHub Actions, etc.), set:

```
VITE_ADMIN_CLIENT_ID=<your-oauth-app-client-id>
```

**Option B: Update the Code**

Edit `apps/admin/src/components/LoginPage.jsx` and replace the client ID:

```javascript
const ADMIN_CLIENT_ID = 'your-oauth-app-client-id-here';
```

### 4. Deploy the Admin App

The admin app is automatically deployed via GitHub Actions when you push to `main` or `dev-branch`:

```bash
git add .
git commit -m "Add admin dashboard"
git push origin dev-branch
```

The workflow will:
1. Build the admin app
2. Deploy to GitHub Pages at `/SparkingZero/admin/`

### 5. Access the Admin Dashboard

Once deployed, access the dashboard at:

```
https://<your-username>.github.io/SparkingZero/admin/
```

## Usage

### Login

1. Visit the admin dashboard URL
2. Click "Sign in with GitHub"
3. A new tab will open with a device code
4. Enter the code on GitHub to authorize
5. Return to the admin dashboard
6. If you have push access, you'll be logged in

### View Submissions

- The dashboard lists all open PRs with the `data-submission` label
- Use the search box to filter by submitter name, target path, or PR title
- Click "Refresh" to reload the list

### Review Submission Details

1. Click on a submission row or the eye icon
2. View submission metadata (submitter, target path, comments)
3. Expand files to see:
   - Team data (team name, event, season)
   - JSON content preview
   - Download option for each file

### Approve a Submission

1. Review the submission details
2. Click "Approve & Merge"
3. Confirm the action
4. The system will:
   - Mark the PR as ready (remove draft status)
   - Add an approval comment
   - Merge the PR using squash merge
   - Delete the submission branch

### Reject a Submission

1. Review the submission details
2. Click "Reject"
3. Enter a reason for rejection
4. Confirm the action
5. The system will:
   - Add a rejection comment with your reason
   - Close the PR
   - Delete the submission branch

## API Endpoints

The admin dashboard uses these Vercel serverless functions:

- `POST /api/admin/auth` - Verify GitHub token and check permissions
- `GET /api/admin/submissions` - List all pending submissions
- `GET /api/admin/submission-details?pr=<number>` - Get PR details and files
- `POST /api/admin/approve` - Approve and merge submission
- `POST /api/admin/reject` - Reject and close submission

## Security

- **Authentication**: User tokens are stored in sessionStorage (cleared on tab close)
- **Authorization**: Every API call verifies the user has push access
- **Bot Token**: Stored securely in Vercel environment variables
- **Audit Trail**: All actions are logged as PR comments

## Permissions Required

Users must have one of the following repository permissions:
- **push** - Can push to the repository
- **maintain** - Can manage the repository
- **admin** - Full administrative access

Read-only collaborators cannot access the admin dashboard.

## Troubleshooting

### "Invalid token" error
- Your GitHub token may have expired
- Log out and log in again

### "Insufficient permissions" error
- You don't have push access to the repository
- Contact a repository admin

### "Failed to fetch submissions" error
- Check that the Vercel API is deployed
- Verify the `GITHUB_TOKEN` environment variable is set
- Check Vercel function logs for errors

### OAuth App not working
- Ensure Device Flow is enabled in the OAuth App settings
- Verify the Client ID is correct

### Build fails in GitHub Actions
- Check the workflow logs
- Ensure `apps/admin/package.json` exists
- Dependencies may need to be installed

## Local Development

To run the admin dashboard locally:

```bash
cd apps/admin
npm install
npm run dev
```

The app will be available at `http://localhost:5174`

**Note**: The OAuth callback will still redirect to the production URL. For local testing, you may need to manually handle the device code flow.

## Maintenance

### Updating Dependencies

```bash
cd apps/admin
npm update
npm audit fix
```

### Adding New Features

The admin app structure:
- `src/App.jsx` - Main router and auth logic
- `src/components/` - UI components
- `src/utils/` - API and auth utilities
- `vercel-api/api/admin/` - Backend endpoints

## Support

For issues or questions, contact the repository administrators.
