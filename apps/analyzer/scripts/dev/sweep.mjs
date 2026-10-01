/**
 * Opens every analyzer view at each given width in headless Edge/Chrome and
 * reports the ones with a problem: a page error or console error, a page
 * wider than the screen (sideways scroll, in px over), or a blank page.
 *
 *   node scripts/dev/sweep.mjs [widths] [base]
 *   npm run sweep -- 1280,900,390
 *
 * widths  comma-separated (default 1280,390: desktop and phone; add 640-1100
 *         for tablets, where every wide table switches to its compact layout
 *         below its own `fullFrom`, see "Tablets" in apps/analyzer/CLAUDE.md)
 * base    the served analyzer (default http://localhost:8080/SparkingZero/analyzer)
 *
 * Serve a real build first, from the repo root:
 *   npm run build:analyzer && node scripts/build-404.js && node scripts/serve-dist.js
 * (or, after a plain `npx vite build` in apps/analyzer, just serve-dist).
 *
 * Run it after any change that touches more than one page: a clean sweep at
 * 1280 and 390 was the bar for every change in the restyle and Home. Add a view
 * to VIEWS when a page or tab is added. Exits 1 when any view has a problem.
 */
import { launch, sleep } from './browser.mjs';

const VIEWS = [
  '/', '/?latest=tests', '/?latest=events',
  '/characters', '/characters?view=styles', '/characters?view=tiers',
  '/characters/android-13', '/characters/android-13?tab=usage', '/characters/vegeta-super?tab=forms',
  '/characters/android-13?tab=builds', '/characters/android-13?tab=matches',
  '/teams', '/teams/sentai-squad', '/teams/sentai-squad?tab=lineups', '/teams/sentai-squad?tab=opponents',
  '/teams/sentai-squad?tab=matches',
  '/matches', '/matches?view=performances', '/matches/s0-week-3-match-5',
  '/meta', '/meta?tab=ai', '/meta?tab=capsules',
  '/sandbox',
];

const widths = (process.argv[2] || '1280,390').split(',').map(Number).filter(Boolean);
const base = (process.argv[3] || 'http://localhost:8080/SparkingZero/analyzer').replace(/\/$/, '');

const b = await launch();
await b.send('Page.addScriptToEvaluateOnNewDocument', { source: `
  window.__errs = [];
  addEventListener('error', e => __errs.push(e.message));
  addEventListener('unhandledrejection', e => __errs.push(String(e.reason)));
  const ce = console.error; console.error = (...a) => { __errs.push(a.map(String).join(' ').slice(0, 200)); ce(...a); };
` });
let bad = 0;
try {
  for (const w of widths) {
    await b.viewport(w, 900);
    for (const v of VIEWS) {
      await b.send('Page.navigate', { url: base + v });
      // Wait for real content (the data loads after the shell), then a beat for layout.
      for (let i = 0; i < 80; i++) { await sleep(250); if (await b.evaluate('document.body.innerText.length > 400').catch(() => false)) break; }
      await sleep(900);
      const r = await b.evaluate(`({
        errs: window.__errs,
        over: Math.max(0, document.documentElement.scrollWidth - innerWidth),
        blank: document.body.innerText.length < 200,
      })`);
      if (r.errs.length || r.over > 1 || r.blank) {
        bad++;
        console.log(`${v} @${w}:`, [r.errs.length ? `errors ${JSON.stringify(r.errs)}` : '', r.over > 1 ? `${r.over}px too wide` : '', r.blank ? 'blank' : ''].filter(Boolean).join('; '));
      }
    }
  }
  console.log(bad ? `${bad} problem view(s)` : `every view clean at ${widths.join(', ')}`);
} finally {
  await b.close();
}
process.exit(bad ? 1 : 0);
