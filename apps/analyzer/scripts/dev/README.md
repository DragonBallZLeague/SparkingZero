# Dev tools: seeing what the analyzer looks like

Headless-browser tools for checking visual work. They are not part of any build and need no dependencies beyond Node 22 and an installed Edge or Chrome (`browser.mjs` finds it; set `BROWSER_PATH` to use another).

| Tool | What it does | When to use it |
|------|--------------|----------------|
| `shot.mjs` | Screenshots a served page at a given width, optionally after opening the build picker, switching to Bars, hovering a tooltip or scrolling to a section. | Every layout or styling change: check desktop (1280) and phone (390). |
| `css-diff.mjs` | Compares every element's computed style between two builds, view by view, and groups the changes by cause. | Before merging any sweeping style change: a theme value, a shared class, the CSS layering. |

Each file's header has the full usage. The short version, from `apps/analyzer`:

```bash
# Screenshots need a real build served with the Pages 404 rule (from the repo root):
#   npm run build:analyzer && node scripts/build-404.js && node scripts/serve-dist.js
npm run shot -- http://localhost:8080/SparkingZero/analyzer/characters/android-13 390 ../../dist/dev/phone.png
npm run shot -- http://localhost:8080/SparkingZero/analyzer/characters/android-13 1280 ../../dist/dev/tip.png hover:Defense

# Style diff: build both sides into their own folders, then compare.
npx vite build --outDir ../../dist/dev/before --emptyOutDir   # on the old commit
npx vite build --outDir ../../dist/dev/after --emptyOutDir    # on the new one
MSYS_NO_PATHCONV=1 npm run css-diff -- ../../dist/dev/before ../../dist/dev/after ../../dist/dev/diff.json
```

Put output under `dist/dev/` as above: `dist/` is git-ignored, and the tools create missing folders. A deploy build rebuilds `dist/`, so move anything worth keeping.

Dark is the only theme the app shows, so check dark. Screenshots and the diff catch different things: the diff finds every small shift but cannot judge a layout, and a screenshot can mislead in its own ways. Full-page captures grow the viewport rather than use the browser's stitching mode, which mis-resolves `vw` units.
