# In-game tests to run

Tests the calculator's data still needs from the league, with what the game files predict. Run them on a dummy
with no capsules or skills unless a test says otherwise, and note the combo's total before and after the move
(as in the Rush Chain tests). When a test is done, move its result to `EXPANSION.md` (or the right section of
`README.md`), add a check to `scripts/verify-data.mjs`, and delete it here.

Last updated 2026-10-11.

## Rush Chains

1. **Bardock's Rolling Hammer, fully charged (re-test).** Rush Chain 3, after 3 rush hits (1,170). The files
   give one hit of **563** fully charged and **425** part charged. The earlier test measured 1,150, which is
   exactly Bardock's Flying Kicks (his Rush Chain 4), so it may have been the wrong chain. Note the total and how
   many hits it lands, at part and full charge.
2. **Energy Storm's ki blast flurry.** Piccolo, Rush Chain 2 (2 rush hits, 780), fully charged Rush Ki Waves
   (1,875), Energy Storm's first press (738 + 488), then the flurry (224 last time). **Count the shots that
   land.** Each shot should be 157 at most; fewer shots, or less per shot, tells us whether later hits in a long
   combo do less damage.
3. **Rush Ki Waves, part charged.** Piccolo, Rush Chain 2. The files have no damage for it, so the data assumes
   **1,875** (5 hits of 375, like the full charge).
4. **Ki Blast Cannon Smash.** Tien, Rush Chain 1 (1 rush hit, 429), Ki Blast Cannon, then Ki Blast Cannon Smash:
   predicted **880**. Note whether it needs the cannon fully charged, like Ki Blast Cannon Attack.
5. **Delta Heavy Finish.** Goku (GT), Rush Chain 3 (3 rush hits: 410, 410, 474), Heavy Finish (709 uncharged),
   then Delta Heavy Finish: predicted **473, 381, 552**. Note whether it needs a full charge.
6. **Rolling Press.** Gamma 1, Rush Chain 2 (2 rush hits, 820), Rolling Hammer (355 uncharged), then Rolling
   Press: predicted **1,288** for its first press (three hits: 250, 788, 250) and **788** for the second.
7. **Characters with their own Flying Kicks.** The files name some kicks as ranges ("hits 2-4"), so the hit
   count is a guess:
   - Burter, Rush Chain 2 (2 rush hits, 812): predicted 582 (141, 141, 300), more if the range means 4 kicks.
   - Tapion, Rush Chain 2 (2 rush hits, 742): predicted 620 (150, 150, 320).
   - Gogeta (Super) Super Saiyan, Rush Chain 4 (4 rush hits, 2,357): predicted 1,780 (416 ×3, 532).
8. **Grand Slash and Tornado Slash.** Goku (Z - Early), Grand Slash: predicted **625** uncharged, **775** part,
   **1,263** full; then Tornado Slash: **450, 363, 525**. Also confirm that Tornado Slash and Aerial Slash are
   two separate routes off Grand Slash (not one leading into the other).

## Armor

9. **The Sparking armor-break bonus.** Goku (Z - Early) **in Sparking**, a fully charged ki blast against Sparking
   Janemba. The game's common Sparking buff gives +3 break level, which should break Janemba's Sparking Armor:
   predicted **1,919** (1,439 if it doesn't break). His first rush hit in Sparking should break it too.

## Follow-up (pursuit) limits

10. **Videl and Mr. Satan.** The files turn off their Vanishing Attack and Lightning Attack and leave Dragon
    Homing on; Videl's Dragon Homing has its own limit of 2. Confirm, and count how many follow-ups each can do
    in one combo: neither has a general follow-up limit in the files (nor do Cheelai and Panzy).

## Names still unknown

11. **Four move flags.** Each turns a move off for a few characters; check their in-game controls list for the
    missing move:
    - BlastRepel: Broly (Z) Legendary Super Saiyan.
    - EnergyWave: Goku (Mini), Glorio.
    - RollingHammer: Goku (Mini), Vegeta (Mini) Super Saiyan 3.
    - Explosion: Vegeta (Mini) Super Saiyan 3, Glorio.
12. **The counter's follow-up.** The files give every character a counter entry (the standard counter attack for
    most); what it leads to in game isn't checked yet.
13. **Dragon Dash's "BK" cost** (`SpCostBK`, published as `mobility.dragonDash.bk`): which dash it is.
