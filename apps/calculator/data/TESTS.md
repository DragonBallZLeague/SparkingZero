# In-game tests to run

Tests the calculator's data still needs from the league, with what the game files predict. Run them on a dummy
with no capsules or skills unless a test says otherwise, and note the combo's total before and after the move
(as in the Rush Chain tests). When a test is done, move its result to `EXPANSION.md` (or the right section of
`README.md`), add a check to `scripts/verify-data.mjs`, and delete it here.

Last updated 2026-10-13: skill damage and Sparking! Mode answered (README.md, seventh round); Burst attacks and
blast hit splits added for later.

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

## Burst attacks: who has them

The calculator shows the Burst Melee Attack (1,250) and the first Burst Rush hit (450) in every fighter's
Sparking! section, because the data has no per-character list. Both were measured on Goku (Z - Early) and Vegeta
(Z - Scouter) (EXPANSION.md, "Burst attacks"): 1,000 and 360 Power, × 1.25, the same for every class. Every
character has the common Burst action files, but the game files mark some exceptions. Test each in Sparking! Mode:
Z Burst Dash behind the dummy, do the Burst Melee Attack, mash into the Burst Rush, then try each other Burst
follow-up. Note which moves a character can't do (compared with Goku (Z - Early)) and the damage of the ones it
can.

3. **Videl, Mr. Satan, Cheelai and Panzy.** Only these four have the flags `ActionFlag.BurstSmash` and
   `ActionFlag.BurstMeteor`. Flags of this kind usually turn a move **off** (`SparkingRush` means "no Violent
   Rush", confirmed 2026-10-10). Predicted: these four lack two Burst moves that Goku has. The files call them
   Burst Smash (`actBSS*`, five directions: up, down, left, right, middle) and probably Burst Meteor
   (`actBSM1`, `actBSM2`). Test Mr. Satan, then Videl. Note which moves are missing, and what each Burst move is
   called in game, so the calculator can name them. Also note whether the Burst Melee Attack and Burst Rush
   still work (1,250 and 450 predicted).
4. **A Giant.** Janemba (or Great Ape Vegeta): can he Z Burst Dash and do the Burst attacks? If so, predicted
   1,250 and 450 (the Burst attacks ignore class, and the Giants' ×1.3 card scale is only art).
5. **Third Eye Gomah** is the only character without a `BurstSmashGaugeGain` value (everyone else has 0.1). He
   may just use the default, or he may not have the Burst Smash at all. Check his Burst moves as in test 3.
6. **Burst Rush hits that are split** (low priority: the damage is the same). 63 characters have their own Burst
   Rush files that split a 360-Power hit into smaller ones. Kid Buu's first hit is 3 × 120 Power, so 3 hits of
   150 (450). Gogeta (GT) Super Saiyan 4's and Burter's first hits are 2 × 180, so 2 hits of 225 (450). The
   total is the same; only the hit count differs. Confirm on Kid Buu that his first Burst Rush hit counts as 3
   hits and totals 450.

## Blast hit splits

A blast's damage is the sum of its hits, and a capsule or skill scales each hit and rounds it up on its own
(README.md, fifth round: Energy Blast Barrage is 10 × 788 = 7,880 with Blast Burst, not 7,500 × 1.05 = 7,875).
661 of 743 blasts carry their hits (`blasts.json` `hits`). The 82 below have a measured total, but their hits
couldn't be worked out from the files, so a build scales them as **one hit**. Their base damage is right; with
damage buffs they can be up to 1 point low for each hit after the first.

**How:** equip **Blast Burst** only (+5% blast and ultimate damage) on the character, fire the move into the dummy
and note the **total**, plus the **hit count** if the combo counter shows it. Ultimates need Sparking! Mode (their
published damage already includes it). If the total matches the "one hit" column, the move is one hit. If it is
higher, it is several: each extra hit adds about 1 point of rounding, so (total − prediction) plus the hit count
pins the split. Characters are in roster order, so their forms are next to each other.

| Character | Move | Type | Base | One hit, with Blast Burst |
|---|---|---|---:|---:|
| Vegeta (Z - Early) Super Saiyan | B1 Maximum Flasher | Beam | 8,550 | 8,907 |
| Majin Vegeta | B2 Big Bang Attack | Fire | 8,907 | 9,263 |
| Vegeta (Super) Super Saiyan | B1 Galick Rush | Fire | 8,550 | 8,907 |
| Vegeta (Super) Super Saiyan God Super Saiyan | B2 Gamma Burst Flash | Short-Range Energy Attack | 9,478 | 9,844 |
| Vegeta (Super) Super Saiyan God | B1 God Shine Attack | Continuous Fire | 8,915 | 9,271 |
| Gohan (Teen) Super Saiyan | ULT Raging Masenko | Continuous Fire | 18,001 | 18,752 |
| Gohan (Adult) | B1 Explosive Cannon | Short-Range Energy Attack | 7,500 | 7,875 |
| Gohan (Adult) Super Saiyan | B1 Explosive Cannon | Short-Range Energy Attack | 9,004 | 9,380 |
| Gohan (Adult) Super Saiyan 2 | B1 Super Explosive Cannon | Short-Range Energy Attack | 9,376 | 9,752 |
| Great Saiyaman | B1 Justice Bomber | Explosive Wave | 8,754 | 9,192 |
| Piccolo | B1 Explosive Demon Wave | Short-Range Energy Attack | 7,500 | 7,875 |
| Piccolo (Fused with Kami) | B1 Special Beam Cannon | Beam | 7,490 | 7,846 |
| Piccolo (Fused with Kami) | B2 Light Grenade | Fire | 7,485 | 7,842 |
| Piccolo (Fused with Kami) | ULT Hellzone Grenade | Simultaneous Fire | 15,751 | 16,502 |
| Krillin | ULT Chain Destructo Disc | Continuous Fire | 14,252 | 15,002 |
| Tien | B2 Tri-Beam | Fire | 7,838 | 8,194 |
| Tien | ULT Neo Tri-Beam | Fire | 37,500 | 39,375 |
| Trunks (Melee) | B1 Burning Attack | Fire | 7,485 | 7,842 |
| Super Trunks | B2 Burning Attack | Fire | 7,485 | 7,842 |
| Master Roshi | ULT Evil Containment Wave | Short-Range Energy Attack | 15,000 | 15,938 |
| Mecha Frieza | B2 Fissure Slash | Fire | 8,250 | 8,625 |
| Frieza (Z) Full Power | B1 Death Saucer | Fire | 9,936 | 10,311 |
| Cell Perfect Form | ULT Perfect Barrier | Explosive Wave | 20,130 | 20,919 |
| Cell Jr. | B1 Special Beam Cannon | Beam | 6,181 | 6,507 |
| Super Buu (Gotenks Absorbed) | B2 Special Beam Cannon | Beam | 8,918 | 9,274 |
| Chiaotzu | B2 Psychic Rock Throw | Fire | 6,413 | 6,769 |
| Chiaotzu | ULT Farewell, Mr. Tien | Rush | 16,250 | 17,153 |
| Uub (GT) | ULT Super Explosive Wave | Explosive Wave | 17,000 | 17,772 |
| Nam | B1 Shura Gekiretsuken | Rush | 6,533 | 6,952 |
| Nappa | B1 Volcano Explosion | Lock-On Explosion | 7,876 | 8,314 |
| Nappa | B2 Blazing Storm | Sweep | 5,852 | 6,177 |
| Super Zarbon | ULT Monster Crush | Rush | 15,688 | 16,560 |
| Captain Ginyu | B2 Galaxy Dynamite | Fire | 7,125 | 7,482 |
| Jeice | B2 Crusher Ball | Fire | 6,769 | 7,125 |
| Android 17 (Z) | B1 Full-Power Energy Ball | Fire | 6,826 | 7,152 |
| Android 17 (Super) | B2 Super Electric Strike | Fire | 7,838 | 8,194 |
| Android 18 | B2 Energy Wave | Beam | 7,878 | 8,253 |
| Android 18 | B2 Chain Destructo Disc (SPM3) | Fire | 7,872 | 8,246 |
| Dr. Gero | B2 Bionic Punisher | Sweep | 6,500 | 6,825 |
| Babidi | B2 Ultimate Explosive Power | Lock-On Explosion | 8,316 | 8,754 |
| Broly (Z) Super Saiyan | B1 Bloody Smash | Rush | 9,713 | 10,155 |
| Broly (Super) Super Saiyan (Full Power) | B2 Blaster Meteor | Explosive Wave | 11,879 | 12,336 |
| Lord Slug | B2 Darkness Eye Beam | Sweep | 6,176 | 6,502 |
| Lord Slug Giant Form | B1 Darkness Eye Beam | Sweep | 7,804 | 8,129 |
| Lord Slug Giant Form | B2 Super Explosive Wave | Explosive Wave | 11,003 | 11,461 |
| Cooler | B2 Darkness Eye Beam | Sweep | 7,152 | 7,477 |
| Metal Cooler | B2 Finger Blitz Barrage | Continuous Fire | 8,300 | 8,613 |
| Salza | B2 Spread Finger Beam | Beam | 7,500 | 7,875 |
| Janemba | B2 Rapid Cannon | Simultaneous Fire | 9,640 | 10,059 |
| Janemba | ULT Illusion Smash | Rush | 18,750 | 19,565 |
| Super Janemba | B2 Lightning Shower Rain | Simultaneous Fire | 8,125 | 8,450 |
| Hirudegarn | B1 Chou Makousen | Short-Range Energy Attack | 10,052 | 10,471 |
| Hirudegarn | B2 Super Explosive Wave | Explosive Wave | 11,005 | 11,465 |
| Baby Vegeta (GT) | B2 Finger Blitz Barrage | Continuous Fire | 6,580 | 6,893 |
| Syn Shenron (GT) | B2 Blazing Storm | Sweep | 7,152 | 7,477 |
| Whis | B2 Symphonic Destruction | Short-Range Energy Attack | 10,501 | 10,877 |
| Demon King Piccolo | B1 Soumasen | Sweep | 6,500 | 6,825 |
| Toppo | B1 Justice Flash | Continuous Fire | 7,200 | 7,514 |
| Toppo God of Destruction | B1 Destruction Flash | Continuous Fire | 8,140 | 8,453 |
| Toppo God of Destruction | B2 Sphere of Destruction | Fire | 9,263 | 9,619 |
| Piccolo (Super Hero) | B2 Full Power Rush | Rush | 8,794 | 9,213 |
| Orange Piccolo | B2 Fierce Fist | Rush | 10,888 | 11,307 |
| Orange Piccolo | ULT Special Beam Cannon | Rush | 19,501 | 20,252 |
| Goku (Mini) | B1 Quick Rush | Rush | 7,750 | 8,138 |
| Goku (Mini) | B2 Take This! | Rush | 8,375 | 8,794 |
| Goku (Mini) Super Saiyan | B1 Energy Strike | Rush | 8,913 | 9,300 |
| Goku (Mini) Super Saiyan | B2 High-Speed Strike | Rush | 9,640 | 10,059 |
| Vegeta (Mini) | B2 Rising Rush | Rush | 8,376 | 8,796 |
| Vegeta (Mini) Super Saiyan | B2 Overpowering Crush | Rush | 9,640 | 10,059 |
| Glorio | B2 Electric Whip | Rush | 8,375 | 8,794 |
| Third Eye Gomah | B2 Magic Stream | Sweep | 7,152 | 7,477 |
| Majin Kuu | B1 Cresent Energy Wave | Fire | 7,485 | 7,842 |
| Majin Kuu | B2 Majin Corkscrew Attack | Rush | 7,875 | 8,250 |
| Majin Duu | B1 Powerful Cannon | Fire | 7,838 | 8,194 |
| Trunks (GT) Super Saiyan | B2 Rising Buster | Rush | 9,632 | 10,050 |
| Ma Junior | B2 Demonic Chase Grenade | Fire | 8,016 | 8,372 |
| Tien (World Tournament) | B2 Volleyball Fist | Rush | 8,794 | 9,213 |
| Uub (Kid) | B1 Shout Impact | Short-Range Energy Attack | 5,852 | 6,228 |
| Tora | B1 Full Power Energy Blast Volley | Continuous Fire | 4,455 | 4,689 |
| Tora | B2 Flame Storm | Sweep | 6,176 | 6,502 |
| Chilled | B1 Death's Razor | Beam | 7,950 | 8,275 |
| Chilled | B2 Death Rain | Continuous Fire | 11,028 | 11,479 |
