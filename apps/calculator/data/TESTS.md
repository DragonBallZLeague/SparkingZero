# In-game tests to run

Tests the calculator's data still needs from the league, with what the game files predict. Run them on a dummy
with no capsules or skills unless a test says otherwise, and note the combo's total before and after the move
(as in the Rush Chain tests). When a test is done, move its result to `EXPANSION.md` (or the right section of
`README.md`), add a check to `scripts/verify-data.mjs`, and delete it here.

Last updated 2026-10-11 (third round of results recorded in EXPANSION.md).

## Names still unknown

1. **Four move flags.** Each turns a move off for a few characters; check their in-game controls list for the
   missing move:
   - BlastRepel: Broly (Z) Legendary Super Saiyan.
   - EnergyWave: Goku (Mini), Glorio.
   - RollingHammer: Goku (Mini), Vegeta (Mini) Super Saiyan 3.
   - Explosion: Vegeta (Mini) Super Saiyan 3, Glorio.
2. **The counter's follow-up.** The files give every character a counter entry (the standard counter attack for
   most); what it leads to in game isn't checked yet.
3. **Dragon Dash's "BK" cost** (`SpCostBK`, published as `mobility.dragonDash.bk`): which dash it is.
