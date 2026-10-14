# In-game tests to run

Tests the calculator's data still needs from the league, with what the game files predict. Run them on a dummy
with no capsules or skills unless a test says otherwise, and note the combo's total before and after the move
(as in the Rush Chain tests). When a test is done, move its result to `EXPANSION.md` (or the right section of
`README.md`), add a check to `scripts/verify-data.mjs`, and delete it here.

Last updated 2026-10-13 (the pursuit tests all answered in README.md, sixth round; skill damage and Sparking added).

## Skill damage: which defense it goes through

The calculator shows skill damage (158 skills) but doesn't know which defense the opponent takes it on, so the
Matchup shows it before defenses. No fighter without armor has a melee defense different from its ki defense, so the
dummy wears **Sparking! Plus** (1 point, no armor): it takes 20% more from melee (×1.2) and 10% more from ki blasts
and blasts (×1.1).

3. **Explosive Wave.** Vegeta (Z - Early) hits Goku (Z - Early) with Explosive Wave (S1):
   - no capsules on Goku: **984** (Capsule Corp's 983.85, rounded up);
   - Goku with Sparking! Plus: **1,083** if it goes through ki/blast defense, **1,181** if melee defense, **984** if
     no defense at all.
4. **Wild Sense.** Goku (Z - Mid) Super Saiyan uses Wild Sense (S1) and Goku (Z - Early) rushes into it (the
   training dummy set to attack, or a second controller); note the counter hit's damage:
   - no capsules on the dummy: **1,708**;
   - dummy with Sparking! Plus: **2,050** if melee defense, **1,879** if ki/blast, **1,708** if none.

## Sparking! Mode: charge time and duration

The game files give the Sparking drain (2,800 a second for everyone) and each class's charge-speed and drain
scales, but not the gauge's size or the base charge speed (the files omit defaults). Record a video and count from
the frame Sparking starts to the frame it ends (duration), or from the frame ki reaches 5 bars to the frame
Sparking starts (charge). No capsules unless the test says so; don't attack, dash or charge during a duration
test.

5. **Duration, base.** Goku (Z - Early): predicted **17.9s** (the full 5-bar gauge at 2,800 a second). Any other
   time gives the gauge's real size (2,800 × the seconds).
6. **Duration, a Super Saiyan.** Goku (Z - Mid) Super Saiyan: predicted **17.9s**, the same as test 5. The old
   calculator's "Spark Duration" said −10% (**16.1s**); it is really how fast a partial charge fades.
7. **Duration, a faster drain.** Ultimate Gohan (Almighty class, drains 10% faster): predicted **16.2s**.
8. **Duration with Sparking! Plus** (drain −15%) on Goku (Z - Early): predicted **21.0s** (17.9 ÷ 0.85); **20.5s**
   would mean the capsule multiplies the time instead (17.9 × 1.15).
9. **Charge, base.** Goku (Z - Early) at 5 full ki bars, hold charge until Sparking starts. No prediction: this sets
   the base every charge time is worked out from (`SPARKING_CHARGE_BASE_SECONDS` in `src/utils/engine.js`).
10. **Charge by class.** Nappa (Power class, charges 20% faster, the same ki charge speed as Goku): predicted test 9
    ÷ 1.2. Vegeta (Z - Scouter) (charges 10% slower): test 9 ÷ 0.9.
11. **Does ki charge speed matter?** Yamcha (same class as Goku, but ki charge speed 8 against Goku's 7): predicted
    the **same time as test 9**; test 9 × 7/8 would mean Sparking charges at the fighter's ki charge speed.

## Names still unknown

1. **Four move flags.** Each turns a move off for a few characters; check their in-game controls list for the
   missing move:
   - BlastRepel: Broly (Z) Legendary Super Saiyan.
   - EnergyWave: Goku (Mini), Glorio.
   - RollingHammer: Goku (Mini), Vegeta (Mini) Super Saiyan 3.
   - Explosion: Vegeta (Mini) Super Saiyan 3, Glorio.
2. **Dragon Dash's "BK" cost** (`SpCostBK`, published as `mobility.dragonDash.bk`): which dash it is. It always
   sits just above the High-Speed Dragon Dash's cost (Goku 0.49 and 0.52 bars a second, Broly 0.56 and 0.60,
   Janemba 0.35 and 0.36), so it is likely a variant of the high-speed dash: backward, without a lock-on, or during
   a Dragon Homing. Test with Goku (Z - Early) from 5 bars: hold each candidate for 5 seconds. The one that costs
   2.6 bars (not 2.45) is BK.
