// Vercel serverless function: /api/info
// Combined endpoint: ?action=paths (list BR_Data folders) or ?action=status (submission status)

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

  const action = req.query.action;

  // --- STATUS ---
  if (action === 'status') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id required' });
    res.status(200).json({ id, status: 'pending' });
    return;
  }

  // --- PATHS (default) ---
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
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

  async function listDir(path) {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
    const r = await fetch(url, { headers });
    if (!r.ok) throw new Error(`Failed to list ${path}: ${r.status}`);
    return r.json();
  }

  try {
    const level1 = await listDir(rootPath);
    const options = [];
    for (const item of level1) {
      if (item.type !== 'dir') continue;
      
      options.push({ label: item.name, value: item.name });
      
      try {
        const childrenResp = await listDir(item.path);
        const children = childrenResp
          .filter(c => c.type === 'dir')
          .map(c => ({ label: `${item.name} / ${c.name}`, value: `${item.name}/${c.name}` }));
        if (children.length > 0) {
          options.push(...children);
        }
      } catch (err) {
        console.warn(`Could not list children of ${item.path}:`, err.message);
      }
    }
    res.status(200).json({ options });
  } catch (e) {
    res.status(500).json({ error: e.message || 'failed' });
  }
}
