# Sparking Zero Match Analyzer

This is a standalone React app for analyzing Sparking Zero match JSON files and exporting results to Excel.

## JSON File Management

### Automated Encoding Fix
The analyzer includes automated scripts to handle JSON file encoding issues:

```bash
# Fix encoding issues in all JSON files
npm run fix-json

# Watch BR_Data directory for new files and auto-fix them
npm run watch-br-data
```

### Common Issues Handled
- UTF-16 LE files with BOM (common from Windows exports)
- UTF-8 files with BOM characters
- Inconsistent JSON formatting

### Git Integration
A pre-commit hook automatically processes JSON files when they're added to the repository, ensuring all files are properly encoded.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Build output will be placed in `../../dist/analyzer` for GitHub Pages hosting.

## Submit Data

To submit battle result data to the league database, please use the dedicated **[Submit App](../submit/)**.

The analyzer app focuses on data analysis and visualization. Data submission is handled separately through the submit app, which provides a streamlined interface for uploading JSON files and creating pull requests.

For GitHub-based submissions:
- Submit via Pull Request: Open a PR adding your `.json` files under `apps/analyzer/BR_Data/...`
- Submit via Issue: Open a new Issue using "Submit BR Data" and attach your `.json` files

**Note:** A GitHub account is required to submit data.
