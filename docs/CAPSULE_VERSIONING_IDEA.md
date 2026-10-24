# Idea: historical capsule versions (shelved)

**Status:** shelved on 2026-10-23. The league decided the upside (old matches and builds showing the capsule costs they were played under) does not yet justify the work. Kept here so it can be picked up later without re-deriving it.

## The problem

Every app reads one `referencedata/capsules.csv`, `capsule-types.json` and `capsule-rules.yaml`, which always hold the current costs and rules. When costs change (the October 2026 S1 update), every older match in the Analyzer is shown with the new costs: a Season 0 build that cost 20 can read as 17 or 23. The S0 data is kept for reference in `referencedata/archive/pre-2026-10-capsule-update/`, but nothing reads it.

## The design

### Storage

```
referencedata/
  capsules.csv, capsule-types.json, capsule-rules.yaml   <- the current version, edited as today
  capsule-versions.json                                  <- the list of versions
  capsule-versions/
    s0/  capsules.csv  capsule-types.json  capsule-rules.yaml  build-rules.yaml  README.md
```

```json
{
  "current": "s1",
  "versions": [
    { "id": "s0", "name": "Season 0", "from": "2025-10-27", "folder": "capsule-versions/s0" },
    { "id": "s1", "name": "Season 1", "from": "<S1 go-live date>" }
  ]
}
```

- The current version stays at the root, so the apps, the CMS and the deploy keep working unchanged.
- A new version means three steps: copy the root files into `capsule-versions/<old id>/`, edit the root, and add a line to the list.
- Frozen folders are never edited, except to correct an ID.
- **An ID means the same capsule in every version and is never reused** (a retired capsule gets a unique ID, as Sore Loser became `DBZL_Cap_SoreLoser`). The current S0 archive breaks this: it still has Sore Loser as `DBZL_Cap_30`, now Supreme Kai's Potara, so it needs that fix when it becomes `capsule-versions/s0/`.

### How each app picks a version

- **Analyzer (matches).** Match files carry no play date, and season tags cannot decide the version, since OS1 tests were played on both sides of the change. The rule would be:
  - a `tags.capsuleVersion` on the match wins (set by hand for exceptions);
  - otherwise, compare the date the file was first committed against each version's `from` date (`scripts/generate-recent-uploads.mjs` already reads those dates from git).

  Each match then uses its version's costs, build types and names. `extractStats` in `src/utils/statCalculations.js` takes the capsule map, so it would receive that version's map.
- **Match Builder.**
  - Exports gain `capsuleVersion: s1`, and a file without one counts as S0.
  - Building always uses the current version.
  - Importing an older file says which version it was built under and checks it against the current rules.
  - An optional version picker could rebuild an old match exactly.
- **Calculator.**
  - It defaults to the current version, and a `v=s0` value in the address could show old costs.
  - League builds taken from a season's lineups would use that season's version.
- **Website.** The build rules pages stay current, and the archives page links each season's frozen `build-rules.yaml`.

### Safeguards

- A shared `versionFor(match)` helper so every app decides the same way.
- A check script that runs with each build and fails if:
  - the dates in the list aren't in order, or a version folder is missing a file;
  - an ID means different capsules in two versions;
  - a match uses a capsule its version doesn't have.

## Open questions, if it is picked up

1. The S1 go-live date: tests uploaded before it count as S0.
2. Matches from before 2025-10-27, when the league's own costs started: do they get a "base game" version, or count as S0?
3. Scope: the Analyzer alone is about half the work; the Match Builder and Calculator could stay on the current version.
