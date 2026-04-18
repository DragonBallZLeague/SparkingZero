// Central config for BR_Data tagging fields and allowed values
// Update this file to add or change tag types and allowed values

// ============================================================
// CURRENT LEAGUE SEASON — Change this when a new season starts
// ============================================================
const CURRENT_SEASON = 'OS0';

const tagConfig = {
  // The current season applied to newly tagged files
  currentSeason: CURRENT_SEASON,

  team: {
    label: 'Team',
    type: 'array', // Each file stores both teams as an array
    allowed: [
      'Budokai',
      'Cinema',
      'Cold Kingdom',
      'Creations',
      'Demons',
      'Malevolent Souls',
      'Master and Student',
      'Primal Instincts',
      'Sentai',
      'Time Patrol',
      'Tiny Terrors',
      'Z-Fighters'
    ]
  },
  season: {
    label: 'League Season',
    type: 'string',
    allowed: [
      'OS0', // Off-Season 0
      // Add new seasons here as they begin
    ]
  },
  matchType: {
    label: 'Match Type',
    type: 'string',
    allowed: ['Test', 'Season', 'Event']
  },
  difficulty: {
    label: 'Difficulty',
    type: 'string',
    allowed: ['Strong', 'Ultra']
  },
  matchSize: {
    label: 'Match Size',
    type: 'string',
    allowed: ['1v1', '2v2', '3v3', '4v4', '5v5']
  }
};

module.exports = tagConfig;
