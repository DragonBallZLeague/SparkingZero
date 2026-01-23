import React, { useState, useEffect, useRef } from "react";
import { createPortal } from 'react-dom';
import { useFloating, offset, flip, shift, size, autoUpdate } from '@floating-ui/react-dom';
import { Plus, Trash2, Copy, Download, Upload, X, Sparkles, Minus } from "lucide-react";
import yaml from "js-yaml";

// Helper: find AI id from either display name or id (case-insensitive, trimmed)
const findAiIdFromValue = (val, aiItems) => {
  if (!val && val !== 0) return "";
  const s = String(val).trim();
  if (!s) return "";
  // direct id match
  const byId = (aiItems || []).find((a) => a.id === s);
  if (byId) return byId.id;
  // case-insensitive name match
  const lower = s.toLowerCase();
  const byName = (aiItems || []).find((a) => (a.name || "").trim().toLowerCase() === lower);
  return byName ? byName.id : "";
};

// Hoisted RulesetSelector so it's available before it's referenced in JSX
function RulesetSelector({ rulesets, activeKey, onChange }) {
  const items = Object.keys((rulesets && rulesets.rulesets) || {}).map((k) => ({
    id: k,
    name: (rulesets.rulesets[k] && rulesets.rulesets[k].metadata && rulesets.rulesets[k].metadata.name) || k,
  }));
  return (
    <div>
      <select
        className="bg-slate-800 text-white px-2 py-1 rounded-lg"
        value={activeKey || ""}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">None</option>
        {items.map((it) => (
          <option key={it.id} value={it.id}>
            {it.name}
          </option>
        ))}
      </select>
    </div>
  );
}

const MatchBuilder = () => {
  // Helper to download a file
  const downloadFile = (filename, content, type = "text/yaml") => {
    console.log("downloadFile called", { filename, type });
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Helper to export a single team as YAML (uses display names)
  const exportSingleTeam = (team, teamName, matchName) => {
    try {
      const teamYaml = {
        matchName: matchName,
        teamName: teamName,
        members: team.map((char) => ({
          character: char.name || (characters.find(c => c.id === char.id)?.name || ""),
          costume: char.costume ? (costumes.find(c => c.id === char.costume)?.name || char.costume) : "",
          // map capsule ids to names, but filter out engine-placeholder ids like '00_0_0061'
          capsules: (char.capsules || [])
            .map((cid) => {
              const found = capsules.find((c) => c.id === cid);
              if (found) return found.name;
              // treat unknown engine placeholder capsule ids (00_0_*) as empty
              if (cid && cid.toString().startsWith('00_0_')) return '';
              return cid;
            })
            .filter(Boolean),
          ai: char.ai ? (aiItems.find(ai => ai.id === char.ai)?.name || char.ai) : "",
          sparking: char.sparking ? (sparkingMusic.find(s => s.id === char.sparking)?.name || char.sparking) : ""
        }))
      };
      const yamlStr = yaml.dump(teamYaml, { noRefs: true, lineWidth: 120 });
      downloadFile(`${teamName.replace(/\s+/g, "_")}.yaml`, yamlStr, "text/yaml");
      setSuccess(`Exported ${teamName} from ${matchName} as YAML.`);
    } catch (err) {
      console.error("exportSingleTeam error", err);
      setError("Failed to export team as YAML.");
    }
  };

  // Helper to import a single team YAML and map display names back to IDs, updating the match state
  const importSingleTeam = async (event, matchId, teamName) => {
    // Clear the target team first so previous selections are removed — use 5 empty slots
    const emptySlots = () => Array.from({ length: 5 }, () => ({ name: "", id: "", capsules: Array(7).fill(""), costume: "", ai: "" }));
      setMatches(prev => prev.map(m => m.id === matchId ? { ...m, [teamName]: emptySlots().map(slot => ({ ...slot, sparking: "" })) } : m));
    const files = event.target.files;
    if (!files || files.length === 0) return;
    for (let file of files) {
      try {
        const text = await file.text();
        const teamYaml = yaml.load(text);
        if (!teamYaml || !teamYaml.members) throw new Error("Invalid team YAML");
        // normalize capsule display name to strip cost suffixes like 'Name (1)'
        const normalizeCapsuleName = (s) => {
          if (!s && s !== 0) return '';
          const raw = String(s).trim();
          return raw.replace(/\s*\(\d+\)\s*$/, '').trim();
        };
        const newTeam = (teamYaml.members || []).map((m) => {
          console.debug('importSingleTeam: incoming member ai:', m.ai, 'aiItems.length:', aiItems.length, 'resolved:', findAiIdFromValue(m.ai, aiItems));
          const nameVal = (m.character || "").toString().trim();
          const charObj = characters.find(c => (c.name || "").trim().toLowerCase() === nameVal.toLowerCase()) || { id: "", name: nameVal };
          return {
            name: charObj.name,
            id: charObj.id || "",
            costume: m.costume ? (costumes.find(c => (c.name || "").trim().toLowerCase() === (m.costume || "").toString().trim().toLowerCase())?.id || "") : "",
            capsules: Array(7).fill("").map((_, i) => {
              if (m.capsules && m.capsules[i]) {
                const capNameRaw = (m.capsules[i] || "").toString().trim();
                const capName = normalizeCapsuleName(capNameRaw).toLowerCase();
                return capsules.find(c => (c.name || "").trim().toLowerCase() === capName)?.id || "";
              }
              return "";
            }),
            ai: m.ai ? findAiIdFromValue(m.ai, aiItems) : "",
            sparking: m.sparking ? (sparkingMusic.find(s => (s.name || "").trim().toLowerCase() === (m.sparking || "").toString().trim().toLowerCase())?.id || "") : ""
          };
        });

        // If the YAML provides a match name, set it on the match
        if (teamYaml.matchName) {
          setMatches((prev) => prev.map((m) => m.id === matchId ? { ...m, name: teamYaml.matchName } : m));
        }
        // If the YAML provides a teamName, set the display name for this team
        if (teamYaml.teamName) {
          if (teamName === 'team1') {
            setMatches((prev) => prev.map((m) => m.id === matchId ? { ...m, team1Name: teamYaml.teamName } : m));
          } else if (teamName === 'team2') {
            setMatches((prev) => prev.map((m) => m.id === matchId ? { ...m, team2Name: teamYaml.teamName } : m));
          }
        }

        setMatches((prev) => prev.map((m) =>
          m.id === matchId
            ? { ...m, [teamName]: newTeam }
            : m
        ));
        // Safety-net: normalize fields (name, costume, ai, sparking) after import
        setMatches((prev) => prev.map((m) => {
          if (m.id !== matchId) return m;
          const normalizeTeam = (team) => team.map((ch) => {
            const out = { ...ch };
            // populate name if missing
            if ((!out.name || out.name.trim() === '') && out.id) {
              out.name = (characters.find(c => c.id === out.id)?.name) || out.name || '';
            }
            // costume: try to resolve by id or name
            if (out.costume) {
              if (!costumes.find(cs => cs.id === out.costume)) {
                const cs = costumes.find(cs => (cs.name || '').trim().toLowerCase() === (out.costume || '').toString().trim().toLowerCase());
                out.costume = cs ? cs.id : out.costume;
              }
            }
            // ai: attempt to resolve name->id
            if (out.ai && aiItems && aiItems.length > 0) {
              out.ai = findAiIdFromValue(out.ai, aiItems) || out.ai;
            }
            // sparking: resolve if provided as name
            if (out.sparking) {
              if (!sparkingMusic.find(s => s.id === out.sparking)) {
                const sp = sparkingMusic.find(s => (s.name || '').trim().toLowerCase() === (out.sparking || '').toString().trim().toLowerCase());
                out.sparking = sp ? sp.id : out.sparking;
              }
            }
            return out;
          });
          return { ...m, [teamName]: normalizeTeam(newTeam) };
        }));
        setSuccess(`Imported ${teamName} for match ${matchId}`);
        setError("");
        try { event.target.value = null; } catch (e) {}
      } catch (e) {
        console.error("importSingleTeam error", e);
        const fname = (typeof file !== 'undefined' && file && file.name) ? file.name : 'file';
        setError("Invalid YAML file: " + fname);
        try { event.target.value = null; } catch (er) {}
        try { document.querySelectorAll('input[type=file]').forEach(i=>i.value=null); } catch(err) {}
        return;
      }
    }
  };

  // Helper to export a single match as YAML
  const exportSingleMatch = (match) => {
    const matchYaml = {
      matchName: match.name,
      team1Name: match.team1Name,
      team2Name: match.team2Name,
      team1: (match.team1 || []).map((char) => ({
        character: char.name || (characters.find(c => c.id === char.id)?.name || ""),
        costume: char.costume ? (costumes.find(c => c.id === char.costume)?.name || char.costume) : "",
        capsules: (char.capsules || [])
          .map((cid) => {
            const found = capsules.find((c) => c.id === cid);
            if (found) return found.name;
            if (cid && cid.toString().startsWith('00_0_')) return '';
            return cid;
          })
          .filter(Boolean),
          ai: char.ai ? (aiItems.find(ai => ai.id === char.ai)?.name || char.ai) : "",
          sparking: char.sparking ? (sparkingMusic.find(s => s.id === char.sparking)?.name || char.sparking) : ""
      })),
      team2: (match.team2 || []).map((char) => ({
        character: char.name || (characters.find(c => c.id === char.id)?.name || ""),
        costume: char.costume ? (costumes.find(c => c.id === char.costume)?.name || char.costume) : "",
        capsules: (char.capsules || [])
          .map((cid) => {
            const cap = capsules.find((c) => c.id === cid);
            if (cap) {
              const name = cap.name;
              const cost = Number(cap.cost || cap.Cost || 0) || 0;
              return `${name}${cost ? ` (${cost})` : ''}`;
            }
            if (cid && cid.toString().startsWith('00_0_')) return '';
            return cid;
          })
          .filter(Boolean),
          ai: char.ai ? (aiItems.find(ai => ai.id === char.ai)?.name || char.ai) : "",
          sparking: char.sparking ? (sparkingMusic.find(s => s.id === char.sparking)?.name || char.sparking) : ""
      }))
    };
    const yamlStr = yaml.dump(matchYaml, { noRefs: true, lineWidth: 120 });
    console.log("exportSingleMatch called", { matchYaml, yamlStr });
    downloadFile(`${match.name.replace(/\s+/g, "_")}.yaml`, yamlStr, "text/yaml");
    setSuccess(`Exported match ${match.name} as YAML.`);
  };

  // Helper to import a single match
  const importSingleMatch = async (event, matchId) => {
    // Clear both teams for this match before importing (5 empty slots each)
  const emptySlots = () => Array.from({ length: 5 }, () => ({ name: "", id: "", capsules: Array(7).fill(""), costume: "", ai: "", sparking: "" }));
    setMatches(prev => prev.map(m => m.id === matchId ? { ...m, team1: emptySlots(), team2: emptySlots() } : m));
    const files = event.target.files;
    if (!files || files.length === 0) return;
    for (let file of files) {
      const text = await file.text();
      try {
        const matchYaml = yaml.load(text);
        if (!matchYaml || !matchYaml.matchName) throw new Error("Invalid YAML");
        // If the YAML provides match/team display names, set them on the match object
        if (matchYaml.matchName) {
          setMatches((prev) => prev.map((m) => m.id === matchId ? { ...m, name: matchYaml.matchName } : m));
        }
        if (matchYaml.team1Name) {
          setMatches((prev) => prev.map((m) => m.id === matchId ? { ...m, team1Name: matchYaml.team1Name } : m));
        }
        if (matchYaml.team2Name) {
          setMatches((prev) => prev.map((m) => m.id === matchId ? { ...m, team2Name: matchYaml.team2Name } : m));
        }
        // Convert display names back to IDs for state
        // normalize capsule display name to strip cost suffixes like 'Name (1)'
        const normalizeCapsuleName = (s) => {
          if (!s && s !== 0) return '';
          const raw = String(s).trim();
          return raw.replace(/\s*\(\d+\)\s*$/, '').trim();
        };

        const team1 = (matchYaml.team1 || []).map((char) => {
          console.debug('importSingleMatch: team1 member ai:', char.ai, 'aiItems.length:', aiItems.length, 'resolved:', findAiIdFromValue(char.ai, aiItems));
          const nameVal = (char.character || "").toString().trim();
          const charObj = characters.find(c => (c.name || "").trim().toLowerCase() === nameVal.toLowerCase()) || { name: nameVal, id: "" };
          return {
            name: charObj.name,
            id: charObj.id,
            costume: char.costume ? (costumes.find(c => (c.name || "").trim().toLowerCase() === (char.costume || "").toString().trim().toLowerCase())?.id || "") : "",
            capsules: Array(7).fill("").map((_, i) => {
              if (char.capsules && char.capsules[i]) {
                const capNameRaw = (char.capsules[i] || "").toString().trim();
                const capName = normalizeCapsuleName(capNameRaw).toLowerCase();
                return capsules.find(c => (c.name || "").trim().toLowerCase() === capName)?.id || "";
              }
              return "";
            }),
            ai: char.ai ? findAiIdFromValue(char.ai, aiItems) : "",
            sparking: char.sparking ? (sparkingMusic.find(s => (s.name || "").trim().toLowerCase() === (char.sparking || "").toString().trim().toLowerCase())?.id || "") : ""
          };
        });
        const team2 = (matchYaml.team2 || []).map((char) => {
          console.debug('importSingleMatch: team2 member ai:', char.ai, 'aiItems.length:', aiItems.length, 'resolved:', findAiIdFromValue(char.ai, aiItems));
          const nameVal = (char.character || "").toString().trim();
          const charObj = characters.find(c => (c.name || "").trim().toLowerCase() === nameVal.toLowerCase()) || { name: nameVal, id: "" };
          return {
            name: charObj.name,
            id: charObj.id,
            costume: char.costume ? (costumes.find(c => (c.name || "").trim().toLowerCase() === (char.costume || "").toString().trim().toLowerCase())?.id || "") : "",
            capsules: Array(7).fill("").map((_, i) => {
              if (char.capsules && char.capsules[i]) {
                const capNameRaw = (char.capsules[i] || "").toString().trim();
                const capName = normalizeCapsuleName(capNameRaw).toLowerCase();
                return capsules.find(c => (c.name || "").trim().toLowerCase() === capName)?.id || "";
              }
              return "";
            }),
            ai: char.ai ? findAiIdFromValue(char.ai, aiItems) : "",
            sparking: char.sparking ? (sparkingMusic.find(s => (s.name || "").trim().toLowerCase() === (char.sparking || "").toString().trim().toLowerCase())?.id || "") : ""
          };
        });
        setMatches((prev) => prev.map((m) =>
          m.id === matchId
            ? { ...m, team1, team2 }
            : m
        ));
        // Safety-net: normalize all teams for this match (resolve names and ids)
        setMatches((prev) => prev.map((m) => {
          if (m.id !== matchId) return m;
          const resolve = (team) => team.map((ch) => {
            const out = { ...ch };
            if ((!out.name || out.name.trim() === '') && out.id) {
              out.name = (characters.find(c => c.id === out.id)?.name) || out.name || '';
            }
            if (out.costume) {
              if (!costumes.find(cs => cs.id === out.costume)) {
                const cs = costumes.find(cs => (cs.name || '').trim().toLowerCase() === (out.costume || '').toString().trim().toLowerCase());
                out.costume = cs ? cs.id : out.costume;
              }
            }
            if (out.ai && aiItems && aiItems.length > 0) {
              out.ai = findAiIdFromValue(out.ai, aiItems) || out.ai;
            }
            if (out.sparking) {
              if (!sparkingMusic.find(s => s.id === out.sparking)) {
                const sp = sparkingMusic.find(s => (s.name || '').trim().toLowerCase() === (out.sparking || '').toString().trim().toLowerCase());
                out.sparking = sp ? sp.id : out.sparking;
              }
            }
            return out;
          });
          return { ...m, team1: resolve(team1), team2: resolve(team2) };
        }));
        setSuccess(`Imported match details for match ${matchId}`);
        setError("");
        try { event.target.value = null; } catch (e) {}
      } catch (e) {
        const fname = (typeof file !== 'undefined' && file && file.name) ? file.name : 'file';
        setError("Invalid YAML file: " + fname);
        try { event.target.value = null; } catch (er) {}
        try { document.querySelectorAll('input[type=file]').forEach(i=>i.value=null); } catch(err) {}
        return;
      }
    }
  };
  const [characters, setCharacters] = useState([]);
  const [capsules, setCapsules] = useState([]);
  const [costumes, setCostumes] = useState([]);
  const [sparkingMusic, setSparkingMusic] = useState([]);
  const [aiItems, setAiItems] = useState([]);
  const [matches, setMatches] = useState([]);
  const [rulesets, setRulesets] = useState(null);
  const [activeRulesetKey, setActiveRulesetKey] = useState(null);
  const [collapsedMatches, setCollapsedMatches] = useState({});
  const [showImportModal, setShowImportModal] = useState(false);
  const [importMatchFile, setImportMatchFile] = useState(null);
  const [importItemFile, setImportItemFile] = useState(null);
  const [importMatchName, setImportMatchName] = useState(null);
  const [importItemName, setImportItemName] = useState(null);
  const [importMatchSummary, setImportMatchSummary] = useState("");
  const [importItemSummary, setImportItemSummary] = useState("");
  const [importMatchValid, setImportMatchValid] = useState(false);
  const [importItemValid, setImportItemValid] = useState(false);
  const [matchCounter, setMatchCounter] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pendingMatchSetup, setPendingMatchSetup] = useState(null);
  const [pendingItemSetup, setPendingItemSetup] = useState(null);

  // Show error for a duration, then fade it out before clearing
  const [errorFading, setErrorFading] = useState(false);
  useEffect(() => {
    if (!error) {
      setErrorFading(false);
      return;
    }
  // display duration before starting fade (ms)
  const DISPLAY_MS = 5000;
    // fade duration should match the CSS transition (ms)
    const FADE_MS = 700;

    setErrorFading(false);
    const toFade = setTimeout(() => {
      setErrorFading(true);
      // after fade completes, clear the error
      const toClear = setTimeout(() => setError(""), FADE_MS);
      // cleanup inner timeout if error changes
      return () => clearTimeout(toClear);
    }, DISPLAY_MS);

    return () => clearTimeout(toFade);
  }, [error]);

  // Show success for a duration, then fade it out before clearing
  const [successFading, setSuccessFading] = useState(false);
  useEffect(() => {
    if (!success) {
      setSuccessFading(false);
      return;
    }
  const DISPLAY_MS = 5000;
  const FADE_MS = 700;

    setSuccessFading(false);
    const toFade = setTimeout(() => {
      setSuccessFading(true);
      const toClear = setTimeout(() => setSuccess(""), FADE_MS);
      return () => clearTimeout(toClear);
    }, DISPLAY_MS);

    return () => clearTimeout(toFade);
  }, [success]);

  const matchFileRef = useRef(null);
  const itemFileRef = useRef(null);
  const importJsonRef = useRef(null);
  const modalRef = useRef(null);
  const importButtonRef = useRef(null);

  useEffect(() => {
    loadCSVFiles();
    loadRulesets();
  }, []);

  // Focus trap and keyboard handling for the import modal
  useEffect(() => {
    if (!showImportModal) {
      // restore focus to import button if available
      try { importButtonRef.current && importButtonRef.current.focus(); } catch(e){}
      return;
    }

    // when modal opens, focus the modal container
    try { if (modalRef.current) modalRef.current.focus(); } catch(e){}

    const onKeyDown = (e) => {
      if (!showImportModal) return;
      if (e.key === 'Escape') {
        setShowImportModal(false);
        e.preventDefault();
        return;
      }
      if (e.key !== 'Tab') return;
      // focus trap: keep focus within modalRef
      const root = modalRef.current;
      if (!root) return;
      const focusable = root.querySelectorAll('a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])');
      const focusableEls = Array.prototype.filter.call(focusable, (el) => !el.hasAttribute('disabled') && el.getAttribute('tabindex') !== '-1');
      if (focusableEls.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusableEls[0];
      const last = focusableEls[focusableEls.length - 1];
      const active = document.activeElement;
      if (e.shiftKey) {
        if (active === first || root === active) {
          last.focus();
          e.preventDefault();
        }
      } else {
        if (active === last) {
          first.focus();
          e.preventDefault();
        }
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [showImportModal]);

  // Fallback ruleset used when capsule-rules.yaml cannot be loaded or parsed.
  // This represents the "no rules" behavior the site had before rulesets existed.
  const FALLBACK_RULES = {
    default: 'none',
    rulesets: {
      none: {
        metadata: { name: 'No rules (fallback)', description: 'No restrictions - legacy behavior' },
        scope: 'none',
        mode: 'soft',
        totalCost: 0,
        restrictions: []
      }
    }
  };

  const loadRulesets = async () => {
    try {
      // Try a few sensible locations so the app works when hosted at
      // the site root or under a repo subpath (e.g. GitHub Pages /<repo>/)
      const candidates = [];
      try { candidates.push(new URL('capsule-rules.yaml', window.location.href).href); } catch (e) {}
      if (import.meta && import.meta.env && import.meta.env.BASE_URL) {
        try { candidates.push(new URL('capsule-rules.yaml', import.meta.env.BASE_URL).href); } catch(e) {}
      }
      candidates.push('/capsule-rules.yaml');
      candidates.push('capsule-rules.yaml');

      let txt = null;
      for (const url of candidates) {
        try {
          const res = await fetch(url);
          if (!res.ok) continue;
          const t = await res.text();
          const tTrim = (t || '').trim();
          // If the fetch returned an HTML page (e.g. GitHub Pages 404), skip it
          if (tTrim.startsWith('<!DOCTYPE') || tTrim.startsWith('<html') || tTrim.includes('<title>Site not found') || tTrim.includes('<h1>404')) {
            console.warn('Skipping non-YAML response when loading rules from', url);
            continue;
          }
          txt = t;
          break;
        } catch (err) {
          // try next candidate
          continue;
        }
      }

      if (!txt) {
        // no file found, use fallback
        setRulesets(FALLBACK_RULES);
        setActiveRulesetKey(FALLBACK_RULES.default || Object.keys(FALLBACK_RULES.rulesets)[0]);
        return;
      }

      let parsed = null;
      try {
        parsed = yaml.load(txt);
      } catch (e) {
        console.warn('Failed to parse capsule-rules.yaml, using fallback', e);
        setRulesets(FALLBACK_RULES);
        setActiveRulesetKey(FALLBACK_RULES.default || Object.keys(FALLBACK_RULES.rulesets)[0]);
        return;
      }

      if (!parsed || !parsed.rulesets) {
        // invalid format -> fallback
        setRulesets(FALLBACK_RULES);
        setActiveRulesetKey(FALLBACK_RULES.default || Object.keys(FALLBACK_RULES.rulesets)[0]);
        return;
      }

      setRulesets(parsed || null);
      setActiveRulesetKey((parsed && parsed.default) ? parsed.default : Object.keys(parsed?.rulesets || {})[0] || null);
    } catch (e) {
      console.error('Failed to load capsule rules', e);
      setRulesets(null);
      setActiveRulesetKey(null);
    }
  };

  const loadCSVFiles = async () => {
    try {
      await Promise.all([loadCharacters(), loadCapsules()]);
      setLoading(false);
    } catch (err) {
      setError("Error loading CSV files. Please upload them manually.");
      setLoading(false);
    }
  };

  const loadCharacters = async () => {
    try {
      const response = await fetch("characters.csv");
      const text = await response.text();
      const lines = text.split("\n");
      const chars = [];
      const seenIds = new Set();

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) {
          const [name, id] = line.split(",");
          if (name && id) {
            const cleanId = id.replace(/"/g, "").trim();
            const cleanName = name.replace(/"/g, "").trim();
            
            // Skip duplicates based on ID
            if (!seenIds.has(cleanId)) {
              seenIds.add(cleanId);
              chars.push({
                name: cleanName,
                id: cleanId,
              });
            }
          }
        }
      }
      setCharacters(chars);
    } catch (err) {
      console.error("Failed to load characters:", err);
    }
  };

  const loadCapsules = async () => {
    try {
      const response = await fetch("capsules.csv");
      const text = await response.text();
      // Split CSV into rows while respecting quoted newlines.
      // Build rows by scanning characters and toggling inQuotes when encountering unescaped quotes.
      const rows = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        // handle CR (ignore)
        if (ch === '\r') continue;
        if (ch === '"') {
          // handle escaped double-quote ""
          const next = text[i + 1];
          if (next === '"') {
            // keep escaped quote pair as two quotes inside field
            cur += '""';
            i++; // skip next
            continue;
          }
          inQuotes = !inQuotes;
          cur += '"';
          continue;
        }
        if (ch === '\n' && !inQuotes) {
          rows.push(cur);
          cur = '';
          continue;
        }
        cur += ch;
      }
      if (cur !== '') rows.push(cur);
      const lines = rows;
      const caps = [];
      const costs = [];
      const ai = [];
      const sparking = [];
      // helper to split CSV line respecting quoted fields with commas
      const splitLine = (line) => {
        const res = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') {
            inQuotes = !inQuotes;
            continue;
          }
          if (ch === ',' && !inQuotes) {
            res.push(cur);
            cur = '';
            continue;
          }
          cur += ch;
        }
        res.push(cur);
        return res.map(s => s.trim());
      };

      for (let i = 1; i < lines.length; i++) {
        // do not aggressively trim the whole line because effect fields may include intentional leading/trailing whitespace/newlines
        const line = lines[i];
        if (!line || line.trim() === '') continue;
        const parts = splitLine(line);
        if (parts.length >= 3) {
          const rawName = parts[0] || '';
          const rawId = parts[1] || '';
          const rawType = parts[2] || '';
          const item = {
            name: rawName.replace(/"/g, "").trim(),
            id: rawId.replace(/"/g, "").trim(),
            type: rawType.replace(/"/g, "").trim(),
            exclusiveFor: parts[3] ? parts[3].replace(/"/g, "").trim() : '',
            // normalize cost: accept header named Cost or cost or last numeric column
            cost: 0,
            effect: parts[5] ? parts[5].replace(/"/g, "").trim() : (parts[4] ? parts[4].replace(/"/g, "").trim() : ''),
          };

          // try to parse cost from known columns
          const maybeCost = parts[4] ? parts[4].replace(/"/g, "").trim() : '';
          const num = Number(maybeCost);
          if (!isNaN(num) && maybeCost !== '') {
            item.cost = num;
          } else {
            // try to extract a number from the Effect column if present
            const costMatch = (item.effect || '').match(/(\d+)/);
            if (costMatch) item.cost = Number(costMatch[1]);
          }

          if (item.type === "Capsule") caps.push(item);
          else if (item.type === "Costume") costs.push(item);
          else if (item.type === "AI") ai.push(item);
          else if ((item.type || '').toString().trim() === 'Sparking BGM') {
            sparking.push(item);
          }
        }
      }
      setCapsules(caps);
      setCostumes(costs);
      setAiItems(ai);
      setSparkingMusic(sparking);
    } catch (err) {
      console.error("Failed to load capsules:", err);
    }
  };

    // Helper: find AI id from either display name or id (case-insensitive, trimmed)
    const findAiIdFromValue = (val) => {
      if (!val && val !== 0) return "";
      const s = String(val).trim();
      if (!s) return "";
      // direct id match
      const byId = aiItems.find((a) => a.id === s);
      if (byId) return byId.id;
      // case-insensitive name match
      const lower = s.toLowerCase();
      const byName = aiItems.find((a) => (a.name || "").trim().toLowerCase() === lower);
      return byName ? byName.id : "";
    };

  const addMatch = () => {
    const newMatch = {
      id: matchCounter,
      name: `Match ${matchCounter}`,
      team1: [],
      team2: [],
      team1Name: "Team 1",
      team2Name: "Team 2",
    };
    setMatches([...matches, newMatch]);
    setMatchCounter(matchCounter + 1);
  };

  const duplicateMatch = (matchId) => {
    const original = matches.find((m) => m.id === matchId);
    if (!original) return;

    const duplicated = {
      id: matchCounter,
      name: `${original.name} (Copy)`,
      team1Name: original.team1Name,
      team2Name: original.team2Name,
      team1: original.team1.map((char) => ({
        ...char,
        capsules: [...char.capsules],
      })),
      team2: original.team2.map((char) => ({
        ...char,
        capsules: [...char.capsules],
      })),
    };
    setMatches([...matches, duplicated]);
    setMatchCounter(matchCounter + 1);
  };

  const removeMatch = (matchId) => {
    setMatches(matches.filter((m) => m.id !== matchId));
  };

  const clearAllMatches = () => {
    if (window.confirm("Clear all matches?")) {
      setMatches([]);
      setMatchCounter(1);
    }
  };

  const addCharacter = (matchId, teamName) => {
    setMatches(
      matches.map((match) => {
        if (match.id === matchId) {
          const team = match[teamName];
          if (team.length >= 5) {
            alert("Maximum 5 characters per team");
            return match;
          }
          return {
            ...match,
            [teamName]: [
              ...team,
              {
                name: "",
                id: "",
                capsules: Array(7).fill(""),
                costume: "",
                ai: "",
              },
            ],
          };
        }
        return match;
      })
    );
  };

  const removeCharacter = (matchId, teamName, index) => {
    setMatches(
      matches.map((match) => {
        if (match.id === matchId) {
          return {
            ...match,
            [teamName]: match[teamName].filter((_, i) => i !== index),
          };
        }
        return match;
      })
    );
  };

  const updateCharacter = (matchId, teamName, index, field, value) => {
    setMatches(
      matches.map((match) => {
        if (match.id === matchId) {
          const team = [...match[teamName]];
          team[index] = { ...team[index], [field]: value };

          if (field === "id") {
            const char = characters.find((c) => c.id === value);
            if (char) {
              team[index].name = char.name;
              team[index].costume = "";
            }
          }

          return { ...match, [teamName]: team };
        }
        return match;
      })
    );
  };

  // Replace entire character slot atomically to avoid merge/race conditions
  const replaceCharacter = (matchId, teamName, index, slotObj) => {
    setMatches(prev => prev.map(match => {
      if (match.id !== matchId) return match;
      const team = [...match[teamName]];

      // Normalize the incoming slot object to ensure predictable shape
      const normalized = {
        name: slotObj?.name || "",
        id: slotObj?.id || "",
        costume: slotObj?.costume || "",
        ai: slotObj?.ai || "",
        sparking: slotObj?.sparking || "",
        capsules: Array.isArray(slotObj?.capsules)
          ? slotObj.capsules.map((c) => (c || ""))
          : Array(7).fill("")
      };

      // Guarantee exactly 7 capsule slots
      if (normalized.capsules.length < 7) {
        normalized.capsules = [...normalized.capsules, ...Array(7 - normalized.capsules.length).fill("")];
      } else if (normalized.capsules.length > 7) {
        normalized.capsules = normalized.capsules.slice(0, 7);
      }

      if (index < 0) return match;

      // If the team array is shorter than the target index, extend with empty slots
      while (index >= team.length) {
        team.push({ name: "", id: "", capsules: Array(7).fill(""), costume: "", ai: "", sparking: "" });
      }
      // Debug: log previous and new slot for visibility when importing
      // replaceCharacter performed (debug logs removed)

      team[index] = normalized;
      return { ...match, [teamName]: team };
    }));
  };

  const updateCapsule = (matchId, teamName, charIndex, capsuleIndex, value) => {
    setMatches(
      matches.map((match) => {
        if (match.id === matchId) {
          const team = [...match[teamName]];
          team[charIndex].capsules[capsuleIndex] = value;
          return { ...match, [teamName]: team };
        }
        return match;
      })
    );
  };

  // Allow renaming a match
  const updateMatchName = (matchId, newName) => {
    setMatches((prev) => prev.map((m) => (m.id === matchId ? { ...m, name: newName } : m)));
  };

  // Allow renaming a team's display name (team1Name / team2Name)
  const updateTeamDisplayName = (matchId, teamKey, newName) => {
    // teamKey expected to be 'team1' or 'team2'
    const field = teamKey === 'team1' ? 'team1Name' : 'team2Name';
    setMatches((prev) => prev.map((m) => (m.id === matchId ? { ...m, [field]: newName } : m)));
  };

  const exportMatches = () => {
    if (matches.length === 0) {
      alert("No matches to export");
      return;
    }

    const matchSetup = generateMatchSetup();
    const itemSetup = generateItemSetup();

    downloadFile("MatchSetup.json", JSON.stringify(matchSetup, null, 2));
    downloadFile("ItemSetup.json", JSON.stringify(itemSetup, null, 2));
    setSuccess("Exported MatchSetup.json and ItemSetup.json");
  };

  const generateMatchSetup = () => {
    const setup = { matchCount: {} };

    matches.forEach((match, index) => {
      setup.matchCount[index + 1] = {
        targetTeaming: {
          com1: {
            teamMembers: Array(5)
              .fill()
              .map((_, i) => ({
                key: match.team1[i]?.id || "None",
              })),
            comLevel: "High",
          },
          com2: {
            teamMembers: Array(5)
              .fill()
              .map((_, i) => ({
                key: match.team2[i]?.id || "None",
              })),
            comLevel: "High",
          },
          player: {
            teamMembers: Array(5)
              .fill()
              .map(() => ({ key: "None" })),
            comLevel: "Middle",
          },
          player2: {
            teamMembers: Array(5)
              .fill()
              .map(() => ({ key: "None" })),
            comLevel: "Middle",
          },
        },
      };
    });

    return setup;
  };

  const generateItemSetup = () => {
    const setup = { matchCount: {} };

    matches.forEach((match, index) => {
      setup.matchCount[index + 1] = { customize: {} };

      const allChars = [...match.team1, ...match.team2];
      const uniqueChars = {};

      allChars.forEach((char) => {
        if (char.id && char.id !== "") {
          uniqueChars[char.id] = char;
        }
      });

      Object.values(uniqueChars).forEach((char) => {
        const key = `(Key="${char.id}")`;
        const allItems = [];

        if (char.costume) allItems.push({ key: char.costume });
        allItems.push(
          ...char.capsules.filter((c) => c).map((c) => ({ key: c }))
        );
        if (char.ai) allItems.push({ key: char.ai });
        if (char.sparking) allItems.push({ key: char.sparking });

        if (allItems.length === 0) allItems.push({ key: "None" });

        const inTeam1 = match.team1.some((t) => t.id === char.id);
        const inTeam2 = match.team2.some((t) => t.id === char.id);

        setup.matchCount[index + 1].customize[key] = {
          targetSettings: [
            { equipItems: [{ key: "None" }], sameCharacterEquip: [] },
            { equipItems: [{ key: "None" }], sameCharacterEquip: [] },
            {
              equipItems: inTeam1 ? allItems : [{ key: "None" }],
              sameCharacterEquip: [],
            },
            {
              equipItems: inTeam2 ? allItems : [{ key: "None" }],
              sameCharacterEquip: [],
            },
          ],
        };
      });
    });

    return setup;
  };

  const handleImportMatches = async (event) => {
    // New flow: use import modal upload areas instead (backwards-compatible)
    // If user supplied files via the old single input, attempt to detect which is which
    const files = Array.from(event.target?.files || []);
    let matchJson = importMatchFile;
    let itemJson = importItemFile;
    for (let file of files) {
      try {
        const txt = await file.text();
        const json = JSON.parse(txt);
        if (json.matchCount) {
          const isItemSetup = Object.values(json.matchCount)[0]?.customize !== undefined;
          if (isItemSetup) itemJson = json;
          else matchJson = json;
        }
      } catch (err) {
        // ignore invalid files here; user will be notified if both aren't provided
      }
    }
    if (!matchJson || !itemJson) {
      setError("Please provide both MatchSetup and ItemSetup JSON (use the Import Matches dialog).");
      return;
    }
    try {
      importFromJsonObjects(matchJson, itemJson);
      setSuccess("Imported matches from JSON files.");
      setError("");
      setImportMatchFile(null);
      setImportItemFile(null);
      setShowImportModal(false);
    } catch (err) {
      console.error('import error', err);
      setError('Failed to import JSON files');
    }
  };

  // Central importer that operates on parsed JSON objects (matchSetup, itemSetup)
  const importFromJsonObjects = (matchSetup, itemSetup) => {
    // Parse matches
    const newMatches = Object.entries(matchSetup.matchCount).map(([key, matchData], idx) => {
      const team1 = matchData.targetTeaming.com1.teamMembers
        .map((m) => ({
          id: m.key !== "None" ? m.key : "",
          name: m.key !== "None" ? (characters.find(c => c.id === m.key)?.name || "") : "",
          capsules: Array(7).fill(""),
          costume: "",
          ai: "",
          sparking: "",
        }))
        .filter((char) => char.id !== "");
      const team2 = matchData.targetTeaming.com2.teamMembers
        .map((m) => ({
          id: m.key !== "None" ? m.key : "",
          name: m.key !== "None" ? (characters.find(c => c.id === m.key)?.name || "") : "",
          capsules: Array(7).fill(""),
          costume: "",
          ai: "",
          sparking: "",
        }))
        .filter((char) => char.id !== "");
      return {
        id: idx + 1,
        name: `Match ${idx + 1}`,
        team1,
        team2,
        team1Name: "Team 1",
        team2Name: "Team 2",
      };
    });
    // Fill in items from itemSetup
    Object.entries(itemSetup.matchCount).forEach(([key, matchData], idx) => {
      const customize = matchData.customize;
      Object.entries(customize).forEach(([charKey, charData]) => {
        const charId = charKey.match(/Key="(.*?)"/)[1];
        // Find character in team1 or team2
        for (let team of [newMatches[idx].team1, newMatches[idx].team2]) {
          const char = team.find((c) => c.id === charId);
          if (char) {
            // Fill items (capsules, costume, ai, sparking)
            const settings = charData.targetSettings[2].equipItems.concat(charData.targetSettings[3].equipItems);
            let capsules = [];
            let costume = "";
            let ai = "";
            let sparking = "";
            settings.forEach((item) => {
              if (!item.key || item.key === "None") return;
              if (item.key.startsWith("00_1_")) costume = item.key;
              else if (item.key.startsWith("00_7_")) ai = item.key;
              else if (item.key.startsWith("00_6_")) sparking = item.key;
              else capsules.push(item.key);
            });
            char.capsules = [...capsules, ...Array(7 - capsules.length).fill("")].slice(0, 7);
            char.costume = costume;
            char.ai = ai;
            char.sparking = sparking;
          }
        }
      });
    });
    // Safety-net normalize names and ids
    const normalized = newMatches.map((m) => ({
      ...m,
      team1: m.team1.map((ch) => normalizeImportedChar(ch)),
      team2: m.team2.map((ch) => normalizeImportedChar(ch)),
    }));
    setMatches(normalized);
  };

  // Simple validators that return { valid: boolean, summary: string }
  const validateMatchSetup = (obj) => {
    if (!obj || typeof obj !== 'object' || !obj.matchCount) return { valid: false, summary: 'Missing matchCount' };
    const count = Object.keys(obj.matchCount || {}).length;
    return { valid: true, summary: `Match Count: ${count}` };
  };

  const validateItemSetup = (obj) => {
    if (!obj || typeof obj !== 'object' || !obj.matchCount) return { valid: false, summary: 'Missing matchCount' };
    // Use top-level matchCount length as the canonical match count for ItemSetup
    const count = Object.keys(obj.matchCount || {}).length;
    return { valid: true, summary: `Match Count: ${count}` };
  };

  const normalizeImportedChar = (out) => {
    const res = { ...out };
    if ((!res.name || res.name.trim() === '') && res.id) {
      res.name = (characters.find(c => c.id === res.id)?.name) || res.name || '';
    }
    if (res.costume) {
      if (!costumes.find(cs => cs.id === res.costume)) {
        const cs = costumes.find(cs => (cs.name || '').trim().toLowerCase() === (res.costume || '').toString().trim().toLowerCase());
        res.costume = cs ? cs.id : res.costume;
      }
    }
    if (res.ai && aiItems && aiItems.length > 0) {
      res.ai = findAiIdFromValue(res.ai, aiItems) || res.ai;
    }
    if (res.sparking) {
      if (!sparkingMusic.find(s => s.id === res.sparking)) {
        const sp = sparkingMusic.find(s => (s.name || '').trim().toLowerCase() === (res.sparking || '').toString().trim().toLowerCase());
        res.sparking = sp ? sp.id : res.sparking;
      }
    }
    return res;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-700 via-slate-600 to-slate-700 p-4 flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="w-12 h-12 text-orange-400 animate-pulse mx-auto mb-4" />
          <div className="text-white text-2xl font-bold tracking-wider">Loading data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-700 via-slate-600 to-slate-700 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl p-6 shadow-xl mb-6 border-2 border-orange-400 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-400/5 to-orange-400/10"></div>
          <div className="relative z-10">
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-300 via-orange-400 to-orange-300 text-center mb-1 tracking-tight drop-shadow-lg">
              DRAGON BALL Z LEAGUE
            </h1>
            <p className="text-xl font-bold text-blue-300 text-center tracking-widest drop-shadow">
              SPARKING! ZERO MATCH BUILDER
            </p>
          </div>
        </div>

        {error && (
          <div className={`bg-red-600 border-2 border-red-700 text-white px-4 py-3 rounded-xl mb-4 font-semibold shadow-lg transition-opacity duration-700 ${errorFading ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div className={`bg-green-600 border-2 border-green-700 text-white px-4 py-3 rounded-xl mb-4 font-semibold shadow-lg transition-opacity duration-700 ${successFading ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            ✓ {success}
          </div>
        )}

        <div className="flex flex-wrap justify-center gap-3 mb-6">
          <button
            onClick={addMatch}
            className="bg-gradient-to-r from-orange-600 to-orange-700 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transform hover:scale-105 transition-all border border-orange-500"
          >
            <span className="flex items-center">
              <Plus className="mr-2" size={18} />
              <span className="hidden sm:inline">ADD MATCH</span>
            </span>
          </button>
          <button
            onClick={exportMatches}
            className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transform hover:scale-105 transition-all border border-green-500"
          >
            <span className="flex items-center">
              <Download className="mr-2" size={18} />
              <span className="hidden sm:inline">EXPORT ALL</span>
            </span>
          </button>
          <button
            onClick={clearAllMatches}
            className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transform hover:scale-105 transition-all border border-red-500"
          >
            <span className="flex items-center">
              <Trash2 className="mr-2" size={18} />
              <span className="hidden sm:inline">CLEAR ALL</span>
            </span>
          </button>
          <button
            ref={importButtonRef}
            onClick={() => setShowImportModal(true)}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transform hover:scale-105 transition-all border border-blue-500 flex items-center"
          >
            <Upload className="mr-2" size={18} />
            <span className="hidden sm:inline">IMPORT MATCHES</span>
          </button>
        </div>
        {showImportModal && createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            {/* overlay */}
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowImportModal(false)} />
            {/* modal content */}
            <div className="relative z-10 w-full max-w-2xl mx-auto">
              <div ref={modalRef} tabIndex={-1} className="bg-slate-800 rounded-xl p-6" role="dialog" aria-modal="true" aria-label="Import Matches dialog">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-white">Import Matches</h3>
                  <button onClick={() => setShowImportModal(false)} className="text-slate-300 hover:text-white">Close</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded bg-slate-700 border border-slate-600">
                    <div className="text-sm text-slate-300 mb-2">MatchSetup JSON</div>
                    {/* hidden real file input for accessibility */}
                    <input
                      ref={matchFileRef}
                      type="file"
                      accept="application/json"
                      className="hidden"
                      onChange={async (ev) => {
                        const file = ev.target.files && ev.target.files[0]; if (!file) return;
                        try {
                          const txt = await file.text(); const parsed = JSON.parse(txt);
                          const v = validateMatchSetup(parsed);
                          setImportMatchFile(parsed);
                          setImportMatchName(file.name || 'MatchSetup');
                          setImportMatchValid(v.valid);
                          setImportMatchSummary(v.summary);
                          if (!v.valid) setError('MatchSetup JSON appears invalid');
                        } catch(err){ setError('Invalid JSON for MatchSetup'); }
                        try { ev.target.value = null; } catch(_) {}
                      }}
                    />
                    <div
                      onDrop={async (e) => {
                        e.preventDefault();
                        const f = e.dataTransfer.files[0];
                        if (!f) return;
                        try {
                          const txt = await f.text(); const parsed = JSON.parse(txt);
                          const v = validateMatchSetup(parsed);
                          setImportMatchFile(parsed);
                          setImportMatchName(f.name || 'MatchSetup');
                          setImportMatchValid(v.valid);
                          setImportMatchSummary(v.summary);
                          if (!v.valid) setError('MatchSetup JSON appears invalid');
                        } catch(err){ setError('Invalid JSON for MatchSetup'); }
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      className="h-36 flex items-center justify-center bg-slate-800 border-2 border-dashed border-slate-600 rounded cursor-pointer text-center px-3"
                      onClick={() => { try { matchFileRef.current && matchFileRef.current.click(); } catch(e){} }}
                      tabIndex={0}
                      role="button"
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); try { matchFileRef.current && matchFileRef.current.click(); } catch(err){} } }}
                    >
                      <div className="text-slate-400">Drop MatchSetup.json here or click to select</div>
                    </div>
                    {importMatchFile && <div className="mt-2 text-xs">
                      <div className={importMatchValid ? 'text-emerald-400' : 'text-amber-400'}>{importMatchValid ? 'Valid MatchSetup' : 'Invalid MatchSetup'}</div>
                      <div className="text-slate-300 text-xs mt-1">{importMatchSummary}</div>
                      <div className="text-slate-400 text-xs mt-1">{importMatchName}</div>
                    </div>}
                  </div>
                  <div className="p-4 rounded bg-slate-700 border border-slate-600">
                    <div className="text-sm text-slate-300 mb-2">ItemSetup JSON</div>
                    {/* hidden real file input for accessibility */}
                    <input
                      ref={itemFileRef}
                      type="file"
                      accept="application/json"
                      className="hidden"
                      onChange={async (ev) => {
                        const file = ev.target.files && ev.target.files[0]; if (!file) return;
                        try {
                          const txt = await file.text(); const parsed = JSON.parse(txt);
                          const v = validateItemSetup(parsed);
                          setImportItemFile(parsed);
                          setImportItemName(file.name || 'ItemSetup');
                          setImportItemValid(v.valid);
                          setImportItemSummary(v.summary);
                          if (!v.valid) setError('ItemSetup JSON appears invalid');
                        } catch(err){ setError('Invalid JSON for ItemSetup'); }
                        try { ev.target.value = null; } catch(_) {}
                      }}
                    />
                    <div
                      onDrop={async (e) => {
                        e.preventDefault();
                        const f = e.dataTransfer.files[0];
                        if (!f) return;
                        try {
                          const txt = await f.text(); const parsed = JSON.parse(txt);
                          const v = validateItemSetup(parsed);
                          setImportItemFile(parsed);
                          setImportItemName(f.name || 'ItemSetup');
                          setImportItemValid(v.valid);
                          setImportItemSummary(v.summary);
                          if (!v.valid) setError('ItemSetup JSON appears invalid');
                        } catch(err){ setError('Invalid JSON for ItemSetup'); }
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      className="h-36 flex items-center justify-center bg-slate-800 border-2 border-dashed border-slate-600 rounded cursor-pointer text-center px-3"
                      onClick={() => { try { itemFileRef.current && itemFileRef.current.click(); } catch(e){} }}
                      tabIndex={0}
                      role="button"
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); try { itemFileRef.current && itemFileRef.current.click(); } catch(err){} } }}
                    >
                      <div className="text-slate-400">Drop ItemSetup.json here or click to select</div>
                    </div>
                    {importItemFile && <div className="mt-2 text-xs">
                      <div className={importItemValid ? 'text-emerald-400' : 'text-amber-400'}>{importItemValid ? 'Valid ItemSetup' : 'Invalid ItemSetup'}</div>
                      <div className="text-slate-300 text-xs mt-1">{importItemSummary}</div>
                      <div className="text-slate-400 text-xs mt-1">{importItemName}</div>
                    </div>}
                  </div>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button onClick={() => { setImportMatchFile(null); setImportItemFile(null); }} className="px-4 py-2 rounded bg-slate-700 text-white">Clear</button>
                  <button onClick={() => {
                    if (!importMatchFile || !importItemFile) { setError('Please load both files before importing'); return; }
                    try { importFromJsonObjects(importMatchFile, importItemFile); setShowImportModal(false); setSuccess('Imported matches from JSON files.'); setImportMatchFile(null); setImportItemFile(null); }
                    catch(e){ setError('Import failed'); }
                  }} className="px-4 py-2 rounded bg-emerald-600 text-white">Import</button>
                </div>
              </div>
            </div>
          </div>, document.body)
        }
        <div className="flex justify-center mb-4 items-center gap-3">
          <div className="text-sm text-slate-300">Ruleset:</div>
          <div className="text-sm bg-slate-800 border border-slate-600 px-2 py-1 rounded-lg">
            {/* Use the shared Combobox for consistent styling */}
            {(typeof rulesets !== 'undefined' && rulesets && rulesets.rulesets) ? (
              <RulesetSelector
                rulesets={rulesets}
                activeKey={activeRulesetKey}
                onChange={(k) => setActiveRulesetKey(k)}
              />
            ) : (
              <div className="text-slate-400 px-2 py-1">No capsule rules loaded</div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {matches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              characters={characters}
              capsules={capsules}
              costumes={costumes}
              sparkingMusic={sparkingMusic}
              aiItems={aiItems}
              rulesets={rulesets || null}
              activeRulesetKey={activeRulesetKey}
              onDuplicate={() => duplicateMatch(match.id)}
              onRemove={() => removeMatch(match.id)}
              onAddCharacter={(teamName) => addCharacter(match.id, teamName)}
              onRemoveCharacter={(teamName, index) =>
                removeCharacter(match.id, teamName, index)
              }
              onUpdateCharacter={(teamName, index, field, value) =>
                updateCharacter(match.id, teamName, index, field, value)
              }
              onReplaceCharacter={(teamName, index, slotObj) => replaceCharacter(match.id, teamName, index, slotObj)}
              onUpdateCapsule={(teamName, charIndex, capsuleIndex, value) =>
                updateCapsule(
                  match.id,
                  teamName,
                  charIndex,
                  capsuleIndex,
                  value
                )
              }
              collapsed={collapsedMatches[match.id] || false}
              onToggleCollapse={() => setCollapsedMatches((prev) => ({ ...prev, [match.id]: !prev[match.id] }))}
              exportSingleMatch={exportSingleMatch}
              importSingleMatch={importSingleMatch}
              exportSingleTeam={exportSingleTeam}
              importSingleTeam={importSingleTeam}
              onRenameMatch={(newName) => updateMatchName(match.id, newName)}
              onRenameTeam1={(newName) => updateTeamDisplayName(match.id, 'team1', newName)}
              onRenameTeam2={(newName) => updateTeamDisplayName(match.id, 'team2', newName)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// Small accessible Combobox component (keyboard navigation, filtering)
const Combobox = ({
  valueId,
  items,
  placeholder,
  onSelect, // (id, name)
  getName = (it) => it.name,
  disabled = false,
  renderItemRight = null,
  renderValueRight = null,
  // whether this combobox should show the effect tooltip on hover/focus
  showTooltip = true,
}) => {
  const [input, setInput] = useState(() => {
    const found = items.find((it) => it.id === valueId);
    return found ? getName(found) : "";
  });

  // Small selector component that wraps Combobox for rulesets
  // (ruleset selector moved to top-level RulesetSelector for proper hoisting)
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const found = items.find((it) => it.id === valueId);
    // If we have a matching item, show its name; otherwise clear the input so stale names don't persist
    setInput(found ? getName(found) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueId, items]);

  const filtered = input
    ? items.filter((it) => getName(it).toLowerCase().includes(input.toLowerCase()))
    : items.slice(0, 50);

  const selectedItem = items.find((it) => it.id === valueId);
  // Tooltip state for showing item effects on hover/focus
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [tooltipContent, setTooltipContent] = useState("");
  const tooltipTimer = useRef(null);
  const blurTimer = useRef(null);
  const selectedHoverNodeRef = useRef(null);
  const lastShowRef = useRef(0);
  const currentTooltipRef = useRef(null);
  const myComboboxId = useRef(typeof window !== 'undefined' ? (window.__combobox_id_counter = (window.__combobox_id_counter || 0) + 1) : Math.random());
  const { x: tx, y: ty, strategy: tStrategy, refs: tRefs, floatingStyles: tFloatingStyles, update: tUpdate } = useFloating({
    placement: 'top',
    middleware: [offset(8), flip()],
    whileElementsMounted: autoUpdate,
  });

  const showTooltipFor = (el, content) => {
    // Force any other combobox instances to hide their tooltips immediately
    try { if (typeof document !== 'undefined') document.dispatchEvent(new CustomEvent('combobox:hide-all')); } catch(e){}
    if (!el) return;
    // Always clear any pending tooltip timers immediately
    if (tooltipTimer.current) {
      clearTimeout(tooltipTimer.current);
      tooltipTimer.current = null;
    }
    if (blurTimer.current) {
      clearTimeout(blurTimer.current);
      blurTimer.current = null;
    }
    // choose a stable DOM node to anchor the tooltip
    const node = (el && (el.nodeType ? el : (el.current || null))) || null;
    const attached = node && typeof document !== 'undefined' && document.body.contains(node);
    const refNode = attached ? node : (inputRef.current || node);
  currentTooltipRef.current = refNode;
  // mark this combobox as the globally active tooltip owner
  try { if (typeof window !== 'undefined') window.__combobox_activeId = myComboboxId.current; } catch (e) {}
    setTooltipContent(content || "");
    lastShowRef.current = Date.now();
    try { tRefs.setReference(refNode); } catch (e) {}
    setTooltipOpen(true);
    // schedule update after refs settle
    try { if (typeof tUpdate === 'function') setTimeout(() => { try { tUpdate(); } catch(e){} }, 0); } catch(e){}
  };

  // Listen for a global 'hide all' event so any combobox can force other
  // instances to immediately hide their tooltips. This is used to prevent
  // overlapping tooltips when quickly moving the pointer across controls.
  React.useEffect(() => {
    const handler = () => { try { hideTooltipNow(); } catch(e){} };
    try { document.addEventListener('combobox:hide-all', handler); } catch(e){}
    return () => { try { document.removeEventListener('combobox:hide-all', handler); } catch(e){} };
  }, []);

  // Listen for the global 'close all comboboxes' event to ensure only one combobox is open at a time
  React.useEffect(() => {
    const handler = (event) => {
      try {
        if (event.detail?.except !== myComboboxId.current) {
          closeList();
        }
      } catch(e){}
    };
    try { window.addEventListener('close-all-comboboxes', handler); } catch(e){}
    return () => { try { window.removeEventListener('close-all-comboboxes', handler); } catch(e){} };
  }, []);

  const hideTooltipSoon = (delay = 120) => {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    tooltipTimer.current = setTimeout(() => {
      // if another combobox has become active since this hide was scheduled, allow hide immediately
      try { if (typeof window !== 'undefined' && window.__combobox_activeId && window.__combobox_activeId !== myComboboxId.current) {
        // another combobox is active; proceed to hide
      } } catch(e){}
      // If the selected-value is currently hovered, and it's the same node the tooltip
      // is anchored to, abort hiding to avoid flicker
      if (selectedHoverNodeRef.current) {
        if (currentTooltipRef.current && currentTooltipRef.current === selectedHoverNodeRef.current) {
          tooltipTimer.current = null;
          return;
        }
      }
      // If a tooltip was shown very recently, avoid hiding immediately (anti-flicker)
      const now = Date.now();
      if (lastShowRef.current && (now - lastShowRef.current) < 300) {
        tooltipTimer.current = null;
        return;
      }
      setTooltipOpen(false);
      setTooltipContent("");
      currentTooltipRef.current = null;
      tooltipTimer.current = null;
    }, delay);
  };

  const hideTooltipNow = () => {
    if (tooltipTimer.current) { clearTimeout(tooltipTimer.current); tooltipTimer.current = null; }
    if (blurTimer.current) { clearTimeout(blurTimer.current); blurTimer.current = null; }
    currentTooltipRef.current = null;
    try { if (typeof window !== 'undefined' && window.__combobox_activeId === myComboboxId.current) window.__combobox_activeId = null; } catch(e){}
    setTooltipOpen(false);
    setTooltipContent("");
  };

  // Floating UI: robust positioning, flipping, and auto-updates
  const { x, y, strategy, refs, update, floatingStyles } = useFloating({
    placement: 'bottom-start',
    middleware: [
      offset(6),
      flip(),
      shift(),
      size({
        apply({ rects, availableHeight, elements }) {
          Object.assign(elements.floating.style, {
            width: `${rects.reference.width}px`,
            maxHeight: `${Math.min(availableHeight, 400)}px`,
            overflow: 'auto',
          });
        },
      }),
    ],
    whileElementsMounted: autoUpdate,
  });


  const openList = () => {
    if (!disabled) {
      // Close any other open comboboxes before opening this one
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('close-all-comboboxes', { detail: { except: myComboboxId.current } }));
      }
      setOpen(true);
    }
  };

  const closeList = () => {
    setOpen(false);
    setHighlight(-1);
  };

  const commitSelection = (item) => {
    if (item) {
      setInput(getName(item));
      onSelect(item.id, getName(item));
    } else {
      // no match -> clear
      setInput("");
      onSelect('', '');
    }
    closeList();
    // hide tooltip immediately on selection to avoid dangling/tooltips at 0,0
    try { hideTooltipNow(); } catch (e) {}
    inputRef.current?.blur();
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      openList();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      openList();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (open && highlight >= 0 && highlight < filtered.length) {
        commitSelection(filtered[highlight]);
      } else {
        // try exact match
        const exact = items.find((it) => getName(it).toLowerCase() === input.toLowerCase());
        commitSelection(exact || null);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeList();
    }
  };

  // keep floating position updated when open
  useEffect(() => {
    if (!open) return;
    // ensure reference is registered
    try { refs.setReference?.(inputRef.current); } catch (e) {}
    // update() will be called automatically by autoUpdate, but call once to be sure
    if (typeof update === 'function') update();
  }, [open, refs, update]);

  // When highlight changes due to keyboard navigation, ensure the highlighted
  // list item is scrolled into view and (if enabled) show the tooltip for it.
  useEffect(() => {
    if (!open || highlight < 0) {
      if (showTooltip) hideTooltipSoon();
      return;
    }
    // find the rendered list container (portal floating or inline listRef)
    const container = (refs && refs.floating && refs.floating.current) || listRef.current;
    if (!container) return;
    const item = container.querySelector(`[data-idx=\"${highlight}\"]`);
    if (item) {
      try {
        // scroll highlighted item into view within the container
        item.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      } catch (e) {}
      if (showTooltip) {
        try {
          const node = item.querySelector('.combobox-item-name');
          if (node) showTooltipFor(node, (filtered[highlight] && (filtered[highlight].effect || filtered[highlight].Effect)) || '');
        } catch (e) {}
      }
    }
  }, [highlight, open, refs, listRef, showTooltip, filtered]);

  return (
    <div className="relative" onKeyDown={onKeyDown}>
      <div className="relative" onPointerLeave={() => { if (showTooltip) hideTooltipNow(); }}>
        <input
          ref={(el) => { inputRef.current = el; try { reference(el); } catch(e) {} }}
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); openList(); }}
          onFocus={(e) => { openList(); if (showTooltip && selectedItem) showTooltipFor(e.currentTarget, selectedItem.effect || selectedItem.Effect); }}
          onBlur={(e) => {
            if (blurTimer.current) clearTimeout(blurTimer.current);
            blurTimer.current = setTimeout(() => { closeList(); if (showTooltip) hideTooltipNow(); blurTimer.current = null; }, 200);
          }}
          onMouseEnter={(e) => { if (showTooltip && selectedItem) showTooltipFor(e.currentTarget, selectedItem.effect || selectedItem.Effect); }}
          onMouseLeave={() => { if (showTooltip) hideTooltipSoon(); }}
          placeholder={placeholder}
          disabled={disabled}
          aria-label={placeholder}
          className={`w-full px-3 py-2 border border-slate-500 rounded text-xs font-medium bg-slate-800 text-white focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400/50 transition-all ${disabled ? 'opacity-60' : ''}`}
          style={{ caretColor: '#fb923c' }}
          aria-autocomplete="list"
          aria-expanded={open}
        />
        {renderValueRight && selectedItem ? (
          <div
            className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-auto"
            onMouseEnter={(e) => { if (blurTimer.current) { clearTimeout(blurTimer.current); blurTimer.current = null; } selectedHoverNodeRef.current = e.currentTarget; if (showTooltip && selectedItem) { showTooltipFor(e.currentTarget, selectedItem.effect || selectedItem.Effect); try { if (typeof tUpdate === 'function') tUpdate(); } catch (err) {} } }}
            onMouseLeave={() => { selectedHoverNodeRef.current = null; if (showTooltip) hideTooltipNow(); }}
            onFocus={(e) => { if (showTooltip && selectedItem) { showTooltipFor(e.currentTarget, selectedItem.effect || selectedItem.Effect); try { if (typeof tUpdate === 'function') tUpdate(); } catch (err) {} } }}
            onBlur={() => { if (showTooltip) hideTooltipNow(); }}
            tabIndex={-1}
          >
            {renderValueRight(selectedItem)}
          </div>
        ) : null}
      {open && filtered.length > 0 && (
          (typeof document !== 'undefined')
          ? createPortal(
            <ul ref={(el) => { try { refs.setFloating?.(el); } catch(e){} }} role="listbox" onPointerLeave={() => { if (showTooltip) hideTooltipNow(); }} className="z-[9999] mt-1 max-h-44 overflow-auto bg-slate-800 border border-slate-600 rounded shadow-lg" style={floatingStyles}>
              {filtered.map((it, idx) => (
                <li
                  data-idx={idx}
                  key={it.id || idx}
                  onMouseDown={(ev) => { ev.preventDefault(); commitSelection(it); }}
                  onMouseEnter={(e) => { try { hideTooltipNow(); } catch(e){}; setHighlight(idx); try { const node = e.currentTarget.querySelector('.combobox-item-name'); if (node && showTooltip) showTooltipFor(node, (it && (it.effect || it.Effect)) || ''); } catch(e){} }}
                  onMouseLeave={() => { if (showTooltip) hideTooltipNow(); }}
                  className={`px-3 py-2 cursor-pointer text-sm ${highlight === idx ? 'bg-slate-700 text-white' : 'text-slate-200'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate mr-4 combobox-item-name" tabIndex={0} onFocus={(e) => { if (showTooltip) showTooltipFor(e.currentTarget, (it && (it.effect || it.Effect)) || ''); }} onBlur={() => { if (showTooltip) hideTooltipSoon(); }}>{getName(it)}</span>
                    {renderItemRight ? renderItemRight(it) : ((typeof it === 'object' && (it.cost || it.Cost)) ? (
                      <span className="ml-2 text-xs bg-slate-700 text-slate-200 px-2 py-0.5 rounded-full">{Number(it.cost || it.Cost || 0)}</span>
                    ) : null)}
                  </div>
                </li>
              ))}
            </ul>,
            document.body
          ) : (
            <ul ref={listRef} onPointerLeave={() => { if (showTooltip) hideTooltipNow(); }} className="absolute z-50 mt-1 max-h-44 w-full overflow-auto bg-slate-800 border border-slate-600 rounded shadow-lg">
              {filtered.map((it, idx) => (
                <li
                  data-idx={idx}
                  key={it.id || idx}
                  onMouseDown={(ev) => { ev.preventDefault(); commitSelection(it); }}
                  onMouseEnter={(e) => { try { hideTooltipNow(); } catch(e){}; setHighlight(idx); try { const node = e.currentTarget.querySelector('.combobox-item-name'); if (node && showTooltip) showTooltipFor(node, (it && (it.effect || it.Effect)) || ''); } catch(e){} }}
                  onMouseLeave={() => { if (showTooltip) hideTooltipNow(); }}
                  className={`px-3 py-2 cursor-pointer text-sm ${highlight === idx ? 'bg-slate-700 text-white' : 'text-slate-200'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate mr-4 combobox-item-name" tabIndex={0} onFocus={(e) => { if (showTooltip) showTooltipFor(e.currentTarget, (it && (it.effect || it.Effect)) || ''); }} onBlur={() => { if (showTooltip) hideTooltipSoon(); }}>{getName(it)}</span>
                    {renderItemRight ? renderItemRight(it) : ((typeof it === 'object' && (it.cost || it.Cost)) ? (
                      <span className="ml-2 text-xs bg-slate-700 text-slate-200 px-2 py-0.5 rounded-full">{Number(it.cost || it.Cost || 0)}</span>
                    ) : null)}
                  </div>
                </li>
              ))}
            </ul>
          )
      )}

      {/* Tooltip portal */}
      {tooltipOpen && (typeof document !== 'undefined') ? createPortal(
        <div ref={(el) => { try { tRefs.setFloating?.(el); } catch(e){} }} style={tFloatingStyles} className="z-[10000] pointer-events-none max-w-xs sm:max-w-sm md:max-w-lg lg:max-w-xl xl:max-w-2xl text-sm text-slate-100 bg-slate-900 p-2 rounded shadow-lg whitespace-pre-wrap">
          {tooltipContent}
        </div>,
        document.body
      ) : null}
    </div>
  </div>
  );
};

const MatchCard = ({
  match,
  characters,
  capsules,
  costumes,
  aiItems,
  sparkingMusic,
  rulesets,
  activeRulesetKey,
  onDuplicate,
  onRemove,
  onAddCharacter,
  onRemoveCharacter,
  onUpdateCharacter,
  onUpdateCapsule,
  onReplaceCharacter,
  collapsed,
  onToggleCollapse,
  exportSingleMatch,
  importSingleMatch,
  exportSingleTeam,
  importSingleTeam,
  onRenameMatch,
  onRenameTeam1,
  onRenameTeam2,
}) => {
  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl p-6 shadow-xl border-2 border-orange-400/50 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 via-orange-500 to-orange-400"></div>
  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 pb-3 border-b border-slate-600">
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded bg-slate-700 text-orange-300 border border-orange-400 hover:bg-orange-400 hover:text-slate-800 transition-all flex items-center justify-center"
            aria-label={collapsed ? `Expand Match` : `Collapse Match`}
            style={{ width: 28, height: 28 }}
          >
            {collapsed ? <Plus size={18} /> : <Minus size={18} />}
          </button>
          <input
            type="text"
            value={match.name}
            onChange={(e) => typeof onRenameMatch === 'function' ? onRenameMatch(e.target.value) : null}
            className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-300 to-orange-400 bg-transparent border-b-2 border-transparent hover:border-orange-400 focus:border-orange-400 outline-none px-2 py-1 rounded transition-all"
            style={{ caretColor: '#fb923c' }}
          />
        </div>
  <div className="flex flex-wrap gap-2 mt-3 md:mt-0">
          <button
            onClick={() => exportSingleMatch(match)}
            className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-3 py-2 rounded-lg shadow-md hover:scale-105 transition-all border border-purple-500 flex items-center justify-center"
            aria-label="Download Match"
          >
            <Download size={18} />
            <span className="sr-only">Download Match</span>
          </button>
          <label className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-2 rounded-lg shadow-md hover:scale-105 transition-all border border-blue-500 cursor-pointer flex items-center justify-center"
            aria-label="Upload Match"
          >
            <Upload size={18} />
            <span className="sr-only">Upload Match</span>
              <input
                type="file"
                accept=".yaml,application/x-yaml,text/yaml"
                multiple
                style={{ display: "none" }}
                onChange={(e) => importSingleMatch(e, match.id)}
              />
          </label>
          <button
            onClick={onDuplicate}
            className="bg-gradient-to-r from-green-600 to-green-700 text-white px-3 py-2 rounded-lg font-bold text-sm shadow-md hover:scale-105 transition-all border border-green-500 flex items-center justify-center"
            aria-label="Duplicate Match"
          >
            <Copy size={16} />
            <span className="hidden sm:inline ml-2">DUPLICATE</span>
          </button>
          <button
            onClick={onRemove}
            className="bg-gradient-to-r from-red-600 to-red-700 text-white px-3 py-2 rounded-lg font-bold text-sm shadow-md hover:scale-105 transition-all border border-red-500 flex items-center justify-center"
            aria-label="Remove Match"
          >
            <Trash2 size={16} />
            <span className="hidden sm:inline ml-2">REMOVE</span>
          </button>
        </div>
      </div>
      {!collapsed && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TeamPanel
            teamName="team1"
            displayName={match.team1Name}
            team={match.team1}
            characters={characters}
            capsules={capsules}
            costumes={costumes}
            sparkingMusic={sparkingMusic}
            aiItems={aiItems}
            rulesets={rulesets || null}
            activeRulesetKey={activeRulesetKey}
            onAddCharacter={() => onAddCharacter("team1")}
            onRemoveCharacter={(index) => onRemoveCharacter("team1", index)}
            onUpdateCharacter={(index, field, value) =>
              onUpdateCharacter("team1", index, field, value)
            }
            onUpdateCapsule={(charIndex, capsuleIndex, value) =>
              onUpdateCapsule("team1", charIndex, capsuleIndex, value)
            }
            teamColor="blue"
            matchId={match.id}
            matchName={match.name}
            exportSingleTeam={exportSingleTeam}
            importSingleTeam={importSingleTeam}
            onRenameTeam={onRenameTeam1}
            onReplaceCharacter={(index, slotObj) => onReplaceCharacter('team1', index, slotObj)}
          />
          <TeamPanel
            teamName="team2"
            displayName={match.team2Name}
            team={match.team2}
            characters={characters}
            capsules={capsules}
            costumes={costumes}
            sparkingMusic={sparkingMusic}
            aiItems={aiItems}
            rulesets={rulesets || null}
            activeRulesetKey={activeRulesetKey}
            onAddCharacter={() => onAddCharacter("team2")}
            onRemoveCharacter={(index) => onRemoveCharacter("team2", index)}
            onUpdateCharacter={(index, field, value) =>
              onUpdateCharacter("team2", index, field, value)
            }
            onUpdateCapsule={(charIndex, capsuleIndex, value) =>
              onUpdateCapsule("team2", charIndex, capsuleIndex, value)
            }
            teamColor="red"
            matchId={match.id}
            matchName={match.name}
            exportSingleTeam={exportSingleTeam}
            importSingleTeam={importSingleTeam}
            onRenameTeam={onRenameTeam2}
            onReplaceCharacter={(index, slotObj) => onReplaceCharacter('team2', index, slotObj)}
          />
        </div>
      )}
    </div>
  );
}

const TeamPanel = ({
  displayName,
  team,
  characters,
  capsules,
  costumes,
  sparkingMusic,
  aiItems,
  rulesets,
  activeRulesetKey,
  onAddCharacter,
  onRemoveCharacter,
  onUpdateCharacter,
  onUpdateCapsule,
  teamColor,
  matchId,
  matchName,
  exportSingleTeam,
  importSingleTeam,
  onRenameTeam,
  teamName,
  onReplaceCharacter,
}) => {
  if (typeof exportSingleTeam !== "function") {
    console.warn("TeamPanel: exportSingleTeam prop is not a function!", exportSingleTeam);
  }
  const [collapsed, setCollapsed] = React.useState(false);
  const colorClasses = teamColor === "blue"
    ? "from-slate-800 to-slate-700 border-slate-600"
    : "from-slate-800 to-slate-700 border-slate-600";
  const buttonColor = teamColor === "blue"
    ? "from-slate-700 to-slate-600 border-slate-500 hover:from-slate-600 hover:to-slate-500"
    : "from-slate-700 to-slate-600 border-slate-500 hover:from-slate-600 hover:to-slate-500";

  const [localName, setLocalName] = React.useState(displayName || '');
  React.useEffect(() => {
    setLocalName(displayName || '');
  }, [displayName]);

  const handleRename = (e) => {
    const v = e?.target?.value;
    setLocalName(v);
    if (typeof onRenameTeam === 'function') onRenameTeam(v);
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses} rounded-xl p-4 shadow-lg border-2 relative overflow-visible`}>
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12 pointer-events-none"></div>
      <div className="flex justify-between items-center mb-3">
        <div>
          <input
            type="text"
            value={localName}
            onChange={handleRename}
            className="text-lg font-bold text-orange-300 uppercase tracking-wide drop-shadow relative z-10 bg-transparent border-b border-transparent focus:border-orange-400 outline-none px-1 py-0"
          />
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => exportSingleTeam(team, displayName, matchName)}
            className="p-1 rounded bg-purple-700 text-white border border-purple-400 hover:bg-purple-400 hover:text-slate-800 transition-all flex items-center justify-center z-20"
            aria-label={`Download ${displayName}`}
            style={{ width: 28, height: 28 }}
          >
            <Download size={16} />
            <span className="sr-only">Download {displayName}</span>
          </button>
          <label className="p-1 rounded bg-blue-700 text-white border border-blue-400 hover:bg-blue-400 hover:text-slate-800 transition-all flex items-center justify-center z-20 cursor-pointer" aria-label={`Upload ${displayName}`}
            style={{ width: 28, height: 28 }}>
            <Upload size={16} />
            <span className="sr-only">Upload {displayName}</span>
            <input
              type="file"
              accept=".yaml,application/x-yaml,text/yaml"
              multiple
              style={{ display: "none" }}
              onChange={(e) => importSingleTeam(e, matchId, teamName)}
            />
          </label>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="ml-2 p-1 rounded bg-slate-700 text-orange-300 border border-orange-400 hover:bg-orange-400 hover:text-slate-800 transition-all flex items-center justify-center z-20"
            aria-label={collapsed ? `Expand ${displayName}` : `Collapse ${displayName}`}
            style={{ width: 24, height: 24 }}
          >
            {collapsed ? <Plus size={16} /> : <Minus size={16} />}
          </button>
        </div>
      </div>
      {!collapsed && (
        <>
          <div className="space-y-3 relative z-10">
            {team.map((char, index) => (
              <CharacterSlot
                key={index}
                index={index}
                teamName={teamName}
                matchId={matchId}
                matchName={matchName}
                character={char}
                team={team}
                characters={characters}
                capsules={capsules}
                costumes={costumes}
                sparkingMusic={sparkingMusic}
                aiItems={aiItems}
                rulesets={rulesets}
                activeRulesetKey={activeRulesetKey}
                onRemove={() => onRemoveCharacter(index)}
                onUpdate={(field, value) => onUpdateCharacter(index, field, value)}
                onUpdateCapsule={(capsuleIndex, value) =>
                  onUpdateCapsule(index, capsuleIndex, value)
                }
                onReplaceCharacter={(slotObj) => onReplaceCharacter(index, slotObj)}
              />
            ))}
          </div>
          <button
            onClick={onAddCharacter}
            className={`w-full mt-4 bg-gradient-to-r ${buttonColor} text-white py-2 rounded-lg font-bold text-sm shadow-md hover:scale-105 transition-all border-2 relative z-0`}
          >
            <Plus className="inline mr-1" size={16} />
            ADD CHARACTER
          </button>
        </>
      )}
    </div>
  );
};
    
const CharacterSlot = ({
  index,
  teamName,
  matchId,
  matchName,
  character,
  team,
  characters,
  capsules,
  costumes,
  sparkingMusic,
  aiItems,
  rulesets,
  activeRulesetKey,
  onRemove,
  onUpdate,
  onUpdateCapsule,
  onReplaceCharacter,
}) => {
  const [collapsed, setCollapsed] = React.useState(false);
  const charCostumes = (() => {
    const base = costumes.filter((c) => c.exclusiveFor === character.name);
    // If a costume ID is already selected but not present in the filtered list,
    // include it so the Combobox can display the currently-selected costume
    if (character.costume && !base.find(b => b.id === character.costume)) {
      const selected = costumes.find(cs => cs.id === character.costume);
      if (selected) return [selected, ...base];
    }
    return base;
  })();
  const fileInputRef = React.useRef(null);

  // compute rule violations for soft mode
  const computeViolations = () => {
    const violations = [];
    const ruleset = rulesets?.rulesets?.[activeRulesetKey];
    if (!ruleset) return violations;
    const costMap = Object.fromEntries((capsules||[]).map(c => [c.id, Number(c.cost || 0)]));
    const used = (character.capsules||[]).filter(Boolean);
    
    // Check violations in both soft and hard mode (warnings can still appear in hard mode if violations occur)
    if (ruleset.scope === 'per-character' && ruleset.totalCost) {
      const sum = used.reduce((s, id) => s + (costMap[id] || 0), 0);
      if (sum > (ruleset.totalCost || 0)) {
        violations.push({ type: 'cost', message: `Character exceeds point limit (${sum} > ${ruleset.totalCost})`, over: sum - (ruleset.totalCost || 0) });
      }
    }
    
    const uniqueTeam = (ruleset?.restrictions || []).some(r => r.type === 'unique-per-team' && r.params?.enabled);
    if (uniqueTeam) {
      const teamUsed = (team || []).flatMap(ch => ch.capsules || []).filter(Boolean);
      // duplicates in team
      const dupSet = used.filter(id => teamUsed.filter(x => x === id).length > 1);
      if (dupSet.length > 0) violations.push({ type: 'duplicate-team', message: 'Duplicate capsule(s) used within the same team' });
    }
    
    // Rule 1: max-same-per-team (check in both soft and hard mode)
    const maxSamePerTeam = (ruleset?.restrictions || []).find(r => r.type === 'max-same-per-team');
    if (maxSamePerTeam) {
      const teamUsed = (team || []).flatMap(ch => ch.capsules || []).filter(Boolean);
      const maxCount = maxSamePerTeam.params?.maxCount || 2;
      const counts = {};
      teamUsed.forEach(id => counts[id] = (counts[id] || 0) + 1);
      const violations_found = Object.entries(counts).filter(([id, count]) => count > maxCount);
      violations_found.forEach(([id, count]) => {
        const cap = capsules.find(c => c.id === id);
        const capsuleName = cap ? (cap['Item Names'] || cap.name || cap.id) : id;
        violations.push({ 
          type: 'max-same-per-team', 
          message: `Team has more than ${maxCount} of the same capsule: ${capsuleName}` 
        });
      });
    }
    
    // Rule 2: max-cost-group-per-character (check in both soft and hard mode)
    const maxCostGroup = (ruleset?.restrictions || []).find(r => r.type === 'max-cost-group-per-character');
    if (maxCostGroup) {
      const groupIds = maxCostGroup.params?.groupIds || [];
      const maxCost = maxCostGroup.params?.maxCost || 6;
      const groupCapsules = used.filter(id => groupIds.includes(id));
      const groupCostSum = groupCapsules.reduce((s, id) => s + (costMap[id] || 0), 0);
      if (groupCostSum > maxCost) {
        violations.push({ 
          type: 'max-cost-group', 
          message: `Attack boost capsules exceed ${maxCost} point limit (currently at ${groupCostSum})` 
        });
      }
    }
    
    // Rule 3: mutually-exclusive-team (check in both soft and hard mode)
    const mutuallyExclusive = (ruleset?.restrictions || []).find(r => r.type === 'mutually-exclusive-team');
    if (mutuallyExclusive) {
      const teamUsed = (team || []).flatMap(ch => ch.capsules || []).filter(Boolean);
      const groups = mutuallyExclusive.params?.groups || [];
      
      // Check if multiple groups are used
      const usedGroups = groups.map((group, idx) => {
        const count = teamUsed.filter(id => group.ids.includes(id)).length;
        return { groupIdx: idx, count, ids: group.ids, maxCount: group.maxCount };
      }).filter(g => g.count > 0);
      
      if (usedGroups.length > 1) {
        const capsuleNames = usedGroups.map(g => {
          // Find an actual capsule ID that's being used from this group
          const usedCapsuleId = teamUsed.find(id => g.ids.includes(id));
          const cap = capsules.find(c => c.id === usedCapsuleId);
          return cap ? (cap['Item Names'] || cap.name || cap.id) : (usedCapsuleId || g.ids[0]);
        }).join(' and ');
        violations.push({ 
          type: 'mutually-exclusive', 
          message: `Cannot use both ${capsuleNames} on the same team` 
        });
      }
      
      // Check individual group count limits
      usedGroups.forEach(g => {
        if (g.count > g.maxCount) {
          const usedCapsuleId = teamUsed.find(id => g.ids.includes(id));
          const cap = capsules.find(c => c.id === usedCapsuleId);
          const name = cap ? (cap['Item Names'] || cap.name || cap.id) : (usedCapsuleId || g.ids[0]);
          violations.push({ 
            type: 'mutually-exclusive-count', 
            message: `Team has more than ${g.maxCount} ${name} capsule(s) (currently has ${g.count})` 
          });
        }
      });
    }
    return violations;
  };
  const violations = computeViolations();

  return (
  <div className="bg-gradient-to-br from-slate-700 to-slate-600 rounded-lg p-3 shadow-md hover:shadow-lg transition-all duration-300 border border-slate-500 flex flex-col relative z-10">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 space-y-2">
          <div>
            <label className="block text-xs font-semibold text-orange-300 mb-1 uppercase tracking-wide">
              Character
            </label>
            <Combobox
              valueId={character.id}
              items={characters}
              getName={(c) => c.name}
              placeholder="Type or select character"
              onSelect={(id) => onUpdate('id', id)}
              showTooltip={false}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-purple-300 mb-1 uppercase tracking-wide">
              Costume
            </label>
            <Combobox
              valueId={character.costume}
              items={charCostumes}
              getName={(c) => c.name}
              placeholder="Type or select costume"
              onSelect={(id) => onUpdate('costume', id)}
              disabled={!character.name}
              showTooltip={false}
            />
          </div>
          {sparkingMusic && sparkingMusic.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-pink-300 mb-1 uppercase tracking-wide">
                Sparking Music
              </label>
              <Combobox
                valueId={character.sparking}
                items={sparkingMusic}
                getName={(c) => c.name}
                placeholder="Select sparking music"
                onSelect={(id) => onUpdate('sparking', id)}
                disabled={!character.name}
                showTooltip={false}
              />
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="p-1 rounded bg-slate-700 text-orange-300 border border-orange-400 hover:bg-orange-400 hover:text-slate-800 transition-all flex items-center justify-center"
            aria-label={collapsed ? `Expand Character` : `Collapse Character`}
            style={{ width: 24, height: 24 }}
          >
            {collapsed ? <Plus size={16} /> : <Minus size={16} />}
          </button>
        </div>
      </div>
      {!collapsed && (
        <div className="space-y-2 mt-3">
          {violations.length > 0 && (
            <div className={`px-3 py-2 rounded mb-2 font-semibold ${violations.some(v=>v.type==='cost') ? 'bg-red-800 text-white' : 'bg-yellow-600 text-slate-900'}`}>
              {violations.map((v, idx) => (
                <div key={idx}>
                  ⚠️ {v.type === 'cost' ? `Points over limit: ${v.over}` : v.message}
                </div>
              ))}
            </div>
          )}
          <label className="block text-xs font-semibold text-cyan-300 mb-1 uppercase tracking-wide flex items-center justify-between">
            <span>Capsules</span>
            <span className="text-xs text-slate-300 font-medium">
              {(() => {
                try {
                  const ruleset = rulesets?.rulesets?.[activeRulesetKey];
                  if (!ruleset) return '';
                  if (ruleset.scope !== 'per-character') return '';
                  const costMap = Object.fromEntries((capsules||[]).map(c => [c.id, Number(c.Cost || c.cost || 0)]));
                  const used = (character.capsules||[]).filter(Boolean);
                  const sumUsed = used.reduce((s, id) => s + (costMap[id] || 0), 0);
                  const total = ruleset.totalCost || 0;
                  const over = sumUsed - total;
                  const cls = over > 0 ? 'text-red-400 font-bold' : 'text-slate-300';
                  return <span className={cls}>{`Points: ${sumUsed} / ${total}`}</span>;
                } catch (e) { return ''; }
              })()}
            </span>
          </label>
          {(() => {
            const ruleset = rulesets?.rulesets?.[activeRulesetKey];
            const usedCapsuleIds = (character.capsules || []).filter(Boolean);
            // teamUsed includes capsules used by other characters in same team
            const teamUsed = (team || []).flatMap(ch => ch.capsules || []).filter(Boolean);
            const costMap = Object.fromEntries((capsules||[]).map(c => [c.id, Number(c.Cost || c.cost || 0)]));

            return character.capsules.map((capsuleId, i) => {
              let available = (capsules || []);
              // banned ids
              const banned = (ruleset?.restrictions || []).find(r => r.type === 'banned-ids')?.params?.ids || [];
              available = available.filter(c => c && !banned.includes(c.id));

              // unique-per-character
              const uniqueChar = (ruleset?.restrictions || []).some(r => r.type === 'unique-per-character' && r.params?.enabled);
              if (uniqueChar) {
                available = available.filter(c => c && (c.id === capsuleId || !usedCapsuleIds.includes(c.id)));
              }

              // unique-per-team
              const uniqueTeam = (ruleset?.restrictions || []).some(r => r.type === 'unique-per-team' && r.params?.enabled);
              if (uniqueTeam) {
                available = available.filter(c => c && (c.id === capsuleId || !teamUsed.includes(c.id)));
              }

              // totalCost (hard, per-character)
              if (ruleset?.mode === 'hard' && ruleset?.scope === 'per-character') {
                const usedOther = usedCapsuleIds.filter((id, idx) => idx !== i);
                const sumUsedOther = usedOther.reduce((s, id) => s + (costMap[id] || 0), 0);
                available = available.filter(c => c && (c.id === capsuleId || (sumUsedOther + (costMap[c.id] || 0)) <= (ruleset.totalCost || 0)));
              }

              // Rule 1: max-same-per-team (hard mode only)
              const maxSamePerTeam = (ruleset?.restrictions || []).find(r => r.type === 'max-same-per-team');
              if (maxSamePerTeam && ruleset?.mode === 'hard') {
                const maxCount = maxSamePerTeam.params?.maxCount || 2;
                // Count how many times each capsule is used in the team (excluding this slot)
                const teamUsedWithoutCurrent = teamUsed.filter((id, idx) => {
                  // We need to exclude the current character's current slot
                  const currentCharCapsules = character.capsules.filter(Boolean);
                  const isCurrentSlot = teamUsed[idx] === capsuleId && currentCharCapsules.indexOf(capsuleId) === i;
                  return !isCurrentSlot;
                });
                available = available.filter(c => {
                  if (c.id === capsuleId) return true; // Always allow current selection
                  const count = teamUsedWithoutCurrent.filter(id => id === c.id).length;
                  return count < maxCount;
                });
              }

              // Rule 2: max-cost-group-per-character (hard mode only)
              const maxCostGroup = (ruleset?.restrictions || []).find(r => r.type === 'max-cost-group-per-character');
              if (maxCostGroup && ruleset?.mode === 'hard') {
                const groupIds = maxCostGroup.params?.groupIds || [];
                const maxCost = maxCostGroup.params?.maxCost || 6;
                // Calculate current group cost excluding this slot
                const usedOther = usedCapsuleIds.filter((id, idx) => idx !== i);
                const groupCostUsed = usedOther.filter(id => groupIds.includes(id)).reduce((s, id) => s + (costMap[id] || 0), 0);
                available = available.filter(c => {
                  if (c.id === capsuleId) return true; // Always allow current selection
                  if (!groupIds.includes(c.id)) return true; // Not in the group, allow it
                  const newCost = groupCostUsed + (costMap[c.id] || 0);
                  return newCost <= maxCost;
                });
              }

              // Rule 3: mutually-exclusive-team (hard mode only)
              const mutuallyExclusive = (ruleset?.restrictions || []).find(r => r.type === 'mutually-exclusive-team');
              if (mutuallyExclusive && ruleset?.mode === 'hard') {
                const groups = mutuallyExclusive.params?.groups || [];
                // Check which groups are currently in use by the team
                const usedGroups = groups.map((group, idx) => {
                  const count = teamUsed.filter(id => group.ids.includes(id)).length;
                  return { groupIdx: idx, count, ids: group.ids, maxCount: group.maxCount };
                });
                
                available = available.filter(c => {
                  if (c.id === capsuleId) return true; // Always allow current selection
                  
                  // Find which group this capsule belongs to
                  const capsuleGroupIdx = groups.findIndex(g => g.ids.includes(c.id));
                  if (capsuleGroupIdx === -1) return true; // Not in any group
                  
                  const capsuleGroup = groups[capsuleGroupIdx];
                  
                  // Check if any other mutually exclusive group is in use
                  const otherGroupsInUse = usedGroups.filter((g, idx) => idx !== capsuleGroupIdx && g.count > 0);
                  if (otherGroupsInUse.length > 0) return false; // Can't add from this group
                  
                  // Check if adding this would exceed the group's max count
                  const currentGroupUsage = usedGroups[capsuleGroupIdx];
                  // Don't count the current slot if it already has this capsule
                  const effectiveCount = capsuleId && capsuleGroup.ids.includes(capsuleId) 
                    ? currentGroupUsage.count - 1 
                    : currentGroupUsage.count;
                  return effectiveCount < capsuleGroup.maxCount;
                });
              }

                return (
                <div key={i} className="mb-1 flex items-center gap-2">
                  <div
                    className="flex-1"
                    tabIndex={0}
                    role="group"
                    aria-label={`Capsule ${i + 1} selector`}
                    onKeyDown={(e) => {
                      // Only trigger when the wrapper itself is focused (not inner input)
                      if (e.key === 'Backspace' && e.target === e.currentTarget) {
                        e.preventDefault();
                        onUpdateCapsule(i, '');
                      }
                    }}
                  >
                    <Combobox
                      valueId={capsuleId}
                      items={available}
                      getName={(c) => c.name}
                      placeholder={`Capsule ${i + 1}`}
                      onSelect={(id) => onUpdateCapsule(i, id)}
                      renderItemRight={(it) => {
                        const cost = Number(it.cost || it.Cost || 0);
                        // compute per-character overage
                        const used = (character.capsules||[]).filter(Boolean);
                        const sumUsed = used.reduce((s, id) => s + (costMap[id] || 0), 0);
                        const total = (ruleset && ruleset.totalCost) ? ruleset.totalCost : 0;
                        const over = sumUsed - total;
                        const EXPENSIVE_THRESHOLD = 10; // adjust as desired
                        // determine base color by cost
                        let baseClass = 'bg-amber-200 text-slate-800';
                        if (cost <= 1) baseClass = 'bg-amber-100 text-slate-800';
                        else if (cost === 2) baseClass = 'bg-amber-200 text-slate-800';
                        else if (cost === 3) baseClass = 'bg-amber-300 text-slate-800';
                        else if (cost === 4) baseClass = 'bg-amber-400 text-slate-800';
                        else if (cost >= 5) baseClass = 'bg-amber-500 text-slate-800';
                        // determine if we should show red: either cost meets expensive threshold OR character is over budget
                        const rulesetActive = !!(ruleset && ruleset.scope && ruleset.scope !== 'none');
                        const showOver = (rulesetActive && over > 0) || (cost >= EXPENSIVE_THRESHOLD);
                        const badgeClass = showOver ? 'bg-red-900 text-white' : baseClass;
                        return (
                          <span className={`ml-2 text-xs ${badgeClass} px-2 py-0.5 rounded-full`}>{cost}</span>
                        );
                      }}
                      renderValueRight={(it) => {
                        const cost = Number(it.cost || it.Cost || 0);
                        const used = (character.capsules||[]).filter(Boolean);
                        const sumUsed = used.reduce((s, id) => s + (costMap[id] || 0), 0);
                        const total = (ruleset && ruleset.totalCost) ? ruleset.totalCost : 0;
                        const over = sumUsed - total;
                        const EXPENSIVE_THRESHOLD = 10;
                        let baseClass = 'bg-amber-200 text-slate-800';
                        if (cost <= 1) baseClass = 'bg-amber-100 text-slate-800';
                        else if (cost === 2) baseClass = 'bg-amber-200 text-slate-800';
                        else if (cost === 3) baseClass = 'bg-amber-300 text-slate-800';
                        else if (cost === 4) baseClass = 'bg-amber-400 text-slate-800';
                        else if (cost >= 5) baseClass = 'bg-amber-500 text-slate-800';
                        const rulesetActive = !!(ruleset && ruleset.scope && ruleset.scope !== 'none');
                        const showOver = (rulesetActive && over > 0) || (cost >= EXPENSIVE_THRESHOLD);
                        const badgeClass = showOver ? 'bg-red-900 text-white' : baseClass;
                        return <span className={`text-xs ${badgeClass} px-2 py-0.5 rounded-full`}>{cost}</span>;
                      }}
                    />
                  </div>
                  <button
                    onClick={() => onUpdateCapsule(i, '')}
                    className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-600 hover:bg-red-600 text-white text-sm"
                    title="Remove capsule"
                    aria-label={`Remove capsule ${i + 1}`}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            });
          })()}

          <div className="mt-2 pt-2 border-t border-slate-500">
            <label className="block text-xs font-semibold text-blue-300 mb-1 uppercase tracking-wide">
              AI Strategy
            </label>
            <div
              className="flex items-center gap-2"
            >
              <div
                className="flex-1"
                tabIndex={0}
                role="group"
                aria-label={`AI strategy selector`}
                onKeyDown={(e) => {
                  if (e.key === 'Backspace' && e.target === e.currentTarget) {
                    e.preventDefault();
                    onUpdate('ai', '');
                  }
                }}
              >
                <Combobox
                  valueId={character.ai}
                  items={aiItems}
                  getName={(a) => a.name}
                  placeholder="Type or select AI strategy"
                  onSelect={(id) => onUpdate('ai', id)}
                  showTooltip={false}
                />
              </div>
              <button
                onClick={() => onUpdate('ai', '')}
                className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-600 hover:bg-red-600 text-white text-sm"
                title="Remove AI strategy"
                aria-label={`Remove AI strategy`}
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    // Export current character build as YAML
                    const build = {
                      character: character.name || (characters.find(c => c.id === character.id)?.name || ''),
                      costume: character.costume ? (costumes.find(c => c.id === character.costume)?.name || '') : '',
                      capsules: (character.capsules || []).map(cid => capsules.find(c => c.id === cid)?.name || ''),
                      ai: character.ai ? (aiItems.find(a => a.id === character.ai)?.name || '') : '',
                      sparking: character.sparking ? (sparkingMusic.find(s => s.id === character.sparking)?.name || character.sparking) : '',
                      matchName: matchName,
                      teamName: teamName,
                      slotIndex: index,
                    };
                    const yamlStr = yaml.dump(build, { noRefs: true, lineWidth: 120 });
                    const blob = new Blob([yamlStr], { type: 'text/yaml' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    const charName = character.name || (characters.find(c => c.id === character.id)?.name || '');
                    const safe = charName && charName.trim() !== '' ? charName.replace(/\s+/g, '_') : 'Blank';
                    a.download = `${safe}.yaml`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                  className="mt-4 px-3 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 text-white font-bold text-sm shadow hover:scale-105 transition-all border border-purple-500 inline-flex items-center"
                  aria-label="Export character build"
                >
                  <Download size={14} />
                  <span className="hidden sm:inline ml-2">Export</span>
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".yaml,application/x-yaml,text/yaml"
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    const files = e.target.files; if (!files || !files[0]) return; try {
                      const text = await files[0].text();
                      const data = yaml.load(text);
                      if (!data) throw new Error('Invalid YAML');

                      // Build a full slot object (ids) and replace atomically
                      const slot = {
                        name: '',
                        id: '',
                        costume: '',
                        capsules: Array(7).fill(''),
                        ai: '',
                        sparking: '',
                      };

                      if (data.character) {
                        const charObj = characters.find(c => (c.name || '').toString().trim().toLowerCase() === data.character.toString().trim().toLowerCase());
                        slot.name = data.character.toString();
                        slot.id = charObj ? charObj.id : '';
                      }

                      if (data.costume) {
                        const costumeObj = costumes.find(c => (c.name || '').toString().trim().toLowerCase() === data.costume.toString().trim().toLowerCase());
                        slot.costume = costumeObj ? costumeObj.id : '';
                      }

                      if (data.ai) {
                        slot.ai = findAiIdFromValue(data.ai, aiItems);
                      }

                      if (data.sparking) {
                        try {
                          const spName = (data.sparking || '').toString().trim().toLowerCase();
                          const spObj = sparkingMusic.find(s => (s.name || '').toString().trim().toLowerCase() === spName);
                          slot.sparking = spObj ? spObj.id : '';
                        } catch (e) {
                          slot.sparking = '';
                        }
                      }

                      if (Array.isArray(data.capsules)) {
                        slot.capsules = Array(7).fill('').map((_, i) => {
                          if (!data.capsules[i]) return '';
                          const found = capsules.find(cap => (cap.name || '').toString().trim().toLowerCase() === data.capsules[i].toString().trim().toLowerCase());
                          return found ? found.id : '';
                        });
                      }

                      // Debug: show parsed YAML and constructed slot object before applying
                      // parsed YAML and constructed slot (debug logs removed)

                      if (typeof onReplaceCharacter === 'function') {
                        onReplaceCharacter(slot);
                      } else {
                        // Fallback: apply updates individually (legacy)
                        console.error('CharacterSlot import: onReplaceCharacter not provided, falling back to per-field updates');
                        onUpdate('id', slot.id);
                        onUpdate('costume', slot.costume);
                        slot.capsules.forEach((cid, ci) => onUpdateCapsule(ci, cid));
                        onUpdate('ai', slot.ai);
                        onUpdate('sparking', slot.sparking);
                      }
                    } catch (err) { console.error('import character build failed', err); }
                    try { e.target.value = null; } catch (e) {}
                  }}
                />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-4 px-3 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold text-sm shadow hover:scale-105 transition-all border border-blue-400 inline-flex items-center"
                        aria-label="Import character build"
                      >
                        <Upload size={14} />
                        <span className="hidden sm:inline ml-2">Import</span>
                      </button>
            </div>

            <div>
                <button
                  onClick={onRemove}
                  className="mt-4 px-3 py-2 rounded-lg bg-gradient-to-r from-red-600 to-red-700 text-white font-bold text-sm shadow hover:scale-105 transition-all border border-red-400 inline-flex items-center"
                  aria-label="Remove character"
                >
                  <Trash2 size={14} />
                  <span className="hidden sm:inline ml-2">Remove</span>
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchBuilder;