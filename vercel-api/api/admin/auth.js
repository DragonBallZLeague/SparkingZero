// Admin auth endpoint - verify token and check contributor status
// Requires: token in request body

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body || '{}'); } catch { body = {}; }
  }

  const { token } = body;
  
  if (!token) {
    return res.status(400).json({ error: 'Token required' });
  }

  const owner = process.env.OWNER || 'DragonBallZLeague';
  const repo = process.env.REPO || 'SparkingZero';

  try {
    // Get authenticated user
    const userResp = await gh('/user', { method: 'GET' }, token);
    
    if (!userResp.ok) {
      return res.status(401).json({ error: 'Invalid token', authorized: false });
    }
    
    const userData = await userResp.json();
    const username = userData.login;

    // Check if user has access by trying to get repo details
    // This works for both public and private repos if the user has access
    const repoResp = await gh(`/repos/${owner}/${repo}`, { method: 'GET' }, token);
    
    if (!repoResp.ok) {
      return res.status(403).json({ 
        error: 'Cannot access repository. You may not have permissions.', 
        authorized: false 
      });
    }
    
    const repoData = await repoResp.json();
    
    // Check if user has push access by checking their permissions in the repo response
    const userPermissions = repoData.permissions;
    
    if (!userPermissions || (!userPermissions.push && !userPermissions.admin && !userPermissions.maintain)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions. Push access required.', 
        authorized: false 
      });
    }

    res.status(200).json({
      authorized: true,
      user: {
        username: userData.login,
        name: userData.name,
        avatarUrl: userData.avatar_url,
        permission: userPermissions.admin ? 'admin' : (userPermissions.maintain ? 'maintain' : 'push')
      }
    });

  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authentication failed', authorized: false });
  }
}
