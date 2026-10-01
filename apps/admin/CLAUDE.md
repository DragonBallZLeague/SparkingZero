# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Scope

Admin Dashboard (`/admin/`) — GitHub OAuth–gated dashboard for reviewing and approving/rejecting community BR_Data submission PRs (see root `CLAUDE.md` for the full Submit→Admin pipeline). Requires push access to the repo to actually be usable. Manages its own `package.json`/`node_modules`, independent of the root npm workspace, and does **not** use `@szl/ui` (no alias in `vite.config.js` — this app has no shared nav, unlike Website/Analyzer/Match Builder/Calculator).

Dev: `npm install && npm run dev` (from this directory) → `:5174`. Needs `VITE_ADMIN_CLIENT_ID` (see `.env.example`) for the OAuth client ID. Build: `npm run build`. In dev, `vite.config.js` proxies `/api` to the production Vercel deployment (`https://sparking-zero-iota.vercel.app`) — there's no local API server for this app; you're always hitting the live `vercel-api` backend even in dev, so treat admin actions taken in local dev as real (approving/rejecting a real PR).

## Architecture

Small and already cleanly split — no monolith here:
- `src/App.jsx` — top-level auth state machine + `react-router-dom` routes (`LoginPage` when unauthenticated; `Dashboard`/`SubmissionDetail` when authenticated). Auth token is kept in `sessionStorage` (`gh_admin_token`), not `localStorage` — it's meant to not persist across browser sessions.
- `src/components/LoginPage.jsx` — kicks off GitHub Device Flow login.
- `src/components/Dashboard.jsx` — lists pending `data-submission`-labeled PRs.
- `src/components/SubmissionDetail.jsx` — single-PR review view (approve/reject).
- `src/utils/githubAuth.js` — Device Flow client: `initiateDeviceFlow` → `pollForToken`/`waitForAuthorization`, hitting `vercel-api`'s `/api/github-device-start` and `/api/github-device-token` (proxied in dev via the path above, absolute URL in prod).
- `src/utils/api.js` — thin fetch wrappers for the actual admin actions, all against `vercel-api`'s `/api/admin/*` endpoints: `verifyAuth` (`/admin/auth`), `fetchSubmissions` (`/admin/submissions`), `fetchSubmissionDetails` (`/admin/submission-details?pr=`), `approveSubmission`/`rejectSubmission` (`/admin/approve`, `/admin/reject`). All authenticated calls send `Authorization: Bearer <token>`.

The actual push-access check, PR merge, and branch deletion happen server-side in `vercel-api/api/admin/*.js`, not here — this app is a thin client over that API. See `vercel-api/CLAUDE.md`.

## Gotchas

- No test suite. Validate changes against the real `vercel-api` backend (there's no mock/local backend to fall back on) — be deliberate before clicking Approve/Reject on a real submission while testing UI changes.
- If auth checks or dashboard listings misbehave, the bug is more likely in `vercel-api/api/admin/*.js` (server-side push-access verification, GitHub API calls) than in this app's client code — check there first.
