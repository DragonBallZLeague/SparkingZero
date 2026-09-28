/**
 * What the per-move hit codes in a battle result mean.
 *
 * `battleCount.attackHitCount` records hits landed per move, keyed like
 * `(Key="actRSHA1")` - about 230 codes, none of them named by the game. The
 * classification below was agreed with the league (who know the moves) and
 * checked against the game's own named counters where one exists. The evidence
 * for each line, the codes still unidentified, and the traps are written up in
 * docs/ACTION_CODES.md - read that before changing anything here.
 *
 * Shared by the app (extractStats) and the build scripts (the corpus generator),
 * so the two can never classify a code differently.
 */

/**
 * First match wins, so order matters: heavy melee is tested before ki blasts
 * because both families start with SM.
 */
export const ACTION_CLASSES = [
  // Rush combo strings. RSHA is the usual opener; RSHB normally follows it, but
  // some characters open straight into it. The A prefix is likely aerial.
  ['rush', /^A?RSH[AB]\d$/],
  // Heavy melee: rush chains (Ki Blast Cannon, Heavy Finish, Flying Kick, Rush Ki
  // Waves, Rolling Hammer), directional heavies (Ground Slash, Lift Strike), the
  // step-in smash, Burst Strike, Vanish Assault, vanishing / lightning / dragon
  // dash attacks, and smash attacks - every SM* code EXCEPT SMB*, which is a
  // smash ki blast.
  ['heavy', /^(SC[NFP]|A?HF[NFP]|FLKF?|RW[NFP]|RH[NPF][LR]|GS[NFP]|LF[NFP]|MSA[NFP]|BSA|VAS[NF]|VAA[DMLRU]|LTA(C|FT|OT)|DDA[LRDUM][NP]|(A|D|STD)?SM(?!B).*)$/],
  // Ki blasts: RSB = rush ki blasts (the volley), SMB = smash ki blasts (the
  // charged kind; SMBN is neutral), with dash / jump / step variants. Note these
  // also include deflected ENEMY blasts that land - see docs/ACTION_CODES.md.
  ['kiblast', /^(D?RSB|JRB|JSB[NFP]?|(D|STD)?SMB[NFP]?)$/],
  ['super', /^SPM/],
  ['ultimate', /^ULT/],
  ['skill', /^EXA/],
  ['throw', /^(TRW|DTW)/],
  ['counter', /^(ZCB|ZCO|RVC|SZC)/],
  // Clashes: speed impact (SPF) and crash impact (CRF).
  ['impact', /^(SPF|CRF)/],
  // Blowback: the character being knocked back, a reaction rather than a hit.
  ['reaction', /^BLW/],
  // Dragon dash, and RI*: a step-in during a combo.
  ['movement', /^(DDS|RI.*)$/],
];

/** `(Key="actRSHA1")` -> `RSHA1`. Tolerates a bare `actRSHA1` or `RSHA1`. */
export function actionCode(key) {
  const m = /Key="act([^"]*)"/.exec(key);
  if (m) return m[1];
  return String(key).replace(/^act/, '');
}

/** The class of one move code, or 'unknown'. */
export function classifyAction(code) {
  for (const [cls, re] of ACTION_CLASSES) {
    if (re.test(code)) return cls;
  }
  return 'unknown';
}

/** The hit classes the Character page's fighting-style profile reads. */
export const STYLE_HIT_CLASSES = ['rush', 'heavy', 'kiblast'];

/**
 * Sums an `attackHitCount` dict into the style hit classes:
 * `{ rush, heavy, kiblast }`, each a hit count (0 when absent).
 */
export function styleHits(attackHitCount) {
  const out = { rush: 0, heavy: 0, kiblast: 0 };
  for (const [key, value] of Object.entries(attackHitCount || {})) {
    if (typeof value !== 'number') continue;
    const cls = classifyAction(actionCode(key));
    if (cls in out) out[cls] += value;
  }
  return out;
}
