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
| Smash in 5 directions (Smash) | normal 540, part charged 900, full 1,120, just-timed 1,120, hyper 1,960 (675, 1,125, 1,400, 1,400, 2,450) | no | smash, confirmed for normal (Tien) |
| Heavy Finish (rush follow-up) | normal 540, part 900, full 1,120 | no (9 characters gain less ki from it) | combo or smash: test 1 |
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
| Charged ki blast (normal charge) | 700, 0.3 bars for most | 241, 15 | Power is read today but not shown; channel: charged ki blast |
| Charged ki blast, part and full charge | 700, 1 bar | 46 have them | |
| Directional charged ki blasts | 750, 1 bar | 46 | |
| Dash ki blast | 200, cost 0.12 to 0.2 | 241, 6 | |
| Dash charged ki blast | 700 for most | 241, 15 | |
| Step charged ki blast | 750 for most | 241, 23 | |
| Jump ki blast (cost only) | cost 0.135 for most | 241, 5 | |
| Jump charged ki blast | 700 for most | 241, 16; 46 have charge levels | |

The counts (ki blasts, jump and dash ki blasts) are already in the concept's "Combat limits" section. Some
charged ki blasts fire several projectiles or hit several times. Like blasts, they need hit counts and spot
checks before their totals can be published (test 2).

## Other per-character values not shown yet

- **Movement ki costs:** Dragon Dash (start, per second, boost), Z Burst Dash, dash up and down, Dragon Homing,
  and the step-cancel short dash (six different costs). Nine characters pay 15% less. This would make a
  "Mobility" section next to the short dash.
- **Low-health buffs:** 15 characters gain a buff when their health drops to 10,000 or 5,000.
- **Skill gauge gains:** repelling a blast gives ×1.1 to ×1.6 (178 characters), and one character gains double
  from fast avoids.
- **Guard crash:** 34 characters have a different ki damage rate when their guard is crashed.

## Suggested order

1. **Charged ki blast** (normal charge) for everyone. Its Power is already read and the channel is known.
2. **Jump and dash ki blasts.**
3. **Charged smash levels and Heavy Finish,** after test 1 settles the channel.
4. **A Mobility section** for movement ki costs.
5. **Low-health buffs,** shown as a trait.
6. **The other follow-ups and counters,** in Full stats only, since they are the same for everyone apart from
   class and DP.

## Tests for the league

1. **Tien's normal Heavy Finish** (rush, then the smash finisher): 675 means it uses the smash channel, 743 the
   combo channel.
2. **Goku's normal-charge charged ki blast:** predicted 875, if it lands as one hit.
3. **Name the inputs** for the rush B chain, the "激烈ラッシュ" rushes and the 激烈ラッシュ chain.
4. **Goku's fully charged smash:** predicted 1,400.
