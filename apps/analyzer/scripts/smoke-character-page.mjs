/**
 * Actually renders the character page, with real corpus data, and reports the
 * stack trace if it throws.
 *
 * WHY THIS EXISTS
 *
 * verify-character-page.mjs checks the page's DATA contract - that every field
 * it reads exists and holds the right kind of value. It cannot catch a render
 * bug: a bad prop, a component used wrongly, a hook order problem. Those show up
 * in the browser as a blank white page with the real error buried in the
 * console, which is a miserable way to find out.
 *
 * This renders the component tree through react-dom/server against a real
 * aggregated row, so the failure arrives as a stack trace pointing at a line.
 *
 * It uses Vite's own SSR pipeline to load the JSX, so the modules are
 * transformed exactly as the app transforms them - the aliases, the ?raw CSV
 * imports and the JSON imports all resolve the way they do in a real build.
 *
 * Usage: npm run smoke-character-page [characterName]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'vite';
// Imported natively, NOT through ssrLoadModule: these are CommonJS, and Vite's
// SSR module runner cannot evaluate them (`module is not defined`). Vite
// externalises node_modules in SSR anyway, so the app's own modules resolve to
// these same instances - which matters, because two copies of React would break
// hooks rather than fail cleanly.
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const refData = path.resolve(appRoot, '..', '..', 'referencedata');
const aggDir = path.resolve(appRoot, 'public', 'br-aggregates');

const wanted = process.argv[2] || null;

const vite = await createServer({
  root: appRoot,
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});

let failed = false;
try {
  const { getAggregatedCharacterData } = await vite.ssrLoadModule('/src/utils/aggregation/characterAggregation.js');
  const { parseCharacterCSV } = await vite.ssrLoadModule('/src/utils/statCalculations.js');
  const { loadCapsuleData } = await vite.ssrLoadModule('/src/utils/capsuleDataProcessor.js');
  const CharacterPage = (await vite.ssrLoadModule('/src/pages/CharacterPage.jsx')).default;


  // ---- real data ----------------------------------------------------------
  const charMap = parseCharacterCSV(fs.readFileSync(path.join(refData, 'characters.csv'), 'utf8'));
  const capsuleInfo = loadCapsuleData(fs.readFileSync(path.join(refData, 'capsules.csv'), 'utf8'));
  const aiStrategies = {};
  for (const s of capsuleInfo.aiStrategies || []) if (s.id) aiStrategies[s.id] = s;
  const mapsMap = {};
  for (const line of fs.readFileSync(path.join(refData, 'maps.csv'), 'utf8').trim().split(/\r?\n/).slice(1)) {
    const [name, id] = line.trim().split(',').map(v => v.trim());
    if (id && name) mapsMap[id] = name;
  }

  const shardFiles = fs.readdirSync(aggDir).filter(f => f !== 'index.json' && f.endsWith('.json'));
  const rows = [];
  for (const f of shardFiles) {
    const shard = JSON.parse(fs.readFileSync(path.join(aggDir, f), 'utf8'));
    const files = Object.values(shard.files).map(r => ({ name: r.name, content: r.content }));
    rows.push(...getAggregatedCharacterData(files, charMap, capsuleInfo.capsuleMap, aiStrategies, mapsMap));
  }

  // Pick characters that exercise the awkward paths, not just the first row.
  const pick = (label, predicate) => {
    const row = rows.find(predicate);
    return row ? { label, row } : null;
  };
  const subjects = wanted
    ? [{ label: wanted, row: rows.find(r => r.name.toLowerCase() === wanted.toLowerCase()) }]
    : [
        pick('first row', () => true),
        pick('multi-form', r => r.hasMultipleForms && (r.formStatsArray || []).length),
        pick('with builds', r => (r.topBuilds || []).some(b => (b.equippedCapsules || []).length)),
        pick('no builds', r => !(r.topBuilds || []).length),
        pick('single match', r => r.matchCount === 1),
      ].filter(Boolean);

  if (!subjects.length || subjects.some(s => !s.row)) {
    console.error('Could not find a character to render' + (wanted ? ': ' + wanted : ''));
    process.exit(1);
  }

  // The page is tabbed, and tab state is internal - a server render only ever
  // produces the Overview panel. So the other tabs' blocks are rendered
  // DIRECTLY below, or Builds, Forms and Matches would silently lose coverage
  // the moment the layout stopped showing everything at once.
  const blocks = await vite.ssrLoadModule('/src/pages/character/CharacterBlocks.jsx');

  const PANELS = [
    ['Overview:usage', (c, darkMode) => React.createElement(blocks.UsageBlock, { character: c, darkMode })],
    ['Overview:positions', (c, darkMode, view) => React.createElement(blocks.PositionBlock, { byPosition: view.byPosition, darkMode })],
    ['Builds', (c, darkMode) => React.createElement(blocks.BuildsBlock, { character: c, darkMode, limit: 6 })],
    ['Forms', (c, darkMode) => React.createElement(blocks.FormsBlock, { character: c, darkMode })],
    ['Matches', (c, darkMode, view) => React.createElement(blocks.MatchesBlock, {
      character: c, recentMatches: view.recentMatches, darkMode, onOpenMatch: () => {},
    })],
  ];

  // useCharacterView is a hook, so the blocks need a host component.
  function PanelHost({ character, darkMode, build }) {
    const view = blocks.useCharacterView(character);
    return build(character, darkMode, view);
  }

  console.log(`\nRendering ${subjects.length} character(s) x 2 themes, page + ${PANELS.length} panels\n`);

  const render = (row, darkMode) => {
    const el = React.createElement(
      MemoryRouter,
      { initialEntries: ['/characters/x'] },
      React.createElement(
        Routes,
        null,
        React.createElement(Route, {
          path: '/characters/:charParam',
          element: React.createElement(CharacterPage, {
            character: row,
            rank: 3,
            totalInScope: 107,
            scopeLabel: 'Season S0 · Type Season (105 matches)',
            darkMode,
            onBack: () => {},
            onOpenMatch: () => {},
          }),
        })
      )
    );
    return renderToString(el);
  };

  for (const { label, row } of subjects) {
    {
      for (const darkMode of [true, false]) {
        const what = `${label} (${row.name}) / page / ${darkMode ? 'dark' : 'light'}`;
        try {
          const html = render(row, darkMode);
          if (!html || html.length < 200) {
            console.error('  FAIL ' + what + '\n         rendered only ' + (html || '').length + ' chars');
            failed = true;
          } else if (html.includes('[object Object]')) {
            // React does not throw on this, it just prints it - and it is the
            // exact mistake the first version of this page made with
            // buildComposition.
            console.error('  FAIL ' + what + '\n         rendered a literal "[object Object]"');
            failed = true;
          } else {
            console.log('  ok   ' + what + '  (' + html.length + ' chars)');
          }
        } catch (err) {
          console.error('  FAIL ' + what);
          console.error('         ' + (err && err.message));
          const stack = (err && err.stack || '').split('\n').slice(1, 7).join('\n');
          if (stack) console.error(stack.replace(/^/gm, '    '));
          failed = true;
        }
      }

      // Each tab's panel, rendered on its own.
      for (const [panel, build] of PANELS) {
        for (const darkMode of [true, false]) {
          const what = `${label} (${row.name}) / ${panel} / ${darkMode ? 'dark' : 'light'}`;
          try {
            const html = renderToString(React.createElement(PanelHost, { character: row, darkMode, build }));
            // An empty string is legitimate here: BuildsBlock and FormsBlock
            // return null when a character has nothing to show.
            // matches[].position is NUMERIC in the data, so a table that forgets
            // to translate it shows "1 / 2 / 3" as row labels - which shipped
            // once. Check the ROW LABELS specifically: the section's own hint
            // text says "Lead, Middle and Anchor", so searching the whole panel
            // for those words passes no matter what the rows contain. (It did,
            // on the first attempt at this check.)
            const rowLabels = [...(/<tbody>([\s\S]*?)<\/tbody>/.exec(html)?.[1] || '')
              .matchAll(/<tr[^>]*>\s*<td[^>]*>([\s\S]*?)<\/td>/g)]
              .map(m => m[1].replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, '').trim());
            const namesSlots = rowLabels.length > 0 && rowLabels.every(l => !/^\d+$/.test(l));
            if (html.includes('[object Object]')) {
              console.error('  FAIL ' + what + '\n         rendered a literal "[object Object]"');
              failed = true;
            } else if (panel === 'Overview:positions' && html && !namesSlots) {
              console.error('  FAIL ' + what + '\n         position row labels are ' + JSON.stringify(rowLabels) + ' - raw slot numbers?');
              failed = true;
            } else {
              console.log('  ok   ' + what + '  (' + html.length + ' chars)');
            }
          } catch (err) {
            console.error('  FAIL ' + what);
            console.error('         ' + (err && err.message));
            const stack = (err && err.stack || '').split('\n').slice(1, 7).join('\n');
            if (stack) console.error(stack.replace(/^/gm, '    '));
            failed = true;
          }
        }
      }
    }
  }

  // ---- the score pill -------------------------------------------------------
  //
  // One component behind every "Score: 105" in the app. Its colour used to be
  // RELATIVE - callers passed the other scores on screen - so the same score
  // rendered green in one panel and orange in another. It is absolute now, from
  // the score's tier, which is only worth anything if the tiers actually produce
  // different colours.
  console.log('\nThe score pill colours by tier, and every tier is reachable:');
  const { PerformanceScoreBadge } = await vite.ssrLoadModule('/src/components/stats/PerformanceScoreBadge.jsx');
  const { TIERS } = await vite.ssrLoadModule('/src/utils/tierScale.js');
  const { TIER_CUTOFFS, tierForScore } = await vite.ssrLoadModule('/src/utils/performanceTier.js');

  const seen = new Map();
  for (const tier of TIERS) {
    // A score comfortably inside the band, not on its edge.
    const cut = TIER_CUTOFFS[tier];
    const probe = cut === undefined ? 0 : cut + 1;
    const actual = tierForScore(probe);
    try {
      const html = renderToString(React.createElement(PerformanceScoreBadge, {
        score: probe, label: 'Score', size: 'small', darkMode: true,
      }));
      const bg = /background:\s*([^;"]+)/.exec(html);
      if (!bg) {
        console.error('  FAIL tier ' + tier + ' (score ' + probe + ') rendered no background colour');
        failed = true;
      } else if (seen.has(bg[1])) {
        console.error('  FAIL tier ' + tier + ' shares a colour with ' + seen.get(bg[1]));
        failed = true;
      } else {
        seen.set(bg[1], tier);
        console.log('  ok   score ' + String(probe).padEnd(6) + '-> tier ' + actual + '  ' + bg[1]);
      }
    } catch (err) {
      console.error('  FAIL tier ' + tier + ': ' + (err && err.message));
      failed = true;
    }
  }

  // The pill must survive whatever a score turns out to be.
  for (const junk of [0, -5, NaN, undefined, null, 1e6]) {
    try {
      // React's SSR splits adjacent text nodes with <!-- --> markers, so
      // "Score: 0" arrives as "Score<!-- -->: <!-- -->0". Strip them before
      // asserting on the visible text.
      const html = renderToString(React.createElement(PerformanceScoreBadge, { score: junk, darkMode: true }));
      const text = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, '');
      if (!text.includes('Score:')) { console.error('  FAIL score ' + junk + ' rendered no label'); failed = true; }
      else if (/NaN|undefined|null/.test(text)) {
        console.error('  FAIL score ' + junk + ' rendered "' + text.trim() + '"');
        failed = true;
      } else console.log('  ok   score ' + String(junk) + ' -> "' + text.trim() + '"');
    } catch (err) {
      console.error('  FAIL score ' + junk + ': ' + (err && err.message));
      failed = true;
    }
  }

  // ---- the states with no character ---------------------------------------
  console.log('\nThe states with no character:');
  for (const reason of ['loading', 'empty-scope', 'not-found']) {
    try {
      const el = React.createElement(
        MemoryRouter,
        { initialEntries: ['/characters/nobody'] },
        React.createElement(CharacterPage, {
          character: null, missingLabel: 'Nobody', reason,
          scopeLabel: 'Season S1 · Type Season', darkMode: true, onBack: () => {},
        })
      );
      const html = renderToString(el);
      if (!html || html.length < 100) { console.error('  FAIL ' + reason + ' rendered nothing'); failed = true; }
      else console.log('  ok   ' + reason);
    } catch (err) {
      console.error('  FAIL ' + reason + ': ' + (err && err.message));
      failed = true;
    }
  }
} catch (err) {
  console.error('\nSmoke test could not run:');
  console.error(err && err.stack || err);
  failed = true;
} finally {
  await vite.close();
}

console.log();
if (failed) {
  console.error('FAILED - the character page throws or renders wrongly.');
  process.exit(1);
}
console.log('PASSED - the character page and every tab panel render for each sampled character and theme.');
