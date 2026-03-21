import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, X, ArrowLeftRight } from 'lucide-react';
import { getImageUrl, totalCapsuleCost, CAPSULE_BUDGET } from '../utils/calculator.js';

const CLASS_COLORS = {
  'Normal':                          'bg-blue-600',
  'Super Saiyan':                    'bg-yellow-500 text-black',
  'Ki-Blast':                        'bg-purple-600',
  'Power':                           'bg-red-600',
  'Villain':                         'bg-indigo-900 border border-purple-600 text-purple-300',
  'Fusion':                          'bg-sky-600',
  'Almighty':                        'bg-orange-500',
  'Rival':                           'bg-emerald-600',
  'Secret':                          'bg-pink-600',
  'Skill-User':                      'bg-gray-600',
  'Speed':                           'bg-cyan-500 text-black',
  'God':                             'bg-amber-400 text-black',
  'Giant':                           'bg-amber-700',
  'Legendary Super Saiyan':          'bg-green-600',
  'Infinite Ki (Giant)':             'bg-amber-800',
  'Infinite Ki (Villain)':           'bg-violet-700',
  'Infinite Ki Android (Ki-Blast)':  'bg-purple-700',
  'Infinite Ki Android (Power)':     'bg-rose-700',
  'Ki Drain Android (Normal)':       'bg-slate-600',
  'Ki Drain Android (Power)':        'bg-rose-600',
  'Skill-User (Yajirobe)':           'bg-gray-500',
};

const COST_COLORS = ['', 'text-gray-400', 'text-blue-400', 'text-yellow-400', 'text-orange-400', 'text-red-500'];

function ClassBadge({ cls }) {
  const color = CLASS_COLORS[cls] || 'bg-gray-600';
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-semibold leading-none ${color}`}>
      {cls}
    </span>
  );
}

function Stars({ cost }) {
  return <span className={`font-bold text-sm ${COST_COLORS[cost] ?? 'text-gray-400'}`}>{cost}★</span>;
}

const BUFF_COLS = [
  { key: 'meleeBuff',      label: 'Melee' },
  { key: 'defenseBuff',    label: 'Defense' },
  { key: 'kiBlastBuff',    label: 'Ki Blast' },
  { key: 'kiChargingBuff', label: 'Ki Charge' },
  { key: 'blastBuff',      label: 'Blast' },
  { key: 'ultimateBuff',   label: 'Ultimate' },
];

function hasBuff(detail) {
  if (!detail) return false;
  return BUFF_COLS.some(col => detail[col.key] && detail[col.key] !== 0) || !!detail.armor;
}

/**
 * OpponentPanel — standalone panel for selecting an opponent character,
 * equipping their capsules, and toggling their skill buffs.
 *
 * Props:
 *   characters, teams, characterImages, capsules, skills
 *   selectedOpponent         — currently selected opponent character object
 *   equippedCapsules         — array(7) of capsule objects or null
 *   activeSlot               — active capsule slot index or null
 *   activeSkills             — array of active skill buff objects
 *   onSelectOpponent         — (char) => void
 *   onClearOpponent          — () => void
 *   onSwap                   — () => void | undefined (only when main character is set)
 *   onSlotClick              — (idx) => void
 *   onEquipCapsule           — (capsule) => void
 *   onRemoveCapsule          — (idx) => void
 *   onClearCapsules          — () => void
 *   onToggleSkill            — (skill) => void
 */
export default function OpponentPanel({
  characters,
  teams,
  characterImages,
  capsules,
  skills = [],
  selectedOpponent,
  equippedCapsules,
  activeSlot,
  activeSkills = [],
  onSelectOpponent,
  onClearOpponent,
  onSwap,
  onSlotClick,
  onEquipCapsule,
  onRemoveCapsule,
  onClearCapsules,
  onToggleSkill,
}) {
  const [search, setSearch] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [teamOpen, setTeamOpen] = useState(false);
  const [classOpen, setClassOpen] = useState(false);
  const [capsSearch, setCapsSearch] = useState('');
  const [costFilter, setCostFilter] = useState('');
  const [showSelector, setShowSelector] = useState(!selectedOpponent);

  const allClasses = useMemo(() => {
    const set = new Set(characters.map(c => c.class).filter(Boolean));
    return [...set].sort();
  }, [characters]);

  const filteredCharacters = useMemo(() => {
    let list = characters;
    if (selectedTeam && teams.teams[selectedTeam]) {
      const teamMembers = new Set(teams.teams[selectedTeam]);
      list = list.filter(c => teamMembers.has(c.name));
    }
    if (classFilter) list = list.filter(c => c.class === classFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q));
    }
    return list;
  }, [characters, teams, selectedTeam, classFilter, search]);

  const equippedNames = useMemo(() =>
    new Set(equippedCapsules.filter(Boolean).map(c => c.name)),
    [equippedCapsules]
  );

  const filteredCapsules = useMemo(() => {
    let list = capsules;
    if (costFilter) list = list.filter(c => c.cost === parseInt(costFilter));
    if (capsSearch.trim()) {
      const q = capsSearch.trim().toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [capsules, costFilter, capsSearch]);

  const totalCost = totalCapsuleCost(equippedCapsules);
  const overBudget = totalCost > CAPSULE_BUDGET;
  const pct = Math.min(100, (totalCost / CAPSULE_BUDGET) * 100);

  // Build skill list for selected opponent
  const skillMap = useMemo(() => {
    const map = {};
    skills.forEach(s => { if (s.name) map[s.name.toLowerCase()] = s; });
    return map;
  }, [skills]);

  const charSkillDetails = useMemo(() => {
    if (!selectedOpponent) return [];
    const details = [];
    if (selectedOpponent.skill1Name) {
      const detail = skillMap[selectedOpponent.skill1Name.toLowerCase()] ?? null;
      if (detail && hasBuff(detail)) details.push({ name: selectedOpponent.skill1Name, detail });
    }
    if (selectedOpponent.skill2Name) {
      const detail = skillMap[selectedOpponent.skill2Name.toLowerCase()] ?? null;
      if (detail && hasBuff(detail)) details.push({ name: selectedOpponent.skill2Name, detail });
    }
    // Add sparking buffs as a pseudo-skill if present
    if (selectedOpponent.sparkStatBuffs && hasBuff(selectedOpponent.sparkStatBuffs)) {
      details.push({
        name: 'Sparking Mode',
        detail: { id: `spark_${selectedOpponent.name}`, instantSparking: true, ...selectedOpponent.sparkStatBuffs },
      });
    }
    return details;
  }, [selectedOpponent, skillMap]);

  function handleSelect(char) {
    onSelectOpponent(char);
    setShowSelector(false);
  }

  return (
    <div className="flex flex-col h-full bg-sz-panel">
      {/* Header — only shown when an opponent is selected */}
      {selectedOpponent && (
        <div className="px-3 py-2.5 border-b border-sz-border bg-red-950/30 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            {onSwap && (
              <button
                onClick={onSwap}
                className="flex-shrink-0 p-1.5 rounded-full border border-emerald-600/50 bg-emerald-950/70 hover:bg-emerald-700/50 hover:border-emerald-400 text-emerald-400 hover:text-emerald-200 transition-all shadow-sm hover:shadow-emerald-900/60"
                title="Swap main character and opponent"
              >
                <ArrowLeftRight size={16} />
              </button>
            )}
            <div className="w-10 h-10 rounded bg-sz-border flex-shrink-0 overflow-hidden">
              {characterImages?.[selectedOpponent.name] ? (
                <img
                  src={getImageUrl(characterImages[selectedOpponent.name])}
                  alt={selectedOpponent.name}
                  className="w-full h-full object-cover object-top scale-125"
                  loading="lazy"
                  onError={e => { e.target.style.display = 'none'; }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-600 text-sm font-bold">
                  {selectedOpponent.name[0]}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <div className="text-sm font-bold text-white truncate leading-tight">{selectedOpponent.name}</div>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <ClassBadge cls={selectedOpponent.class} />
                <span className="text-xs text-sz-orange font-mono font-bold">DP {selectedOpponent.dp}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => setShowSelector(s => !s)}
                className="text-xs px-2 py-1 rounded bg-sz-border hover:bg-gray-600 text-gray-400 hover:text-white transition-colors"
              >
                {showSelector ? 'Hide' : 'Change'}
              </button>
              <button
                onClick={() => { onClearOpponent(); setShowSelector(true); }}
                className="text-xs px-2 py-1 rounded bg-sz-border hover:bg-red-900/60 text-gray-400 hover:text-red-400 transition-colors"
                title="Clear opponent"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Character Selector (collapsible) */}
      {(showSelector) && (
        <div className="flex flex-col border-b border-sz-border">
          <div className="px-3 pt-2 pb-1 space-y-1.5 flex-shrink-0">
            {/* Team selector */}
            <div className="relative">
              <button
                onClick={() => setTeamOpen(o => !o)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 bg-sz-border rounded text-xs text-gray-200 hover:bg-gray-700 transition-colors"
              >
                <span className="truncate">{selectedTeam || 'All Teams'}</span>
                <ChevronDown size={12} className={`flex-shrink-0 ml-1 transition-transform ${teamOpen ? 'rotate-180' : ''}`} />
              </button>
              {teamOpen && (
                <div className="absolute z-20 w-full mt-1 bg-[#222] border border-sz-border rounded shadow-xl max-h-48 overflow-y-auto">
                  <button
                    className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-sz-border text-gray-300"
                    onClick={() => { setSelectedTeam(''); setTeamOpen(false); }}
                  >All Teams</button>
                  {teams.teamNames?.map(team => (
                    <button
                      key={team}
                      className={`w-full text-left px-2.5 py-1.5 text-xs hover:bg-sz-border ${selectedTeam === team ? 'text-sz-orange bg-sz-border' : 'text-gray-300'}`}
                      onClick={() => { setSelectedTeam(team); setTeamOpen(false); }}
                    >{team}</button>
                  ))}
                </div>
              )}
            </div>
            {/* Class filter */}
            <div className="relative">
              <button
                onClick={() => setClassOpen(o => !o)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 bg-sz-border rounded text-xs text-gray-200 hover:bg-gray-700 transition-colors"
              >
                <span className="truncate">{classFilter || 'All Classes'}</span>
                <ChevronDown size={12} className={`flex-shrink-0 ml-1 transition-transform ${classOpen ? 'rotate-180' : ''}`} />
              </button>
              {classOpen && (
                <div className="absolute z-20 w-full mt-1 bg-[#222] border border-sz-border rounded shadow-xl max-h-48 overflow-y-auto">
                  <button
                    className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-sz-border text-gray-300"
                    onClick={() => { setClassFilter(''); setClassOpen(false); }}
                  >All Classes</button>
                  {allClasses.map(cls => (
                    <button
                      key={cls}
                      className={`w-full text-left px-2.5 py-1.5 text-xs hover:bg-sz-border ${classFilter === cls ? 'text-sz-orange bg-sz-border' : 'text-gray-300'}`}
                      onClick={() => { setClassFilter(cls); setClassOpen(false); }}
                    >{cls}</button>
                  ))}
                </div>
              )}
            </div>
            {/* Search */}
            <div className="relative">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search characters…"
                className="w-full pl-7 pr-2.5 py-1.5 bg-sz-border rounded text-xs text-gray-200 placeholder-gray-500 outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
          </div>
          {/* Character list */}
          <div className="overflow-y-auto">
            {filteredCharacters.map(char => {
              const imgId = characterImages?.[char.name];
              const isSelected = selectedOpponent?.name === char.name;
              return (
                <button
                  key={char.name}
                  onClick={() => handleSelect(char)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors border-b border-sz-border/50 hover:bg-gray-800 ${isSelected ? 'bg-gray-800 border-l-2 border-l-red-500' : ''}`}
                >
                  <div className="w-10 h-10 rounded bg-sz-border flex-shrink-0 overflow-hidden">
                    {imgId ? (
                      <img
                        src={getImageUrl(imgId)}
                        alt={char.name}
                        className="w-full h-full object-cover object-top scale-125"
                        loading="lazy"
                        onError={e => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs font-bold">
                        {char.name[0]}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-gray-100 truncate leading-tight">{char.name}</div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <ClassBadge cls={char.class} />
                      <span className="text-xs text-gray-500">DP {char.dp}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Only show skills + capsules when an opponent is selected */}
      {selectedOpponent && !showSelector && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Skill toggles */}
          {charSkillDetails.length > 0 && (
            <div className="border-b border-sz-border">
              <div className="px-3 py-1.5 bg-purple-900/40 border-b border-sz-border">
                <span className="text-xs font-bold uppercase tracking-widest text-purple-400">Skills</span>
              </div>
              {charSkillDetails.map(({ name, detail }) => {
                const isActive = activeSkills.some(s => s.id === detail?.id);
                return (
                  <button
                    key={name}
                    onClick={() => detail && onToggleSkill(detail)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left border-b border-sz-border/30 transition-colors ${
                      isActive ? 'bg-yellow-900/30' : 'hover:bg-gray-800/30'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? 'bg-yellow-400' : 'bg-gray-600'}`} />
                    <span className="text-xs text-gray-200">{name}</span>
                    {isActive && <span className="ml-auto text-[10px] text-yellow-400 font-semibold">Active</span>}
                  </button>
                );
              })}
            </div>
          )}

          {/* Capsule slots */}
          <div className="border-b border-sz-border">
            <div className="px-3 py-2 flex items-center justify-between bg-sz-panel/80 border-b border-sz-border">
              <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Capsules</span>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-mono font-bold ${overBudget ? 'text-red-400' : 'text-sz-orange'}`}>
                  {totalCost}/{CAPSULE_BUDGET}
                </span>
                {equippedCapsules.some(Boolean) && (
                  <button onClick={onClearCapsules} className="text-xs text-gray-600 hover:text-red-400 transition-colors">Clear</button>
                )}
              </div>
            </div>
            {/* Budget bar */}
            <div className="h-1 bg-sz-border">
              <div className={`h-full transition-all ${overBudget ? 'bg-red-500' : 'bg-sz-orange'}`} style={{ width: `${pct}%` }} />
            </div>
            <table className="w-full">
              <tbody>
                {equippedCapsules.map((cap, i) => {
                  const isActive = activeSlot === i;
                  return (
                    <tr
                      key={i}
                      onClick={() => onSlotClick(isActive ? null : i)}
                      className={`border-b border-sz-border/30 cursor-pointer transition-colors ${
                        isActive ? 'bg-orange-950/40' : cap ? 'hover:bg-gray-800/50' : 'hover:bg-gray-900/40'
                      }`}
                    >
                      <td className={`py-1 px-2 text-xs font-mono ${isActive ? 'text-sz-orange' : 'text-gray-600'}`}>{i + 1}</td>
                      <td className="py-1 px-1.5 text-xs truncate max-w-0 w-full">
                        {cap
                          ? <span className="text-gray-200">{cap.name}</span>
                          : <span className="text-gray-700 italic">empty</span>
                        }
                      </td>
                      <td className="py-1 px-1.5 text-right">
                        {cap ? <Stars cost={cap.cost} /> : <span className="text-xs text-gray-700">—</span>}
                      </td>
                      <td className="py-1 px-1">
                        {cap && (
                          <button
                            onClick={e => { e.stopPropagation(); onRemoveCapsule(i); }}
                            className="text-gray-700 hover:text-red-400 transition-colors"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {activeSlot !== null && (
              <div className="px-3 py-1.5 text-xs text-sz-orange/70 bg-orange-950/20 border-b border-sz-border">
                Slot {activeSlot + 1} selected — click a capsule below
              </div>
            )}
          </div>

          {/* Capsule picker */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex gap-1.5 px-2 py-1.5 border-b border-sz-border flex-shrink-0">
              <div className="relative flex-1">
                <Search size={10} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-gray-600" />
                <input
                  type="text"
                  value={capsSearch}
                  onChange={e => setCapsSearch(e.target.value)}
                  placeholder="Search capsules…"
                  className="w-full pl-5 pr-2 py-1.5 bg-sz-border rounded text-xs text-gray-200 placeholder-gray-600 outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
              <select
                value={costFilter}
                onChange={e => setCostFilter(e.target.value)}
                className="bg-sz-border rounded text-xs text-gray-300 px-1.5 outline-none"
              >
                <option value="">All</option>
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}★</option>)}
              </select>
            </div>
            <div className="overflow-y-auto">
              <table className="w-full">
                <tbody>
                  {filteredCapsules.map(cap => {
                    const equipped = equippedNames.has(cap.name);
                    const hasOpenSlot = equippedCapsules.some(c => c === null);
                    const canSelect = !equipped && (activeSlot !== null || hasOpenSlot);
                    const slotCost = activeSlot !== null ? (equippedCapsules[activeSlot]?.cost ?? 0) : 0;
                    const wouldExceed = canSelect && (totalCost - slotCost + cap.cost > CAPSULE_BUDGET);
                    return (
                      <tr
                        key={cap.name}
                        onClick={() => canSelect && onEquipCapsule(cap)}
                        className={`border-b border-sz-border/20 ${
                          equipped
                            ? 'opacity-40 cursor-not-allowed'
                            : !canSelect
                            ? 'cursor-default opacity-50'
                            : wouldExceed
                            ? 'cursor-pointer hover:bg-red-950/30'
                            : 'cursor-pointer hover:bg-gray-800/60'
                        }`}
                      >
                        <td className="py-1 px-2">
                          <div className="text-xs text-gray-200 leading-tight">{cap.name}</div>
                          {cap.description && (
                            <div className="text-xs text-gray-500 leading-tight mt-0.5">{cap.description}</div>
                          )}
                        </td>
                        <td className="py-1 px-1.5 text-right align-top pt-1">
                          <Stars cost={cap.cost} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
