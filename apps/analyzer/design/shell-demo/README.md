# Shell demo: tab row, scope bar, Characters table, tier list, Meta Builds

A working demo of the app shell and the list pages decided in `docs/ANALYZER_REDESIGN_PLAN.md`: "Visual direction" and "Page-by-page review". The league judges the design here, on real data at 1280px and 390px, before the React rebuild. It is a throwaway. Delete this folder once the pages ship and match it.

## Run it

From `apps/analyzer/`:

```bash
node --import ./scripts/json-import-hook.mjs design/shell-demo/demo-data.mjs
node design/shell-demo/portraits.mjs
node design/shell-demo/build-demo.cjs
```

Then open `design/shell-demo/shell-demo.html` in a browser. The page is self-contained, and all three outputs are gitignored. The view is kept in the URL hash, so a reload stays put.

## What is real and what is not

- **Real:**
  - every number, from the app's own `getAggregatedCharacterData`, `filterAggregatedData`, `characterBuilds()` and tier functions
  - the Season and match-type chips, multi-select, over every combination of values (twelve distinct scopes)
  - the multi-select position chip, which re-runs the leaderboard filter over the chosen positions' matches
  - the Builds floor and the multi-select character, AI strategy and capsule filters (a build must contain every capsule picked)
  - sorting, and the row links to the live Character page
- **Not wired:** difficulty, teams, "+ Filter", the Excel button (it shows a toast), and the Home, Teams, Matches, Sandbox, AI strategies and Capsules tabs, which show what they will hold.

## Files

- `demo-data.mjs` computes the data per scope, plus the tier plates as SVG.
- `portraits.mjs` crops the Calculator's 512px face icons to 96px WebP in headless Edge (`scripts/dev/browser.mjs`). No image library is installed. The one filename override, `0080_01`, is the plan's.
- `shell-demo.template.html` is the page: plain HTML, CSS and JS, with no build step.
- `build-demo.cjs` inlines the data and portraits into the page.
