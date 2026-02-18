// Mark a draft PR as ready for review using GitHub GraphQL API
// Uses user's OAuth token (requires 'repo' scope)

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

async function graphql(query, token) {
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'User-Agent': 'SparkingZero-Admin'
  };
  const resp = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers,
    body: JSON.stringify({ query })
  });
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
  
  if (!userToken) {
    return res.status(401).json({ error: 'Authorization required' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body || '{}'); } catch { body = {}; }
  }

  const { prNumber } = body;
  
  if (!prNumber) {
    return res.status(400).json({ error: 'prNumber is required' });
  }

  const owner = process.env.OWNER || 'DragonBallZLeague';
  const repo = process.env.REPO || 'SparkingZero';

  try {
    // First verify the user has permission
    const userResp = await gh('/user', { method: 'GET' }, userToken);
    if (!userResp.ok) {
      return res.status(401).json({ error: 'Invalid authorization token' });
    }
    const userData = await userResp.json();

    // Check user permissions
    const repoResp = await gh(`/repos/${owner}/${repo}`, { method: 'GET' }, userToken);
    if (!repoResp.ok) {
      return res.status(403).json({ error: 'Cannot access repository' });
    }
    
    const repoData = await repoResp.json();
    const userPermissions = repoData.permissions;
    
    if (!userPermissions || (!userPermissions.push && !userPermissions.admin && !userPermissions.maintain)) {
      return res.status(403).json({ error: 'Insufficient permissions. Push access required.' });
    }

    console.log(`User ${userData.login} attempting to mark PR #${prNumber} as ready`);

    // 1. Get PR details to obtain Node ID
    const prResp = await gh(`/repos/${owner}/${repo}/pulls/${prNumber}`, { method: 'GET' }, userToken);
    if (!prResp.ok) {
      return res.status(404).json({ error: 'Pull request not found' });
    }
    const prData = await prResp.json();

    // Check if it's already ready
    if (!prData.draft) {
      return res.status(200).json({ 
        success: true, 
        message: 'PR is already marked as ready for review',
        alreadyReady: true
      });
    }

    const nodeId = prData.node_id;
    console.log(`PR #${prNumber} node_id: ${nodeId}, draft: ${prData.draft}`);

    // 2. Use GraphQL mutation to mark as ready
    const mutation = `
      mutation {
        markPullRequestReadyForReview(input: { pullRequestId: "${nodeId}" }) {
          pullRequest {
            id
            number
            isDraft
          }
        }
      }
    `;

    const graphqlResp = await graphql(mutation, userToken);
    
    if (!graphqlResp.ok) {
      const errorData = await graphqlResp.json().catch(() => ({ message: 'Unknown error' }));
      console.error('GraphQL mutation failed:', graphqlResp.status, errorData);
      return res.status(graphqlResp.status).json({ 
        error: 'Failed to mark PR as ready for review',
        details: errorData.message || errorData.errors?.[0]?.message || 'Unknown error'
      });
    }

    const mutationResult = await graphqlResp.json();
    
    if (mutationResult.errors) {
      console.error('GraphQL mutation returned errors:', mutationResult.errors);
      return res.status(400).json({ 
        error: 'Failed to mark PR as ready',
        details: mutationResult.errors[0]?.message || 'GraphQL mutation failed'
      });
    }

    console.log('GraphQL mutation succeeded, now polling to verify...');

    // 3. Poll to verify the conversion completed
    let verified = false;
    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const checkResp = await gh(`/repos/${owner}/${repo}/pulls/${prNumber}`, { method: 'GET' }, userToken);
      if (checkResp.ok) {
        const checkData = await checkResp.json();
        console.log(`Poll ${i + 1}/10: draft=${checkData.draft}`);
        
        if (!checkData.draft) {
          verified = true;
          console.log('Draft conversion verified!');
          break;
        }
      }
    }

    if (!verified) {
      console.warn('Could not verify draft conversion within 10 seconds');
      return res.status(500).json({ 
        error: 'PR conversion may be in progress. Please wait a moment and try approving again.',
        details: 'Conversion initiated but not yet verified'
      });
    }

    res.status(200).json({ 
      success: true, 
      message: 'PR successfully marked as ready for review',
      prNumber: prNumber
    });

  } catch (error) {
    console.error('Mark ready error:', error);
    res.status(500).json({ 
      error: 'Failed to mark PR as ready',
      details: error.message 
    });
  }
}
