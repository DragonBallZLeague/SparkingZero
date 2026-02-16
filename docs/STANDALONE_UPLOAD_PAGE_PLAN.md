# Standalone Upload Page Implementation Plan

## Overview
Create a separate standalone GitHub Pages site within this repository that provides the same data upload functionality as the analyzer app's upload panel.

## Current Architecture Analysis

### Existing Components
1. **Frontend (Analyzer App)**
   - `apps/analyzer/src/UploadPanel.jsx` - Full upload UI with validation, team data settings
   - `apps/analyzer/src/UploadWidgetLauncher.jsx` - Button launcher component
   - Uses React, Tailwind CSS

2. **Backend (Vercel API)**
   - `vercel-api/api/paths.js` - Lists BR_Data folder structure from GitHub
   - `vercel-api/api/validate.js` - Validates JSON file content and structure
   - `vercel-api/api/list-files.js` - Lists existing files in selected folder
   - `vercel-api/api/submit.js` - Creates branch, uploads files, opens PR
   - Deployed at: `https://sparking-zero-iota.vercel.app`

### Current Features
- Name/username input
- Two-level folder selection (Category → Folder)
- Team data modification capability (optional)
  - Team 1 and Team 2 selection from dropdown
  - Live preview of changes to files
  - Validation warnings
- Comments field
- Multiple JSON file upload
- Duplicate file detection
- File validation before submission
- Progress states (ready, uploading, done, error)
- Direct GitHub PR creation

## Proposed Solution

### Option A: Single-Page HTML Application (Recommended)
Create a self-contained HTML page with embedded CSS and JavaScript that can be:
- Deployed to GitHub Pages (`/upload` or `/data-upload`)
- Accessed independently from the analyzer app
- Maintains all current functionality

**Advantages:**
- Simple deployment (single file or minimal structure)
- No build process required
- Can use existing Vercel API endpoints
- Easy to maintain and update
- Works on any static hosting

**Structure:**
```
upload/
├── index.html           # Main upload page
├── styles.css           # Tailwind CDN or custom CSS
├── app.js               # Upload logic (vanilla JS or React CDN)
├── README.md            # Usage instructions
└── .nojekyll            # For GitHub Pages
```

### Option B: React SPA with Build Process
Create a separate React app similar to matchbuilder/analyzer structure.

**Advantages:**
- Code reusability from existing UploadPanel
- Modern development experience
- Component-based architecture

**Disadvantages:**
- Requires build process
- More complex deployment
- Duplicates some infrastructure

**Decision: Choose Option A** for simplicity and ease of maintenance.

## Implementation Plan

### Phase 1: Create Standalone Upload Page Structure
1. **Create `upload/` directory** in repository root
2. **Create `upload/index.html`** with:
   - Responsive layout
   - Similar styling to analyzer upload panel
   - All form fields and controls
3. **Add Tailwind CSS** via CDN or custom styles
4. **Create `upload/app.js`** with upload logic

### Phase 2: Port Upload Logic
1. **Extract core functionality from UploadPanel.jsx:**
   - File selection and filtering (.json only)
   - Folder/path selection UI
   - Team data modification logic
   - File preview generation
   - Duplicate detection
   - Form validation
   - API communication

2. **Implement API Integration:**
   - Configure API base URL (point to existing Vercel deployment)
   - Implement all API calls:
     - GET `/api/paths.js` - Load folder options
     - GET `/api/list-files.js?path=X` - Check for duplicates
     - POST `/api/validate.js` - Validate files
     - POST `/api/submit.js` - Submit data

3. **Handle CORS:**
   - Verify existing Vercel functions allow CORS (already implemented)
   - Test cross-origin requests

### Phase 3: Feature Parity
Ensure all features from analyzer upload panel work:

#### UI Elements
- ✅ Name/username input field
- ✅ Category dropdown (parent folder selection)
- ✅ Folder dropdown (child folder selection, filtered by category)
- ✅ "Set Team Data" checkbox
- ✅ Team 1 dropdown (when Set Team Data enabled)
- ✅ Team 2 dropdown (when Set Team Data enabled)
- ✅ Team validation warning (if teams are the same)
- ✅ Files preview panel (shows changes when team data enabled)
- ✅ Comments textarea (optional)
- ✅ JSON file upload input (multiple files)
- ✅ Submit button
- ✅ Clear/reset functionality

#### Validation & Safety
- ✅ Required field validation (name, folder, files)
- ✅ JSON-only file filtering
- ✅ File size limit (10MB per file)
- ✅ Maximum 50 files per submission
- ✅ Duplicate filename detection (case-insensitive)
- ✅ JSON structure validation
- ✅ Team data validation

#### User Feedback
- ✅ Loading/uploading state
- ✅ Success message with PR link
- ✅ Error messages
- ✅ Warning messages
- ✅ Progress indicators

### Phase 4: GitHub Pages Setup
1. **Configure GitHub Pages:**
   - Enable Pages in repository settings
   - Set source to `/upload` directory (or use GitHub Actions)
   - Configure custom path if needed

2. **Create deployment workflow** (optional):
   ```yaml
   # .github/workflows/deploy-upload-page.yml
   name: Deploy Upload Page
   on:
     push:
       branches: [main, dev-branch]
       paths:
         - 'upload/**'
   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - name: Deploy to GitHub Pages
           uses: peaceiris/actions-gh-pages@v3
           with:
             github_token: ${{ secrets.GITHUB_TOKEN }}
             publish_dir: ./upload
   ```

3. **Test deployment:**
   - Verify page loads at GitHub Pages URL
   - Test all functionality
   - Verify API calls work from deployed page

### Phase 5: Documentation & Polish
1. **Create `upload/README.md`:**
   - Purpose and usage instructions
   - Link to main analyzer app
   - Technical details
   - How to contribute

2. **Update root `README.md`:**
   - Add link to standalone upload page
   - Explain when to use each option

3. **Add navigation:**
   - Link from analyzer app to standalone page
   - Link from standalone page back to analyzer

4. **Polish UI:**
   - Match analyzer app styling
   - Add branding/logo
   - Improve mobile responsiveness
   - Add helpful tooltips

## Technical Specifications

### Technology Stack
- **HTML5** - Structure
- **CSS3** (Tailwind CSS via CDN) - Styling
- **Vanilla JavaScript (ES6+)** - Logic
- **Fetch API** - HTTP requests
- **FileReader API** - File processing

### Browser Compatibility
- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES6+ support required
- No IE11 support needed

### API Endpoint Configuration
```javascript
const API_BASE_URL = 'https://sparking-zero-iota.vercel.app';
// or configure via environment/config for different deployments
```

### File Structure (Recommended)
```
upload/
├── index.html           # Main page (~400-500 lines)
├── css/
│   └── styles.css       # Custom styles if needed
├── js/
│   ├── config.js        # API URL and constants
│   ├── api.js           # API communication functions
│   ├── validation.js    # File validation logic
│   ├── teamData.js      # Team data modification logic
│   └── app.js           # Main application logic
├── assets/
│   └── favicon.ico      # Optional branding
├── README.md            # Documentation
└── .nojekyll            # Tells GitHub Pages not to use Jekyll
```

### Alternative: Single-File Approach
For maximum simplicity, could create single `upload/index.html` with all CSS and JS embedded:
- Easier deployment
- One file to maintain
- Faster initial load (no additional requests)
- Harder to maintain long-term

**Recommendation:** Use multi-file structure for better organization, but keep files minimal.

## Security Considerations

### Already Handled by Existing Backend
- GitHub token never exposed to frontend ✓
- All GitHub API calls through Vercel serverless functions ✓
- CORS properly configured ✓
- Input validation on backend ✓
- File content validation ✓

### Frontend Best Practices
- Sanitize user inputs before display
- Validate file sizes before upload
- Use HTTPS for all requests
- Don't store sensitive data in localStorage
- Clear file data after successful upload

## Testing Plan

### Manual Testing
1. Test all form interactions
2. Test file selection (single and multiple)
3. Test team data modification
4. Test duplicate detection
5. Test validation errors
6. Test successful submission
7. Test different folder selections
8. Test on different browsers
9. Test on mobile devices
10. Test error scenarios (network failure, invalid files, etc.)

### Test Cases
| Test Case | Expected Behavior |
|-----------|------------------|
| Submit without name | Error: "Name/username is required" |
| Submit without files | Error: "Please attach at least one JSON file" |
| Submit non-JSON file | File filtered out automatically |
| Submit duplicate filename | Error listing duplicate files |
| Submit with team data enabled but no Team 1 | Error: "Please select Team 1..." |
| Submit valid data | Success, PR link displayed |
| Same team warning | Warning shown but submission allowed |
| Large file (>10MB) | Error during validation |
| Invalid JSON | Error during validation |
| Navigate category dropdown | Folder dropdown updates accordingly |

## Deployment Steps

### Initial Setup
1. Create `upload/` directory
2. Develop and test locally
3. Commit to repository
4. Enable GitHub Pages for repository
5. Configure to publish from `upload/` directory or via Actions
6. Test deployed page
7. Announce to users

### Future Updates
1. Make changes in `upload/` directory
2. Test locally
3. Commit and push
4. GitHub Pages auto-deploys (if configured)
5. Verify deployment

## Success Criteria
- [ ] Standalone page accessible via GitHub Pages URL
- [ ] All functionality from analyzer upload panel works
- [ ] No dependencies on analyzer app code
- [ ] Mobile-responsive design
- [ ] Clear error messages and user feedback
- [ ] Successfully creates PRs via existing API
- [ ] Documentation complete
- [ ] Tested on multiple browsers

## Future Enhancements
- Drag-and-drop file upload
- Batch submission history tracking
- Upload progress bar
- File preview before submission
- Dark mode toggle
- Remember last-used settings (localStorage)
- Upload analytics/statistics
- Multi-language support

## Timeline Estimate
- Phase 1: Create structure - 1-2 hours
- Phase 2: Port logic - 3-4 hours  
- Phase 3: Feature parity - 2-3 hours
- Phase 4: GitHub Pages setup - 1 hour
- Phase 5: Documentation - 1 hour
- Testing & refinement - 2-3 hours

**Total: 10-15 hours**

## Questions to Resolve
1. Preferred URL structure? (`/upload/`, `/data-upload/`, `/submit/`)
2. Should we create a nav header with links between apps?
3. Do we want custom branding/styling or match analyzer exactly?
4. Should we add any analytics tracking?
5. Do we need a standalone repo or keep in current monorepo?

## Next Steps
1. Get approval on plan
2. Choose implementation approach (single vs multi-file)
3. Create initial upload page structure
4. Begin Phase 1 implementation
