// Central config for BR_Data tagging fields and allowed values
// Update this file to add or change tag types and allowed values

const tagConfig = {
  team: {
    label: 'Team',
    type: 'string', // Freeform, but can be restricted if needed
    allowed: null // null = any value, or provide an array for strict
  },
  season: {
    label: 'League Season',
    type: 'string',
    allowed: [
      'OS0', // Off-Season 0
      // Add more as needed
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
