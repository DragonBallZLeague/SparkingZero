/**
 * Snapshots the calculator's two source spreadsheets into committed CSVs.
 *
 * The only networked step of the data pipeline; run it by hand when a source
 * sheet changes (a game patch, a Capsule Corp update), then `npm run data:build`
 * and review the diff. Sources and tabs are listed in data/config.json:
 *   charmap      the raw game data map (ids, classes, moves, skills; raw inputs)
 *   capsulecorp  Capsule Corp's "Stats" tab (finalized combat numbers)
 *
 * Each tab is written verbatim to data/snapshots/<source>/<file>.csv (headers
 * with line breaks are joined with spaces; formulas become their cached value).
 * A tab with `keep: {column, values}` keeps only the rows whose column holds one
 * of the values (Combative Values has ~71,000 rows; the build reads two actions).
 * data/snapshots/<source>/MANIFEST.json records the source's own version marker,
 * every tab's exact header list, row counts and error cells.
 *
 * FAILS, writing nothing, when a tab is missing or its headers differ from the
 * committed manifest: a moved or renamed column must never shift data silently.
 * Review the printed column diff, then rerun with --accept-layout to take it.
 * Nothing is written unless every tab of every requested source parsed.
 *
 * Usage: node scripts/pull-sheets.mjs [--only charmap|capsulecorp]
 *          [--file charmap=path/to/export.xlsx] [--accept-layout]
 * Sheets must be shared "anyone with the link"; otherwise download the xlsx and pass --file.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { readWorkbookTabs } from './lib/sheets.mjs';
import { toCsv, writeIfChanged } from './lib/csv.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.resolve(__dirname, '..', 'data');
const config = JSON.parse(fs.readFileSync(path.join(DATA, 'config.json'), 'utf8'));

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i === -1 ? null : args[i + 1]; };
const only = opt('--only');
const acceptLayout = args.includes('--accept-layout');
const files = Object.fromEntries(args.flatMap((a, i) => (args[i - 1] === '--file' ? [a.split('=')] : [])));

const sources = Object.entries(config.sheets).filter(([key]) => !only || key === only);
if (!sources.length) { console.error(`pull-sheets: unknown source "${only}"`); process.exit(1); }

const pending = [];
const problems = [];
for (const [key, src] of sources) {
  let input;
  if (files[key]) {
    input = path.resolve(files[key]);
    console.log(`pull-sheets: ${key}: reading ${input}`);
  } else {
    const url = `https://docs.google.com/spreadsheets/d/${src.id}/export?format=xlsx`;
    console.log(`pull-sheets: ${key}: downloading ${url}`);
    const res = await fetch(url);
    const type = res.headers.get('content-type') || '';
    if (!res.ok || !type.includes('spreadsheetml')) {
      problems.push(`${key}: download failed (HTTP ${res.status}, ${type || 'no content type'}). Is the sheet still shared "anyone with the link"? Otherwise pass --file ${key}=<downloaded.xlsx>.`);
      continue;
    }
    input = Buffer.from(await res.arrayBuffer());
  }

  const { tabs, version, missing, seen } = await readWorkbookTabs(input, src.tabs, src.versionTab);
  for (const t of missing) problems.push(`${key}: tab "${t}" not found (workbook has: ${seen.join(', ')})`);

  const dir = path.join(DATA, 'snapshots', key);
  const manifestFile = path.join(dir, 'MANIFEST.json');
  const previous = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, 'utf8')) : null;
  const manifest = { source: src.title, sheetId: src.id, version, tabs: {} };
  for (const [tab, spec] of Object.entries(src.tabs)) {
    const t = tabs[tab];
    if (!t) continue;
    const before = previous?.tabs?.[tab]?.columns;
    if (before && JSON.stringify(before) !== JSON.stringify(t.header) && !acceptLayout) {
      const removed = before.filter(h => !t.header.includes(h));
      const added = t.header.filter(h => !before.includes(h));
      problems.push(`${key}/${tab}: columns changed since the committed manifest` +
        (removed.length ? `\n    removed: ${removed.join(' | ')}` : '') +
        (added.length ? `\n    added:   ${added.join(' | ')}` : '') +
        (!removed.length && !added.length ? '\n    same columns, new order' : '') +
        '\n    Check the build still reads the right columns, then rerun with --accept-layout.');
    }
    manifest.tabs[tab] = { file: spec.file, headerRow: spec.headerRow, ...(spec.keep ? { keep: spec.keep } : {}), rows: t.rows.length, columns: t.header, errorCells: t.errors.slice(0, 50), errorCount: t.errors.length };
    pending.push({ file: path.join(dir, spec.file), content: toCsv(t.header, t.rows), label: `${key}/${spec.file}`, rows: t.rows.length, errors: t.errors.length });
  }
  pending.push({ file: manifestFile, content: JSON.stringify(manifest, null, 2) + '\n', label: `${key}/MANIFEST.json` });
  console.log(`pull-sheets: ${key}: ${version || 'no version marker found'}`);
}

if (problems.length) {
  console.error(`pull-sheets: nothing written, ${problems.length} problem(s):`);
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}
let changed = 0;
for (const p of pending) {
  const did = writeIfChanged(p.file, p.content);
  if (did) changed++;
  if (p.rows !== undefined) console.log(`  ${did ? 'updated  ' : 'unchanged'} ${p.label} (${p.rows} rows${p.errors ? `, ${p.errors} error cells` : ''})`);
}
console.log(`pull-sheets: done, ${changed} file(s) changed. Next: npm run data:build, then review the diff.`);
