/**
 * Blast (Super / Ultimate) damage recipes, calibrated against measured finals.
 *
 * The raw game map lists each move as parts (Move Power tab): Action parts
 * (a Power applied once, e.g. the cinematic hit of a rush super), Contact parts
 * and Projectile parts (Power per application, FireLimit shots, Collision
 * revivals = extra applications of the same projectile, an explicit Damage
 * applications count on some rows). Final damage per application is
 *   ceil(Power x 1.25 x (DP damage scale + the class's Super/Ultimate add))
 * computed in float32 like the game, and a move's damage is the sum over its
 * applications. Which parts count, and how many applications a projectile
 * makes, is not stated anywhere, so the build tries every recipe below on the
 * moves whose final damage is known and keeps, per family of moves, the recipe
 * that reproduces the most of them. A family's recipe may fill unknown damage
 * only when it clears config.calibration (match rate and sample size); anything
 * else stays "not measured yet".
 */

const F = Math.fround;
const COMMON_ACTION = /BLF1W/; // the 1000-Power blast-lunge part every move carries
// A barrage projectile's Record key ends in its hit count: BulletParam_actSPM_BULLET_barrage10,
// ..._BEAM_rapid10, ..._HUGE_BEAM_s3 (34 of 40 measured barrages match exactly; league idea,
// 2026-10-07). Other trailing numbers (actSPM2, L200, sbm2, flash_40) are not counts.
const KEY_COUNT = /(?:barrage|rapid|_s)(\d+)$/;

const num = (v) => (v === '' || v == null ? null : Number(v));

/** Parts of one move, from its Move Power rows. */
export function moveParts(rows) {
  const actions = [], contacts = [], projectiles = [];
  for (const r of rows) {
    const P = num(r.Power) || 0;
    if (r['Mapped part'] === 'Action' && !COMMON_ACTION.test(r.Action) && P > 0) actions.push(P);
    else if (r['Mapped part'] === 'Contact' && P > 0) contacts.push(P);
    else if (r['Mapped part'] === 'Projectile' && P > 0) {
      projectiles.push({
        P, FL: num(r.FireLimit) || 1, fireNum: num(r.FireNum) || 1, rev: num(r['Collision revivals']) || 0,
        apps: num(r['Damage applications']), beamPower: num(r.BeamPower),
        keyCount: num(String(r['Record key'] || '').match(KEY_COUNT)?.[1]),
      });
    }
  }
  return { actions, contacts, projectiles };
}

/** Which family a move belongs to; recipes are calibrated per family. */
export function family(slot, parts) {
  const kind = slot === 'Ultimate' ? 'ultimate' : 'super';
  const { actions, projectiles } = parts;
  if (!projectiles.length) return `${kind}: ${actions.length > 1 ? 'several action parts' : actions.length ? 'one action part' : 'no damaging part'}`;
  const p = projectiles[0];
  const withAction = actions.length ? ' + action' : '';
  // supers and ultimates pooled: the hit count, not the slot, decides the recipe
  if (p.keyCount) return 'barrage (hit count in the Record key)';
  if (projectiles.length > 1) return `${kind}: several projectiles${withAction}`;
  if (p.FL > 1) return `${kind}: volley${withAction}`;
  if (p.rev > 0 && p.beamPower != null && Math.abs(p.beamPower - p.P * p.rev) <= 2) return `${kind}: beam (BeamPower = Power x revivals)${withAction}`;
  if (p.rev > 0) return `${kind}: projectile with revivals${withAction}`;
  return `${kind}: single projectile${withAction}`;
}

/** Recipes: each returns the applications as [Power, count] pairs, or null when it does not apply. */
export const RECIPES = {
  'largest action part': (p) => (p.actions.length ? [[Math.max(...p.actions), 1]] : null),
  'last action part': (p) => (p.actions.length ? [[p.actions[p.actions.length - 1], 1]] : null),
  'all action parts': (p) => (p.actions.length ? p.actions.map(a => [a, 1]) : null),
  'projectile once': (p) => (p.projectiles.length ? [[p.projectiles[0].P, 1]] : null),
  'projectile x shots': (p) => (p.projectiles.length ? [[p.projectiles[0].P, p.projectiles[0].FL * p.projectiles[0].fireNum]] : null),
  'projectile x (revivals + 1)': (p) => {
    const q = p.projectiles[0];
    return q ? [[q.P, q.apps || (q.rev + 1) * q.FL]] : null;
  },
  'projectile x Record-key count': (p) => (p.projectiles[0]?.keyCount ? [[p.projectiles[0].P, p.projectiles[0].keyCount]] : null),
  'every projectile x (revivals + 1)': (p) => (p.projectiles.length ? p.projectiles.map(q => [q.P, q.apps || (q.rev + 1) * q.FL]) : null),
};

export function blastCoef(dpScale, classAdd) {
  return F(F(dpScale) + F(classAdd));
}

/** Final damage of one application. */
export function applicationDamage(power, coef, damageConstant = 1.25) {
  return Math.ceil(F(F(power * damageConstant) * F(coef)));
}

export function evaluate(spec, coef, damageConstant) {
  if (!spec) return null;
  let damage = 0, hits = 0;
  for (const [P, n] of spec) { damage += applicationDamage(P, coef, damageConstant) * n; hits += n; }
  return { damage, hits };
}

/**
 * Calibrate recipes per family against measured moves.
 * @param moves [{ family, parts, coef, measured }] (measured may be null)
 * @returns Map family -> { recipe, matched, samples, rate, accepted, table:[[recipe, matched, applicable]] }
 */
export function calibrate(moves, { minMatchRate, minSamples }, damageConstant) {
  const byFamily = new Map();
  for (const m of moves) if (m.measured != null) (byFamily.get(m.family) || byFamily.set(m.family, []).get(m.family)).push(m);
  const out = new Map();
  for (const [fam, list] of byFamily) {
    const table = [];
    for (const [name, recipe] of Object.entries(RECIPES)) {
      let matched = 0, applicable = 0;
      for (const m of list) {
        const r = evaluate(recipe(m.parts), m.coef, damageConstant);
        if (!r) continue;
        applicable++;
        if (Math.abs(r.damage - m.measured) <= r.hits) matched++;
      }
      table.push([name, matched, applicable]);
    }
    table.sort((a, b) => b[1] - a[1] || b[2] - a[2]);
    const [recipe, matched] = table[0];
    const samples = list.length;
    const rate = samples ? matched / samples : 0;
    out.set(fam, { recipe, matched, samples, rate, accepted: rate >= minMatchRate && samples >= minSamples, table });
  }
  return out;
}
