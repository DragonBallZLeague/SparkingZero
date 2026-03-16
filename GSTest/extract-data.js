/**
 * Extracts data from the Sparking Zero Player Calculator xlsx
 * and writes JSON files to apps/calculator/public/data/
 */
const XLSX = require('../node_modules/xlsx');
const fs = require('fs');
const path = require('path');

const wb = XLSX.readFile(path.join(__dirname, 'Sparking Zero Player Calculator 1.0 (1).xlsx'));
const outDir = path.join(__dirname, '../apps/calculator/public/data');
fs.mkdirSync(outDir, { recursive: true });

// Build name→id lookup from transformations.json
const transformations = JSON.parse(fs.readFileSync(path.join(__dirname, '../referencedata/transformations.json'), 'utf8'));
const nameToId = {};
Object.entries(transformations).forEach(([id, data]) => {
  if (data.name) nameToId[data.name] = id;
});

// ── 1. CHARACTERS (Stats sheet) ──────────────────────────────────────────────
const statsWs = wb.Sheets['Stats'];
const statsRaw = XLSX.utils.sheet_to_json(statsWs, { header: 1, defval: null });
const statHeaders = statsRaw[1];

const characters = statsRaw.slice(2).filter(r => r[0]).map(row => ({
  name: row[0],
  class: row[1],
  dp: row[2],
  switch: row[3],
  armorBreak: row[4],
  meleeDefenseStat: row[5],
  kiBlastDefenseArmor: row[6],
  blastDefense: row[7],
  health: row[8],
  melee: row[9],
  energy: row[10],
  energyDecimal: row[11],
  armor: row[12],
  hit2: row[13],
  hit3: row[14],
  hit4: row[15],
  hit5: row[16],
  fiveHitAfterArmor: row[17],
  rush5Hit: row[18],
  misc: row[19],
  rush: row[20],
  smash: row[21],
  throw: row[22],
  pursuit: row[23],
  chain: row[24],
  perception: row[25],
  sCounter: row[26],
  super: row[27],
  ultimate: row[28],
  shortDashCost: row[29],
  kiBlastDmg: row[30],
  kiBlast: row[31],
  kiBlastCost: row[32],
  kiBlastLimit: row[33],
  startingKi: row[34],
  kiCharge: row[35],
  attackKiGain: row[36],
  kiRegen: row[37],
  kiRegenRange: row[38],
  skillStart: row[39],
  skillLimit: row[40],
  skillRegen: row[41],
  skillDmg: row[42],
  skill1Name: row[43],
  skill1Damage: row[44],
  skill2Name: row[45],
  skill2Damage: row[46],
  sparkCharge: row[47],
  sparkDuration: row[48],
  sparkStatBuffs: (() => {
    const raw = row[49];
    if (!raw) return null;
    const LABEL_MAP = {
      'melee':       'meleeBuff',
      'offense':     'meleeBuff',
      'defense':     'defenseBuff',
      'ki blast':    'kiBlastBuff',
      'ki':          'kiBlastBuff',
      'ki charge':   'kiChargingBuff',
      'ki charging': 'kiChargingBuff',
      'blast':       'blastBuff',
      'special':     'blastBuff',
      'ultimate':    'ultimateBuff',
    };
    const result = {};
    String(raw).split(',').forEach(part => {
      const trimmed = part.trim();
      const lastSpace = trimmed.lastIndexOf(' ');
      if (lastSpace === -1) return;
      const label = trimmed.slice(0, lastSpace).trim().toLowerCase();
      const value = parseFloat(trimmed.slice(lastSpace + 1));
      const key = LABEL_MAP[label];
      if (key && !isNaN(value)) result[key] = value;
    });
    return Object.keys(result).length ? result : null;
  })(),
  miscellaneous: row[50],
  id: nameToId[row[0]] ?? null,
}));

fs.writeFileSync(path.join(outDir, 'characters.json'), JSON.stringify(characters, null, 2));
console.log(`✓ characters.json — ${characters.length} characters`);

// ── 2. CAPSULES (Capsule & Calculation sheet) ─────────────────────────────────
const capsWs = wb.Sheets['Capsule & Calculation'];
const capsRaw = XLSX.utils.sheet_to_json(capsWs, { header: 1, defval: null });

function parseEffect(str) {
  if (!str) return null;
  str = str.trim();
  // Handle separator variants (: or ;)
  const sep = str.includes(':') ? ':' : str.includes(';') ? ';' : null;
  if (!sep) return { key: str, value: null };
  const parts = str.split(sep);
  const key = parts[0].trim();
  const value = parts.length > 1 ? parseFloat(parts[1].trim()) : null;
  return { key, value: isNaN(value) ? null : value };
}

const capsules = capsRaw.slice(2)
  .filter(r => r[1] && r[1] !== '---' && r[1] !== 'Capsule')
  .map(row => {
    const effects = [row[17], row[18], row[19], row[20], row[21]]
      .filter(e => e && typeof e === 'string' && e.trim())
      .map(parseEffect)
      .filter(Boolean);
    return {
      name: row[1],
      cost: row[2],
      description: row[3],
      effects,
    };
  });

fs.writeFileSync(path.join(outDir, 'capsules.json'), JSON.stringify(capsules, null, 2));
console.log(`✓ capsules.json — ${capsules.length} capsules`);

// ── 3. SKILLS & BLASTS (Skills and Blasts sheet) ─────────────────────────────
const skillsWs = wb.Sheets['Skills and Blasts'];
const skillsRaw = XLSX.utils.sheet_to_json(skillsWs, { header: 1, defval: null });

// Header is row index 1 (0-based)
// Blast section: cols 0-27, Skills section: cols 28+
// Col layout for Blasts: ID, Character, Slot, BlastSkillName, BlastCategory, Type,
//   Base Damage, Base Damage After Patch, Boosted Damage, Boosted Damage After Patch,
//   BlastImpactPower, MaxExpendEnergy, TriggerExpendEnergy, LungeSpeed, MoveLimitTime,
//   TargetGiant, Unblockable, DestroyMap, AudienceFlees, LockOnNeeded,
//   BeamClashCapable, DashClashCapable, Trait1, Trait2, Trait3, Trait4, OperationalTrait
// Col layout for Skills (starting col 28): ID, Names, Type, InstantSparking, InstantKi,
//   Unblockable, ActivationTime, Duration, MobilePenalty, HealthAmount, KiAmount,
//   BaseDamage, Cost, MeleeBuff, DefenseBuff, KiBlastBuff, KiChargingBuff,
//   BlastBuff, UltimateBuff, Armor, Cutscene

// Build per-character skills map
const blastsByChar = {};
skillsRaw.slice(2).forEach(row => {
  if (!row[1]) return;
  const charName = row[1];
  if (!blastsByChar[charName]) blastsByChar[charName] = [];
  blastsByChar[charName].push({
    slot: row[2],
    name: row[3],
    category: row[4],
    type: row[5],
    baseDamage: row[6],
    baseDamagePatch: row[7],
    boostedDamage: row[8],
    boostedDamagePatch: row[9],
    impactPower: row[10],
    traits: [row[22], row[23], row[24], row[25], row[26]].filter(Boolean),
  });
});

fs.writeFileSync(path.join(outDir, 'blast.json'), JSON.stringify(blastsByChar, null, 2));
console.log(`✓ blast.json — ${Object.keys(blastsByChar).length} characters with blasts`);

// ── 4. TEAMS + CHARACTER IMAGES (Dropdowns sheet) ────────────────────────────
const dropWs = wb.Sheets['Dropdowns'];
const dropRaw = XLSX.utils.sheet_to_json(dropWs, { header: 1, defval: null });

// Row 2 (index 2) = team names in cols 0-12
const teamNames = dropRaw[2].slice(0, 13).filter(Boolean);
console.log('Teams:', teamNames);

// Teams: cols 0-12 each contain a list of characters for that team (rows 3+)
const teams = {};
teamNames.forEach((team, colIdx) => {
  const members = [];
  dropRaw.slice(3).forEach(row => {
    if (row[colIdx]) members.push(row[colIdx]);
  });
  teams[team] = members;
});

// Character image map: built from transformations.json + char_thumbnails/ FaceP1 files
const thumbDir = path.join(__dirname, '../apps/calculator/public/char_thumbnails');
const characterImages = {};
Object.entries(transformations).forEach(([id, data]) => {
  if (!data.name) return;
  const filename = `T_UI_FaceP1_${id}_00.png`;
  if (fs.existsSync(path.join(thumbDir, filename))) {
    characterImages[data.name] = filename;
  }
});
fs.writeFileSync(path.join(outDir, 'teams.json'), JSON.stringify({ teamNames, teams }, null, 2));
fs.writeFileSync(path.join(outDir, 'characterImages.json'), JSON.stringify(characterImages, null, 2));
console.log(`✓ teams.json — ${teamNames.length} teams`);
console.log(`✓ characterImages.json — ${Object.keys(characterImages).length} character images`);

// ── 5. SZSKILLS (SZSkills.xlsx) ────────────────────────────────────────────────
const szSkillsWb = XLSX.readFile(path.join(__dirname, 'SZSkills.xlsx'));
const szSkillsWs = szSkillsWb.Sheets['Sheet1'];
const szSkillsRaw = XLSX.utils.sheet_to_json(szSkillsWs, { header: 1, defval: null });

const szSkills = szSkillsRaw.slice(1).filter(r => r[1]).map(row => ({
  id: row[0],
  name: row[1],
  type: row[2],
  instantSparking: row[3],
  instantKi: row[4],
  unblockable: row[5],
  activationTime: row[6],
  duration: row[7],
  mobilePenalty: row[8],
  healthAmount: row[9],
  kiAmount: row[10],
  baseDamage: row[11],
  cost: row[12],
  meleeBuff: row[13],
  defenseBuff: row[14],
  kiBlastBuff: row[15],
  kiChargingBuff: row[16],
  blastBuff: row[17],
  ultimateBuff: row[18],
  armor: row[19],
  cutscene: row[20],
}));

fs.writeFileSync(path.join(outDir, 'skills.json'), JSON.stringify(szSkills, null, 2));
console.log(`✓ skills.json — ${szSkills.length} skills`);

console.log('\nAll data extracted successfully!');
