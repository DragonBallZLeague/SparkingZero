// List all pending submissions (draft PRs with data-submission label)

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
  
  if (!token) {
    return res.status(401).json({ error: 'Authorization required' });
  }

  const owner = process.env.OWNER || 'DragonBallZLeague';
  const repo = process.env.REPO || 'SparkingZero';
  const baseBranch = process.env.BASE_BRANCH || 'dev-branch';

  try {
    // Fetch all open PRs targeting the base branch
    const prResp = await gh(`/repos/${owner}/${repo}/pulls?state=open&base=${baseBranch}&per_page=100`, { method: 'GET' }, token);
    
    if (!prResp.ok) {
      return res.status(500).json({ error: 'Failed to fetch pull requests' });
    }
    
    const allPRs = await prResp.json();
    
    // Filter for data-submission labeled PRs
    const submissions = allPRs
      .filter(pr => pr.labels.some(label => label.name === 'data-submission'))
      .map(pr => {
        const metadata = parseSubmissionBody(pr.body || '');
        
        return {
          number: pr.number,
          title: pr.title,
          url: pr.html_url,
          branch: pr.head.ref,
          createdAt: pr.created_at,
          updatedAt: pr.updated_at,
          isDraft: pr.draft,
          state: pr.state,
          mergeable: pr.mergeable,
          submitter: metadata.submitter,
          comments: metadata.comments,
          targetPath: metadata.targetPath,
          fileCount: metadata.files.length,
          files: metadata.files
        };
      });

    res.status(200).json({ submissions });

  } catch (error) {
    console.error('Fetch submissions error:', error);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
}
