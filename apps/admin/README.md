# Admin Dashboard

Administrator interface for managing data submissions to the SparkingZero Battle Results Analyzer.

## Features

- GitHub OAuth authentication with contributor verification
- View pending data submissions
- Review submission details and team data
- Approve submissions (auto-merge + delete branch)
- Reject submissions with reason

## Access

Only users with **push access** to the GitHub repository can access this dashboard.

## Setup

See the main repository documentation for OAuth App setup instructions.

## Development

```bash
npm install
npm run dev
```

Visit http://localhost:5174
