import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// Plugin: serve static HTML tools that live outside the React SPA
// /admin/ → public/admin/index.html
// /schedule-import/ → public/schedule-import/index.html
function serveStaticToolsPlugin() {
  const tools = [
    { pattern: ['/admin', '/admin/', '/admin/index.html'], file: 'public/admin/index.html' },
    { pattern: ['/schedule-import', '/schedule-import/', '/schedule-import/index.html'], file: 'public/schedule-import/index.html' },
  ];
  return {
    name: 'serve-static-tools',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const tool = tools.find(t => t.pattern.includes(req.url.split('?')[0]));
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
  base: '/SparkingZero/',
  assetsInclude: ['**/*.yaml', '**/*.yml'],
});
