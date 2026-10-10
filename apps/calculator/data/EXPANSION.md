# Stat expansion: what the game files can add

A survey of the FModel snapshot (2026-10-10, `scripts/survey-fmodel.mjs`) for values the calculator does not show
yet. It covers melee attacks, ki blasts and other per-character values. The redesign's Full stats and the sheet
should be planned with these in mind.

## How damage is worked out

Every attack below follows the rule the calculator already uses:
`ceil(Power × 1.25 × (DP scale + class channel + capsules + skills))`. Each attack family uses one of the
game's 11 damage channels: rush, smash, combo, throw, counter, pursuit, ki blast, charged ki blast, skill, super
and ultimate. The engine already carries all 11 (`coef` in `characters.json`), so a new attack mostly needs its
Power and its channel.

Rush and ki blast follow the rule exactly. Goku's rush A chain (312, 312, 312, 432, 600) gives the published
390/390/390/540/750, and his ki blast (200) gives 250.

## Melee: 323 actions

**The main finding:** nearly every melee attack has the same base Power for the whole roster. A character's
melee damage differs only through DP, class channel, capsules and skills. The exceptions are the 11 Giant-class
characters (their own rush, smash and throw values) and about 10 to 15 characters whose rush hits are split
into several hits.

| Family (game category) | Base Power (Goku's damage) | Varies by character? | Channel |
| --- | --- | --- | --- |
| Rush A chain, the calculator's rush (Rush) | 312 ×3, 432, 600 (390 ×3, 540, 750) | Giants; split hits for ~13 | rush, confirmed |
| Rush B chain (Rush) | 336 ×3, 504, 1,008 (420 ×3, 630, 1,260) | Giants; split hits for ~14 | rush, assumed |
| Air rush A and B (rush follow-up) | as the A and B chains | split hits for ~14 | to check |
| "激烈ラッシュ" rush A and B (Rush) | as the A and B chains | split hits for ~13 | rush, assumed |
| "激烈ラッシュ" chain (unique move) | 360 ×4 | split hits for ~13 | to check |
| Smash in 5 directions (Smash) | normal 540, part charged 900, full 1,120, just-timed 1,120, hyper 1,960 (675, 1,125, 1,400, 1,400, 2,450) | no | smash; confirmed for normal (Tien) and full (Goku 1,400) |
| Heavy Finish (rush follow-up) | normal 540, part 900, full 1,120 | no (9 characters gain less ki from it) | combo, confirmed (Tien 743) |
| Lift Strike / Grand Slash | 540 / 720 / 1,070 and 500 / 620 / 1,010 | no | combo, assumed |
| Rolling Hammer | 270 / 340 / 450 | no | combo, assumed |
| Kiai Cannon / ki explosion (rush follow-ups) | 620 / 810 / 1,070 | no | combo, assumed |
| Other rush follow-up combos (about 25: Mid-air kick, etc.) | 190 to 740 per hit | no | combo, assumed |
| Jump smash, step smash | 280 / 450 / 780 | no | smash, assumed |
| Dragon Dash attacks (5 directions) | 540 normal, 1,120 charged | no | to check |
| Pursuit: follow-ups, vanishing attacks | 1,000 (1,250), lightning 460 | no | pursuit; the published Pursuit is 1,250 |
| Counters: Z counters, Revenge Counter | 1,000 to 1,070 | no | counter, assumed |
| Throw | 1,000 (1,250); 15 characters differ | yes | throw, confirmed |
| Vanishing Assault | near 1,000, far 520 | far: 11 differ | to check |

Each attack also records the ki it gains on hit (`EnergyGain`): 390 per rush hit, 845, 1,300 and 1,755 for
normal, part and full charged smashes. The class's attack ki gain scales it.

Names in quotes are the game's own labels, still untranslated. The league needs to say which in-game inputs the
B chain, the "激烈ラッシュ" rushes and the 激烈ラッシュ chain are (test 3).

## Ki blasts: 49 actions

Ki blasts vary per character far more than melee does.

| Family | Base Power and ki cost | Characters, distinct values | Note |
| --- | --- | --- | --- |
| Ki blast (shown today) | 200, 0.2 bars | 241, 5 | in use |
| Charged ki blast (normal charge) | 750 standing (`actSTDSMBN`, Goku measured 938), 700 moving (`actSMBN`); 0.3 bars for most | 241, 15 to 23 | the build reads the 700 one today, unshown; channel: charged ki blast |
| Charged ki blast, part and full charge | 700, 1 bar | 46 have them | |
| Directional charged ki blasts | 750, 1 bar | 46 | |
| Dash ki blast | 200, cost 0.12 to 0.2 | 241, 6 | |
| Dash charged ki blast | 700 for most | 241, 15 | |
| Step charged ki blast | 750 for most | 241, 23 | |
| Jump ki blast (cost only) | cost 0.135 for most | 241, 5 | |
| Jump charged ki blast | 700 for most | 241, 16; 46 have charge levels | |

The counts (ki blasts, jump and dash ki blasts) are already in the concept's "Combat limits" section.

### Ki blast traits

Beyond damage, each ki blast records how it behaves:
- **Shots** (`FireNum`).
- **Charge levels:** a damage multiplier per level (`ChangePerChargeLv`): ×1.5 and ×2 for most, ×1.15 and ×1.75,
  ×1.05 and ×1.1, or ×1.2 and ×1.8 for others.
- **Tracking:** the homing angle and how long it homes.
- **Speed:** a speed curve, in separate files the snapshot doesn't capture yet.
- **Range:** speed over the blast's lifetime.
- **Paralysis:** the "Numb" bullet category.

The characters fall into a few archetypes, which suits trait tags better than numbers.

**Ki blast (normal):**

| Archetype | Speed at 0.5 s, range | Characters |
| --- | --- | --- |
| Standard | 10,000, 11,000 | 214 |
| Laser (fast, long range) | 20,000, 23,500 | 14: the Frieza forms, Mecha Frieza, King Cold, Cooler forms, Metal Cooler, Frost, Perfect Cell |
| Giant (slow, big) | 8,500, 9,700 | the 11 Giants |
| Thrown objects | 10,000, 14,000 (life 1.5 s) | Mr. Satan, Yajirobe |
| None | | Nam, Eighter, Chi-Chi, General Blue, Uub (Kid): pressing ki blast does a Heavy Finish instead |

**Charged ki blast:**

| Archetype | Speed at 0.5 s, range | Characters |
| --- | --- | --- |
| Standard | 12,000, 35,000 | 142 |
| Slow homing | 5,000, 21,000 | 40, among them Piccolo, Krillin, Yamcha, Kid Buu, Broly (Z), Whis |
| Multi-shot, short range (2 to 8 shots) | 19,750, 9,000 (life 0.5 s) | 33, among them Goku (GT) SS4, Vegito, Gogeta, Jiren Full Power, Broly (Super), Caulifla |
| Paralyzing (very slow) | 3,000, 8,500 | 13: Chiaotzu, Guldo, Babidi, Lord Slug, Cooler, Cooler Final Form, Full-Power Bojack, Zangya, Frost, Ribrianne, Glorio, Third Eye Gomah, Ma Junior |
| Giant | 9,000, 28,000 (slow homing for Dr. Wheelo and Janemba) | the 11 Giants |
| Thrown object (Mr. Satan's grenade, Yajirobe's) | 12,000, 17,000 (life 1.5 s) | Mr. Satan, Yajirobe |

Speeds are the game's units (centimetres per second) and range is speed over the blast's life. The league adds
what the files can't show: thrown objects don't track and reach less far. Some charged ki blasts fire several
shots or hit several times. Like blasts, they need hit counts and spot checks before their totals can be
published (test 2).

## Mobility

**Movement speed is the same for everyone:** walk, run, fly, Dragon Dash and vanish speeds are identical in every
character's files. What differs:
- **Movement ki costs:** Dragon Dash (start, per second, boost), Z Burst Dash, dash up and down, Dragon Homing,
  and the step-cancel short dash (six different costs). Nine characters pay 15% less for all of them: Majin Buu
  (Evil), Zarbon, Burter, Zangya, Tapion, Nuova Shenron (GT), Dyspo, Kakunsa, Fasha. The Giants pay double to start
  a Z Burst Dash (2 bars instead of 1).
- **Short-dash acceleration:** 33 characters accelerate slower in a short dash (50,000 instead of 60,000), among
  them Nappa, Recoome, Majin Buu, Android 16, King Cold and Tapion.
- **Speed buffs:** 14 skills raise movement speed (the engine has them as `moveSpeed`), and capsules may too.

A Mobility section would hold the short dash (already shown), these ki costs and a "slower short dash" trait.

## Other per-character values not shown yet

- **Low-health buffs:** 15 characters gain a buff when their health drops to 10,000 or 5,000 (Goku (Z - Early),
  Goku (Teen), Majin Vegeta, Future Trunks, Bardock, Goku Black and others).
- **Skill gauge gains:** repelling a blast gives ×1.1 to ×1.6 (178 characters), and one character gains double
  from fast avoids.
- **Guard crash:** 34 characters have a different ki damage rate when their guard is crashed.

## Suggested order

Agreed with the league on 2026-10-10.

1. **Charged ki blast** for everyone: damage, cost, shots, charge levels, and its archetype as trait tags (slow
   homing, multi-shot, paralyzing, thrown, none). Give the normal ki blast its archetype too (laser, thrown,
   none). Speed curves need adding to `pull-fmodel.mjs` first.
2. **Jump and dash ki blasts.**
3. **Charged smash levels and Heavy Finish.** Test 1 settled the channel: rush follow-ups use combo.
4. **A Mobility section:** movement ki costs and the slower short dash.
5. **Low-health buffs,** shown as a trait.
6. **The other follow-ups and counters,** in Full stats only, since they are the same for everyone apart from
   class and DP.

## Tests for the league

Results from 2026-10-10:

1. **Tien's Heavy Finish: 743, so the combo channel.** Tien's Heavy Finish is his third rush chain: 3 rush hits
   (1,287), then the finisher, 2,030 in all. Rush follow-ups (the game's RushDerivative category) use the combo
   channel, and plain smashes the smash channel.
2. **Goku's charged ki blast: weakest charge 938, full charge 1,975.**
   - 938 is exactly 750 × 1.25. So the standing charged ki blast reads `actSTDSMBN` (Power 750), not
     `actSMBN` (700, the character data's "EnergyBulletSmash" action). `actSMBN` is probably the version fired
     while moving.
   - The file's charge levels are ×1.5 and ×2, which predict 1,407 and 1,875. Full charge measured 1,975, about
     5% more, which the files don't explain yet.
   - Follow-up: test the middle charge (×1.5 predicts 1,407), and say whether anything was equipped.
3. **Input names (the league's reading):**
   - The rush **B chain** is the combo B that continues after a step-in mid-combo. This fits the files: it is a
     second 5-hit Rush chain, separate from the follow-up chains. Heavy Finish into Heavy Crush is a rush
     follow-up: Heavy Crush is `actHC1`-`HC3`.
   - **激烈ラッシュ** reads as "Furious Rush". It may be the **Violent Rush** that some characters have in Sparking
     Mode, where mashing rush combos without end. There are two families: rush-category `actRSHS*` (the same
     Power as rush A and B) and `actBSR*` (360 a hit, 450 for Goku).
   - To check: does a character with Violent Rush deal 450 a hit with it, and does a character without it still
     have those actions in its files?
4. **Goku's fully charged smash: 1,400,** as predicted. The smash charge levels read correctly.
