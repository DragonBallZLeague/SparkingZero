# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Scope

Match Builder (`/matchbuilder/`) — builds/records matches (teams, capsules, AI, results) and exports/imports them as YAML. Part of the root npm workspace (Match Builder/Analyzer/Calculator) — install/build via the root `package.json` scripts. See root `CLAUDE.md` for the deploy pipeline and `referencedata/` sharing rules.

Dev: `npm run dev` (repo root) → `:5173`. Build: `npm run build` (outputs to `../../dist/matchbuilder`).

## Architecture

Small file count, but `src/App.jsx` is a ~3,600-line monolith holding the entire builder UI (team/capsule/AI selection, match config, results entry) — there is no `src/pages/`, `src/hooks/`, or `src/components/` split like the other apps have started adopting. `src/YamlPanel.jsx` is the one extracted piece: a floating modal (`createPortal`-rendered) for inspecting/editing/pasting-in YAML at any level of the match config, used from within `App.jsx` via an `onApply(text)` callback. If you're adding a YAML import/export surface anywhere in this app, reuse `YamlPanel` rather than building another textarea/modal.

Key libraries beyond React: `js-yaml` (YAML parse/stringify for export/import), `@floating-ui/react-dom` (positioning for `YamlPanel` and other popovers), `lucide-react` (icons).

## Reference data

Unlike Analyzer (which imports CSVs via Vite `?raw`), Match Builder's `vite.config.js` has a `copy-shared-referencedata` plugin that copies `characters.csv`, `capsules.csv`, and `capsule-rules.yaml` from `/referencedata/` into this app's `public/` folder at build start; the app then `fetch()`s them at runtime (e.g. `fetch("characters.csv")`) rather than importing them as JS modules. **Edit the source files in `/referencedata/` at the repo root** (see root `CLAUDE.md`) — the copies in this app's `public/` are overwritten every build and shouldn't be hand-edited.

## Gotchas

- `@szl/ui` (aliased in `vite.config.js`) provides the shared `NavBar` — see `packages/ui/CLAUDE.md`.
- No test suite. Validate changes by running `npm run dev` and exercising the match-building flow (build a team, apply a YAML edit via `YamlPanel`, export, re-import) in the browser.
- Because there's effectively one giant component, be deliberate about where you add new state/logic in `App.jsx` — grep for the relevant existing `useState`/handler names first rather than assuming a clean separation of concerns exists.
