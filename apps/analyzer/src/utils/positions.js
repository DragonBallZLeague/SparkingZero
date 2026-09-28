// Team-position names - the single source for every user-facing position label.
//
// The league calls the first slot the STARTER. The three-slot model used across
// the analyzer is Starter / Middle / Anchor: slot 1 is the Starter, the last
// member of a team is the Anchor, and everyone in between is a Middle
// (positionAggregation.js collapses 4v4/5v5 middles into slot 2).
//
// Why this file exists: the name used to be written out at each call site, and
// the call sites disagreed. Position Analysis, its table and the Excel export
// said "Lead"; characterAggregation.js and the team panel said "Starter"; and
// the raw match data says neither, storing the slot as a NUMBER (1/2/3). One
// page ended up showing "1", "Starter" and "Lead" for the same slot. Worse,
// preparePositionData() emitted the label and the table colour-coded rows by
// matching that same label, so renaming one without the other silently dropped
// the colouring. Everything now goes through here, and colour maps key on the
// SLOT NUMBER rather than on the word, so a future rename cannot break them.
//
// Imports nothing on purpose, so aggregation code and build scripts can use it.

export const POSITION_NAMES = Object.freeze({ 1: 'Starter', 2: 'Middle', 3: 'Anchor' });

/** Slots in display order. */
export const POSITION_SLOTS = Object.freeze([1, 2, 3]);

// Every spelling the data or older code might hand us, mapped to a slot.
// 'lead' stays accepted so anything still carrying the old word resolves.
const ALIASES = { starter: 1, lead: 1, middle: 2, anchor: 3 };

/** Slot number (1/2/3) for a position in any vocabulary, or null. */
export function positionSlot(position) {
  if (position == null || position === '') return null;
  const asNumber = Number(position);
  if (Number.isInteger(asNumber) && POSITION_NAMES[asNumber]) return asNumber;
  return ALIASES[String(position).trim().toLowerCase()] ?? null;
}

/**
 * The display name for a position given as a slot number or any known name.
 * An unrecognised value is shown as itself rather than hidden or guessed, and
 * an empty one as an em dash.
 */
export function positionLabel(position) {
  const slot = positionSlot(position);
  if (slot) return POSITION_NAMES[slot];
  return position == null || position === '' ? '—' : String(position);
}
