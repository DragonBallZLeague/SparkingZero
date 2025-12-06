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
