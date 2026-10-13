# Calculator redesign: what is left

The league chose concept B, the in-game character sheet (`concepts/concept-b.html`), on 2026-10-09, signed off its
four views on 2026-10-10, and signed off everything mocked since (rounds 7 to 18) on 2026-10-11. This file lists
what is still open before the detailed demo and the rebuild. Update it as items close; delete it with `design/`
once the real pages ship.

The data rebuild (everything up to commit `0b6ecc99`) is on dev-branch.

**Data waiting to ship:** everything since on this branch's data side (`src/utils`, `scripts/`, `data/`,
`public/data/`) is on this branch only: the Giants' smash (Capsule Corp's value was 675 too high for all 11; now
from the game files, measured by the league on 2026-10-10), the FModel game files as the primary source, armor,
Rush Chains, charged attacks, conditions, blast hits and the pursuits. The league will ship it later, to
dev-branch on its own or with the redesign.

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

Data the rebuild needs:
Done 2026-10-11:
- **Capsule types, one list for every app:** `referencedata/capsule-types.json` (Melee, Blast, Ki Blast, Defense,
  Skill, Ki Efficiency, Utility), from the Analyzer's types plus the league's 9 custom capsules. The Analyzer and
  the calculator both read it (`capsules.json` `type`); each app colours the types from its own palette.
- **Special texts** in `data/curated/move-special.csv`, published as the blast's `special`.
- **League lineup builds** in `characters.json` `leagueBuilds` (`scripts/lib/lineups.mjs`): the top 6 per
  character (the Fighter page shows 6, the Versus rails 3), newest season first, then the most used. Only lineups the website's season and event pages link
  count; teams come from the schedule (the lineups' own team text is hand-typed). **Question for the league:** 9
  lineup files are not linked from any page (8 alternate playoff games such as `s0_po2_m1r3` beside the linked
  `s0_po2_m1r2`, and `s0_allstars_g1`); they are left out until the league says whether they count.
- **Perception** (the counter, confirmed in game) shows beside Step-In and Rush-In.

Still open: the four move flags and the Dragon Dash "BK" cost in `data/TESTS.md`.

**Full stats as rows (round 22, `#rows`):** each section laid out across as a small table, as wide as its
numbers, sharing a line with the next when it fits and stretched to fill it, against tab 7's three columns. Second
pass (one-line headers, group bars, no cell lines or dashes). **Chosen by the league on 2026-10-11**: Full stats
uses rows in the demo and the rebuild.
On desktop the whole page is 1,952px against 2,300px (the Command list is the same in both); phones keep the
stacked list.

Settled (2026-10-11): names with no parenthesis or a long form after it break before the form name ("Gotenks /
Super Saiyan 3"; names with no form part wrap normally); Full stats' Breaking armor stays where it is.

**Conditions controls, in this rebuild (the league, 2026-10-11; mocked in round 21, `#cond`):** each side's health,
ki bars and skill gauge, so conditional effects apply with exact numbers: health steps (Latent Power!, Fury!,
Fighting Spirit), a character's low-health power-up (Goku below 10,000 HP), and capsules that work off ki bars or
skill stock (Vegeta's Technique, future capsules); the map and timed events only when an equipped capsule needs
them. The health bar marks where each effect turns on; an "In effect" line names what is on; changed rows tint old
→ new. The engine needs structured conditions (capsule conditions are free text today; character passives are
"health below N HP"). Built in the detailed demo and approved with it (2026-10-13).

### Ideas kept for later

- **Calculator and Match Builder integration** (the league, 2026-10-11, after the rebuild): builds plug-and-play
  both ways, and the two apps linked in general. Also noted in `apps/calculator/CLAUDE.md`, since this file goes
  with `design/`.

- **"To knock out"** on Vs opponent (rush combos or ultimates each side needs). The league didn't find that
  measure useful, so it was taken out of the mock. Keep the idea of a short "who wins the exchange" summary for
  a later round. The detailed demo tried it again in Vs's All stats (2026-10-12: rush combos, full volleys and
  ultimates to KO, from each side's health now), and the league took it out again for now. Bring it back only
  in a form that works.

## 3. Build-out

1. **Detailed real-data demo of concept B: built (2026-10-12), reviewed in four looks and approved on
   2026-10-13.** `design/demo/` (`node apps/calculator/design/demo/build-demo.mjs`, then open
   `calculator-demo.html`): every view, both pickers, conditions (structured in the engine:
   `src/utils/conditions.js`) and breakdowns, at desktop, tablet and phone widths, under the site's shared bar
   (the ruleset only where builds are made). Its README lists what changed in each look and what is open.
   **Round 23 (2026-10-13, `concepts/layout-r23.html`), open:** after the approval, the league found the demo
   took more clicks than the live calculator and spread one fighter over separate pages. The concepts: one Fighter
   page (Sheet and Full stats merged: quick numbers per section, More or a Quick / Full switch for the full rows,
   one section order), the capsule picker inside the build rail with the numbers in view (a half-height sheet on a
   phone), one Versus page (Compare and Vs opponent, a Side by side / Matchup switch; the league chose the merge),
   a pinned headline strip, Find a stat, and quieter type. **The league took all of them but the quieter type**
   (it lost the flair that makes stats easy to find); Quick keeps the Sheet's look and roster bars. Built into
   the demo on 2026-10-13 (its README, "Round 23"), waiting on the league's look.
2. **URL scheme.** Character pages by name slug, the four views as routes, and share links that carry the whole
   build (active skills, Sparking, ruleset, opponent). Old `#` share links must keep decoding. Uses
   `restoreDeepLink` like the Analyzer.
3. **Rebuild the app** to the signed-off demo. Then delete `design/concepts/`, `design/demo/` and this file.
4. Keep `apps/calculator/CLAUDE.md` in step at each stage.

## Conventions

The settled rules (colours, labels, wording, art framing, no data sources in the UI) are in
`apps/calculator/CLAUDE.md`, under "Redesign".
