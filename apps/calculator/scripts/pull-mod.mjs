/**
 * Snapshots the league's capsule mod (DBZLCapsules) from an FModel JSON export into committed CSVs under
 * data/snapshots/dbzl-mod/, in the same long-table form as the game snapshot (pull-fmodel.mjs): the mod's
 * capsules (DBZL_Cap_<n>), their effect files and the timed buffs those effects apply. Offline; run it by hand
 * after the mod changes, then review the diff. fmodel-parity.mjs then checks curated/capsule-effects.csv
 * against it, as it does the game's capsules (scripts/lib/fmodelData.mjs merges the two snapshots).
 *
 * Tables
 *   capsules.csv          capsule id, English name and description (the mod's own text), effect files
 *   capsule-effects.csv   capsule id, effect, file, field, value: non-zero changes, true conditions and the
 *                         parameters of the conditions that are on (an SP percent with bSPPer, and so on)
 *   buff-params.csv       file, field, value: the buffs' non-zero ParameterChanging and their EffectiveTime
 *
 * Usage: node scripts/pull-mod.mjs <mod folder>
 *        (the folder holding DBZL_Cap_*.json, e.g.
 *        FModel/Output/Exports/SparkingZERO/Mods/DBZLCapsules/Content/DBZLCapsules)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { leaves, text } from './lib/fmodel.mjs';
import { readCsv, toCsv, writeIfChanged } from './lib/csv.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '..', 'data', 'snapshots', 'dbzl-mod');

const root = process.argv[2] || process.env.DBZL_MOD_EXPORT;
if (!root || !fs.existsSync(root)) { console.error('pull-mod: pass the DBZLCapsules mod folder (or set DBZL_MOD_EXPORT)'); process.exit(1); }

// "/DBZLCapsules/DBZLCapsules/Effects/DBZL_Cap_Eff_10.0" -> <root>/Effects/DBZL_Cap_Eff_10.json
const load = (objectPath) => {
  const rel = objectPath.replace(/^\/DBZLCapsules\/DBZLCapsules\//, '').replace(/\.\d+$/, '');
  const f = path.join(root, `${rel}.json`);
  if (!fs.existsSync(f)) throw new Error(`pull-mod: ${objectPath} is not in the export (${f})`);
  const a = JSON.parse(fs.readFileSync(f, 'utf8'))[0];
  return { name: a.Name, props: a.Properties || {} };
};

// A condition's parameters only count when its flag is on (bSPPer -> SPPercent, ...).
const CONDITION_PARAMS = {
  bHPPer: 'HPPercent', bSPPer: 'SPPercent', bStockNum: 'StockNum', bDP: 'DP', bDPComparison: 'DPComparison',
  bSPLevel: 'IfSPLevel', bEx: 'ExParam', bPassingEmoteTime: 'EmoteTime', bInMap: 'ConditionMaps', bGender: 'ConditionGender',
  bLockon: 'IfLockon', bSparking: 'IfSparking', bInWater: 'IfInWater', bDown: 'IfDown',
};
const PARAM_FLAG = Object.fromEntries(Object.entries(CONDITION_PARAMS).map(([flag, p]) => [p, flag]));
const isZero = (v) => v === 0 || v === false || v === 'None' || v === '' || v === null;
// Template leftovers on an effect that change nothing in battle (an emote index, an AI level, an accessory)
const COSMETIC = /^(EmoteIndex|AiLevel|AccessoryValue|ExpGainMultiplier|VoiceSoundCueID|Costume|Accessory|BGM|AiType)$/;

function effectRows(asset) {
  const out = [];
  (asset.props.Effects || []).forEach((eff, k) => {
    const on = new Set();
    for (const [field, v] of leaves(eff.Conditions || [])) {
      const m = field.match(/^\[(\d+)\]\.(b\w+)$/);
      if (m && v === true) on.add(`${m[1]}.${m[2]}`);
    }
    for (const [field, v] of leaves(eff, { skip: COSMETIC })) {
      const cond = field.match(/^Conditions\[(\d+)\]\.(\w+)/);
      if (cond) {
        const [, j, part] = cond;
        if (part === 'Target') { if (v !== 'ESSCharacterItemConditionTarget::Myself') out.push([`Effects[${k}].${field}`, v]); continue; }
        if (part.startsWith('b')) { if (v === true) out.push([`Effects[${k}].${field}`, v]); continue; }
        if (!PARAM_FLAG[part] || !on.has(`${j}.${PARAM_FLAG[part]}`)) continue;
        // an "at or above 0%" bound is a real bound here, so a zero parameter is kept
        out.push([`Effects[${k}].${field}`, v]);
        continue;
      }
      if (/^ThisItemConditions\./.test(field) && field !== 'ThisItemConditions.bActivateOnlyOnce') continue;
      if (field === 'Target') { if (v !== 'ESSCharacterItemTarget::Myself') out.push([`Effects[${k}].${field}`, v]); continue; }
      if (isZero(v) || /\.Curve$/.test(field) || /::None$/.test(String(v))) continue;
      out.push([`Effects[${k}].${field}`, v]);
    }
  });
  return out;
}

const capsuleRows = [], effectRowsOut = [], buffRows = [];
const buffsSeen = new Set();
// Only the mod's capsules the league lists in referencedata/capsules.csv (the mod holds others, e.g. DBZL_Cap_19
// and 20, that are not meant for the sites)
const listed = new Set(readCsv(path.resolve(__dirname, '..', '..', '..', 'referencedata', 'capsules.csv')).rows.map(r => r.ID.trim()));
const ids = fs.readdirSync(root).filter(f => /^DBZL_Cap_\d+\.json$/.test(f)).map(f => f.replace(/\.json$/, '')).filter(id => listed.has(id))
  .sort((a, b) => Number(a.match(/\d+$/)) - Number(b.match(/\d+$/)));
for (const id of ids) {
  const item = load(`/DBZLCapsules/DBZLCapsules/${id}.0`);
  const effects = (item.props.EffectAssets || []).map(r => load(r.ObjectPath));
  capsuleRows.push({ id, name: item.props.Name?.SourceString ?? '', description: (item.props.InfoText?.SourceString ?? '').replace(/\r?\n/g, ' / '),
    effectFiles: effects.map(e => e.name).join(' ') });
  effects.forEach((e, ei) => {
    for (const [field, v] of effectRows(e)) {
      // leaves() gives an asset reference as its name: Effects[k].Buff = DBZL_Cap_Buff_TagHappy
      if (/^Effects\[\d+\]\.Buff$/.test(field)) {
        const buff = load(`/DBZLCapsules/DBZLCapsules/Effects/Buffs/${v}.0`);
        effectRowsOut.push({ id, effect: ei, file: e.name, field, value: buff.name });
        if (!buffsSeen.has(buff.name)) {
          buffsSeen.add(buff.name);
          for (const [bf, bv] of leaves(buff.props, { skip: /^(SearchParamChanging|ForbidParam)$/ })) {
            if (/^(ParameterChanging|ResourceChanging)\./.test(bf) || bf === 'EffectiveTime') if (!isZero(bv) && !/\.Curve$/.test(bf)) buffRows.push({ file: buff.name, field: bf, value: text(bv) });
          }
          // a buff that stops the holder switching out (Tag Happy's first 2 seconds) is a ForbidParam flag
          for (const [bf, bv] of leaves(buff.props.ParameterChanging?.ForbidParam || {}, { prefix: 'ParameterChanging.ForbidParam' })) if (bv === true) buffRows.push({ file: buff.name, field: bf, value: 'true' });
        }
        continue;
      }
      effectRowsOut.push({ id, effect: ei, file: e.name, field, value: text(v) });
    }
  });
}

fs.mkdirSync(OUT, { recursive: true });
const tables = {
  'capsules.csv': [['id', 'name', 'description', 'effectFiles'], capsuleRows],
  'capsule-effects.csv': [['id', 'effect', 'file', 'field', 'value'], effectRowsOut],
  'buff-params.csv': [['file', 'field', 'value'], buffRows],
};
let changed = 0;
for (const [f, [cols, list]] of Object.entries(tables)) {
  if (writeIfChanged(path.join(OUT, f), toCsv(cols, list.map(r => cols.map(c => r[c]))))) { changed++; console.log(`  wrote ${f}`); }
}
console.log(`pull-mod: ${capsuleRows.length} capsules, ${effectRowsOut.length} effect values, ${buffRows.length} buff values; ${changed} file(s) changed.`);
