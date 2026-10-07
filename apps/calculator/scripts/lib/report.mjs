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

/**
 * JSON with small objects and arrays kept on one line (<= `width` chars), larger ones
 * broken one entry per line. Diffs stay per record without the bulk of full indentation.
 */
export function compactJson(value, width = 150) {
  const walk = (v, indent) => {
    const flat = JSON.stringify(v);
    if (flat === undefined) return 'null';
    if (v === null || typeof v !== 'object' || flat.length + indent.length <= width) return flat;
    const inner = indent + '  ';
    if (Array.isArray(v)) return `[\n${v.map(x => inner + walk(x, inner)).join(',\n')}\n${indent}]`;
    const entries = Object.entries(v).filter(([, x]) => x !== undefined);
    return `{\n${entries.map(([k, x]) => `${inner}${JSON.stringify(k)}: ${walk(x, inner)}`).join(',\n')}\n${indent}}`;
  };
  return walk(value, '') + '\n';
}

export function fmt(v) {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
