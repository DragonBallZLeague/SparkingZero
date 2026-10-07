# Calculator data

Everything the Character Calculator shows is built from the files in this folder by
`scripts/build-data.mjs`. Nothing in `public/data/` is edited by hand any more: it is
generated output, rebuilt before every dev server and production build.

```
data/
  config.json        source sheet ids and tabs, damage constant, calibration thresholds, output mode
  snapshots/         faithful CSV copies of the source spreadsheets (pulled by hand, committed)
    charmap/         raw game data ("Sparking! ZERO character map"), one CSV per tab + MANIFEST.json
    capsulecorp/     Capsule Corp's "Stats" tab + MANIFEST.json
  curated/           hand-maintained tables (edit these)
  legacy/            temporary seeds from the pre-rebuild JSON (deleted once nothing reads them)
  REPORT.md          generated: coverage, source disagreements, blast calibration, what to review
  CHANGES.md         generated: per character/field old -> new for the current data vs the old files
```

## Updating for a game patch

1. `npm run data:pull` (from `apps/calculator`) downloads both spreadsheets as xlsx and
   rewrites `snapshots/`. It is the only step that touches the network. It refuses to
   write anything if a tab is missing or a tab's columns changed since the committed
   `MANIFEST.json`; check that the build still reads the right columns, then rerun with
   `--accept-layout`. A sheet that is not shared "anyone with the link" can be downloaded
   by hand and passed as `--file charmap=path.xlsx` (xlsx files are git-ignored).
2. `npm run data:build` rebuilds `public/data/`, `REPORT.md` and `CHANGES.md`.
3. Read the diff of `CHANGES.md` and `REPORT.md`, fix what needs a curated row, commit.

`npm run data:verify` runs the checks the production build runs (`prebuild`);
`npm run data:check` exits 1 when `public/data/` is stale.

## Where each value comes from

| Values | Source | Checked against |
| --- | --- | --- |
| id, name, order, forms | `referencedata/characters.csv`, `transformations.json` | the raw map's names |
| class (game key -> label via `curated/classes.csv`), DP, DP damage scale, class coefficients, health, ki, skill stocks, ki-blast count | raw map | Capsule Corp |
| defense multipliers | raw map: incoming damage factor - class resistance | Capsule Corp |
| rush hits, smash, throw, pursuit, ki blast damage, skill damage, switch, armor break, armor, short-dash cost, ki charge, skill regen, Sparking duration | Capsule Corp Stats | `ceil(Power x 1.25 x coefficient)` where the raw Power is known |
| ki-blast cost, ki regen, attack ki gain | raw map with the class coefficient applied | Capsule Corp |
| moves (names, slots, variants, ki costs) | raw Move List | `curated/blasts.csv` |
| skill effects and phases | raw Skill Values (exact coefficients) | the raw summary tab |
| skill stock cost | raw Move List (blank = the game default, 2) | |
| skill display traits (type, activation time, flags) | `curated/skill-display.csv`; skills without a row get a type inferred from their effects (`display.inferred`) | |
| blast damage | `curated/blasts.csv` (measured) | a calibrated recipe fills gaps (see below) |
| Sparking armor flag | `curated/sparking.csv` | |
| capsules | `referencedata/capsules.csv` (Type = Capsule) + `curated/capsules-extra.csv`, bans and group caps from `capsule-rules.yaml` | |
| teams | the website's `content/teams/<season>.yaml` master lists, expanded to every form | |

Damage: `final = ceil(raw Power x 1.25 x (DP damage scale + class add))`, in float32 like
the game. Coefficients from DP, class, capsules and skills add up; they do not multiply.

**Capsule Corp class labels.** Capsule Corp sometimes computes a channel with its class
label's coefficient instead of the game class's (most Vegeta forms' ki blasts, Baby Vegeta,
Fused Zamasu Half-Corrupted). The build detects it on the values whose raw Power is known
and rescales that channel; REPORT.md lists every value it changed.

**Blast damage.** Measured values live in `curated/blasts.csv`. For moves without one, the
build scores a set of recipes (which move parts count, how many times a projectile hits)
per family of moves against the measured ones, and a family's best recipe fills the gaps
only when it reproduces at least `calibration.minMatchRate` of at least
`calibration.minSamples` measured moves. Those values are published as `computed`; the rest
stay `unmeasured` ("not measured yet" in the UI). Measuring a move in game and adding it
to `blasts.csv` always wins.

## Curated tables

All UTF-8 CSV, one header row, edited by hand. The build fails on an unknown id, slot,
class key or effect.

| File | Key | Holds |
| --- | --- | --- |
| `classes.csv` | game class key | display label; the labels Capsule Corp uses for it |
| `aliases.csv` | alias | old calculator names, Capsule Corp and website spellings -> id |
| `overrides.csv` | id + field | a value that wins over every source; `reason` is required |
| `blasts.csv` | id + slot + variant + move | measured damage (+ boosted damage when it is not x1.2 / x1.3), category, traits, flags |
| `skill-display.csv` | skill name | stock cost, type, activation time, flags, heal/ki amounts |
| `sparking.csv` | id | Sparking armor flag |
| `capsules-extra.csv` | capsule id | capsules the game has but `referencedata/capsules.csv` lacks (cost may be blank = not confirmed: shown "?", counts 0). Delete a row once referencedata has the capsule |
| `effects.csv` | effect key | the game field and summary column each effect key reads |

`overrides.csv` fields are dotted paths into a character (e.g. `stats.kiBlastDamage`).

## Published files (`public/data/`, schema 2)

| File | Shape |
| --- | --- |
| `meta.json` | `schemaVersion`, `dataVersion` (content hash; the app fetches every other file with `?v=<dataVersion>`), source versions, `referenceAttacker`, `defaultRuleset`, `rulesets` (total cost, banned ids, group caps) |
| `characters.json` | array in referencedata order: `id`, `name`, `aliases`, `image`, `class {key, label}`, `dp`, `dpScale`, `stats` (explicit units: defenses are incoming-damage multipliers, ki in bars, `kiBlastLimit` null = unlimited), `coef` (total damage coefficient per channel = DP scale + class add), `classCoef`, `incomingDamage`, `skills` (ids into skills.json), `traits`, `sparking {armor, effects, armorBreakLevel}`, `passives`, `provenance {source: [fields]}`. **The website reads `name` from this file** |
| `skills.json` | object keyed `<characterId>:<slot>`: `name`, `stockCost`, `damage`, `duration`, `phases [{duration, effects [{key, value}]}]` (exact game coefficients; `stages: true` when the phases are charge stages, one of which applies), `expiryRule`, `display`, `armor` |
| `blasts.json` | object keyed by character id: `[{slot, variant, name, kiCost, triggerKi, damage, damageStatus (measured / computed / unmeasured), boostedDamage, recipe?, category, type, impactPower, traits, flags, lungeSpeed, moveLimitTime}]` |
| `capsules.json` | every referencedata capsule: `id`, `name`, `cost`, `description`, `exclusiveTo`, `effects`, `bannedIn` (ruleset names) |
| `teams.json` | `[{name, slug, members: [ids]}]` from the season's master lists, every form included |

`src/data/loadData.js` loads them; `src/data/adapter.js` `toLegacy()` converts them to the shapes the components read.

Share links (`src/utils/shareLink.js`) are `{v: 2, c: characterId, p: [capsuleId|null x7], o?, op?}`; old links and the website's links carry names and still decode (exact name, then `aliases`, then a case/punctuation-insensitive match).
