import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';

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