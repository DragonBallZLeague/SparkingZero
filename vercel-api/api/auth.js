// Vercel serverless function: GET /api/auth
// OAuth proxy for Decap CMS — redirects user to GitHub authorization page

export default function handler(req, res) {
  const clientId = process.env.CMS_GITHUB_CLIENT_ID;
  const scope = req.query.scope || 'repo';

  if (!clientId) {
    res.status(500).send('CMS_GITHUB_CLIENT_ID not configured');
    return;
  }

  const callbackUrl = `https://${req.headers.host}/api/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    scope: scope,
  });

  res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
}
