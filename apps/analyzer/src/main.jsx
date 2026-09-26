import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { restoreDeepLink } from '@szl/ui';
// Tailwind utilities must load BEFORE App.css - see src/index.css for why.
import './index.css';
import App from './App';

// Must run BEFORE BrowserRouter reads the location. GitHub Pages serves the
// site-root 404.html for any path that is not a real file, so a shared link
// like /SparkingZero/analyzer/characters/0620_00 arrives here having been
// bounced to the app root by the dispatcher in scripts/build-404.js. This puts
// the original URL back so the router matches the intended route.
restoreDeepLink(import.meta.env.BASE_URL);

// Router foundation only (see docs/ANALYZER_REDESIGN_PLAN.md Phase 1) — a single
// catch-all route keeps today's behavior identical while pages are split out later.
const root = createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter basename={import.meta.env.BASE_URL}>
    <Routes>
      <Route path="/*" element={<App />} />
    </Routes>
  </BrowserRouter>
);