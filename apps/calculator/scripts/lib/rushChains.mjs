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
 * - Ki Blast Cannon Attack, Ki Blast Cannon Smash, Energy Storm and Blaster Wave Combo need the chain fully
 *   charged; Delta Heavy Finish doesn't (2026-10-11).
 * - a file name can cover several hits: "actFLK1-4" is kicks 1 to 4, "actFLK_2-4" kicks 2 to 4 (Burter 5 hits,
 *   Tapion 4, Gogeta (Super) Super Saiyan 5, measured 2026-10-11); hits named twice count once.
 * - Rolling Press's first press is the 190 hit four times, then the 600 one (Gamma 1: 1,788, 2026-10-11).
 * - Grand Slash and Tornado Slash: Goku 625 / 1,263, then 450, 363, 525 (2026-10-11).
 * Energy Storm ends in a flurry of 9 ki blasts that doesn't count as combo hits; the league measured 224 in all
 * for Piccolo (about 25 a shot), not the bullet file's Power (125, so 157), so it is published as measured.
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
    'Ki Blast Cannon Smash': { actions: ['actSCS'], needsFull: true },
    'Ki Blast Cannon Attack': { actions: ['actTA1', 'actTA2', 'actTA3'], needsFull: true } } },
  'Flying Kicks': { charge: null, actions: ['actFLK', 'actFLKF'], ranged: true, followUps: {} },
  'Rolling Hammer': { charge: ['actRHNL', 'actRHPL', 'actRHFL'], followUps: {
    'Rolling Hurricane': { actions: ['actRH1L', 'actRH2'] },
    'Rolling Press': { actions: [{ action: 'actPP1A', pattern: [[0, 4], [1, 1]] }, 'actPP2'] } } },
  'Blaster Wave': { charge: ['actBWN', 'actBWP', 'actBWF'], followUps: {
    'Blaster Wave Combo': { actions: ['actBC1', 'actBC2'], needsFull: true } } },
  'Rush Ki Waves': { charge: ['actRWN', 'actRWP', 'actRWF'], hits: 5, followUps: {
    'Energy Storm': { actions: ['actES1', 'actES2'], needsFull: true, flurry: { shots: 9, measured: { character: '0040_00', total: 224 } } } } },
  'Grand Slash': { charge: ['actGSN', 'actGSP', 'actGSF'], followUps: {
    'Tornado Slash': { actions: ['actDT1', 'actDT2', 'actDT3'] } } },
  'Lift Strike': { charge: ['actLFN', 'actLFP', 'actLFF'], followUps: {} },
};

// The hits a file covers, from its name after the action: "" or "1" is hit 1, "_2" hit 2, "1-4" hits 1 to 4
function hitIndices(file, action) {
  const rest = file.slice(file.lastIndexOf(action) + action.length).replace(/^_/, '');
  if (rest === '') return [1];
  const m = /^(\d+)(?:-(\d+))?$/.exec(rest);
  if (!m) return null;
  const a = Number(m[1]), b = Number(m[2] ?? m[1]);
  return Array.from({ length: b - a + 1 }, (_, i) => a + i);
}

export function rushChainsOf(fm, id, { coef, damageConstant, moveset }) {
  if (!moveset) return null;
  const power = (f) => num(fm.param(f, 'Power')) ?? DEFAULT_COMBATIVE_POWER;
  const dmg = (p) => finalDamage(p, coef.combo, damageConstant);
  // every hit of one action (one per attack file), `hits` hits of its first file, the hits its file names
  // cover (ranged), or a pattern of [file index, times]
  const hitsOf = (spec, hits, ranged) => {
    const action = typeof spec === 'string' ? spec : spec.action;
    const files = fm.attackFiles(id, action);
    if (!files.length) return null;
    if (spec.pattern) return spec.pattern.flatMap(([i, n]) => Array(n).fill(dmg(power(files[i]))));
    if (hits) return Array(hits).fill(dmg(power(files[0])));
    if (ranged) {
      const byHit = new Map();
      for (const f of files) for (const h of hitIndices(f, action) || []) if (!byHit.has(h)) byHit.set(h, dmg(power(f)));
      if (byHit.size) return [...byHit].sort((a, b) => a[0] - b[0]).map(([, d]) => d);
    }
    return files.map(f => dmg(power(f))).filter(d => d > 0);
  };
  const total = (h) => (h ? h.reduce((t, d) => t + d, 0) : null);
  const types = [...new Set([...(moveset.rushChains || []).map(c => c.type), moveset.stepInChain, moveset.rushInAttack, moveset.grandSlash ? 'Grand Slash' : null].filter(Boolean))];
  const followUpsHad = (type) => new Set(type === 'Grand Slash' ? (moveset.grandSlash?.followUps || [])
    : (moveset.rushChains || []).filter(c => c.type === type).flatMap(c => c.followUps));
  const out = {};
  for (const type of types) {
    const def = CHAIN_DEF[type];
    if (!def) continue;
    const levels = def.charge
      ? def.charge.map(a => hitsOf(a, def.hits))
      : [def.actions.flatMap(a => hitsOf(a, null, def.ranged) || [])];
    const followUps = {};
    for (const name of followUpsHad(type)) {
      const f = def.followUps[name];
      if (!f) continue;
      const hits = f.actions.map(a => total(hitsOf(a)));
      followUps[name] = {
        hits,
        total: total(hits),
        ...(f.needsFull ? { needsFullCharge: true } : {}),
        ...(f.flurry ? { kiBlastFlurry: { shots: f.flurry.shots, ...(id === f.flurry.measured.character ? { measuredTotal: f.flurry.measured.total } : {}) } } : {}),
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
