import React, { createContext, useContext, useState, useEffect } from 'react';
import { loadContent } from '../utils/contentLoader';

// Exported so the CMS preview pane can supply its own value (the site.yaml being
// edited) instead of the fetched one - see cms/previews.jsx.
export const SeasonContext = createContext(null);

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
