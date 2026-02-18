// Reject a submission: add comment with reason, close PR, and delete branch
// Uses GITHUB_TOKEN from environment (bot account with repo access)

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

async function gh(path, options, token) {
  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'User-Agent': 'SparkingZero-Admin',
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
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userToken = req.headers.authorization?.replace('Bearer ', '');
  const botToken = process.env.GITHUB_TOKEN;
  
  if (!userToken) {
    return res.status(401).json({ error: 'Authorization required' });
  }
  
  if (!botToken) {
    return res.status(500).json({ error: 'Server configuration error: GITHUB_TOKEN not set' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body || '{}'); } catch { body = {}; }
  }

  const { prNumber, reason, branch } = body;
  
  if (!prNumber || !reason || !branch) {
    return res.status(400).json({ error: 'prNumber, reason, and branch are required' });
  }

  const owner = process.env.OWNER || 'DragonBallZLeague';
  const repo = process.env.REPO || 'SparkingZero';

  try {
    // First verify the user has permission using their token
    const userResp = await gh('/user', { method: 'GET' }, userToken);
    if (!userResp.ok) {
      return res.status(401).json({ error: 'Invalid authorization token' });
    }
    const userData = await userResp.json();

    // Check user permissions by getting repo with their token
    const repoResp = await gh(`/repos/${owner}/${repo}`, { method: 'GET' }, userToken);
    if (!repoResp.ok) {
      return res.status(403).json({ error: 'Cannot access repository' });
    }
    
    const repoData = await repoResp.json();
    const userPermissions = repoData.permissions;
    
    if (!userPermissions || (!userPermissions.push && !userPermissions.admin && !userPermissions.maintain)) {
      return res.status(403).json({ error: 'Insufficient permissions. Push access required.' });
    }

    const username = userData.login;

    // Now use bot token for the actual operations
    
    // 1. Add rejection comment
    const commentBody = `❌ **Rejected by @${username}**\n\n**Reason:** ${reason}`;
    
    const commentResp = await gh(`/repos/${owner}/${repo}/issues/${prNumber}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: commentBody })
    }, botToken);

    if (!commentResp.ok) {
      return res.status(500).json({ error: 'Failed to add rejection comment' });
    }

    // 2. Close the PR
    const closeResp = await gh(`/repos/${owner}/${repo}/pulls/${prNumber}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: 'closed' })
    }, botToken);

    if (!closeResp.ok) {
      return res.status(500).json({ error: 'Failed to close PR' });
    }

    // 3. Delete the branch
    const deleteResp = await gh(`/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`, {
      method: 'DELETE'
    }, botToken);

    if (!deleteResp.ok) {
      console.warn(`Failed to delete branch ${branch}: ${deleteResp.status}`);
      // Don't fail the request if branch deletion fails
    }

    res.status(200).json({ 
      success: true, 
      message: 'Submission rejected and closed'
    });

  } catch (error) {
    console.error('Reject submission error:', error);
    res.status(500).json({ error: 'Failed to reject submission' });
  }
}
