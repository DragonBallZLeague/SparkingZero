import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { resolve } from 'path';

const BASE = '/SparkingZero/';

// Plugin: make the tools that live outside the React SPA reachable in dev at the
// same paths they have in production.
// /cms/            → cms/index.html, a real Vite entry (see build.rollupOptions)
// /schedule-import/ → public/schedule-import/index.html, plain static HTML
function serveStaticToolsPlugin() {
  const staticTools = [
    { pattern: ['/schedule-import', '/schedule-import/', '/schedule-import/index.html'], file: 'public/schedule-import/index.html' },
  ];
  return {
    name: 'serve-static-tools',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const urlPath = req.url.split('?')[0];
        // Accept both /cms/ and /SparkingZero/cms/ in dev.
        const bare = urlPath.startsWith(BASE) ? '/' + urlPath.slice(BASE.length) : urlPath;

        // Redirect (not rewrite) so the browser lands on the base-prefixed URL:
        // Decap resolves config.yml relative to the page it is served from.
        if (bare === '/cms' || bare === '/cms/' || bare === '/cms/index.html') {
          if (!urlPath.startsWith(BASE)) {
            res.statusCode = 302;
            res.setHeader('Location', `${BASE}cms/`);
            res.end();
            return;
          }
          // Let Vite's transform pipeline serve the entry (it imports JSX and CSS).
          req.url = `${BASE}cms/index.html`;
        }

        const tool = staticTools.find(t => t.pattern.includes(bare));
        if (tool) {
          const filePath = path.resolve(__dirname, tool.file);
          const html = fs.readFileSync(filePath, 'utf-8');
          res.setHeader('Content-Type', 'text/html');
          res.end(html);
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [serveStaticToolsPlugin(), react()],
  base: BASE,
  resolve: {
    alias: {
      '@szl/ui': resolve(__dirname, '../../packages/ui/src'),
    },
  },
  assetsInclude: ['**/*.yaml', '**/*.yml'],
  build: {
    rollupOptions: {
      input: {
        // The site itself, plus the Decap admin panel at /cms/. The panel is built
        // (not a static file in public/) so its preview pane can import the site's
        // real page components and compiled Tailwind.
        main: resolve(__dirname, 'index.html'),
        cms: resolve(__dirname, 'cms/index.html'),
      },
    },
  },
});
