/**
 * Merges new fields from Blast_Data.csv into blast.json.
 * Existing fields in blast.json are NOT replaced.
 * Characters with empty arrays get new entries created from CSV data.
 */

const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, 'Blast_Data.csv');
const JSON_PATH = path.join(__dirname, '..', 'apps', 'calculator', 'public', 'data', 'blast.json');

// ── CSV Parser (handles quoted fields with embedded commas/newlines) ──────────
function parseCSV(content) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (c === '"') {
      if (inQuotes && content[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push(field);
      field = '';
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && content[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some(f => f.trim() !== '')) rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  // Last row if file doesn't end with newline
  row.push(field);
  if (row.some(f => f.trim() !== '')) rows.push(row);

  return rows;
}

// Normalise header names (strip embedded newlines, trim)
function normalise(str) {
  return str.replace(/[\r\n]+/g, ' ').trim();
}

// Convert a raw CSV string value to an appropriate JS type
function parseVal(v) {
  if (v === undefined || v === null) return null;
  const s = v.trim();
  if (s === '' || s === '#N/A') return null;
  if (s === 'TRUE') return true;
  if (s === 'Yes') return true;
  if (s === 'No') return false;
  const n = Number(s);
  if (!isNaN(n)) return n;
  return s;
}

// ── Load & index the CSV ──────────────────────────────────────────────────────
const csvRaw = fs.readFileSync(CSV_PATH, 'utf8');
const rows = parseCSV(csvRaw);
if (rows.length === 0) { console.error('CSV empty'); process.exit(1); }

// Build a normalised header-to-index map from the first row
const rawHeaders = rows[0];
const headerIdx = {};
rawHeaders.forEach((h, i) => { headerIdx[normalise(h)] = i; });

// Helper: get value from row by normalised column name
function col(row, name) {
  const idx = headerIdx[name];
  return idx !== undefined ? row[idx] : undefined;
}

// Index CSV rows by "Character|Slot"
const csvByKey = {};
for (let r = 1; r < rows.length; r++) {
  const row = rows[r];
  const char = (row[headerIdx['Character']] || '').trim();
  const slot = (row[headerIdx['Slot']] || '').trim();
  if (!char || !slot) continue;
  csvByKey[`${char}|${slot}`] = row;
}

// ── Helpers to build JSON entries ─────────────────────────────────────────────

// The extra fields we want to add from CSV (only when non-null)
const EXTRA_FIELDS = [
  ['maxExpendEnergy',    'Max ExpendEnergy'],
  ['triggerExpendEnergy','Trigger ExpendEnergy'],
  ['lungeSpeed',         'LungeSpeed'],
  ['moveLimitTime',      'MoveLimitTime'],
  ['targetGiant',        'TargetGiant'],
  ['unblockable',        'Unblockable'],
  ['destroyMap',         'Destroy Map'],
  ['audienceFlees',      'Audience Flees'],
  ['lockOnNeeded',       'Lock On Needed'],
  ['beamClashCapable',   'Beam Clash Capable'],
  ['dashClashCapable',   'Dash Clash Capable'],
];

// Add extra fields to an existing entry; skip any key that already exists
function addExtraFields(entry, csvRow) {
  for (const [jsonKey, csvCol] of EXTRA_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(entry, jsonKey)) continue;
    const v = parseVal(col(csvRow, csvCol));
    if (v !== null) entry[jsonKey] = v;
  }
}

// Build a brand-new entry from a CSV row (for empty-array characters)
function buildEntry(csvRow) {
  const entry = {};

  entry.slot     = (col(csvRow, 'Slot') || '').trim();
  entry.name     = (col(csvRow, 'BlastSkillName') || '').trim() || null;
  entry.category = (col(csvRow, 'BlastCategory') || '').trim() || null;
  entry.type     = (col(csvRow, 'Type') || '').trim() || null;

  const bd  = parseVal(col(csvRow, 'Base Damage'));
  const bdp = parseVal(col(csvRow, 'Base Damage After Patch'));
  const bdd = parseVal(col(csvRow, 'Boosted Damage'));
  const bddp = parseVal(col(csvRow, 'Boosted Damage After Patch'));
  const ip  = parseVal(col(csvRow, 'BlastImpactPower'));

  entry.baseDamage        = typeof bd  === 'number' ? bd  : null;
  entry.baseDamagePatch   = typeof bdp === 'number' ? bdp : null;
  entry.boostedDamage     = typeof bdd === 'number' ? bdd : null;
  entry.boostedDamagePatch = typeof bddp === 'number' ? bddp : null;
  entry.impactPower       = typeof ip  === 'number' ? ip  : null;

  // Traits from CSV trait columns
  const traitCols = ['Trait 1', 'Trait 2', 'Trait 3', 'Trait 4', 'OperationalTrait'];
  const traits = traitCols
    .map(tc => (col(csvRow, tc) || '').trim())
    .filter(Boolean);
  entry.traits = traits;

  // Add extra fields
  addExtraFields(entry, csvRow);

  return entry;
}

// ── Process the JSON ──────────────────────────────────────────────────────────
const blastJson = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));

let updatedChars = 0;
let addedFields = 0;
let newEntries = 0;

for (const charName of Object.keys(blastJson)) {
  if (charName === 'Character') continue; // schema header row

  const blasts = blastJson[charName];
  if (!Array.isArray(blasts)) continue;

  if (blasts.length === 0) {
    // Character exists in JSON but has no data → build entries from CSV
    const possible = ['BlastSkill1', 'BlastSkill2', 'BlastUltimate',
                      'Replacement Slot1', 'Replacement Slot2'];
    const newArr = [];
    for (const slot of possible) {
      const key = `${charName}|${slot}`;
      if (csvByKey[key]) {
        newArr.push(buildEntry(csvByKey[key]));
        newEntries++;
      }
    }
    if (newArr.length > 0) {
      blastJson[charName] = newArr;
      updatedChars++;
    }
  } else {
    // Character has existing entries → add extra fields only
    for (const blast of blasts) {
      const key = `${charName}|${blast.slot}`;
      if (!csvByKey[key]) continue;

      const before = Object.keys(blast).length;
      addExtraFields(blast, csvByKey[key]);
      const after = Object.keys(blast).length;
      addedFields += (after - before);
    }
    updatedChars++;
  }
}

// ── Write the result ──────────────────────────────────────────────────────────
fs.writeFileSync(JSON_PATH, JSON.stringify(blastJson, null, 2));

console.log(`Done.`);
console.log(`  Characters processed  : ${updatedChars}`);
console.log(`  New entries created   : ${newEntries}`);
console.log(`  Extra fields added    : ${addedFields}`);
