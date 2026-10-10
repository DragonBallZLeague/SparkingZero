# Calculator demo: option B on real data

A working demo of the calculator rebuilt on the Analyzer's design (option B in the 2026-10-09 review doc): a Characters table, a page per character, and one Build page where Compare and Vs opponent are modes. The league judges it here, at 1280px and 390px, before the React rebuild. It is a throwaway: delete this folder once the real pages ship and match it.

## Run it

From the repo root:

```bash
node apps/calculator/design/demo/build-demo.mjs
```

Then open `apps/calculator/design/demo/calculator-demo.html` in a browser. The page is self-contained (it is gitignored) apart from the portraits, which it loads from `apps/analyzer/public/portraits/` by relative path. The view, and the whole build, live in the URL hash, so a reload or a copied link stays put.

## What is real and what is not

- **Real:**
  - Every number. esbuild bundles `public/data/*.json` with the app's own `toLegacy`, `collectEffects`, `computeStats`, `kiBlastVolley`, `calcOutgoingCombo` and the ruleset helpers, run the way `App.jsx` runs them (`sideEffects` / `sideStats`, opponent-targeted skill effects exchanged in Vs opponent).
  - Every breakdown. Tap any underlined number, move card or move row: the parts it is made of (raw power × 1.25 × DP scale + class + each capsule and skill, defense factors, rate formulas) and each part's source, from `characters.json` provenance.
  - Sorting, class and team filters, column sets, rulesets (banned capsules hidden, budget and group caps warned), skill and Sparking toggles, capsule slots, compare wins and diffs, Vs opponent damage after the other side's defenses and armor.
- **Not wired:** the site navbar links, saving builds, and decoding old share links (the real build keeps `shareLink.js`).

## Files

- `data.js`: the published data run through the adapter and engine; effect labels from `data/curated/effects.csv`; source wording.
- `stats.js`: every stat the pages show (label, format, which way is better) and its breakdown rows.
- `ui.jsx`: the breakdown popover (a bottom sheet on a phone), chip menus, the segmented control, portraits, class badges.
- `moves.jsx`: blasts, skills and the Sparking passive, with their breakdowns.
- `characters.jsx`, `character.jsx`, `build.jsx`: the three pages. `demo.jsx`: the shell and the hash router.
- `demo.css`: the Analyzer shell's tokens and measurements.
- `build-demo.mjs`: bundles all of it into `calculator-demo.html`.
