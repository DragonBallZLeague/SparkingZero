# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Scope

The core public site (`/`) — home, teams, season standings, events, rules, community, archives. React Router SPA with **no backend of its own**; all page content is YAML/JSON data fetched at runtime. Manages its own `package.json`/`node_modules`, independent of the root npm workspace. See root `CLAUDE.md` for the cross-app deploy pipeline, `referencedata/` sharing rules, and how this fits with the other apps.

Dev: `npm install && npm run dev` (from this directory) → `:5173`. Build: `npm run build`.

## Content model — no CMS in the app itself

There's no database and no component-level content — nearly everything a maintainer would want to edit lives as YAML under `public/content/`:
- `site.yaml` — site name/tagline, nav items, social links, and critically `current_season_file`/`all_seasons` (which season file drives the site's default view).
- `season.yaml`, `seasons/season-N.yaml` — one file per season: kais/divisions, weekly schedule, preseason schedule, playoffs (seedings/rounds).
- `teams/season-N.yaml` — team rosters per season (name, slug, color, roster, benched weeks, restrictions, master list).
- `events/season-N.yaml` — off-shoot events per season (All-Stars, tag tournaments, Boss Rush…). See "Events content model" below.
- `lineups/` — per-match lineup YAML files, referenced by `schedule`/`playoffs` entries in the season files and by event blocks as `lineup_file`.
- `rules/*.yaml` — one file per rules page (how-to-participate, league-wide-rules, legal-potaras, build-rules, ai-descriptions, bench-rules, coaching-rules, testing-rules, off-season-schedule, post-season-seeding, staff-on-team-rules, mods).
- `archives.yaml`, `community.yaml` — archives and community page content.
- `transformations.json` — **not edited here**; synced in from `/referencedata/transformations.json` by the deploy workflow (and must be synced manually for local builds).

`src/utils/contentLoader.js` fetches/parses these at runtime; `src/pages/*.jsx` render whatever the loader returns, driven by `src/contexts/SeasonContext.jsx` for season selection. **Most day-to-day updates (roster changes, schedule results, new rules text) are YAML edits, not component changes** — check `public/content/` before touching a page component. `src/utils/standings.js` derives standings from schedule/kai data rather than reading a precomputed standings file — if standings look wrong, that's the file to check, not the YAML.

## Events content model (`/events`, `/events/:slug`)

`content/events/season-N.yaml` is keyed by the same season filename as `teams/` and `seasons/`, so the season selector on the Events pages works exactly like Teams — switch season, and `/events/boss-rush` shows that season's Boss Rush. `src/hooks/useSeasonEvents.js` loads the events file plus that season's teams file; `EventsPage.jsx` lists events as cards, `EventDetailPage.jsx` renders one event.

Each event is `{ slug, name, tagline, timing, status, date, banner, participants[], blocks[] }`. **`blocks` is an ordered, polymorphic list** — the page is literally the blocks top-to-bottom, so an event's layout is decided in YAML, not in a component. Block `type` → renderer, registered in `BLOCK_RENDERERS` in `EventDetailPage.jsx`:

| type | Purpose | Component |
|---|---|---|
| `markdown` | How-it-works / rules prose | `components/events/InfoBlocks.jsx` |
| `participants` | Grid of the event's `participants` (squads, tag pairs, bosses) | `InfoBlocks.jsx` |
| `single_match` | One battle | `components/events/MatchBlocks.jsx` |
| `series` | Best-of-N; score derived from per-game winners | `MatchBlocks.jsx` |
| `bracket` | Same shape as season `playoffs` → reuses `PlayoffBracket` | `InfoBlocks.jsx` |
| `gauntlet` | Boss-Rush progression table (teams × stages) | `components/events/GauntletBlock.jsx` |

**Name resolution:** every side referenced in a block (`team_a`, `winner`, `opponent`, `runs[].team`, …) is a plain name resolved by `makeResolver` (`components/events/entities.jsx`) — first against the event's `participants`, then against the season's league teams — so league teams get their icon/color/banner automatically and ad-hoc opponents are defined once per event. `winner` must exactly match the side name. A participant's own build (e.g. a boss team) is the `team1` side of its `lineup_file`.

To add a block type: add a component, register it in `BLOCK_RENDERERS`, and add a matching entry under the `events` collection's `blocks.types` in `public/cms/config.yml`.

## Shared match/bracket components

`PlayoffBracket`, `deriveRounds`, `PlayoffListView`, `PlayoffMatchDetailPanel` (`src/components/PlayoffBracket.jsx`) and `LineupPanel`, `CharacterCard`, `parseCapsule` (`src/components/LineupPanel.jsx`) were extracted from `SeasonPage.jsx` and are shared with the Events page. Lazy lineup-file loading state lives in `src/hooks/useLineups.js` and returns the exact prop bag those components expect. `deriveRounds` handles brackets without `seedings` (explicit `team_a`/`team_b` on first-round matches; later rounds auto-fill from winners) as well as the seeded playoff layout.

## `/cms` — Decap CMS admin panel

`public/cms/index.html` + `public/cms/config.yml` serve a full Decap CMS instance at `/cms/`, giving non-technical editors a web UI to edit the YAML content above (teams, seasons, rules, etc.) without touching Git directly. Served via a Vite dev-server middleware (`serveStaticToolsPlugin` in `vite.config.js`) locally, and as a static file in production. It authenticates through the GitHub backend against `vercel-api`'s `/api/oauth` endpoint (`base_url: https://sparking-zero-iota.vercel.app`) and commits directly to `dev-branch`. `config.yml`'s collections are a field-by-field mirror of the YAML schemas above — **if you add/rename a field in a content YAML file's shape, update `config.yml` to match**, or the CMS UI will silently not expose (or will corrupt) that field.

## `/schedule-import` — standalone schedule tool

`public/schedule-import/index.html` is a self-contained static HTML/JS tool (loads `js-yaml` from a CDN, no build step, no framework) for generating/importing schedule YAML, also served via the same dev-server middleware / as a static file in production. It's independent of the React app entirely — edit it as plain HTML/CSS/JS.

## Gotchas

- `assetsInclude: ['**/*.yaml', '**/*.yml']` in `vite.config.js` is required for YAML files to be treated as static assets rather than source — don't remove it.
- `@szl/ui` (aliased in `vite.config.js`) provides the shared `NavBar` — see `packages/ui/CLAUDE.md`. Don't build a second nav component here.
- This app is built **last** in the deploy workflow, directly into `dist/` root with `--emptyOutDir=false`, so it doesn't wipe the other apps' already-built output. If you're testing a local "full site" build, replicate that order (see root `CLAUDE.md`/`DEPLOYMENT.md`) rather than just running `npm run build` here in isolation and expecting the other apps to be present.
