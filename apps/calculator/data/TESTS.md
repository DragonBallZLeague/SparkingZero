# In-game tests to run

Tests the calculator's data still needs from the league, with what the game files predict. Run them on a dummy
with no capsules or skills unless a test says otherwise, and note the combo's total before and after the move
(as in the Rush Chain tests). When a test is done, move its result to `EXPANSION.md` (or the right section of
`README.md`), add a check to `scripts/verify-data.mjs`, and delete it here.

Last updated 2026-10-11 (third round of results recorded in EXPANSION.md).

## Blasts and skills

1. **Non-homing rushes.** The files mark 134 rush blasts as homing (they follow the target: Kaioken Attack, Meteor
   Smash) and 14 as steering (the player turns them: Justice Kick and the 13 crashes). The other 115 rush and grab
   blasts give no tracking value, so they use the game's default, probably the non-homing kind (they head for
   where the opponent was and neither follow nor steer). Check one against a homing one: start the blast, then
   side-dash the dummy away (or have a second controller move it).
   - No value: Goku (Z - End) Super Saiyan 3's Dragon Fist, Goku (Super) Super Saiyan God's God Impact,
     Legendary Strike (Goku (Z - Early)'s costume ultimate).
   - Homing, for comparison: Goku (Z - Early)'s Kaioken Attack.
2. **Energy attack speed (file digging first, by Claude).** Blasts have no travel speed in the data. The game files
   hold speed curves for some blast projectiles (33 curves in `BulletSetting/SpeedCurve`, 149 blast projectile
   files in `BulletSetting/BulletParam`; Goku's beam curve `BulletSpeed_0000_00_actSPM_BEAM` goes 10,000 to 16,000),
   but most blasts don't link to a projectile file yet (the link probably runs through the blast's montage or
   action assets). Once linked, a test can confirm it: two beams fired from the same distance at a still
   opponent, timed on a 60 fps recording from firing to impact; the faster one should match the higher curve.

## Names still unknown

3. **Four move flags.** Each turns a move off for a few characters; check their in-game controls list for the
   missing move:
   - BlastRepel: Broly (Z) Legendary Super Saiyan.
   - EnergyWave: Goku (Mini), Glorio.
   - RollingHammer: Goku (Mini), Vegeta (Mini) Super Saiyan 3.
   - Explosion: Vegeta (Mini) Super Saiyan 3, Glorio.
4. **The counter's follow-up.** The files give every character a counter entry (the standard counter attack for
   most); what it leads to in game isn't checked yet.
5. **Dragon Dash's "BK" cost** (`SpCostBK`, published as `mobility.dragonDash.bk`): which dash it is.
