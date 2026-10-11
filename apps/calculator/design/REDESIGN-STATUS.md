# Calculator redesign: what is left

The league chose concept B, the in-game character sheet (`concepts/concept-b.html`), on 2026-10-09. It has been
through three review rounds and a header adjustment, the last on 2026-10-10. This file lists what is still open
before the detailed demo and the rebuild. Update it as items close; delete it with `design/` once the real pages ship.

The data rebuild (everything up to commit `0b6ecc99`) ships to dev-branch on its own. None of this blocks it.

**Data fix waiting to ship:** the Giants' smash (Capsule Corp's value was 675 too high for all 11; the published
smash now comes from the game files, measured by the league on 2026-10-10) is on this branch only. The league
will ship it later, to dev-branch on its own or with the redesign.

## 1. Decisions waiting on the league

- **Sign-off on concept B** after round 6 (2026-10-10): Rush Chains drawn as rush-hit pips, the chain, then ▸ follow-ups
  (sheet, Full stats, Compare, Vs); charge levels tabbed under each attack (Charge Lv.1-3); a Sparking! Mode section
  for Sparking-only moves and traits; ki blasts in their own red-orange; a Full volley roster bar; Vs All stats as
  both full sheets side by side and an expanded Exchange (charge levels, charged ki blast, Hyper Smash). Before that, round 5 (2026-10-10): Full stats gained the new game-file data (charged, jump and
  dash ki blasts; smash and Heavy Finish charge levels, Hyper Smash; Mobility; Moveset; Traits), the sheet a
  Charged ki blast tile and a trait chip under the name. After round 6, armor markers (today's calculator's ARM
  badges): shields on armored hits in Vs opponent's Exchange with the rush hit by hit, and a Breaking armor table
  in Full stats. Open: whether blasts and ultimates are reduced by armor (not in the data yet, so unmarked), and
  whether the table also belongs on the sheet or in Compare's All stats.
- **Giant size factor.** Giants are the 11 characters of the Giant class (the game's `giant` key). The game's
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

- Compare's **All stats** mode on a phone.
- **Character picker** (the nameplate's "Change"), on the sheet and on each side of Compare and Vs.
- **Capsule picker** (the hexes): the ruleset, budget and group caps, the rule warnings, and notes for effects the
  stats don't show (today's `RulesBar`).
- **Opponent build editing** on Vs opponent: their capsules, skills and Sparking.
- **Breakdowns on touch screens**: tap to open and close, and keyboard and screen-reader access.
- **"Closest fighters"**: confirm the nine-stat similarity and what tapping one does.
- **Combat limits ("NEW")**: which game-file values to show, and their wording.

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
