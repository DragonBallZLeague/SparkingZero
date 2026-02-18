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

async function markPRReady(prNumber, nodeId, token) {
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

  const graphqlResp = await graphql(mutation, token);
  
  if (!graphqlResp.ok) {
    const errorData = await graphqlResp.json().catch(() => ({ message: 'Unknown error' }));
    console.error('GraphQL mutation failed:', graphqlResp.status, errorData);
    throw new Error('Failed to mark PR as ready for review');
  }

  const mutationResult = await graphqlResp.json();
  
  if (mutationResult.errors) {
    console.error('GraphQL mutation returned errors:', mutationResult.errors);
    throw new Error(mutationResult.errors[0]?.message || 'GraphQL mutation failed');
  }

  return mutationResult;
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

  const { prNumber, branch, force = false } = body;
  
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
    
    // 1. Fetch PR details
    const prResp = await gh(`/repos/${owner}/${repo}/pulls/${prNumber}`, { method: 'GET' }, botToken);
    if (!prResp.ok) {
      return res.status(404).json({ error: 'Pull request not found' });
    }
    let prData = await prResp.json();

    // 2. If PR is draft, automatically mark it as ready for review using GraphQL
    if (prData.draft) {
      console.log(`PR #${prNumber} is draft, marking as ready for review...`);
      
      try {
        await markPRReady(prNumber, prData.node_id, userToken);
        console.log('GraphQL mutation succeeded, polling to verify...');
        
        // Poll to verify the conversion completed (up to 10 seconds)
        let verified = false;
        for (let i = 0; i < 10; i++) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const checkResp = await gh(`/repos/${owner}/${repo}/pulls/${prNumber}`, { method: 'GET' }, botToken);
          if (checkResp.ok) {
            const checkData = await checkResp.json();
            console.log(`Poll ${i + 1}/10: draft=${checkData.draft}`);
            
            if (!checkData.draft) {
              verified = true;
              prData = checkData; // Update prData with the non-draft version
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
      } catch (error) {
        console.error('Failed to mark PR as ready:', error);
        return res.status(400).json({ 
          error: 'Failed to mark PR as ready for review. Please mark it manually on GitHub.',
          details: error.message,
          isDraft: true
        });
      }
    }

    // If mergeable is null, refetch once more to get the computed value
    if (prData.mergeable === null) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const refetchResp = await gh(`/repos/${owner}/${repo}/pulls/${prNumber}`, { method: 'GET' }, botToken);
      if (refetchResp.ok) {
        prData = await refetchResp.json();
      }
    }

    // Check if PR is mergeable
    if (prData.mergeable === false) {
      return res.status(409).json({ 
        error: 'PR has conflicts that must be resolved before merging',
        mergeable_state: prData.mergeable_state
      });
    }
    
    // Only block if truly blocked by branch protection, not just failing checks
    // 'unstable' means checks are failing but not required
    // 'blocked' means branch protection is actively preventing merge
    if (prData.mergeable_state === 'blocked' && prData.mergeable !== true) {
      return res.status(409).json({ 
        error: 'PR is blocked. Check branch protection rules or required status checks.',
        mergeable_state: prData.mergeable_state
      });
    }

    // 3. Add approval review (required for branch protection)
    const reviewResp = await gh(`/repos/${owner}/${repo}/pulls/${prNumber}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        event: 'APPROVE',
        body: `✅ Approved by @${username} via admin dashboard` 
      })
    }, botToken);

    if (!reviewResp.ok) {
      console.warn('Failed to add approval review');
      // Still add a comment as fallback
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
    }

    // Wait for GitHub to process the approval
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 4. Merge the PR (with optional admin bypass for status checks)
    const mergeBody = {
      commit_title: `Merge PR #${prNumber}: ${prData.title}`,
      commit_message: `Approved and merged by @${username}${force ? ' (force merged)' : ''}`,
      merge_method: 'squash'
    };
    
    // Force merge note: Admin bypass requires:
    // 1. GITHUB_TOKEN user has Admin permissions on the repo
    // 2. Branch protection enables "Allow administrators to bypass required pull requests"
    if (force) {
      console.log('Force merge requested - admin bypass will apply if token has admin permissions');
    }
    
    const mergeResp = await gh(`/repos/${owner}/${repo}/pulls/${prNumber}/merge`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(mergeBody)
    }, botToken);

    if (!mergeResp.ok) {
      const errorData = await mergeResp.json().catch(() => ({ message: 'Unknown error' }));
      console.error('Merge failed:', mergeResp.status, errorData);
      
      let errorMessage = 'Failed to merge PR';
      if (mergeResp.status === 405) {
        // 405 usually means merge button is not available
        const reasons = [];
        if (prData.mergeable_state === 'dirty') reasons.push('has merge conflicts');
        if (prData.mergeable_state === 'behind') reasons.push('is behind the base branch');
        if (prData.mergeable_state === 'blocked') reasons.push('is blocked by branch protection rules');
        
        if (reasons.length > 0) {
          errorMessage = `PR cannot be merged because it ${reasons.join(' and ')}.`;
        } else if (prData.mergeable_state === 'unstable') {
          // Unstable means checks are failing, but if there's no branch protection, this shouldn't block
          // However GitHub API still rejects the merge - this is a GitHub limitation
          errorMessage = `Unable to merge: ${errorData.message || 'GitHub API rejected the merge request. This may be due to incomplete CI checks.'}`;
        } else {
          errorMessage = `PR cannot be merged. Status: ${prData.mergeable_state}. ${errorData.message || ''}`;
        }
      } else if (mergeResp.status === 409) {
        errorMessage = 'PR is not mergeable. Please check for conflicts or branch protection requirements.';
      } else if (errorData.message) {
        errorMessage = `Failed to merge: ${errorData.message}`;
      }
      
      return res.status(mergeResp.status).json({ 
        error: errorMessage,
        details: errorData.message,
        mergeable_state: prData.mergeable_state,
        status: mergeResp.status
      });
    }

    const mergeData = await mergeResp.json();

    // 5. Delete the branch
    try {
      const branchName = branch.replace('refs/heads/', '');
      const deleteResp = await gh(`/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branchName)}`, {
        method: 'DELETE'
      }, botToken);

      if (!deleteResp.ok) {
        console.warn(`Failed to delete branch ${branchName}: ${deleteResp.status}`);
        // Don't fail the request if branch deletion fails
      }
    } catch (deleteError) {
      console.warn('Error deleting branch:', deleteError);
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
