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

      // Decap CMS requires a two-step handshake:
      // 1. Popup sends 'authorizing:github' to parent
      // 2. Parent acknowledges and sets up token listener
      // 3. Popup sends 'authorization:github:success:...' with the token
      res.status(200).send(`
        <html><body>
          <p id="status">Completing authentication...</p>
          <script>
            (function() {
              var token = '${token}';
              var opener = window.opener;

              if (!opener) {
                document.getElementById('status').innerText = 'Login successful but popup lost connection to CMS. Close this window and refresh the CMS page.';
                return;
              }

              // Step 1: Send handshake to CMS parent
              opener.postMessage('authorizing:github', '*');
              document.getElementById('status').innerText = 'Handshake sent, waiting for CMS...';

              // Step 2: Listen for CMS to acknowledge the handshake
              window.addEventListener('message', function(e) {
                if (e.data === 'authorizing:github') {
                  // Step 3: CMS is ready — send the token
                  opener.postMessage(
                    'authorization:github:success:' + JSON.stringify({token: token, provider: 'github'}),
                    e.origin
                  );
                  document.getElementById('status').innerText = 'Token sent! Closing...';
                  setTimeout(function() { window.close(); }, 1000);
                }
              });

              // Timeout fallback: if handshake never comes back, try sending token directly
              setTimeout(function() {
                if (document.getElementById('status').innerText.indexOf('Token sent') === -1) {
                  opener.postMessage(
                    'authorization:github:success:' + JSON.stringify({token: token, provider: 'github'}),
                    '*'
                  );
                  document.getElementById('status').innerText = 'Fallback: token sent directly. Closing...';
                  setTimeout(function() { window.close(); }, 1000);
                }
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
