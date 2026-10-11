# In-game tests to run

Tests the calculator's data still needs from the league, with what the game files predict. Run them on a dummy
with no capsules or skills unless a test says otherwise, and note the combo's total before and after the move
(as in the Rush Chain tests). When a test is done, move its result to `EXPANSION.md` (or the right section of
`README.md`), add a check to `scripts/verify-data.mjs`, and delete it here.

Last updated 2026-10-11 (third round of results recorded in EXPANSION.md).

## Blasts and skills

1. **Energy attack speed (file digging first, by Claude).** Blasts have no travel speed in the data. The game files
   hold speed curves for some blast projectiles (33 curves in `BulletSetting/SpeedCurve`, 149 blast projectile
   files in `BulletSetting/BulletParam`; Goku's beam curve `BulletSpeed_0000_00_actSPM_BEAM` goes 10,000 to 16,000),
   but most blasts don't link to a projectile file yet (the link probably runs through the blast's montage or
   action assets). Once linked, a test can confirm it: two beams fired from the same distance at a still
   opponent, timed on a 60 fps recording from firing to impact; the faster one should match the higher curve.

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
