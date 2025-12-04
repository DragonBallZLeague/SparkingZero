module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = req.body || {};
    const client_id = body.client_id || req.query.client_id;
    const scope = body.scope || req.query.scope || 'public_repo';
    
    if (!client_id) {
      return res.status(400).json({ error: 'client_id required' });
    }

    const params = new URLSearchParams({
      client_id,
      scope
    });
    
    const ghRes = await fetch('https://github.com/login/device/code', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'SparkingZero-Uploader'
      },
      body: params.toString()
    });
    
    const data = await ghRes.json();
    
    if (!ghRes.ok) {
      console.error('[Device Start] GitHub error:', ghRes.status, data);
      return res.status(ghRes.status).json(data);
    }
    
    return res.status(200).json(data);
  } catch (e) {
    console.error('[Device Start] Error:', e);
    return res.status(500).json({ error: e.message || 'proxy_failed' });
  }
};
