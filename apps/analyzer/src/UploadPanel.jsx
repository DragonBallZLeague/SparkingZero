import React, { useState, useEffect } from 'react';

// Helper to read file as base64
const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result.split(',')[1]);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

export default function UploadPanel({ onClose }) {
  const [stage, setStage] = useState('ready'); // ready | uploading | done | error
  const [files, setFiles] = useState([]);
  const [name, setName] = useState('');
  const [comments, setComments] = useState('');
  const [pathOptions, setPathOptions] = useState([]);
  const [parentOptions, setParentOptions] = useState([]);
  const [selectedParent, setSelectedParent] = useState('');
  const [leafOptions, setLeafOptions] = useState([]);
  const [selectedLeaf, setSelectedLeaf] = useState('');
  const [prUrl, setPrUrl] = useState('');
  const [submissionId, setSubmissionId] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    const loadPaths = async () => {
      try {
        const apiUrl = process.env.VITE_API_URL || 'https://sparking-zero-iota.vercel.app';
        const res = await fetch(`${apiUrl}/api/paths.js`);
        if (!res.ok) throw new Error('Failed to load folders');
        const data = await res.json();
        const opts = data.options || [];
        setPathOptions(opts);
        const grouped = {};
        for (const opt of opts) {
          const parts = (opt.value || '').split('/');
          if (!parts[0]) continue;
          const parent = parts[0];
          const child = parts.slice(1).join('/');
          if (!grouped[parent]) grouped[parent] = [];
          if (child) {
            grouped[parent].push({ label: child, value: opt.value });
          }
        }
        const parents = Object.keys(grouped).sort();
        setParentOptions(parents);
        if (parents.length > 0) {
          const initialParent = parents[0];
          setSelectedParent(initialParent);
          const leaves = grouped[initialParent] || [];
          if (leaves.length > 0) {
            setLeafOptions(leaves);
            setSelectedLeaf(leaves[0].value);
          }
        }
      } catch (e) {
        setErr(e.message);
      }
    };
    loadPaths();
  }, []);

  // When parent changes, refresh leaf options
  useEffect(() => {
    if (!selectedParent) return;
    const grouped = {};
    for (const opt of pathOptions) {
      const parts = (opt.value || '').split('/');
      if (!parts[0]) continue;
      const parent = parts[0];
      const child = parts.slice(1).join('/');
      if (!grouped[parent]) grouped[parent] = [];
      if (child) {
        grouped[parent].push({ label: child, value: opt.value });
      }
    }
    const leaves = grouped[selectedParent] || [];
    setLeafOptions(leaves);
    if (leaves.length > 0) {
      setSelectedLeaf(leaves[0].value);
    } else {
      setSelectedLeaf('');
    }
  }, [selectedParent, pathOptions]);

  const onFileChange = (e) => {
    const f = Array.from(e.target.files || []);
    const onlyJson = f.filter(x => x.name.toLowerCase().endsWith('.json'));
    setFiles(onlyJson);
  };

  const doUpload = async () => {
    setErr('');
    if (!name.trim()) { setErr('Name/username is required'); return; }
    if (!selectedLeaf) { setErr('Please choose a target folder'); return; }
    if (files.length === 0) { setErr('Please attach at least one JSON file'); return; }

    setStage('uploading');
    try {
      const apiUrl = process.env.VITE_API_URL || 'https://sparking-zero-iota.vercel.app';
      const filesPayload = [];
      
      // Validate files first
      for (const f of files) {
        if (f.size > 10 * 1024 * 1024) throw new Error(`${f.name} exceeds 10MB limit`);
        const content = await fileToBase64(f);
        filesPayload.push({ name: f.name, content, size: f.size });
      }

      // Call validation endpoint
      const validateRes = await fetch(`${apiUrl}/api/validate.js`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: filesPayload })
      });

      const validateData = await validateRes.json();
      
      // Check validation results
      if (validateData.invalidFiles > 0) {
        const errors = validateData.fileResults
          .filter(f => !f.valid)
          .map(f => `${f.filename}: ${f.errors.join(', ')}`)
          .join('; ');
        throw new Error(`Validation failed: ${errors}`);
      }

      // Show warnings if any
      if (validateData.fileResults.some(f => f.warnings.length > 0)) {
        const warnings = validateData.fileResults
          .filter(f => f.warnings.length > 0)
          .map(f => `${f.filename}: ${f.warnings.join(', ')}`)
          .join('\n');
        console.warn('Upload warnings:', warnings);
      }

      // Proceed with submission
      const res = await fetch(`${apiUrl}/api/submit.js`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          comments: comments.trim(),
          targetPath: selectedLeaf,
          files: filesPayload
        })
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Submission failed');
      }
      const data = await res.json();
      setSubmissionId(data.id || '');
      setPrUrl(data.prUrl || '');
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

        {stage === 'ready' && (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Your name/username</label>
              <input value={name} onChange={e=>setName(e.target.value)} className="w-full border rounded px-2 py-1" placeholder="e.g. SparkingFan42" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Target folder under BR_Data</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <div className="text-xs text-gray-600">Category</div>
                  <select value={selectedParent} onChange={e=>setSelectedParent(e.target.value)} className="w-full border rounded px-2 py-1">
                    {parentOptions.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-gray-600">Folder</div>
                  <select value={selectedLeaf} onChange={e=>setSelectedLeaf(e.target.value)} className="w-full border rounded px-2 py-1" disabled={leafOptions.length === 0}>
                    {leafOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="text-xs text-gray-600">Only bottom-level folders are selectable. Files will be placed at <code>apps/analyzer/BR_Data/&lt;selected path&gt;/&lt;filename&gt;</code>.</div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Comments (optional)</label>
              <textarea value={comments} onChange={e=>setComments(e.target.value)} className="w-full border rounded px-2 py-1" rows={2} />
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
            <button onClick={doUpload} disabled={files.length===0 || !selectedPath || !name.trim()} className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-50">Submit</button>
          </div>
        )}

        {stage === 'uploading' && (
          <div className="text-sm">Uploading files and opening PR...</div>
        )}

        {stage === 'done' && (
          <div className="space-y-2">
            <div className="text-green-700 bg-green-50 border border-green-200 p-2 rounded text-sm">Submission received.</div>
            {submissionId && (<div className="text-sm">Submission ID: <span className="font-mono">{submissionId}</span></div>)}
            {prUrl && (<a className="text-blue-600 underline" href={prUrl} target="_blank" rel="noreferrer">View PR</a>)}
          </div>
        )}

        {stage === 'error' && (
          <div className="text-sm">An error occurred. Please retry.</div>
        )}
      </div>
    </div>
  );
}
