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
  - toughness as taken from the other (hits to KO were tried, then taken out);
  - the rest as in Compare.
- An ultimate's cost with Ultimate Burst reads "+1 bar"; the full text overlapped the damage.

## Second look (2026-10-12)

- **Change** is an outlined, square-cornered button right beside the name, with the swap icon in an orange
  square (it blended in with the chips as a white slanted one).
- **Class chips:**
  - long class names wrap inside the panel;
  - chips in the two-fighter header have no text shadow (it smudged light chips like Legendary Super Saiyan).
- **One slant angle:** every slanted box uses a fixed-pixel slant sized to its height. Percentages gave each
  box a different angle by its width.
- **Full stats:**
  - the build is one panel: Active as switch rows, Capsules in their category colours, Conditions inline;
  - the section nav is text links with a colour dot, sticky, marking the section being read;
  - on a tablet, Rush Chains follow Melee.
- **All stats, both views:**
  - Compare and Vs share one section list, order and display. Vs shows each damage row as dealt to the other side,
    and where each side breaks the other's armor.
  - Bars fill by the value's place in the whole roster's range, as on the Sheet. They are muted, and only the
    better side lights up.
  - Rush Chains and the Command list are mirrored rows: each side's number sits next to the centre label.
- **Vs opponent's Breaking armor** shows only these two fighters as they stand: each side's attacks against the
  other's armor right now. It is in All stats and under Health in the Exchange.

## Third look (2026-10-12)

- **Change** follows the name's last line: inline after it on the left side and the Sheet (its own line when
  the line is too full), and on the inner edge of the bottom line for the right side.
- **Phone Full stats nav:** a sticky bar names the section being read and opens every section as a two-column
  grid. No sideways scrolling.
- **Base values** under changed numbers in Full stats' Rush Chains and Ki blasts too, and in the phone list's
  Base column.
- **Hits to KO** are out (noted in REDESIGN-STATUS.md for later).
- **Compare and Vs opponent** share one bar, under the Summary/Exchange and All stats switch: **Loadout**
  (skills, Sparking, capsules) and **Conditions**, each for both fighters (side by side on a desktop; one at a
  time with a switch on a phone). The per-side white Build buttons are gone, and Compare has conditions now.
- **Capsule colour, toned down:** a capsule row's coloured left edge and its coloured type name. League-build tags
  are plain, backgrounds are neutral, and every category bar is thin and faded.
- **Phone section nav everywhere:** Compare's and Vs's All stats use Full stats' sticky bar and section grid
  (`PhoneSectionNav` in `ui.jsx`); the old chip row ran off the screen. "Only differences" sits on that bar.
- **Vs Breaking armor** uses the Exchange's shields (cracked green: breaks; grey: holds).
- The phone's Compare bar has the VS mark and slanted barrier.

## Checked

Desktop (1280px), tablet (820px: the Sheet puts the build beside the figure, Vs opponent stacks health above the
exchange) and phone (390px). The numbers match the concept's (Vs Janemba 1,812 / 2,306, round 21's conditions
2,769 → 2,566). Adding capsules, league builds, skill stages and keyboard breakdowns were clicked through headlessly.

## Open

- Blast damage scales hit by hit, each hit rounded up, as measured on 2026-10-12. All eight blasts tested with
  Blast Burst match (Kamehameha 7,485, Energy Blast Barrage 7,880, Drain Life Cell 9,213, ...). 83 of 743 blasts
  have no hit split yet and scale as one hit.
- Burst Melee Attack and Burst Rush are shown as 1,250 and 450 for everyone (the data has no per-character availability).
