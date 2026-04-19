import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, Link } from 'react-router-dom';
import { Users, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { loadContent } from '../utils/contentLoader';

const CALC_BASE = 'https://dragonballzleague.github.io/SparkingZero/calculator/#';
const NULLS7 = [null, null, null, null, null, null, null];
const CALC_CHARS_URL = 'https://dragonballzleague.github.io/SparkingZero/calculator/data/characters.json';
const TRANSFORM_URL = `${import.meta.env.BASE_URL}content/transformations.json`;

function calcLink(charName) {
  const json = JSON.stringify({ c: charName, p: NULLS7, op: NULLS7 });
  return CALC_BASE + btoa(encodeURIComponent(json));
}

function buildTransformAdj(data) {
  const idToName = {};
  for (const [id, entry] of Object.entries(data)) {
    if (typeof entry === 'object' && entry.name) idToName[id] = entry.name;
  }
  const fwd = {};
  for (const [, entry] of Object.entries(data)) {
    if (typeof entry !== 'object' || !entry.name) continue;
    const from = entry.name;
    if (!fwd[from]) fwd[from] = [];
    for (const toId of (entry.transformsTo || [])) {
      if (!toId || !idToName[toId]) continue;
      fwd[from].push(idToName[toId]);
    }
  }
  return fwd;
}

function getFormChain(name, calcNames, transformAdj) {
  const exactMatch = calcNames.has(name);
  let anchor = exactMatch ? name : [...calcNames].find(n => n.startsWith(name + ' '));
  if (!anchor) return [];
  // Some transformation nodes use reversed naming, e.g. transformations.json has
  // "Ultimate Gohan (Super Hero)" but the calc has "Gohan (Super Hero) Ultimate Gohan".
  // Detect anchor's parenthetical variant like "(Super Hero)" and try remapping.
  const anchorParenMatch = anchor.match(/\(([^)]+)\)$/);
  const resolveCalcName = (node) => {
    if (calcNames.has(node)) return node;
    if (anchorParenMatch) {
      const suffix = ' (' + anchorParenMatch[1] + ')';
      if (node.endsWith(suffix)) {
        const candidate = anchor + ' ' + node.slice(0, node.length - suffix.length);
        if (calcNames.has(candidate)) return candidate;
      }
    }
    return null;
  };
  // Forward BFS only — preserves transformsTo declaration order
  const visited = new Set([anchor]);
  const queue = [anchor];
  const ordered = [];
  while (queue.length) {
    const cur = queue.shift();
    const calcName = resolveCalcName(cur);
    if (calcName && !ordered.includes(calcName)) ordered.push(calcName);
    for (const next of (transformAdj[cur] || [])) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  if (exactMatch) {
    const idx = ordered.indexOf(anchor);
    if (idx !== -1) ordered.splice(idx, 1);
  }
  return ordered;
}

function CharLink({ name, calcNames, transformAdj, darkMode, className, noDropdown }) {
  const [open, setOpen] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);

  const exactMatch = calcNames?.has(name) ?? false;
  const formMatches = (calcNames && transformAdj) ? getFormChain(name, calcNames, transformAdj) : [];
  const hasForms = formMatches.length > 0;

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e) {
      if (buttonRef.current?.contains(e.target)) return;
      if (dropdownRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  function handleToggle() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropPos({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX + rect.width / 2 });
    }
    setOpen(o => !o);
  }

  if (!calcNames) return <span className={className}>{name}</span>;

  // Roster mode: no dropdown, just a direct link or plain text
  if (noDropdown) {
    if (exactMatch) return (
      <a href={calcLink(name)} target="_blank" rel="noopener noreferrer"
        className={`${className} flex items-center justify-center transition-opacity hover:opacity-70`}>
        {name}
      </a>
    );
    return <span className={className}>{name}</span>;
  }

  // No match of any kind — plain text
  if (!exactMatch && !hasForms) return <span className={className}>{name}</span>;

  // Exact match only, no forms — simple link
  if (exactMatch && !hasForms) {
    return (
      <a href={calcLink(name)} target="_blank" rel="noopener noreferrer"
        className={`${className} flex items-center justify-center transition-opacity hover:opacity-70`}>
        {name}
      </a>
    );
  }

  // Has forms (with or without exact base match) — dropdown button
  const dropdown = open && createPortal(
    <div
      ref={dropdownRef}
      style={{ position: 'absolute', top: dropPos.top, left: dropPos.left, transform: 'translateX(-50%)', zIndex: 9999 }}
      className={`rounded-lg shadow-xl border overflow-hidden min-w-max ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-stone-200'
      }`}
    >
      {exactMatch && (
        <a
          href={calcLink(name)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setOpen(false)}
          className={`block w-full px-3 py-1.5 text-xs font-medium border-b text-center transition-colors ${
            darkMode ? 'text-gray-200 border-gray-700 hover:bg-gray-700' : 'text-stone-800 border-stone-100 hover:bg-stone-50'
          }`}
        >
          Base
        </a>
      )}
      {formMatches.map(m => (
        <a
          key={m}
          href={calcLink(m)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setOpen(false)}
          className={`block w-full px-3 py-1.5 text-xs text-center transition-colors ${
            darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-stone-700 hover:bg-stone-50'
          }`}
        >
          {m.startsWith(name + ' ') ? m.slice(name.length + 1) : m}
        </a>
      ))}
    </div>,
    document.body
  );

  return (
    <div ref={buttonRef}>
      <button
        onClick={handleToggle}
        className={`w-full flex items-center justify-center gap-1 ${className} transition-opacity hover:opacity-70`}
      >
        <span>{name}</span>
        <ChevronDown className={`w-3 h-3 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {dropdown}
    </div>
  );
}

export default function TeamsPage({ darkMode }) {
  const [data, setData] = useState(null);
  const [expandedTeam, setExpandedTeam] = useState(null);
  const [calcNames, setCalcNames] = useState(null);
  const [transformAdj, setTransformAdj] = useState(null);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    fetch(CALC_CHARS_URL)
      .then(r => r.json())
      .then(chars => setCalcNames(new Set(chars.map(c => c.name))))
      .catch(() => setCalcNames(new Set()));
  }, []);

  useEffect(() => {
    fetch(TRANSFORM_URL)
      .then(r => r.json())
      .then(data => setTransformAdj(buildTransformAdj(data)))
      .catch(() => setTransformAdj({}));
  }, []);

  useEffect(() => {
    loadContent('teams.yaml').then(setData);
  }, []);

  // Auto-expand team from URL param
  useEffect(() => {
    const slug = searchParams.get('team');
    if (slug && data?.teams) {
      setExpandedTeam(slug);
    }
  }, [searchParams, data]);

  if (!data) {
    return <div className="flex items-center justify-center py-20 text-lg animate-pulse">Loading teams...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Users className="w-8 h-8 text-blue-400" />
          Teams
        </h1>
        <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-stone-500'}`}>
          Click on a team to view their full roster and details.
        </p>
      </div>

      <div className="space-y-3">
        {data.teams.map((team) => {
          const isExpanded = expandedTeam === team.slug;
          return (
            <div
              key={team.slug}
              className={`rounded-xl border overflow-hidden transition-all ${
                darkMode
                  ? 'bg-gray-900 border-gray-800'
                  : 'bg-stone-50 border-stone-200 shadow-sm'
              }`}
            >
              {/* Team Header (clickable) */}
              <button
                onClick={() => setExpandedTeam(isExpanded ? null : team.slug)}
                className={`w-full flex items-center justify-between p-5 text-left transition-colors ${
                  darkMode ? 'hover:bg-gray-800/50' : 'hover:bg-stone-100'
                }`}
              >
                <div className="flex items-center gap-4">
                  {team.icon ? (
                    <img
                      src={team.icon}
                      alt={team.name}
                      className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                    />
                  ) : (
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                      style={{ backgroundColor: team.color }}
                    >
                      {team.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h2 className="text-lg font-semibold">{team.name}</h2>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-stone-500'}`}>
                      {team.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to={`/teams/${team.slug}/schedule`}
                    onClick={(e) => e.stopPropagation()}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                      darkMode
                        ? 'bg-gray-800 text-orange-400 hover:bg-gray-700'
                        : 'bg-stone-100 text-blue-600 hover:bg-stone-200'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" /> Schedule
                  </Link>
                  {isExpanded
                    ? <ChevronUp className="w-5 h-5 text-gray-400" />
                    : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </div>
              </button>

              {/* Expanded roster */}
              {isExpanded && (
                <div className={`border-t px-5 pb-5 ${darkMode ? 'border-gray-800' : 'border-stone-200'}`}>
                  {team.banner && (
                    <div className="mt-4 mb-4 rounded-xl overflow-hidden">
                      <img
                        src={team.banner}
                        alt={`${team.name} banner`}
                        className="w-full h-auto object-cover max-h-48"
                      />
                    </div>
                  )}
                  {team.description && (
                    <p className={`mt-4 mb-4 text-sm ${darkMode ? 'text-gray-300' : 'text-stone-600'}`}>
                      {team.description}
                    </p>
                  )}

                  <h3 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${
                    darkMode ? 'text-gray-500' : 'text-stone-400'
                  }`}>
                    Roster
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                    {(team.roster || []).map((char) => (
                      <CharLink
                        key={char}
                        name={char}
                        calcNames={calcNames}
                        transformAdj={transformAdj}
                        darkMode={darkMode}
                        noDropdown
                        className={`px-3 py-2 rounded-lg text-sm text-center ${
                          darkMode ? 'bg-gray-800/50 text-gray-200' : 'bg-stone-100 text-stone-700'
                        }`}
                      />
                    ))}
                  </div>

                  {team.master_list?.length > 0 && (
                    <>
                      <h3 className={`text-xs font-semibold uppercase tracking-wider mt-5 mb-3 ${
                        darkMode ? 'text-gray-500' : 'text-stone-400'
                      }`}>
                        Master List
                      </h3>
                      <div className="columns-2 sm:columns-5 gap-1">
                        {[...team.master_list].sort((a, b) => a.localeCompare(b)).map((char) => (
                          <div key={char} className="break-inside-avoid mb-1">
                            <CharLink
                              name={char}
                              calcNames={calcNames}
                              transformAdj={transformAdj}
                              darkMode={darkMode}
                              className={`block px-2.5 py-1.5 rounded text-xs text-center ${
                                darkMode ? 'bg-gray-800/50 text-gray-400' : 'bg-stone-100 text-stone-500'
                              }`}
                            />
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {team.restrictions && (
                    <>
                      <h3 className="text-xs font-semibold uppercase tracking-wider mt-5 mb-3 text-red-500">
                        Restrictions
                      </h3>
                      <p className={`text-sm italic whitespace-pre-line ${darkMode ? 'text-gray-300' : 'text-stone-600'}`}>
                        {team.restrictions}
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
