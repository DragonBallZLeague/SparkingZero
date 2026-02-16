// API communication module
// All backend API calls are centralized here for easy maintenance and debugging

/**
 * Fetch available folder paths from the backend
 * @returns {Promise<Object>} Object containing folder options
 */
async function fetchPaths() {
    console.log('[API] Fetching paths...');
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/paths.js`);
    if (!res.ok) {
        throw new Error(`Failed to load folders: ${res.status}`);
    }
    const data = await res.json();
    console.log('[API] Paths loaded:', data.options?.length || 0, 'options');
    return data;
}

/**
 * Fetch existing files in a specific folder
 * @param {string} path - The folder path to check
 * @returns {Promise<Object>} Object containing list of existing files
 */
async function fetchExistingFiles(path) {
    if (!path) {
        return { files: [] };
    }
    console.log('[API] Fetching existing files for path:', path);
    try {
        const res = await fetch(
            `${CONFIG.API_BASE_URL}/api/list-files.js?path=${encodeURIComponent(path)}`
        );
        if (!res.ok) {
            console.warn('[API] Failed to fetch existing files:', res.status);
            return { files: [] };
        }
        const data = await res.json();
        console.log('[API] Existing files:', data.files?.length || 0);
        return data;
    } catch (e) {
        console.warn('[API] Error fetching existing files:', e);
        return { files: [] };
    }
}

/**
 * Validate file contents before submission
 * @param {Array} filesPayload - Array of file objects with name and content
 * @returns {Promise<Object>} Validation results
 */
async function validateFiles(filesPayload) {
    console.log('[API] Validating', filesPayload.length, 'files...');
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/validate.js`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: filesPayload })
    });
    
    if (!res.ok) {
        throw new Error(`Validation request failed: ${res.status}`);
    }
    
    const data = await res.json();
    console.log('[API] Validation result:', data);
    return data;
}

/**
 * Submit data to create a GitHub PR
 * @param {Object} payload - Submission payload with name, comments, targetPath, and files
 * @returns {Promise<Object>} Submission result with PR URL
 */
async function submitData(payload) {
    console.log('[API] Submitting data...');
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/submit.js`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    
    if (!res.ok) {
        // Parse JSON error response from backend
        try {
            const errorData = await res.json();
            throw new Error(errorData.error || 'Submission failed');
        } catch (e) {
            // If JSON parsing fails, fall back to text
            if (e.message) throw e; // Re-throw if it's our Error
            const text = await res.text();
            throw new Error(text || 'Submission failed');
        }
    }
    
    const data = await res.json();
    console.log('[API] Submission successful:', data);
    return data;
}
