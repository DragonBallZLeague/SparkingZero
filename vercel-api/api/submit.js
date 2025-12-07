// Submit upload: create branch, add files, open PR
// Env: GITHUB_TOKEN (repo scope), OWNER (default DragonBallZLeague), REPO (default SparkingZero), BASE_BRANCH (default dev-branch)

function slug(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9-_]+/g, '-').replace(/^-+|-+$/g, '') || 'user';
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function bad(res, msg, code = 400) {
  res.status(code).json({ error: msg });
}

// Validate individual JSON file
function validateJsonFile(filename, base64Content) {
  const errors = [];
  
  // Check filename
  if (!filename.endsWith('.json')) {
    errors.push(`${filename}: Must be a .json file`);
    return errors;
  }
  
  if (filename.length > 255) {
    errors.push(`${filename}: Filename too long (max 255 chars)`);
  }
  
  // Decode base64 to buffer
  let buffer;
  try {
    buffer = Buffer.from(base64Content, 'base64');
  } catch {
    errors.push(`${filename}: Invalid base64 encoding`);
    return errors;
  }
  
  // Detect and decode encoding
  let content;
  
  // Check for UTF-16 LE BOM (FF FE)
  if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
    try {
      content = buffer.toString('utf16le');
    } catch {
      errors.push(`${filename}: Failed to decode UTF-16 LE`);
      return errors;
    }
  }
  // Check for UTF-8 BOM (EF BB BF)
  else if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    try {
      content = buffer.toString('utf8');
    } catch {
      errors.push(`${filename}: Failed to decode UTF-8`);
      return errors;
    }
  }
  // Standard UTF-8
  else {
    try {
      content = buffer.toString('utf8');
    } catch {
      errors.push(`${filename}: Failed to decode as UTF-8`);
      return errors;
    }
  }
  
  // Remove BOM if present
  content = content.replace(/^\uFEFF/, '');
  
  // Validate JSON syntax
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    errors.push(`${filename}: Invalid JSON - ${e.message}`);
    return errors;
  }
  
  // Check if it's an object (battle result schema)
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    errors.push(`${filename}: Must be a JSON object, not ${Array.isArray(parsed) ? 'array' : typeof parsed}`);
    return errors;
  }
  
  // Check for required BR fields (basic validation)
  // Support both standard schema and TeamBattleResults wrapper
  let hasValidStructure = false;
  
  // Check for standard BR fields
  const standardFields = ['battleInfo', 'matchups', 'characterRecord', 'mapRecord'];
  if (standardFields.some(field => field in parsed)) {
    hasValidStructure = true;
  }
  
  // Check for TeamBattleResults wrapper structure
  if ('TeamBattleResults' in parsed && parsed.TeamBattleResults.battleResult) {
    hasValidStructure = true;
  }
  
  if (!hasValidStructure) {
    errors.push(`${filename}: Missing expected battle result fields or structure`);
  }
  
  return errors;
}

// Validate all files in submission
function validateSubmission(files) {
  const errors = [];
  const warnings = [];
  
  if (!Array.isArray(files) || files.length === 0) {
    errors.push('No files provided');
    return { errors, warnings };
  }
  
  if (files.length > 20) {
    errors.push('Maximum 20 files per submission');
  }
  
  const fileNames = new Set();
  for (const f of files) {
    if (!f.name || !f.content) {
      errors.push('Each file must have name and content');
      continue;
    }
    
    // Check for duplicates
    if (fileNames.has(f.name)) {
      errors.push(`Duplicate filename: ${f.name}`);
    }
    fileNames.add(f.name);
    
    // Check file size
    const sizeKb = (f.size || 0) / 1024;
    if (sizeKb > 10000) {
      errors.push(`${f.name}: File too large (${sizeKb.toFixed(2)} KB, max 10 MB)`);
    }
    
    // Validate JSON
    const fileErrors = validateJsonFile(f.name, f.content);
    errors.push(...fileErrors);
    
    // Warn if filename doesn't match expected pattern
    if (!f.name.match(/^[A-Za-z0-9_\-]+\.json$/)) {
      warnings.push(`${f.name}: Filename contains special characters (not A-Z, 0-9, _, -)`);
    }
  }
  
  return { errors, warnings };
}

async function gh(path, options, token) {
  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'User-Agent': 'SparkingZero-Uploader',
    ...(options.headers || {})
  };
  const resp = await fetch(`https://api.github.com${path}`, { ...options, headers });
  return resp;
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== 'POST') return bad(res, 'Method not allowed', 405);
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.OWNER || 'DragonBallZLeague';
  const repo = process.env.REPO || 'SparkingZero';
  const baseBranch = process.env.BASE_BRANCH || 'dev-branch';
  if (!token) return bad(res, 'Missing GITHUB_TOKEN', 500);

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body || '{}'); } catch { body = {}; }
  } else if (Buffer.isBuffer(body)) {
    try { body = JSON.parse(body.toString() || '{}'); } catch { body = {}; }
  }
  const { name, comments = '', targetPath, files } = body || {};
  if (!name || !targetPath || !Array.isArray(files) || files.length === 0) return bad(res, 'name, targetPath, files are required');
  if (name.length > 80) return bad(res, 'name too long');
  
  // Validate all files
  const { errors, warnings } = validateSubmission(files);
  if (errors.length > 0) {
    return bad(res, `Validation failed: ${errors.join('; ')}`, 400);
  }
  if (warnings.length > 0) {
    console.warn('Upload warnings:', warnings);
  }
  if (comments.length > 500) return bad(res, 'comments too long');
  if (files.length > 10) return bad(res, 'too many files');

  for (const f of files) {
    if (!f.name || !f.content) return bad(res, 'invalid file payload');
    if (!f.name.toLowerCase().endsWith('.json')) return bad(res, 'only .json allowed');
    if (f.content.length > 8_000_000) return bad(res, `${f.name} too large`);
  }

  const branch = `submission/${slug(name)}-${Date.now()}`;
  const prTitle = `Submission from ${name} (${files.length} file${files.length>1?'s':''})`;
  const prBody = `Automated submission via analyzer UI.\n\nSubmitter: ${name}\nComments: ${comments || 'n/a'}\nTarget path: ${targetPath}\nFiles:\n${files.map(f=>`- ${f.name}`).join('\n')}`;

  try {
    // get base sha
    const refResp = await gh(`/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(baseBranch)}`, { method: 'GET' }, token);
    if (!refResp.ok) return bad(res, `Failed base branch: ${refResp.status}`, 500);
    const refData = await refResp.json();
    const baseSha = refData.object.sha;

    // create branch
    const branchResp = await gh(`/repos/${owner}/${repo}/git/refs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseSha })
    }, token);
    if (!branchResp.ok) return bad(res, `Failed branch create: ${branchResp.status}`, 500);

    // upload files
    for (const f of files) {
      const path = `apps/analyzer/BR_Data/${targetPath}/${f.name}`;
      const putResp = await gh(`/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `Add ${f.name} to ${targetPath}`, content: f.content, branch })
      }, token);
      if (!putResp.ok) {
        const text = await putResp.text();
        return bad(res, `Failed to upload ${f.name}: ${text}`, 500);
      }
    }

    // open PR
    const prResp = await gh(`/repos/${owner}/${repo}/pulls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: prTitle, head: branch, base: baseBranch, body: prBody, draft: true })
    }, token);
    if (!prResp.ok) return bad(res, `Failed to open PR: ${prResp.status}`, 500);
    const prData = await prResp.json();

    res.status(200).json({ id: branch, prUrl: prData.html_url });
  } catch (e) {
    res.status(500).json({ error: e.message || 'submit failed' });
  }
}
