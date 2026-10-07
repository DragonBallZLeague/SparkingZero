/**
 * Field vocabulary shared by the data build: damage channels and the raw-map /
 * Capsule Corp columns behind them, the trait vocabulary, and small numeric helpers.
 */

/** Damage channels: the raw map's per-class additive coefficient column for each. */
export const CHANNELS = {
  rush: 'Rush damage: class add',
  smash: 'Smash Attack damage: class add',
  combo: 'Combo attack damage: class add',
  throw: 'Throw damage: class add',
  counter: 'Counter damage: class add',
  followUp: 'Follow-up attack damage: class add',
  kiBlast: 'Normal Ki-blast damage: class add',
  chargedKiBlast: 'Charged Ki-blast damage: class add',
  skill: 'Skill attack damage: class add',
  super: 'Super damage: class add',
  ultimate: 'Ultimate damage: class add',
};

/** Class resistance and rate coefficients (raw map, "class coefficient" columns). */
export const CLASS_COEFS = {
  physicalResist: 'Physical resistance: class coefficient',
  energyResist: 'Energy resistance: class coefficient',
  blastResist: 'Separate Blast resistance: class coefficient',
  meleeCharge: 'Melee charge: class coefficient',
  kiShotCharge: 'Ki-shot charge: class coefficient',
  kiRecovery: 'Ki recovery: class coefficient',
  kiCharge: 'Ki charge: class coefficient',
  sparkingCharge: 'Sparking charge: class coefficient',
  preSparkingDrain: 'Pre-Sparking drain: class coefficient',
  sparkingDrain: 'Sparking drain: class coefficient',
  attackKiGain: 'Ki gained from attacks: class coefficient',
  skillRecovery: 'Skill-stock recovery speed: class coefficient',
  kiBlastCost: 'Ki-blast energy cost: class coefficient',
};

/**
 * Capsule Corp Stats fields that are finals of a damage channel. When Capsule Corp
 * labels a character with a different class than the game uses, these are rescaled
 * from Capsule Corp's coefficient to the game's.
 */
export const CC_CHANNEL_FIELDS = {
  rush: ['hit1', 'hit2', 'hit3', 'hit4', 'hit5', 'rush5Hit', 'fiveHitAfterArmor'],
  smash: ['smash'],
  throw: ['throw'],
  followUp: ['pursuit'],
  kiBlast: ['kiBlastDamage'],
  skill: ['skill1Damage', 'skill2Damage'],
};

/** Capsule Corp Stats column for each of those fields. */
export const CC_COLUMNS = {
  hit1: 'Rush', hit2: '2nd Hit', hit3: '3rd Hit', hit4: '4th Hit', hit5: '5th Hit',
  rush5Hit: 'Rush 5 Hit', fiveHitAfterArmor: '5 Hit After Armor',
  smash: 'Smash', throw: 'Throw', pursuit: 'Pursuit', kiBlastDamage: 'Ki Blast Dmg',
  skill1Damage: 'Skill1 Damage', skill2Damage: 'Skill2 Damage',
  switch: 'Switch', armorBreak: 'Armor Break', armor: 'Armor', shortDashCost: 'Short Dash Cost',
  kiCharge: 'Ki Charge', skillRegen: 'Skill Regen Points Per Minute', sparkDuration: 'Spark Duration',
  sparkCharge: 'Spark Charge', meleeDefense: 'Melee Defense Stat', kiBlastDefense: 'Energy (Decimal)',
  blastDefense: 'Blast Defense', kiBlastDefenseArmor: 'Ki Blast Defense +Armor', kiBlastLimit: 'Ki Blast Limit',
  startingKi: 'Starting Ki', kiRegen: 'Ki Regen', kiRegenRange: 'Ki Regen Range', skillLimit: 'Skill Limit',
};

/** Capsule Corp's "Miscellaneous" cell is space-separated multi-word tags; split by this vocabulary. */
export const TRAIT_TAGS = [
  'Sparking Super Armor', 'Super Armor', 'Super Movement', 'High-Speed Movement', 'Auto Dodge', 'Scouter',
  'Paralyze Ki-Blast', 'Sword', 'Grounded', 'Multi-Hit Rushes', 'HP Drain Grab', 'Free Dragon Dash',
];

export function splitTraits(text) {
  let rest = String(text || '').trim();
  const tags = [];
  const unknown = [];
  while (rest) {
    const tag = TRAIT_TAGS.find(t => rest === t || rest.startsWith(t + ' '));
    if (tag) { tags.push(tag); rest = rest.slice(tag.length).trim(); continue; }
    const word = rest.split(' ')[0];
    unknown.push(word);
    rest = rest.slice(word.length).trim();
  }
  return { tags, unknown };
}

/** Parse a numeric cell; '' and text such as "N/A" are null, "+5.00%" is 0.05. */
export function num(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (s === '') return null;
  const pct = s.match(/^([+-]?\d+(?:\.\d+)?)%$/);
  if (pct) return Number(pct[1]) / 100;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Round to `d` decimals, removing float32 noise (0.870000017 -> 0.87). */
export function round(v, d = 4) {
  if (v === null || v === undefined || !Number.isFinite(v)) return v ?? null;
  const f = 10 ** d;
  const r = Math.round(v * f) / f;
  return Object.is(r, -0) ? 0 : r;
}

/** Final damage of a hit: ceil(Power x 1.25 x coef), float32 like the game. */
export function finalDamage(power, coef, damageConstant = 1.25) {
  const F = Math.fround;
  return Math.ceil(F(F(power * damageConstant) * F(coef)));
}
