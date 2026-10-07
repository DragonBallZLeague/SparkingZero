/**
 * ONE-OFF: seeds data/curated/*.csv and data/legacy/ from the calculator's
 * previous hand-edited JSON (public/data/*.json as of dev-branch e02c05fb).
 *
 * Run once, review, commit; afterwards the curated CSVs are the source of truth
 * and are edited by hand. Rerunning overwrites them, so it refuses unless
 * --force is passed. Deleted in the cleanup phase (P5).
 *
 * What it carries over, and how:
 *   legacy/original/*.json   verbatim copies of the old files (CHANGES.md diffs against them)
 *   legacy/roster.json       the ids of the 208 characters the old app shipped
 *   legacy/capsule-effects.json  the old structured capsule effects, keyed by capsule id
 *   curated/blasts.csv       measured blast damage + display traits, relinked to the raw
 *                            Move List by move name (not by row position; the old file was
 *                            misaligned for 12 characters). Every relink is noted per row.
 *   curated/skill-display.csv  skill stock cost and display traits (type, activation time,
 *                            flags), keyed by the game's skill name; the raw map has neither
 *   curated/sparking.csv     the Sparking armor flag (no game-data source found)
 *   curated/classes.csv      game class key -> display label (+ the labels Capsule Corp uses)
 *   curated/aliases.csv      old calculator names, Capsule Corp names and website masterlist
 *                            spellings that differ from referencedata
 *   curated/overrides.csv    empty: id,field,value,reason
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { readCsv, toCsv, writeIfChanged } from '../lib/csv.mjs';
import { loadRefdata, normName, repoRoot } from '../lib/refdata.mjs';
import { moveParts, RECIPES, evaluate, blastCoef } from '../lib/blastRecipes.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(__dirname, '..', '..');
const ROOT = repoRoot(path.join(__dirname, '..'));
const DATA = path.join(APP, 'data');
const config = JSON.parse(fs.readFileSync(path.join(DATA, 'config.json'), 'utf8'));
const force = process.argv.includes('--force');

if (fs.existsSync(path.join(DATA, 'curated', 'blasts.csv')) && !force) {
  console.error('seed-curated: data/curated already seeded; pass --force to overwrite hand edits.');
  process.exit(1);
}

// ---------------------------------------------------------------- legacy copies
const ORIG = path.join(DATA, 'legacy', 'original');
const LEGACY_FILES = ['characters.json', 'skills.json', 'blast.json', 'capsules.json', 'teams.json', 'characterImages.json'];
for (const f of LEGACY_FILES) {
  const dst = path.join(ORIG, f);
  if (!fs.existsSync(dst)) {
    fs.mkdirSync(ORIG, { recursive: true });
    fs.copyFileSync(path.join(APP, 'public', 'data', f), dst);
  }
}
const legacy = Object.fromEntries(LEGACY_FILES.map(f => [f.replace('.json', ''), JSON.parse(fs.readFileSync(path.join(ORIG, f), 'utf8'))]));

const ref = loadRefdata(ROOT, config.teamsSeason);
const refById = new Map(ref.characters.map(c => [c.id, c]));
const refByName = new Map(ref.characters.map(c => [c.name, c]));
const refByNorm = new Map(ref.characters.map(c => [normName(c.name), c]));
const snap = (f) => readCsv(path.join(DATA, 'snapshots', f)).rows;
const raw = snap('charmap/characters.csv');
const moveList = snap('charmap/move-list.csv');
const cc = snap('capsulecorp/stats.csv');

// ---------------------------------------------------------------- aliases
const aliases = [];
const aliasTo = new Map();
const addAlias = (alias, id, kind, note) => {
  if (refByName.get(alias)?.id === id || aliasTo.has(alias)) return;
  aliases.push({ alias, id, name: refById.get(id).name, kind, note });
  aliasTo.set(alias, id);
};
// Renames the old calculator used that normalised matching cannot recover.
const MANUAL = {
  'Gohan (Super Hero) Ultimate Gohan': '3000_02',
  'Master Roshi Max Power': '0141_00',
};
function resolveName(name) {
  if (refByName.has(name)) return refByName.get(name).id;
  if (aliasTo.has(name)) return aliasTo.get(name);
  if (MANUAL[name]) return MANUAL[name];
  return refByNorm.get(normName(name))?.id ?? null;
}
for (const c of legacy.characters) {
  const id = c.id || resolveName(c.name);
  if (!id) throw new Error(`seed: cannot resolve old calculator name "${c.name}"`);
  if (c.name !== refById.get(id).name) addAlias(c.name, id, 'previous-name', 'name used by the calculator before the 2026-10 data rebuild; old share links carry it');
}
for (const r of cc) {
  const n = r['Character Name'];
  const id = resolveName(n);
  if (!id) throw new Error(`seed: cannot resolve Capsule Corp name "${n}"`);
  if (n !== refById.get(id).name && refByNorm.get(normName(n))?.id !== id) addAlias(n, id, 'capsulecorp', 'Capsule Corp Stats spelling');
}
// Website masterlist spellings (season yaml). Typos are mapped by hand here.
const MASTERLIST_TYPOS = {
  'Broky (Z)': 'Broly (Z)',
  'Zangaya': 'Zangya',
  'Vegeta (Z-Scouter)': 'Vegeta (Z - Scouter)',
  'Goku (World Martial Arts Tournament)': 'Goku (World Tournament)',
  'Tien (World Martial Arts Tournament)': 'Tien (World Tournament)',
  'Spike The Devil Man': 'Spike the Devil Man',
  'Supreme kai': 'Supreme Kai',
  'Saibamen': 'Saibaman',
  'Demon king Piccolo': 'Demon King Piccolo',
  'Future Gohan': 'Gohan (Future)',
  'Frieza Soldier': 'Frieza Force Soldier',
};
const masterNames = new Set(ref.season.flatMap(t => t.masterList.map(n => n.trim())));
const unresolvedMaster = [];
for (const n of masterNames) {
  if (refByName.has(n)) continue;
  const prefix = ref.characters.find(c => c.name.startsWith(n + ' '));
  if (prefix) continue; // the website's own prefix rule finds it
  const target = MASTERLIST_TYPOS[n] ? refByName.get(MASTERLIST_TYPOS[n]) || refByNorm.get(normName(MASTERLIST_TYPOS[n])) : refByNorm.get(normName(n));
  if (target) addAlias(n, target.id, 'masterlist', `website ${ref.seasonFile} spelling`);
  else unresolvedMaster.push(n);
}
if (unresolvedMaster.length) console.warn('seed: masterlist names left unresolved:', unresolvedMaster.join(' | '));
aliases.sort((a, b) => a.kind.localeCompare(b.kind) || a.alias.localeCompare(b.alias));

// ---------------------------------------------------------------- roster
const roster = legacy.characters.map(c => c.id || resolveName(c.name));

// ---------------------------------------------------------------- classes
const CLASS_LABELS = {
  'Normal': 'Normal', 'Saiyan': 'Super Saiyan', 'Saiyan_Shoot': 'Super Saiyan (Vegeta)', 'Secret': 'Secret',
  'Vegeta_Shoot': 'Ki-Blast (Vegeta)', 'Almighty_Shoot': 'Almighty (Vegeta)', 'Almighty': 'Almighty',
  'giant': 'Giant', 'rival': 'Rival', 'Power': 'Power', 'union': 'Fusion', 'Skill': 'Skill-User',
  'Skill2': 'Skill-User (Yajirobe)', 'Satan': 'Skill-User (Mr. Satan)', 'Shoot': 'Ki-Blast', 'villain': 'Villain',
  'Speed': 'Speed', 'Android Normal': 'Infinite Ki Android (Normal)', 'Android Power': 'Infinite Ki Android (Power)',
  'Android Shoot': 'Infinite Ki Android (Ki-Blast)', 'Mecha Power': 'Ki Drain Android (Power)',
  'Mecha Normal': 'Ki Drain Android (Normal)', 'legend Saiyan': 'Legendary Super Saiyan', 'god': 'God',
};
const ccByNorm = new Map(cc.map(r => [normName(r['Character Name']), r]));
for (const a of aliases.filter(a => a.kind === 'capsulecorp')) ccByNorm.set(normName(a.name), cc.find(r => r['Character Name'] === a.alias));
const classRows = new Map();
for (const r of raw) {
  const key = r['Class (game key)'];
  if (!CLASS_LABELS[key]) throw new Error(`seed: no label for class key "${key}"`);
  const row = classRows.get(key) || { key, label: CLASS_LABELS[key], ccLabels: new Set(), count: 0 };
  row.count++;
  const ccRow = ccByNorm.get(normName(refById.get(r['Character ID']).name));
  if (ccRow) row.ccLabels.add(ccRow['Character Class']);
  classRows.set(key, row);
}
const classesCsv = toCsv(['key', 'label', 'ccLabels', 'characters'],
  [...classRows.values()].map(r => ({ key: r.key, label: r.label, ccLabels: [...r.ccLabels].sort().join('; '), characters: r.count })));

// ---------------------------------------------------------------- blasts
const LEGACY_SLOT = { BlastSkill1: 'Super 1', BlastSkill2: 'Super 2', BlastUltimate: 'Ultimate', 'Replacement Slot2': 'Super 2' };
const movesById = {};
for (const m of moveList) {
  if (!['Super 1', 'Super 2', 'Ultimate'].includes(m.Slot)) continue;
  (movesById[m['Character ID']] ??= []).push({ slot: m.Slot, move: m.Move, variant: m.Variant, isDefault: m['Default move'] === 'TRUE' });
}
function lev(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
function similar(a, b) {
  const x = normName(a), y = normName(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) return 0.85;
  return 1 - lev(x, y) / Math.max(x.length, y.length);
}
const FUZZY = 0.8;
// Does a measured damage agree with any recipe for this move? Used to tell whether a
// misfiled row set moved wholesale (names and numbers) or only had its names swapped.
const movePower = snap('charmap/move-power.csv');
const rawById = new Map(raw.map(r => [r['Character ID'], r]));
function fits(id, m, damage) {
  if (typeof damage !== 'number') return false;
  const r = rawById.get(id);
  const parts = moveParts(movePower.filter(x => x['Character ID'] === id && x.Slot === m.slot && x.Variant === m.variant && normName(x.Move) === normName(m.move)));
  const coef = blastCoef(Number(r['DP damage scale']), Number(r[m.slot === 'Ultimate' ? 'Ultimate damage: class add' : 'Super damage: class add']) || 0);
  return Object.values(RECIPES).some(fn => { const e = evaluate(fn(parts), coef, config.damageConstant); return e && Math.abs(e.damage - damage) <= e.hits; });
}
const bySlotDefault = (id, legacySlot) => (movesById[id] || []).find(m => m.slot === LEGACY_SLOT[legacySlot] && (legacySlot === 'Replacement Slot2' ? m.variant : m.isDefault));
function scoreSet(entries, id) {
  const ms = movesById[id] || [];
  return entries.filter(b => ms.some(m => similar(m.move, b.name) >= FUZZY)).length;
}
const blastRows = [];
const relinks = [];
const unmatched = [];
const claimed = new Map(); // id|slot|variant -> legacy key
for (const [key, entries] of Object.entries(legacy.blast)) {
  if (!Array.isArray(entries)) continue;
  const fromId = resolveName(key.replace(/\s+/g, ' ').trim());
  if (!fromId) { unmatched.push(`${key}: character not resolved (row dropped)`); continue; }
  let id = fromId;
  const own = scoreSet(entries, fromId);
  let best = null, bestScore = own;
  for (const other of Object.keys(movesById)) {
    if (other === fromId) continue;
    const s = scoreSet(entries, other);
    if (s > bestScore) { best = other; bestScore = s; }
  }
  let wholeSet = best && bestScore === entries.length && own < entries.length;
  let positional = false;
  if (wholeSet) {
    // Moved wholesale, or only the names swapped? Ask the damage formula.
    const relinkFit = entries.filter(b => { const m = (movesById[best] || []).find(x => similar(x.move, b.name) >= FUZZY); return m && fits(best, m, b.baseDamagePatch); }).length;
    const positionFit = entries.filter(b => { const m = bySlotDefault(fromId, b.slot); return m && fits(fromId, m, b.baseDamagePatch); }).length;
    if (positionFit > relinkFit) { wholeSet = false; positional = true; }
    else id = best;
  }
  const ms = movesById[id] || [];
  const taken = new Set();
  for (const b of entries) {
    const wantSlot = LEGACY_SLOT[b.slot];
    const isReplacement = b.slot === 'Replacement Slot2';
    let m = null, how = null;
    const candidates = ms.filter(x => !taken.has(x));
    if (positional) { m = bySlotDefault(id, b.slot); how = 'position'; }
    const exact = candidates.filter(x => normName(x.move) === normName(b.name));
    if (!m && exact.length) { m = exact.find(x => x.slot === wantSlot) || exact[0]; how = 'name'; }
    if (!m) {
      const fuzzy = candidates.map(x => ({ x, s: similar(x.move, b.name) + (x.slot === wantSlot ? 0.05 : 0) })).filter(o => o.s >= FUZZY).sort((p, q) => q.s - p.s);
      if (fuzzy.length) { m = fuzzy[0].x; how = 'spelling'; }
    }
    if (!m) {
      const bySlot = candidates.filter(x => x.slot === wantSlot && (isReplacement ? x.variant : x.isDefault));
      if (bySlot.length === 1) { m = bySlot[0]; how = 'slot'; }
    }
    if (!m) { unmatched.push(`${key}: ${b.slot} "${b.name}" has no matching move on ${refById.get(id).name} (row dropped)`); continue; }
    taken.add(m);
    const claimKey = `${id}|${m.slot}|${m.variant}|${m.move}`;
    if (claimed.has(claimKey)) { unmatched.push(`${key}: ${b.slot} "${b.name}" duplicates a row already taken from "${claimed.get(claimKey)}" (row dropped)`); continue; }
    claimed.set(claimKey, key);
    const notes = [];
    if (wholeSet) notes.push(`row set was filed under "${key}"; its moves are ${refById.get(id).name}'s`);
    if (how === 'position') notes.push(`old name "${b.name}" belongs to another character; damage and traits kept by slot (they match this character's move)`);
    if (how === 'spelling') notes.push(`old name "${b.name}"`);
    if (how === 'slot') notes.push(`old name "${b.name}" matched by slot`);
    if (wantSlot !== m.slot) notes.push(`old slot ${b.slot}`);
    const dmg = typeof b.baseDamagePatch === 'number' ? b.baseDamagePatch : null;
    const standardBoost = dmg == null ? null : Math.round(dmg * (m.slot === 'Ultimate' ? 1.3 : 1.2));
    const boosted = typeof b.boostedDamagePatch === 'number' ? Math.round(b.boostedDamagePatch) : null;
    const flags = ['beamClashCapable', 'targetGiant', 'lockOnNeeded', 'dashClashCapable', 'unblockable', 'audienceFlees', 'destroyMap'].filter(f => b[f] === true);
    const row = {
      id, character: refById.get(id).name, slot: m.slot, variant: m.variant, move: m.move,
      damage: dmg ?? '',
      boostedDamage: boosted != null && dmg != null && Math.abs(boosted - standardBoost) > 1 ? boosted : '',
      category: b.category ?? '', type: b.type ?? '', impactPower: b.impactPower ?? '',
      traits: (b.traits || []).join('; '), flags: flags.join('; '),
      triggerKi: b.triggerExpendEnergy ?? '', lungeSpeed: b.lungeSpeed ?? '', moveLimitTime: b.moveLimitTime ?? '',
      note: notes.join('; '),
    };
    blastRows.push(row);
    if (notes.length) relinks.push(`${row.character} ${m.slot}${m.variant ? ' ' + m.variant : ''} "${m.move}": ${notes.join('; ')}`);
  }
}
const order = new Map(ref.characters.map((c, i) => [c.id, i]));
const SLOT_ORDER = { 'Super 1': 0, 'Super 2': 1, Ultimate: 2 };
blastRows.sort((a, b) => order.get(a.id) - order.get(b.id) || SLOT_ORDER[a.slot] - SLOT_ORDER[b.slot] || a.variant.localeCompare(b.variant));

// ---------------------------------------------------------------- skills
const rawSkills = {};
for (const m of moveList) if (m.Slot === 'Skill 1' || m.Slot === 'Skill 2') (rawSkills[m['Character ID']] ??= []).push(m.Move);
const legacySkillById = new Map(legacy.skills.map(s => [s.id, s]));
const legacySkillByName = new Map(legacy.skills.map(s => [normName(s.name), s]));
const displayVotes = new Map(); // raw skill name -> Map(json -> count)
for (const c of legacy.characters) {
  const id = c.id || resolveName(c.name);
  const own = rawSkills[id] || [];
  for (const slot of [1, 2]) {
    const name = c[`skill${slot}Name`];
    if (!name) continue;
    const detail = c[`skill${slot}Id`] != null ? legacySkillById.get(c[`skill${slot}Id`]) : legacySkillByName.get(normName(name));
    if (!detail) continue;
    const match = own.map(r => ({ r, s: similar(r, name) })).sort((p, q) => q.s - p.s)[0];
    if (!match || match.s < 0.7) continue;
    const disp = {
      type: detail.type ?? '', instantSparking: !!detail.instantSparking, instantKi: !!detail.instantKi,
      unblockable: !!detail.unblockable, cutscene: !!detail.cutscene,
      activationTime: detail.activationTime ?? '', mobilePenalty: detail.mobilePenalty ?? '',
      healthAmount: detail.healthAmount ?? '', kiAmount: detail.kiAmount ?? '',
      cost: detail.cost ?? '',
    };
    const votes = displayVotes.get(match.r) || new Map();
    const k = JSON.stringify(disp);
    votes.set(k, (votes.get(k) || 0) + 1);
    displayVotes.set(match.r, votes);
  }
}
const skillDisplay = [...displayVotes.entries()].map(([skill, votes]) => {
  const ranked = [...votes.entries()].sort((a, b) => b[1] - a[1]);
  return { skill, ...JSON.parse(ranked[0][0]), note: ranked.length > 1 ? `old data disagreed between characters (${ranked.length} versions); most common kept` : '' };
}).sort((a, b) => a.skill.localeCompare(b.skill));

// ---------------------------------------------------------------- sparking armor
const sparking = legacy.characters.filter(c => c.sparkStatBuffs?.armor).map(c => {
  const id = c.id || resolveName(c.name);
  return { id, character: refById.get(id).name, armor: 'TRUE', note: 'from the previous calculator data; no game-data source found' };
}).sort((a, b) => order.get(a.id) - order.get(b.id));

// ---------------------------------------------------------------- capsule effects
const capsuleByName = new Map(ref.capsules.map(c => [c.name, c]));
const capsuleEffects = {};
for (const c of legacy.capsules) {
  const cap = capsuleByName.get(c.name) || ref.capsules.find(x => normName(x.name) === normName(c.name));
  if (!cap) throw new Error(`seed: capsule "${c.name}" not in referencedata/capsules.csv`);
  capsuleEffects[cap.id] = { name: cap.name, effects: c.effects || [] };
}

// ---------------------------------------------------------------- write
const out = (rel, content) => { const did = writeIfChanged(path.join(DATA, rel), content); console.log(`  ${did ? 'wrote    ' : 'unchanged'} data/${rel}`); };
out('curated/aliases.csv', toCsv(['alias', 'id', 'name', 'kind', 'note'], aliases));
out('curated/classes.csv', classesCsv);
out('curated/blasts.csv', toCsv(['id', 'character', 'slot', 'variant', 'move', 'damage', 'boostedDamage', 'category', 'type', 'impactPower', 'traits', 'flags', 'triggerKi', 'lungeSpeed', 'moveLimitTime', 'note'], blastRows));
out('curated/skill-display.csv', toCsv(['skill', 'cost', 'type', 'instantSparking', 'instantKi', 'unblockable', 'cutscene', 'activationTime', 'mobilePenalty', 'healthAmount', 'kiAmount', 'note'],
  skillDisplay.map(s => ({ ...s, instantSparking: s.instantSparking ? 'TRUE' : '', instantKi: s.instantKi ? 'TRUE' : '', unblockable: s.unblockable ? 'TRUE' : '', cutscene: s.cutscene ? 'TRUE' : '' }))));
out('curated/sparking.csv', toCsv(['id', 'character', 'armor', 'note'], sparking));
if (!fs.existsSync(path.join(DATA, 'curated', 'overrides.csv'))) out('curated/overrides.csv', toCsv(['id', 'field', 'value', 'reason'], []));
out('legacy/roster.json', JSON.stringify(roster, null, 1) + '\n');
out('legacy/capsule-effects.json', JSON.stringify(capsuleEffects, null, 1) + '\n');
out('legacy/seed-log.md', [
  '# Seed log (one-off, 2026-10)', '',
  'Written by `scripts/oneoff/seed-curated.mjs` when the curated tables were first seeded from the old calculator JSON.', '',
  `## Blast rows relinked (${relinks.length})`, '', ...relinks.map(r => `- ${r}`), '',
  `## Blast rows dropped (${unmatched.length})`, '', ...unmatched.map(r => `- ${r}`), '',
  `## Masterlist names left unresolved (${unresolvedMaster.length})`, '', ...unresolvedMaster.map(r => `- ${r}`), '',
].join('\n'));
console.log(`seed-curated: ${blastRows.length} blast rows (${relinks.length} relinked, ${unmatched.length} dropped), ${skillDisplay.length} skill display rows, ${aliases.length} aliases, ${sparking.length} sparking armor flags.`);
