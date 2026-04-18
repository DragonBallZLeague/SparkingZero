import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { BookOpen, ChevronDown } from 'lucide-react';

import HowToParticipate from './rules/HowToParticipate';
import LeagueWideRules from './rules/LeagueWideRules';
import LegalPotaras from './rules/LegalPotaras';
import BuildRules from './rules/BuildRules';
import AIDescriptions from './rules/AIDescriptions';
import BenchRules from './rules/BenchRules';
import CoachingRules from './rules/CoachingRules';
import StaffOnTeamRules from './rules/StaffOnTeamRules';
import OffSeasonSchedule from './rules/OffSeasonSchedule';
import PostSeasonSeeding from './rules/PostSeasonSeeding';
import TestingRules from './rules/TestingRules';
import Mods from './rules/Mods';

const NAV_GROUPS = [
  {
    label: 'Getting Started',
    items: [
      { id: 'how-to-participate', label: 'How to Participate' },
    ],
  },
  {
    label: 'League Rules',
    items: [
      { id: 'league-wide-rules', label: 'League Wide Rules' },
      { id: 'legal-potaras', label: 'Legal Capsules' },
      { id: 'build-rules', label: 'Build Rules' },
      { id: 'ai-descriptions', label: 'AI Descriptions' },
    ],
  },
  {
    label: 'Team Operations',
    items: [
      { id: 'bench-rules', label: 'Bench Rules' },
      { id: 'coaching-rules', label: 'Coaching Rules' },
      { id: 'staff-on-team-rules', label: 'Staff on Team Rules' },
    ],
  },
  {
    label: 'Season Structure',
    items: [
      { id: 'off-season-schedule', label: 'Off-Season Schedule' },
      { id: 'post-season-seeding', label: 'Post Season Seeding' },
    ],
  },
  {
    label: 'Testing & Mods',
    items: [
      { id: 'testing-rules', label: 'Testing Rules' },
      { id: 'mods', label: 'Mods' },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

const SECTION_COMPONENTS = {
  'how-to-participate': HowToParticipate,
  'league-wide-rules': LeagueWideRules,
  'legal-potaras': LegalPotaras,
  'build-rules': BuildRules,
  'ai-descriptions': AIDescriptions,
  'bench-rules': BenchRules,
  'coaching-rules': CoachingRules,
  'staff-on-team-rules': StaffOnTeamRules,
  'off-season-schedule': OffSeasonSchedule,
  'post-season-seeding': PostSeasonSeeding,
  'testing-rules': TestingRules,
  'mods': Mods,
};

export default function RulesPage({ darkMode }) {
  const { section } = useParams();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef(null);

  const activeId = section && SECTION_COMPONENTS[section] ? section : 'how-to-participate';
  const activeItem = ALL_ITEMS.find((i) => i.id === activeId);
  const ActiveComponent = SECTION_COMPONENTS[activeId];

  // Close mobile dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setMobileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = (id) => {
    navigate(`/rules/${id}`);
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const sidebarItem = (item) => {
    const isActive = item.id === activeId;
    return (
      <Link
        key={item.id}
        to={`/rules/${item.id}`}
        className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
          isActive
            ? darkMode
              ? 'bg-orange-500/20 text-orange-400 font-medium'
              : 'bg-blue-100 text-blue-700 font-medium'
            : darkMode
              ? 'text-gray-400 hover:text-white hover:bg-gray-800'
              : 'text-stone-500 hover:text-stone-900 hover:bg-stone-200'
        }`}
      >
        {item.label}
      </Link>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <BookOpen className={`w-8 h-8 ${darkMode ? 'text-orange-400' : 'text-blue-600'}`} />
          <span className={darkMode ? 'text-white' : 'text-stone-900'}>Rules & Information</span>
        </h1>
        <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-stone-500'}`}>
          Everything you need to know about how the league works.
        </p>
      </div>

      <div className="flex gap-8 items-start">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-52 shrink-0">
          <nav className="sticky top-24 space-y-5">
            {NAV_GROUPS.map((group) => (
              <div key={group.label}>
                <div className={`text-xs font-bold uppercase tracking-widest px-3 mb-1.5 ${darkMode ? 'text-gray-500' : 'text-stone-400'}`}>
                  {group.label}
                </div>
                <div className="space-y-0.5">
                  {group.items.map(sidebarItem)}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {/* Mobile section picker */}
          <div className="lg:hidden mb-6 relative" ref={dropdownRef}>
            <button
              onClick={() => setMobileOpen((o) => !o)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium ${
                darkMode
                  ? 'bg-gray-900 border-gray-700 text-white'
                  : 'bg-stone-50 border-stone-300 text-stone-900 shadow-sm'
              }`}
            >
              {activeItem?.label}
              <ChevronDown className={`w-4 h-4 transition-transform ${mobileOpen ? 'rotate-180' : ''}`} />
            </button>
            {mobileOpen && (
              <div className={`absolute z-20 mt-1 w-full rounded-xl border shadow-xl overflow-auto max-h-80 ${
                darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-stone-200'
              }`}>
                {NAV_GROUPS.map((group) => (
                  <div key={group.label} className={`border-b last:border-0 ${darkMode ? 'border-gray-800' : 'border-stone-100'}`}>
                    <div className={`px-4 py-2 text-xs font-bold uppercase tracking-widest ${darkMode ? 'text-gray-500' : 'text-stone-400'}`}>
                      {group.label}
                    </div>
                    {group.items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item.id)}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                          item.id === activeId
                            ? darkMode ? 'text-orange-400 bg-orange-500/10' : 'text-blue-600 bg-blue-50'
                            : darkMode ? 'text-gray-300 hover:bg-gray-800' : 'text-stone-600 hover:bg-stone-50'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section title */}
          <div className={`mb-6 pb-4 border-b ${darkMode ? 'border-gray-800' : 'border-stone-200'}`}>
            <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-stone-900'}`}>
              {activeItem?.label}
            </h2>
          </div>

          {/* Active section component */}
          {ActiveComponent && <ActiveComponent darkMode={darkMode} />}
        </main>
      </div>
    </div>
  );
}
