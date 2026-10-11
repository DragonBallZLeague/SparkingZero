/**
 * A character's moveset from the game files, in the game's own names (the controls guide,
 * MasterDataAsset/OperationGuide): its four Rush Chains with their follow-ups, the Step-In and
 * Rush-In chains, the counter, the moves it lacks and its abilities.
 *
 * Rush Chains come from ReplaceTransitionAction_<id> (snapshotted as character-values rows,
 * asset "RushChain"): four "ラッシュ派生" records in chain order, then "ステップイン派生" (Step-In Chain),
 * "ラッシュイン派生" (Rush-In Attack) and "当身" (the counter). Each chain type has fixed follow-ups;
 * an ActionFlag turns one off. Checked against the in-game lists on 2026-10-10: Goku (Z - Early), Tien,
 * Broly (Z), Broly (Z) Super Saiyan, Broly (Z) Legendary Super Saiyan.
 *
 * ActionFlags turn moves OFF (confirmed: SparkingRush = no Violent Rush; DeltaStorm = no Delta
 * Heavy Finish; CannonCombo = no Ki Blast Cannon Smash; TriAttack = no Ki Blast Cannon Attack;
 * PowerPress = no Rolling Press; RollingHurricane = no Rolling Hurricane). Grand Slash's two follow-ups
 * (the guide's GsRushDerivedCombo1 and 2): AirRush = no Aerial Slash (Tien has the flag and only Tornado
 * Slash, Goku has neither flag and both) and DragonTornado = no Tornado Slash (Krillin and Goku (Teen)
 * have only Aerial Slash). Gamma 1's list was checked too. Flags whose in-game name is not known yet are listed under `unavailableUnnamed`.
 */

export const CHAINS = {
  actHFN: 'Heavy Finishes', actSCN: 'Ki Blast Cannon', actFLK: 'Flying Kicks', actRHNR: 'Rolling Hammer',
  actRHNL: 'Rolling Hammer', actBWN: 'Blaster Wave', actRWN: 'Rush Ki Waves', actLFN: 'Lift Strike', actGSN: 'Grand Slash',
};
// follow-ups of each chain type, with the ActionFlag that turns each off
const FOLLOW_UPS = {
  'Heavy Finishes': [['Heavy Crush', 'HeavyCrash'], ['Delta Heavy Finish', 'DeltaStorm']],
  'Ki Blast Cannon': [['Ki Blast Cannon Smash', 'CannonCombo'], ['Ki Blast Cannon Attack', 'TriAttack']],
  'Rolling Hammer': [['Rolling Hurricane', 'RollingHurricane'], ['Rolling Press', 'PowerPress']],
  'Blaster Wave': [['Blaster Wave Combo', 'ExplosionCombo']],
  'Rush Ki Waves': [['Energy Storm', 'EnergyStorm']],
};
// Grand Slash (a move every character has unless GrandSlash turns it off) and its follow-ups
const GRAND_SLASH = [['Tornado Slash', 'DragonTornado'], ['Aerial Slash', 'AirRush']];
const FOLLOW_UP_FLAGS = new Set([...Object.values(FOLLOW_UPS).flat(), ...GRAND_SLASH].map(([, f]) => f));
// other ActionFlags and the move each turns off (controls guide names)
const OFF = {
  SparkingRush: 'Violent Rush', VanishingAttack: 'Vanishing Attack', LightningAttack: 'Lightning Attack',
  BurstSmash: 'Burst Smash', BurstMeteor: 'Burst Meteor', DragonHoming: 'Dragon Homing',
  RushHighSpeedMovement: 'Rush High-Speed Movement', SuperZCounter: 'Super Perception', ThrowEscape: 'Throw Evasion',
  DawnThrow: 'Ground Throw', DashRising: 'Dash Rising', DashBlow: 'Dash Blow', SpiralSlash: 'Spiral Slash',
  GrandSlash: 'Grand Slash', LiftStrike: 'Lift Strike',
};
const ABILITIES = [
  ['HyperArmor', 'Hyper armor'], ['EnergyDrain', 'Ki absorption'], ['bNoEffectDrain', 'Immune to ki drain'],
  ['bCannotCharge', 'Cannot charge ki'], ['bCannotCrashImpact', 'No Crash Impact'], ['bCannotPowerImpact', 'No Power Impact'],
  ['StoneKidan', 'Thrown ki blasts'], ['bCanSelfishness', 'Auto-dodge (selfishness)'],
];

export function movesetOf(fm, id) {
  const chainRows = fm.rawRows ? fm.rawRows(id, 'RushChain') : [];
  const kind = (key) => chainRows.filter(r => r.field.startsWith(`${key}[`)).sort((a, b) => a.field.localeCompare(b.field)).map(r => r.value);
  const action = (v) => (v && v !== 'None' ? (CHAINS[v] ?? v) : null);
  const on = (flag) => String(fm.raw(id, 'Character', `ActionFlag.${flag}`) ?? '') === 'true';
  const ability = (flag) => String(fm.raw(id, 'Character', `AbilityFlag.${flag}`) ?? '') === 'true';
  const unnamed = [];
  for (const r of fm.rawRows ? fm.rawRows(id, 'Character') : []) {
    const m = /^ActionFlag\.(.+)$/.exec(r.field);
    if (m && r.value === 'true' && !OFF[m[1]] && !FOLLOW_UP_FLAGS.has(m[1])) unnamed.push(m[1]);
  }
  return {
    rushChains: kind('rush').map(v => {
      const type = action(v);
      return { type, followUps: (FOLLOW_UPS[type] || []).filter(([, flag]) => !on(flag)).map(([name]) => name) };
    }),
    grandSlash: on('GrandSlash') ? null : { followUps: GRAND_SLASH.filter(([, flag]) => !on(flag)).map(([name]) => name) },
    stepInChain: action(kind('stepIn')[0]),
    rushInAttack: action(kind('rushIn')[0]),
    // the counter's follow-up: a chain type, or the standard counter attack (actCOA0); not yet checked in game
    counter: kind('counter')[0] === 'actCOA0' ? 'Standard' : action(kind('counter')[0]),
    unavailable: Object.entries(OFF).filter(([flag]) => on(flag)).map(([, name]) => name),
    unavailableUnnamed: unnamed,
    abilities: ABILITIES.filter(([flag]) => ability(flag)).map(([, name]) => name),
    pursuits: pursuitsOf(fm, id, on),
  };
}

// Follow-up (pursuit) limits, Numeric: PursuitBaseLimit is the general limit (+ PursuitBaseLimitAddAtSparking
// in Sparking); PursuitLimitVanishingAttack / LightningAttack / DragonHoming give a pursuit its own limit when
// above 0 (only Videl: Dragon Homing 2), else it shares the general one. An ActionFlag turns a pursuit off
// (Videl and Mr. Satan: no Vanishing Attack or Lightning Attack, but Dragon Homing). Four characters have no
// general limit in the files (Unreal's default, not known yet): Videl, Mr. Satan, Cheelai, Panzy.
const PURSUITS = [['vanishingAttack', 'VanishingAttack', 'PursuitLimitVanishingAttack'], ['lightningAttack', 'LightningAttack', 'PursuitLimitLightningAttack'],
  ['dragonHoming', 'DragonHoming', 'PursuitLimitDragonHoming']];
function pursuitsOf(fm, id, on) {
  const n = (f) => { const v = fm.raw(id, 'Numeric', f); return v == null || v === '' ? null : Number(v); };
  const out = { limit: n('PursuitBaseLimit'), sparkingAdd: n('PursuitBaseLimitAddAtSparking') };
  for (const [key, flag, field] of PURSUITS) {
    const own = n(field);
    out[key] = on(flag) ? false : (own > 0 ? { limit: own } : true);
  }
  return out;
}
