// GitHub Device Flow + minimal GitHub REST helpers for client-side use (no backend)
// Requires Vite env var: VITE_GITHUB_CLIENT_ID
// Optional env vars: VITE_GITHUB_OWNER (default: DragonBallZLeague), VITE_GITHUB_REPO (default: SparkingZero), VITE_GITHUB_BASE_BRANCH (default: dev-branch)

const GITHUB_OAUTH_DEVICE_CODE = 'https://github.com/login/device/code';
const GITHUB_OAUTH_TOKEN = 'https://github.com/login/oauth/access_token';
const GITHUB_API = 'https://api.github.com';

function getConfig(key, fallback) {
  // Try env first, then runtime config
  const envValue = import.meta?.env?.[`VITE_GITHUB_${key}`];
  if (envValue) return envValue;
  
  if (typeof window !== 'undefined') {
    const metaContent = document.querySelector(`meta[name="sz-github-${key.toLowerCase()}"]`)?.getAttribute('content');
    if (metaContent) return metaContent;
    
    const globalCfg = window.__SZ_CONFIG__?.[key] || window.__SZ_CONFIG__?.[`VITE_GITHUB_${key}`];
    if (globalCfg) return globalCfg;
  }
  
  return fallback;
}

const OWNER = getConfig('OWNER', 'DragonBallZLeague');
const REPO = getConfig('REPO', 'SparkingZero');
const BASE_BRANCH = getConfig('BASE_BRANCH', 'dev-branch');
const getClientID = () => getConfig('CLIENT_ID', '');

export function assertClientConfig() {
  const CLIENT_ID = getClientID();
  if (!CLIENT_ID) {
    const envKeys = import.meta?.env ? Object.keys(import.meta.env).join(', ') : 'no import.meta.env';
    const globalCfg = typeof window !== 'undefined' && window.__SZ_CONFIG__ ? JSON.stringify(window.__SZ_CONFIG__) : 'no __SZ_CONFIG__';
    console.warn('[Upload] Missing VITE_GITHUB_CLIENT_ID. Available env keys:', envKeys);
    console.warn('[Upload] window.__SZ_CONFIG__:', globalCfg);
    console.warn('[Upload] Set via .env, meta tag name="sz-github-client-id", or window.__SZ_CONFIG__.CLIENT_ID');
    throw new Error('Missing VITE_GITHUB_CLIENT_ID in environment. Set it in .env or provide meta/global config on Pages.');
  }
}

export async function startDeviceFlow(scope = 'public_repo') {
  assertClientConfig();
  const CLIENT_ID = getClientID();
  const params = new URLSearchParams();
  params.set('client_id', CLIENT_ID);
  params.set('scope', scope);
  const res = await fetch(GITHUB_OAUTH_DEVICE_CODE, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  if (!res.ok) throw new Error('Failed to start device flow');
  return res.json();
}

export async function pollForToken(device_code, interval = 5000) {
  assertClientConfig();
  const CLIENT_ID = getClientID();
  const params = new URLSearchParams();
  params.set('client_id', CLIENT_ID);
  params.set('device_code', device_code);
  params.set('grant_type', 'urn:ietf:params:oauth:grant-type:device_code');

  while (true) {
    const res = await fetch(GITHUB_OAUTH_TOKEN, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    if (!res.ok) throw new Error('Token polling failed');
    const data = await res.json();
    if (data.error) {
      if (data.error === 'authorization_pending') {
        await new Promise(r => setTimeout(r, interval));
        continue;
      }
      if (data.error === 'slow_down') {
        interval += 2000; // backoff
        await new Promise(r => setTimeout(r, interval));
        continue;
      }
      throw new Error(`OAuth error: ${data.error}`);
    }
    return data; // { access_token, token_type, scope }
  }
}

function ghHeaders(token) {
  return {
    'Accept': 'application/vnd.github+json',
    'Authorization': `Bearer ${token}`,
  };
}

export async function getCurrentUser(token) {
  const res = await fetch(`${GITHUB_API}/user`, { headers: ghHeaders(token) });
  if (!res.ok) throw new Error('Failed to fetch user');
  return res.json();
}

export async function getBranchSHA(token, branch = BASE_BRANCH) {
  const res = await fetch(`${GITHUB_API}/repos/${OWNER}/${REPO}/git/ref/heads/${encodeURIComponent(branch)}`,
    { headers: ghHeaders(token) });
  if (!res.ok) throw new Error(`Failed to get base branch: ${branch}`);
  const data = await res.json();
  return data.object.sha;
}

export async function createBranch(token, newBranchName, fromSha) {
  const res = await fetch(`${GITHUB_API}/repos/${OWNER}/${REPO}/git/refs`, {
    method: 'POST',
    headers: { ...ghHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref: `refs/heads/${newBranchName}`, sha: fromSha }),
  });
  if (!res.ok) throw new Error('Failed to create branch');
  return res.json();
}

async function fileToBase64(file) {
  const buf = await file.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buf);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export async function uploadFile(token, branch, path, file, message = 'Upload analyzer data') {
  const content = await fileToBase64(file);
  const res = await fetch(`${GITHUB_API}/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(path)}`, {
    method: 'PUT',
    headers: { ...ghHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, content, branch }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Failed to upload ${path}: ${t}`);
  }
  return res.json();
}

export async function openPullRequest(token, headBranch, title, body) {
  const res = await fetch(`${GITHUB_API}/repos/${OWNER}/${REPO}/pulls`, {
    method: 'POST',
    headers: { ...ghHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, head: headBranch, base: BASE_BRANCH, body }),
  });
  if (!res.ok) throw new Error('Failed to open PR');
  return res.json();
}

export function formatIntakePath(filename, subfolder = 'intake') {
  return `apps/analyzer/BR_Data/${subfolder}/${filename}`;
}
