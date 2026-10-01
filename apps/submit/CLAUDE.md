# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Scope

Submit (`/submit/`) — standalone static (vanilla JS, no framework, no build step) page for uploading battle-result JSON files as a PR without needing the full Analyzer or Admin access. Accessed via direct link only, not linked from the main site nav. Copied as-is into `dist/submit` by the deploy workflow (see root `CLAUDE.md`) — there's nothing to `npm install`/build here.

Local dev: open `index.html` directly or serve the folder with any static file server (e.g. `npx serve apps/submit`). It talks to the **production** `vercel-api` (`CONFIG.API_BASE_URL` in `js/config.js` is hardcoded to `https://sparking-zero-iota.vercel.app`, no dev-proxy split like Admin has) — there is no local backend option, so testing here always hits the real API and can open real draft PRs.

## Architecture

Plain ES6+ modules loaded by `index.html`, each with one job:
- `js/config.js` — constants: API base URL, `MAX_FILES` (50), `MAX_FILE_SIZE` (10MB), `CATEGORY_MATCH_TYPE` (Tests/Seasons/Events → matchType), `CPU_LEVEL_DIFFICULTY` (11/15/20 → Strong/Super/Ultra), the `TEAMS` list (must be kept in sync with the league's actual team names — currently hardcoded here, not read from `referencedata/` or the website's team YAML), and upload `STAGES`.
- `js/state.js` — app state management.
- `js/validation.js` — client-side input/file validation (mirrors, but does not replace, the server-side validation in `vercel-api/api/submit.js` — both must be kept in sync if validation rules change).
- `js/teamData.js` — optional team-data injection into uploaded files before submission.
- `js/api.js` — calls to the Vercel endpoints (`/api/list-files`, `/api/validate`, `/api/submit`).
- `js/ui.js` — DOM updates/rendering.
- `js/app.js` — wires the above together; the actual application entry point.
- `css/styles.css` — dark-mode styling, hand-rolled (no Tailwind/framework here).

## Gotchas

- The `TEAMS` list in `js/config.js` is a hardcoded duplicate of the league's team roster — if a team is renamed/added/removed, update it here too, or the target-path picker will offer a stale/wrong list. There is currently no single source of truth shared between this list, `referencedata/`, and the website's `public/content/teams/season-N.yaml`.
- Files ultimately land under `apps/analyzer/BR_Data/<targetPath>/` via a PR — see root `CLAUDE.md`'s "Data submission pipeline" section for what happens after submit (validation workflows, admin review).
- No test suite; this is also the one app in the repo with no build step at all, so "testing a change" means reloading the static page and re-running the upload flow by hand.
