import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import CharacterSelector from './components/CharacterSelector.jsx';
import StatsPanel from './components/StatsPanel.jsx';
import CapsuleBuilder from './components/CapsuleBuilder.jsx';
import SkillsPanel from './components/SkillsPanel.jsx';
import { computeModifiedStats, applySkillBuffs, encodeBuild, decodeBuild, CAPSULE_BUDGET } from './utils/calculator.js';

const NUM_CAPSULE_SLOTS = 7;

function App() {
  const [characters, setCharacters] = useState([]);
  const [capsules, setCapsules] = useState([]);
  const [blasts, setBlasts] = useState({});
  const [skills, setSkills] = useState([]);
  const [teams, setTeams] = useState({ teamNames: [], teams: {} });
  const [characterImages, setCharacterImages] = useState({});

  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [selectorCollapsed, setSelectorCollapsed] = useState(false);
  const [capsuleCollapsed, setCapsuleCollapsed] = useState(false);
  // Array of capsule objects or null (for empty slots)
  const [equippedCapsules, setEquippedCapsules] = useState(Array(NUM_CAPSULE_SLOTS).fill(null));
  const [activeSlot, setActiveSlot] = useState(null); // which slot is being edited
  const [activeSkills, setActiveSkills] = useState([]); // activated skill buff objects

  // Load all data
  useEffect(() => {
    const base = import.meta.env.BASE_URL;
    Promise.all([
      fetch(`${base}data/characters.json`).then(r => r.json()),
      fetch(`${base}data/capsules.json`).then(r => r.json()),
      fetch(`${base}data/blast.json`).then(r => r.json()),
      fetch(`${base}data/teams.json`).then(r => r.json()),
      fetch(`${base}data/characterImages.json`).then(r => r.json()),
      fetch(`${base}data/skills.json`).then(r => r.json()),
    ]).then(([chars, caps, bl, tm, imgs, sk]) => {
      setCharacters(chars);
      setCapsules(caps);
      setBlasts(bl);
      setSkills(sk);
      setTeams(tm);
      setCharacterImages(imgs);

      // Restore from URL hash if present
      const hash = window.location.hash.slice(1);
      if (hash) {
        const decoded = decodeBuild(hash);
        if (decoded) {
          const char = chars.find(c => c.name === decoded.characterName);
          if (char) setSelectedCharacter(char);
          if (decoded.capsuleNames) {
            const restored = decoded.capsuleNames.map(name =>
              name ? caps.find(c => c.name === name) || null : null
            );
            setEquippedCapsules(restored);
          }
        }
      }
    }).catch(console.error);
  }, []);

  // Update URL hash when build changes
  useEffect(() => {
    if (!selectedCharacter) return;
    const hash = encodeBuild(
      selectedCharacter.name,
      equippedCapsules.map(c => c?.name ?? null)
    );
    window.history.replaceState(null, '', `#${hash}`);
  }, [selectedCharacter, equippedCapsules]);

  const modifiedStats = useMemo(
    () => applySkillBuffs(
      computeModifiedStats(selectedCharacter, equippedCapsules.filter(Boolean)),
      activeSkills
    ),
    [selectedCharacter, equippedCapsules, activeSkills]
  );

  const handleEquipCapsule = useCallback((capsule) => {
    setEquippedCapsules(prev => {
      const targetSlot = activeSlot !== null ? activeSlot : prev.findIndex(c => c === null);
      if (targetSlot === -1) return prev;
      const next = [...prev];
      next[targetSlot] = capsule;
      return next;
    });
    setActiveSlot(null);
  }, [activeSlot]);

  const handleRemoveCapsule = useCallback((slotIndex) => {
    setEquippedCapsules(prev => {
      const next = [...prev];
      next[slotIndex] = null;
      return next;
    });
  }, []);

  const handleClearBuild = useCallback(() => {
    setEquippedCapsules(Array(NUM_CAPSULE_SLOTS).fill(null));
    setActiveSlot(null);
  }, []);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
  }, []);

  return (
    <div className="h-screen bg-sz-dark text-gray-100 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-sz-panel border-b border-sz-border px-4 py-2.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Layered title icons: bg + color overlay */}
          <div className="flex items-center -space-x-1">
            <div className="relative w-24 h-10">
              <img src={`${import.meta.env.BASE_URL}titleicons/T_UI_Logo_Body02_bg.png`}    alt="" className="absolute inset-0 w-full h-full object-contain" />
              <img src={`${import.meta.env.BASE_URL}titleicons/T_UI_Logo_Body02_Color.png`} alt="" className="absolute inset-0 w-full h-full object-contain" />
            </div>
            <div className="relative w-16 h-10">
              <img src={`${import.meta.env.BASE_URL}titleicons/T_UI_Logo_Body03_bg.png`}    alt="" className="absolute inset-0 w-full h-full object-contain" />
              <img src={`${import.meta.env.BASE_URL}titleicons/T_UI_Logo_Body03_Color.png`} alt="" className="absolute inset-0 w-full h-full object-contain" />
            </div>
          </div>
          <h1 className="text-lg font-bold text-white tracking-wide">Character Calculator</h1>
        </div>
        <div className="flex gap-2">
          {selectedCharacter && (
            <button
              onClick={handleCopyLink}
              className="text-sm px-3 py-1.5 rounded bg-sz-border hover:bg-gray-600 text-gray-300 transition-colors"
            >
              Copy Link
            </button>
          )}
        </div>
      </header>

      {/* Main 3-column layout — fills remaining height */}
      <div className="flex flex-1 overflow-hidden">
        {/* Col 1: Character picker — narrow, scrollable */}
        <aside className={`${selectorCollapsed ? 'w-8' : 'w-[25rem]'} border-r border-sz-border bg-sz-panel flex-shrink-0 flex flex-col overflow-hidden transition-[width] duration-200`}>
          {selectorCollapsed ? (
            <button
              onClick={() => setSelectorCollapsed(false)}
              className="w-full flex flex-col items-center justify-center gap-1.5 py-4 text-gray-500 hover:text-sz-orange hover:bg-gray-800/60 transition-colors h-full"
              title="Expand Character Select"
            >
              <ChevronRight size={16} />
              <span className="text-[10px] font-semibold uppercase tracking-widest [writing-mode:vertical-rl] rotate-180 leading-none text-gray-600 hover:text-sz-orange">Chars</span>
            </button>
          ) : (
            <CharacterSelector
              characters={characters}
              teams={teams}
              characterImages={characterImages}
              selectedCharacter={selectedCharacter}
              onCollapse={() => setSelectorCollapsed(true)}
              onSelect={(char) => {
                setSelectedCharacter(char);
                setEquippedCapsules(Array(NUM_CAPSULE_SLOTS).fill(null));
                setActiveSlot(null);
                setActiveSkills([]);
              }}
            />
          )}
        </aside>

        {/* Col 2: Stats — compact fixed-width, scrollable */}
        <div className="w-[25rem] border-r border-sz-border flex-shrink-0 overflow-y-auto">
          <StatsPanel
            baseStats={selectedCharacter}
            modifiedStats={modifiedStats}
            characterImages={characterImages}
          />
        </div>

        {/* Col 3: Right panel — fills remaining width, sub-divided */}
        <div className="flex-1 flex overflow-hidden min-w-0">
          {/* Skills & Blasts */}
          <div className="flex-1 border-r border-sz-border overflow-y-auto min-w-0">
            <SkillsPanel
              character={selectedCharacter}
              blasts={blasts}
              skills={skills}
              equippedCapsules={equippedCapsules}
              activeSkills={activeSkills}
              onToggleSkill={(skill) => {
                setActiveSkills(prev => {
                  const idx = prev.findIndex(s => s.id === skill.id);
                  return idx === -1 ? [...prev, skill] : prev.filter((_, i) => i !== idx);
                });
              }}
            />
          </div>

          {/* Capsule Builder */}
          <div className={`${capsuleCollapsed ? 'w-8' : 'w-[26rem]'} flex-shrink-0 overflow-hidden flex flex-col transition-[width] duration-200`}>
            {capsuleCollapsed ? (
              <button
                onClick={() => setCapsuleCollapsed(false)}
                className="w-full flex flex-col items-center justify-center gap-1.5 py-4 text-gray-500 hover:text-sz-orange hover:bg-gray-800/60 transition-colors h-full"
                title="Expand Capsule Builder"
              >
                <ChevronLeft size={16} />
                <span className="text-[10px] font-semibold uppercase tracking-widest [writing-mode:vertical-rl] rotate-180 leading-none text-gray-600">Caps</span>
              </button>
            ) : (
              <CapsuleBuilder
                capsules={capsules}
                equippedCapsules={equippedCapsules}
                activeSlot={activeSlot}
                onSlotClick={setActiveSlot}
                onEquip={handleEquipCapsule}
                onRemove={handleRemoveCapsule}
                onClear={handleClearBuild}
                onCollapse={() => setCapsuleCollapsed(true)}
                budget={CAPSULE_BUDGET}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
