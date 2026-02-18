// UI module
// Handles all DOM manipulation and UI state updates

/**
 * Show an error message to the user
 * @param {string} message - The error message to display
 */
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
    }
    console.error('[UI] Error:', message);
}

/**
 * Hide the error message
 */
function hideError() {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.classList.add('hidden');
    }
}

/**
 * Set the upload stage and update UI accordingly
 * @param {string} stage - The stage to set (STAGES.READY, UPLOADING, DONE, ERROR)
 */
function setStage(stage) {
    updateState({ stage });
    
    // Show/hide stage sections
    const readyStage = document.getElementById('readyStage');
    const uploadingStage = document.getElementById('uploadingStage');
    const doneStage = document.getElementById('doneStage');
    
    if (readyStage) readyStage.classList.toggle('hidden', stage !== STAGES.READY);
    if (uploadingStage) uploadingStage.classList.toggle('hidden', stage !== STAGES.UPLOADING);
    if (doneStage) doneStage.classList.toggle('hidden', stage !== STAGES.DONE);
    
    console.log('[UI] Stage set to:', stage);
}

/**
 * Update the path selection dropdowns
 */
function updatePathDropdowns() {
    const parentSelect = document.getElementById('parentSelect');
    const leafSelect = document.getElementById('leafSelect');
    
    if (parentSelect) {
        parentSelect.innerHTML = AppState.parentOptions
            .map(p => `<option value="${p}">${p}</option>`)
            .join('');
        // Set the selected value to match state
        parentSelect.value = AppState.selectedParent;
    }
    
    if (leafSelect) {
        leafSelect.innerHTML = AppState.leafOptions
            .map(opt => `<option value="${opt.value}">${opt.label}</option>`)
            .join('');
        leafSelect.disabled = AppState.leafOptions.length === 0;
        // Set the selected value to match state
        if (AppState.selectedLeaf) {
            leafSelect.value = AppState.selectedLeaf;
        }
    }
    
    console.log('[UI] Dropdowns updated - Parent:', AppState.selectedParent, 'Leaf:', AppState.selectedLeaf);
}

/**
 * Update the team data section visibility and content
 */
function updateTeamDataUI() {
    const teamSection = document.getElementById('teamDataControls');
    const teamWarningDiv = document.getElementById('teamWarning');
    
    if (teamSection) {
        teamSection.classList.toggle('hidden', !AppState.setTeamData);
    }
    
    if (teamWarningDiv) {
        if (AppState.teamWarning) {
            teamWarningDiv.textContent = '⚠️ ' + AppState.teamWarning;
            teamWarningDiv.classList.remove('hidden');
        } else {
            teamWarningDiv.classList.add('hidden');
        }
    }
}

/**
 * Update the files list display
 */
function updateFilesList() {
    const filesList = document.getElementById('filesList');
    const filesCount = document.getElementById('filesCount');
    const duplicateWarning = document.getElementById('duplicateWarning');
    
    if (filesCount) {
        filesCount.textContent = AppState.files.length > 0 
            ? `${AppState.files.length} file${AppState.files.length > 1 ? 's' : ''} selected`
            : 'No files selected';
    }
    
    // Show/hide duplicate warning banner
    if (duplicateWarning) {
        console.log('[UI] Duplicate warning check - duplicateFiles count:', AppState.duplicateFiles.length);
        if (AppState.duplicateFiles.length > 0) {
            const warningHTML = `<strong>⚠️ DUPLICATE FILES DETECTED</strong><br>
                The following ${AppState.duplicateFiles.length} file(s) already exist in "${AppState.selectedLeaf}" and cannot be uploaded:<br>
                <strong>${AppState.duplicateFiles.join(', ')}</strong><br>
                Please remove these files from your selection or rename them.`;
            duplicateWarning.innerHTML = warningHTML;
            duplicateWarning.classList.remove('hidden');
            console.log('[UI] ✓ Showing duplicate warning for:', AppState.duplicateFiles);
            console.log('[UI] Warning HTML:', warningHTML);
        } else {
            duplicateWarning.classList.add('hidden');
            console.log('[UI] ✓ No duplicates, hiding warning');
        }
    } else {
        console.error('[UI] ❌ duplicateWarning element not found in DOM!');
    }
    
    if (filesList) {
        if (AppState.files.length === 0) {
            filesList.innerHTML = '<div class="empty-state">No files selected</div>';
        } else {
            filesList.innerHTML = AppState.files
                .map((f, i) => {
                    const isDuplicate = AppState.duplicateFiles.includes(f.name);
                    const sizeKB = (f.size / 1024).toFixed(2);
                    return `<div class="file-item ${isDuplicate ? 'duplicate' : ''}">
                        <span class="file-name">${f.name}</span>
                        <span class="file-size">${sizeKB} KB</span>
                        ${isDuplicate ? '<span class="duplicate-badge">⚠ Already Exists</span>' : ''}
                    </div>`;
                })
                .join('');
        }
    }
}

/**
 * Update the files preview section
 */
function updateFilesPreview() {
    const previewSection = document.getElementById('filesPreview');
    
    if (!previewSection) return;
    
    if (AppState.filesPreview.length === 0) {
        previewSection.classList.add('hidden');
        return;
    }
    
    previewSection.classList.remove('hidden');
    const previewContent = document.getElementById('filesPreviewContent');
    
    if (previewContent) {
        previewContent.innerHTML = AppState.filesPreview
            .map(p => `<div class="preview-item">
                <div class="preview-name">${p.name}</div>
                ${p.error ? `<div class="preview-error">${p.error}</div>` : ''}
                ${p.hasExistingTeams ? `<div class="preview-current">Current: [${p.existingTeams.join(', ')}]</div>` : ''}
                ${p.willModify ? `<div class="preview-will-modify">Will set to: [${AppState.team1}${AppState.team2 ? ', ' + AppState.team2 : ''}]</div>` : ''}
                ${!p.willModify && !p.error ? '<div class="preview-no-change">No team data changes</div>' : ''}
            </div>`)
            .join('');
    }
}

/**
 * Update the success message with PR link
 */
function updateSuccessMessage() {
    const prLink = document.getElementById('prLink');
    if (prLink && AppState.prUrl) {
        prLink.href = AppState.prUrl;
        prLink.textContent = AppState.prUrl;
    }
}

/**
 * Clear the file input and reset related state
 */
function clearFiles() {
    updateState({ 
        files: [], 
        filesPreview: [], 
        duplicateFiles: [] 
    });
    
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.value = '';
    }
    
    updateFilesList();
    updateFilesPreview();
}

/**
 * Sync form inputs with current state
 */
function syncFormInputs() {
    // Name input
    const nameInput = document.getElementById('nameInput');
    if (nameInput && AppState.name !== undefined) {
        nameInput.value = AppState.name;
    }
    
    // Comments input
    const commentsInput = document.getElementById('commentsInput');
    if (commentsInput && AppState.comments !== undefined) {
        commentsInput.value = AppState.comments;
    }
    
    // Team data checkbox
    const setTeamDataCheckbox = document.getElementById('setTeamData');
    if (setTeamDataCheckbox) {
        setTeamDataCheckbox.checked = AppState.setTeamData;
    }
    
    // Team selections
    const team1Select = document.getElementById('team1Select');
    if (team1Select && AppState.team1) {
        team1Select.value = AppState.team1;
    }
    
    const team2Select = document.getElementById('team2Select');
    if (team2Select && AppState.team2 !== undefined) {
        team2Select.value = AppState.team2;
    }
    
    console.log('[UI] Form inputs synced with state');
}

/**
 * Master UI update function - updates all UI elements based on current state
 */
function updateUI() {
    syncFormInputs();
    updatePathDropdowns();
    updateTeamDataUI();
    updateFilesList();
    updateFilesPreview();
    updateSuccessMessage();
}
