const DEVICE_START_URL = import.meta.env.DEV 
  ? '/api/github-device-start' 
  : 'https://sparking-zero-iota.vercel.app/api/github-device-start';

const DEVICE_TOKEN_URL = import.meta.env.DEV 
  ? '/api/github-device-token' 
  : 'https://sparking-zero-iota.vercel.app/api/github-device-token';

export async function initiateDeviceFlow(clientId) {
  const response = await fetch(DEVICE_START_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      client_id: clientId,
      scope: 'repo'
    })
  });

  if (!response.ok) {
    throw new Error('Failed to initiate device flow');
  }

  return response.json();
}

export async function pollForToken(clientId, deviceCode) {
  const response = await fetch(DEVICE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      device_code: deviceCode
    })
  });

  if (!response.ok) {
    throw new Error('Failed to get token');
  }

  return response.json();
}

export async function waitForAuthorization(clientId, deviceCode, interval = 5) {
  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        const result = await pollForToken(clientId, deviceCode);
        
        if (result.error) {
          if (result.error === 'authorization_pending') {
            // Continue polling
            setTimeout(poll, interval * 1000);
          } else if (result.error === 'slow_down') {
            // Increase interval
            setTimeout(poll, (interval + 5) * 1000);
          } else {
            reject(new Error(result.error_description || result.error));
          }
        } else if (result.access_token) {
          resolve(result.access_token);
        } else {
          reject(new Error('Unexpected response'));
        }
      } catch (error) {
        reject(error);
      }
    };

    // Start polling after the interval
    setTimeout(poll, interval * 1000);
  });
}
