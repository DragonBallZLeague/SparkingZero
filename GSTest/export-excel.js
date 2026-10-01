/**
 * Exports Blasts/, Numerics/, CharacterData/, Skills/ JSON files to a single
 * Excel workbook. Run from repo root: node GSTest/export-excel.js
 */
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const GSTEST = __dirname;
const OUT_PATH = path.join(GSTEST, 'GSTest_Export.xlsx');
const FALLBACK_OUT_PATH = path.join(GSTEST, 'GSTest_Export_wide.xlsx');

// ── HELPERS ───────────────────────────────────────────────────────────────────

// UTF-16 LE files written by the game tools have a BOM that JSON.parse rejects
function readUtf16Json(filePath) {
  const raw = fs.readFileSync(filePath, 'utf16le').replace(/^\uFEFF/, '');
  return JSON.parse(raw);
}

function readUtf8Json(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function getJsonFiles(dir) {
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json') && f !== '.json')
    .map(f => ({ name: path.basename(f, '.json'), file: path.join(dir, f) }));
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function serializeCellValue(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return JSON.stringify(value);
  if (isPlainObject(value)) {
    const keys = Object.keys(value);
    if (keys.length === 1 && keys[0] === 'key') return serializeCellValue(value.key);
    return JSON.stringify(value);
  }
  return String(value);
}

function flattenValue(target, prefix, value, depth = 0, maxDepth = 2) {
  if (value === undefined || value === null) {
    target[prefix] = null;
    return;
  }

  if (Array.isArray(value)) {
    target[`${prefix}Count`] = value.length;
    target[prefix] = JSON.stringify(value);
    return;
  }

  if (!isPlainObject(value)) {
    target[prefix] = value;
    return;
  }

  const keys = Object.keys(value);
  if (keys.length === 1 && keys[0] === 'key') {
    target[prefix] = serializeCellValue(value.key);
    return;
  }

  if (depth >= maxDepth || keys.length === 0) {
    target[prefix] = serializeCellValue(value);
    return;
  }

  for (const [childKey, childValue] of Object.entries(value)) {
    flattenValue(target, `${prefix}_${childKey}`, childValue, depth + 1, maxDepth);
  }
}

// Each blast value is:  {mainJson} | {uiJson} | Key: Value | Key: Value | ...
function parseBlastValue(raw) {
  if (!raw) return null;
  const parts = raw.split(' | ');
  const result = {};

  try {
    const g = JSON.parse(parts[0]);
    result.blastSkillName = g.blastSkillName ?? null;
    result.type            = g.type?.key ?? null;
    result.bImpossibleGuard  = g.bImpossibleGuard  ?? null;
    result.bKamehameHa       = g.bKamehameHa        ?? null;
    result.bSelfDestruction  = g.bSelfDestruction   ?? null;
    result.bNonLockUsable    = g.bNonLockUsable     ?? null;
  } catch { /* malformed JSON section – skip */ }

  if (parts.length > 1) {
    try {
      const u = JSON.parse(parts[1]);
      result.category = u.text_Category_Tips   ?? null;
      result.trait1   = u.wBP_OBJ_SL_Cell_S_1  ?? null;
      result.trait2   = u.wBP_OBJ_SL_Cell_S_2  ?? null;
      result.trait3   = u.wBP_OBJ_SL_Cell_S_3  ?? null;
      result.trait4   = u.wBP_OBJ_SL_Cell_S_4  ?? null;
    } catch { /* skip */ }
  }

  const KV_MAP = {
    'Blast Group':        'blastGroup',
    'Lunge Speed':        'lungeSpeed',
    'Ki Cost':            'kiCost',
    'Health Cost':        'healthCost',
    'Health Steal':       'healthSteal',
    'Blast/Speed Impact': 'blastImpact',
    'Blast Impact Power': 'blastImpactPower',
  };
  for (let i = 2; i < parts.length; i++) {
    const colon = parts[i].indexOf(':');
    if (colon === -1) continue;
    const key = parts[i].slice(0, colon).trim();
    const val = parts[i].slice(colon + 1).trim();
    const field = KV_MAP[key];
    if (!field) continue;
    if (val === 'true')  { result[field] = true;  continue; }
    if (val === 'false') { result[field] = false; continue; }
    const n = parseFloat(val);
    result[field] = isNaN(n) ? val : n;
  }

  return result;
}

function parseSkillValue(raw) {
  if (!raw || typeof raw !== 'string') return null;

  const parts = raw.split('|').map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) return null;

  const result = {
    skillName: parts[0],
    skillType: null,
    cost: null,
    raw: raw.trim(),
  };

  for (let i = 1; i < parts.length; i++) {
    const token = parts[i];
    const colon = token.indexOf(':');
    if (colon === -1) continue;

    const key = token.slice(0, colon).trim().toLowerCase();
    const val = token.slice(colon + 1).trim();

    if (key === 'skilltype') {
      result.skillType = val || null;
    } else if (key === 'cost') {
      const num = parseFloat(val);
      result.cost = isNaN(num) ? null : num;
    }
  }

  return result;
}

// Buff/action entries: any key in a Skills file other than Skill1Data/Skill2Data/
// SkillFileData is a per-action buff, keyed like "actEXA1 - Buff_Common_036_ACO"
// (actionId - buffDataAsset). Value format is:
//   Buff Categories<None|list> | Armor: <value> | Effective Time: <value> |
//   Resource Change: {json} | Parameter Change: {json} | 
function parseBuffKey(key) {
  const sep = key.indexOf(' - ');
  if (sep === -1) return { actionId: key.trim(), buffAsset: null };
  return {
    actionId:  key.slice(0, sep).trim(),
    buffAsset: key.slice(sep + 3).trim(),
  };
}

function parseBuffValue(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const parts = raw.split(' | ');
  if (parts.length === 0) return null;

  const result = {};

  const catRaw = (parts[0] ?? '').replace(/^Buff Categories/, '').trim();
  result.buffCategories = (catRaw === '' || catRaw === 'None') ? null : catRaw;

  for (let i = 1; i < parts.length; i++) {
    const token = parts[i];
    const colon = token.indexOf(':');
    if (colon === -1) continue;

    const key = token.slice(0, colon).trim();
    const val = token.slice(colon + 1).trim();

    if (key === 'Armor') {
      result.armor = (val === '' || val === 'None') ? null : val;
    } else if (key === 'Effective Time') {
      const n = parseFloat(val);
      result.effectiveTime = isNaN(n) ? val : n;
    } else if (key === 'Resource Change') {
      try {
        flattenValue(result, 'resource', JSON.parse(val));
      } catch { /* malformed JSON section – skip */ }
    } else if (key === 'Parameter Change') {
      try {
        flattenValue(result, 'param', JSON.parse(val));
      } catch { /* malformed JSON section – skip */ }
    }
  }

  return result;
}

// ── SHEET 1: NUMERICS ─────────────────────────────────────────────────────────

console.log('Reading Numerics…');
const numericsRows = [];

for (const { name, file } of getJsonFiles(path.join(GSTEST, 'Numerics'))) {
  const outer = readUtf8Json(file);
  const d = JSON.parse(outer.NumericData);
  const speeds = d.attackChargeSpeedsbySmashLevel ?? [];
  numericsRows.push({
    character:                               name,
    life:                                    d.life,
    damageRate:                              d.damageRate,
    initialKi:                               d.initialKi,
    kiAutoRecoveryLimit:                     d.kiAutoRecoveryLimit,
    kiAutoRecoverySpeed:                     d.kiAutoRecoverySpeed,
    kiAutoRecoverySpeedUnder1Bar:            d.kiAutoRecoverySpeedUnder1Bar,
    kiChargeSpeed:                           d.kiChargeSpeed,
    kiChargeSpeedUnderAutoRecoveryLimit:     d.kiChargeSpeedUnderAutoRecoveryLimit,
    sparkingGaugeChargeSpeed:                d.sparkingGaugeChargeSpeed,
    preSparkingGaugeChargeDecreaseSpeed:     d.preSparkingGaugeChargeDecreaseSpeed,
    sparkingModeGaugeDecreaseSpeed:          d.sparkingModeGaugeDecreaseSpeed,
    blastStocks:                             d.blastStocks,
    initialBlastStocks:                      d.initialBlastStocks,
    attackChargeSpeed_Smash1:                speeds[0] ?? null,
    attackChargeSpeed_Smash2:                speeds[1] ?? null,
    attackChargeSpeed_Smash3:                speeds[2] ?? null,
    pursuitBaseLimit:                        d.pursuitBaseLimit,
    pursuitDragonHomingLimit:                d.pursuitDragonHomingLimit,
    pursuitVanishingAttackLimit:             d.pursuitVanishingAttackLimit,
    pursuitLightningAttackLimit:             d.pursuitLightningAttackLimit,
    pursuitBaseLimitAddatSparking:           d.pursuitBaseLimitAddatSparking,
    pursuitDragonHomingLimitAddatSparking:   d.pursuitDragonHomingLimitAddatSparking,
    pursuitVanishingAttackLimitAddatSparking: d.pursuitVanishingAttackLimitAddatSparking,
    pursuitLightningAttackLimitAddatSparking: d.pursuitLightningAttackLimitAddatSparking,
    bulletNum:                               d.bulletNum,
    smashBulletLimit:                        d.smashBulletLimit,
    rushScale:                               d.rushScale,
  });
}

// ── SHEET 2: BLASTS ───────────────────────────────────────────────────────────

console.log('Reading Blasts…');
const blastRows = [];
// Preferred ordering for known slots; any other slot key found in a file (e.g. ULT2, ULT3, SPM3…) is still captured.
const KNOWN_SLOT_ORDER = ['Blast1Data', 'Blast2Data', 'UltimateData', 'ULT2', 'ULT3', 'SPM3', 'SPM4'];

for (const { name, file } of getJsonFiles(path.join(GSTEST, 'Blasts'))) {
  const outer = readUtf16Json(file);
  const allSlots = Object.keys(outer);
  const orderedSlots = [
    ...KNOWN_SLOT_ORDER.filter(s => allSlots.includes(s)),
    ...allSlots.filter(s => !KNOWN_SLOT_ORDER.includes(s)),
  ];
  for (const slot of orderedSlots) {
    if (!outer[slot]) continue;
    const parsed = parseBlastValue(outer[slot]);
    if (!parsed) continue;
    blastRows.push({ character: name, slot, ...parsed });
  }
}

// ── SHEET 3: CHARACTER DATA ───────────────────────────────────────────────────

console.log('Reading CharacterData…');
const charRows = [];

for (const { name, file } of getJsonFiles(path.join(GSTEST, 'CharacterData'))) {
  const outer = readUtf16Json(file);
  const d = JSON.parse(outer.SSCharData);
  const row = { character: name };

  const scalarFields = [
    'alNumId',
    'sortId',
    'unLockType',
    'bIsInstallPlayable',
    'bIsNpcChara',
    'bIsLockDefaultCostume',
    'bAutoRefrectFlip',
    'explosionDrownOutableRadius',
    'targetSPGaugeRecoveryRateOnHit',
    'chaseChangeBlastSlot',
    'aiCharacterDataAsset',
    'animationBlueprint',
    'animationBlueprintForEventUI',
    'animationBlueprintForSupport',
    'alwaysAuraType',
    'battleAlwaysAuraType',
    'characterFigure',
    'soundDataAsset',
    'sparkingBuff',
    'hPTriggerBuff',
  ];

  for (const field of scalarFields) {
    row[field] = serializeCellValue(d[field]);
  }

  if (Array.isArray(d.validExhibitions)) {
    row.validExhibitions = d.validExhibitions.join(',');
    row.validExhibitionsCount = d.validExhibitions.length;
  } else {
    row.validExhibitions = null;
    row.validExhibitionsCount = null;
  }

  const countFields = ['costumes', 'defaultItems', 'subInstances', 'koratOperationGuideDataList'];
  for (const field of countFields) {
    row[`${field}Count`] = Array.isArray(d[field]) ? d[field].length : null;
  }

  flattenValue(row, 'nameInfo', d.nameInfo);
  flattenValue(row, 'abilityFlag', d.abilityFlag);
  flattenValue(row, 'actionFlag', d.actionFlag);
  flattenValue(row, 'blastComboParameter', d.blastComboParameter);
  flattenValue(row, 'battleAssets', d.battleAssets);
  flattenValue(row, 'commonAssets', d.commonAssets);
  flattenValue(row, 'fateData', d.fateData);
  flattenValue(row, 'footParams', d.footParams);
  flattenValue(row, 'storySettingParameter', d.storySettingParameter);
  flattenValue(row, 'underWaterEffect', d.underWaterEffect);
  flattenValue(row, 'characterCombination', d.characterCombination);

  charRows.push(row);
}

// ── SHEET 4: SKILLS ───────────────────────────────────────────────────────────

console.log('Reading Skills…');
const skillRows = [];
const buffRows = [];
const SKILL_SLOTS = ['Skill1Data', 'Skill2Data'];
const NON_BUFF_KEYS = new Set(['Skill1Data', 'Skill2Data', 'SkillFileData']);

for (const { name, file } of getJsonFiles(path.join(GSTEST, 'Skills'))) {
  const outer = readUtf16Json(file);

  for (const slot of SKILL_SLOTS) {
    const parsed = parseSkillValue(outer[slot]);
    if (!parsed) continue;
    skillRows.push({
      character: name,
      slot,
      ...parsed,
    });
  }

  if (outer.SkillFileData && String(outer.SkillFileData).trim()) {
    skillRows.push({
      character: name,
      slot: 'SkillFileData',
      skillName: null,
      skillType: null,
      cost: null,
      raw: String(outer.SkillFileData).trim(),
    });
  }

  // Any remaining keys are per-action buffs, e.g. "actEXA1 - Buff_Common_036_ACO"
  for (const key of Object.keys(outer)) {
    if (NON_BUFF_KEYS.has(key)) continue;
    if (!outer[key]) continue;
    const parsed = parseBuffValue(outer[key]);
    if (!parsed) continue;
    const { actionId, buffAsset } = parseBuffKey(key);
    buffRows.push({
      character: name,
      actionId,
      buffAsset,
      ...parsed,
    });
  }
}

// ── WRITE WORKBOOK ────────────────────────────────────────────────────────────

console.log('Writing workbook…');
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(numericsRows), 'Numerics');
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(blastRows),    'Blasts');
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(charRows),     'CharacterData');
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(skillRows),    'Skills');
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(buffRows),     'Buffs');

try {
  XLSX.writeFile(wb, OUT_PATH);
  console.log(`\n✓ ${OUT_PATH}`);
} catch (err) {
  if (err && err.code === 'EBUSY') {
    XLSX.writeFile(wb, FALLBACK_OUT_PATH);
    console.log(`\n✓ ${FALLBACK_OUT_PATH}`);
    console.log('Primary workbook was locked, so the export was written to the fallback file instead.');
  } else {
    throw err;
  }
}

console.log(`  Numerics:      ${numericsRows.length} rows`);
console.log(`  Blasts:        ${blastRows.length} rows`);
console.log(`  CharacterData: ${charRows.length} rows`);
console.log(`  Skills:        ${skillRows.length} rows`);
console.log(`  Buffs:         ${buffRows.length} rows`);