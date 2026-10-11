# In-game tests to run

Tests the calculator's data still needs from the league, with what the game files predict. Run them on a dummy
with no capsules or skills unless a test says otherwise, and note the combo's total before and after the move
(as in the Rush Chain tests). When a test is done, move its result to `EXPANSION.md` (or the right section of
`README.md`), add a check to `scripts/verify-data.mjs`, and delete it here.

Last updated 2026-10-11 (Perception counter and BK tests added).

## Names still unknown

1. **Four move flags.** Each turns a move off for a few characters; check their in-game controls list for the
   missing move:
   - BlastRepel: Broly (Z) Legendary Super Saiyan.
   - EnergyWave: Goku (Mini), Glorio.
   - RollingHammer: Goku (Mini), Vegeta (Mini) Super Saiyan 3.
   - Explosion: Vegeta (Mini) Super Saiyan 3, Glorio.
2. **The counter's follow-up.** The files give every character a counter entry (当身). The league thinks it is the
   attack after a successful Perception (2026-10-11). The files say it is the standard counter strike for 91
   characters, a chain type for 142 (Heavy Finishes 74, Flying Kicks 34, Ki Blast Cannon 23, Blaster Wave 11) and
   nothing for 8 Giants. Test: land a Perception counter with each and compare the attack that follows:
   - Goku (Z - Early): the standard counter strike.
   - Goku (Z - Mid): a Heavy Finish.
   - Gohan (Teen): Flying Kicks.
   - Goku (Z - Mid) Super Saiyan: a Ki Blast Cannon.
   - Cell 2nd Form: a Blaster Wave.
   - Janemba: no counter attack at all.
   If the attacks differ like this, the entry is the Perception counter and the calculator names it so.
3. **Dragon Dash's "BK" cost** (`SpCostBK`, published as `mobility.dragonDash.bk`): which dash it is. It always
   sits just above the High-Speed Dragon Dash's cost (Goku 0.49 and 0.52 bars a second, Broly 0.56 and 0.60,
   Janemba 0.35 and 0.36), so it is likely a variant of the high-speed dash: backward, without a lock-on, or during
   a Dragon Homing. Test with Goku (Z - Early) from 5 bars: hold each candidate for 5 seconds. The one that costs
   2.6 bars (not 2.45) is BK.
