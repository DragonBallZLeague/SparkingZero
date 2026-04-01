// Auto-tagging script for BR_Data match files
// Scans all match files, infers tags, and updates/inserts a `tags` object in each file
// Usage: node autoTagMatches.js


const fs = require('fs');
const path = require('path');
const tagConfig = require('./tagConfig');

// --- Encoding/BOM Fix Helpers ---
function detectAndFixEncoding(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    // UTF-16 LE BOM (FF FE)
    if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
      console.log(`🔧 Fixing UTF-16 LE encoding: ${path.basename(filePath)}`);
      const content = buffer.toString('utf16le').replace(/^\uFEFF/, '');
      try {
        const parsed = JSON.parse(content);
        fs.writeFileSync(filePath, JSON.stringify(parsed, null, 2), 'utf8');
        return parsed;
      } catch (jsonError) {
        console.error(`❌ Invalid JSON in ${path.basename(filePath)}: ${jsonError.message}`);
        return null;
      }
    }
    // UTF-8 BOM (EF BB BF)
    if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
      console.log(`🔧 Removing UTF-8 BOM: ${path.basename(filePath)}`);
      const content = buffer.toString('utf8').replace(/^\uFEFF/, '');
      try {
        const parsed = JSON.parse(content);
        fs.writeFileSync(filePath, JSON.stringify(parsed, null, 2), 'utf8');
        return parsed;
      } catch (jsonError) {
        console.error(`❌ Invalid JSON in ${path.basename(filePath)}: ${jsonError.message}`);
        return null;
      }
    }
    // Clean UTF-8
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`❌ File has issues: ${path.basename(filePath)} - ${error.message}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error processing ${path.basename(filePath)}: ${error.message}`);
    return null;
  }
}

// --- CONFIG ---
const BR_DATA_ROOT = path.resolve(__dirname, '../BR_Data');

// Category folders and their corresponding matchType tag
const CATEGORY_FOLDERS = {
  'Tests':   'Test',
  'Seasons': 'Season',
  'Events':  'Event',
};

// --- HELPERS ---
function getTeamFolders() {
  return tagConfig.team.allowed;
}

function getTeamsFromContent(content, folderTeam) {
  // Primary: read teams from TeamBattleResults.teams array
  if (content.TeamBattleResults && Array.isArray(content.TeamBattleResults.teams)) {
    const teams = content.TeamBattleResults.teams.filter(t => t && t.trim() !== '');
    if (teams.length > 0) return teams;
  }
  // Fallback: use the folder name as a single-team array
  return folderTeam ? [folderTeam] : [];
}

function getMatchTypeFromCategory(categoryFolder) {
  return CATEGORY_FOLDERS[categoryFolder] || null;
}

function getDifficultyFromContent(content) {
  // Find the first cpuLevel in the file (all should match)
  let cpuLevel = null;
  function findCpuLevel(obj) {
    if (cpuLevel !== null) return;
    if (obj && typeof obj === 'object') {
      for (const key in obj) {
        if (key === 'cpuLevel' && typeof obj[key] === 'number') {
          cpuLevel = obj[key];
          return;
        }
        findCpuLevel(obj[key]);
      }
    }
  }
  findCpuLevel(content);
  if (cpuLevel === 11) return 'Strong';
  if (cpuLevel === 20) return 'Ultra';
  return null;
}

function getMatchSizeFromContent(content) {
  // Improved: Count Allies and Enemy team members, use the larger team size
  function countTeamMembers(charRecord, teamPrefixes) {
    let count = 0;
    for (const key in charRecord) {
      for (const prefix of teamPrefixes) {
        if (key.startsWith(prefix)) count++;
      }
    }
    return count;
  }

  let charRecord = null;
  if (content.TeamBattleResults && content.TeamBattleResults.battleResult && content.TeamBattleResults.battleResult.characterRecord) {
    charRecord = content.TeamBattleResults.battleResult.characterRecord;
  } else if (content.BattleResults && content.BattleResults.characterRecord) {
    charRecord = content.BattleResults.characterRecord;
  } else {
    // Fallback: try to find any characterRecord
    function findCharRecord(obj) {
      if (!obj || typeof obj !== 'object') return null;
      for (const key in obj) {
        if (key === 'characterRecord' && typeof obj[key] === 'object') {
          return obj[key];
        }
        const found = findCharRecord(obj[key]);
        if (found) return found;
      }
      return null;
    }
    charRecord = findCharRecord(content);
  }
  if (!charRecord) return null;

  // Team member key patterns (adjust as needed)
  const allyPrefixes = [
    '(Key="AlliesTeamMember',
    '(Key="１ＶＳ１の１Ｐの開始地点"', // sometimes used for first ally
  ];
  const enemyPrefixes = [
    '(Key="EnemyTeamMember',
    '(Key="１ＶＳ１の２Ｐの開始地点"', // sometimes used for first enemy
  ];

  const allyCount = countTeamMembers(charRecord, allyPrefixes);
  const enemyCount = countTeamMembers(charRecord, enemyPrefixes);

  // If no matches, fallback to all (Key="
  let maxCount = Math.max(allyCount, enemyCount);
  if (maxCount === 0) {
    // fallback: count all (Key="
    maxCount = Object.keys(charRecord).filter(k => k.startsWith('(Key="')).length;
  }
  if (maxCount >= 1 && maxCount <= 5) return `${maxCount}v${maxCount}`;
  return null;
}


function updateTagsInFile(filePath, content, tags) {
  content.tags = tags;
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8');
}


function processMatchFile(filePath, folderTeam, matchType) {
  const filename = path.basename(filePath);
  // Clean and parse JSON, fixing encoding if needed
  const content = detectAndFixEncoding(filePath);
  if (!content) {
    console.error(`Skipping file due to parse/encoding error: ${filePath}`);
    return;
  }
  const tags = {};
  tags.team = getTeamsFromContent(content, folderTeam);
  tags.season = tagConfig.currentSeason;
  tags.matchType = matchType;
  tags.difficulty = getDifficultyFromContent(content);
  tags.matchSize = getMatchSizeFromContent(content);

  // Validate scalar tags against allowed values
  for (const key of ['season', 'matchType', 'difficulty', 'matchSize']) {
    if (tagConfig[key] && Array.isArray(tagConfig[key].allowed) && !tagConfig[key].allowed.includes(tags[key])) {
      tags[key] = null;
    }
  }
  // Validate team array: keep only allowed team names
  if (Array.isArray(tags.team)) {
    tags.team = tags.team.filter(t => tagConfig.team.allowed.includes(t));
  }

  updateTagsInFile(filePath, content, tags);
  console.log(`Tagged: ${filePath}`);
}

function processAllMatches() {
  const teams = getTeamFolders();
  for (const [category, matchType] of Object.entries(CATEGORY_FOLDERS)) {
    const categoryDir = path.join(BR_DATA_ROOT, category);
    if (!fs.existsSync(categoryDir)) continue;
    for (const team of teams) {
      const teamDir = path.join(categoryDir, team);
      if (!fs.existsSync(teamDir)) continue;
      const files = fs.readdirSync(teamDir).filter(f => f.endsWith('.json'));
      for (const file of files) {
        const filePath = path.join(teamDir, file);
        processMatchFile(filePath, team, matchType);
      }
    }
  }
}

processAllMatches();
console.log('Auto-tagging complete.');
