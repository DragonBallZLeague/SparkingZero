# In-game tests to run

Tests the calculator's data still needs from the league, with what the game files predict. Run them on a dummy
with no capsules or skills unless a test says otherwise, and note the combo's total before and after the move
(as in the Rush Chain tests). When a test is done, move its result to `EXPANSION.md` (or the right section of
`README.md`), add a check to `scripts/verify-data.mjs`, and delete it here.

Last updated 2026-10-13 (skill damage and Sparking! Mode answered in README.md, seventh round; follow-ups added).

## Skill damage: follow-ups

The seventh round showed Explosive Wave goes through ki defense and Wild Sense (a smash hit) through melee defense.
These check the other skill types and armor. As before, the dummy, Goku (Z - Early), wears **Sparking! Plus**
(×1.2 from melee, ×1.1 from ki).

3. **Rounding across DPs.** Vegeta (Z - Early)'s Explosive Wave (the first round's 938 matches Vegeta (Z - Scouter)
   exactly): predicted **985**, and **1,084** into Sparking! Plus. Capsule Corp says 983.85; 984 would mean the game
   rounds differently.
4. **A barrier.** Android 18's Android Barrier into Sparking! Plus: predicted **1,084** (ki defense, as the
   explosion); **1,182** if melee. Without the capsule: 985.
5. **A bind.** Piccolo's Paralyze Beam into Sparking! Plus: predicted **688** (ki); **750** if melee. Without: 625.
6. **A push.** Majin Buu (Evil)'s Mystic Breath into Sparking! Plus: predicted **1,136** (ki); **1,239** if melee.
   Without: 1,032.
7. **Armor.** Vegeta (Z - Scouter)'s Explosive Wave into Janemba (10% Hyper Armor, ki defense 1.023): **960** if the
   skill breaks the armor (or ignores it), **864** if the armor holds and takes its 10%.

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
