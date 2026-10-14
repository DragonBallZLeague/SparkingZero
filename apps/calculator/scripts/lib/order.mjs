/**
 * The calculator's character order (the league, 2026-10-14): referencedata/characters.csv's order, with each row of
 * data/curated/character-order.csv moving its character right after another, applied top to bottom. Ids are not
 * always in the order the league reads the roster (a form after the form it comes from, a fighter next to its
 * partner), and characters.csv's order is shared with the other apps, so the calculator keeps its own moves.
 * build-data publishes characters.json in this order and verify-data checks it with the same function.
 *
 * @param {Array<{id: string}>} list in referencedata order (not changed)
 * @param {Array<{id: string, after: string}>} rows
 * @returns {{ list: Array, problems: string[] }}
 */
export function applyOrder(list, rows) {
  const out = [...list];
  const problems = [];
  for (const r of rows) {
    const from = out.findIndex(c => c.id === r.id);
    if (from < 0 || !out.some(c => c.id === r.after) || r.id === r.after) { problems.push(`${r.id} after ${r.after}`); continue; }
    const [c] = out.splice(from, 1);
    out.splice(out.findIndex(x => x.id === r.after) + 1, 0, c);
  }
  return { list: out, problems };
}
