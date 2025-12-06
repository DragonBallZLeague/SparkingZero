// Placeholder status endpoint
export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'id required' });
  // Future: read from KV. For now, return pending.
  res.status(200).json({ id, status: 'pending' });
}
