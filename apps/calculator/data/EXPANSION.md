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
| Violent Rush A and B (Rush; Sparking only) | as the A and B chains, 4 hits on a loop | split hits for ~13 | rush, assumed |
| Burst Melee Attack, then Burst Rush (unique move; Sparking only) | 1,000, then 360 a hit (1,250, then 450) | Burst Rush split hits for ~13 | measured for Goku |
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

## Armor and armor breaking (done in the data, 2026-10-10)

`armor` in `characters.json` (`scripts/lib/armor.mjs`), from three game tables now in the snapshot (tables.csv:
`armor`, `armorBreak`, `armorLevel`):
- **Armor types and their damage rates** (`ArmorData`): Super Armor 0.5, Hyper Armor 0.9, Sparking Armor 0.75,
  and several 0 (full) armors for barriers, Vanishing Assault and so on.
- **Armor situations** (`ArmorLevel_Common`): a hyper-armor holder has Hyper Armor at level 2, and Sparking Armor at
  level 4 while Sparking. A character with Sparking armor has it at level 3. Smashing and rush follow-ups give
  Super Armor at 3; blasts, ultimates and super counters at 9; barriers at 10.
- **Each attack's break level** (`ArmorBreakLevelData`, the label every attack file carries): its 10-entry
  `BreakLevel` list is indexed by the attacker's **DP - 1**, and a Giant attacker uses `BreakLevelForGiant`. A
  charged ki blast's charge levels keep the base label (their `ChangePerChargeLv[].ArmorBreakLevel` is None).
- **A hit breaks armor when its break level is at least the armor's level.**

Checked:
- **Every character's published armor break** follows from this. It is the hits to break Hyper Armor: DP 1-4
  give 5, DP 5 gives 4, DP 6 gives 3, DP 7+ gives 1, and Giants give 1.
- **The league's measurements:** Goku (Z - Early)'s fully charged ki blast (break level 3) against base Janemba's
  Hyper Armor (level 2) breaks it (1,919), and against his Sparking Armor (level 4) doesn't (1,439).
- **Roster:** 185 characters have no armor, 42 Sparking Armor (level 3) in Sparking, and 14 Hyper Armor (level 2)
  that turns into Sparking Armor (level 4) in Sparking.

- **Ties break armor** (measured): Goku's fully charged ki blast (level 3) against Sparking Bardock's Sparking
  Armor (level 3) broke it, 1,875.
- **In the engine (2026-10-10):** `computeStats` gives each side's armor level and its attacks' break levels, and
  `armorFactor` decides one hit. Break-level effects add: Draconic Aura +3, Dragon Rush +3 on rush hits, and the
  common Sparking buff (`Buff_Common_SP`, `ArmorBreakLevelUp` 3; 1 for one character), which raises every attack
  while Sparking.
- **To test (Sparking break bonus):** Goku (Z - Early) **in Sparking**, fully charged ki blast against Sparking
  Janemba. Its break level 3 + 3 = 6 beats his level 4, so the files predict 1,919 (no armor), against 1,439 when
  Goku isn't Sparking. His first rush hit while Sparking (1 + 3 = 4) should also break it.

## Burst attacks (measured 2026-10-10)

The Burst Melee Attack (`actBSA`, 1,000 Power) deals 1,250, and the first Burst Rush hit 450, with or without
Kaioken. The files explain why:
- **Buffs raise damage by channel,** and a channel follows the attack's category (`ActionCategoryType` in
  `MasterDataAsset/Action`). Kaioken's buff (`Buff_0000_00_actEXA2_S11`) raises eight channels by 10%: Rush,
  Smash, ComboAttack (rush follow-ups), Throw, Parry (counters), Pursuit, RushBullet and SmashBullet (ki blasts).
  It also adds 10% Combatives, Energy and Shave damage resistance.
- **The game's buffs use 12 damage channels in all:** those eight, the three blast ones (BlastForte, Blast,
  BlastUltimate) and Interrupt (4 buffs; the Interrupt category is the Z and Revenge counters).
- **Burst Melee Attack and Burst Rush are UniqueMoveDerivation,** a category no channel covers, so no buff raises
  them. They may ignore class and DP too: 1,250 is exactly 1,000 × 1.25, and Goku's multipliers are all 1.
- **Confirmed fixed by class:** Vegeta (Z - Scouter), whose melee is ×0.9 by class, also deals 1,250 and 1,700.
- **But one modifier does reach them:** `NormalCombativesDamageScale`, a general melee damage modifier (league,
  2026-10-10). It raises Burst attacks and most likely every melee attack. Today only capsules outside the league's
  list use it: Evil Strike and Strike of Justice (+5% per step), Melee Attack Boost Ultra, and Melee Attack Zero.
  The engine needs an "all melee damage" effect for it, applying to every melee channel and to Burst attacks,
  before any league capsule or buff uses it.

The engine needs this mapping (category to channel) once the other rush follow-ups and counters are published.
Not in the published data yet.

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

## Moveset (done in the data, 2026-10-10)

`moveset` in `characters.json` (`scripts/lib/moveset.mjs`), in the game's own names from its controls guide
(`MasterDataAsset/OperationGuide`):
- **Rush Chains:** the four chain types in order (Heavy Finishes, Ki Blast Cannon, Flying Kicks, Rolling Hammer,
  Blaster Wave, Rush Ki Waves), from `ReplaceTransitionAction_<id>`, each with its follow-ups.
- **Step-In Chain, Rush-In Attack and the counter's follow-up.** The counter's meaning is unchecked.
- **Moves the character lacks, and its abilities.**

How the follow-ups are read:
- Each chain type has fixed follow-ups: Heavy Finishes gives Heavy Crush and Delta Heavy Finish; Ki Blast Cannon
  gives Ki Blast Cannon Smash and Ki Blast Cannon Attack; Rolling Hammer gives Rolling Hurricane and Rolling Press;
  Blaster Wave gives Blaster Wave Combo; Rush Ki Waves gives Energy Storm.
- **An ActionFlag turns a move off.** This was checked against the in-game lists of Goku (Z - Early), Tien and
  the three Broly (Z) forms: CannonCombo turns off Ki Blast Cannon Smash, TriAttack Ki Blast Cannon Attack,
  PowerPress Rolling Press, DeltaStorm Delta Heavy Finish, RollingHurricane Rolling Hurricane, SparkingRush
  Violent Rush.
- verify-data checks the five lists (Goku, Tien, the three Broly (Z) forms). Tien's order, Ki Blast Cannon, Flying
  Kicks, Heavy Finishes, Heavy Finishes, is right: the other screenshot was Tien (World Tournament).
- **Grand Slash's follow-ups** (`moveset.grandSlash`): AirRush turns off Aerial Slash (Tien has the flag and only
  Tornado Slash; Goku has neither flag and both), and DragonTornado turns off Tornado Slash (confirmed: Krillin and Goku
  (Teen) show only Aerial Slash). Gamma 1's in-game list matches too. Roster: both 60, Tornado Slash only
  108, Aerial Slash only 54, neither 16, no Grand Slash 3 (Giants).
- Flags without a known in-game name (REPORT.md "Moveset"): BlastRepel (Broly (Z) LSS), EnergyWave, RollingHammer,
  Explosion (only Goku (Mini), Glorio, Vegeta (Mini) Super Saiyan 3). Goku (Mini)'s in-game list matches the files
  (Flying Kicks | Heavy Finishes: Heavy Crush | Heavy Finishes: Heavy Crush | Flying Kicks; Grand Slash: Aerial
  Slash), so his EnergyWave and RollingHammer flags turn off nothing he would otherwise show: most likely chain
  types he doesn't use (Rush Ki Waves, Rolling Hammer).

## Move and ability flags

Each character's file sets which moves and abilities it has (`ActionFlag.*`, `AbilityFlag.*` in
`character-values.csv`). This would give each character a moveset and trait list:
- **No Violent Rush** (`SparkingRush`, confirmed in game), 50 characters: Great Ape Vegeta, Master Roshi Full Power,
  Frieza (Z) 2nd Form, Frieza (Z) Full Power, Cell 2nd Form, Majin Buu, Mr. Satan, Chiaotzu, Yajirobe, Eighter,
  Chi-Chi, Nappa, Super Zarbon, Dodoria, Recoome, Guldo, King Cold, Android 16, Android 19, Dr. Gero, Babidi, Frieza
  Force Soldier, the five Broly forms, Super Garlic Jr., Dr. Wheelo, Lord Slug, Lord Slug Giant Form, Cooler Final
  Form, Fusion Android 13, Full-Power Bojack, Janemba, Hirudegarn, Great Ape Baby (GT), Spopovich, Fused Zamasu
  Half-Corrupted, Jaco, Kale, Kale Super Saiyan (Berserk), Toppo God of Destruction, Anilaza, Cheelai, Orange
  Piccolo Giant Form, Cell Max, Panzy, Giant Gomah, Ma Junior Giant Form.
- **No ki blasts** (`CannotShoot`, a Heavy Finish replaces them): Nam, Eighter, Chi-Chi, General Blue, Goku (Mini),
  Uub (Kid). Goku (Mini)'s flag is for his first costume, a power-restricted version the league doesn't use; with
  his second costume he shoots. Keep showing his ki blasts (limit 5) and ignore the flag for him.
- **Thrown ki blasts** (`StoneKidan`; they can't be fired while moving): Mr. Satan, Yajirobe.
- **Hyper armor:** the 11 Giants, Broly (Z) Legendary Super Saiyan, Broly (Super) Super Saiyan (Full Power), Kale
  Super Saiyan (Berserk).
- **Cannot fly:** 14, among them Goku (Teen), Master Roshi, Mr. Satan, Yajirobe, Chi-Chi, Jaco, Uub (Kid).
- **Cannot charge ki:** 15. **No Crash Impact:** 17. **No Power Impact:** 8.
- **Ki drain:** Super 17 (GT), Android 19, Dr. Gero. **Immune to drain:** 8 androids and Dr. Wheelo.
- **Other moves:** Super Z Counter (15), Throw Escape (21), Dragon Tornado (73), Rolling Hurricane (45), Spiral
  Slash (49), Heavy Crush (81), Tri Attack (170), Delta Storm (98), Air Rush (127), and smaller sets such as
  Burst Smash, Lightning Attack and Vanishing Attack.

A few flags (`AutoReflect`, `bCanHighSpeedMove`, `bCanSuperHighSpeedMove`) are stored mostly as `false`. Their
defaults need checking before they are read.

## Suggested order

Agreed with the league on 2026-10-10.

1. **Done in the data (2026-10-10):** `characters.json` has `kiBlasts` (see `scripts/lib/kiBlasts.mjs`). Ten
   standing multi-shot files (`actSTDSMBN3_Shots3`, e.g. Goku (GT) SS4, Caulifla) and Fasha's moving one leave
   Power at the game's default, which the files don't show; their damage is null until one is measured (a single
   shot of Goku (GT) SS4's standing charged ki blast, no charge, gives the default). The redesign still has to
   show it. Original plan: **Charged ki blast** for everyone: damage, cost, shots, charge levels, and its archetype as trait tags (slow
   homing, multi-shot, paralyzing, thrown, none). Give the normal ki blast its archetype too (laser, thrown,
   none). The snapshot has the speed curves since 2026-10-10 (`MoveParam.SpeedCurve` in bullet-params, keys in
   curves.csv).
2. **Jump and dash ki blasts: done in the data** (`kiBlasts.jump`, `kiBlasts.dash`: damage, count, cost, tags).
   A file without Power uses the game's default, **250**: Goku's jump ki blast (its file has none) measured 313
   (2026-10-10; it fires a volley of 5 on one press). The same default fills the ten multi-shot charged ki blasts.
3. **Charged smash levels and Heavy Finish.** Test 1 settled the channel: rush follow-ups use combo.
4. **A Mobility section: done in the data** (`mobility` in `characters.json`, `scripts/lib/mobility.mjs`): can
   fly, slower short dash, step-cancel cost, and the start and per-second ki costs of Dragon Dash, Z Burst Dash,
   dash up and down, and Dragon Homing. To confirm in game: that `LP` costs are per second, and what Dragon
   Dash's `BK` cost is (published as `boost`).
   The second Dragon Dash loop cost is the **High-Speed Dragon Dash** (a Dragon Dash started with no direction);
   `SpCostBK` (published as `bk`) is still unknown.
   Also done: **charged smash levels, hyper smash and Heavy Finish** (`chargedMelee`). **The Giants' smash: the game
   files are right.** Measured Great Ape Vegeta 1,722 / 3,570 and Ma Junior Giant Form 1,688 / 3,500 (normal /
   full charge); Capsule Corp's smash was 675 too high for all 11 Giants, and the published smash now comes from
   the files.
5. **Low-health buffs,** shown as a trait.
6. **The other follow-ups and counters,** in Full stats only, since they are the same for everyone apart from
   class and DP.
7. **Rush Chain damage in the Moveset (the league's choice, 2026-10-10):** each chain row shows its damage at
   its charges and its follow-ups' hits, only for the chains the character has. Heavy Finish stays in Melee too.
   Data done 2026-10-11 (`rushChainDamage`); the UI is next.

## Tests for the league

Results from 2026-10-10:

1. **Tien's Heavy Finish: 743, so the combo channel.** Tien's Heavy Finish is his third rush chain: 3 rush hits
   (1,287), then the finisher, 2,030 in all. Rush follow-ups (the game's RushDerivative category) use the combo
   channel, and plain smashes the smash channel.
2. **Goku's charged ki blast: 938, 1,407 and 1,875** at the weakest, middle and full charge, and **875 at the
   weakest charge while moving.** Every value matches the files:
   - Standing, it reads `actSTDSMBN` (Power 750): 938, ×1.5 = 1,407, ×2 = 1,875.
   - Moving, it reads `actSMBN` (Power 700): 875.
   - The charge levels (`ChangePerChargeLv` DamageRate) apply to Power. The build reads only the 700 one today.
3. **Input names (the league's reading):**
   - The rush **B chain** is the combo B that continues after a step-in mid-combo. This fits the files: it is a
     second 5-hit Rush chain, separate from the follow-up chains. Heavy Finish into Heavy Crush is a rush
     follow-up: Heavy Crush is `actHC1`-`HC3`.
   - **激烈ラッシュ ("Furious Rush"):** two groups of game actions carry this label, and every character has both:
     - `actRSHSA1`-`A4` and `actRSHSB1`-`B4`: rush category, with the same Power as the normal rush hits (312, 312,
       312, 432 for A). This fits the Violent Rush: the normal rush combo on a loop with no damage modifier.
     - `actBSRA1`-`A4` and `actBSRB1`-`B4` are the **Burst Rush** ("unique move" category, 360 a hit): in Sparking
       Mode, after a Z Burst Dash behind the opponent, the Burst Melee Attack (`actBSA`, 1,000), then mashing rush.
       Measured for Goku (Z - Early): the Burst Melee Attack 1,250 and its first Burst Rush hit 450 (1,700 in all),
       as the files predict. `BS` in an action name means Burst (`actBSS*` are probably the Burst Smashes).
   - The 50 characters with `ActionFlag.SparkingRush` are **not** the Violent Rush or Burst Rush list: Goku (Z - Early) and Tien
     have the Violent Rush in game but not the flag. The flagged characters have the same action files as everyone
     else. **The flag means "no Violent Rush"** (confirmed 2026-10-10: Nappa, Chi-Chi, Ma Junior Giant Form,
     Broly (Z) and Broly (Z) Legendary Super Saiyan are flagged and can't; Broly (Z) Super Saiyan isn't and can).
4. **Goku's fully charged smash: 1,400, and his Hyper Smash: 2,450 (1,960 × 1.25),** both as predicted. The smash charge levels read correctly.

Pending league tests, with predictions, are in `TESTS.md`.

### Rush Chain tests (run 2026-10-11)

Results, now in `characters.json` `rushChainDamage` (`scripts/lib/rushChains.mjs`) and checked by verify-data:

1. **Chains use the combo channel.** Tien's Ki Blast Cannon: 853 uncharged, 1,472 fully charged (smash would
   give 775 and 1,338).
2. **An attack file with no Power uses 300.** Goku's Flying Kicks: 1,150 (two kicks of 375 and the finisher's
   400); they can't be charged. Piccolo's fully charged Rush Ki Waves: 1,875, 5 hits of 375.
3. **Bardock's Rolling Hammer:** 338 uncharged (one hit, as the files say), then Rolling Hurricane 500 and 800.
   **Open:** fully charged it measured 1,150, against the files' 563 for one hit. 1,150 is exactly Flying Kicks'
   total (Bardock's fourth chain), so re-check it, with the part charge too.
4. **No combo scaling yet:** Heavy Crush after Heavy Finish lands 350, 425 and 563, at full damage.
5. **Ki Blast Cannon Attack:** 625, 775, 925 after the fully charged cannon (1,338).
6. **Rush Ki Waves land 5 hits** (the files have 3): 625 uncharged, 1,875 fully charged. **Energy Storm**'s first
   press is two hits, 738 and 488 (1,226), then a flurry of ki blasts (224 in the test): ki blast shots of up to
   157, so its total depends on how many land. **Open:** how many shots landed, and the part charge (no Power in
   the files, so 1,875 like the full charge, unmeasured).
7. **Blaster Wave:** 814 uncharged, 1,405 fully charged. **Blaster Wave Combo** is `actBC1` and `actBC2`: 657 and
   814 for Goku (GT).
8. **Follow-ups that need the chain fully charged:** Ki Blast Cannon Attack, Energy Storm, Blaster Wave Combo.

Not measured yet: Ki Blast Cannon Smash (`actSCS`, 640), Delta Heavy Finish (`actDS1`-`3`), Rolling Press
(`actPP1A`, `actPP2`), and characters with their own chain files (Flying Kicks for about 5 characters).

### Third round (run 2026-10-11)

- **Rush Ki Waves part charged:** 1,625 for Piccolo (5 hits of 260 Power; the files give none).
- **Aerial Slash** is the Flying Kicks animation: three kicks in one press (Goku 1,125), then the finisher (400).
- **Lift Strike:** Goku 675 / 900 / 1,338, as the files predicted.
- **Energy Storm's flurry:** the target is falling, so each shot deals its shave damage (the bullet's Shave 25:
  32 a shot for Piccolo), not its Power; 224 was 7 shots landing (the league's reading, which the numbers fit).
- **Devilmite Beam** deals its damage x the opponent's wickedness / 20. Wickedness is the game's per-character
  ExParam (0 to 20; none given is 0; published as `wickedness`): Goku (Z - Early) 0 took 0; Frieza (Z) 1st Form 16
  took 28,350 (33,750 x 16/20, x his 1.05 blast defense). Only Devilmite Beam has the flag (bExScale).
- **Rush tracking:** 134 rush blasts home (`homing`, the files' ControllableTarget), 14 steer (`steering`,
  ControllableTurn). Of the steering ones, Justice Kick is a cinematic rush once it connects; the other 13 crash
  (`crash`: no cinematic). The rest give no value and go **straight** (`straight`: they head for where the opponent
  was and neither home nor steer; confirmed on Final Galick Cannon and Gigantic Swing, with Kaioken Attack and
  Piccolo's Explosive Breath Cannon homing).

### Second round (run 2026-10-11)

All in the data and checked by verify-data:

- **Bardock's Rolling Hammer** is one hit at every charge: 338, 425, 563 (the earlier 1,150 was the wrong chain).
- **Ki Blast Cannon Smash** needs a full charge: Tien 880. **Delta Heavy Finish** doesn't: Goku (GT) 473, 381, 552
  after an uncharged Heavy Finish (709; 1,470 fully charged).
- **Rolling Press**'s first press is several hits on one button: the 190 hit four times and the 600 one (Gamma 1:
  1,788), then 788.
- **Flying Kicks with their own files:** a file name can cover several hits ("actFLK_2-4" is kicks 2 to 4):
  Burter 864 in 5 hits, Tapion 770 in 4, Gogeta (Super) Super Saiyan 2,196 in 5.
- **Grand Slash** 625 uncharged, 1,263 fully charged; **Tornado Slash** 450, 363, 525.
- **Energy Storm's flurry** is 9 ki blasts that don't count as combo hits: 224 in all for Piccolo (about 25 a shot,
  not the bullet file's 125 Power); published as measured.
- **Follow-up limits:** no general limit in the files means 0. Videl can do only her 2 Dragon Homings; Mr. Satan
  none at all.
- **Interrupts** work while being hit (the 77 skills with the explosion and barrier interrupt flags).
- **The Sparking armor-break bonus:** Goku (Z - Early) in Sparking breaks Sparking Janemba's armor with his first
  rush hit and with a fully charged ki blast (1,919), as the common Sparking buff's +3 predicts.
- **Skills:** a skill's buffs come in lists of stages. Stages of one list follow each other (Give Me Your Energy!
  moves up when it is used again); buffs in other lists apply together on activation, like Instant Sparking's
  defense penalty, so they are not stages.
- **Blasts:** Future Trunks' Final Flash has no initial cost in game (the file's 3 bars are overridden in
  `curated/blasts.csv`); Panzy's Last Chance Shock does. The 34 point-blank blasts with backstep off get "No Step
  Back" (`noStepBack`, 51 blasts across forms); the 14 steerable rushes are flagged `crash` (to confirm).

### Rush Chain tests (proposed 2026-10-10)

The league wants every Rush Chain's damage on its row in the Moveset (the chain, then its follow-ups), shown only
for the chains a character has. The files give each chain's Power at three charges (`act<chain>N/P/F`) and each
follow-up's hits; these tests settle what the files leave open. For each, note the combo's total before and after
the chain (as in Tien's Heavy Finish test), on a dummy with no capsules or skills.

1. **Channel, Tien's Ki Blast Cannon** (Rush Chain 1: 1 rush hit, 429, then the cannon). Tien's combo
   coefficient is 1.1 and his smash 1.0, so the two channels differ. Combo predicts **853 uncharged, 1,472 fully
   charged**; smash would give 775 and 1,338. Then its follow-up, Ki Blast Cannon Smash: combo 880, smash 800.
2. **Flying Kicks have no Power in the files** (Goku (Z - Early), Rush Chain 3: 3 rush hits, 1,170, then the
   kicks). The two kick hits (`actFLK`, `actFLK_2`) carry no Power, so they use the asset's default, which is
   unknown; the fully charged version (`actFLKF`) is 320, so 400 for Goku. Note each kick's damage, uncharged
   and fully charged.
3. **Multi-hit chains, Bardock's Rolling Hammer** (Rush Chain 3: 3 rush hits, 1,170). The files give one hit:
   **338 uncharged, 425 part, 563 full**. Note how many hits it lands and each hit's damage. Then Rolling
   Hurricane: 500, then 800.
4. **Follow-ups and combo scaling, Goku's Heavy Crush** (Rush Chain 1: 1 rush hit, 390, Heavy Finish 675, then
   Heavy Crush). Predicted **350, 425, 563** for its three presses. Lower numbers mean later hits in a combo are
   scaled down, which Combo Master and Combo King reduce.
5. **Ki Blast Cannon Attack** (Goku (Z - Early), Rush Chain 2: 2 rush hits, 780, Ki Blast Cannon 775, then the
   attack). Predicted **625, 775, 925**.
6. **Rush Ki Waves and Energy Storm, Piccolo** (Rush Chain 2: 2 rush hits, 780). Uncharged waves: **3 hits of
   125**; the charged versions have no Power in the files, so note them. Energy Storm: **738, 488, then a ki
   blast of 157** (if the last hit is a ki blast, as the files say).
7. **Blaster Wave, Goku (GT)** (Rush Chain 2: 2 rush hits, 820). Predicted **814 uncharged, 1,064 part, 1,405
   full** (its Power matches Ki Blast Cannon's). Note Blaster Wave Combo's hits too: the files don't tie it to an
   action yet.
