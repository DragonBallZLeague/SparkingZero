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
        pick('multi-form', r => (r.matches || []).some(m => Array.isArray(m.forms) && m.forms.length)),
        // Can only fuse: the Transformations tab names its partner.
        pick('fusion only', r => r.name === 'Zamasu'),
        pick('with builds', r => (r.topBuilds || []).some(b => (b.equippedCapsules || []).length)),
        pick('no builds', r => !(r.topBuilds || []).length),
        pick('single match', r => r.matchCount === 1),
      ].filter(Boolean);

  if (!subjects.length || subjects.some(s => !s.row)) {
    console.error('Could not find a character to render' + (wanted ? ': ' + wanted : ''));
    process.exit(1);
  }

  // The page is tabbed, and a server render produces the one tab the URL
  // opens (Overview without `?tab=`). So the other tabs are rendered DIRECTLY
  // below, or Usage, Builds, Transformations and Matches would silently lose
  // coverage.
  const tab = async name => (await vite.ssrLoadModule(`/src/pages/character/${name}.jsx`)).default;
  const CharacterUsage = await tab('CharacterUsage');
  const CharacterBuilds = await tab('CharacterBuilds');
  const CharacterTransformations = await tab('CharacterTransformations');
  const { lineupIndex } = await vite.ssrLoadModule('/src/utils/transformation.js');
  const idOfName = new Map(Object.entries(charMap).map(([id, n]) => [n, id]).reverse());
  const lineups = lineupIndex(rows, n => idOfName.get(n) || null);
  const CharacterMatches = await tab('CharacterMatches');
  const { POSITION_NAMES, positionLabel } = await vite.ssrLoadModule('/src/utils/positions.js');

  // The position vocabulary itself. Slot 1 is the Starter in league terms, and
  // every spelling the data or older code uses must land on it.
  console.log('\nPosition names follow league terminology:');
  for (const [input, want] of [[1, 'Starter'], ['1', 'Starter'], ['Starter', 'Starter'], ['Lead', 'Starter'],
                                [2, 'Middle'], [3, 'Anchor'], [null, '—']]) {
    const got = positionLabel(input);
    if (got === want) console.log('  ok   ' + JSON.stringify(input) + ' -> ' + got);
    else { console.error('  FAIL ' + JSON.stringify(input) + ' -> ' + JSON.stringify(got) + ', want ' + want); failed = true; }
  }

  // The Overview's style band has a Radar / Bars toggle, and a server render only
  // ever produces the default (radar) - so the bars get rendered directly too.
  const StyleBand = (await vite.ssrLoadModule('/src/pages/character/overview/StyleBand.jsx')).default;
  const { characterBuilds } = await vite.ssrLoadModule('/src/pages/character/overview/characterBuilds.js');
  const { overviewFromMatches, placeOverview, STYLES } = await vite.ssrLoadModule('/src/utils/characterOverview.js');
  const baseline = JSON.parse(fs.readFileSync(path.join(appRoot, 'src', 'config', 'style-baseline.json'), 'utf8'));

  const PANELS = [
    ['Overview:bars', c => {
      const overview = overviewFromMatches(c.matches);
      return React.createElement(StyleBand, {
        overview, place: placeOverview(overview, baseline), baseline,
        builds: characterBuilds(c, charMap), selected: null, allRow: c,
        onSelectBuild: () => {}, initialView: 'bars',
      });
    }],
    ['Usage', c => React.createElement(CharacterUsage, { character: c, charMap })],
    ['Builds', c => React.createElement(CharacterBuilds, { character: c, charMap })],
    ['Transformations', c => React.createElement(CharacterTransformations, {
      character: c, id: idOfName.get(c.name) || null, lineups, charMap, aiLinkFor: ai => `/meta?tab=ai&open=${ai}`,
    })],
    ['Matches', c => React.createElement(CharacterMatches, {
      character: c, linkFor: () => '/matches/x?open=y', performancesLink: '/matches?view=performances',
    })],
  ];

  // The tabs link and read the URL, so they render inside a router.
  function PanelHost({ character, build }) {
    return React.createElement(MemoryRouter, { initialEntries: ['/characters/x'] }, build(character));
  }

  console.log(`\nRendering ${subjects.length} character(s), page + ${PANELS.length} panels\n`);

  // Visible text only: markup and React's <!-- --> text-node markers stripped.
  const visibleText = html => html.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' ');
  // What a formatting slip prints instead of a number. React renders all three
  // without complaint.
  const JUNK = /\bNaN\b|\bundefined\b|\bnull\b|Infinity/;

  const render = (row, search = '') => {
    const el = React.createElement(
      MemoryRouter,
      { initialEntries: ['/characters/x' + search] },
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
            onBack: () => {},
            matchLinkFor: () => "/matches/x?open=y",
            charMap,
          }),
        })
      )
    );
    return renderToString(el);
  };

  // The Overview is the panel a server render produces, so the page render is
  // where its content is checked, down to the style band's six styles.
  const overviewProblem = html => {
    const text = visibleText(html);
    if (JUNK.test(text)) return 'visible text contains ' + JSON.stringify(JUNK.exec(text)[0]);
    for (const need of ['Damage dealt', 'Super 1', 'Skill 2', 'Fighting style', 'How it fights']) {
      if (!text.includes(need)) return 'no "' + need + '" - is the Overview rendering?';
    }
    const at = STYLES.map(s => text.indexOf(s.name));
    if (at.some(i => i < 0)) return 'a fighting style is missing: ' + STYLES.filter((s, i) => at[i] < 0).map(s => s.name).join(', ');
    return null;
  };

  for (const { label, row } of subjects) {
    {
      {
        const what = `${label} (${row.name}) / page`;
        try {
          const html = render(row);
          if (!html || html.length < 200) {
            console.error('  FAIL ' + what + '\n         rendered only ' + (html || '').length + ' chars');
            failed = true;
          } else if (html.includes('[object Object]')) {
            // React does not throw on this, it just prints it - and it is the
            // exact mistake the first version of this page made with
            // buildComposition.
            console.error('  FAIL ' + what + '\n         rendered a literal "[object Object]"');
            failed = true;
          } else if (overviewProblem(html)) {
            console.error('  FAIL ' + what + '\n         ' + overviewProblem(html));
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
        {
          const what = `${label} (${row.name}) / ${panel}`;
          try {
            const html = renderToString(React.createElement(PanelHost, { character: row, build }));
            // matches[].position is NUMERIC in the data, so a table that forgets
            // to translate it shows "1 / 2 / 3" as its rows - which shipped
            // once. The Usage tab's By position rows must be the LEAGUE'S
            // names: "Lead" is not one (the league calls slot 1 the Starter,
            // and the app used to mix both).
            const usageText = visibleText(html);
            const namesSlots = Object.values(POSITION_NAMES).some(n => usageText.includes(n)) && !/\bLead\b/.test(usageText);
            if (html.includes('[object Object]')) {
              console.error('  FAIL ' + what + '\n         rendered a literal "[object Object]"');
              failed = true;
            } else if (JUNK.test(visibleText(html))) {
              console.error('  FAIL ' + what + '\n         visible text contains ' + JSON.stringify(JUNK.exec(visibleText(html))[0]));
              failed = true;
            } else if (panel === 'Overview:bars' && !visibleText(html).includes('Per min')) {
              console.error('  FAIL ' + what + '\n         the bars view has no "Per min" column');
              failed = true;
            } else if (panel === 'Usage' && !namesSlots) {
              console.error('  FAIL ' + what + '\n         the By position rows are not named Starter / Middle / Anchor - raw slot numbers?');
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

  // ---- a ?build= link ---------------------------------------------------------
  //
  // A shared link to one build must open on that build and say so, and a code
  // that is not this character's must fall back to every build, not to nothing.
  console.log('\nA ?build= link opens on that build:');
  {
    const row = rows.find(r => characterBuilds(r, charMap).length >= 3);
    const builds = characterBuilds(row, charMap);
    const b = builds[1]; // not the most common, so "the default" cannot pass for it
    const cases = [
      ['?build=' + b.code, true, `${row.name}, build 2 of ${builds.length} (${b.count} uses)`],
      ['?build=zzzzzz', false, 'an unknown code'],
    ];
    for (const [search, wantStrip, label] of cases) {
      {
        const what = label;
        try {
          const text = visibleText(render(row, search));
          const strip = text.includes('Showing one build');
          // The identity header's match count is the build's when one is selected.
          const count = wantStrip ? b.row.activeMatchCount || b.row.matchCount : row.activeMatchCount || row.matchCount;
          const counted = new RegExp(`\\b${count.toLocaleString()}\\s+match`).test(text);
          if (strip !== wantStrip) {
            console.error(`  FAIL ${what}\n         strip ${strip ? 'shown' : 'missing'}`);
            failed = true;
          } else if (!counted) {
            console.error(`  FAIL ${what}\n         header does not read ${count} matches`);
            failed = true;
          } else if (overviewProblem(render(row, search))) {
            console.error(`  FAIL ${what}\n         ${overviewProblem(render(row, search))}`);
            failed = true;
          } else {
            console.log(`  ok   ${what}`);
          }
        } catch (err) {
          console.error(`  FAIL ${what}: ${err && err.message}`);
          failed = true;
        }
      }
    }
  }

  // ---- a ?tab= link -----------------------------------------------------------
  //
  // The open tab is in the URL, so "look at this character's builds" is a
  // link. A tab the view has nothing for (or a made-up one) falls back to the
  // first tab rather than an empty panel.
  console.log('\nA ?tab= link opens on that tab:');
  {
    const row = rows.find(r => characterBuilds(r, charMap).length >= 1 && (r.matches || []).length);
    for (const [search, want] of [['', 'Overview'], ['?tab=builds', 'Builds'], ['?tab=matches', 'Matches'], ['?tab=nonsense', 'Overview']]) {
      const html = render(row, search);
      const open = (/aria-selected="true"[^>]*>([^<]+)</.exec(html) || [])[1];
      if (open === want) console.log(`  ok   ${search || '(no tab)'} -> ${open}`);
      else { console.error(`  FAIL ${search || '(no tab)'} opened ${open}, want ${want}`); failed = true; }
    }
  }

  // ---- the score pill -------------------------------------------------------
  //
  // TierScorePill: one component behind every score in every table. A score's
  // colour used to be RELATIVE - callers passed the other scores on screen - so
  // the same score rendered green in one panel and orange in another. It is
  // absolute, from the score's tier, which is only worth anything if the tiers
  // actually produce different colours. (These checks tested the old
  // PerformanceScoreBadge until 2026-09-29, when it was found unused and
  // deleted.)
  console.log('\nThe score pill colours by tier, and every tier is reachable:');
  const TierScorePill = (await vite.ssrLoadModule('/src/components/TierScorePill.jsx')).default;
  const PerformanceScoreBadge = ({ score }) => React.createElement(TierScorePill, { score });
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
        score: probe, label: 'Score', size: 'small',
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

  // Z alone gets the breathing halo, on its own dark fill. The class carries the
  // animation, so a pill that forgets it would quietly stop breathing.
  {
    const zHtml = renderToString(React.createElement(PerformanceScoreBadge, {
      score: (TIER_CUTOFFS.Z ?? 0) + 1 }));
    const sHtml = renderToString(React.createElement(PerformanceScoreBadge, {
      score: (TIER_CUTOFFS.S ?? 0) + 1 }));
    const zOk = zHtml.includes('szl-tier-pill-z') && /background:\s*#2a1418/i.test(zHtml);
    const sOk = !sHtml.includes('szl-tier-pill-z');
    if (zOk && sOk) console.log('  ok   Z pill breathes on its dark fill; S does not');
    else { console.error('  FAIL Z breathing class / fill wrong (Z ok: ' + zOk + ', S clean: ' + sOk + ')'); failed = true; }
  }

  // Readable. The check above - a distinct colour per tier - passed while light
  // mode (since removed) was broken: the pill wrote its text in the tier's light
  // letter colour, close to invisible on white. So measure what a reader gets:
  // WCAG contrast of the text against the pill's own tinted background,
  // composited over the lighter of the dark surfaces, the harsher case.
  {
    const PAGE = { dark: [31, 41, 55] }; // gray-800
    const MIN = 4.5; // WCAG AA for normal-size text; the pill is text-xs/sm
    const parse = s => {
      const hex = /^#([0-9a-f]{6})$/i.exec(s.trim());
      if (hex) return [0, 2, 4].map(i => parseInt(hex[1].slice(i, i + 2), 16)).concat(1);
      const m = /rgba?\(([^)]+)\)/i.exec(s);
      if (!m) return null;
      const p = m[1].split(',').map(Number);
      return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
    };
    const over = ([r, g, b, a], base) => [r, g, b].map((c, i) => c * a + base[i] * (1 - a));
    const lum = rgb => {
      const [r, g, b] = rgb.map(c => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const contrast = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };

    for (const theme of ['dark']) {
      const results = [];
      for (const tier of TIERS) {
        const probe = TIER_CUTOFFS[tier] === undefined ? 0 : TIER_CUTOFFS[tier] + 1;
        const html = renderToString(React.createElement(PerformanceScoreBadge, { score: probe }));
        const style = (/style="([^"]*)"/.exec(html) || [])[1] || '';
        const bg = parse((/background:\s*([^;]+)/.exec(style) || [])[1] || '');
        const fg = parse((/(?:^|;)\s*color:\s*([^;]+)/.exec(style) || [])[1] || '');
        if (!bg || !fg) { results.push(tier + ' unparsed'); failed = true; continue; }
        const ratio = contrast(over(fg, PAGE[theme]), over(bg, PAGE[theme]));
        if (ratio < MIN) failed = true;
        results.push(tier + ' ' + ratio.toFixed(1) + (ratio < MIN ? ' (FAIL)' : ''));
      }
      const bad = results.some(r => /FAIL|unparsed/.test(r));
      (bad ? console.error : console.log)('  ' + (bad ? 'FAIL' : 'ok  ') + ' ' + theme + ' pill text contrast >= ' + MIN + ':1  ' + results.join('  '));
    }
  }

  // The pill must survive whatever a score turns out to be: a number to one
  // decimal, or a dash when there is none.
  for (const junk of [0, -5, NaN, undefined, null, 1e6]) {
    try {
      // React's SSR splits adjacent text nodes with <!-- --> markers; strip
      // them before asserting on the visible text.
      const html = renderToString(React.createElement(PerformanceScoreBadge, { score: junk }));
      const text = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, '');
      if (!text.trim()) { console.error('  FAIL score ' + junk + ' rendered nothing'); failed = true; }
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
          scopeLabel: 'Season S1 · Type Season', onBack: () => {},
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
console.log('PASSED - the character page and every tab panel render for each sampled character.');
