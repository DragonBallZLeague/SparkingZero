import { useState } from 'react';
import yaml from 'js-yaml';

/**
 * Lazy-loading state for content/lineups/*.yaml files, keyed by a caller-chosen
 * matchKey (so the same lineup file can be open in two places independently).
 *
 * Shared by the Season page (schedule + playoffs) and the Events page — the
 * returned shape is exactly the prop bag PlayoffBracket / PlayoffListView /
 * PlayoffMatchDetailPanel expect.
 */
/**
 * A no-op bag with the same shape, for components rendered without lineup loading
 * (the blocks destructure these, so an empty object would throw).
 */
export const EMPTY_LINEUPS = {
  openLineups: {},
  lineupCache: {},
  lineupLoading: {},
  lineupWeek: {},
  fetchLineupFile: () => {},
  toggleLineup: () => {},
  selectLineupWeek: () => {},
};

export function useLineups() {
  const [openLineups, setOpenLineups] = useState({});
  const [lineupCache, setLineupCache] = useState({});
  const [lineupLoading, setLineupLoading] = useState({});
  const [lineupWeek, setLineupWeek] = useState({});

  const fetchLineupFile = async (lineupFile) => {
    if (!lineupFile || lineupCache[lineupFile] || lineupLoading[lineupFile]) return;
    setLineupLoading(prev => ({ ...prev, [lineupFile]: true }));
    try {
      const resp = await fetch(`${import.meta.env.BASE_URL}content/lineups/${lineupFile}`);
      const text = await resp.text();
      setLineupCache(prev => ({ ...prev, [lineupFile]: yaml.load(text) }));
    } catch (e) {
      console.error('Failed to load lineup:', e);
    } finally {
      setLineupLoading(prev => ({ ...prev, [lineupFile]: false }));
    }
  };

  const toggleLineup = (matchKey, lineupFile) => {
    const isOpening = !openLineups[matchKey];
    setOpenLineups(prev => ({ ...prev, [matchKey]: !prev[matchKey] }));
    if (isOpening) fetchLineupFile(lineupFile);
  };

  // Switches which week's lineup file is shown for a playoff match
  // (only relevant for series that have both a week 1 and week 2 file)
  // and lazily fetches that file the first time it's selected.
  const selectLineupWeek = (matchKey, week, lineupFile) => {
    setLineupWeek(prev => ({ ...prev, [matchKey]: week }));
    fetchLineupFile(lineupFile);
  };

  return {
    openLineups, lineupCache, lineupLoading, lineupWeek,
    fetchLineupFile, toggleLineup, selectLineupWeek,
  };
}
