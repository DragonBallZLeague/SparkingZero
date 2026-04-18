import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import TeamsPage from './pages/TeamsPage';
import SeasonPage from './pages/SeasonPage';
import ArchivesPage from './pages/ArchivesPage';
import CommunityPage from './pages/CommunityPage';
import TeamSchedulePage from './pages/TeamSchedulePage';
import { loadContent } from './utils/contentLoader';
import RulesPage from './pages/RulesPage';

function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [siteData, setSiteData] = useState(null);

  useEffect(() => {
    loadContent('site.yaml').then(setSiteData);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    document.documentElement.classList.toggle('light', !darkMode);
  }, [darkMode]);

  if (!siteData) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950 text-white">
        <div className="text-xl animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className={`min-h-screen flex flex-col ${darkMode ? 'bg-gray-950 text-white' : 'bg-stone-100 text-stone-800'}`}>
        <Navbar site={siteData} darkMode={darkMode} setDarkMode={setDarkMode} />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage site={siteData} darkMode={darkMode} />} />
            <Route path="/teams" element={<TeamsPage darkMode={darkMode} />} />
            <Route path="/season" element={<SeasonPage darkMode={darkMode} />} />
            <Route path="/archives" element={<ArchivesPage darkMode={darkMode} />} />
            <Route path="/community" element={<CommunityPage darkMode={darkMode} />} />
            <Route path="/teams/:slug/schedule" element={<TeamSchedulePage darkMode={darkMode} />} />
            <Route path="/rules" element={<RulesPage darkMode={darkMode} />} />
            <Route path="/rules/:section" element={<RulesPage darkMode={darkMode} />} />
          </Routes>
        </main>
        <Footer site={siteData} darkMode={darkMode} />
      </div>
    </BrowserRouter>
  );
}

export default App;
