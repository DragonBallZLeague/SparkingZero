/**
 * Small RFC-4180 CSV reader/writer for the calculator data pipeline.
 *
 * Reads quoted fields, doubled quotes, multi-line cells, CRLF or LF line endings
 * and a UTF-8 BOM (referencedata/capsules.csv has both a BOM and multi-line
 * Effect cells, which the line-based parsers elsewhere in the repo break on).
 * Writes UTF-8 without a BOM and with LF endings, quoting only when needed, so
 * committed tables diff line by line.
 */
import fs from 'fs';
import path from 'path';

/** Parse CSV text into an array of rows (arrays of strings). */
export function parseCsv(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
    } else if (c === '"' && field === '') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

/** Read a CSV file with a header row. Returns { header, rows } where rows are objects keyed by header. */
export function readCsv(file) {
  const [header = [], ...data] = parseCsv(fs.readFileSync(file, 'utf8'));
  const rows = data
    .filter(r => r.some(v => v !== ''))
    .map(r => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
  return { header, rows };
}

function quote(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\r\n]|^\s|\s$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Serialise rows (objects or arrays) under a header. */
export function toCsv(header, rows) {
  const lines = [header.map(quote).join(',')];
  for (const r of rows) lines.push(header.map((h, i) => quote(Array.isArray(r) ? r[i] : r[h])).join(','));
  return lines.join('\n') + '\n';
}

/** Same text ignoring CR: git checkouts with core.autocrlf turn our LF output into CRLF. */
export function sameText(file, content) {
  const lf = (s) => s.split('\r\n').join('\n');
  return fs.existsSync(file) && lf(fs.readFileSync(file, 'utf8')) === lf(content);
}

/** Write a file only when its content differs, so unchanged outputs keep their mtime and stay out of diffs. */
export function writeIfChanged(file, content) {
  if (sameText(file, content)) return false;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  return true;
}
