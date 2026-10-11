# In-game tests to run

Tests the calculator's data still needs from the league, with what the game files predict. Run them on a dummy
with no capsules or skills unless a test says otherwise, and note the combo's total before and after the move
(as in the Rush Chain tests). When a test is done, move its result to `EXPANSION.md` (or the right section of
`README.md`), add a check to `scripts/verify-data.mjs`, and delete it here.

Last updated 2026-10-11 (second round of results recorded in EXPANSION.md).

## Rush Chains

1. **Rush Ki Waves, part charged.** Piccolo, Rush Chain 2 (2 rush hits, 780). The files have no damage for it, so
   the data assumes **1,875** (5 hits of 375, like the full charge).
2. **Aerial Slash.** Goku (Z - Early), Grand Slash (625 uncharged) then Aerial Slash: the files don't tie it to an
   action yet, so note each hit.
3. **Lift Strike** (a Step-In or Rush-In chain for some characters): predicted at Goku's coefficient **675**
   uncharged, **900** part, **1,338** full. Note it for any character that has it.

## Blasts and skills

4. **Crash rushes.** The 14 steerable rush blasts (Nova Strike, Hyper Tornado, Cross Arm Hurricane, Eighter Attack,
   Dodoria Head Ram, Life-Risking Blow!, Gigantic Bomber, Burning Tornado, Berserker Crash, Justice Kick, Maiden's
   Charge, Primal Charge, Majin Corkscrew Attack, Rolling Attack) would show the type **Crash**: they hit on contact
   with no cinematic. 13 are Unguardable with no cinematic in the data; **Dyspo's Justice Kick** is marked
   Cinematic, so check that one (and one other, e.g. Dodoria Head Ram) in game.
5. **Energy attack speed (file digging first, by Claude).** Blasts have no travel speed in the data. The game files
   hold speed curves for some blast projectiles (33 curves in `BulletSetting/SpeedCurve`, 149 blast projectile
   files in `BulletSetting/BulletParam`; Goku's beam curve `BulletSpeed_0000_00_actSPM_BEAM` goes 10,000 to 16,000),
   but most blasts don't link to a projectile file yet (the link probably runs through the blast's montage or
   action assets). Once linked, a test can confirm it: two beams fired from the same distance at a still
   opponent, timed on a 60 fps recording from firing to impact; the faster one should match the higher curve.
6. **Devilmite Beam's wickedness rule.** Devilman's ultimate deals damage by the opponent's wickedness. No
   per-character wickedness value is in the character files (only dialogue mentions "evil"), so it is probably in
   the beam's own data (to dig). A test: Devilmite Beam on a hero (Goku (Z - Early)) and on a villain (Frieza (Z)
   1st Form), same build, and note both.
7. **Energy Storm's flurry, per shot (optional).** 9 shots made 224 for Piccolo (about 25 a shot), but the bullet
   file says Power 125 (157 a shot). If a single shot can be isolated, its damage tells which value the game uses.

## Names still unknown

8. **Four move flags.** Each turns a move off for a few characters; check their in-game controls list for the
   missing move:
   - BlastRepel: Broly (Z) Legendary Super Saiyan.
   - EnergyWave: Goku (Mini), Glorio.
   - RollingHammer: Goku (Mini), Vegeta (Mini) Super Saiyan 3.
   - Explosion: Vegeta (Mini) Super Saiyan 3, Glorio.
9. **The counter's follow-up.** The files give every character a counter entry (the standard counter attack for
   most); what it leads to in game isn't checked yet.
10. **Dragon Dash's "BK" cost** (`SpCostBK`, published as `mobility.dragonDash.bk`): which dash it is.
