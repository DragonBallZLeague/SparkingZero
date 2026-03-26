# BR_Data Tagging and Filtering Implementation Plan

## Overview
This plan describes how to add robust, extensible tagging to Sparking Zero match files and enable tag-based filtering in the Analyzer app. The goal is to support strict, easily updatable tag fields for all matches, with auto-tagging for legacy data and future-proofing for new tag types.

---

## Tagging Approach

### 1. Tag Storage
- **Tags will be stored inside each match JSON file** under a top-level `tags` object.
- This object will contain key-value pairs for each tag type (e.g., team, season, matchType, difficulty, matchSize).
- Example:
  ```json
  "tags": {
    "team": "Budokai",
    "season": "OS0",
    "matchType": "Test",
    "difficulty": "Strong",
    "matchSize": "4v4"
  }
  ```
- The list of tag fields and allowed values will be defined in a central config (e.g., a JS/JSON file), making it easy to update.

### 2. Tag Types (Initial Set)
- **team**: Team name (from folder or file name)
- **season**: League season (from file name, e.g., OS0)
- **matchType**: Test, Season, Event (from folder structure)
- **difficulty**: Strong, Ultra (from cpuLevel in file content)
- **matchSize**: 1v1, 2v2, 3v3, 4v4, 5v5 (from number of characters per team)

---

## Auto-Tagging Script
- A Node.js script will scan all existing match files and:
  - Parse folder structure and file names to infer team, season, matchType.
  - Parse file content to determine difficulty (cpuLevel) and matchSize.
  - Insert or update the `tags` object in each file.
  - Use a central config for allowed tag fields/values.
- The script will be idempotent and safe to run multiple times.

---

## Analyzer App Changes

### 1. Data Loading
- Update the Analyzer to read the `tags` object from each match file.
- Ensure the app ignores unknown fields and remains backward compatible.

### 2. Filtering UI
- Add multi-select dropdowns for each tag type (team, season, matchType, difficulty, matchSize).
- Allow users to filter matches by any combination of tags.
- Tag options will be populated from the central config and/or discovered in loaded data.

### 3. Tag Config Management
- Store allowed tag fields and values in a central config file (e.g., `tagConfig.js` or `tagConfig.json`).
- Make it easy to add new tag types or values in the future.

---

## Submit App Changes (Future Step)
- Update the Submit app to require tags for new uploads.
- Provide dropdowns or selectors for each tag type, using the central config.
- Validate that all required tags are present before upload.

---

## Implementation Steps
1. **Draft and approve this plan.**
2. Create the central tag config file.
3. Write and test the auto-tagging script for legacy files.
4. Update Analyzer data loading to read tags.
5. Add tag-based filtering UI to Analyzer.
6. (Future) Update Submit app to require tags on upload.

---

## Notes
- All changes will be made to preserve backward compatibility and not break existing Analyzer functionality.
- The tag system will be extensible for future needs.
