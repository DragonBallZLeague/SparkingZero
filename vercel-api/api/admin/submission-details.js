// Get detailed information about a specific submission including file contents

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
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

function parseSubmissionBody(body) {
  const lines = body.split('\n');
  const data = {
    submitter: '',
    comments: '',
    targetPath: '',
    files: []
  };

  let inFilesSection = false;
  
  for (const line of lines) {
    if (line.startsWith('Submitter:')) {
      data.submitter = line.replace('Submitter:', '').trim();
    } else if (line.startsWith('Comments:')) {
      data.comments = line.replace('Comments:', '').trim();
    } else if (line.startsWith('Target path:')) {
      data.targetPath = line.replace('Target path:', '').trim();
    } else if (line.startsWith('Files:')) {
      inFilesSection = true;
    } else if (inFilesSection && line.startsWith('- ')) {
      data.files.push(line.replace('- ', '').trim());
    }
  }

  return data;
}

function extractTeamData(jsonContent) {
  try {
    const data = JSON.parse(jsonContent);
    
    // Check for TeamBattleResults wrapper
    if (data.TeamBattleResults) {
      return {
        hasTeamData: true,
        team: data.TeamBattleResults.team || null,
        event: data.TeamBattleResults.event || null,
        season: data.TeamBattleResults.season || null
      };
    }
    
    // Check for standard battle result with team metadata
    if (data.team || data.event || data.season) {
      return {
        hasTeamData: true,
        team: data.team || null,
        event: data.event || null,
        season: data.season || null
      };
    }
    
    return { hasTeamData: false };
  } catch (e) {
    return { hasTeamData: false, error: e.message };
  }
}

export default async function handler(req, res) {
  cors(res);
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = req.headers.authorization?.replace('Bearer ', '');
  const prNumber = req.query.pr;
  
  if (!token) {
    return res.status(401).json({ error: 'Authorization required' });
  }
  
  if (!prNumber) {
    return res.status(400).json({ error: 'PR number required' });
  }

  const owner = process.env.OWNER || 'DragonBallZLeague';
  const repo = process.env.REPO || 'SparkingZero';

  try {
    // Fetch PR details
    const prResp = await gh(`/repos/${owner}/${repo}/pulls/${prNumber}`, { method: 'GET' }, token);
    
    if (!prResp.ok) {
      return res.status(404).json({ error: 'Pull request not found' });
    }
    
    const prData = await prResp.json();
    const metadata = parseSubmissionBody(prData.body || '');

    // Fetch PR files
    const filesResp = await gh(`/repos/${owner}/${repo}/pulls/${prNumber}/files`, { method: 'GET' }, token);
    
    if (!filesResp.ok) {
      return res.status(500).json({ error: 'Failed to fetch PR files' });
    }
    
    const filesData = await filesResp.json();
    
    // Fetch content for each file and extract team data
    const filesWithContent = await Promise.all(
      filesData.map(async (file) => {
        try {
          // Check if file exists in base branch
          let exists = false;
          try {
            const baseCheckResp = await gh(
              `/repos/${owner}/${repo}/contents/${file.filename}?ref=${prData.base.ref}`,
              { method: 'GET' },
              token
            );
            exists = baseCheckResp.ok;
          } catch (e) {
            exists = false;
          }

          // Only fetch content for JSON files
          if (!file.filename.endsWith('.json')) {
            return {
              filename: file.filename,
              status: file.status,
              additions: file.additions,
              deletions: file.deletions,
              changes: file.changes,
              content: null,
              teamData: null,
              exists: exists,
              error: 'Not a JSON file'
            };
          }

          // Fetch file content from the PR branch
          const contentResp = await gh(
            `/repos/${owner}/${repo}/contents/${file.filename}?ref=${prData.head.ref}`,
            { method: 'GET' },
            token
          );

          if (!contentResp.ok) {
            return {
              filename: file.filename,
              status: file.status,
              additions: file.additions,
              deletions: file.deletions,
              changes: file.changes,
              content: null,
              teamData: null,
              exists: exists,
              error: 'Failed to fetch content'
            };
          }

          const contentData = await contentResp.json();
          
          // Decode base64 content
          const content = Buffer.from(contentData.content, 'base64').toString('utf8');
          
          // Extract team data
          const teamData = extractTeamData(content);

          return {
            filename: file.filename,
            status: file.status,
            additions: file.additions,
            deletions: file.deletions,
            changes: file.changes,
            content: content,
            teamData: teamData,
            exists: exists,
            size: contentData.size
          };
        } catch (error) {
          console.error(`Error processing file ${file.filename}:`, error);
          return {
            filename: file.filename,
            status: file.status,
            content: null,
            teamData: null,
            exists: false,
            error: error.message
          };
        }
      })
    );

    res.status(200).json({
      pr: {
        number: prData.number,
        title: prData.title,
        body: prData.body,
        url: prData.html_url,
        branch: prData.head.ref,
        createdAt: prData.created_at,
        updatedAt: prData.updated_at,
        isDraft: prData.draft,
        state: prData.state,
        mergeable: prData.mergeable,
        mergeable_state: prData.mergeable_state
      },
      metadata,
      files: filesWithContent
    });

  } catch (error) {
    console.error('Fetch submission details error:', error);
    res.status(500).json({ error: 'Failed to fetch submission details' });
  }
}
