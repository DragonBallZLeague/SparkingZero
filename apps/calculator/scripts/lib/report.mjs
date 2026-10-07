/** Markdown helpers for the generated REPORT.md / CHANGES.md (no timestamps: output must be reproducible). */

const cell = (v) => String(v ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');

export function table(header, rows) {
  if (!rows.length) return '_None._\n';
  return [
    `| ${header.map(cell).join(' | ')} |`,
    `| ${header.map(() => '---').join(' | ')} |`,
    ...rows.map(r => `| ${r.map(cell).join(' | ')} |`),
  ].join('\n') + '\n';
}

export function list(items, limit = Infinity) {
  if (!items.length) return '_None._\n';
  const shown = items.slice(0, limit).map(i => `- ${i}`);
  if (items.length > limit) shown.push(`- ... and ${items.length - limit} more`);
  return shown.join('\n') + '\n';
}

export const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '-');

export function fmt(v) {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
