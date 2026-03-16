import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import CharacterSelector from './components/CharacterSelector.jsx';
import StatsPanel from './components/StatsPanel.jsx';
import CapsuleBuilder from './components/CapsuleBuilder.jsx';
import SkillsPanel from './components/SkillsPanel.jsx';
import { computeModifiedStats, applySkillBuffs, encodeBuild, decodeBuild, CAPSULE_BUDGET } from './utils/calculator.js';

const NUM_CAPSULE_SLOTS = 7;
const MOBILE_SECTIONS = ['Characters', 'Stats', 'Skills', 'Capsules'];

// ---------------------------------------------------------------------------
// Tablet layout — 2-panel sliding state machine
// States: 'chars_stats' | 'stats_skills' | 'skills_only' | 'skills_caps'
// ---------------------------------------------------------------------------
function tabletTransition(state, swipedLeft, touchedLeftHalf) {
  switch (state) {
    case 'chars_stats':
      if (!touchedLeftHalf && swipedLeft) return 'stats_skills';  // swipe left on Stats → advance
      return state;
    case 'stats_skills':
      if (touchedLeftHalf  && swipedLeft)  return 'skills_only';  // swipe left  on Stats  → close Stats
      if (touchedLeftHalf  && !swipedLeft) return 'chars_stats';  // swipe right on Stats  → back to Chars
      if (!touchedLeftHalf && swipedLeft)  return 'skills_caps';  // swipe left  on Skills → open Capsules
      return state;
    case 'skills_only':
      return swipedLeft ? 'skills_caps' : 'stats_skills';
    case 'skills_caps':
      if (!touchedLeftHalf && !swipedLeft) return 'skills_only';  // swipe right on Capsules → close Caps
      if (touchedLeftHalf  && !swipedLeft) return 'stats_skills'; // swipe right on Skills  → back
      return state;
    default:
      return state;
  }
}

const TABLET_STATES = ['chars_stats', 'stats_skills', 'skills_only', 'skills_caps'];

// left offset per state for each panel
const TABLET_POSITIONS = {
  chars_stats:  { chars: '0%',   stats: '50%',  skills: '100%', capsules: '150%' },
  stats_skills: { chars: '-50%', stats: '0%',   skills: '50%',  capsules: '100%' },
  skills_only:  { chars: '-50%', stats: '-50%', skills: '0%',   capsules: '100%' },
  skills_caps:  { chars: '-50%', stats: '-50%', skills: '0%',   capsules: '50%'  },
};

// width per state — Skills expands to fill screen when alone
const TABLET_WIDTHS = {
  chars_stats:  { chars: '50%', stats: '50%', skills: '50%',  capsules: '50%' },
  stats_skills: { chars: '50%', stats: '50%', skills: '50%',  capsules: '50%' },
  skills_only:  { chars: '50%', stats: '50%', skills: '100%', capsules: '50%' },
  skills_caps:  { chars: '50%', stats: '50%', skills: '50%',  capsules: '50%' },
};

// which nav tab is highlighted per tablet state (right / primary panel)
const TABLET_NAV_ACTIVE = { chars_stats: 0, stats_skills: 2, skills_only: 2, skills_caps: 3 };

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
  const [currentSection, setCurrentSection] = useState(0); // mobile: 0=chars,1=stats,2=skills,3=capsules
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const touchSuppressed = useRef(false);
  const mobileTrackRef = useRef(null);

  // Tablet
  const [tabletState, setTabletState] = useState('chars_stats');
  const tabletTouchStartX = useRef(null);
  const tabletTouchStartY = useRef(null);
  const tabletTouchSuppressed = useRef(false);
  const tabletTrackRef = useRef(null);

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
          if (char) {
            setSelectedCharacter(char);
            setCurrentSection(1);
            setTabletState('stats_skills');
          }
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

  // Shared select handler used by all three layouts
  const handleCharacterSelect = useCallback((char) => {
    setSelectedCharacter(char);
    setEquippedCapsules(Array(NUM_CAPSULE_SLOTS).fill(null));
    setActiveSlot(null);
    setActiveSkills([]);
    setCurrentSection(1);
    setTabletState('stats_skills');
  }, []);

  const handleTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    // Suppress section swipe if touch begins inside a horizontally scrollable element
    touchSuppressed.current = false;
    const trackEl = mobileTrackRef.current;
    let el = e.target;
    while (el && el !== trackEl) {
      const style = window.getComputedStyle(el);
      const ox = style.overflowX;
      if ((ox === 'auto' || ox === 'scroll') && el.scrollWidth > el.clientWidth) {
        touchSuppressed.current = true;
        break;
      }
      el = el.parentElement;
    }
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (touchStartX.current === null || touchSuppressed.current) {
      touchStartX.current = null;
      touchStartY.current = null;
      touchSuppressed.current = false;
      return;
    }
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;
    if (Math.abs(deltaX) < 50 || Math.abs(deltaX) < Math.abs(deltaY)) return;
    setCurrentSection(s => deltaX < 0
      ? Math.min(MOBILE_SECTIONS.length - 1, s + 1)
      : Math.max(0, s - 1));
  }, []);

  // Attach touch listeners as passive so the browser can start scroll gestures
  // immediately without waiting for JS (non-passive React touch props block scroll
  // on iOS Safari even when preventDefault is never called).
  useEffect(() => {
    const el = mobileTrackRef.current;
    if (!el) return;
    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchEnd]);

  // Tablet touch — same passive pattern, determines left/right panel from touch X
  const handleTabletTouchStart = useCallback((e) => {
    tabletTouchStartX.current = e.touches[0].clientX;
    tabletTouchStartY.current = e.touches[0].clientY;
    tabletTouchSuppressed.current = false;
    const trackEl = tabletTrackRef.current;
    let el = e.target;
    while (el && el !== trackEl) {
      const style = window.getComputedStyle(el);
      const ox = style.overflowX;
      if ((ox === 'auto' || ox === 'scroll') && el.scrollWidth > el.clientWidth) {
        tabletTouchSuppressed.current = true;
        break;
      }
      el = el.parentElement;
    }
  }, []);

  const handleTabletTouchEnd = useCallback((e) => {
    if (tabletTouchStartX.current === null || tabletTouchSuppressed.current) {
      tabletTouchStartX.current = null;
      tabletTouchStartY.current = null;
      tabletTouchSuppressed.current = false;
      return;
    }
    const deltaX = e.changedTouches[0].clientX - tabletTouchStartX.current;
    const deltaY = e.changedTouches[0].clientY - tabletTouchStartY.current;
    const startX = tabletTouchStartX.current;
    tabletTouchStartX.current = null;
    tabletTouchStartY.current = null;
    if (Math.abs(deltaX) < 50 || Math.abs(deltaX) < Math.abs(deltaY)) return;
    const swipedLeft = deltaX < 0;
    const touchedLeftHalf = startX < window.innerWidth / 2;
    setTabletState(s => tabletTransition(s, swipedLeft, touchedLeftHalf));
  }, []);

  useEffect(() => {
    const el = tabletTrackRef.current;
    if (!el) return;
    el.addEventListener('touchstart', handleTabletTouchStart, { passive: true });
    el.addEventListener('touchend', handleTabletTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', handleTabletTouchStart);
      el.removeEventListener('touchend', handleTabletTouchEnd);
    };
  }, [handleTabletTouchStart, handleTabletTouchEnd]);

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

      {/* Desktop: Main 3-column layout — fills remaining height */}
      <div className="hidden min-[1217px]:flex flex-1 overflow-hidden">
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
              onSelect={handleCharacterSelect}
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

      {/* Tablet: 2-panel sliding layout (793px – 1216px) */}
      <div className="hidden min-[793px]:flex min-[1217px]:hidden flex-1 flex-col overflow-hidden">
        <div ref={tabletTrackRef} className="flex-1 relative overflow-hidden min-h-0">

          {/* Chars panel */}
          <div
            className="absolute top-0 bottom-0 overflow-y-auto overflow-x-hidden flex flex-col bg-sz-panel border-r border-sz-border"
            style={{ left: TABLET_POSITIONS[tabletState].chars, width: TABLET_WIDTHS[tabletState].chars, transition: 'left 0.3s ease, width 0.3s ease' }}
          >
            <CharacterSelector
              characters={characters}
              teams={teams}
              characterImages={characterImages}
              selectedCharacter={selectedCharacter}
              onCollapse={() => {}}
              onSelect={handleCharacterSelect}
            />
          </div>

          {/* Stats panel */}
          <div
            className="absolute top-0 bottom-0 overflow-y-auto overflow-x-hidden border-r border-sz-border"
            style={{ left: TABLET_POSITIONS[tabletState].stats, width: TABLET_WIDTHS[tabletState].stats, transition: 'left 0.3s ease, width 0.3s ease' }}
          >
            <StatsPanel
              baseStats={selectedCharacter}
              modifiedStats={modifiedStats}
              characterImages={characterImages}
            />
          </div>

          {/* Skills panel — border-r only when Capsules is alongside it */}
          <div
            className={`absolute top-0 bottom-0 overflow-y-auto overflow-x-hidden${tabletState === 'skills_caps' ? ' border-r border-sz-border' : ''}`}
            style={{ left: TABLET_POSITIONS[tabletState].skills, width: TABLET_WIDTHS[tabletState].skills, transition: 'left 0.3s ease, width 0.3s ease' }}
          >
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

          {/* Capsules panel */}
          <div
            className="absolute top-0 bottom-0 overflow-hidden flex flex-col"
            style={{ left: TABLET_POSITIONS[tabletState].capsules, width: TABLET_WIDTHS[tabletState].capsules, transition: 'left 0.3s ease, width 0.3s ease' }}
          >
            <CapsuleBuilder
              capsules={capsules}
              equippedCapsules={equippedCapsules}
              activeSlot={activeSlot}
              onSlotClick={setActiveSlot}
              onEquip={handleEquipCapsule}
              onRemove={handleRemoveCapsule}
              onClear={handleClearBuild}
              onCollapse={() => {}}
              budget={CAPSULE_BUDGET}
            />
          </div>
        </div>

        {/* Tablet bottom navigation */}
        <div className="flex-shrink-0 border-t border-sz-border bg-sz-panel flex items-center px-3 py-2 gap-2">
          <button
            onClick={() => setTabletState(s => { const i = TABLET_STATES.indexOf(s); return i > 0 ? TABLET_STATES[i - 1] : s; })}
            disabled={TABLET_STATES.indexOf(tabletState) === 0}
            className="p-1.5 rounded text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex flex-1 gap-1">
            {TABLET_STATES.map((state, i) => (
              <button
                key={i}
                onClick={() => setTabletState(state)}
                className={`flex-1 text-xs py-1.5 rounded font-semibold transition-colors ${
                  TABLET_NAV_ACTIVE[tabletState] === i
                    ? 'bg-sz-orange text-black'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {MOBILE_SECTIONS[i]}
              </button>
            ))}
          </div>
          <button
            onClick={() => setTabletState(s => { const i = TABLET_STATES.indexOf(s); return i < TABLET_STATES.length - 1 ? TABLET_STATES[i + 1] : s; })}
            disabled={TABLET_STATES.indexOf(tabletState) === TABLET_STATES.length - 1}
            className="p-1.5 rounded text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Mobile: Full-width sliding sections */}
      <div className="flex min-[793px]:hidden flex-1 flex-col overflow-hidden">
        {/* Frame — positioning context and touch-listener target */}
        <div ref={mobileTrackRef} className="flex-1 relative overflow-hidden min-h-0">

          {/* Section 0: Character Selector */}
          <div
            className="absolute inset-0 overflow-y-auto overflow-x-hidden flex flex-col bg-sz-panel"
            style={{ transform: `translateX(${(0 - currentSection) * 100}%)`, transition: 'transform 0.3s ease' }}
          >
            <CharacterSelector
              characters={characters}
              teams={teams}
              characterImages={characterImages}
              selectedCharacter={selectedCharacter}
              onCollapse={() => {}}
              onSelect={handleCharacterSelect}
            />
          </div>

          {/* Section 1: Stats */}
          <div
            className="absolute inset-0 overflow-y-auto overflow-x-hidden"
            style={{ transform: `translateX(${(1 - currentSection) * 100}%)`, transition: 'transform 0.3s ease' }}
          >
            <StatsPanel
              baseStats={selectedCharacter}
              modifiedStats={modifiedStats}
              characterImages={characterImages}
            />
          </div>

          {/* Section 2: Skills & Blasts */}
          <div
            className="absolute inset-0 overflow-y-auto overflow-x-hidden"
            style={{ transform: `translateX(${(2 - currentSection) * 100}%)`, transition: 'transform 0.3s ease' }}
          >
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

          {/* Section 3: Capsule Builder */}
          <div
            className="absolute inset-0 overflow-hidden flex flex-col"
            style={{ transform: `translateX(${(3 - currentSection) * 100}%)`, transition: 'transform 0.3s ease' }}
          >
            <CapsuleBuilder
              capsules={capsules}
              equippedCapsules={equippedCapsules}
              activeSlot={activeSlot}
              onSlotClick={setActiveSlot}
              onEquip={handleEquipCapsule}
              onRemove={handleRemoveCapsule}
              onClear={handleClearBuild}
              onCollapse={() => {}}
              budget={CAPSULE_BUDGET}
            />
          </div>
        </div>

        {/* Mobile bottom navigation */}
        <div className="flex-shrink-0 border-t border-sz-border bg-sz-panel flex items-center px-3 py-2 gap-2">
          <button
            onClick={() => setCurrentSection(s => Math.max(0, s - 1))}
            disabled={currentSection === 0}
            className="p-1.5 rounded text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex flex-1 gap-1">
            {MOBILE_SECTIONS.map((label, i) => (
              <button
                key={i}
                onClick={() => setCurrentSection(i)}
                className={`flex-1 text-xs py-1.5 rounded font-semibold transition-colors ${
                  currentSection === i
                    ? 'bg-sz-orange text-black'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setCurrentSection(s => Math.min(MOBILE_SECTIONS.length - 1, s + 1))}
            disabled={currentSection === MOBILE_SECTIONS.length - 1}
            className="p-1.5 rounded text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
