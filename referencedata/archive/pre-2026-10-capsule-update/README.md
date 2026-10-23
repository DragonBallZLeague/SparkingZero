# Capsules and rulesets before the October 2026 capsule update

A frozen copy of the capsule data and build rules as they stood before the league's October 2026 capsule update (new league capsules, cost changes, per-team and Halo restrictions). Kept for the record only: **no app reads this folder**, and it is never synced or rebuilt. Edit the live files instead.

| File | Copied from |
|------|-------------|
| `capsules.csv` | `referencedata/capsules.csv` |
| `capsule-types.json` | `referencedata/capsule-types.json` |
| `capsule-rules.yaml` | `referencedata/capsule-rules.yaml` (the Standard, Standard - Soft and NEO Event rulesets) |
| `build-rules.yaml` | `apps/website/public/content/rules/build-rules.yaml` (the website's Build Rules page) |

These are the **Season 0** capsule costs: they match the "S0 Costs" column of the league's capsule-update sheet for all 89 standard capsules (set by the 20-point system on 2025-10-27, plus Water's Blessing 1→3 on 2026-04-20). The Season 1 costs replaced them in the live files.

Copied on 2026-10-21 from commit `4d8ac1c7` on `dev-branch`. At that point the league's custom capsules (`DBZL_Cap_*`) were banned in Standard and legal only in the NEO Event ruleset, and Sore Loser was still `DBZL_Cap_30`.
