/**
 * Chronological order for matches, from their file names.
 *
 * BR_Data files carry no date, and plain name order is wrong in two ways:
 * "S0 Week 10" sorts before "S0 Week 2", and "S0 Playoffs ..." before
 * "S0 Week 1". The names do follow a scheme, so the order is read from it:
 *
 *   season number, then phase - PS (pre-season), S (main season), S Playoffs,
 *   OS (off-season events) - then the playoff round (Wildcards, Quarter-finals,
 *   Semi-finals, Finals), then the rest of the name with numbers compared as
 *   numbers (Week 2 before Week 10, Match 2 before Match 10, R1 before R2).
 *
 * A name outside the scheme (tests: "OS0 Budokai 4v4 Test 12") still sorts
 * sensibly by the natural-order fallback. Imports nothing, so scripts can use it.
 */

const base = name => String(name || '').split('/').pop();

function season(name) {
  const m = base(name).match(/^(?:PS|OS|S)(\d+)\b/i) || String(name || '').match(/Season (\d+)/i);
  return m ? Number(m[1]) : 0;
}

function phase(name) {
  const b = base(name);
  if (/^PS\d/i.test(b)) return 0;
  if (/^OS\d/i.test(b)) return 3;
  if (/playoff/i.test(b)) return 2;
  return 1;
}

function round(name) {
  const b = base(name).toLowerCase();
  if (b.includes('wildcard')) return 0;
  if (b.includes('quarter')) return 1;
  if (b.includes('semi')) return 2;
  if (b.includes('final')) return 3;
  return 0;
}

/** Oldest first. For newest first, compare (b, a). */
export function compareMatchTime(a, b) {
  return season(a) - season(b) || phase(a) - phase(b) || round(a) - round(b)
    || base(a).localeCompare(base(b), undefined, { numeric: true, sensitivity: 'base' });
}
