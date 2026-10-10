# Calculator redesign: what is left

The league chose concept B, the in-game character sheet (`concepts/concept-b.html`), on 2026-10-09. It has been
through three review rounds and a header adjustment, the last on 2026-10-10. This file lists what is still open
before the detailed demo and the rebuild. Update it as items close; delete it with `design/` once the real pages ship.

The data rebuild (everything up to commit `0b6ecc99`) ships to dev-branch on its own. None of this blocks it.

## 1. Decisions waiting on the league

- **Sign-off on concept B** after round 3 (header barrier, average strips, ki regen as the self-recharge bars only,
  All stats modes, ULT, "per" wording, breakdowns from the base hit).
- **Giants and their size factors.** The game's cards shrink giants to fit, so they need a factor on top of their
  card height. Only Janemba has one (×1.3, a guess). Needed: the list of giants (Great Apes, Hirudegarn and so on)
  and a factor each, then a curated table such as `data/curated/art-scale.csv`.
- **"To knock out" on Vs opponent.** It is marked as a draft. The league doesn't find "rush combos and ultimates
  needed" useful, so decide what it should measure, or drop it.
- **Ki charge bar.** It now shows where the character sits between the roster's slowest and fastest, with a tick at
  the league average. Confirm this meaning.
- **League-average strips.** Confirm which stats get one, and the scale (5th to 95th percentile of the roster).
  Should the command list's blast and ultimate damage get one too?
- **The full art set.** Cutting all 241 card images (about 12 MB, about 49 KB each) into `public/char_art/`.

## 2. Views and interactions not mocked yet

- Vs opponent's **All stats** mode. It is described in the concept but not drawn.
- Compare's **All stats** mode on a phone.
- **Character picker** (the nameplate's "Change"), on the sheet and on each side of Compare and Vs.
- **Capsule picker** (the hexes): the ruleset, budget and group caps, the rule warnings, and notes for effects the
  stats don't show (today's `RulesBar`).
- **Opponent build editing** on Vs opponent: their capsules, skills and Sparking.
- **Breakdowns on touch screens**: tap to open and close, and keyboard and screen-reader access.
- **"Closest fighters"**: confirm the nine-stat similarity and what tapping one does.
- **Combat limits ("NEW")**: which game-file values to show, and their wording.

## 3. Build-out

1. **Detailed real-data demo of concept B.** Reuse `design/demo/`'s build plumbing (esbuild bundling this app's
   engine and `public/data`). Its Analyzer-look UI was rejected, so replace that.
2. **URL scheme.** Character pages by name slug, the four views as routes, and share links that carry the whole
   build (active skills, Sparking, ruleset, opponent). Old `#` share links must keep decoding. Uses
   `restoreDeepLink` like the Analyzer.
3. **Rebuild the app** to the signed-off demo. Then delete `design/concepts/`, `design/demo/` and this file.
4. Keep `apps/calculator/CLAUDE.md` in step at each stage.

## Conventions

The settled rules (colours, labels, wording, art framing, no data sources in the UI) are in
`apps/calculator/CLAUDE.md`, under "Redesign".
