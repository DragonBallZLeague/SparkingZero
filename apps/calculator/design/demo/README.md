# Calculator demo: concept B on real data (in progress)

The detailed demo of concept B (signed off through round 22): the Sheet, Full stats (rows), Compare, Vs opponent,
both pickers, conditions controls and breakdowns, on the published data and the calculator's own engine. It is a
throwaway: delete this folder once the real pages ship and match it.

## Run it

From the repo root: `node apps/calculator/design/demo/build-demo.mjs`, then open
`apps/calculator/design/demo/calculator-demo.html` (gitignored, self-contained; art and face icons load from
`apps/calculator/public/` by relative path). The whole state (view, both fighters, builds, skills, Sparking,
conditions, ruleset) lives in the URL hash.

## Files

- `sheet.css`: concept B's stylesheet, extracted from `design/concepts/concept-b.html`; `demo.css` adapts it to a live page.
- `model.js`: data and engine glue (sides, game-file values scaled by the build, breakdowns, roster ranges, moves, exchange).
- `state.js` (URL), `format.js`, `ui.jsx` (breakdowns, tappable numbers), `moves.jsx`, `conditions.jsx`.
- Views: `sheet.jsx`, `fullstats.jsx`, `compare.jsx`, `versus.jsx`, `pickers.jsx`; shell `main.jsx`.

## Open (2026-10-11, where work stopped)

- Adding a capsule from the capsule picker did not stick in one headless test (Goku (Z - Mid), empty build); check.
- Not yet reviewed at tablet width; phone views checked at 390px.
- Blast damage now uses the game's round-up formula (Kamehameha 7,482 with Blast Burst; the current app shows 7,481).
- Burst Melee Attack and Burst Rush are shown as 1,250 and 450 for everyone (the data has no per-character availability).
