# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Scope

Character Calculator (`/calculator/`) — public Sparking Zero character data/stat viewer with capsule/skill build comparison. Part of the root npm workspace (Match Builder/Analyzer/Calculator) — install/build via the root `package.json` scripts.

Dev: `npm run dev:calculator` (repo root) → `:5175`. Build: `npm run build:calculator`.

## Data pipeline (read `data/README.md` first)

`public/data/*.json` is **generated** — never edit it by hand. `scripts/build-data.mjs` builds it from:
- `data/snapshots/` — committed CSV copies of two spreadsheets: the raw game map (`charmap/`, game facts and raw inputs) and Capsule Corp's Stats tab (`capsulecorp/`, finals). Refreshed by hand with `npm run data:pull` (the only networked step; it refuses a changed column layout unless `--accept-layout`).
- `data/curated/*.csv` — hand-maintained tables (measured blast damage, skill display traits, class labels, aliases, overrides, Sparking armor).
- `referencedata/` (characters, forms, capsules, rulesets) and the website's `public/content/teams/<season>.yaml` master lists. **The calculator now joins the shared reference data by id**; names and order come from `referencedata/characters.csv`.

`predev` runs `build-data`; `prebuild` runs `build-data` then `scripts/verify-data.mjs` (ok/FAIL/WARN, exit 1 on FAIL). Both are offline and deterministic. Every build also regenerates `data/REPORT.md` (coverage, source disagreements, blast calibration) and `data/CHANGES.md` (old → new per field). Read both diffs after any data change.

`data/config.json` `output` controls what is published: `roster` (`legacy` = the 208 characters the old app had, `all` = every referencedata character) and `v2` (schema-2 files, described in `data/README.md`; `false` wrote the old shapes directly).

`src/data/loadData.js` fetches `meta.json` (no-cache) and the rest with `?v=<dataVersion>`. `src/data/adapter.js` `toLegacy()` turns schema-2 data into the shapes the components were written against (flat character objects keyed by name, `blast` keyed by name, skills as a numbered list). It has no imports so the build and the browser share it. Skill "levels" (`meleeBuff` etc.) are an interim projection of the game's exact coefficients (level = coefficient / 0.05).

Gotchas:
- **Damage coefficients add** (DP scale + class + capsules + skills), they do not multiply. `final = ceil(Power x 1.25 x coefficient)`.
- **Capsule Corp's class labels are not always the game's class** (Vegeta forms, Baby Vegeta, Fused Zamasu Half-Corrupted); the build rescales those channels from evidence and lists them in REPORT.md. Game class keys map to labels in `data/curated/classes.csv`.
- **Old share links carry display names.** `src/utils/shareLink.js` resolves names exact → `aliases` → normalised; renamed characters need a row in `data/curated/aliases.csv`. The website's Teams page builds name-based links too (see below).
- **The website reads production `calculator/data/characters.json`**: it must stay a top-level array of objects with `name`, in referencedata order. Its form dropdown walks `transformations.json` by name (`apps/website/src/utils/formChain.js`, imported by `verify-data` so the check runs the shipped code).
- `public/char_thumbnails/T_UI_FaceP1_<id>_00.png` is also read by the Analyzer's `build-portraits` — do not rename or move those files.
- `data/legacy/` and `scripts/oneoff/` are temporary (seeded once from the pre-rebuild JSON).

## Architecture

`src/App.jsx` (~1,300 lines) composes the page from `src/components/`:
- `CharacterSelector.jsx` — character picker (team, class, search filters).
- `StatsPanel.jsx` / `CompareStatsPanel.jsx` — stat display for a single build vs. side-by-side comparison mode.
- `CapsuleBuilder.jsx` / `CompareCapsuleBuilder.jsx` — capsule loadout builder, single vs. comparison mode.
- `SkillsPanel.jsx` — skills, blasts and ultimates; skill rows toggle buffs.
- `OpponentPanel.jsx` — lets a build be evaluated against an opponent's build/stats.

`src/utils/calculator.js` is the stat engine:
- `computeModifiedStats(baseStats, equippedCapsules)` — applies capsule effects (see `parseEffectKey`).
- `applySkillBuffs(stats, activeSkills)` — applies active-skill buffs on top.
- `applyLightBodyKiBlastArmor` — Light Body's ki-blast-defense special case.
- `CAPSULE_BUDGET` — the point cap enforced when building a loadout.

`src/utils/shareLink.js` — share links: v2 `{v:2, c:id, p:[capsuleId x7], o, op}`; decodes old name links too. If you add a build dimension, update encoder and decoder together.

`src/utils/classStyles.js` — the one table of class-label colours (badge, portrait gradient).

## Gotchas

- `@szl/ui` (aliased in `vite.config.js`) provides the shared `NavBar` — see `packages/ui/CLAUDE.md`.
- No test suite. Validate engine changes by building a capsule/skill combination in the UI and checking the numbers against the effect's documented value, not just that the UI doesn't crash.
