// Main application module
// Handles initialization, event handlers, and orchestrates the upload flow

/**
 * Process path options from the API into parent and leaf options
 * @param {Array} options - Array of path options from API
 */
function processPathOptions(options) {
    const grouped = {};
    
    // Group paths by parent folder
    for (const opt of options) {
        const parts = (opt.value || '').split('/');
        if (!parts[0]) continue;
        
        const parent = parts[0];
        const child = parts.slice(1).join('/');
        
        if (!grouped[parent]) {
            grouped[parent] = [];
        }
        
        if (child) {
            grouped[parent].push({ label: child, value: opt.value });
        }
    }
    
    const parents = Object.keys(grouped).sort();
    
    updateState({
        pathOptions: options,
        groupedPaths: grouped,
        parentOptions: parents
    });
    
    // Set initial selection
    if (parents.length > 0) {
        const initialParent = parents[0];
        const leaves = grouped[initialParent] || [];
        
        updateState({ 
            selectedParent: initialParent,
            leafOptions: leaves,
            selectedLeaf: leaves.length > 0 ? leaves[0].value : ''
        });
    }
    
    console.log('[App] Processed paths - Parents:', parents.length, 'Initial parent:', AppState.selectedParent);
}

/**
 * Update leaf options when parent changes
 */
function updateLeafOptions() {
    const leaves = AppState.groupedPaths[AppState.selectedParent] || [];
    
    updateState({ 
        leafOptions: leaves,
        selectedLeaf: leaves.length > 0 ? leaves[0].value : ''
    });
    
    console.log('[App] Updated leaf options for parent:', AppState.selectedParent, '- Found:', leaves.length, 'leaves');
    
    updatePathDropdowns();
}

/**
 * Handle file input change event
 * @param {Event} e - The change event
 */
async function handleFileChange(e) {
    const files = filterJsonFiles(e.target.files);
    updateState({ files });
    
    console.log('[App] ========== FILE CHANGE EVENT ==========');
    console.log('[App] Files selected:', files.length, files.map(f => f.name));
    console.log('[App] Current folder:', AppState.selectedLeaf);
    console.log('[App] Existing files already loaded:', AppState.existingFiles.length);
    
    // Ensure existing files are loaded before checking duplicates
    if (AppState.selectedLeaf && AppState.existingFiles.length === 0) {
        console.log('[App] ⚠️ Existing files not loaded yet, fetching...');
        try {
            const filesData = await fetchExistingFiles(AppState.selectedLeaf);
            updateState({ existingFiles: filesData.files || [] });
            console.log('[App] ✓ Loaded existing files:', AppState.existingFiles.length, 'files');
        } catch (e) {
            console.error('[App] ❌ Failed to fetch existing files:', e);
        }
    } else {
        console.log('[App] ✓ Existing files already loaded:', AppState.existingFiles.length, 'files');
    }
    
    // Generate preview if team data is enabled
    if (AppState.setTeamData && files.length > 0) {
        const previews = await generateAllFilePreviews();
        updateState({ filesPreview: previews });
    }
    
    // Check for duplicates
    console.log('[App] Checking for duplicates...');
    const duplicates = checkDuplicates();
    console.log('[App] Duplicates found:', duplicates.length, duplicates);
    updateState({ duplicateFiles: duplicates });
    
    console.log('[App] Updating UI...');
    updateUI();
    console.log('[App] ========== END FILE CHANGE ==========');
}

/**
 * Handle team data checkbox change
 * @param {Event} e - The change event
 */
async function handleTeamDataToggle(e) {
    updateState({ setTeamData: e.target.checked });
    
    if (e.target.checked && AppState.files.length > 0) {
        const previews = await generateAllFilePreviews();
        updateState({ filesPreview: previews });
    } else {
        updateState({ filesPreview: [] });
    }
    
    // Update team warning
    const warning = validateTeamSelection();
    updateState({ teamWarning: warning });
    
    updateUI();
}

/**
 * Handle team selection change
 */
async function handleTeamChange() {
    // Update team warning
    const warning = validateTeamSelection();
    updateState({ teamWarning: warning });
    
    // Regenerate preview if files are selected
    if (AppState.setTeamData && AppState.files.length > 0) {
        const previews = await generateAllFilePreviews();
        updateState({ filesPreview: previews });
    }
    
    updateUI();
}

/**
 * Handle form submission
 */
async function handleSubmit() {
    hideError();
    
    // Validate inputs
    const validation = validateFormInputs();
    if (!validation.valid) {
        showError(validation.error);
        return;
    }
    
    // Perform final duplicate check right before submission
    console.log('[Submit] Performing final duplicate check...');
    let finalDuplicates;
    try {
        finalDuplicates = await performFinalDuplicateCheck();
    } catch (e) {
        showError(e.message);
        return;
    }
    
    if (finalDuplicates.length > 0) {
        const fileList = finalDuplicates.map(f => `  • ${f}`).join('\n');
        const errorMsg = `⚠️ DUPLICATE FILES DETECTED\n\nThe following file(s) already exist in the folder "${AppState.selectedLeaf}":\n\n${fileList}\n\nYou must remove these files from your selection or rename them before uploading.`;
        showError(errorMsg);
        console.error('[Submit] Submission blocked due to duplicates:', finalDuplicates);
        return;
    }
    
    setStage(STAGES.UPLOADING);
    
    try {
        // Build files payload
        const filesPayload = await buildFilesPayload();
        
        // Validate files
        const validateResult = await validateFiles(filesPayload);
        
        if (validateResult.invalidFiles > 0) {
            const errors = validateResult.fileResults
                .filter(f => !f.valid)
                .map(f => `${f.filename}: ${f.errors.join(', ')}`)
                .join('; ');
            throw new Error(`Validation failed: ${errors}`);
        }
        
        // Show warnings if any
        if (validateResult.fileResults.some(f => f.warnings.length > 0)) {
            const warnings = validateResult.fileResults
                .filter(f => f.warnings.length > 0)
                .map(f => `${f.filename}: ${f.warnings.join(', ')}`)
                .join('\n');
            console.warn('[Submit] Upload warnings:', warnings);
        }
        
        // Submit
        const result = await submitData({
            name: AppState.name.trim(),
            comments: AppState.comments.trim(),
            targetPath: AppState.selectedLeaf,
            files: filesPayload
        });
        
        updateState({ 
            prUrl: result.prUrl,
            submissionId: result.id 
        });
        
        setStage(STAGES.DONE);
        updateUI();
    } catch (e) {
        updateState({ error: e.message });
        setStage(STAGES.READY);
        showError(e.message);
    }
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    // Prevent duplicate listener setup
    if (AppState.listenersSetup) {
        console.log('[App] Event listeners already set up, skipping');
        return;
    }
    
    console.log('[App] Setting up event listeners...');
    
    // Name input
    const nameInput = document.getElementById('nameInput');
    if (nameInput) {
        nameInput.addEventListener('input', (e) => {
            updateState({ name: e.target.value });
        });
    }
    
    // Comments input
    const commentsInput = document.getElementById('commentsInput');
    if (commentsInput) {
        commentsInput.addEventListener('input', (e) => {
            updateState({ comments: e.target.value });
        });
    }
    
    // Parent select
    const parentSelect = document.getElementById('parentSelect');
    if (parentSelect) {
        parentSelect.addEventListener('change', async (e) => {
            console.log('[App] Parent changed to:', e.target.value);
            updateState({ selectedParent: e.target.value });
            updateLeafOptions();
            
            // Fetch existing files for the newly selected leaf
            if (AppState.selectedLeaf) {
                console.log('[App] Fetching existing files for new leaf:', AppState.selectedLeaf);
                try {
                    const data = await fetchExistingFiles(AppState.selectedLeaf);
                    updateState({ existingFiles: data.files || [] });
                    
                    // Re-check duplicates if files are selected
                    if (AppState.files.length > 0) {
                        const duplicates = checkDuplicates();
                        updateState({ duplicateFiles: duplicates });
                    }
                    
                    updateUI();
                } catch (e) {
                    console.warn('[App] Failed to fetch existing files:', e);
                }
            }
        });
    }
    
    // Leaf select
    const leafSelect = document.getElementById('leafSelect');
    if (leafSelect) {
        leafSelect.addEventListener('change', async (e) => {
            console.log('[App] Leaf changed to:', e.target.value);
            updateState({ selectedLeaf: e.target.value });
            
            // Fetch existing files
            try {
                const data = await fetchExistingFiles(e.target.value);
                updateState({ existingFiles: data.files || [] });
                
                // Re-check duplicates if files are selected
                if (AppState.files.length > 0) {
                    const duplicates = checkDuplicates();
                    updateState({ duplicateFiles: duplicates });
                }
                
                updateUI();
            } catch (e) {
                console.warn('[App] Failed to fetch existing files:', e);
            }
        });
    }
    
    // Team data checkbox
    const setTeamDataCheckbox = document.getElementById('setTeamData');
    if (setTeamDataCheckbox) {
        setTeamDataCheckbox.addEventListener('change', handleTeamDataToggle);
    }
    
    // Team dropdowns
    const team1Select = document.getElementById('team1Select');
    if (team1Select) {
        team1Select.addEventListener('change', (e) => {
            updateState({ team1: e.target.value });
            handleTeamChange();
        });
    }
    
    const team2Select = document.getElementById('team2Select');
    if (team2Select) {
        team2Select.addEventListener('change', (e) => {
            updateState({ team2: e.target.value });
            handleTeamChange();
        });
    }
    
    // File input
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileChange);
    }
    
    // Clear files button
    const clearBtn = document.getElementById('clearFilesBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearFiles);
    }
    
    // Submit button
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.addEventListener('click', handleSubmit);
    }
    
    // New submission button (on success page)
    const newSubmissionBtn = document.getElementById('newSubmissionBtn');
    if (newSubmissionBtn) {
        newSubmissionBtn.addEventListener('click', () => {
            console.log('[App] Submit More Data clicked - preserving form state');
            // Reset only file-related state, keep user inputs and folder selections
            resetFilesOnly();
            setStage(STAGES.READY);
            clearFiles();
            // Don't call init() again - it would add duplicate listeners
            updateUI();
        });
    }
    
    // Mark listeners as set up
    updateState({ listenersSetup: true });
    console.log('[App] Event listeners setup complete');
}

/**
 * Initialize the application
 */
async function init() {
    console.log('[App] Initializing...');
    
    try {
        // Fetch paths
        const data = await fetchPaths();
        processPathOptions(data.options || []);
        
        // Fetch initial existing files
        if (AppState.selectedLeaf) {
            const filesData = await fetchExistingFiles(AppState.selectedLeaf);
            updateState({ existingFiles: filesData.files || [] });
        }
        
        // Setup event listeners
        setupEventListeners();
        
        // Initial UI update
        updateUI();
        
        console.log('[App] Initialization complete');
    } catch (e) {
        console.error('[App] Initialization failed:', e);
        showError('Failed to initialize: ' + e.message);
    }
}

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', init);
