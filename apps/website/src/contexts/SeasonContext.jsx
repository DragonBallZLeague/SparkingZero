import React, { createContext, useContext, useState, useEffect } from 'react';
import { loadContent } from '../utils/contentLoader';

const SeasonContext = createContext(null);

export function SeasonProvider({ children }) {
  const [siteData, setSiteData] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState(null);

  useEffect(() => {
    loadContent('site.yaml').then((site) => {
      setSiteData(site);
      setSelectedSeason(site.current_season_file || 'season-0.yaml');
    });
  }, []);

  return (
    <SeasonContext.Provider value={{ siteData, selectedSeason, setSelectedSeason }}>
      {children}
    </SeasonContext.Provider>
  );
}

export function useSeasonContext() {
  return useContext(SeasonContext);
}
