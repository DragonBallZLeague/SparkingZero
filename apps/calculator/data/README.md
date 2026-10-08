# Calculator data

Everything the Character Calculator shows is built from the files in this folder by
`scripts/build-data.mjs`. Nothing in `public/data/` is edited by hand any more: it is
generated output, rebuilt before every dev server and production build.

```
data/
  config.json        source sheet ids and tabs, damage constant, calibration thresholds, reference attacker
  snapshots/         faithful CSV copies of the source spreadsheets (pulled by hand, committed)
    charmap/         raw game data ("Sparking! ZERO character map"), one CSV per tab + MANIFEST.json
                     (Combative Values keeps only the actions the build reads: config `keep`)
    capsulecorp/     Capsule Corp's "Stats" tab + MANIFEST.json
    neo/             the "SZ Neo Export" CharacterData tab, id, name and armor-flag columns only (config `columns`)
  curated/           hand-maintained tables (edit these)
  REPORT.md          generated: coverage, source disagreements, blast calibration, capsule effects, what to review
  CHANGES.md         generated when the published data changes: every value, previous build -> this build
  rebuild-2026-10/   frozen record of the one-time move from the old hand-edited JSON (nothing reads it)
```

## Updating for a game patch

1. `npm run data:pull` (from `apps/calculator`) downloads the three spreadsheets as xlsx and
   rewrites `snapshots/`. It is the only step that touches the network. It refuses to
   write anything if a tab is missing or a tab's columns changed since the committed
   `MANIFEST.json`; check that the build still reads the right columns, then rerun with
   `--accept-layout`. A sheet that is not shared "anyone with the link" can be downloaded
   by hand and passed as `--file charmap=path.xlsx` (xlsx files are git-ignored).
2. `npm run data:build` rebuilds `public/data/` and `REPORT.md`, and rewrites `CHANGES.md` with
   every value that differs from the previous build.
3. Read the diff of `CHANGES.md` and `REPORT.md`, fix what needs a curated row, commit.

`npm run data:verify` runs the checks the production build runs (`prebuild`);
`npm run data:check` exits 1 when `public/data/` is stale.

## Where each value comes from

| Values | Source | Checked against |
| --- | --- | --- |
| id, name, order, forms | `referencedata/characters.csv`, `transformations.json` | the raw map's names |
| class (game key -> label via `curated/classes.csv`), DP, DP damage scale, class coefficients, health, ki, skill stocks, ki-blast count | raw map | Capsule Corp |
| defense multipliers | raw map: incoming damage factor - class resistance | Capsule Corp |
| rush hits, smash, throw, pursuit, ki blast damage, skill damage, switch, armor break, armor, short-dash cost, ki charge, skill regen, Sparking duration | Capsule Corp Stats | `ceil(Power x 1.25 x coefficient)` where the raw Power is known (first rush hit, throw, ki blast; smash and pursuit from the raw map's Combative Values, actions `actSMMN` / `actBSSM`). A zero or negative Capsule Corp damage value is impossible and is replaced by the formula (Mr. Satan) |
| ki-blast cost, ki regen, attack ki gain | raw map with the class coefficient applied | Capsule Corp |
| moves (names, slots, variants, ki costs) | raw Move List | `curated/blasts.csv` |
| skill effects and phases | raw Skill Values (exact coefficients) | the raw summary tab |
| skill stock cost | raw Move List (blank = the game default, 2) | |
| skill display traits (type, activation time, flags) | `curated/skill-display.csv`; skills without a row get a type inferred from their effects (`display.inferred`) | |
| blast damage | `curated/blasts.csv` (measured) | a calibrated recipe fills gaps (see below) |
| Sparking armor flag | the SZ Neo Export's CharacterData `abilityFlag_sparkingArmor` (game files); a `curated/sparking.csv` row overrides it, and characters missing from the export are reported | |
| capsules | `referencedata/capsules.csv` (Type = Capsule), bans and group caps from `capsule-rules.yaml`. A capsule the league never allows (e.g. Victory Power) is left out on purpose | |
| capsule effects | `curated/capsule-effects.csv` | REPORT.md lists what each capsule does in the engine |
| which skill effects hit the opponent | `curated/skill-targets.csv` (default: the user). Empty on purpose: the league confirmed (2026-10-07) that every skill stat effect applies to its user | |
| "Affects opponent" tag on a skill | its `skill-display.csv` type contains Explosion, Barrier, Push, Bind or Counter (the league's list) or Blind (Solar Flare-type skills; Wild Sense is `Evade/Counter`). Those skills act through damage and behaviour, not stat effects | |
| teams | the website's `content/teams/<season>.yaml` master lists, expanded to every form | |

Damage: `final = ceil(raw Power x 1.25 x (DP damage scale + class add))`, in float32 like
the game. Coefficients from DP, class, capsules and skills add up; they do not multiply.

**Ultimates and Sparking.** An ultimate can only be used in Sparking Mode, so every ultimate's
damage includes the character's While Sparking passive (Gohan (Kid): 12000 x 1.25 x (0.95 + 0.20)
= 17,250, measured in game), as do computed ultimates and the "Ultimate" modifier. The Sparking
Mode toggle changes every other channel but leaves ultimate damage alone, and Sparking-only
ultimate effects apply to ultimates even with the toggle off.

**Confirmed in game (2026-10-07).** The league measured seven values in training against a
Goku (Z - Early) dummy (defense 1.0), and all seven matched the published data exactly:
- **Mr. Satan:** smash 156, throw 288, ki blast 58. This confirms the formula over Capsule Corp's negative values.
- **Baby Vegeta (GT):** first rush hit 371. **Vegeta (Z - Early):** ki blast 238. Both confirm the class-label rescale below.
- **Android 16:** first rush hit 498 with Rush Attack Boost 3, and 556 with Pump Up on as well. Bonuses add; they do not multiply.
- **Kid Buu:** first rush hit 564. Capsule Corp is right on multi-hit first strikes.
- **Chilled:** Death Sphere 18,375. A computed ultimate.
- **Goku (Z - Early) first rush hit into Baby Vegeta (GT):** 410. This confirms the game's defense formula (incoming damage factor − class resistance) over Capsule Corp's defense values.

A second round the same day confirmed or corrected eight blasts and three skills:
- **Blasts confirmed:** Chiaotzu's Farewell, Mr. Tien (16,250), Gohan (Kid)'s Wild Rush Blaster (17,250) and Gohan (Teen) SSJ2's Father-Son Kamehameha (19,250). Both Gohan values include their Sparking passive.
- **Blasts corrected:**
  - Super Vegeta's Spirit Breaking Cannon: 10,051. The old 10,551 included a 500 ground-bounce hit that not every use lands; measured values leave such extra hits out.
  - Janemba's Illusion Smash: 18,750.
  - Metal Cooler's Finger Blitz Barrage: 8,300, over 20 hits.
  - UI -Sign-'s Flash -Sign-: 11,307.
  - Gamma 1's Gamma Impact: 9,632. Gamma 2 has the same move and was changed to match.
- **Skills:** Saiyan Burst does 1,313 for Goku (Daima) SSJ4 and 1,266 for Vegeta (Daima) SSJ3, and Super Garlic Jr.'s Sealing Paralyze Beam does 594. Capsule Corp leaves all three blank, so they are set in `overrides.csv`.

`verify-data` checks these numbers on every build.

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
| `sparking.csv` | id | Sparking armor flag that overrides the Neo Export (for characters it lacks or gets wrong); `note` says why |
| `effects.csv` | effect key | the effect vocabulary: each key's kind (damage, resist, rate, flat, level, resource, display) and the game field / summary column it reads |
| `capsule-effects.csv` | capsule id (one row per effect) | `key` from effects.csv; `value` as a coefficient for damage/resist/rate keys (0.05 = 5%), HP / bars / counts for flat keys, `max` with `op` = set; `condition` blank = always, `sparking` = with Sparking Mode, any other text = shown as a note and not applied; `note` is shown for unmodelled effects |
| `skill-targets.csv` | skill id `<characterId>:<slot>` (+ optional phase and key) | `target` = opponent for effects the skill puts on the opponent (applied to the opponent's stats); everything else applies to the user |

`overrides.csv` fields are dotted paths into a character (e.g. `stats.kiBlastDamage`), or, with a
skill id `<characterId>:<slot>` as the id, into that skill (e.g. `damage`).

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

## The stat engine

`src/utils/engine.js` turns a character plus active effects into the shown stats, with the
game's rules: damage effects add to the channel's coefficient (`ceil(Power x 1.25 x k)`, exact
where the raw Power is known), resistance effects subtract from the incoming-damage multiplier,
rate effects scale `(1 + class + sum) / (1 + class)`, flat effects add (starting ki is clamped to
the maximum, Rising Fighting Spirit sets it to the maximum). A skill applies all its phases
when turned on; Sparking Mode applies the character's While Sparking passive, Sparking armor
and Sparking-only capsule effects. Armor from a skill (+10%) and from Sparking (+25%) keeps the
old calculator's values: the game data has no number for them.

`verify-data` checks the engine against known values on every build: first rush hits 390 / 410
/ 468, Android 16 + Rush Attack Boost 3 + Pump Up = 556 (additive), Pump Up, Kaioken and
Unforgivable's game values, the ki capsules, Sparking-only effects, a computed ultimate, and that
with no effects every character's published numbers come back unchanged.
