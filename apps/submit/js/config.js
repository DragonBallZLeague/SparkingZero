// Configuration constants for the upload application
// This file contains all configuration values and constants used throughout the app

const CONFIG = {
    // API base URL - points to Vercel deployment
    API_BASE_URL: 'https://sparking-zero-iota.vercel.app',
    
    // File upload constraints
    MAX_FILES: 50,
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB in bytes
    ALLOWED_EXTENSIONS: ['.json'],
    
    // Validation settings
    MIN_NAME_LENGTH: 1,
    MAX_NAME_LENGTH: 80,
    MAX_COMMENTS_LENGTH: 500,
    MAX_FILENAME_LENGTH: 255
};

// List of available teams for selection
const TEAMS = [
    { value: '', label: '' },
    { value: 'Budokai', label: 'Budokai' },
    { value: 'Cinema', label: 'Cinema' },
    { value: 'Cold Kingdom', label: 'Cold Kingdom' },
    { value: 'Creations', label: 'Creations' },
    { value: 'Demons', label: 'Demons' },
    { value: 'Malevolent Souls', label: 'Malevolent Souls' },
    { value: 'Master and Student', label: 'Master & Student' },
    { value: 'Primal Instincts', label: 'Primal Instincts' },
    { value: 'Sentai', label: 'Sentai' },
    { value: 'Time Patrol', label: 'Time Patrol' },
    { value: 'Tiny Terrors', label: 'Tiny Terrors' },
    { value: 'Z-Fighters', label: 'Z-Fighters' }
];

// Stage constants for upload flow
const STAGES = {
    READY: 'ready',
    UPLOADING: 'uploading',
    DONE: 'done',
    ERROR: 'error'
};
