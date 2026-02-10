// List files in a specific BR_Data folder via GitHub Contents API
// Expects env: GITHUB_TOKEN, OWNER (default DragonBallZLeague), REPO (default SparkingZero)

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { path } = req.query;
  if (!path) {
    res.status(400).json({ error: 'Missing path parameter' });
    return;
  }

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.OWNER || 'DragonBallZLeague';
  const repo = process.env.REPO || 'SparkingZero';
  const branch = process.env.BRANCH || 'dev-branch';
  const rootPath = 'apps/analyzer/BR_Data';

  if (!token) {
    res.status(500).json({ error: 'Missing GITHUB_TOKEN' });
    return;
  }

  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'User-Agent': 'SparkingZero-Uploader'
  };

  try {
    const fullPath = `${rootPath}/${path}`;
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${fullPath}?ref=${branch}`;
    const r = await fetch(url, { headers });
    
    if (!r.ok) {
      if (r.status === 404) {
        // Path doesn't exist yet, return empty array
        res.status(200).json({ files: [] });
        return;
      }
      throw new Error(`Failed to list ${fullPath}: ${r.status}`);
    }

    const contents = await r.json();
    
    // Filter to only files (not directories)
    const files = contents
      .filter(item => item.type === 'file')
      .map(item => ({
        name: item.name,
        size: item.size,
        sha: item.sha
      }));

    res.status(200).json({ files });
  } catch (e) {
    res.status(500).json({ error: e.message || 'failed' });
  }
}
