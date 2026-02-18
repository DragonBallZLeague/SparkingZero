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

    // Check if user has push access to the repository
    const permResp = await gh(`/repos/${owner}/${repo}/collaborators/${username}/permission`, { method: 'GET' }, token);
    
    if (!permResp.ok) {
      // If we can't check permissions, try to verify they're at least a collaborator
      const collabResp = await gh(`/repos/${owner}/${repo}/collaborators/${username}`, { method: 'GET' }, token);
      
      if (collabResp.ok) {
        // User is a collaborator, allow access
        return res.status(200).json({
          authorized: true,
          user: {
            username: userData.login,
            name: userData.name,
            avatarUrl: userData.avatar_url
          }
        });
      }
      
      return res.status(403).json({ 
        error: 'Not a contributor to this repository', 
        authorized: false 
      });
    }
    
    const permData = await permResp.json();
    const permission = permData.permission;
    
    // Check if user has push, maintain, or admin access
    const hasAccess = ['push', 'maintain', 'admin'].includes(permission);
    
    if (!hasAccess) {
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
        permission: permission
      }
    });

  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authentication failed', authorized: false });
  }
}
