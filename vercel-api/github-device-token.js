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
    const device_code = body.device_code || req.query.device_code;
    
    if (!client_id || !device_code) {
      return res.status(400).json({ error: 'client_id and device_code required' });
    }

    const params = new URLSearchParams({
      client_id,
      device_code,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
    });
    
    const ghRes = await fetch('https://github.com/login/oauth/access_token', {
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
      console.error('[Device Token] GitHub error:', ghRes.status, data);
      return res.status(ghRes.status).json(data);
    }
    
    return res.status(200).json(data);
  } catch (e) {
    console.error('[Device Token] Error:', e);
    return res.status(500).json({ error: e.message || 'proxy_failed' });
  }
};
