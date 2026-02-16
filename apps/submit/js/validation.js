// Validation module
// Handles all form input validation and file checking

/**
 * Validate all form inputs before submission
 * @returns {Object} Validation result with valid flag and error message
 */
function validateFormInputs() {
    // Check name
    if (!AppState.name.trim()) {
        return { valid: false, error: 'Name/username is required' };
    }
    
    if (AppState.name.length > CONFIG.MAX_NAME_LENGTH) {
        return { valid: false, error: `Name too long (max ${CONFIG.MAX_NAME_LENGTH} characters)` };
    }
    
    // Check folder selection
    if (!AppState.selectedLeaf) {
        return { valid: false, error: 'Please choose a target folder' };
    }
    
    // Check files
    if (AppState.files.length === 0) {
        return { valid: false, error: 'Please attach at least one JSON file' };
    }
    
    if (AppState.files.length > CONFIG.MAX_FILES) {
        return { valid: false, error: `Too many files (max ${CONFIG.MAX_FILES})` };
    }
    
    // Check for duplicates
    if (AppState.duplicateFiles.length > 0) {
        return { 
            valid: false, 
            error: `DUPLICATE FILES: The following file(s) already exist in "${AppState.selectedLeaf}":\n\n${AppState.duplicateFiles.map(f => `• ${f}`).join('\n')}\n\nYou must remove these files from your selection or rename them before uploading.`
        };
    }
    
    // Check team data requirements
    if (AppState.setTeamData && !AppState.team1) {
        return { valid: false, error: 'Please select Team 1, or disable "Set Team Data"' };
    }
    
    // Check comments length
    if (AppState.comments.length > CONFIG.MAX_COMMENTS_LENGTH) {
        return { valid: false, error: `Comments too long (max ${CONFIG.MAX_COMMENTS_LENGTH} characters)` };
    }
    
    // Check individual file sizes
    for (const file of AppState.files) {
        if (file.size > CONFIG.MAX_FILE_SIZE) {
            return { 
                valid: false, 
                error: `${file.name} exceeds ${CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB limit` 
            };
        }
    }
    
    return { valid: true };
}

/**
 * Check for duplicate filenames against existing files in the folder
 * @returns {Array<string>} Array of duplicate filenames
 */
function checkDuplicates() {
    if (AppState.files.length === 0) {
        console.log('[Validation] No files selected, skipping duplicate check');
        return [];
    }
    
    if (AppState.existingFiles.length === 0) {
        console.warn('[Validation] ⚠️ No existing files loaded - returning no duplicates (folder may be empty or data not loaded yet)');
        return [];
    }
    
    console.log('[Validation] Checking for duplicates...');
    console.log('[Validation] Selected files:', AppState.files.map(f => f.name));
    console.log('[Validation] Existing files in folder:', AppState.existingFiles.map(f => f.name));
    
    // Create a map of lowercase names for case-insensitive comparison
    const existingMap = new Map(
        AppState.existingFiles.map(f => [f.name.toLowerCase(), f.name])
    );
    
    const duplicates = AppState.files
        .filter(f => existingMap.has(f.name.toLowerCase()))
        .map(f => f.name);
    
    if (duplicates.length > 0) {
        console.error('[Validation] ❌ DUPLICATE FILES DETECTED:', duplicates);
    } else {
        console.log('[Validation] ✓ No duplicates found');
    }
    
    return duplicates;
}

/**
 * Perform a final duplicate check by re-fetching existing files
 * This ensures we have the most up-to-date file list before submission
 * @returns {Promise<Array<string>>} Array of duplicate filenames
 */
async function performFinalDuplicateCheck() {
    if (!AppState.selectedLeaf) {
        return [];
    }
    
    console.log('[Validation] Performing final duplicate check before submission...');
    
    try {
        // Re-fetch existing files to ensure we have the latest list
        const data = await fetchExistingFiles(AppState.selectedLeaf);
        const currentExistingFiles = data.files || [];
        
        if (currentExistingFiles.length === 0) {
            console.log('[Validation] No existing files in target folder');
            return [];
        }
        
        // Create a map of lowercase names for case-insensitive comparison
        const existingMap = new Map(
            currentExistingFiles.map(f => [f.name.toLowerCase(), f.name])
        );
        
        const duplicates = AppState.files
            .filter(f => existingMap.has(f.name.toLowerCase()))
            .map(f => f.name);
        
        if (duplicates.length > 0) {
            console.error('[Validation] FINAL CHECK - DUPLICATES FOUND:', duplicates);
        } else {
            console.log('[Validation] Final check passed - no duplicates');
        }
        
        return duplicates;
    } catch (e) {
        console.error('[Validation] Error during final duplicate check:', e);
        // If we can't check, we should fail safe and block submission
        throw new Error('Could not verify if files already exist. Please try again.');
    }
}

/**
 * Filter file list to only include JSON files
 * @param {FileList} fileList - File list from input element
 * @returns {Array<File>} Array of JSON files only
 */
function filterJsonFiles(fileList) {
    if (!fileList) return [];
    return Array.from(fileList).filter(f => 
        f.name.toLowerCase().endsWith('.json')
    );
}

/**
 * Validate team selection and generate warnings
 * @returns {string} Warning message or empty string
 */
function validateTeamSelection() {
    if (!AppState.setTeamData) {
        return '';
    }
    
    if (!AppState.team1 || !AppState.team2) {
        return '';
    }
    
    if (AppState.team1 === AppState.team2) {
        return 'Warning: Team 1 and Team 2 are the same. This is allowed but may not be intended.';
    }
    
    return '';
}
