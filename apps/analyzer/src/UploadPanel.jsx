import React, { useState, useEffect } from 'react';
import { startDeviceFlow, pollForToken, getCurrentUser, getBranchSHA, createBranch, uploadFile, openPullRequest, formatIntakePath, assertClientConfig } from './githubDeviceFlow';

export default function UploadPanel({ defaultSubfolder = 'intake', onClose }) {
  const [stage, setStage] = useState('idle'); // idle | device | polling | ready | uploading | done | error
  const [device, setDevice] = useState(null);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [files, setFiles] = useState([]);
  const [subfolder, setSubfolder] = useState(defaultSubfolder);
  const [message, setMessage] = useState('Upload analyzer data');
  const [prUrl, setPrUrl] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    try { assertClientConfig(); } catch (e) { setErr(e.message); }
  }, []);

  const beginSignIn = async () => {
    try {
      setStage('device');
      const d = await startDeviceFlow('public_repo');
      setDevice(d); // { device_code, user_code, verification_uri, verification_uri_complete, expires_in, interval }
      setStage('polling');
      const tok = await pollForToken(d.device_code, (d.interval || 5) * 1000);
      setToken(tok.access_token);
      const u = await getCurrentUser(tok.access_token);
      setUser(u);
      setStage('ready');
    } catch (e) {
      setErr(e.message);
      setStage('error');
    }
  };

  const onFileChange = (e) => {
    const f = Array.from(e.target.files || []);
    const onlyJson = f.filter(x => x.name.toLowerCase().endsWith('.json'));
    setFiles(onlyJson);
  };

  const doUpload = async () => {
    if (!token || files.length === 0) return;
    setStage('uploading');
    try {
      const baseSha = await getBranchSHA(token);
      const safeUser = (user?.login || 'user').replace(/[^a-zA-Z0-9-_]/g, '-');
      const branch = `intake/${safeUser}-${Date.now()}`;
      await createBranch(token, branch, baseSha);

      // upload files
      for (const f of files) {
        if (f.size > 10 * 1024 * 1024) throw new Error(`${f.name} exceeds 10MB limit`);
        const path = formatIntakePath(f.name, subfolder || 'intake');
        await uploadFile(token, branch, path, f, message);
      }

      const prTitle = `Intake upload by ${user?.login || 'user'} (${files.length} file${files.length>1?'s':''})`;
      const prBody = `Automated intake upload from the Analyzer UI.\n\nSubfolder: ${subfolder || 'intake'}\nFiles:\n${files.map(f=>`- ${f.name}`).join('\n')}`;
      const pr = await openPullRequest(token, branch, prTitle, prBody);
      setPrUrl(pr.html_url);
      setStage('done');
    } catch (e) {
      setErr(e.message);
      setStage('error');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50001,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)'
      }}
    >
      <div
        className="w-[560px] max-w-[90vw] rounded-lg shadow-xl border p-4 bg-white text-gray-900"
        style={{
          width: '560px',
          maxWidth: '90vw',
          borderRadius: '12px',
          boxShadow: '0 12px 28px rgba(0,0,0,0.25)',
          border: '1px solid #e5e7eb',
          padding: '16px',
          background: '#ffffff',
          color: '#111827'
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Submit Data to GitHub</h2>
          <button
            onClick={onClose}
            className="px-2 py-1 text-sm rounded border"
            style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
          >
            Close
          </button>
        </div>

        {err && (
          <div className="mb-3 p-2 rounded bg-red-50 border border-red-200 text-red-700 text-sm">{err}</div>
        )}

        {stage === 'idle' && (
          <div className="space-y-3">
            <p>Sign in with GitHub to upload `.json` files directly to the repository via a pull request for admin approval.</p>
            <button onClick={beginSignIn} className="px-3 py-2 rounded bg-black text-white">Sign in with GitHub</button>
          </div>
        )}

        {stage === 'polling' && device && (
          <div className="space-y-2">
            <p className="text-sm">1) Open GitHub verification in a new tab:</p>
            <p>
              <a className="text-blue-600 underline" href={device.verification_uri} target="_blank" rel="noreferrer">{device.verification_uri}</a>
            </p>
            <p className="text-sm">2) Enter this code:</p>
            <div className="font-mono text-lg p-2 rounded bg-gray-100 border inline-block">{device.user_code}</div>
            <p className="text-xs text-gray-600">Waiting for approval... This window will continue automatically.</p>
          </div>
        )}

        {stage === 'ready' && (
          <div className="space-y-3">
            <div className="text-sm">Signed in as <span className="font-mono">{user?.login}</span></div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Target subfolder under BR_Data</label>
              <input value={subfolder} onChange={e=>setSubfolder(e.target.value)} className="w-full border rounded px-2 py-1" placeholder="intake" />
              <div className="text-xs text-gray-600">Files will be placed at <code>apps/analyzer/BR_Data/&lt;subfolder&gt;/&lt;filename&gt;</code>.</div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Commit message</label>
              <input value={message} onChange={e=>setMessage(e.target.value)} className="w-full border rounded px-2 py-1" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">JSON files</label>
              <input type="file" accept="application/json,.json" multiple onChange={onFileChange} />
              {files.length > 0 && (
                <ul className="list-disc ml-6 text-sm">
                  {files.map((f, i)=> <li key={i}>{f.name} ({Math.ceil(f.size/1024)} KB)</li>)}
                </ul>
              )}
            </div>
            <button onClick={doUpload} disabled={files.length===0} className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-50">Create PR</button>
          </div>
        )}

        {stage === 'uploading' && (
          <div className="text-sm">Uploading files and opening PR...</div>
        )}

        {stage === 'done' && (
          <div className="space-y-2">
            <div className="text-green-700 bg-green-50 border border-green-200 p-2 rounded text-sm">Pull request created.</div>
            <a className="text-blue-600 underline" href={prUrl} target="_blank" rel="noreferrer">View PR</a>
          </div>
        )}

        {stage === 'error' && (
          <div className="text-sm">An error occurred. Please retry.</div>
        )}
      </div>
    </div>
  );
}
