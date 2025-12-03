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
	const basePath = window.location.pathname.replace(/\/$/, '');
	const cfgUrl = `${basePath}/config.json`;
	fetch(cfgUrl).then(r => {
		if (!r.ok) return;
		return r.json();
	}).then(json => {
		if (json) {
			window.__SZ_CONFIG__ = Object.assign(window.__SZ_CONFIG__ || {}, json);
			console.log('[Analyzer] Loaded runtime config:', json);
		}
	}).catch(() => {});
}
