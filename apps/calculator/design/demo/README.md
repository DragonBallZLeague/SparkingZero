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

**Second pass, the same day.** The rows made Full look plainer than Quick; only the Command list's Full (its move
cards) felt right. So every section's Full form (`FullForm` in `fullstats.jsx`) is now its Quick form blown up in
the same look, with every detail:
- **Toughness, Resources and Sparking!:** their Quick form plus tiles (Armored 5-hit taken, Switch, Max ki,
  Refills to, Ki from hits, Sparking armor, ...).
- **Offense:** a rush hit strip, smash levels, throw and pursuits as tiles, then ki blast cards (Ki blast,
  Charged, Jump, Dash...).
- **Rush Chains:** a card per chain with its charge levels and follow-ups, each follow-up's hits listed.
- **Breaking armor:** shield badges.
- **Combat limits:** tiles with use pips.
- **Mobility:** a tile per dash. **Traits:** tiles.

Changed numbers show their base under them. The row tables are gone from the demo.

**Third pass, the same day:**
- **Offense splits** into Melee and Ki blasts, with Rush Chains between them (Melee, Rush Chains, Ki blasts), in
  both forms.
- **Roster bars** on every stat where more (or less) is clearly better:
  - the three defenses, armor break, every rush hit and Into armor, the smash levels, Dragon Smash and Lightning
    Attack;
  - each ki blast card's main number;
  - Armored 5-hit taken, Switch, Ki from hits, Hyper Smash;
  - every dash's cost (cheaper is fuller).
- **Forms** sit above Active in the fighter column; a click switches form and keeps the build.
- **League builds** sit under the capsules on the Fighter page, the same list as Versus's rails (`LeagueBuilds` in
  `sheet.jsx`).
- **An alternate move** is marked in its card's damage column ("Alternate blast" or "Alternate ultimate", with a
  costume) instead of beside its name.
- **Move cards' small tiles** sit two or more a row and wrap long values within the tile, so the card is shorter.
- **Scroll bars** are thin and dark, in the page's colours.
- **The league's answers on bars:**
  - a Rush Chain card's bar compares its full-charge damage with the same chain type across the roster;
  - blasts and ultimates keep no bars (their damage depends on the move type).
- **The headline strip was tried, then taken out** (the league didn't take to it). The pinned controls (Quick /
  Full, the section links, Find) sit on a plate with its neutral grey edge. The phone's loadout sheet still lists
  the headline numbers the build changes.
- **Section edges:** every section's edge is one bright neutral (`#cbd5e1`); the colours had got loud. A section
  keeps its colour in its title and its bars; the two sides' build panels keep orange and blue.
- **Capsules:** Edit capsules and Clear sit under the capsule list (Clear crowded the header's points).
- **Section headers:** every section's header is a header bar like the build's groups: a slate top edge and tint
  across the plate, the name large and italic. A dot in the section's colour (the same as its link) is all the
  colour a section keeps besides its stat bars. Sub-groups (Melee's Rush, Smash and throw, Pursuits) are one size
  smaller.
- **Trials, after the headers** (for the league to judge):
  - sections have no left edge at all; the header bar marks each one (the two sides' build panels keep theirs);
  - ki blast and Rush Chain cards' heads are slate with a dot in the card's colour; blast and skill cards keep
    their slot badge (B1, ULT, S1) on a slate head;
  - sub-groups (Melee's three, the Command list's Skills, Blasts and Ultimates) share one smaller slate style with a
    dot in the group's colour.
- **Section headers in colour again:** the section's colour as a faded top edge and tint (no dot), and the whole
  header opens and closes the section (More / Less only shows which way). Sub-groups and cards dropped their dots.
- **One line parts the fighter column from the stats** on a desktop, from the top of the stats to the bottom of the
  last section; the pinned controls lost their grey edge.
- **The stats sit flush against that line**, so it reads as their shared edge.
- **The Command list is two sections, Skills and Blasts** (the league's pick on 2026-10-13, over dropping its
  sub-headers): the ultimates sit under Blasts (they are blasts), Skills in the skills' cyan. Quick's rows list
  alternate blasts and ultimates too, marked under the name ("Alternate ultimate, with a costume"). Versus does
  the same everywhere (Side by side, Matchup, All stats): a Skills plate, then a Blasts plate where every alternate
  has its own row under its slot ("Alternate" under the badge; "None" for a side without one), so every option is
  compared. Combat limits moved to teal, apart from the skills' cyan.
- **Versus Quick is one layout for both lenses** (round 24, `VersusQuick` in `versus.jsx`): the Fighter page's Quick
  sections in its order (Toughness with both health bars, Resources, Skills, Blasts, Melee, Rush Chains, Ki blasts,
  Sparking!) and its rows, so switching lens keeps every section and row in place and only the numbers change. Side
  by side shows each fighter as they are; the Matchup the same rows as dealt to the other side (armor shields, the
  legend, "Goku deals / Janemba deals" over attacks, the other side's rush in red on the health bars, 5-hit taken as
  the other side's rush). Every row's bars fill by the roster's range of the plain stat in both lenses (the Matchup's
  bars relative to the larger value are gone). The right column is the Verdict in both (stats led, or attacks
  out-damaged in the Matchup), then Fighters like the left one or Breaking armor. Hit-by-hit and charge levels are
  in Full only. Side by side's old summary (`CompareSummary`) and the Matchup's Exchange were removed.
- **Smash and Charged ki blast show Lv.3 in Quick** (Fighter and Versus), as Rush Chains show full charge; every
  level stays in Full.
- **Alternates, ways to switch:** `design/concepts/alternates-r24.html` mocks five (arrows on the name, version
  marks, a menu, one Main / Costume switch per fighter, both versions listed) against the old button. **The league
  picked B, version marks**, with a small "Alt." tag beside a costume's move name (not a line under it), so the
  marks never move; built into Versus's Blasts (`blastName` in `compare.jsx`). Second pass: "Alt." is small grey
  text on the marks' line, on its outer side (left for the left fighter, right for the right), so neither the
  name nor the marks move; a move with another version has a clickable name (no underline; it turns orange on
  hover) that switches to the next one, besides the marks.
- **Versus loadouts' capsule actions:** "Same as Goku's" (shown when the other side has capsules) sits under Edit
  capsules and Clear, in a faded version of the other side's colour (you take their capsules); the "Or" line and
  its "No capsules" (the same as Clear) are gone.
- **Opening the capsule picker keeps the page's place.** The Fighter page's column is 400px whether it holds the
  fighter or the docked picker (it was 350 or 390 against the picker's 410), and the button that opens or closes
  the picker lets go of focus first: it is swapped out with the column's content, and a focused element that
  disappears made the browser scroll to the top (a real mouse click, not a scripted one; `letGo` in `main.jsx`).
  The docked picker (Fighter page and Versus rails) also stops 24px short of the window's bottom, the space under
  the page's last section, so at the very bottom of the page it is no longer pushed up under the tabs.
- **The Verdict** has one line per fighter, the name in the side's colour ("Android 18 deals more on 3 of 8
  attacks").
- **Versus Blasts switch alternates in place** (replacing a row per alternate): one row per slot, and a side with
  a costume's alternate gets an "Alternate ⇄" / "Main ⇄" button under its move, so either side's alternate can be
  compared with the other's main move. The choice holds across Side by side, Matchup and Full (`AltPick` in
  `compare.jsx`).
- **Traits** no longer list "Cannot charge ki" (or the other game abilities a trait chip already says) twice.
- **Heavy Finish** left Versus's Melee (All stats and the Matchup), as it left the Fighter page's: it is a Rush
  Chain, shown under Rush Chains.
- **The Characters preview's Open button** wraps a long name inside its slanted ends.
- **League builds:** the Fighter page shows the top 6 (the data keeps 6), the Versus rails the top 3.
- **One page width** (1,720px) for all three views, so the frame no longer jumps between tabs (Versus needed it for
  its two rails); the Fighter page's column is 390px from 1,500px up.
- **Versus:** the loadouts have no left edge and slightly darker orange and blue title bars; Side by side /
  Matchup and Quick / Full sit on a plate right on top of the stats (they change only the stats); in Full, Skills
  and Blasts come right after Resources, above Combat limits and Sparking!.
- **Versus rails scroll with the page** (one scroll bar); only a docked capsule picker keeps its own scroll. The
  rails run 500 to 1,030px; the stats between them 830 to 1,150px in Quick and 1,640 to 1,880px in Full.
- **The view tabs' bar** fades from orange over the same length as the Versus header's left side.
- **Capsule rows** lost their coloured left edge; the coloured type name says the category.
- **A ki blast card's Ki cost** spans two of the card's columns, so "0.135 bars" stays on one line.
- **Versus rails** follow the fighter column's order: skills and Sparking, Conditions, Capsules, League builds.
- **Capsules' Edit and Clear** sit on the right under the list, in a neutral slate outline.
- **Versus rails** are led by their title ("Goku's loadout"): the largest header there, with the side's orange or
  blue as its top edge and tint.
- **Matchup, Quick** is laid out like Side by side's Quick: plates for Health (both bars mirrored, one rush 5-hit
  from the other side in red), Melee, Ki blasts, the Command list and Sparking!, with Breaking armor beside them.
  Each row is what one side deals | the attack | what the other deals, with bars sized to the larger of the two
  (the bigger hitter's lit; blasts and the ultimate have no bars, and the Command list is Side by side's mirrored
  rows with each move's name). A multi-shot attack compares by its total (Janemba's charged ki blast fires 3).
  Shields, the armor legend (both sides' armor now) and the old → new tints are kept.

**Fourth pass:**
- **Group headers:** the fighter column's groups (Forms, Active, Conditions, Capsules, League builds), the Versus
  rails' groups and the capsule picker's groups (Equipped, Rules, Not in the stats, Add capsules) sit under clear
  header bars: a slate top edge and tint, the name large. Conditions has no box of its own any more.
- **Clear:** capsules have a Clear button (the build's header and the picker's Equipped).
- **Done:** the picker's Done is filled orange, and pinned at the top of the docked picker while its list scrolls.

**The Characters tab.** A click selects a fighter instead of opening it. Hovering the grid still previews another
fighter, and leaving the grid goes back to the selected one, so the preview's Open, Compare with and Opponent for
buttons act on the fighter you clicked. A second click or a double-click opens it. The preview's forms are buttons
that switch to that form.

## Signed off, then the live calculator's four gaps (2026-10-13)

The league signed off the demo as it stood after round 24 (the Fighter page, Versus, the docked picker, the
alternates' version marks). A side-by-side check against the live calculator (dev-branch) found four things the
demo didn't do, added here for the league's sign-off:
- **Skill damage.** 158 of 482 skills deal damage (Wild Sense and its counters, Explosive Wave and the other
  explosions, barriers, binds, pushes). The Fighter page's Skills show it in the Damage column (Quick; a
  damaging skill's duration, if any, moves to a tile) and as the card's big number with its base (Full); Versus
  shows it on each skill's row, with the cost small beside the name. It scales on the skill channel (High-Tension,
  Saiyan Burst, Ancient Soul raise it), from Capsule Corp's value rounded up (`skillDamage` in `model.js`). In the
  Matchup it stays **before the other side's defenses**, and the Skills header says so: which defense the game
  uses for a skill is not measured yet (the old calculator used melee defense, unchecked).
- **Sparking charge speed and duration.** Each character's change against the usual (`sparkCharge`, the class's
  gauge charge speed: Ultra Instinct +20%, the Vegetas −10%; `sparkDuration`: most Super Saiyans −10%, Vegito
  −15%), with capsules (Sparking! Plus +15% duration). They lead the Sparking! section (Quick and Full, with roster
  bars; "Normal" when unchanged) and Versus's Sparking rows. To keep Quick at five tiles, Burst Melee Attack and
  Burst Rush (the same for everyone) moved to Full.
- **Copy link.** At the right of the view tabs (a phone: a Share tab, the phone's share sheet when it has one).
  The link carries the whole page as the hash already did. Old share links still don't open here: that is the URL
  scheme step of the rebuild.
- **Swap.** Under the VS mark (a phone: between the Change buttons): the two fighters change sides with their
  builds and conditions.

## Checked

Desktop (1280px), tablet (820px: the Sheet puts the build beside the figure, Vs opponent stacks health above the
exchange) and phone (390px). The numbers match the concept's (Vs Janemba 1,812 / 2,306, round 21's conditions
2,769 → 2,566). Adding capsules, league builds, skill stages and keyboard breakdowns were clicked through headlessly.

## Open

- Blast damage scales hit by hit, each hit rounded up, as measured on 2026-10-12. All eight blasts tested with
  Blast Burst match (Kamehameha 7,485, Energy Blast Barrage 7,880, Drain Life Cell 9,213, ...). 83 of 743 blasts
  have no hit split yet and scale as one hit.
- Burst Melee Attack and Burst Rush are shown as 1,250 and 450 for everyone (the data has no per-character availability).
- Which defense a skill's damage is taken on (an in-game test: Explosive Wave on fighters whose melee and ki-blast
  defenses differ). Until then the Matchup shows skill damage before defenses.
