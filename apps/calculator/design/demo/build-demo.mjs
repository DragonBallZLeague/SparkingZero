// Builds calculator-demo.html: one self-contained page that bundles the demo (main.jsx), the calculator's
// real engine and helpers (src/utils, src/data/adapter.js) and the published data (public/data/*.json), so
// every number on it is the app's own. Run from the repo root:
//   node apps/calculator/design/demo/build-demo.mjs
// then open apps/calculator/design/demo/calculator-demo.html. Art and face icons load from
// apps/calculator/public/ by relative path, so keep the repo layout.
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = await build({
  entryPoints: [path.join(here, 'main.jsx')],
  bundle: true,
  write: false,
  format: 'iife',
  minify: true,
  jsx: 'automatic',
  loader: { '.csv': 'text' },
  define: { 'process.env.NODE_ENV': '"production"', 'import.meta.env.BASE_URL': '"./"' },
  logLevel: 'warning',
});
const js = out.outputFiles[0].text;
const css = ['sheet.css', 'demo.css'].map(f => fs.readFileSync(path.join(here, f), 'utf8')).join('\n');
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Calculator demo</title>
<style>${css}</style>
</head>
<body>
<div id="root"></div>
<script>${js.replace(/<\/script/gi, '<\\/script')}</script>
</body>
</html>`;
fs.writeFileSync(path.join(here, 'calculator-demo.html'), html);
console.log(`wrote calculator-demo.html (${Math.round(html.length / 1024)} KB)`);
