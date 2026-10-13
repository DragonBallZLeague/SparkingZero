# Calculator demo: concept B on real data (in progress)

The detailed demo of concept B (signed off through round 22, re-laid out in round 23): the Fighter page (the Sheet
and Full stats as one page), Versus (Compare and Vs opponent as one page), both pickers, conditions controls and
breakdowns, on the published data and the calculator's own engine. It is a
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
- Views: `fighter.jsx` (the Fighter page, from `sheet.jsx`'s Quick forms and `fullstats.jsx`'s Full forms),
  `versus.jsx` (the Versus page, with `compare.jsx`'s Side by side pieces), `pickers.jsx`; shell `main.jsx`.

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

## Fourth look (2026-10-12)

- **Full stats keeps its arrangement when sections fold:** a folded section keeps its open width (`Fold`'s
  `keepWidth`: the contents laid out at no height, hidden and inert), so lines never reshuffle. The order is the
  nav's: Melee on its own line, then Rush Chains before Ki blasts (the Melee and Ki blasts stack is gone).
- **Every number a skill, capsule or condition changes is marked** on the Sheet and in Full stats (orange when better,
  red when worse), including Rush Chains, armor break, the short dash and folded summaries.
- **Armored 5-hit taken** shows only when the fighter has armor now (it equals the plain value otherwise).
- **Ki blasts' colour** is a golden yellow (`#fbb41a`).
- **Pursuits:** Vanishing Crash and Dragon Crash raise Vanishing Attack's and Dragon Smash's damage (Melee's new
  Pursuits group, beside Lightning Attack). Vanishing Break and Dragon Break add a use (Combat limits now counts
  each pursuit's uses instead of Yes/No). Both also show in Compare and Vs All stats and in the capsule picker.
  All as measured by the league (`data/README.md`, sixth round): a Break capsule adds a use to its pursuit and
  to the total, both together make 4, and Lightning Attack (2 × 575 for Goku) is used once.

## Under the site's shared bar (2026-10-12)

The demo now renders the real shared nav bar (`packages/ui` `NavBar`, its CSS inlined by `build-demo.mjs`):
- the bar carries the page title, and nothing in its centre slot;
- the calculator's own bar is only the view tabs, sticky right under it (on a phone the tabs stay at the bottom);
- `--top` in `demo.css` is everything stuck to the top, used by every sticky offset.

The **ruleset** is picked only where builds are made (2026-10-13; it matters little for general use): the
Capsules header of every build (Sheet, Full stats, Loadout) and the capsule picker, above the budget
(`RulesetSelect` in `ui.jsx`). The league approved a fix to the shared bar at the same time, made in
`packages/ui/src/NavBar.css`: on a phone its title ran under any centre controls (today's calculator puts buttons
there). The side columns now shrink, and on a phone the title hides when the centre slot is used.

## Round 23: fewer pages, the build beside the numbers (2026-10-13)

The league found the demo took more clicks than the live calculator and split one fighter over separate pages.
After the quick concepts (`../concepts/layout-r23.html`) the demo has three tabs: **Characters, Fighter, Versus**.
- **Fighter** (`fighter.jsx`) is the Sheet and Full stats as one page, in the Sheet's order. Each section has two
  forms in the same place:
  - **Quick**: the Sheet's look, roster bars and all (`QuickBody` in `sheet.jsx`).
  - **Full**: Full stats' rows (`FullBody` in `fullstats.jsx`).
  A **Quick / Full** switch sets every section; **More / Less** switches one. Breaking armor, Combat limits,
  Mobility and Traits are one line with their headline numbers until opened.
- **Pinned at the top of Fighter:**
  - a headline strip (Health, 5-hit taken, Rush 5-hit, Smash, Throw, Ki blast, Full volley, Armor break; four on a
    phone);
  - the section links;
  - **Find**: it jumps to any stat or move and opens a closed section to reach it (it searches each closed
    section's full rows, rendered hidden only while searching).
- **The capsule picker never replaces the page.**
  - **Wide screens:** it docks in the fighter column, pinned with its own scroll, and hovering a capsule shows
    where the headline numbers would go.
  - **Narrower:** it is a bottom sheet over the lower page, with the skills, Sparking and what the build changed
    on top.
  - **Phone:** a Loadout bar above the tabs opens it.
- **Versus** (`versus.jsx`) is Compare and Vs opponent as one page.
  - **Side by side / Matchup** picks the lens; Quick / Full picks Summary or Exchange, or All stats.
  - **Wide screens:** each fighter's build is a rail on its own side (`SideBuild` plus Conditions), where its
    picker docks.
  - **Narrower:** the Loadout and Conditions bar.
- **The URL:** `#/fighter`, `#/versus`, with `d=full` and `vl=match`. Old links still open (`#/sheet`, `#/stats`,
  `#/compare`, `#/vs`, `cm=all`, `vm=all`).
- **Not taken:** the concepts' quieter type. The league kept the game's look; it reads better and makes stats
  easier to find.

## Checked

Desktop (1280px), tablet (820px: the Sheet puts the build beside the figure, Vs opponent stacks health above the
exchange) and phone (390px). The numbers match the concept's (Vs Janemba 1,812 / 2,306, round 21's conditions
2,769 → 2,566). Adding capsules, league builds, skill stages and keyboard breakdowns were clicked through headlessly.

## Open

- Blast damage scales hit by hit, each hit rounded up, as measured on 2026-10-12. All eight blasts tested with
  Blast Burst match (Kamehameha 7,485, Energy Blast Barrage 7,880, Drain Life Cell 9,213, ...). 83 of 743 blasts
  have no hit split yet and scale as one hit.
- Burst Melee Attack and Burst Rush are shown as 1,250 and 450 for everyone (the data has no per-character availability).
