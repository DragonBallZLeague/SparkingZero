# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Scope

Character Calculator (`/calculator/`) — public Sparking Zero character data/stat viewer with capsule/skill build comparison. Part of the root npm workspace (Match Builder/Analyzer/Calculator) — install/build via the root `package.json` scripts.

Dev: `npm run dev:calculator` (repo root) → `:5175`. Build: `npm run build:calculator`.

## Data pipeline (read `data/README.md` first)

`public/data/*.json` is **generated** — never edit it by hand. `scripts/build-data.mjs` builds it from:
- `data/snapshots/` — committed CSV copies of three spreadsheets: the raw game map (`charmap/`, game facts and raw inputs), Capsule Corp's Stats tab (`capsulecorp/`, finals) and the SZ Neo Export's CharacterData and Blasts tabs (`neo/`, the Sparking armor flag and blast details where `curated/blasts.csv` is blank, including can-clash and lock-on; joined by character name because Neo's own ids repeat across forms). Huge or wide tabs are snapshotted in part (`keep` rows / `columns` in `data/config.json`). Refreshed by hand with `npm run data:pull` (the only networked step; it refuses a changed column layout unless `--accept-layout`).
- `data/curated/*.csv` — hand-maintained tables: measured blast damage, capsule effects, the effect vocabulary, skill display traits, skill targets, class labels, aliases, overrides, Sparking armor overrides, spread-shot hit counts, short-dash ki cost (league datamine, plus `short-dash-shared.csv` for DLC characters whose step data the game reads from another character).
- `referencedata/` (characters, forms, capsules, rulesets) and the website's `public/content/teams/<season>.yaml` master lists. **The calculator joins the shared reference data by id**; names and order come from `referencedata/characters.csv`.

**FModel game files: the primary source for game facts (2026-10-09).** `scripts/pull-fmodel.mjs` (`npm run data:fmodel -- <export folder>`, offline; reader in `scripts/lib/fmodel.mjs`) snapshots an FModel JSON export of the game into `data/snapshots/fmodel/` as long tables, following each character's asset links; `scripts/fmodel-parity.mjs` (`npm run data:parity`) compares it with the current sources into `data/FMODEL-PARITY.md`. `data/fmodel-fields.csv` maps game fields to calculator fields with their defaults. Unreal omits fields equal to their default, so a missing value means the default (DP 5, Life 50,000, …), never zero. The game's character names add a comma ("Goku (Z - Mid), Super Saiyan"); referencedata's names stay. The build reads it through `scripts/lib/fmodelData.mjs` and `scripts/lib/gameSource.mjs`, which fill the character map's columns from the game files first (class, DP, coefficients, health, ki, counts, attack and ki-blast Power, move names and ki costs, blast-part values, skill buffs, passives, short dash) and record every disagreement in REPORT.md's "Game files vs character map"; the map still supplies move variants, skill stock costs, Maximum Ki and the move-to-part links. `verify-data` fails if the snapshot is committed but unused. Next (review doc): per-source field maps for the sheets too, and moving league measurements out of `curated/blasts.csv`.

`predev` runs `build-data`; `prebuild` runs `build-data` then `scripts/verify-data.mjs` (ok/FAIL/WARN, exit 1 on FAIL; it includes engine checks against known in-game values). Both are offline and deterministic. Every build regenerates `data/REPORT.md` (coverage, source disagreements, blast calibration, capsule effects); `data/CHANGES.md` is rewritten only when the published data changes (previous build → this build). Read both diffs after any data change. `data/rebuild-2026-10/` is the frozen record of the one-time move from the old hand-edited JSON.

`src/data/loadData.js` fetches `meta.json` (no-cache) and the rest with `?v=<dataVersion>`. `src/data/adapter.js` `toLegacy()` turns schema-2 data into the shapes the components read (flat character objects keyed by name, `blast` keyed by name, skills as a list keyed `<characterId>:<slot>` with `buffPct`, the six headline channels in percent). It has no imports so the build, the checks and the browser share it.

Gotchas:
- **Damage coefficients add** (DP scale + class + capsules + skills), they do not multiply. `final = ceil(Power x 1.25 x coefficient)`.
- **Ultimates are always in Sparking Mode** (they cannot be used outside it): published ultimate damage includes the character's While Sparking passive (`sparkingUltimateBonus` in `engine.js`, also used by the build's blast recipes), and the Sparking toggle leaves ultimate damage alone.
- **Capsule Corp's own formula goes negative for very low coefficients** (Mr. Satan's smash/throw/pursuit/ki blast were negative). The build replaces any zero or negative damage value with the game formula, and `verify-data` fails on one.
- **Capsule Corp's class labels are not always the game's class** (Vegeta forms, Baby Vegeta, Fused Zamasu Half-Corrupted); the build rescales those channels from evidence and lists them in REPORT.md. Game class keys map to labels in `data/curated/classes.csv`.
- **Old share links carry display names.** `src/utils/shareLink.js` resolves names exact → `aliases` → normalised; renamed characters need a row in `data/curated/aliases.csv`. The website's Teams page builds name-based links too (see below).
- **The website reads production `calculator/data/characters.json`**: it must stay a top-level array of objects with `name`, in referencedata order. Its form dropdown walks `transformations.json` by name (`apps/website/src/utils/formChain.js`, imported by `verify-data` so the check runs the shipped code).
- `public/char_thumbnails/T_UI_FaceP1_<id>_00.png` is also read by the Analyzer's `build-portraits` — do not rename or move those files.
- The one-off scripts that seeded the curated tables from the old JSON and proved the schema-2 conversion lossless were deleted after use (git history, P1–P4 of the 2026-10 rebuild); their results are recorded in `data/rebuild-2026-10/`.
- Website masterlist names are matched trimmed (`formChain.js`); misspelled ones (e.g. "Zangaya") still show as plain text on the website — `verify-data` lists them, `curated/aliases.csv` resolves them for the calculator's own team filter.

## Architecture

`src/App.jsx` (~1,300 lines) composes the page from `src/components/`:
- `CharacterSelector.jsx` — character picker (team, class, search filters).
- `StatsPanel.jsx` / `CompareStatsPanel.jsx` — stat display for a single build vs. side-by-side comparison mode.
- `CapsuleBuilder.jsx` / `CompareCapsuleBuilder.jsx` — capsule loadout builder, single vs. comparison mode (with the ruleset picker).
- `SkillsPanel.jsx` — skills, blasts and ultimates; skill rows toggle the skill (only when it has an effect the engine applies: `toLegacy`'s `effectCount`, given `APPLIED_KEYS`; evasions and one-off heals are not toggleable), the Sparking Mode row toggles Sparking.
- `OpponentPanel.jsx` — lets a build be evaluated against an opponent's build/stats.

`src/utils/engine.js` is the stat engine — one data-driven path, no per-capsule code:
- `collectEffects({character, capsules, skills, sparking, incoming})` — gathers effects from equipped capsules (`effects` rows from `curated/capsule-effects.csv`), active skills (every phase; the strongest stage of a charge-stage skill), Sparking (the character's While Sparking passive, Sparking armor, `condition: sparking` capsule effects) and opponent-targeted skill effects. Effects with any other condition, and keys no shown stat depends on, become notes.
- `computeStats(character, effects, ctx)` — damage channels add to the coefficient (exact formula where the raw Power is known), resistances scale the incoming-damage multiplier (`incoming x (1 - (class + Σ))`, measured in game), armor does not stack (Sparking/skill armor replaces a lower base armor), rates scale `(1 + class + Σ) / (1 + class)`, flat/set effects with clamping. Returns the old field names the panels render, plus `blastFactor` and `notes`.
- `blastDamage(blast, stats)` — a blast row's damage under those effects (the panels no longer do their own blast math).
- App computes each side with `sideEffects`/`sideStats`; the main character and the opponent exchange their skills' opponent-targeted effects (`curated/skill-targets.csv`).

`src/utils/calculator.js` — combat helpers the panels share (damage taken against the reference attacker's hits, outgoing combos, defense, the ki-blast volley, formatting) and Light Body's ki-blast-defense special case. Single and compare mode must use these helpers, never their own copies: they once had two volley formulas. Game rules: damage taken rounds up per hit (`adapter.js` `hitsTaken` is the import-free copy the engine uses for "5-Hit Damage Taken"); in a ki-blast volley each shot deals 5% of the first shot less, held at 40% from the 13th shot (the game's `ComboRushBulletDamageScalingCurve`), except against armor (hits on armor are not a combo).

`src/utils/specialCapsules.js` — the capsules with behaviour beyond their effect rows (Light Body, Draconic Aura, Dragon Rush), by id.

`src/utils/shareLink.js` — share links: v2 `{v:2, c:id, p:[capsuleId x7], o, op}`; decodes old name links too. If you add a build dimension, update encoder and decoder together.

`src/utils/classStyles.js` — the one table of class-label colours (badge, portrait gradient).

`src/utils/rules.js` — capsule rulesets from `meta.json` (budget, banned ids, group caps such as Rush/Smash/Blast Attack Boost <= 6). App provides the selected ruleset through `RulesContext`; the builders read `useRules()` and show `components/RulesBar.jsx` (picker, rule warnings, and what equipped capsules do that the stats do not show). The picker lists only capsules the selected ruleset allows. Capsules come only from `referencedata/capsules.csv`; Victory Power is a real game capsule left out on purpose (the league never allows it).

`src/components/BlastStatus.jsx` — the `calc` marker (damage computed by a calibrated recipe), "not measured yet" (no value) and the spread-shot note ("3 of 6 shots x 2,257").

## Gotchas

- `@szl/ui` (aliased in `vite.config.js`) provides the shared `NavBar` — see `packages/ui/CLAUDE.md`.
- No test suite beyond `verify-data`'s engine checks. Validate engine changes by building a capsule/skill combination in the UI and checking the numbers against the effect's documented value, not just that the UI doesn't crash.
