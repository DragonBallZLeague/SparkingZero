// Vercel serverless function: POST /api/github-device-start
// Proxies GitHub Device Flow start endpoint with CORS enabled

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const client_id = body.client_id || req.query.client_id;
    const scope = body.scope || req.query.scope || 'public_repo';
    if (!client_id) {
      res.status(400).json({ error: 'client_id required' });
      return;
    }

    const params = new URLSearchParams();
    params.set('client_id', client_id);
    params.set('scope', scope);
    
    const ghRes = await fetch('https://github.com/login/device/code', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'SparkingZero-Uploader',
      },
      body: params.toString(),
    });
    
    const data = await ghRes.json();
    
    if (!ghRes.ok) {
      console.error('[Device Start] GitHub error:', ghRes.status, data);
      res.status(ghRes.status).json(data);
      return;
    }
    
    res.status(200).json(data);
  } catch (e) {
    console.error('[Device Start] Proxy error:', e);
    res.status(500).json({ error: e.message || 'proxy_failed' });
  }
}
