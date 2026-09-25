# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Scope

`@szl/ui` — shared UI reused across Website, Analyzer, Match Builder, and Calculator (**not** Admin, which has no `@szl/ui` alias in its `vite.config.js` and does not use this package). See root `CLAUDE.md` for how this fits into the overall repo.

## How it's consumed

There is no build step. Each consuming app's `vite.config.js` aliases `@szl/ui` straight to `../../packages/ui/src` (source, not a built package), and imports from it like a normal dependency: `import { NavBar } from '@szl/ui'`. Editing a file here takes effect immediately in every consuming app's dev server — no publish/link step, no version bump required. `package.json` here is metadata only (`"main": "src/index.js"`), not something that gets `npm install`ed; it isn't in the root workspace list either.

## Files

- `src/index.js` — the only entry point apps import from (`export { default as NavBar } from './NavBar.jsx'; export { APPS, LOGO_SRC } from './toolLinks.js';`). Add new exports here when adding shared components — don't have apps reach into `NavBar.jsx`/`toolLinks.js` directly.
- `src/NavBar.jsx` + `src/NavBar.css` — the cross-app nav bar, including its mobile hamburger pattern. `docs/ANALYZER_REDESIGN_PLAN.md` explicitly calls this out as the pattern to reuse for any other mobile nav needs rather than inventing a new one.
- `src/toolLinks.js` — hardcoded **absolute** production URLs (`https://dragonballzleague.github.io/SparkingZero/...`) for cross-app navigation (`APPS` list, `LOGO_SRC`). Absolute is intentional: each app is an independently-deployed build under its own GitHub Pages subpath, so a relative link from inside Analyzer can't reach Match Builder. This means the nav bar always links to *production* URLs even when you're running an app's local dev server — there's no dev-mode override.

## Working here

- Because there's no isolated build/test for this package, verify changes by running one of the consuming apps' dev servers (e.g. `npm run dev:analyzer` from the repo root) and checking the nav bar renders correctly, rather than trying to test this package standalone.
- If you add a component intended for cross-app reuse, add it here rather than duplicating it into an individual app's `src/components/` — that duplication is exactly what this package exists to avoid.

## `src/tokens.js` — shared design tokens

Added in the Analyzer redesign's Phase 2a, closing out the old `sz-orange`/`dragon-orange`/`dbz.orange` naming split. Exports `brand`, `surface`, `radius` and `font`. **Canonical accent is `#f97316`.**

- **CommonJS on purpose.** Each app's `tailwind.config.js` loads it directly, and those are a mix of CJS (analyzer, match builder) and ESM (website, calculator); `module.exports` is the form both can consume. Do not convert it to ESM.
- All four apps now source their palette from it, and each keeps its **existing token names as aliases** onto the shared values (`dbz.*`, `sz-*`, `dragon-*`) so no existing markup breaks. New work should prefer the shared `brand.*` names.
- All four `tailwind.config.js` files also scan `../../packages/ui/src/**/*.{js,jsx}`, so Tailwind classes used inside this package are generated. That was previously missing, which is why `NavBar.css` is hand-written plain CSS rather than Tailwind classes.
- Admin and Submit do **not** consume this package, so tokens do not reach them.
