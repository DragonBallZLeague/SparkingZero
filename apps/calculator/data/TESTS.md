# In-game tests to run

Tests the calculator's data still needs from the league, with what the game files predict. Run them on a dummy
with no capsules or skills unless a test says otherwise, and note the combo's total before and after the move
(as in the Rush Chain tests). When a test is done, move its result to `EXPANSION.md` (or the right section of
`README.md`), add a check to `scripts/verify-data.mjs`, and delete it here.

Last updated 2026-10-12 (pursuit tests added; the blast rounding tests are answered in README.md, fifth round).

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

## Pursuits (added 2026-10-12)

The engine now applies Vanishing Crash, Dragon Crash, Vanishing Break and Dragon Break. The damage follows the game
files (every pursuit hit is a common 1,000-Power attack on the follow-up channel; Lightning Attack is 460); the
uses follow the capsules' text. Goku (Z - Early), no other capsules:

3. **Pursuit damage.** Read each hit's damage on its own:
   - Vanishing Attack, no capsules: **1,250**. With Vanishing Crash: **1,313** (1,000 × 1.25 × 1.05, rounded up).
   - Dragon Homing's final smash (Dragon Smash), no capsules: **1,250**. With Dragon Crash: **1,313**.
   - Lightning Attack: **575** (460 × 1.25). Its Power is the least certain of the three.
4. **Vanishing Break: one more Vanishing Attack, or one more follow-up of any kind?** Goku's general follow-up
   limit is 2. The demo shows **3 Vanishing Attacks** with Vanishing Break and keeps the general limit at 2. In
   one combo, chain Vanishing Attacks with Vanishing Break on: does a 3rd one come out? Then try 2 Vanishing
   Attacks and a Dragon Homing: if that also works, the capsule raises the general limit instead. Dragon Break
   the same way with Dragon Homings.

