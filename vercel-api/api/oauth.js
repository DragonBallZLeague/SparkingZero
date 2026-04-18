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
          <html><body>
            <h3>Authentication Error</h3>
            <p>${data.error}: ${data.error_description || 'Unknown error'}</p>
            <script>
              if (window.opener) {
                window.opener.postMessage(
                  'authorization:github:error:${JSON.stringify(data)}',
                  '*'
                );
              }
            </script>
          </body></html>
        `);
        return;
      }

      const token = data.access_token;

      // Send token back to CMS via postMessage with retry
      res.status(200).send(`
        <html><body>
          <p id="status">Completing authentication...</p>
          <script>
            (function() {
              var msg = 'authorization:github:success:{"token":"${token}","provider":"github"}';
              var sent = false;

              function trySend() {
                if (window.opener) {
                  window.opener.postMessage(msg, '*');
                  document.getElementById('status').innerText = 'Token sent! This window should close automatically...';
                  sent = true;
                } else {
                  document.getElementById('status').innerText = 'Login successful but popup lost connection to CMS. Close this window and refresh the CMS page.';
                }
              }

              // Try immediately
              trySend();
              // Retry after delays
              setTimeout(trySend, 500);
              setTimeout(trySend, 1500);
              // Auto-close after 3 seconds if we managed to send
              setTimeout(function() {
                if (sent) window.close();
              }, 3000);
            })();
          </script>
        </body></html>
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
