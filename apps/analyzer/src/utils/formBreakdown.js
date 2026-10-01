import transformationsData from '../../../../referencedata/transformations.json';
import { calculatePerFormStats } from './formStatsCalculator.js';
import { combatEfficiency } from './performanceScore.js';
import { skillSlotUses, styleHits } from './actionCodes.js';

/**
 * The forms a character went through in one match, in order, as
 * components/FormBreakdown.jsx draws them and the Match page's character
 * detail filters to:
 *
 *   { complete, forms: [{ id, name, fusion, seconds, damageDone, damageTaken,
 *     efficiency, dps, s1, s2, ult, kiFired, skills, kills, hpLeft, hpMax,
 *     stats }] }
 *
 * s1, s2 and ult are [hit, thrown], or [null, thrown] in a file from before
 * hits were recorded. `fusion` is { partnerId, partnerName } when the form is
 * a fusion. `hpLeft` is the HP it had when it left the form (the end of the
 * match for the last one), or null for a form that ended in a fusion: the
 * file's snapshot there holds the fusion's starting HP (more than the form's
 * own maximum), which belongs to neither.
 *
 * `stats` is the form's own figures under extractStats()'s names, so the
 * character detail can show one form in place of the whole match. Every count
 * is the difference between the snapshots either side of the form. The best
 * combo is not a count but a running maximum: the first form's is its own,
 * and a later form's is known only when it beat the ones before (the new
 * maximum was set in it); otherwise it is null.
 *
 * A fused form's figures are the fusion's WHOLE output. The character's own
 * totals take half of it (THE FUSION RULE, utils/fusionSplit.js), but a form's
 * figures show what the form did, which the league reads as the better account
 * of how the match went (settled 2026-09-29).
 *
 * `complete` is false, and the forms carry only id and name, when the file
 * cannot give per-form figures (`reason`):
 *   - 'missing': it records the transformations but not the snapshots per-form
 *     figures come from (3 records in the corpus);
 *   - 'shared': both sides fielded the character and it transformed on both
 *     (a team's test against itself). The snapshots are keyed by character id
 *     alone, so the file keeps one set for the two fighters and one side's
 *     forms would be built from the other's numbers (16 records, all tests).
 *     Pass `{ shared: true }` for such a record; sharedFormSnapshots() finds
 *     them.
 *
 * averageForms() below fills the same fields with averages over many matches,
 * for the Character page's Forms tab.
 */
export function matchForms(record, characterIdRecord, charMap = {}, { shared = false } = {}) {
  const history = record && record.formChangeHistory;
  if (!Array.isArray(history) || !history.length) return { complete: true, forms: [] };
  const original = (record.battlePlayCharacter && record.battlePlayCharacter.originalCharacter
    && record.battlePlayCharacter.originalCharacter.key) || null;
  const chain = [original, ...history.map(f => f.key)];
  const nameOf = id => charMap[id] || (transformationsData[id] && transformationsData[id].name) || id || '?';
  const fusionOf = i => {
    const list = transformationsData[chain[i]] && transformationsData[chain[i]].fusionOf;
    const at = list && i > 0 ? list.indexOf(chain[i - 1]) : -1;
    if (at === -1) return list ? { partnerId: null, partnerName: null } : null;
    const partnerId = list[at ^ 1];
    return { partnerId, partnerName: nameOf(partnerId) };
  };

  const idr = characterIdRecord || {};
  const hasSnapshots = Object.keys(idr).length > 0;
  const raw = hasSnapshots ? calculatePerFormStats(record, idr, history, original) : [];
  if (shared || raw.length !== chain.length) {
    return {
      complete: false,
      reason: shared ? 'shared' : 'missing',
      forms: chain.map((id, i) => ({ id, name: nameOf(id), fusion: fusionOf(i) })),
    };
  }

  // Where each form ended: its snapshot, and the final record for the last.
  const snapOf = id => idr[id] || idr[`(Key="${id}")`] || null;
  const ends = chain.map((id, i) => (i === chain.length - 1 ? record : snapOf(id)));
  const countsAt = i => {
    const bc = (i >= 0 && ends[i] && ends[i].battleCount) || {};
    return {
      skills: skillSlotUses(bc.runBlastCount),
      hits: bc.styleHits || styleHits(bc.attackHitCount),
      combo: bc.maxComboNum || 0,
      comboDamage: bc.maxComboDamage || 0,
    };
  };
  // A running maximum: known for a form only if it rose during it.
  const best = (i, key) => {
    const now = countsAt(i)[key];
    return i === 0 || now > countsAt(i - 1)[key] ? now : null;
  };

  const hits = record.additionalCounts !== undefined;
  const fusions = chain.map((_, i) => fusionOf(i));
  return {
    complete: true,
    forms: raw.map((f, i) => {
      const hpLeft = fusions[i + 1] ? null : f.hPGaugeValue || 0;
      const at = countsAt(i), before = countsAt(i - 1);
      return {
        id: f.formId,
        name: nameOf(f.formId),
        fusion: fusions[i],
        seconds: f.battleTime || 0,
        damageDone: f.damageDone || 0,
        damageTaken: f.damageTaken || 0,
        efficiency: combatEfficiency(f.damageDone || 0, f.damageTaken || 0),
        dps: f.battleTime > 0 ? (f.damageDone || 0) / f.battleTime : 0,
        s1: [hits ? f.s1HitBlast || 0 : null, f.s1Blast || 0],
        s2: [hits ? f.s2HitBlast || 0 : null, f.s2Blast || 0],
        ult: [hits ? f.uLTHitBlast || 0 : null, f.ultBlast || 0],
        kiFired: f.shotEnergyBulletCount || 0,
        skills: f.skillsUsed || 0,
        kills: f.kills || 0,
        hpLeft,
        hpMax: f.hPGaugeValueMax || 0,
        stats: {
          name: nameOf(f.formId),
          hasAdditionalCounts: hits,
          damageDone: f.damageDone || 0,
          damageTaken: f.damageTaken || 0,
          battleTime: f.battleTime || 0,
          hPGaugeValue: hpLeft,
          hPGaugeValueMax: f.hPGaugeValueMax || 0,
          kills: f.kills || 0,
          s1Blast: f.s1Blast || 0,
          s2Blast: f.s2Blast || 0,
          ultBlast: f.ultBlast || 0,
          s1HitBlast: f.s1HitBlast || 0,
          s2HitBlast: f.s2HitBlast || 0,
          uLTHitBlast: f.uLTHitBlast || 0,
          exa1Count: at.skills.exa1 - (i ? before.skills.exa1 : 0),
          exa2Count: at.skills.exa2 - (i ? before.skills.exa2 : 0),
          shotEnergyBulletCount: f.shotEnergyBulletCount || 0,
          // The Overview's Blasts and Ultimates style rates (utils/characterOverview.js).
          specialMovesUsed: f.specialMovesUsed || 0,
          ultimatesUsed: f.ultimatesUsed || 0,
          rushHits: at.hits.rush - (i ? before.hits.rush : 0),
          heavyHits: at.hits.heavy - (i ? before.hits.heavy : 0),
          maxComboNum: best(i, 'combo'),
          maxComboDamage: best(i, 'comboDamage'),
          throwCount: f.throwCount || 0,
          guardCount: f.guardCount || 0,
          superCounterCount: f.superCounterCount || 0,
          zCounterCount: f.zCounterCount || 0,
          revengeCounterCount: f.revengeCounterCount || 0,
          tags: f.tags || 0,
          vanishingAttackCount: f.vanishingAttackCount || 0,
          lightningAttackCount: f.lightningAttackCount || 0,
          dragonHomingCount: f.dragonHomingCount || 0,
          speedImpactCount: f.speedImpactCount || 0,
          speedImpactWins: f.speedImpactWins || 0,
          sparkingCount: f.sparkingCount || 0,
          chargeCount: f.chargeCount || 0,
          dragonDashMileage: Math.round(f.dragonDashMileage || 0),
        },
      };
    }),
  };
}

/**
 * A character's forms over many matches, for the Character page's Forms tab:
 * each match's matchForms() (the aggregation keeps them on its match rows as
 * `forms`), averaged per form over the matches that reached it, in the order
 * the forms are usually taken. Only matches it transformed in count: a form's
 * figures are what it did in that form when the character changed form, as
 * the Match page shows one match. Matches whose file gives no per-form figures
 * (matchForms()'s 'missing' and 'shared') are left out, and counted.
 *
 *   { forms, transformed, usable }
 *
 * Each form has matchForms()'s fields, as averages per match that reached it,
 * plus `reached` (how many of the `usable` matches reached it) and `start`
 * (true for the form every one of them began in: it is not reached, it is
 * where the character starts, the league's point on 2026-09-30). Rates are
 * worked from the sums (efficiency from total dealt over total taken, damage
 * per second from total damage over total time). A move's hit/thrown averages
 * over the matches that record hits, when any do. HP left averages over the
 * matches where the form has its own (not one that ended in a fusion).
 */
export function averageForms(matches) {
  const transformed = (matches || []).filter(m => (m.formChangeCount || 0) > 0);
  const usable = transformed.filter(m => Array.isArray(m.forms) && m.forms.length);
  const by = new Map();
  const MOVES = ['s1', 's2', 'ult'];
  for (const m of usable) {
    m.forms.forEach((f, i) => {
      let a = by.get(f.id);
      if (!a) {
        a = { id: f.id, name: f.name, fusion: null, n: 0, at: 0, first: 0, seconds: 0, damageDone: 0, damageTaken: 0,
          kiFired: 0, skills: 0, kills: 0, hp: 0, hpN: 0, hpMax: 0 };
        for (const k of MOVES) Object.assign(a, { [`${k}Hit`]: 0, [`${k}KnownThrown`]: 0, [`${k}Known`]: 0, [`${k}Thrown`]: 0 });
        by.set(f.id, a);
      }
      a.n++;
      a.at += i;
      if (i === 0) a.first++;
      if (f.fusion && !a.fusion) a.fusion = f.fusion;
      for (const k of ['seconds', 'damageDone', 'damageTaken', 'kiFired', 'skills', 'kills']) a[k] += f[k] || 0;
      for (const k of MOVES) {
        const [hit, thrown] = f[k];
        a[`${k}Thrown`] += thrown || 0;
        if (hit !== null) { a[`${k}Hit`] += hit; a[`${k}KnownThrown`] += thrown || 0; a[`${k}Known`]++; }
      }
      if (f.hpLeft !== null && f.hpLeft !== undefined) { a.hp += f.hpLeft; a.hpN++; }
      a.hpMax = Math.max(a.hpMax, f.hpMax || 0);
    });
  }
  const forms = [...by.values()]
    .sort((x, y) => x.at / x.n - y.at / y.n || y.n - x.n)
    .map(a => {
      const avg = k => a[k] / a.n;
      const move = k => (a[`${k}Known`]
        ? [a[`${k}Hit`] / a[`${k}Known`], a[`${k}KnownThrown`] / a[`${k}Known`]]
        : [null, a[`${k}Thrown`] / a.n]);
      return {
        id: a.id,
        name: a.name,
        fusion: a.fusion,
        reached: a.n,
        start: a.first > 0 && a.first === usable.length,
        seconds: avg('seconds'),
        damageDone: avg('damageDone'),
        damageTaken: avg('damageTaken'),
        efficiency: combatEfficiency(a.damageDone, a.damageTaken),
        dps: a.seconds > 0 ? a.damageDone / a.seconds : 0,
        s1: move('s1'),
        s2: move('s2'),
        ult: move('ult'),
        kiFired: avg('kiFired'),
        skills: avg('skills'),
        kills: avg('kills'),
        hpLeft: a.hpN ? a.hp / a.hpN : null,
        hpMax: a.hpMax,
      };
    });
  return { forms, transformed: transformed.length, usable: usable.length };
}

/** A transformed record's forms before its last: the ids its snapshots are keyed by. */
const snapshotIds = rec => {
  const orig = rec && rec.battlePlayCharacter && rec.battlePlayCharacter.originalCharacter && rec.battlePlayCharacter.originalCharacter.key;
  return [orig, ...(rec.formChangeHistory || []).map(f => f.key)].slice(0, -1);
};

/**
 * The characterRecord keys whose per-form snapshots another fighter in the
 * same match shares (see matchForms()'s 'shared'), as a Set.
 */
export function sharedFormSnapshots(characterRecord) {
  const transformed = Object.entries(characterRecord || {}).filter(([, r]) => Array.isArray(r.formChangeHistory) && r.formChangeHistory.length);
  const uses = {};
  for (const [, r] of transformed) for (const id of new Set(snapshotIds(r))) uses[id] = (uses[id] || 0) + 1;
  return new Set(transformed.filter(([, r]) => snapshotIds(r).some(id => uses[id] > 1)).map(([k]) => k));
}
