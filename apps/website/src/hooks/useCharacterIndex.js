import { useState, useEffect } from 'react';
import { buildTransformAdj } from '../utils/formChain';

export { buildTransformAdj };

const CALC_CHARS_URL = 'https://dragonballzleague.github.io/SparkingZero/calculator/data/characters.json';
const TRANSFORM_URL = `${import.meta.env.BASE_URL}content/transformations.json`;

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
