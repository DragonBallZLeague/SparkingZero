/**
 * Serves dist/ the way GitHub Pages does, so deep links can be tested before
 * pushing.
 *
 * This exists because the 404 fallback is the one behaviour no dev server
 * reproduces. Vite serves a single app from its own root and happily rewrites
 * unknown paths to that app's index.html, so a broken site-root 404 looks fine
 * locally and only fails in production. This mimics the two rules that actually
 * matter on Pages:
 *
 *   1. the whole site lives under /SparkingZero/
 *   2. any path that is not a real file gets dist/404.html, with status 404
 *
 * Build first (at minimum the website, so dist/index.html exists, plus whatever
 * sub-app you want to exercise), then run scripts/build-404.js, then this.
 *
 * Usage: node scripts/serve-dist.js [port]
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const distDir = path.resolve(__dirname, '..', 'dist');
const BASE = '/SparkingZero';
const port = parseInt(process.argv[2], 10) || 8080;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.yaml': 'text/yaml; charset=utf-8',
  '.yml': 'text/yaml; charset=utf-8',
};

function contentType(file) {
  return TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
}

function resolveFile(urlPath) {
  // Everything is served under BASE, as on Pages.
  if (urlPath !== BASE && urlPath.indexOf(BASE + '/') !== 0) return null;

  let rel = urlPath === BASE ? '' : urlPath.slice(BASE.length + 1);
  try {
    rel = decodeURIComponent(rel);
  } catch {
    return null;
  }

  const target = path.resolve(distDir, rel);
  // Refuse anything that escapes dist/.
  if (target !== distDir && !target.startsWith(distDir + path.sep)) return null;

  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
    const index = path.join(target, 'index.html');
    return fs.existsSync(index) ? index : null;
  }
  return fs.existsSync(target) && fs.statSync(target).isFile() ? target : null;
}

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0].split('#')[0];
  const file = resolveFile(urlPath);

  if (file) {
    res.writeHead(200, { 'Content-Type': contentType(file) });
    fs.createReadStream(file).pipe(res);
    console.log('200  ' + urlPath);
    return;
  }

  // The Pages behaviour this script exists to reproduce.
  const fallback = path.join(distDir, '404.html');
  if (fs.existsSync(fallback)) {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    fs.createReadStream(fallback).pipe(res);
    console.log('404 -> 404.html  ' + urlPath);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404 (and dist/404.html is missing - run node scripts/build-404.js)');
  console.log('404 (no fallback)  ' + urlPath);
});

server.listen(port, () => {
  if (!fs.existsSync(path.join(distDir, 'index.html'))) {
    console.warn('WARNING: dist/index.html not found. Build the website first.');
  }
  if (!fs.existsSync(path.join(distDir, '404.html'))) {
    console.warn('WARNING: dist/404.html not found. Run: node scripts/build-404.js');
  }
  console.log('Serving ' + distDir + ' as GitHub Pages would');
  console.log('  site      http://localhost:' + port + BASE + '/');
  console.log('  analyzer  http://localhost:' + port + BASE + '/analyzer/');
  console.log('  deep link http://localhost:' + port + BASE + '/analyzer/characters/0620_00');
  console.log('Ctrl+C to stop.');
});
