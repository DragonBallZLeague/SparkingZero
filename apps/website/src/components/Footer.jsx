import React from 'react';
import { Zap } from 'lucide-react';

export default function Footer({ site, darkMode }) {
  const links = site?.links || {};

  return (
    <footer className={`border-t mt-auto ${
      darkMode ? 'bg-gray-900/50 border-gray-800 text-gray-400' : 'bg-stone-200 border-stone-300 text-stone-500'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Zap className={`w-5 h-5 ${darkMode ? 'text-orange-500' : 'text-blue-500'}`} />
            <span className="font-semibold text-sm">{site?.site_name}</span>
          </div>

          <div className="flex items-center gap-6 text-sm">
            {links.discord && (
              <a href={links.discord} target="_blank" rel="noopener noreferrer"
                 className={`transition-colors ${darkMode ? 'hover:text-orange-400' : 'hover:text-blue-600'}`}>
                Discord
              </a>
            )}
            {links.youtube && (
              <a href={links.youtube} target="_blank" rel="noopener noreferrer"
                 className={`transition-colors ${darkMode ? 'hover:text-orange-400' : 'hover:text-blue-600'}`}>
                YouTube
              </a>
            )}
            {links.github && (
              <a href={links.github} target="_blank" rel="noopener noreferrer"
                 className={`transition-colors ${darkMode ? 'hover:text-orange-400' : 'hover:text-blue-600'}`}>
                GitHub
              </a>
            )}
            {links.old_site && (
              <a href={links.old_site} target="_blank" rel="noopener noreferrer"
                 className={`transition-colors ${darkMode ? 'hover:text-orange-400' : 'hover:text-blue-600'}`}>
                Legacy Site
              </a>
            )}
          </div>
        </div>

        <p className="text-xs text-center mt-6 opacity-60">
          {site?.footer_text}
        </p>
      </div>
    </footer>
  );
}
