# Calculator redesign: what is left

The league chose concept B, the in-game character sheet (`concepts/concept-b.html`), on 2026-10-09. It has been
through six review rounds, the last on 2026-10-10, and the league signed off its four views that day. This file lists what is still open
before the detailed demo and the rebuild. Update it as items close; delete it with `design/` once the real pages ship.

The data rebuild (everything up to commit `0b6ecc99`) ships to dev-branch on its own. None of this blocks it.

**Data fix waiting to ship:** the Giants' smash (Capsule Corp's value was 675 too high for all 11; the published
smash now comes from the game files, measured by the league on 2026-10-10) is on this branch only. The league
will ship it later, to dev-branch on its own or with the redesign.

## 1. Decisions waiting on the league

- **Pickers (round 7, 2026-10-10):** the character picker (the roster as the game's face icons with DP, filtered by
  search, team, class and DP; a preview with art, headline stats and forms before picking; from Compare or Vs it
  fills one side) and the capsule picker (the build with budget and attack-cap meters showing the hovered capsule,
  rule warnings and effects the stats can't show; every allowed capsule by category with what it changes on this
  build, e.g. Rush 5-hit 2,523 → 2,648; In Sparking! and Not in the stats tags; banned hidden behind "Show
  banned"). In `concepts/concept-b.html#pick`. The league's first review (2026-10-10): every form stays its own face; Ki and Skill became separate capsule groups; faces sit on their class's colour (split tiles for sub-types and close colours). Waiting on the league's look at those changes.

- **Round 14 (2026-10-11, `#more`):** first versions of the views not mocked before: editing the opponent's build on Vs opponent (league lineup builds for that fighter first, from the website's lineups; then No capsules or Same as yours, their capsules, skills and Sparking; changed Exchange rows tinted old → new), Compare's All stats on a phone (value | stat | value rows, "Only differences" on, shared stats folded into a "Same for both" line, section chips), breakdowns on touch (a bottom sheet), with a mouse (hover previews, click pins) and a keyboard (every dotted number a Tab stop; Enter or Space opens, Esc closes), and Similar fighters (was Closest fighters; it lists what differs, since the nine core stats come mostly from DP and class and many same-DP fighters are near-identical). Waiting on the league's look.
- **Round 13 (2026-10-11):** Unguardable back on skills; penalties applied on activation shown with the buff, not as stages; No Step Back; Grand Slash damage. Data published for them (interrupts, stages, noStepBack, crash; Crash confirmed by the league).
- **Round 12 (2026-10-11):** trimmed traits (Initial cost only when different, Lock-on required only when true, Burst cost only in the cost display, no Unguardable on skills), a Special line for unique rules, stage buttons for multi-stage skills, Interrupts; a frame of other characters' cards. Interrupts, stages and Devilmite Beam's wickedness scaling are published; the Special texts themselves are still to publish.
- **Round 11 (2026-10-11):** tighter Command list cards (primary values beside the damage, minor traits as small tags); Unguardable once; Speed clash; Grab for throw-type rush blasts; lunge speed only on Rush and Grab. **Open:** the league sorts every blast and skill trait into primary (tiles) and minor (tags); the current setup was resent on 2026-10-11 (blasts: tiles Clash, Impact power, Speed, Tracking, Lunge speed, Time limit; tags Initial cost, Lock-on required, No Step Back, Unguardable, Cinematic, Chargeable, Audience flees; not placed yet: Destroys map, Targets giants. Skills: tiles Activation, Targets; tags Unguardable, Cutscene, Instant Sparking, Interrupts; not placed yet: Instant ki, Armor).
- **Round 10 (2026-10-11):** Command list rows (Skills, Blasts, Ultimates; up to 3 a row), wide cards with the main type by the damage, boost labelled "+1 bar", no Lunge Fighting tag; Breaking armor under Ki blasts. Open: how to show the 10 Throw-type rush blasts and the 6 lunging non-rush blasts.
- **Round 9 (2026-10-11):** Full stats' Command list of move cards (blasts, ultimates, skills with every value the data has); Heavy Finish and Perfect Smash out of Melee. Waiting on the league's look.
- **Round 8 (2026-10-11):** Rush Chains (renamed from Moveset) after Melee in a rose of its own, with chain and follow-up damage; follow-ups one per line as separate routes; Combat limits per pursuit; class colours inside the picker's class chips. Waiting on the league's look.

Signed off (2026-10-10): **concept B's four views** as of round 6 and the armor markers. Round 6: Rush Chains drawn as rush-hit pips, the chain, then ▸ follow-ups
  (sheet, Full stats, Compare, Vs); charge levels tabbed under each attack (Charge Lv.1-3); a Sparking! Mode section
  for Sparking-only moves and traits; ki blasts in their own red-orange; a Full volley roster bar; Vs All stats as
  both full sheets side by side and an expanded Exchange (charge levels, charged ki blast, Hyper Smash). Before that, round 5 (2026-10-10): Full stats gained the new game-file data (charged, jump and
  dash ki blasts; smash and Heavy Finish charge levels, Hyper Smash; Mobility; Moveset; Traits), the sheet a
  Charged ki blast tile and a trait chip under the name. After round 6, armor markers (today's calculator's ARM
  badges): shields on armored hits in Vs opponent's Exchange with the rush hit by hit, and a Breaking armor table
  in Full stats and Compare's All stats (rush hits 1-4, Lv.1 smash, ki blast, charged ki blast;
  blasts and ultimates always break armor, the league says). The sheet keeps its Armor tile for the character's
  own armor.
Also settled: **Giant size factor.** Giants are the 11 characters of the Giant class (the game's `giant` key). The game's
  cards shrink them to fit, so each gets a factor on top of its card height: ×1.3 for all of them (the league
  approved it on Janemba, 2026-10-10).
Done (2026-10-10): the stat expansion (charged, jump and dash ki blasts; smash and Heavy Finish charge levels;
Mobility; Moveset; Traits; armor levels, which the engine now uses) is in `characters.json`, checked against the
league's measurements, and mocked in rounds 5 and 6. `data/EXPANSION.md` keeps the open items (Burst moves in the
data, an all-melee effect for `NormalCombativesDamageScale`, the Sparking armor-break bonus test).

Settled (2026-10-10, round 5): the sheet shows the Moveset (four Rush Chains with follow-ups, Step-In, Rush-In,
Grand Slash, Sparking moves) under the Command list; trait chips under the name for hyper armor, can't fly, ki
drain, drain immune, can't charge ki (and Goku's low-HP power-up); a non-standard ki blast shows its type in its
tile (laser, thrown, homing ×3, paralyzing ×2). Compare's and Vs opponent's All stats include Mobility and
Moveset (Vs also Traits). all 241 card images are cut into `public/char_art/` (11.7 MB, with `sizes.json`). stats on the sheet get a thin bar filled to where the character sits in the roster's range
(5th to 95th percentile; no average marker), "less is better" stats fill the better the character is, and rates
(ki charge, ki regen, skill gauge gain) use chevrons that light up with speed. Health, starting ki and
auto-recharge get no bar. Blasts and ultimates get none either: their types differ too much.

### Ideas kept for later

- **"To knock out"** on Vs opponent (rush combos or ultimates each side needs). The league didn't find that
  measure useful, so it was taken out of the mock. Keep the idea of a short "who wins the exchange" summary for
  a later round.

## 2. Views and interactions not mocked yet

All first mocked in round 14 (`#more`), waiting on the league's look:
- Compare's **All stats** mode on a phone.
- **Opponent build editing** on Vs opponent: their capsules, skills and Sparking, with the league's lineup builds.
- **Breakdowns on touch screens**: tap to open and close, and keyboard and screen-reader access.
- **Similar fighters** (was "Closest fighters"): what differs, same DP first; tapping one fills Compare's right side.
- **Combat limits**: mocked in round 8 (follow-up limit and each pursuit); its wording is waiting on the league.

Ideas from round 14, not mocked: a "their health" control on Vs opponent to apply health-step capsules (Fury!,
Latent Power!), which most of the league's Piccolo builds carry.

## 3. Build-out

1. **Detailed real-data demo of concept B.** Reuse `design/demo/`'s build plumbing (esbuild bundling this app's
   engine and `public/data`). Its Analyzer-look UI was rejected, so replace that.
2. **URL scheme.** Character pages by name slug, the four views as routes, and share links that carry the whole
   build (active skills, Sparking, ruleset, opponent). Old `#` share links must keep decoding. Uses
   `restoreDeepLink` like the Analyzer.
3. **Rebuild the app** to the signed-off demo. Then delete `design/concepts/`, `design/demo/` and this file.
4. Keep `apps/calculator/CLAUDE.md` in step at each stage.

## Conventions

The settled rules (colours, labels, wording, art framing, no data sources in the UI) are in
`apps/calculator/CLAUDE.md`, under "Redesign".
