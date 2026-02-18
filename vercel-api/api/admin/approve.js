// Approve a submission: mark as ready for review (remove draft), merge, and delete branch
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

  const { prNumber, branch } = body;
  
  if (!prNumber || !branch) {
    return res.status(400).json({ error: 'prNumber and branch are required' });
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
    
    // 1. Check if PR is still draft, if so mark as ready
    const prResp = await gh(`/repos/${owner}/${repo}/pulls/${prNumber}`, { method: 'GET' }, botToken);
    if (!prResp.ok) {
      return res.status(404).json({ error: 'Pull request not found' });
    }
    const prData = await prResp.json();

    if (prData.draft) {
      // Mark as ready for review
      const readyResp = await gh(`/repos/${owner}/${repo}/pulls/${prNumber}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft: false })
      }, botToken);

      if (!readyResp.ok) {
        return res.status(500).json({ error: 'Failed to mark PR as ready' });
      }
    }

    // 2. Add approval comment
    const commentResp = await gh(`/repos/${owner}/${repo}/issues/${prNumber}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        body: `✅ Approved by @${username} via admin dashboard` 
      })
    }, botToken);

    if (!commentResp.ok) {
      console.warn('Failed to add approval comment');
    }

    // 3. Merge the PR
    const mergeResp = await gh(`/repos/${owner}/${repo}/pulls/${prNumber}/merge`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commit_title: `Merge PR #${prNumber}: ${prData.title}`,
        commit_message: `Approved and merged by @${username}`,
        merge_method: 'squash'
      })
    }, botToken);

    if (!mergeResp.ok) {
      const errorData = await mergeResp.json();
      return res.status(500).json({ 
        error: 'Failed to merge PR', 
        details: errorData.message 
      });
    }

    const mergeData = await mergeResp.json();

    // 4. Delete the branch
    const deleteResp = await gh(`/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`, {
      method: 'DELETE'
    }, botToken);

    if (!deleteResp.ok) {
      console.warn(`Failed to delete branch ${branch}: ${deleteResp.status}`);
      // Don't fail the request if branch deletion fails
    }

    res.status(200).json({ 
      success: true, 
      message: 'Submission approved and merged',
      sha: mergeData.sha,
      merged: mergeData.merged
    });

  } catch (error) {
    console.error('Approve submission error:', error);
    res.status(500).json({ error: 'Failed to approve submission' });
  }
}
