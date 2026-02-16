// Centralized state management for the application
// All application state is stored in this object to make state changes trackable and debuggable

const AppState = {
    // Upload flow stage
    stage: STAGES.READY,
    
    // User inputs
    name: '',
    comments: '',
    
    // File management
    files: [],
    filesPreview: [],
    duplicateFiles: [],
    existingFiles: [],
    
    // Path/folder selection
    pathOptions: [],
    groupedPaths: {}, // Store grouped paths to avoid recalculation
    parentOptions: [],
    leafOptions: [],
    selectedParent: '',
    selectedLeaf: '',
    
    // Team data settings
    setTeamData: false,
    team1: 'Budokai',
    team2: '',
    teamWarning: '',
    
    // Submission results
    prUrl: '',
    submissionId: '',
    error: ''
};

/**
 * Update the application state with new values
 * @param {Object} updates - Object containing state properties to update
 */
function updateState(updates) {
    Object.assign(AppState, updates);
    console.log('[State] Updated:', updates);
}

/**
 * Reset the application state to initial values
 */
function resetState() {
    updateState({
        stage: STAGES.READY,
        name: '',
        comments: '',
        files: [],
        filesPreview: [],
        duplicateFiles: [],
        existingFiles: [],
        groupedPaths: {},
        setTeamData: false,
        team1: 'Budokai',
        team2: '',
        teamWarning: '',
        prUrl: '',
        submissionId: '',
        error: ''
    });
}
