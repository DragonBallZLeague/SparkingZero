/**
 * Rush Chain damage from the game files: each chain type a character has (its four Rush Chains, Step-In
 * Chain and Rush-In Attack) at its charge levels, and each of its follow-ups' hits, through the combo
 * channel (the RushDerivative category). Measured by the league on 2026-10-11 (data/EXPANSION.md, "Rush
 * Chain tests"), and checked by verify-data:
 * - the combo channel (Tien's Ki Blast Cannon 853 and 1,472, not the smash channel's 775 and 1,338);
 * - an attack file with no Power uses 300 (Unreal omits the default): Goku's Flying Kicks 1,150 (two kicks of
 *   375 and the finisher's 400) and Piccolo's fully charged Rush Ki Waves 1,875 (5 hits of 375);
 * - hit counts the files don't hold: Rush Ki Waves land 5 hits (3 files);
 * - follow-ups land at full damage after the chain (no combo scaling yet): Heavy Crush 350, 425, 563;
 * - Ki Blast Cannon Attack, Energy Storm and Blaster Wave Combo need the chain fully charged.
 * Energy Storm ends in a flurry of ki blasts (`actES3`'s bullet, ki blast channel), given per shot.
 */
import { finalDamage, num } from './fields.mjs';

// Power of a combative file that names none (measured, see above)
export const DEFAULT_COMBATIVE_POWER = 300;

// a chain type: its actions at no / part / full charge (null: it can't be charged), hits per charge when the
// files don't say (Rush Ki Waves), and its follow-ups (actions in press order; needsFull: only after a full charge)
const CHAIN_DEF = {
  'Heavy Finishes': { charge: ['actHFN', 'actHFP', 'actHFF'], followUps: {
    'Heavy Crush': { actions: ['actHC1', 'actHC2', 'actHC3'] },
    'Delta Heavy Finish': { actions: ['actDS1', 'actDS2', 'actDS3'] } } },
  'Ki Blast Cannon': { charge: ['actSCN', 'actSCP', 'actSCF'], followUps: {
    'Ki Blast Cannon Smash': { actions: ['actSCS'] },
    'Ki Blast Cannon Attack': { actions: ['actTA1', 'actTA2', 'actTA3'], needsFull: true } } },
  'Flying Kicks': { charge: null, actions: ['actFLK', 'actFLKF'], followUps: {} },
  'Rolling Hammer': { charge: ['actRHNL', 'actRHPL', 'actRHFL'], followUps: {
    'Rolling Hurricane': { actions: ['actRH1L', 'actRH2'] },
    'Rolling Press': { actions: ['actPP1A', 'actPP2'] } } },
  'Blaster Wave': { charge: ['actBWN', 'actBWP', 'actBWF'], followUps: {
    'Blaster Wave Combo': { actions: ['actBC1', 'actBC2'], needsFull: true } } },
  'Rush Ki Waves': { charge: ['actRWN', 'actRWP', 'actRWF'], hits: 5, followUps: {
    'Energy Storm': { actions: ['actES1', 'actES2'], needsFull: true, flurry: 'actES3' } } },
};

export function rushChainsOf(fm, id, { coef, damageConstant, moveset }) {
  if (!moveset) return null;
  const power = (f) => num(fm.param(f, 'Power')) ?? DEFAULT_COMBATIVE_POWER;
  const dmg = (p) => finalDamage(p, coef.combo, damageConstant);
  // every hit of one action (one per attack file), or `hits` hits of its first file
  const hitsOf = (action, hits) => {
    const files = fm.attackFiles(id, action);
    if (!files.length) return null;
    if (hits) return Array(hits).fill(dmg(power(files[0])));
    return files.map(f => dmg(power(f))).filter(d => d > 0);
  };
  const total = (h) => (h ? h.reduce((t, d) => t + d, 0) : null);
  const types = [...new Set([...(moveset.rushChains || []).map(c => c.type), moveset.stepInChain, moveset.rushInAttack].filter(Boolean))];
  const followUpsHad = (type) => new Set((moveset.rushChains || []).filter(c => c.type === type).flatMap(c => c.followUps));
  const out = {};
  for (const type of types) {
    const def = CHAIN_DEF[type];
    if (!def) continue;
    const levels = def.charge
      ? def.charge.map(a => hitsOf(a, def.hits))
      : [def.actions.flatMap(a => hitsOf(a) || [])];
    const followUps = {};
    for (const name of followUpsHad(type)) {
      const f = def.followUps[name];
      if (!f) continue;
      const hits = f.actions.map(a => total(hitsOf(a)));
      const flurry = f.flurry ? fm.bulletFiles(id, f.flurry)[0] : null;
      followUps[name] = {
        hits,
        total: total(hits),
        ...(f.needsFull ? { needsFullCharge: true } : {}),
        ...(flurry ? { kiBlastFlurryPerShot: finalDamage(num(fm.param(flurry, 'Power')) ?? 0, coef.kiBlast, damageConstant) } : {}),
      };
    }
    out[type] = {
      // damage at no / part / full charge (one entry when it can't be charged), and its hits when there are several
      damage: levels.map(total),
      ...(levels.some(h => h && h.length > 1) ? { hits: levels } : {}),
      ...(def.charge ? {} : { chargeable: false }),
      followUps,
    };
  }
  return out;
}
