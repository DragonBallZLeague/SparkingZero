/**
 * How the Teams page turns a masterlist name into Calculator deep links: the
 * transformation graph (referencedata/transformations.json, synced into
 * public/content/) and the walk over it.
 *
 * Kept free of imports so the Calculator's data checks
 * (apps/calculator/scripts/verify-data.mjs) import this exact file and confirm every
 * masterlist entry still links to the forms it should. Change the matching rules
 * here, not in a copy.
 */

/** transformations.json (id-keyed) -> { [characterName]: [transformsToName, ...] } */
export function buildTransformAdj(data) {
  const idToName = {};
  for (const [id, entry] of Object.entries(data)) {
    if (typeof entry === 'object' && entry.name) idToName[id] = entry.name;
  }
  const fwd = {};
  for (const [, entry] of Object.entries(data)) {
    if (typeof entry !== 'object' || !entry.name) continue;
    const from = entry.name;
    if (!fwd[from]) fwd[from] = [];
    for (const toId of (entry.transformsTo || [])) {
      if (!toId || !idToName[toId]) continue;
      fwd[from].push(idToName[toId]);
    }
  }
  return fwd;
}

/**
 * Calculator names a masterlist entry links to: the exact name, or else the first calculator
 * name starting with it, then every form its transformsTo chain reaches, in declaration order.
 * An exact match is left out (the entry's own link covers it).
 */
export function getFormChain(rawName, calcNames, transformAdj) {
  const name = String(rawName).trim(); // masterlist entries are sometimes padded ("Demon King Piccolo ")
  const exactMatch = calcNames.has(name);
  let anchor = exactMatch ? name : [...calcNames].find(n => n.startsWith(name + ' '));
  if (!anchor) return [];
  // The calculator publishes referencedata's names, so transformation nodes match directly.
  const resolveCalcName = (node) => (calcNames.has(node) ? node : null);
  // Forward BFS only — preserves transformsTo declaration order
  const visited = new Set([anchor]);
  const queue = [anchor];
  const ordered = [];
  while (queue.length) {
    const cur = queue.shift();
    const calcName = resolveCalcName(cur);
    if (calcName && !ordered.includes(calcName)) ordered.push(calcName);
    for (const next of (transformAdj[cur] || [])) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  if (exactMatch) {
    const idx = ordered.indexOf(anchor);
    if (idx !== -1) ordered.splice(idx, 1);
  }
  return ordered;
}
