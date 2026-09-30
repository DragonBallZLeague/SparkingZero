import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { restoreDeepLink } from '@szl/ui';
import './index.css';
import App from './App';
import { ROUTES, REDIRECTS } from './routes.js';

// Must run BEFORE BrowserRouter reads the location. GitHub Pages serves the
// site-root 404.html for any path that is not a real file, so a shared link
// like /SparkingZero/analyzer/characters/android-13 arrives here having been
// bounced to the app root by the dispatcher in scripts/build-404.js. This puts
// the original URL back so the router matches the intended route.
restoreDeepLink(import.meta.env.BASE_URL);

// Real routes, but still one component behind them: App switches on its own
// `viewType`, and these paths are what make that switch addressable - a view can
// now be linked to, refreshed and shared. Splitting App into per-route pages is
// the remainder of Phase 3; the paths do not change when that happens.
//
// The trailing catch-all is deliberate. An unknown or stale URL renders the app
// rather than a blank page, which matters because links to this app get pasted
// into Discord and outlive whatever scheme was current when they were posted.
/** An old path's new home, keeping the query string (the scope). */
function Redirect({ to }) {
  const { search } = useLocation();
  return <Navigate to={{ pathname: to, search }} replace />;
}

const root = createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter basename={import.meta.env.BASE_URL}>
    <Routes>
      <Route path={ROUTES.home} element={<App />} />
      <Route path={ROUTES.characters} element={<App />} />
      <Route path={`${ROUTES.characters}/:charParam`} element={<App />} />
      <Route path={ROUTES.teams} element={<App />} />
      <Route path={`${ROUTES.teams}/:teamParam`} element={<App />} />
      <Route path={ROUTES.matches} element={<App />} />
      <Route path={`${ROUTES.matches}/:matchParam`} element={<App />} />
      <Route path={`${ROUTES.sandbox}/*`} element={<App />} />
      {REDIRECTS.map(r => <Route key={r.from} path={r.from} element={<Redirect to={r.to} />} />)}
      <Route path={ROUTES.meta} element={<App />} />
      <Route path="*" element={<App />} />
    </Routes>
  </BrowserRouter>
);
