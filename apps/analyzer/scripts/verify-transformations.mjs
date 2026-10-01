/**
 * Guards how transformations are counted (src/utils/transformation.js) and the
 * reference they are counted from (referencedata/transformations.json).
 *
 * WHY THIS EXISTS
 *
 * A wrong transformation count fails silently: a revert taken for a move up
 * makes a character that cannot transform look like one that never does, a
 * move the reference is missing hides a character's transformations, and a
 * fusion credited to the wrong side moves a rate. The pages render a tidy
 * percentage either way. So:
 *
 *   1. The rules themselves, on made-up matches (FAILS the build): fusions
 *      count for the character that starts them, reverts are not
 *      transformations, Broly's Ring and unfought matches are left out, and a
 *      character that can only fuse counts only with its partner on its team.
 *   2. The reference against the real matches (WARNS, never fails, like
 *      verify-portraits: a new character can reach match data before anyone
 *      adds its moves): every form change a file records should be a move the
 *      reference lists; none should be what the rules call a revert (no file
 *      has ever recorded one); and no match with Broly's Ring should transform.
 *      (A fusion's partner is not checked: a file has no record of a partner
 *      absorbed before it fought, 12 of the 32 fusions, and a fused match
 *      counts whatever the lineup.)
 *
 * `--list` also prints every form the rules judge unable to transform although
 * the reference lists moves for it (their only moves are back down), for the
 * league to check once.
 *
 * In prebuild, after the corpus is built. Usage: npm run verify-transformations [-- --list]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import transformationsData from '../../../referencedata/transformations.json' with { type: 'json' };
import {
  BROLYS_RING, isFusionStep, isRevert, canTransform, upwardMoves, fusionPartners,
  matchTransformation, transformationSummary,
} from '../src/utils/transformation.js';
import { sideOfRecordKey } from '../src/utils/fusionSplit.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(__dirname, '..');
const LIST = process.argv.includes('--list');

let failures = 0;
function check(label, cond, detail) {
  if (cond) return;
  failures++;
  console.error('verify-transformations: FAIL ' + label + (detail ? `\n    ${detail}` : ''));
}

// ---- 1. The rules, on made-up matches ----------------------------------------
const row = (formIds, more = {}) => ({ formIds, battleTime: 90, equippedCapsules: [], fileName: 'test.json', side: 1, ...more });
const lineup = ids => new Map([['test.json|1', new Set(ids)]]);
const t = (id, m, lineups = null) => matchTransformation(m, { id, lineups });

check('a move back to the base form is a revert', isRevert('0000_23', '0000_20') && !isRevert('0000_20', '0000_23'));
check('a hub is the base: Super Trunks reverts to Trunks (Melee)', isRevert('0081_20', '0080_10') && !isRevert('0080_10', '0081_20'));
check('a base named inside the form: Super Vegito reverts to Vegito', isRevert('0100_01', '0100_00'));
check('one-way chains transform (Jiren, Frieza (Super), Third Eye Gomah)', canTransform('0930_00') && canTransform('0153_20') && canTransform('3080_00'));
check('a form whose only move is down cannot transform', !canTransform('0000_11') && !canTransform('0082_01') && !canTransform('0000_23'));
check('a fusion is not an upward move', !upwardMoves('0800_01').includes('0810_01'));
check('a fusion step is from one of its partners', isFusionStep('0800_01', '0810_01') && !isFusionStep('0120_00', '0120_01'));

const up = t('0000_20', row(['0000_20', '0000_21']));
check('a transformation counts', up.counted && up.transformed && !up.fused);
const none = t('0000_20', row(null));
check('a match it could have transformed in counts', none.counted && !none.transformed);
check("Broly's Ring is left out", t('0000_20', row(['0000_20', '0000_21'], { equippedCapsules: [{ id: BROLYS_RING }] })).reason === 'brolys-ring');
check('an unfought match is left out', t('0000_20', row(null, { battleTime: 0 })).reason === 'unfought');
check('a character with no moves is left out', t('0050_00', row(null)).reason === 'cannot');
const fusion = t('0800_01', row(['0800_01', '0810_01', '0811_00']));
check('a fusion counts for the character that starts it', fusion.counted && fusion.transformed && fusion.fused);
const gotenks = t('0120_00', row(['0120_00', '0120_01']));
check('a fused character transforming is not a new fusion', gotenks.transformed && !gotenks.fused);
check('fusion-only: no partner on the team is left out', t('0082_01', row(null), lineup(['0082_01', '0050_00'])).reason === 'no-partner');
check('fusion-only: partner in any of its forms counts', t('0082_01', row(null), lineup(['0082_01', '0090_01'])).counted);
check('fusion-only: the partner must be on the same side', t('0082_01', row(null), new Map([['test.json|2', new Set(['0090_00'])]])).reason === 'no-partner');
const timed = t('0000_20', row(['0000_20', '0000_21'], { forms: [{ seconds: 40 }, { seconds: 50 }] }));
check('time to the first transformation is the first form\'s time', timed.seconds === 40);

const sum = transformationSummary([
  row(['0000_20', '0000_21'], { forms: [{ seconds: 30 }, { seconds: 9 }] }),
  row(['0000_20', '0000_22'], { forms: [{ seconds: 50 }, { seconds: 9 }] }),
  row(null),
  row(null, { battleTime: 0 }),
  row(['0000_20', '0000_21'], { equippedCapsules: [{ id: BROLYS_RING }] }),
], { id: '0000_20' });
check('a summary counts, rates and times its matches',
  sum.matches === 3 && sum.transformed === 2 && Math.abs(sum.rate - 2 / 3) < 1e-9 && sum.seconds === 40
  && sum.left.unfought === 1 && sum.left['brolys-ring'] === 1 && sum.able,
  JSON.stringify(sum));
check('a character that cannot transform or fuse is not able', !transformationSummary([row(null)], { id: '0050_00' }).able);

// ---- 2. The reference against the real matches --------------------------------
const csv = fs.readFileSync(path.resolve(APP, '..', '..', 'referencedata', 'characters.csv'), 'utf8');
const names = {};
for (const line of csv.replace(/^﻿/, '').split(/\r?\n/).slice(1)) {
  const i = line.lastIndexOf(',');
  const id = line.slice(i + 1).trim();
  if (/^\d{4}_\d{2}$/.test(id)) names[id] = line.slice(0, i).trim();
}
const nameOf = id => names[id] || transformationsData[id]?.name || id;
const warnings = [];
const warn = (title, items) => { if (items.length) warnings.push([title, items]); };

const entries = Object.entries(transformationsData).filter(([k]) => k !== '_comment');
warn('characters with no entry in transformations.json (read as unable to transform)',
  Object.keys(names).filter(id => !transformationsData[id]).map(id => `${id}  ${names[id]}`));
warn('ids in transformations.json that characters.csv does not have',
  [...new Set(entries.flatMap(([k, e]) => [k, ...(e.transformsTo || []), ...(e.fusionOf || [])]))].filter(id => !names[id]));

const parseTime = s => {
  const m = String(s || '').match(/(\d+):(\d+):(\d+(?:\.\d+)?)/);
  return m ? (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]) : 0;
};
const aggDir = path.join(APP, 'public', 'br-aggregates');
if (!fs.existsSync(path.join(aggDir, 'index.json'))) {
  console.error('verify-transformations: no corpus in public/br-aggregates; run the aggregate generator first.');
  process.exit(1);
}
const gaps = new Map(), reverts = new Map(), ringed = [];
let records = 0, changed = 0, fusions = 0;
for (const f of fs.readdirSync(aggDir)) {
  if (f === 'index.json' || !f.endsWith('.json')) continue;
  const shard = JSON.parse(fs.readFileSync(path.join(aggDir, f), 'utf8'));
  for (const file of Object.values(shard.files || {})) {
    const record = file.content?.TeamBattleResults?.battleResult?.characterRecord || {};
    const sides = new Map();
    const rows = Object.entries(record).map(([key, rec]) => {
      const id = rec.battlePlayCharacter?.originalCharacter?.key || null;
      const side = sideOfRecordKey(key);
      if (id) { if (!sides.has(side)) sides.set(side, new Set()); sides.get(side).add(id); }
      const history = (rec.formChangeHistory || []).map(h => h.key);
      return {
        id,
        m: {
          formIds: history.length ? [id, ...history] : null,
          battleTime: parseTime(rec.battleCount?.battleTime),
          equippedCapsules: (rec.battlePlayCharacter?.equipItem || []).map(e => ({ id: e.key })),
          fileName: file.name,
          side,
        },
      };
    });
    const lineups = new Map([...sides].map(([side, ids]) => [`${file.name}|${side}`, ids]));
    for (const { id, m } of rows) {
      if (!id) continue;
      records++;
      const ids = m.formIds || [];
      for (let i = 1; i < ids.length; i++) {
        const [from, to] = [ids[i - 1], ids[i]];
        const move = `${nameOf(from)} -> ${nameOf(to)}`;
        if (isFusionStep(from, to)) break; // what follows is the fusion's
        if (!(transformationsData[from]?.transformsTo || []).includes(to)) {
          if (!gaps.has(move)) gaps.set(move, { n: 0, file: file.name });
          gaps.get(move).n++;
        } else if (isRevert(from, to)) {
          if (!reverts.has(move)) reverts.set(move, { n: 0, file: file.name });
          reverts.get(move).n++;
        }
      }
      const read = matchTransformation(m, { id, lineups });
      if (ids.length > 1 && m.equippedCapsules.some(c => c.id === BROLYS_RING)) ringed.push(`${nameOf(id)}  (${file.name})`);
      if (read.transformed) { changed++; if (read.fused) fusions++; }
    }
  }
}
const counted = ([move, { n, file }]) => `${move}  x${n}  (e.g. ${file})`;
warn('form changes the match files record that transformations.json does not list (add them, or the rate misses them in other matches)', [...gaps].map(counted));
warn('recorded form changes the rules call a revert (src/utils/transformation.js isRevert() is wrong for them)', [...reverts].map(counted));
warn("transformations in matches with Broly's Ring (its id may have changed)", ringed);

const downOnly = entries.filter(([id, e]) => (e.transformsTo || []).length && !canTransform(id) && !fusionPartners(id).length);
if (LIST) {
  console.log(`verify-transformations: ${downOnly.length} forms list moves but cannot transform (only back down) or fuse:`);
  for (const [id, e] of downOnly) console.log(`  ${id}  ${e.name}  -> ${(e.transformsTo || []).map(nameOf).join(', ')}`);
}

for (const [title, items] of warnings) {
  console.warn(`verify-transformations: ${items.length} ${title}:`);
  for (const item of items.slice(0, 20)) console.warn(`  ${item}`);
  if (items.length > 20) console.warn(`  ...and ${items.length - 20} more`);
}
if (failures) {
  console.error(`verify-transformations: ${failures} rule check(s) failed.`);
  process.exit(1);
}
console.log(`verify-transformations: rules hold; ${records} character records, ${changed} transformed (${fusions} by fusion); `
  + `${entries.filter(([id]) => canTransform(id)).length} forms can transform${warnings.length ? `; ${warnings.length} warning(s) above` : ''}`
  + (LIST ? '' : ` (--list shows the ${downOnly.length} that only move back down)`));
