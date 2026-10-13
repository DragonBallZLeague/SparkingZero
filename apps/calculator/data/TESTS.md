# In-game tests to run

Tests the calculator's data still needs from the league, with what the game files predict. Run them on a dummy
with no capsules or skills unless a test says otherwise, and note the combo's total before and after the move
(as in the Rush Chain tests). When a test is done, move its result to `EXPANSION.md` (or the right section of
`README.md`), add a check to `scripts/verify-data.mjs`, and delete it here.

Last updated 2026-10-12 (the pursuit tests answered in README.md, sixth round; one left on both pursuit capsules together).

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

## Pursuits

3. **Vanishing Break and Dragon Break together: 4 follow-ups?** Each one alone adds one use to its pursuit and
   one to the total (README.md, sixth round). With both on Goku (Z - Early), the demo assumes 4 in total (3
   Vanishing Attacks, 3 Dragon Homings, 4 of any mix). Try 2 Vanishing Attacks then 2 Dragon Homings in one combo.
