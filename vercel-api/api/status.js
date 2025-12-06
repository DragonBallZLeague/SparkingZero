// Placeholder status endpoint

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'id required' });
  // Future: read from KV. For now, return pending.
  res.status(200).json({ id, status: 'pending' });
}
