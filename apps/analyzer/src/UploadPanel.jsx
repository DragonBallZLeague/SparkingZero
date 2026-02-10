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
  const [setTeamData, setSetTeamData] = useState(false);
  const [team1, setTeam1] = useState('Budokai');
  const [team2, setTeam2] = useState('');
  const [teamWarning, setTeamWarning] = useState('');
  const [filesPreview, setFilesPreview] = useState([]);

  const teams = [
    '',
    'Budokai',
    'Cinema',
    'Cold Kingdom',
    'Creations',
    'Demons',
    'Malevolent Souls',
    'Master and Student',
    'Primal Instincts',
    'Sentai',
    'Time Patrol',
    'Tiny Terrors',
    'Z-Fighters'
  ];

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
    
    // Generate preview for team data modification
    if (setTeamData && onlyJson.length > 0) {
      generateFilesPreview(onlyJson);
    } else {
      setFilesPreview([]);
    }
  };

  const clearFiles = () => {
    setFiles([]);
    setFilesPreview([]);
    // Reset the file input
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) fileInput.value = '';
  };

  // Generate preview of which files will be modified
  const generateFilesPreview = async (filesList) => {
    const previews = [];
    for (const file of filesList) {
      try {
        // Use FileReader to read the file
        const text = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsText(file);
        });
        
        const json = JSON.parse(text);
        const hasTeamData = json.TeamBattleResults?.teams;
        previews.push({
          name: file.name,
          hasExistingTeams: !!hasTeamData,
          existingTeams: hasTeamData ? json.TeamBattleResults.teams : null,
          willModify: setTeamData && team1
        });
      } catch (e) {
        previews.push({
          name: file.name,
          hasExistingTeams: false,
          existingTeams: null,
          willModify: false,
          error: 'Could not parse JSON'
        });
      }
    }
    setFilesPreview(previews);
  };

  // Update preview when team settings change
  useEffect(() => {
    if (setTeamData && files.length > 0) {
      generateFilesPreview(files);
    } else {
      setFilesPreview([]);
    }
  }, [setTeamData, team1, team2, files]);

  // Validate team selection
  useEffect(() => {
    if (setTeamData) {
      if (!team1 || !team2) {
        setTeamWarning('');
      } else if (team1 === team2) {
        setTeamWarning('Warning: Team 1 and Team 2 are the same. This is allowed but may not be intended.');
      } else {
        setTeamWarning('');
      }
    } else {
      setTeamWarning('');
    }
  }, [setTeamData, team1, team2]);

  const doUpload = async () => {
    setErr('');
    if (!name.trim()) { setErr('Name/username is required'); return; }
    if (!selectedLeaf) { setErr('Please choose a target folder'); return; }
    if (files.length === 0) { setErr('Please attach at least one JSON file'); return; }
    if (setTeamData && !team1) { 
      setErr('Please select Team 1, or disable "Set Team Data"'); 
      return; 
    }

    setStage('uploading');
    try {
      const apiUrl = process.env.VITE_API_URL || 'https://sparking-zero-iota.vercel.app';
      const filesPayload = [];
      
      // Process and validate files
      for (const f of files) {
        if (f.size > 10 * 1024 * 1024) throw new Error(`${f.name} exceeds 10MB limit`);
        
        let content;
        if (setTeamData && team1) {
          // Modify the file to set team data
          try {
            // Read file using FileReader to avoid stream exhaustion
            const text = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsText(f);
            });
            
            const json = JSON.parse(text);
            
            // Set team data if the structure exists
            if (json.TeamBattleResults) {
              // Always include both teams; use empty string for unset team2
              const teamsArray = [team1, team2 || ''];
              json.TeamBattleResults.teams = teamsArray;
            }
            
            // Convert back to base64
            const modifiedJson = JSON.stringify(json, null, 2);
            content = btoa(unescape(encodeURIComponent(modifiedJson)));
          } catch (e) {
            throw new Error(`Failed to modify ${f.name}: ${e.message}`);
          }
        } else {
          // Use original file content
          content = await fileToBase64(f);
        }
        
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
              <label className="text-sm font-medium">Select Match Area</label>
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
            </div>
            
            {/* Team Data Section */}
            <div className="space-y-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="setTeamData" 
                  checked={setTeamData} 
                  onChange={e=>setSetTeamData(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="setTeamData" className="text-sm font-medium cursor-pointer">Set Team Data</label>
              </div>
              
              {setTeamData && (
                <div className="space-y-2 mt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-700">Team 1</label>
                      <select 
                        value={team1} 
                        onChange={e=>setTeam1(e.target.value)} 
                        className="w-full border rounded px-2 py-1 text-sm"
                      >
                        {teams.filter(t => t !== '').map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-700">Team 2</label>
                      <select 
                        value={team2} 
                        onChange={e=>setTeam2(e.target.value)} 
                        className="w-full border rounded px-2 py-1 text-sm"
                      >
                        {teams.map((t) => (
                          <option key={t} value={t}>{t || '(Not Set)'}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  {teamWarning && (
                    <div className="p-2 rounded bg-yellow-50 border border-yellow-300 text-yellow-800 text-xs">
                      ⚠️ {teamWarning}
                    </div>
                  )}
                  
                  {filesPreview.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="text-xs font-medium text-gray-700">Files Preview:</div>
                      <div className="rounded border border-gray-200 bg-gray-50">
                        <div className="p-2 h-48 overflow-y-auto space-y-1">
                          {filesPreview.map((preview, i) => (
                            <div key={i} className="text-xs p-1.5 rounded bg-white border border-blue-200">
                              <div className="font-medium">{preview.name}</div>
                              {preview.error ? (
                                <div className="text-red-600">{preview.error}</div>
                              ) : (
                                <>
                                  {preview.hasExistingTeams && (
                                    <div className="text-gray-600">
                                      Current: [{preview.existingTeams?.join(', ')}]
                                    </div>
                                  )}
                                  {preview.willModify ? (
                                    <div className="text-green-700">
                                      Will set to: [{team1}{team2 ? `, ${team2}` : ''}]
                                    </div>
                                  ) : (
                                    <div className="text-gray-500">
                                      {!team1 ? 'Select Team 1 to modify' : 'No TeamBattleResults structure found'}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="space-y-1">
              <label className="text-sm font-medium">Comments (optional)</label>
              <textarea value={comments} onChange={e=>setComments(e.target.value)} className="w-full border rounded px-2 py-1" rows={2} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">JSON files</label>
              <input type="file" accept="application/json,.json" multiple onChange={onFileChange} />
              {files.length > 0 && (
                <div className="mt-2 rounded border border-gray-200 bg-gray-50">
                  <div className="p-2 h-24 overflow-y-auto">
                    <ul className="list-disc ml-6 text-sm space-y-0.5">
                      {files.map((f, i)=> <li key={i}>{f.name} ({Math.ceil(f.size/1024)} KB)</li>)}
                    </ul>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={doUpload} disabled={files.length===0 || !selectedLeaf || !name.trim()} className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-50">Submit</button>
              {files.length > 0 && (
                <button
                  onClick={clearFiles}
                  className="px-3 py-2 rounded border border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                >
                  Clear
                </button>
              )}
            </div>
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
