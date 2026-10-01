/**
 * Computed-style diff of two analyzer builds: every element's styles, compared
 * view by view at each width. Use it before and after any sweeping style change
 * (a theme value, a layer, a shared class). Screenshots miss small shifts; this
 * lists every one.
 *
 *   node scripts/dev/css-diff.mjs <beforeDir> <afterDir> <out.json> [views...]
 *   npm run css-diff -- <beforeDir> <afterDir> <out.json> [views...]
 *
 * Build each side into its own folder, from apps/analyzer (the folders are big:
 * they include a copy of public/BR_Data):
 *   npx vite build --outDir <dir> --emptyOutDir
 *
 * Views default to every top-level view plus one character page. Widths come
 * from $WIDTHS (default "1280,390"). In Git Bash a bare "/" argument is rewritten
 * into a Windows path; prefix the command with MSYS_NO_PATHCONV=1.
 *
 * Elements are matched by position and tag, so class strings may differ between
 * the builds; a view whose element list differs (the JSX added or removed
 * elements) is reported and skipped. Prints the most common changes grouped by
 * property and value; <out.json> has every one.
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { launch, settle, sleep } from './browser.mjs';

const [beforeDir, afterDir, outFile, ...viewArgs] = process.argv.slice(2);
if (!beforeDir || !afterDir || !outFile) {
  console.error('usage: node scripts/dev/css-diff.mjs <beforeDir> <afterDir> <out.json> [views...]');
  process.exit(1);
}
const VIEWS = viewArgs.length ? viewArgs : ['/', '/characters', '/characters/android-13', '/teams', '/tables', '/meta'];
const WIDTHS = (process.env.WIDTHS || '1280,390').split(',').map(Number);
const PREFIX = '/SparkingZero/analyzer/';
const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
};

/** Serves a build under the Pages base path, falling back to index.html like the SPA expects. */
function serve(dir) {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      const p = decodeURIComponent(req.url.split('?')[0]);
      if (!p.startsWith(PREFIX)) { res.writeHead(302, { Location: PREFIX }); return res.end(); }
      let f = path.join(dir, p.slice(PREFIX.length));
      if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(dir, 'index.html');
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(res);
    }).listen(0, () => resolve(srv));
  });
}

// Width and height are left out on purpose: they follow from everything else,
// so one real change would show up as hundreds of knock-on diffs.
const PROPS = ['display', 'position', 'grid-template-columns', 'column-gap', 'row-gap', 'flex-direction', 'flex-wrap',
  'justify-content', 'align-items', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'max-width', 'min-width',
  'color', 'background-color', 'background-image', 'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
  'border-top-style', 'border-bottom-style', 'border-top-color', 'border-left-color', 'border-top-left-radius',
  'font-size', 'font-weight', 'line-height', 'letter-spacing', 'text-transform', 'text-align', 'white-space',
  'opacity', 'box-shadow', 'overflow-x', 'overflow-y', 'z-index', 'cursor', 'visibility', 'transform'];

// grid-template-columns resolves to pixel tracks, so compare the track COUNT.
const COLLECT = `(() => {
  const props = ${JSON.stringify(PROPS)};
  const out = [];
  for (const el of document.body.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    const v = {};
    for (const p of props) {
      let x = cs.getPropertyValue(p);
      if (p === 'grid-template-columns') x = x === 'none' ? 'none' : x.trim().split(/\\s+(?![^(]*\\))/).length + ' tracks';
      v[p] = x;
    }
    out.push({ t: el.tagName.toLowerCase(), c: (el.getAttribute('class') || '').trim(), v });
  }
  return out;
})()`;

const srvBefore = await serve(path.resolve(beforeDir));
const srvAfter = await serve(path.resolve(afterDir));
const browser = await launch();
const report = {};
try {
  const snapshot = async (srv, view, width) => {
    await browser.viewport(width);
    await browser.send('Page.navigate', { url: `http://localhost:${srv.address().port}${PREFIX.slice(0, -1)}${view}` });
    await settle(browser.evaluate);
    await sleep(300);
    return browser.evaluate(COLLECT);
  };

  for (const view of VIEWS) for (const width of WIDTHS) {
    const key = `${view} @${width}`;
    const b = await snapshot(srvBefore, view, width);
    const a = await snapshot(srvAfter, view, width);
    if (!b || !a || b.length !== a.length || b.some((e, i) => e.t !== a[i].t)) {
      report[key] = { error: `element lists differ: ${b?.length} vs ${a?.length}` };
      console.log(`${key}: SKIPPED, ${report[key].error}`);
      continue;
    }
    const diffs = [];
    b.forEach((e, i) => {
      for (const p of PROPS) if (e.v[p] !== a[i].v[p]) diffs.push({ i, t: e.t, c: e.c, p, from: e.v[p], to: a[i].v[p] });
    });
    report[key] = { elements: b.length, changed: new Set(diffs.map(d => d.i)).size, diffs };
    console.log(`${key}: ${b.length} elements, ${report[key].changed} changed, ${diffs.length} property diffs`);
  }
} finally {
  await browser.close();
  srvBefore.close();
  srvAfter.close();
}
fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(report, null, 1));

// The same change on many elements is one cause: group by property + values.
const groups = new Map();
for (const [key, d] of Object.entries(report)) for (const x of d.diffs || []) {
  const k = `${x.p.replace(/-(top|right|bottom|left)/, '-*')}: ${x.from.slice(0, 50)} -> ${x.to.slice(0, 50)}`;
  const g = groups.get(k) || { n: 0, views: new Set(), sample: x.c.slice(0, 80) };
  g.n++;
  g.views.add(key);
  groups.set(k, g);
}
const top = [...groups.entries()].sort((x, y) => y[1].n - x[1].n);
console.log(`\n${top.length} distinct changes${top.length > 40 ? ' (top 40)' : ''}; every diff is in ${outFile}`);
for (const [k, g] of top.slice(0, 40)) {
  console.log(`${String(g.n).padStart(5)}  ${k}\n       e.g. [${g.sample}]  in ${g.views.size} view(s)`);
}
