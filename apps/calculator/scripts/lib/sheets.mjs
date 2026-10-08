/**
 * Reads the tabs the calculator needs out of a Google-Sheets xlsx export.
 *
 * Streams the workbook with exceljs (the raw game map is ~22 MB, most of it in
 * Record* tabs this pipeline never uses, so those are drained without being
 * kept). Each wanted tab comes back as { header, rows, errors }: the header is
 * the Nth non-empty row (config `headerRow`), rows are the non-empty rows after
 * it, and cell values are converted to plain strings — a formula becomes its
 * cached result, rich text its text, an error cell ('#REF!') an empty string
 * that is also listed in `errors`, a number at most 12 significant digits.
 */
import fs from 'fs';
import { Readable } from 'stream';
import ExcelJS from 'exceljs';

function colLetter(n) {
  let s = '';
  for (n += 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

function cellText(v, at, errors) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'number') return Number.isFinite(v) ? String(Number(v.toPrecision(12))) : '';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (typeof v === 'string') return v;
  if (typeof v === 'object') {
    if ('error' in v) { errors.push(`${at}: ${v.error}`); return ''; }
    if ('result' in v) return cellText(v.result, at, errors);
    if ('richText' in v) return v.richText.map(p => p.text).join('');
    if ('text' in v) return cellText(v.text, at, errors);
    if ('formula' in v || 'sharedFormula' in v) return '';
  }
  return String(v);
}

/** Version marker of a source, read from its version tab's top rows. */
function readVersion(rows) {
  for (const r of rows.slice(0, 6)) {
    for (let i = 0; i < r.length; i++) {
      const t = r[i] || '';
      const build = t.match(/Build\s+(\d+)/i);
      if (build) return `build ${build[1]}`;
      if (/Last Update/i.test(t)) {
        const next = r.slice(i + 1).find(x => x);
        if (next) return `last update ${next}`;
      }
    }
  }
  return null;
}

/**
 * @param {Buffer|string} source  xlsx bytes or a file path
 * @param {Record<string, {headerRow: number, keep?: {column: string, values: string[]}}>} wanted  tab name → options
 * @param {string} [versionTab]
 */
export async function readWorkbookTabs(source, wanted, versionTab) {
  const input = Buffer.isBuffer(source) ? Readable.from(source) : fs.createReadStream(source);
  const reader = new ExcelJS.stream.xlsx.WorkbookReader(input, {
    sharedStrings: 'cache', hyperlinks: 'ignore', styles: 'cache', worksheets: 'emit', entries: 'emit',
  });
  const tabs = {};
  let version = null;
  const seen = [];
  for await (const ws of reader) {
    const name = ws.name;
    seen.push(name);
    const want = wanted[name];
    if (!want && name !== versionTab) {
      for await (const _row of ws) { /* drain unused tab */ }
      continue;
    }
    const errors = [];
    const raw = [];
    for await (const row of ws) {
      const vals = [];
      const values = row.values || [];
      for (let c = 1; c < values.length; c++) vals[c - 1] = cellText(values[c], `${colLetter(c - 1)}${row.number}`, errors);
      for (let c = 0; c < vals.length; c++) if (vals[c] === undefined) vals[c] = '';
      if (vals.some(v => v.trim() !== '')) raw.push(vals);
    }
    if (name === versionTab) version = readVersion(raw);
    if (!want) continue;
    const headerCells = raw[want.headerRow - 1] || [];
    let width = headerCells.length;
    while (width > 0 && !String(headerCells[width - 1]).trim()) width--;
    const header = [];
    const used = new Map();
    for (let c = 0; c < width; c++) {
      let h = String(headerCells[c] || '').replace(/\s+/g, ' ').trim() || `Column ${colLetter(c)}`;
      if (used.has(h)) { used.set(h, used.get(h) + 1); h = `${h} #${used.get(h)}`; } else used.set(h, 1);
      header.push(h);
    }
    let rows = raw.slice(want.headerRow).map(r => header.map((_, c) => r[c] ?? ''));
    // keep: { column, values } snapshots only the rows a huge tab's consumer needs
    if (want.keep) {
      const at = header.indexOf(want.keep.column);
      if (at === -1) throw new Error(`${name}: keep column "${want.keep.column}" is not in the header`);
      const values = new Set(want.keep.values);
      rows = rows.filter(r => values.has(r[at]));
    }
    tabs[name] = { header, rows, errors };
  }
  const missing = Object.keys(wanted).filter(t => !tabs[t]);
  return { tabs, version, missing, seen };
}
