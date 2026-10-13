# In-game tests to run

Tests the calculator's data still needs from the league, with what the game files predict. Run them on a dummy
with no capsules or skills unless a test says otherwise, and note the combo's total before and after the move
(as in the Rush Chain tests). When a test is done, move its result to `EXPANSION.md` (or the right section of
`README.md`), add a check to `scripts/verify-data.mjs`, and delete it here.

Last updated 2026-10-12 (the blast rounding test answered; a re-read of two beams added).

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

## Damage rounding

The 2026-10-12 round answered the rounding question: each hit is rounded up on its own (`README.md`, fifth
round). Two readings are left:

3. **Kamehameha and Super Masenko with Blast Burst: 7,485 or 7,845?** Both were reported as 7,845. The game
   files make each one bullet of 1,140 Power plus 4 beam ticks of 1,140, which gives 7,485 with Blast Burst
   (5 × 1,497). That is the same digits in another order, and the same model gives Goku (Z - Mid)'s x20 Kaioken
   Kamehameha 7,840, as measured. Fire Goku (Z - Early)'s Kamehameha uncharged with Blast Burst only, and read
   the number again. If it is 7,845, fire it once with no capsules too (the data says 7,125): that tells a
   wrong base apart from something Blast Burst does to chargeable beams.
4. **Drain Life Cell with no capsules: 8,794 or 8,795?** Cell 2nd Form, Super 2. The data has 8,795 measured,
   which fits a 1,000 lunge hit plus a 5,700 hit (1,313 + 7,482); Kaioken Rush has the same 6,700 Power and
   reads 8,794. With Blast Burst both did 9,213, which fits either. If it is 8,795, the rush blasts' lunge hit
   counts on its own and the build can publish it as a separate hit.
