/**
 * Game facts for the data build: the FModel snapshot first, the character map as fallback
 * and cross-check.
 *
 * The build still reads game facts under the character map's column names; this layer fills
 * those columns from the game files wherever the FModel snapshot has the value (directly, through
 * data/fmodel-fields.csv, or from the class and DP tables and the attack and bullet files), keeps
 * the map's value where it does not, and records every value the two sources disagree on for
 * REPORT.md. A value is "the same" within a relative 1e-6 (the map rounds some floats).
 */

/** Damage channel -> the class table field (CharacterTypeData) behind the map's "class add" column. */
export const CLASS_DAMAGE_FIELD = {
  rush: 'RushDamageScale', smash: 'SmashDamageScale', combo: 'ComboAttackDamageScale', throw: 'ThrowDamageScale',
  counter: 'ParryDamageScale', followUp: 'PursuitDamageScale', kiBlast: 'RushBulletDamageScale',
  chargedKiBlast: 'SmashBulletDamageScale', skill: 'BlastForteDamageScale', super: 'BlastDamageScale', ultimate: 'BlastUltimateDamageScale',
};
/** Class coefficient -> class table field. */
export const CLASS_COEF_FIELD = {
  physicalResist: 'CombativesDamageResist', energyResist: 'EnergyDamageResist', blastResist: 'BlastDamageResist',
  meleeCharge: 'CombativesChargeScale', kiShotCharge: 'BulletChargeScale', kiRecovery: 'SPAutoRecoveryScale',
  kiCharge: 'SPChargeSpeedScale', sparkingCharge: 'SparkingGaugeChargeSpeedScale', preSparkingDrain: 'PreSparkingGaugeDecreaseSpeedScale',
  sparkingDrain: 'SparkingModeGaugeDecreaseSpeedScale', attackKiGain: 'AttackEnergyGainScale', skillRecovery: 'BlastRecoverSpeedScale',
  kiBlastCost: 'BulletExpendEnergyScale',
};
/** Move Power columns -> bullet/attack parameter fields. */
export const PART_FIELD = {
  Power: 'Power', BeamPower: 'BeamPower', Shave: 'Shave', BeamShave: 'BeamShave', FireLimit: 'FireLimit',
  'Collision revivals': 'CollisionRevibeNum', 'Revival interval (s)': 'CollisionRevibeSpan', FireNum: 'FireNum', 'Ki cost (raw)': 'ExpendEnergy',
};

export function sameValue(a, b) {
  if (String(a) === String(b)) return true;
  const x = Number(a), y = Number(b);
  return a !== '' && b !== '' && a != null && b != null && Number.isFinite(x) && Number.isFinite(y) && Math.abs(x - y) <= 1e-6 * Math.max(1, Math.abs(y));
}

/**
 * Character rows under the map's column names, game values first.
 * Returns { rows: Map id -> row, gaps: [[character, column, map value, game value]], filled: count }.
 */
export function gameCharacterRows(fm, mapRows, { CHANNELS, CLASS_COEFS, fieldMap }) {
  const rows = new Map(), gaps = [];
  let filled = 0;
  for (const m of mapRows) {
    const id = m['Character ID'];
    const g = fm.characters.get(id);
    const r = { ...m };
    rows.set(id, r);
    if (!g) continue;
    const put = (col, v) => {
      if (v === undefined || v === null || v === '') return;
      if (m[col] !== undefined && m[col] !== '' && !sameValue(m[col], v)) gaps.push([m.Character, col, m[col], String(v)]);
      r[col] = String(v);
      filled++;
    };
    const key = g.classKey;
    put('Class (game key)', key);
    const dp = fm.field(id, 'dp');
    put('DP', dp);
    put('DP damage scale', fm.table('dp', String(dp), 'DamageScale'));
    for (const f of fieldMap) if (f.charmap && f.charmap !== 'DP') put(f.charmap, fm.field(id, f.field));
    for (const [ch, col] of Object.entries(CHANNELS)) put(col, fm.table('class', key, CLASS_DAMAGE_FIELD[ch]) ?? 0);
    for (const [k, col] of Object.entries(CLASS_COEFS)) put(col, fm.table('class', key, CLASS_COEF_FIELD[k]) ?? 0);
    const powers = (files, field) => files.map(f => fm.param(f, field)).filter(v => v !== undefined);
    const rush = powers(fm.attackFiles(id, 'actRSHA1'), 'Power');
    put('Rush A first hit: Power', rush[0]);
    // A multi-part throw lists every part ("700 | 2000"); the map's part order is not always the game's.
    const thr = powers(fm.attackFiles(id, 'actTRW1P'), 'Power');
    if (thr.length === 1) put('Throw: Power', thr[0]);
    else if (thr.length > 1) {
      const sorted = (s) => String(s).split(' | ').sort().join(' | ');
      if (sorted(thr.join(' | ')) !== sorted(m['Throw: Power'])) gaps.push([m.Character, 'Throw: Power', m['Throw: Power'], thr.join(' | ')]);
    }
    put('Normal Ki: Power', powers(fm.bulletFiles(id, 'actRSB'), 'Power')[0]);
    put('Normal Ki: Ki cost (raw)', powers(fm.bulletFiles(id, 'actRSB'), 'ExpendEnergy')[0]);
    put('Charged Ki: Power', powers(fm.bulletFiles(id, 'actSMBN'), 'Power')[0]);
    put('Charged Ki: Ki cost (raw)', powers(fm.bulletFiles(id, 'actSMBN'), 'ExpendEnergy')[0]);
  }
  return { rows, gaps, filled };
}

/** Move Power rows with their values read from the game file each row names (Record key). */
export function gameMovePower(fm, mapRows) {
  const gaps = [];
  let filled = 0;
  const rows = mapRows.map(m => {
    const file = m['Record key'];
    if (!file || !fm.paramsOf(file).length) return m;
    const r = { ...m };
    for (const [col, field] of Object.entries(PART_FIELD)) {
      const v = fm.param(file, field);
      if (v === undefined) continue;
      if (m[col] !== '' && !sameValue(m[col], v)) gaps.push([`${m.Character} ${m.Move}`, `${col} (${file})`, m[col], v]);
      r[col] = v;
      filled++;
    }
    return r;
  });
  return { rows, gaps, filled };
}

/**
 * Skill buff rows in the Skill Values tab's shape (Action, Field, Numeric value, Duration (s)),
 * one phase per buff file, from the character's skill actions (actEXA1…, actEXA2…).
 */
export function gameSkillValues(fm, id) {
  const out = [];
  for (const b of fm.buffsOf(id)) {
    if (!/^actEXA/.test(b.action)) continue;
    const params = fm.paramsOf(b.file);
    const time = params.find(p => p.field === 'EffectiveTime')?.value ?? '0';
    out.push({ 'Character ID': id, Action: b.action, Field: 'EffectiveTime', 'Numeric value': time, 'Duration (s)': time });
    for (const p of params) {
      if (p.field === 'EffectiveTime') continue;
      out.push({ 'Character ID': id, Action: b.action, Field: p.field, 'Numeric value': Number.isFinite(Number(p.value)) ? p.value : '', 'Duration (s)': time });
    }
  }
  return out;
}

/** The fields of a character's passive buffs: "Sparking" or the low-health trigger "HPTrigger@<hp>". */
export function gamePassives(fm, id) {
  const by = new Map();
  for (const b of fm.buffsOf(id)) {
    if (b.action !== 'Sparking' && !b.action.startsWith('HPTrigger@')) continue;
    if (!by.has(b.action)) by.set(b.action, new Map());
    const m = by.get(b.action);
    for (const p of fm.paramsOf(b.file)) {
      const v = Number(p.value);
      if (Number.isFinite(v)) m.set(p.field, (m.get(p.field) || 0) + v);
    }
  }
  return by;
}
