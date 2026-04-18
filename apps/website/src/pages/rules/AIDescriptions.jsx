import React, { useState, useEffect } from 'react';
import { loadContent } from '../../utils/contentLoader';

const COLOR_MAP = {
  blue: {
    tab: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    tabLight: 'bg-blue-100 text-blue-700 border-blue-300',
    card: 'bg-blue-500/5 border-blue-500/20',
    cardLight: 'bg-blue-50 border-blue-200',
    dot: 'bg-blue-500',
    name: 'text-blue-400',
    nameLight: 'text-blue-700',
  },
  red: {
    tab: 'bg-red-500/20 text-red-400 border-red-500/30',
    tabLight: 'bg-red-100 text-red-700 border-red-300',
    card: 'bg-red-500/5 border-red-500/20',
    cardLight: 'bg-red-50 border-red-200',
    dot: 'bg-red-500',
    name: 'text-red-400',
    nameLight: 'text-red-700',
  },
  green: {
    tab: 'bg-green-500/20 text-green-400 border-green-500/30',
    tabLight: 'bg-green-100 text-green-700 border-green-300',
    card: 'bg-green-500/5 border-green-500/20',
    cardLight: 'bg-green-50 border-green-200',
    dot: 'bg-green-500',
    name: 'text-green-400',
    nameLight: 'text-green-700',
  },
};

export default function AIDescriptions({ darkMode }) {
  const [data, setData] = useState(null);
  const [activeCat, setActiveCat] = useState(0);

  useEffect(() => {
    loadContent('rules/ai-descriptions.yaml').then(setData);
  }, []);

  if (!data) return <div className="animate-pulse py-20 text-center text-sm">Loading...</div>;

  const category = data.categories?.[activeCat];
  const colors = COLOR_MAP[category?.color] || COLOR_MAP.blue;

  return (
    <div className="max-w-4xl">
      {data.intro && (
        <p className={`mb-6 ${darkMode ? 'text-gray-300' : 'text-stone-600'}`}>{data.intro}</p>
      )}

      {/* Category tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(data.categories || []).map((cat, i) => {
          const c = COLOR_MAP[cat.color] || COLOR_MAP.blue;
          const isActive = i === activeCat;
          return (
            <button
              key={cat.name}
              onClick={() => setActiveCat(i)}
              className={`px-5 py-2 rounded-lg border text-sm font-semibold transition-all ${
                isActive
                  ? darkMode ? c.tab : c.tabLight
                  : darkMode
                    ? 'border-transparent text-gray-400 hover:text-white hover:bg-gray-800'
                    : 'border-transparent text-stone-500 hover:text-stone-800 hover:bg-stone-100'
              }`}
            >
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* Active category content */}
      {category && (
        <div>
          <p className={`text-sm mb-5 ${darkMode ? 'text-gray-400' : 'text-stone-500'}`}>
            {category.description}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(category.ais || []).map((ai) => (
              <div
                key={ai.name}
                className={`rounded-xl border p-4 ${darkMode ? colors.card : colors.cardLight}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-2 w-2 h-2 rounded-full shrink-0 ${colors.dot}`} />
                  <div>
                    <div className={`font-semibold text-sm mb-1 ${darkMode ? colors.name : colors.nameLight}`}>
                      {ai.name}
                    </div>
                    <div className={`text-sm leading-relaxed ${darkMode ? 'text-gray-300' : 'text-stone-600'}`}>
                      {ai.description}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.last_updated && (
        <p className={`mt-8 text-xs ${darkMode ? 'text-gray-600' : 'text-stone-400'}`}>
          Last updated: {new Date(data.last_updated).toLocaleDateString('en-US')}
        </p>
      )}
    </div>
  );
}
