# Calculator redesign: what is left

The league chose concept B, the in-game character sheet (`concepts/concept-b.html`), on 2026-10-09, signed off its
four views on 2026-10-10, and signed off everything mocked since (rounds 7 to 18) on 2026-10-11. This file lists
what is still open before the detailed demo and the rebuild. Update it as items close; delete it with `design/`
once the real pages ship.

The data rebuild (everything up to commit `0b6ecc99`) ships to dev-branch on its own. None of this blocks it.

**Data fix waiting to ship:** the Giants' smash (Capsule Corp's value was 675 too high for all 11; the published
smash now comes from the game files, measured by the league on 2026-10-10) is on this branch only. The league
will ship it later, to dev-branch on its own or with the redesign.

## 1. Signed off

**2026-10-11, rounds 7 to 18** (the concept's tabs 1 to 7):
- **Pickers (round 7, `#pick`):** every form its own face, faint class tints (a second colour as a tint on the name
  strip), class chips carry their colour, Ki and Skill separate capsule groups.
- **Rush Chains (rounds 8, 16-17):** named Rush Chains, after Melee, rose; each chain type with its charge levels
  and each follow-up on its own row with its total (Grand Slash and Lift Strike too); the sheet shows full-charge
  damage and follow-up totals. Combat limits: the follow-up limit and each pursuit.
- **Command list (rounds 9 to 13, 15 to 17):** Full stats' move cards (Skills, Blasts, Ultimates; up to 3 a row);
  the sheet's rows show the main type, primary values and a skill's effects (minor tags only in Full stats, since the Sheet is the slim view), a skill's duration in the
  Damage column. Trait sort: blasts' tiles Clash, Impact power, Speed, Tracking, Lunge speed, Time limit, tags
  Initial cost, Lock-on required, No Step Back, Unguardable, Cinematic, Chargeable, Audience flees, Destroys map,
  Targets giants; skills' tiles Activation, Targets, Armor, tags Unguardable, Cutscene, Interrupts; Instant ki,
  Instant Sparking and stat modifiers in the effect tiles; self-damage a red panel; a Special line; stage buttons
  only for reactivation stages; Grab and Crash types.
- **Round 14 views (`#more`):** opponent build editing on Vs (skills and Sparking first, then capsules by category
  with a points bar, then the league's lineup builds), Compare's All stats on a phone ("Only differences"),
  breakdowns on touch (bottom sheet), mouse (hover, click pins) and keyboard, Similar fighters (what differs; low
  priority for space).
- **Layout (rounds 15 to 18):** two-fighter headers with every head on one line at relative size; names wrap before
  the parenthesis; the Sheet's order is Toughness, Resources, Command list, Offense, Rush Chains, Sparking! Mode;
  Full stats puts Resources under Toughness and has collapsible sections (`#r18`: a closed header keeps its
  headline numbers; desktop open, phone closed but Toughness; remembered per viewer).

**2026-10-10:** concept B's four views as of round 6 and the armor markers (shields in Vs opponent's Exchange, the
Breaking armor table in Full stats and Compare's All stats); Giants ×1.3 on their card height; the stat expansion
in `characters.json` (`data/EXPANSION.md` keeps its open items).

## 2. Open items

Data the rebuild needs (none of it blocks the demo; the demo can use the mock's stand-ins):
- **Capsule types: one list for every app (the league, 2026-10-11).** Start from the Analyzer's build types
  (`apps/analyzer/src/config/capsuleMetadata.json`: Melee, Blast, Ki Blast, Defense, Skill, Ki Efficiency,
  Utility), which cover 94 of the 103 capsules; the 9 league-made capsules (DBZL_Cap_*) have none yet. Proposed:
  move the type into `referencedata/capsules.csv` so the Analyzer and the calculator read the same column.
  Waiting on the league: the 9 types and whether each app keeps its own colours (the Analyzer's Ki Blast is yellow
  and Skill purple, which mean ki and Sparking in the calculator).
- **Special texts.** Neo Tri-Beam and Evil Containment Wave approved as mocked. Body Change and Devilmite Beam:
  proposals sent 2026-10-11, waiting on the league.
- **League lineup builds** for the opponent's build: read the website's `public/content/lineups/` in the data
  build, grouped by matching capsules. Every capsule name in the lineups matches the capsule list.
- **Unknown names** in `data/TESTS.md`: the four move flags (the league can't find them), and tests for the
  counter's follow-up (likely the Perception counter) and the Dragon Dash "BK" cost.

Settled (2026-10-11): names with no parenthesis or a long form after it break before the form name ("Gotenks /
Super Saiyan 3"; names with no form part wrap normally); Full stats' Breaking armor stays where it is.

**Conditions controls, in this rebuild (the league, 2026-10-11; mocked in round 21, `#cond`):** each side's health,
ki bars and skill gauge, so conditional effects apply with exact numbers: health steps (Latent Power!, Fury!,
Fighting Spirit), a character's low-health power-up (Goku below 10,000 HP), and capsules that work off ki bars or
skill stock (Vegeta's Technique, future capsules); the map and timed events only when an equipped capsule needs
them. The health bar marks where each effect turns on; an "In effect" line names what is on; changed rows tint old
→ new. The engine needs structured conditions (capsule conditions are free text today; character passives are
"health below N HP"). Waiting on the league's look.

### Ideas kept for later

- **"To knock out"** on Vs opponent (rush combos or ultimates each side needs). The league didn't find that
  measure useful, so it was taken out of the mock. Keep the idea of a short "who wins the exchange" summary for
  a later round.

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
