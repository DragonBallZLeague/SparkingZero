/**
 * Opens the built calculator in headless Edge/Chrome at every kind of address, as GitHub Pages serves it, and
 * reports where each landed, the page title and any view error. Use it after a UI change:
 *
 *   npm run build:calculator                 (from the repo root; the website too for the 404 page:
 *   (cd apps/website && npx vite build --outDir ../../dist --emptyOutDir=false)
 *   node scripts/build-404.js
 *   node scripts/serve-dist.js 8093          (leave running)
 *   node apps/calculator/scripts/check-pages.mjs [base] [widths]
 *
 * base defaults to http://localhost:8093/SparkingZero/calculator/ (pass the live site's to spot-check a deploy);
 * widths to 1440,820,390 (desktop, tablet, phone). Exits 1 if any page shows an error or lands somewhere
 * unexpected. Deep links reach the app through the site-root 404 page, so a plain Vite dev server can't test them.
 */
import { launch, sleep } from '../../analyzer/scripts/dev/browser.mjs';

const base = process.argv[2] || 'http://localhost:8093/SparkingZero/calculator/';
const widths = (process.argv[3] || '1440,820,390').split(',').map(Number);
const pack = (o) => Buffer.from(encodeURIComponent(JSON.stringify(o))).toString('base64');
const N7 = [null, null, null, null, null, null, null];
// [address below base, where it should land (below base; null: the same), what it covers]
const PAGES = [
  ['', '', 'Characters'],
  ['goku-z-early', null, 'Fighter'],
  ['goku-z-early?full', null, 'Fighter, Full'],
  ['0000_00', 'goku-z-early', 'a raw id opens the fighter by name'],
  ['goku-z-early?caps=rush-attack-boost-1,blast-burst,00_0_0011&skills=1&sparking&hp=40',
    'goku-z-early?caps=rush-attack-boost-1,blast-burst,smash-attack-boost-1&skills=solar-flare&sparking&hp=40', 'a build (ids and slot numbers rewritten as names)'],
  ['goku-z-early/vs/janemba', null, 'Versus'],
  ['goku-z-early/vs/janemba?lens=matchup&full&vs-caps=blast-burst&rules=standard-soft',
    'goku-z-early/vs/janemba?vs-caps=blast-burst&rules=standard-soft&full&lens=matchup', 'Matchup, Full, the opponent\'s build, a ruleset'],
  ['not-a-fighter', '', 'an unknown fighter falls back to Characters'],
  ['#' + pack({ c: 'Goku (Z - Early)', p: N7, op: N7 }), 'goku-z-early', 'an old website Teams-page link'],
  ['#' + pack({ v: 2, c: '0040_00', p: ['00_0_0005', null, null, null, null, null, null], o: '0000_00' }),
    'piccolo/vs/goku-z-early?caps=rush-attack-boost-1&lens=matchup', 'an old v2 share link with an opponent'],
];

const b = await launch();
let bad = 0;
try {
  for (const w of widths) {
    await b.viewport(w, 900);
    for (const [addr, want, what] of PAGES) {
      await b.send('Page.navigate', { url: 'about:blank' }); await sleep(200);
      await b.send('Page.navigate', { url: base + addr }); await sleep(2500);
      const r = await b.evaluate(`(() => {
        const err = document.querySelector('pre, .loadfail');
        const path = decodeURIComponent(location.pathname + location.search);
        return { err: err ? err.textContent.slice(0, 160) : null, path, title: document.title, main: !!document.querySelector('main') };
      })()`);
      const landed = r.path.slice(r.path.indexOf('/calculator/') + '/calculator/'.length);
      const expected = want === null ? addr : want;
      const ok = !r.err && r.main && landed === expected;
      if (!ok) bad++;
      console.log(`${ok ? 'ok  ' : 'FAIL'} ${w} ${what.padEnd(48)} -> /${landed} | ${r.title}${r.err ? ` | ERROR ${r.err}` : ''}${!ok && !r.err ? ` (expected /${expected})` : ''}`);
    }
  }
} finally {
  await b.close();
}
console.log(bad ? `check-pages: ${bad} FAIL` : `check-pages: all ${PAGES.length * widths.length} pages ok`);
process.exit(bad ? 1 : 0);
