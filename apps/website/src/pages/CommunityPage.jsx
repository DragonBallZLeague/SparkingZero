import React, { useState, useEffect } from 'react';
import {
  Heart, Shield, BarChart3, Wrench, ExternalLink,
  FlaskConical, Palette, Link as LinkIcon
} from 'lucide-react';
import { loadContent } from '../utils/contentLoader';

const iconMap = {
  Shield,
  BarChart3,
  Palette,
  FlaskConical,
  Wrench,
  Heart,
};

export default function CommunityPage({ darkMode }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    loadContent('community.yaml').then(setData);
  }, []);

  if (!data) {
    return <div className="flex items-center justify-center py-20 text-lg animate-pulse">Loading community...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Heart className="w-8 h-8 text-pink-400" />
          {data.title}
        </h1>
        <p className={`mt-2 max-w-2xl ${darkMode ? 'text-gray-400' : 'text-stone-500'}`}>
          {data.intro}
        </p>
      </div>

      {/* Volunteer Roles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 mb-12">
        {(data.roles || []).map((role, index, arr) => {
          const Icon = iconMap[role.icon] || Shield;
          const members = role.members || [];
          const isLastOdd = arr.length % 2 !== 0 && index === arr.length - 1;
          return (
            <div
              key={role.name}
              className={`rounded-xl border flex flex-col ${isLastOdd ? 'md:col-span-2' : ''} ${
                darkMode ? 'bg-gray-900 border-gray-800' : 'bg-stone-50 border-stone-200 shadow-sm'
              }`}
            >
              {/* Role header */}
              <div className="p-6 pb-4">
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg mb-4 ${darkMode ? 'bg-orange-500/10' : 'bg-blue-500/10'}`}>
                  <Icon className={`w-5 h-5 ${darkMode ? 'text-orange-400' : 'text-blue-600'}`} />
                </div>
                <h3 className="font-semibold text-lg mb-2">{role.name}</h3>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-stone-500'}`}>
                  {role.description}
                </p>
              </div>

              {/* Members */}
              {members.length > 0 && (
                <div className={`mx-6 mb-6 pt-4 border-t ${
                  darkMode ? 'border-gray-800' : 'border-stone-200'
                }`}>
                  <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${
                    darkMode ? 'text-gray-500' : 'text-stone-400'
                  }`}>Members</p>
                  <ul className="space-y-2">
                    {members.map((member, i) => (
                      <li key={i} className="flex items-center justify-between gap-2">
                        <span className={`text-sm font-medium ${
                          darkMode ? 'text-gray-300' : 'text-stone-700'
                        }`}>{member.name}</span>
                        {member.links?.length > 0 && (
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {member.links.map((link, j) => (
                              <a
                                key={j}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={link.label}
                                className={`text-xs flex items-center gap-1 transition-colors ${
                                  darkMode
                                    ? 'text-gray-500 hover:text-orange-400'
                                    : 'text-stone-400 hover:text-blue-600'
                                }`}
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>{link.label}</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Resources / Links */}
      <h2 className="text-xl font-bold mb-4">Resources & Tools</h2>
      {[['social', 'grid-cols-1 sm:grid-cols-2'], ['tools', 'grid-cols-1 sm:grid-cols-3']].map(([group, cols]) => {
        const items = (data.resources || []).filter(r => r.group === group);
        if (!items.length) return null;
        return (
          <div key={group} className={`grid ${cols} gap-4 mb-4`}>
            {items.map((res) => (
              <a
                key={res.name}
                href={res.url}
                target={res.url.startsWith('http') ? '_blank' : undefined}
                rel={res.url.startsWith('http') ? 'noopener noreferrer' : undefined}
                className={`group rounded-xl border p-5 transition-all hover:scale-[1.02] ${
                  darkMode
                    ? 'bg-gray-900 border-gray-800 hover:border-gray-600'
                    : 'bg-stone-50 border-stone-200 hover:border-stone-400 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className={`font-semibold transition-colors ${darkMode ? 'group-hover:text-orange-400' : 'group-hover:text-blue-600'}`}>
                    {res.name}
                  </h3>
                  <ExternalLink className={`w-4 h-4 text-gray-400 transition-colors ${darkMode ? 'group-hover:text-orange-400' : 'group-hover:text-blue-600'}`} />
                </div>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {res.description}
                </p>
              </a>
            ))}
          </div>
        );
      })}
    </div>
  );
}
