# Upload Pipeline Plan (Vercel + GitHub)

## Goals
- Accept user uploads without requiring GitHub accounts.
- Collect required metadata (files, name/username, optional comments, target storage location).
- Present existing BR_Data areas as dropdown choices to avoid path errors.
- Keep admin approval in GitHub (PRs) with audit trail.
- Use Vercel (free tier) for minimal backend, status, and admin UI.

## Submission Form (public)
- Required: one or more JSON files.
- Required: submitter name/username.
- Optional: comments/notes.
- Required: target storage location chosen via dropdowns populated from BR_Data tree (e.g., `Tests / Cinema`).
- Client validates: JSON extension, size <10 MB, all fields present.

## Storage Location Selection
- Backend function lists existing folders under `apps/analyzer/BR_Data` and returns a structured tree.
- Frontend renders dropdowns (e.g., Level 1: Tests, Events, etc.; Level 2: Cinema, Budokai, etc.).
- Submitted path is normalized to `apps/analyzer/BR_Data/<selected_path>/<filename>`.
- If new leaf needed, allow “Other (specify)” with a text field, but still sanitize/slugify.

## Backend Flow (Vercel functions)
1) **List Paths**: `GET /api/paths` reads BR_Data tree via GitHub API (repo contents) and returns folder options.
2) **Submit**: `POST /api/submit`
   - Validate payload (files metadata, name, comments, selected path).
   - Validate filenames + target path, size, JSON extension.
   - Store submission record in Vercel KV: status=pending, metadata, timestamps, selected path.
   - Create a draft PR branch and add files at the chosen path; open PR (draft) to `dev-branch`.
   - Return submission ID + PR URL.
3) **Status**: `GET /api/status?id=...` returns submission status from KV (pending/approved/rejected/failed) and PR link.

## Admin Dashboard (secured)
- Route `/admin` requires GitHub OAuth login.
- After login, server verifies user has access to `DragonBallZLeague/SparkingZero`.
- Shows pending submissions with metadata (name, comments, target path, files, PR link).
- Actions: Approve (merge PR or mark ready), Reject (close PR, mark rejected), Reassign path (optional move in branch before merge).
- All actions logged in KV with actor + timestamp.

## Data Model (Vercel KV)
- Key: `submission:<id>`
- Fields: id, files [{name, size, path}], submitter, comments, target_path, pr_url, branch, status, created_at, updated_at, audit [{who, action, when, note}].

## Validation Rules
- Files: .json only, <=10 MB each (configurable), max N files (configurable).
- Path: must resolve under `apps/analyzer/BR_Data`, no traversal.
- Submitter name: 1–80 chars.
- Comments: optional, max 500 chars.

## Security & Secrets
- GitHub token (repo scope) stored as Vercel secret; never sent to clients.
- Admin auth via GitHub OAuth; client receives only session token.
- CORS: allow analyzer Pages domain; lock down others.
- Rate limit submissions (IP-based) to prevent abuse.

## Deployment
- Vercel project root: `vercel-api/` (functions only, no build).
- Functions: `api/github-device-start.js` (not needed in this model), `api/github-device-token.js` (not needed), new `paths`, `submit`, `status`, `admin` endpoints.
- Analyzer frontend: consume `/api/paths`, `/api/submit`, `/api/status`.

## User Flow Summary
1) User opens analyzer, clicks Submit Data.
2) Frontend fetches paths, renders dropdowns.
3) User selects path, uploads files, enters name, optional comments, submits.
4) Backend validates, creates draft PR, stores record, returns submission ID + PR.
5) User can check status via submission ID.
6) Admin logs into dashboard, reviews pending items, approves/rejects, merges PR to `dev-branch`.

## Next Steps
- Implement `/api/paths` to read BR_Data tree via GitHub Contents API.
- Implement `/api/submit` to validate, store KV record, draft PR.
- Implement `/api/status` for polling.
- Build `/admin` UI with GitHub OAuth + repo access check.
- Update analyzer upload panel to add fields (name, comments) and path dropdowns.
