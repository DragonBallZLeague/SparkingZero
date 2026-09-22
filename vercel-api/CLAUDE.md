# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Scope

The live serverless API (deployed to Vercel as project `sparking-zero-api`, currently at `https://sparking-zero-iota.vercel.app`) backing Admin, Submit, and Website's `/cms` Decap CMS. Root `vercel.json` points Vercel's build at this directory (`rootDirectory: "vercel-api"`); this directory's own `vercel.json` maps each route explicitly (`/api/<name>` → `api/<name>.js`) — **adding a new endpoint file is not enough, you must also add its route here**, or it 404s in production.

There's no local dev server for this API — every app that calls it either proxies to the live deployment in dev (Admin) or hits it directly with a hardcoded absolute URL (Submit, and prod builds of Admin/CMS). Deploying a change means pushing to whatever branch/remote Vercel is watching for this project — there is no separate build step (`vercel.json`'s `installCommand`/`buildCommand` are both no-ops).

The **top-level `api/` directory at the repo root is a stale duplicate** of a few of these functions and is not wired to any deployment — don't edit it, don't add new functions there.

## Environment variables

Set in the Vercel project (not in this repo — only `.env.example` is committed):
- `GITHUB_TOKEN` — a bot PAT with `repo` scope, used server-side to create branches/commits/PRs (`submit.js`) and to merge/close/label PRs (`admin/approve.js`, `admin/reject.js`). This is a single shared bot identity, not the calling user's own token.
- `OWNER` (default `DragonBallZLeague`), `REPO` (default `SparkingZero`), `BASE_BRANCH` (default `dev-branch`).
- `CMS_GITHUB_CLIENT_ID` / `CMS_GITHUB_CLIENT_SECRET` — a **separate** GitHub OAuth App (confidential, standard authorization-code flow) used only by `oauth.js` for Decap CMS login at `/cms/`. This is distinct from the Admin dashboard's own OAuth App (Device Flow, public client, `VITE_ADMIN_CLIENT_ID` set in `apps/admin`) — two different registered GitHub OAuth Apps serve two different clients. Don't conflate them when debugging an auth failure; check which flow (Device Flow vs. code exchange) the failing client actually uses first.

## Endpoints

**Submission pipeline** (see root `CLAUDE.md` for the end-to-end flow):
- `submit.js` — validates uploaded files (JSON syntax, encoding/BOM detection, size/count limits, filename pattern), checks for duplicate filenames already in the target `BR_Data` folder, then creates a branch (`submission/<name>-<timestamp>`), commits each file via the GitHub Contents API, and opens a **draft** PR labeled `data-submission` against `BASE_BRANCH`.
- `validate.js` — standalone validation-only endpoint (used by Submit's pre-flight check before actually submitting).
- `list-files.js` — lists existing files in a `BR_Data` subfolder (used for duplicate-checking client-side and for the folder picker).
- `info.js` — misc metadata endpoint.

**GitHub auth**:
- `github-device-start.js` / `github-device-token.js` — GitHub Device Flow proxy (start + poll) for the Admin dashboard's login (see `apps/admin/CLAUDE.md`).
- `oauth.js` — standard OAuth code-exchange proxy for Decap CMS (`GET` with no `code` → redirect to GitHub authorize; `GET` with `?code=` → exchange for a token and post it back to the CMS popup window). Uses `CMS_GITHUB_CLIENT_ID`/`SECRET`, not `GITHUB_TOKEN`.

**Admin** (`api/admin/`, all require push-access verification):
- `auth.js` — takes a user's own GitHub token, calls `/user` then `/repos/{owner}/{repo}` to read `permissions.push`/`.admin`/`.maintain` on that token, and returns `authorized: true/false` plus the user's permission level. This is the gate every other admin endpoint's client (the Admin dashboard) relies on having already passed — but note each admin endpoint does **not** itself re-verify permissions from the bearer token beyond this initial check; they trust the caller already went through `auth.js`.
- `submissions.js` — lists open `data-submission`-labeled PRs.
- `submission-details.js` — fetches one PR's file diff/details by PR number.
- `approve.js` — marks the PR ready for review via a GraphQL `markPullRequestReadyForReview` mutation (drafts can't be merged directly), then merges and deletes the branch, using the shared `GITHUB_TOKEN` bot identity (not the admin's own token) for the actual merge.
- `reject.js` — closes the PR with a comment reason and deletes the branch.

## Gotchas

- Every handler hand-rolls its own `cors()` header function and manual `OPTIONS` short-circuit at the top — copy that pattern exactly when adding a new endpoint (there's no shared middleware).
- Request bodies are read defensively (`typeof body === 'string' ? JSON.parse(...) : body`) because Vercel doesn't always pre-parse JSON bodies depending on `Content-Type` — keep that pattern in new endpoints rather than assuming `req.body` is already an object.
- No test suite for this API. The only real way to validate a change is deploying to a Vercel preview (or the actual project) and hitting it from the real client (Submit page / Admin dashboard / CMS) — there's no local emulation set up in this repo.
