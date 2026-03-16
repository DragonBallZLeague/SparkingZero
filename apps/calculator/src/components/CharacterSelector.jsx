import React, { useState, useMemo } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { getImageUrl, getClassBadge } from '../utils/calculator.js';

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

function ClassBadge({ cls }) {
  const color = CLASS_COLORS[cls] || 'bg-gray-600';
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-semibold leading-none ${color}`}>
      {cls}
    </span>
  );
}

export default function CharacterSelector({ characters, teams, characterImages, selectedCharacter, onSelect, onCollapse }) {
  const [search, setSearch] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [teamOpen, setTeamOpen] = useState(false);

  const allClasses = useMemo(() => {
    const set = new Set(characters.map(c => c.class).filter(Boolean));
    return [...set].sort();
  }, [characters]);

  const filteredCharacters = useMemo(() => {
    let list = characters;

    // Team filter
    if (selectedTeam && teams.teams[selectedTeam]) {
      const teamMembers = new Set(teams.teams[selectedTeam]);
      list = list.filter(c => teamMembers.has(c.name));
    }

    // Class filter
    if (classFilter) {
      list = list.filter(c => c.class === classFilter);
    }

    // Search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q));
    }

    return list;
  }, [characters, teams, selectedTeam, classFilter, search]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-3 border-b border-sz-border space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Character</h2>
          <button onClick={onCollapse} className="flex items-center gap-1 px-2 py-0.5 rounded bg-sz-border hover:bg-gray-600 text-gray-400 hover:text-white transition-colors text-xs font-medium" title="Collapse">
            <ChevronDown size={13} className="rotate-90" />
            <span>Hide</span>
          </button>
        </div>

        {/* Team selector */}
        <div className="relative">
          <button
            onClick={() => setTeamOpen(o => !o)}
            className="w-full flex items-center justify-between px-3 py-2 bg-sz-border rounded text-sm text-gray-200 hover:bg-gray-700 transition-colors"
          >
            <span className="truncate">{selectedTeam || 'All Teams'}</span>
            <ChevronDown size={14} className={`flex-shrink-0 ml-1 transition-transform ${teamOpen ? 'rotate-180' : ''}`} />
          </button>
          {teamOpen && (
            <div className="absolute z-20 w-full mt-1 bg-[#222] border border-sz-border rounded shadow-xl max-h-60 overflow-y-auto">
              <button
                className="w-full text-left px-3 py-2 text-sm hover:bg-sz-border text-gray-300"
                onClick={() => { setSelectedTeam(''); setTeamOpen(false); }}
              >
                All Teams
              </button>
              {teams.teamNames?.map(team => (
                <button
                  key={team}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-sz-border ${selectedTeam === team ? 'text-sz-orange bg-sz-border' : 'text-gray-300'}`}
                  onClick={() => { setSelectedTeam(team); setTeamOpen(false); }}
                >
                  {team}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Class filter */}
        <select
          value={classFilter}
          onChange={e => setClassFilter(e.target.value)}
          className="w-full px-3 py-2 bg-sz-border rounded text-sm text-gray-200 border-none outline-none"
        >
          <option value="">All Classes</option>
          {allClasses.map(cls => (
            <option key={cls} value={cls}>{cls}</option>
          ))}
        </select>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search characters…"
            className="w-full pl-8 pr-3 py-2 bg-sz-border rounded text-sm text-gray-200 placeholder-gray-500 outline-none focus:ring-1 focus:ring-sz-orange"
          />
        </div>

        <p className="text-xs text-gray-600">{filteredCharacters.length} characters</p>
      </div>

      {/* Character list */}
      <div className="flex-1 overflow-y-auto">
        {filteredCharacters.map(char => {
          const imgId = characterImages[char.name];
          const isSelected = selectedCharacter?.name === char.name;
          return (
            <button
              key={char.name}
              onClick={() => onSelect(char)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-b border-sz-border/50 hover:bg-gray-800 ${isSelected ? 'bg-gray-800 border-l-2 border-l-sz-orange' : ''}`}
            >
              {/* Avatar */}
              <div className="w-14 h-14 rounded bg-sz-border flex-shrink-0 overflow-hidden">
                {imgId ? (
                  <img
                    src={getImageUrl(imgId)}
                    alt={char.name}
                    className="w-full h-full object-cover scale-125"
                    loading="lazy"
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600 text-sm font-bold">
                    {char.name[0]}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-100 truncate leading-tight">{char.name}</div>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <ClassBadge cls={char.class} />
                  <span className="text-sm text-gray-500">DP {char.dp}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
