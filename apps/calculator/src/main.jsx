import React from 'react';
import ReactDOM from 'react-dom/client';
import { restoreDeepLink } from '@szl/ui';

// A deep link (/calculator/goku-z-early) that the site-root 404 page bounced here: put it back before the app
// reads the address (scripts/build-404.js, packages/ui/src/deepLink.js).
restoreDeepLink(import.meta.env.BASE_URL);

const root = ReactDOM.createRoot(document.getElementById('root'));
// The app module waits for the data (data/data.js); index.html shows "Loading" until then.
import('./app/App.jsx')
  .then(({ default: App }) => root.render(<React.StrictMode><App /></React.StrictMode>))
  .catch((e) => {
    console.error(e);
    root.render(
      <div className="loadfail">
        <b>The calculator's data didn't load.</b>
        <span>Check the connection and reload the page.</span>
        <small>{String(e?.message || e)}</small>
      </div>,
    );
  });
