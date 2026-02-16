// Configuration constants for the upload application
// This file contains all configuration values and constants used throughout the app

const CONFIG = {
    // API base URL - toggle between local and production
    // Local: 'http://localhost:3000'
    // Production: 'https://sparking-zero-iota.vercel.app'
    API_BASE_URL: 'http://localhost:3000',
    
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
    '',
    'Budokai',
    'Cinema',
    'Cold Kingdom',
    'Creations',
    'Demons',
    'Malevolent Souls',
    'Master and Student',
    'Primal Instincts',
    'Sentai',
    'Time Patrol',
    'Tiny Terrors',
    'Z-Fighters'
];

// Stage constants for upload flow
const STAGES = {
    READY: 'ready',
    UPLOADING: 'uploading',
    DONE: 'done',
    ERROR: 'error'
};
