import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

/**
 * Restores a deep link bounced by the site-root 404 dispatcher
 * (scripts/build-404.js). GitHub Pages serves /SparkingZero/404.html for any
 * path that is not a real file, so /SparkingZero/admin/submissions arrives here
 * redirected to the admin root with the original URL stashed.
 *
 * This duplicates packages/ui/src/deepLink.js on purpose: admin deliberately
 * does not consume @szl/ui (see the root CLAUDE.md), and adding that dependency
 * for ten lines is not worth widening the boundary. Keep the two in sync - the
 * storage key must match STORAGE_KEY in scripts/build-404.js.
 */
function restoreDeepLink(basePath) {
  const STORAGE_KEY = 'szl:deep-link';
  if (typeof window === 'undefined') return;

  let stashed = null;
  try {
    stashed = window.sessionStorage.getItem(STORAGE_KEY);
    if (stashed) window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    return; // Storage blocked; stay on the app root.
  }
  if (!stashed) return;

  // Only restore a path inside this app.
  const base = basePath || '/';
  if (stashed.indexOf(base) !== 0) return;

  const current = window.location.pathname + window.location.search + window.location.hash;
  if (stashed === current) return;

  try {
    window.history.replaceState(null, '', stashed);
  } catch {
    // Non-fatal: the app still renders at its root.
  }
}

// Must run before App creates its BrowserRouter.
restoreDeepLink(import.meta.env.BASE_URL);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
