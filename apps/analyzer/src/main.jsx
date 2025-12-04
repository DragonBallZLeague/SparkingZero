import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import UploadWidgetLauncher from './UploadWidgetLauncher.jsx';

const root = createRoot(document.getElementById('root'));
root.render(
	<>
		<App />
		<UploadWidgetLauncher />
	</>
);

// Optional: load runtime config on Pages (sets window.__SZ_CONFIG__)
if (typeof window !== 'undefined') {
  window.__SZ_CONFIG__ = window.__SZ_CONFIG__ || {};
  const basePath = window.location.pathname.includes('/analyzer') 
    ? window.location.pathname.split('/analyzer')[0] + '/analyzer'
    : '';
  const cfgUrl = `${basePath}/config.json`;
  fetch(cfgUrl)
    .then(r => {
      if (!r.ok) throw new Error(`Config fetch failed: ${r.status}`);
      return r.json();
    })
    .then(json => {
      if (json) {
        Object.assign(window.__SZ_CONFIG__, json);
        console.log('[Analyzer] Loaded runtime config:', json);
      }
    })
    .catch(err => {
      console.warn('[Analyzer] Could not load config.json:', err.message);
    });
}