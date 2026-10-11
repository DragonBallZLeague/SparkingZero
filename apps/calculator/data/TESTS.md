# In-game tests to run

Tests the calculator's data still needs from the league, with what the game files predict. Run them on a dummy
with no capsules or skills unless a test says otherwise, and note the combo's total before and after the move
(as in the Rush Chain tests). When a test is done, move its result to `EXPANSION.md` (or the right section of
`README.md`), add a check to `scripts/verify-data.mjs`, and delete it here.

Last updated 2026-10-11 (third round of results recorded in EXPANSION.md).

## Blasts and skills

1. **Energy attack speed (files read; one check).** Each blast's projectile has a speed curve; its top speed is
   published as `projectileSpeed` (421 of 475 non-rush blasts; explosions and short-range attacks don't travel).
   Most beams are 31,000, ultimate beams 25,000, energy balls 12,500 to 15,000; but Goku (Z - Early)'s Kamehameha
   has its own, slower beam (10,000 rising to 16,000) and Spirit Bomb travels at 10,000. Check: Goku's Kamehameha
   and Vegeta (Z - Scouter)'s Galick Gun (31,000) from the same distance at a still dummy, timed on a recording;
   the Galick Gun should arrive in about half the time.
2. **Self-damage amounts.** The files give each self-damage blast a SelfDamagePower: is it the health lost as is,
   or x1.25 like attack Power?
   - Tien's Neo Tri-Beam: predicted **2,000** health lost per use (2,500 if x1.25).
   - Master Roshi's Evil Containment Wave: 7,500 x a DP table (x1 at DP 1 to x1.45 at DP 10); against a DP 5
     opponent predicted **9,000** (a second file gives 5,000 x up to 3 instead; note which one it is).
   - Gamma 2's Core Breaker: the files knock the user out (999,999), but it isn't marked Self-damage; confirm.

## Names still unknown

2. **Four move flags.** Each turns a move off for a few characters; check their in-game controls list for the
   missing move:
   - BlastRepel: Broly (Z) Legendary Super Saiyan.
   - EnergyWave: Goku (Mini), Glorio.
   - RollingHammer: Goku (Mini), Vegeta (Mini) Super Saiyan 3.
   - Explosion: Vegeta (Mini) Super Saiyan 3, Glorio.
3. **The counter's follow-up.** The files give every character a counter entry (the standard counter attack for
   most); what it leads to in game isn't checked yet.
4. **Dragon Dash's "BK" cost** (`SpCostBK`, published as `mobility.dragonDash.bk`): which dash it is.
