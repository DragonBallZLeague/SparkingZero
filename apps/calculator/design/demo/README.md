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

## The league's first look (2026-10-12)

- A **Characters** tab holds the full picker. Its preview opens the fighter's Sheet, or puts them on Compare's or
  Vs opponent's right side.
- **Change fighter** (or a click on the name) opens a quick list where the fighter is shown, without leaving its
  numbers: the Sheet's art column, or a drop-down under the name. It has forms on top; arrow keys flip through
  fighters live, and Enter or a click keeps one.
- Full stats stacks Melee and Ki blasts beside Rush Chains (Melee alone left an empty block).
- Vs opponent: Exchange in two columns (basic attacks; blasts, ultimate, Sparking!). All stats is the matchup:
  - each side's damage as dealt to the other;
  - toughness as taken from the other, with rush combos, full volleys and ultimates to KO;
  - the rest as in Compare.
- An ultimate's cost with Ultimate Burst reads "+1 bar"; the full text overlapped the damage.

## Checked

Desktop (1280px), tablet (820px: the Sheet puts the build beside the figure, Vs opponent stacks health above the
exchange) and phone (390px). The numbers match the concept's (Vs Janemba 1,812 / 2,306, round 21's conditions
2,769 → 2,566). Adding capsules, league builds, skill stages and keyboard breakdowns were clicked through headlessly.

## Open

- Blast damage scales hit by hit, each hit rounded up (the league's 2026-10-12 test: Energy Blast Barrage 7,880).
  Kamehameha with Blast Burst shows 7,485. The league read 7,845 in game, so `data/TESTS.md` asks for a
  re-read. Drain Life Cell shows 9,214 against the game's 9,213.
- Burst Melee Attack and Burst Rush are shown as 1,250 and 450 for everyone (the data has no per-character availability).
