// Validate JSON files before upload
// Returns detailed validation results for frontend to show users

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function validateJsonFile(filename, base64Content) {
  const result = {
    filename,
    valid: true,
    errors: [],
    warnings: [],
    stats: {}
  };

  // Check filename
  if (!filename.endsWith('.json')) {
    result.errors.push('Must be a .json file');
    result.valid = false;
    return result;
  }

  if (filename.length > 255) {
    result.errors.push('Filename too long (max 255 chars)');
    result.valid = false;
  }

  // Decode and parse JSON
  let content;
  try {
    content = Buffer.from(base64Content, 'base64').toString('utf8');
  } catch {
    result.errors.push('Invalid base64 encoding');
    result.valid = false;
    return result;
  }

  result.stats.sizeBytes = content.length;

  // Remove BOM if present
  const hadBOM = content.startsWith('\uFEFF');
  if (hadBOM) {
    result.warnings.push('File has UTF-8 BOM (will be removed)');
    content = content.slice(1);
  }

  // Validate JSON syntax
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    result.errors.push(`Invalid JSON: ${e.message}`);
    result.valid = false;
    return result;
  }

  // Check structure
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    result.errors.push(`Must be a JSON object, not ${Array.isArray(parsed) ? 'array' : typeof parsed}`);
    result.valid = false;
    return result;
  }

  // Check for common BR fields
  const brFields = ['battleInfo', 'matchups', 'team1', 'team2', 'winner'];
  const foundFields = brFields.filter(f => f in parsed);
  result.stats.detectedFields = foundFields;

  if (foundFields.length === 0) {
    result.warnings.push('No recognized battle result fields detected');
  }

  // Warn if filename doesn't match convention
  if (!filename.match(/^[A-Za-z0-9_\-]+\.json$/)) {
    result.warnings.push('Filename contains special characters (recommend: alphanumeric, dash, underscore only)');
  }

  return result;
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body || '{}');
    } catch {
      body = {};
    }
  } else if (Buffer.isBuffer(body)) {
    try {
      body = JSON.parse(body.toString() || '{}');
    } catch {
      body = {};
    }
  }

  const { files } = body || {};

  if (!Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: 'No files provided' });
  }

  if (files.length > 20) {
    return res.status(400).json({ error: 'Maximum 20 files per submission' });
  }

  const results = {
    totalFiles: files.length,
    validFiles: 0,
    invalidFiles: 0,
    fileResults: [],
    summary: ''
  };

  const fileNames = new Set();
  const allErrors = [];

  for (const f of files) {
    if (!f.name || !f.content) {
      allErrors.push('Each file must have name and content');
      continue;
    }

    // Check for duplicates
    if (fileNames.has(f.name)) {
      allErrors.push(`Duplicate filename: ${f.name}`);
    }
    fileNames.add(f.name);

    const fileResult = validateJsonFile(f.name, f.content);
    results.fileResults.push(fileResult);

    if (fileResult.valid) {
      results.validFiles++;
    } else {
      results.invalidFiles++;
    }
  }

  results.allErrors = allErrors;
  results.summary = `${results.validFiles}/${results.totalFiles} files valid`;

  if (results.invalidFiles > 0) {
    res.status(400).json(results);
  } else if (allErrors.length > 0) {
    res.status(400).json(results);
  } else {
    res.status(200).json(results);
  }
}
