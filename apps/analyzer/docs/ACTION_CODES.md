# Battle-result action codes

What the per-move hit codes in a match file mean, and which counters are safe to build
stats on. Worked out for the Character page's "How it fights" profile (Phase 3), with
the league confirming the game-side meaning and the match data checking the rest.

Each character entry in a `BR_Data` match file carries:

- `battleCount.attackHitCount` - hits landed, **per move code** (`(Key="actRSHA1")` etc.,
  about 230 codes). Hits, not uses: a multi-hit move counts every hit.
- `battleCount.runBlastCount` - blasts and skills **used**, per slot (`SPM1`, `SPM2`,
  `SPM3`, `ULT`, `EXA1`, `EXA2`).
- `battleCount.battleNumCount` - the game's own named totals (`shotEnergyBulletCount`,
  `guardCount`, `superCounterCount`, ...).

## Sources of truth, in order of trust

1. **Named counters** (`battleNumCount`, `runBlastCount`) - the game's own totals. Prefer
   these wherever one exists; only melee has no named counter.
2. **Codes the league has identified** from how the game plays.
3. **Codes confirmed by correlation** with a named counter across all matches.
4. **Codes inferred from their name** - noted as such below.

## Classification

| Category | Codes | Meaning | Basis |
|---|---|---|---|
| **Rush melee** | `RSHA1-5`, `RSHB1-5`, `ARSHA1-5`, `ARSHB1-5` | Rush combo strings. `RSHA` is the usual opener; `RSHB` normally follows it, but some characters open straight into it. `A` prefix is likely the aerial version. | League; `A` prefix inferred |
| **Heavy melee** | `SCN/F/P` | Ki Blast Cannon (rush chain) | League |
| | `HFN/F/P`, `AHFN` | Heavy Finish (rush chain) | League |
| | `FLK`, `FLKF` | Flying Kick (rush chain) | League |
| | `RWN/F/P` | Rush Ki Waves (rush chain) | League |
| | `RHNL/NR/PL/PR/FL/FR` | Rolling Hammer (rush chain) | League |
| | `GSN/F/P` | Ground Slash (down directional heavy) | League |
| | `LFN/F/P` | Lift Strike (up directional heavy) | League |
| | `MSAN/F/P` | Step-in smash | League |
| | `BSA` | Burst Strike (heavy right after a Z-burst dash) | League |
| | `VASN`, `VASF` | Vanish Assault | League |
| | `SM*` except `SMB*` (`SMMN`, `SMUF`, `DSMM`, `STDSM*`...), `ASMDF` | Smash attacks | League ("fair guess") |
| | `VAAD/M/L/R/U` | Vanishing attacks | Correlation: `vanishingAttack` r = 0.95 |
| | `LTAC`, `LTAFT`, `LTAOT` | Lightning attacks | Correlation: `lightningAttack` r = 0.66 |
| | `DDALN/RN/DN/UN/MN/RP/UP` | Dragon dash attacks | Inferred from name + league's heavy list |
| **Ki blasts** | `RSB`, `DRSB`, `JRB` | Rush ki blasts (the volley), incl. dash and jump | League |
| | `SMBN`, `DSMBN`, `STDSMBN`, `JSBN` | Smash ki blasts (the charged kind; `SMBN` is neutral), incl. dash, step and jump | League |
| **Supers / ultimates / skills** | `SPM*`, `ULT*`, `EXA*` | Hits from those moves | Correlation with their named counters |
| **Throws** | `TRW`, `TRWFT`, `TRW1P`, `DTW*` | Throws | Correlation: `throwCount` r = 0.74 |
| **Counters** | `ZCB*` | Super counters (perception) | Correlation: `superCounterCount` r = 0.96 |
| | `ZCO*` | Z counters | Correlation: `zCounter` r = 0.88 |
| | `RVC*` | Revenge counters | Correlation: `revengeCounter` r = 0.91 |
| | `SZC*` | Super Z counters | Inferred from name |
| **Impacts (clashes)** | `SPF*` | Speed impact | Correlation: `speedImpactCount` r = 0.72 |
| | `CRF*` | Crash impact | Correlation: `crashImpactCount` r = 0.71 |
| **Not a hit** | `BLWF`, `BLWB` | Blowback - the character being knocked back (a reaction) | League |
| | `DDS` | Dragon dash (movement) | League; tracks `dragonDashMileage` |
| | `RI*` (`RIAD`, `RIAF`, `RIAU`, `RI1`, `RI2`) | Step-in during a combo (movement) | League |

Still unidentified, together under 1% of recorded hits in the calibration window: `HC1-3`,
`SSW1PFN`, `BSM1`, `COA0`, `BNDP`, `DS1-3`, `BSRA/BSRB*`, `ZBD`, `WAL*`, `SPC`, `DT1-3`,
`FR1-2`, `SI1-2`, `PP*`, `BW*` and a long tail.

`extractStats` used to count every `actRI*` code as a speed impact whenever
`speedImpactCount` was missing. `RI` is a movement step-in (it is `SPF*` that tracks speed
impacts), so that fallback credited 13,845 phantom speed impacts to 5,207 character entries
that had none. It was removed on 2026-09-28; speed impacts now come from the game's own
counter only.

The classification lives in `src/utils/actionCodes.js`, shared by `extractStats` and the
corpus generator. `npm run verify-action-codes` spot-checks it against this document on
every build; `-- --coverage` also measures the unidentified share across all of `BR_Data`.

## Traps - read before building a stat on these

- **Skill uses: use `runBlastCount` `EXA1` / `EXA2`, not `battleNumCount.eXACount`.** The
  total counter inflates about 12x in Season 1 files and records impossible numbers; the
  per-slot counts hold steady and match footage. Details in `apps/analyzer/CLAUDE.md`
  ("Gotchas").
- **There is no reliable ki-blast hit rate.** A deflected *enemy* blast that lands is
  credited to the deflector as one of their own ki-blast hits (confirmed on footage:
  `Seasons/Season 0/PS0 Week 1 Match 3.json`, Bardock - 3 fired, 2 hit, 3 bounced back,
  5 recorded). Some bounces are not even counted as deflections. Use
  `shotEnergyBulletCount` (blasts fired) for ki-blast volume.
- **`reflectEnergyBulletCount` is enemy blasts this character deflected** - it tracks the
  opponent's blasts fired (r = 0.77) and never exceeds them in 1,824 one-on-one pairings.
  **It is not a measure of defensive skill:** characters auto-deflect while dragon dashing
  or in max power without trying, so do not weight it into defensive ratings.
- **Hits over-count multi-hit moves.** Three Super 1 casts can register 15 hits. Compare
  characters on the same measure (per minute on the field, against the league) rather
  than splitting one character's hits into shares of a whole.
