import { useState, useEffect } from 'react';

const CALC_CHARS_URL = 'https://dragonballzleague.github.io/SparkingZero/calculator/data/characters.json';
const TRANSFORM_URL = `${import.meta.env.BASE_URL}content/transformations.json`;

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
 * Character names known to the Calculator app plus the transformation graph, used
 * to turn roster entries into deep links. Both are null until loaded; consumers
 * fall back to plain text. Shared by the Teams page and the CMS preview pane.
 */
export function useCharacterIndex() {
  const [calcNames, setCalcNames] = useState(null);
  const [transformAdj, setTransformAdj] = useState(null);

  useEffect(() => {
    fetch(CALC_CHARS_URL)
      .then(r => r.json())
      .then(chars => setCalcNames(new Set(chars.map(c => c.name))))
      .catch(() => setCalcNames(new Set()));
  }, []);

  useEffect(() => {
    fetch(TRANSFORM_URL)
      .then(r => r.json())
      .then(data => setTransformAdj(buildTransformAdj(data)))
      .catch(() => setTransformAdj({}));
  }, []);

  return { calcNames, transformAdj };
}
