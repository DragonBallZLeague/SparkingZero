// Central config for BR_Data tagging fields and allowed values
// Update this file to add or change tag types and allowed values

const tagConfig = {
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
  seasonNumber: {
    label: 'Season',
    type: 'string',
    allowed: [
      '0',
      // Add new season numbers here as they begin: '1', '2', etc.
    ]
  },
  seasonPhase: {
    label: 'Phase',
    type: 'string',
    allowed: [
      'Offseason',
      'Pre-Season',
      'Main Season',
      'Playoffs',
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
