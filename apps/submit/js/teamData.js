// Team data modification module
// Handles reading, modifying, and previewing team data in JSON files

/**
 * Convert a file to base64 encoding
 * @param {File} file - The file to convert
 * @returns {Promise<string>} Base64 encoded file content
 */
async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Read file as text
 * @param {File} file - The file to read
 * @returns {Promise<string>} File content as text
 */
async function fileToText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

/**
 * Modify a file's content to include team data
 * @param {File} file - The file to modify
 * @param {string} team1 - First team name
 * @param {string} team2 - Second team name (can be empty)
 * @returns {Promise<string>} Base64 encoded modified content
 */
async function modifyFileWithTeamData(file, team1, team2) {
    const text = await fileToText(file);
    const json = JSON.parse(text);
    
    // Set team data if the structure exists
    if (json.TeamBattleResults) {
        json.TeamBattleResults.teams = [team1, team2 || ''];
    }
    
    // Convert back to base64
    const modifiedJson = JSON.stringify(json, null, 2);
    return btoa(unescape(encodeURIComponent(modifiedJson)));
}

/**
 * Generate a preview of what changes will be made to a file
 * @param {File} file - The file to preview
 * @returns {Promise<Object>} Preview object with file info and changes
 */
async function generateFilePreview(file) {
    try {
        const text = await fileToText(file);
        const json = JSON.parse(text);
        const hasTeamData = json.TeamBattleResults?.teams;
        
        return {
            name: file.name,
            hasExistingTeams: !!hasTeamData,
            existingTeams: hasTeamData ? json.TeamBattleResults.teams : null,
            willModify: AppState.setTeamData && AppState.team1,
            error: null
        };
    } catch (e) {
        return {
            name: file.name,
            hasExistingTeams: false,
            existingTeams: null,
            willModify: false,
            error: 'Could not parse JSON'
        };
    }
}

/**
 * Generate previews for all selected files
 * @returns {Promise<Array>} Array of preview objects
 */
async function generateAllFilePreviews() {
    if (!AppState.setTeamData || AppState.files.length === 0) {
        return [];
    }
    
    console.log('[TeamData] Generating previews for', AppState.files.length, 'files');
    const previews = await Promise.all(
        AppState.files.map(file => generateFilePreview(file))
    );
    console.log('[TeamData] Previews generated');
    return previews;
}

/**
 * Build the files payload for submission, applying team data if needed
 * @returns {Promise<Array>} Array of file objects with name, content, and size
 */
async function buildFilesPayload() {
    const filesPayload = [];
    
    for (const file of AppState.files) {
        if (file.size > CONFIG.MAX_FILE_SIZE) {
            throw new Error(`${file.name} exceeds ${CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB limit`);
        }
        
        let content;
        if (AppState.setTeamData && AppState.team1) {
            // Modify the file to set team data
            try {
                content = await modifyFileWithTeamData(file, AppState.team1, AppState.team2);
            } catch (e) {
                throw new Error(`Failed to modify ${file.name}: ${e.message}`);
            }
        } else {
            // Use original file content
            content = await fileToBase64(file);
        }
        
        filesPayload.push({ 
            name: file.name, 
            content, 
            size: file.size 
        });
    }
    
    return filesPayload;
}
