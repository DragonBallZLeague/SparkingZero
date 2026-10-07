# The 2026-10 data rebuild (record)

Frozen records of the one-time move from the hand-edited JSON to the generated pipeline.
Nothing reads these files; they are kept so the league can see what changed and why.

- `CHANGES-vs-old-calculator.md` — every character field, skill and blast that differs
  between the old calculator data (dev-branch e02c05fb) and the first generated data
  (raw game map build 24953175, Capsule Corp 2026-08-31), in the old field shapes. Skill
  and Sparking buffs compare the old levels x 5 with the game's exact percentages.
- `seed-log.md` — how `scripts/oneoff/seed-curated.mjs` turned the old JSON into the
  curated tables: the 41 blast rows it relinked (the Cell forms' rows had been filed
  under the wrong form; Android 17 (Z) and (Super) had swapped move names), the one row
  it dropped (a stray header), and the masterlist names it could not resolve.
- Schema 2 was proved lossless before the old file shapes were retired:
  `scripts/oneoff/prove-lossless.mjs` showed that `toLegacy()` over the schema-2 files
  reproduced all six old-shape files of the P1 commit (8672b07f) exactly. Both one-off
  scripts were deleted afterwards; they are in git history up to commit a38251cc.

From here on `data/CHANGES.md` describes each data change against the previous build.
