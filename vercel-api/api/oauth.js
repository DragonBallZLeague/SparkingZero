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

      // Send token back to CMS parent window via postMessage
      // Retry mechanism handles browsers with tracking prevention delays
      res.status(200).send(`
        <html><body><script>
          (function() {
            var msg = 'authorization:github:success:{"token":"${token}","provider":"github"}';
            var target = window.opener;
            if (target) {
              target.postMessage(msg, '*');
              setTimeout(function() { target.postMessage(msg, '*'); }, 500);
              setTimeout(function() { window.close(); }, 1000);
            } else {
              document.body.innerHTML = '<p>Authentication successful! You can close this window and refresh the CMS page.</p>';
            }
          })();
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

  const params = new URLSearchParams({
    client_id: clientId,
    scope: scope,
  });

  res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
}
