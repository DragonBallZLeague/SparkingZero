// Compute head-to-head standings among a specific group of teams
export function computeH2HStandings(teamNames, schedule) {
  const nameSet = new Set(teamNames);
  const record = {};
  teamNames.forEach((t) => { record[t] = { wins: 0, losses: 0 }; });
  for (const week of schedule || []) {
    for (const m of week.matches || []) {
      if (m.status !== 'completed' || !m.winner) continue;
      if (!nameSet.has(m.home) || !nameSet.has(m.away)) continue;
      if (m.winner === m.home) {
        record[m.home].wins += 1;
        record[m.away].losses += 1;
      } else if (m.winner === m.away) {
        record[m.away].wins += 1;
        record[m.home].losses += 1;
      }
    }
  }
  return record;
}

// Apply tiebreakers to a group of teams with identical W/L records.
// Returns the group sorted by: 1) h2h record among the group, 2) avg_damage (higher wins, null loses), 3) alphabetical
export function applyTiebreakers(tiedGroup, schedule) {
  if (tiedGroup.length <= 1) return tiedGroup;
  const names = tiedGroup.map((t) => t.team);
  const h2h = computeH2HStandings(names, schedule);
  return [...tiedGroup].sort((a, b) => {
    const ah = h2h[a.team];
    const bh = h2h[b.team];
    if (ah.wins !== bh.wins) return bh.wins - ah.wins;
    if (ah.losses !== bh.losses) return ah.losses - bh.losses;
    const ad = a.avg_damage ?? null;
    const bd = b.avg_damage ?? null;
    if (ad !== null && bd === null) return -1;
    if (ad === null && bd !== null) return 1;
    if (ad !== null && bd !== null && ad !== bd) return bd - ad;
    return a.team.localeCompare(b.team);
  });
}

// Sort all teams with tiebreaker logic applied within tied W/L groups.
// Each team object must have: { team, wins, losses, avg_damage }
export function sortTeamsWithTiebreakers(teams, schedule) {
  const sorted = [...teams].sort((a, b) => b.wins - a.wins || a.losses - b.losses);
  const result = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i + 1;
    while (
      j < sorted.length &&
      sorted[j].wins === sorted[i].wins &&
      sorted[j].losses === sorted[i].losses
    ) { j++; }
    result.push(...applyTiebreakers(sorted.slice(i, j), schedule));
    i = j;
  }
  return result;
}
