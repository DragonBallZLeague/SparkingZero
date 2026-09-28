# Character page Overview: the approved design demo

The working demo the Character page's Overview tab was designed on (approved 2026-09-28).
It is the visual and behavioural **spec** for implementation. The decisions it embodies
are written out in `docs/ANALYZER_REDESIGN_PLAN.md` ("Overview tab: approved design"),
so you should not need to read this code to know what was agreed.

It is a throwaway: delete this folder once the Overview tab ships and matches it.

## Run it

From `apps/analyzer/`:

```bash
node --import ./scripts/json-import-hook.mjs design/character-overview/demo-data.mjs
node design/character-overview/build-demo.cjs
```

Then open `design/character-overview/overview-demo.html` in a browser. Both outputs are
gitignored.

## Files

- `demo-data.mjs` computes everything from real match data over the frozen calibration
  window (last 2 seasons, Ultra only). It uses the app's own `extractStats` per entry, and
  the app's own `getAggregatedCharacterData` and `filterAggregatedData` for scores and
  per-build rows, so its numbers match the leaderboard. It also holds the working
  `attackHitCount` classification that `docs/ACTION_CODES.md` documents.
- `overview-demo.template.html` is the page: plain HTML and JS, no build step.
- `build-demo.cjs` inlines the data into the page.
