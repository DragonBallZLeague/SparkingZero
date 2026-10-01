import { useState, useEffect } from 'react';
import yaml from 'js-yaml';
import { useSeasonContext } from '../contexts/SeasonContext';

async function fetchYaml(path) {
  const r = await fetch(`${import.meta.env.BASE_URL}content/${path}`);
  // GitHub Pages serves the SPA 404 page for missing files, so check status
  // rather than trusting whatever text comes back.
  if (!r.ok) return null;
  return yaml.load(await r.text());
}

/**
 * Loads content/events/<season>.yaml and content/teams/<season>.yaml for the
 * currently selected season. `events` is null while loading and `{ events: [] }`
 * shaped (with `missing: true`) when a season has no events file yet.
 */
export function useSeasonEvents() {
  const { siteData, selectedSeason, setSelectedSeason } = useSeasonContext();
  const [eventsData, setEventsData] = useState(null);
  const [teamsData, setTeamsData] = useState(null);

  useEffect(() => {
    if (!selectedSeason) return;
    let cancelled = false;
    setEventsData(null);
    Promise.all([
      fetchYaml(`events/${selectedSeason}`).catch(() => null),
      fetchYaml(`teams/${selectedSeason}`).catch(() => null),
    ]).then(([events, teams]) => {
      if (cancelled) return;
      setTeamsData(teams);
      setEventsData(events || { label: null, events: [], missing: true });
    });
    return () => { cancelled = true; };
  }, [selectedSeason]);

  const allSeasons = siteData?.all_seasons || [];
  const seasonLabel = allSeasons.find((s) => s.file === selectedSeason)?.label || eventsData?.label || selectedSeason;

  return { eventsData, teamsData, allSeasons, seasonLabel, selectedSeason, setSelectedSeason };
}
