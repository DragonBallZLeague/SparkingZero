/**
 * Armor from the game files (tables.csv: armor, armorBreak, armorLevel; found 2026-10-10).
 *
 * - An armor situation has a Level and an armor type (ArmorLevel_Common): a hyper-armor holder has
 *   Hyper Armor at level 2, and Sparking Armor at level 4 while Sparking; a character with Sparking
 *   armor has it at level 3. Each armor type has a DamageRate (Hyper 0.9, Sparking 0.75, Super 0.5).
 * - Every attack file carries an ArmorBreakLevel label; the label's BreakLevel list is indexed by the
 *   attacker's DP - 1, and a Giant attacker uses BreakLevelForGiant.
 * - A hit breaks the armor (no reduction) when its break level >= the armor's level.
 *
 * Checked: against Hyper Armor this gives every character's "armor break" hits (DP 1-4: 5, DP 5: 4,
 * DP 6: 3, DP 7+: 1, Giants: 1), and the league's measurements (2026-10-10): Goku (Z - Early)'s fully
 * charged ki blast (break level 3; its charge levels keep the base label) breaks base Janemba's Hyper
 * Armor (1,919) but not his Sparking Armor (1,439).
 */
import { num } from './fields.mjs';

const ARMOR_NAMES = { 'ハイパーアーマー': 'Hyper Armor', 'スパーキングアーマー': 'Sparking Armor', 'スーパーアーマー': 'Super Armor' };

function situations(fm) {
  const out = [];
  for (let i = 0; i < 64; i++) {
    for (const key of ['ハイパーアーマー持ち', 'スパーキングアーマー中']) {
      const level = fm.table('armorLevel', `${key}#${i}`, 'Level');
      if (level === undefined) continue;
      const armor = fm.table('armorLevel', `${key}#${i}`, 'Armor');
      out.push({ key, level: Number(level), armor, damageRate: num(fm.table('armor', armor, 'DamageRate')) });
    }
  }
  return out;
}

export function armorOf(fm, id, { dp, giant, sparkingArmor }) {
  const sit = situations(fm);
  const hyper = String(fm.raw(id, 'Character', 'AbilityFlag.HyperArmor') ?? '') === 'true';
  const pick = (key, armor) => {
    const s = sit.find(x => x.key === key && x.armor === armor);
    return s ? { type: ARMOR_NAMES[s.armor] ?? s.armor, level: s.level, damageRate: s.damageRate } : null;
  };
  const breakOf = (label) => {
    if (!label || label === 'None') return null;
    const v = fm.table('armorBreak', label, giant ? 'BreakLevelForGiant' : `BreakLevel[${dp - 1}]`);
    return v === undefined ? null : Number(v);
  };
  const attackLabel = (action) => fm.param(fm.attackFiles(id, action)[0], 'ArmorBreakLevel');
  const bulletLabel = (action) => fm.param(fm.bulletFiles(id, action)[0], 'ArmorBreakLevel');
  const atk = (action) => breakOf(attackLabel(action));
  const rush = ['actRSHA1', 'actRSHA2', 'actRSHA3', 'actRSHA4', 'actRSHA5'].map(atk);
  // a charged ki blast's charge levels keep the base label unless ChangePerChargeLv names another
  const charged = (action) => {
    const files = fm.bulletFiles(id, action);
    if (!files.length) return null;
    const baseLabel = bulletLabel(action);
    return [baseLabel, fm.param(files[0], 'ChangePerChargeLv[0].ArmorBreakLevel'), fm.param(files[0], 'ChangePerChargeLv[1].ArmorBreakLevel')]
      .map(l => breakOf(!l || l === 'None' ? baseLabel : l));
  };
  // hits of the 5-hit rush before Hyper Armor (level 2) breaks: the first hit whose break level reaches it
  const hyperLevel = pick('ハイパーアーマー持ち', 'ハイパーアーマー')?.level ?? 2;
  const firstBreak = rush.findIndex(v => v != null && v >= hyperLevel);
  return {
    // the armor this character has, normally and while Sparking (null: none)
    base: hyper ? pick('ハイパーアーマー持ち', 'ハイパーアーマー') : null,
    sparking: hyper ? pick('ハイパーアーマー持ち', 'スパーキングアーマー') : sparkingArmor ? pick('スパーキングアーマー中', 'スパーキングアーマー') : null,
    // the break level of this character's attacks (a hit breaks armor of a lower or equal level)
    breakLevels: {
      rush,
      smash: ['actSMMN', 'actSMMP', 'actSMMF'].map(atk), perfectSmash: atk('actSMMJ'), hyperSmash: atk('actSMMH'),
      heavyFinish: ['actHFN', 'actHFP', 'actHFF'].map(atk), throw: atk('actTRW1P'),
      kiBlast: breakOf(bulletLabel('actRSB')), chargedKiBlast: charged('actSTDSMBN'), chargedKiBlastMoving: charged('actSMBN'),
    },
    hyperArmorBreakHits: firstBreak < 0 ? null : firstBreak + 1,
  };
}
