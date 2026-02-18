const API_BASE = import.meta.env.DEV ? '/api' : 'https://sparking-zero-iota.vercel.app/api';

export async function verifyAuth(token) {
  const response = await fetch(`${API_BASE}/admin/auth`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ token })
  });

  if (!response.ok) {
    throw new Error('Authentication failed');
  }

  return response.json();
}

export async function fetchSubmissions(token) {
  const response = await fetch(`${API_BASE}/admin/submissions`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch submissions');
  }

  return response.json();
}

export async function fetchSubmissionDetails(token, prNumber) {
  const response = await fetch(`${API_BASE}/admin/submission-details?pr=${prNumber}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch submission details');
  }

  return response.json();
}

export async function approveSubmission(token, prNumber, branch, force = false) {
  const response = await fetch(`${API_BASE}/admin/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ prNumber, branch, force })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to approve submission');
  }

  return response.json();
}

export async function rejectSubmission(token, prNumber, reason, branch) {
  const response = await fetch(`${API_BASE}/admin/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ prNumber, reason, branch })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to reject submission');
  }

  return response.json();
}
