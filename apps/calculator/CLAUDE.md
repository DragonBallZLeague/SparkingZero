# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Scope

Character Calculator (`/calculator/`) — public Sparking Zero character data/stat viewer with capsule/skill build comparison. Part of the root npm workspace (Match Builder/Analyzer/Calculator) — install/build via the root `package.json` scripts.

Dev: `npm run dev:calculator` (repo root) → `:5175`. Build: `npm run build:calculator`.

## ⚠️ Data source is independent of `/referencedata/`

Unlike Analyzer and Match Builder, this app does **not** read from the repo-root `referencedata/` directory (no `copy-shared-referencedata` Vite plugin, no `?raw` import of the shared CSVs — confirmed by grep, there are zero references to `referencedata`/`characters.csv`/`capsules.csv` anywhere in this app). It has its own self-contained dataset in `public/data/`:
- `characters.json`, `capsules.json`, `skills.json`, `blast.json`, `teams.json`, `characterImages.json`.
- `public/char_thumbnails/`, `public/buffs/`, `public/ki_icons/`, `public/titleicons/` — game-extracted image assets (naming conventions like `T_UI_FaceP1_####_##_##.png` match raw game asset dumps — likely produced by the extraction scripts in `GSTest/`/`NADFileTesting/` at the repo root, not hand-authored).

**This means character/capsule data can silently drift out of sync with `referencedata/characters.csv`/`capsules.csv`** (the source other apps share) — there is currently no automated process keeping them aligned. If you're updating character/capsule stats, you likely need to update **both** `/referencedata/*.csv` (for Analyzer/Match Builder) **and** `apps/calculator/public/data/*.json` (for this app) — check with whoever maintains the data before assuming one update covers both.

## Architecture

`src/App.jsx` (~1,300 lines) composes the page from `src/components/`:
- `CharacterSelector.jsx` — character/costume/form picker.
- `StatsPanel.jsx` / `CompareStatsPanel.jsx` — stat display for a single build vs. side-by-side comparison mode.
- `CapsuleBuilder.jsx` / `CompareCapsuleBuilder.jsx` — capsule loadout builder, single vs. comparison mode.
- `SkillsPanel.jsx` — active skill toggles that feed into buff calculations.
- `OpponentPanel.jsx` — lets a build be evaluated against an opponent's build/stats.

`src/utils/calculator.js` (~400 lines) is the stat engine, not a component-support file — this is where game-rule logic lives:
- `computeModifiedStats(baseStats, equippedCapsules)` — applies capsule effects to base stats (percent vs. additive vs. set operations, tracked separately — see the `parseEffectKey` field/op map near the top of the file for how a capsule effect string maps to a stat mutation).
- `applySkillBuffs(stats, activeSkills)` — applies active-skill percent buffs on top.
- `applyLightBodyKiBlastArmor` — one-off special-cased buff (Light Body's 10% ki-blast-defense reduction); a model for how other character-specific special cases should be added if needed (small, named, explicitly documented function — not folded into the generic effect map).
- `encodeBuild`/`decodeBuild` — serializes a build (character, capsules, optional opponent + opponent capsules) to/from a base64 URL hash for shareable build links. If you add a new build dimension (e.g. a new skill slot), update both functions together or old shared links will silently decode incorrectly.
- `CAPSULE_BUDGET` — the point cap enforced when building a loadout.

## Gotchas

- `@szl/ui` (aliased in `vite.config.js`) provides the shared `NavBar` — see `packages/ui/CLAUDE.md`.
- No test suite. Validate stat-engine changes by building a capsule/skill combination in the UI and checking the resulting numbers against the effect's documented percentage/value, not just that the UI doesn't crash.
