// Vercel serverless function: GET /api/callback
// OAuth proxy for Decap CMS — exchanges auth code for token and posts back to CMS

export default async function handler(req, res) {
  const code = req.query.code;

  if (!code) {
    res.status(400).send('Missing code parameter');
    return;
  }

  const clientId = process.env.CMS_GITHUB_CLIENT_ID;
  const clientSecret = process.env.CMS_GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    res.status(500).send('OAuth credentials not configured');
    return;
  }

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
}
