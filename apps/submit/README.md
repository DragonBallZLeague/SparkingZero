# Submit Data to Sparking Zero Database

This is a standalone upload page for submitting battle result data to the Sparking Zero League database.

## Deployment

This is a **static site** (no build process required) that is deployed to GitHub Pages at:
- **Production URL**: `https://DragonBallZLeague.github.io/SparkingZero/submit/`

The site is automatically deployed via GitHub Actions workflow (`.github/workflows/deploy.yml`) when changes are pushed to `main` or `dev-branch`.

## Purpose

This page allows players to submit their battle result JSON files directly to the GitHub repository via pull request, without needing to use the full analyzer application.

## How to Use

1. **Access**: This page is accessed via direct link only (not publicly advertised)
2. **Enter your name/username**: Identify yourself for the submission
3. **Select match area**: Choose the category and specific folder for your data
4. **Optional - Set Team Data**: If your files need team information added, enable this feature
5. **Upload JSON files**: Select one or more battle result JSON files
6. **Add comments** (optional): Provide context about your submission
7. **Submit**: Creates a pull request with your data

## Features

- ✅ Multi-file upload support (up to 50 files)
- ✅ Automatic JSON validation
- ✅ Duplicate filename detection
- ✅ Optional team data modification
- ✅ Dark mode interface
- ✅ Real-time feedback and error handling
- ✅ Direct GitHub PR creation

## Technical Details

- **Frontend**: Vanilla JavaScript (ES6+)
- **Styling**: Custom CSS with dark mode
- **Backend**: Vercel serverless functions
- **Deployment**: GitHub Pages

## File Structure

```
submit/
├── index.html          # Main page
├── css/
│   └── styles.css      # Dark mode styling
├── js/
│   ├── config.js       # Configuration constants
│   ├── state.js        # State management
│   ├── api.js          # API communication
│   ├── validation.js   # Input validation
│   ├── teamData.js     # Team data modification
│   ├── ui.js           # UI updates
│   └── app.js          # Main application logic
└── README.md           # This file
```

## API Endpoints

All API endpoints are hosted on Vercel:
- `GET /api/paths.js` - Get available folder options
- `GET /api/list-files.js?path=X` - List existing files in folder
- `POST /api/validate.js` - Validate JSON files
- `POST /api/submit.js` - Submit data and create PR

## Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)
- JavaScript enabled
- Valid battle result JSON files

## Support

For issues or questions, contact the league administrators.

## Related

- [Analyzer App](../apps/analyzer/) - Full featured data analysis tool
- [Match Builder](../apps/matchbuilder/) - Create custom matches
