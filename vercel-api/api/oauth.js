// Vercel serverless function: /api/oauth
// Combined OAuth proxy for Decap CMS
// - No ?code param → redirect to GitHub authorize
// - Has ?code param → exchange for token and post back to CMS popup

export default async function handler(req, res) {
  const clientId = process.env.CMS_GITHUB_CLIENT_ID;
  const clientSecret = process.env.CMS_GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    res.status(500).send('OAuth credentials not configured');
    return;
  }

  const code = req.query.code;

  // --- CALLBACK: exchange code for token ---
  if (code) {
    try {
      const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code: code,
        }),
      });

      const data = await tokenResponse.json();

      if (data.error) {
        res.status(200).send(`
          <html><body><script>
            window.opener.postMessage(
              'authorization:github:error:${JSON.stringify(data)}',
              '*'
            );
            window.close();
          </script></body></html>
        `);
        return;
      }

      const token = data.access_token;

      res.status(200).send(`
        <html><body><script>
          window.opener.postMessage(
            'authorization:github:success:{"token":"${token}","provider":"github"}',
            '*'
          );
          window.close();
        </script></body></html>
      `);
    } catch (err) {
      console.error('OAuth callback error:', err);
      res.status(500).send('OAuth exchange failed');
    }
    return;
  }

  // --- AUTH: redirect to GitHub authorize ---
  const scope = req.query.scope || 'repo';
  const callbackUrl = `https://${req.headers.host}/api/oauth`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    scope: scope,
  });

  res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
}
