/**
 * A character's ki blasts from the FModel snapshot: how the normal ki blast behaves, and the
 * charged ki blast standing (actSTDSMBN) and moving (actSMBN) with its damage at each charge level.
 *
 * Measured in game (2026-10-10, Goku (Z - Early)): the standing charged ki blast deals 938 / 1,407 /
 * 1,875 at its three charge levels (Power 750 x 1.25, x1.5, x2: the file's ChangePerChargeLv
 * DamageRate), and 875 moving (Power 700). Damage is per shot; a multi-shot ki blast fires `shots`.
 *
 * Tags describe behaviour the league asked to see, from the speed curve the file links to, its
 * bullet category and the character's ability flags (EXPANSION.md, "Ki blast traits"):
 *   normal:  laser (twice as fast and far), giant, thrown (Mr. Satan, Yajirobe), none
 *   charged: homing (slow, tracking), multi-shot, paralyzing, slash, rapid, giant, thrown
 * "none" comes from the ki-blast count (0), not the CannotShoot flag: Goku (Mini)'s flag belongs to
 * a costume the league doesn't use, and he shoots with the other one.
 *
 * Jump (actJRB, actJSBN) and dash (actDRSB, actDSMBN) ki blasts follow the same rules, with their
 * counts from the character's Numeric file. A file without Power uses the game's default Power, which
 * the export doesn't show (the jump ki blast's file has none): such damage is null until measured.
 */
import { finalDamage, num, round } from './fields.mjs';

const curveTags = (curve) => {
  const c = String(curve || '');
  const tags = [];
  if (/_laser/i.test(c)) tags.push('laser');
  if (/_Hom/i.test(c)) tags.push('homing');
  if (/_Shots/i.test(c)) tags.push('short range');
  if (/_Numb/i.test(c)) tags.push('paralyzing');
  if (/_Slash/i.test(c)) tags.push('slash');
  if (/_rapid/i.test(c)) tags.push('rapid');
  if (/_HUGE/i.test(c)) tags.push('giant');
  return tags;
};

/**
 * @returns {{ normal: { tags: string[] }, charged: { standing: object|null, moving: object|null },
 *   notes: string[] }}  notes are for REPORT.md
 */
export function kiBlastsOf(fm, id, { coef, classCoef, kiBlastLimit, damageConstant }) {
  const notes = [];
  const flag = (f) => String(fm.raw(id, 'Character', `AbilityFlag.${f}`) ?? '') === 'true';
  const thrown = flag('StoneKidan');

  const normalFiles = fm.bulletFiles(id, 'actRSB');
  const normalTags = kiBlastLimit === 0 ? ['none']
    : [...new Set([...(thrown ? ['thrown'] : []), ...curveTags(fm.param(normalFiles[0], 'MoveParam.SpeedCurve'))])];

  const field = (name) => { try { return fm.field(id, name); } catch { return null; } };
  const single = (action, count) => {
    if (kiBlastLimit === 0) return null;
    const files = fm.bulletFiles(id, action);
    if (!files.length) return null;
    const power = num(fm.param(files[0], 'Power'));
    const cost = num(fm.param(files[0], 'ExpendEnergy'));
    if (power == null) notes.push(`${action}: no Power in ${files[0]} (the game's default, unknown); damage left out`);
    return {
      damage: power == null ? null : finalDamage(power, coef.kiBlast, damageConstant),
      count,
      cost: cost == null ? null : round(cost * (1 + classCoef.kiBlastCost) / 10000),
      tags: curveTags(fm.param(files[0], 'MoveParam.SpeedCurve')),
    };
  };
  const charged = (action) => {
    if (kiBlastLimit === 0) return null;
    const files = fm.bulletFiles(id, action);
    if (!files.length) return null;
    const f = files[0];
    const power = num(fm.param(f, 'Power'));
    const shots = files.length > 1 ? files.length : (num(fm.param(f, 'FireNum')) || 1);
    const rates = [1, num(fm.param(f, 'ChangePerChargeLv[0].DamageRate')) ?? 1.5, num(fm.param(f, 'ChangePerChargeLv[1].DamageRate')) ?? 2];
    const cost = num(fm.param(f, 'ExpendEnergy'));
    const tags = new Set(curveTags(fm.param(f, 'MoveParam.SpeedCurve')));
    if (/NumbBullet/.test(fm.param(f, 'CategoryType') ?? '')) tags.add('paralyzing');
    if (shots > 1) tags.add('multi-shot');
    if (thrown) tags.add('thrown');
    if (power == null) notes.push(`${action}: no Power in ${f} (the game's default, unknown); damage left out`);
    if (files.length > 1) notes.push(`${action}: ${files.length} parts (${files.join(', ')}); the first part's values are used`);
    return {
      // per shot, at no charge / the first charge level / full charge
      damage: power == null ? null : rates.map(r => finalDamage(power * r, coef.chargedKiBlast, damageConstant)),
      shots,
      cost: cost == null ? null : round(cost * (1 + classCoef.kiBlastCost) / 10000),
      tags: [...tags],
    };
  };
  return {
    normal: { tags: normalTags },
    charged: { standing: charged('actSTDSMBN'), moving: charged('actSMBN'), limit: kiBlastLimit === 0 ? 0 : field('chargedKiBlastLimit') },
    jump: { normal: single('actJRB', field('jumpKiBlastCount')), charged: charged('actJSBN') },
    dash: { normal: single('actDRSB', field('dashKiBlastCount')), charged: charged('actDSMBN') },
    notes,
  };
}
