import React, { useState, useEffect } from 'react';
import { loadContent } from '../../utils/contentLoader';
import MarkdownContent from './MarkdownContent';
import { Search } from 'lucide-react';

const COST_COLORS = {
  1: 'bg-emerald-500',
  2: 'bg-lime-500',
  3: 'bg-yellow-500',
  4: 'bg-orange-500',
  5: 'bg-red-500',
};

export default function LegalPotaras({ darkMode }) {
  const [data, setData] = useState(null);
  const [search, setSearch] = useState('');
  const [costFilter, setCostFilter] = useState('all');
  const [showBanned, setShowBanned] = useState(true);

  useEffect(() => {
    loadContent('rules/legal-potaras.yaml').then(setData);
  }, []);

  if (!data) return <div className="animate-pulse py-20 text-center text-sm">Loading...</div>;

  const filtered = (data.capsules || []).filter(c => {
    if (!showBanned && c.banned) return false;
    if (costFilter !== 'all' && c.cost !== parseInt(costFilter)) return false;
    const q = search.toLowerCase();
    if (!q) return true;
    return c.name.toLowerCase().includes(q) || c.effect.toLowerCase().includes(q);
  });

  return (
    <div className="max-w-4xl">
      {data.intro && (
        <p className={`mb-6 text-lg ${darkMode ? 'text-gray-300' : 'text-stone-600'}`}>{data.intro}</p>
      )}
      <MarkdownContent content={data.rules_content} darkMode={darkMode} />
      {data.capsule_notes && (
        <>
          <div className={`my-6 border-t ${darkMode ? 'border-gray-800' : 'border-stone-200'}`} />
          <MarkdownContent content={data.capsule_notes} darkMode={darkMode} />
        </>
      )}

      {data.capsules?.length > 0 && (
        <>
          <div className={`my-6 border-t ${darkMode ? 'border-gray-800' : 'border-stone-200'}`} />
          <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-stone-900'}`}>
            Capsule Reference
          </h2>

          {/* Controls */}
          <div className="mb-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or effect..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className={`w-full pl-9 pr-3 py-2 rounded-lg text-sm border outline-none ${
                  darkMode
                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-orange-500'
                    : 'bg-white border-stone-300 text-stone-900 placeholder-stone-400 focus:border-orange-400'
                }`}
              />
            </div>
            <div className="flex items-center gap-1 flex-wrap shrink-0">
              {['all', '1', '2', '3', '4', '5'].map(v => (
                <button
                  key={v}
                  onClick={() => setCostFilter(v)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    costFilter === v
                      ? 'bg-orange-500 text-white'
                      : darkMode
                      ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {v === 'all' ? 'All' : `${v}★`}
                </button>
              ))}
            </div>
            <label className={`flex items-center gap-2 text-sm cursor-pointer shrink-0 ${
              darkMode ? 'text-gray-400' : 'text-stone-500'
            }`}>
              <input
                type="checkbox"
                checked={showBanned}
                onChange={e => setShowBanned(e.target.checked)}
                className="rounded accent-orange-500"
              />
              Show Banned
            </label>
          </div>

          {/* Table */}
          <div className={`rounded-lg border overflow-hidden ${
            darkMode ? 'border-gray-800' : 'border-stone-200'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={darkMode ? 'bg-gray-800/80 text-gray-400' : 'bg-stone-100 text-stone-500'}>
                    <th className="text-left px-4 py-2.5 font-medium">Name</th>
                    <th className="text-center px-3 py-2.5 font-medium w-16">Cost</th>
                    <th className="text-left px-4 py-2.5 font-medium">Effect</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((capsule, i) => (
                    <tr
                      key={capsule.name}
                      className={`border-t ${
                        capsule.banned
                          ? darkMode ? 'border-gray-800 bg-red-950/30' : 'border-stone-200 bg-red-50'
                          : i % 2 === 0
                          ? darkMode ? 'border-gray-800' : 'border-stone-200'
                          : darkMode ? 'border-gray-800 bg-gray-900/40' : 'border-stone-200 bg-stone-50/60'
                      }`}
                    >
                      <td className="px-4 py-2.5 font-medium whitespace-nowrap">
                        <span className={capsule.banned
                          ? darkMode ? 'text-red-400' : 'text-red-600'
                          : darkMode ? 'text-white' : 'text-stone-900'
                        }>
                          {capsule.name}
                        </span>
                        {capsule.banned && (
                          <span className="ml-2 text-xs font-semibold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">
                            BANNED
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-bold ${
                          COST_COLORS[capsule.cost] || 'bg-gray-500'
                        }`}>
                          {capsule.cost}
                        </span>
                      </td>
                      <td className={`px-4 py-2.5 ${
                        capsule.banned
                          ? darkMode ? 'text-red-300/60' : 'text-red-700/60'
                          : darkMode ? 'text-gray-300' : 'text-stone-600'
                      }`}>
                        {capsule.effect}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={3} className={`px-4 py-8 text-center ${
                        darkMode ? 'text-gray-500' : 'text-stone-400'
                      }`}>
                        No capsules match your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <p className={`mt-2 text-xs ${darkMode ? 'text-gray-600' : 'text-stone-400'}`}>
            {filtered.length} capsule{filtered.length !== 1 ? 's' : ''} shown
          </p>
        </>
      )}

      {data.last_updated && (
        <p className={`mt-8 text-xs ${darkMode ? 'text-gray-600' : 'text-stone-400'}`}>
          Last updated: {new Date(data.last_updated).toLocaleDateString('en-US')}
        </p>
      )}
    </div>
  );
}
