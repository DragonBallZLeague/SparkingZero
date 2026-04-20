import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Sun, Moon, Zap, ChevronDown, ExternalLink } from 'lucide-react';

const toolLinks = [
  { label: 'Match Analyzer', href: 'https://dragonballzleague.github.io/SparkingZero/analyzer/' },
  { label: 'Match Builder', href: 'https://dragonballzleague.github.io/SparkingZero/matchbuilder/' },
  { label: 'Character Calculator', href: 'https://dragonballzleague.github.io/SparkingZero/calculator/' },
];

export default function Navbar({ site, darkMode, setDarkMode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const toolsRef = useRef(null);
  const location = useLocation();
  const nav = site?.nav || [];

  useEffect(() => {
    const handleClick = (e) => {
      if (toolsRef.current && !toolsRef.current.contains(e.target)) setToolsOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <header className={`sticky top-0 z-50 border-b backdrop-blur-md ${
      darkMode
        ? 'bg-gray-950/80 border-gray-800'
        : 'bg-stone-100/90 border-stone-300'
    }`}>
      {/* Top accent bar */}
      <div className="h-1 bg-gradient-to-r from-orange-500 via-yellow-400 to-red-500" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Brand */}
          <Link to="/" className="flex items-center gap-2 group" onClick={() => setMobileOpen(false)}>
            <Zap className={`w-7 h-7 transition-colors ${darkMode ? 'text-orange-500 group-hover:text-yellow-400' : 'text-blue-500 group-hover:text-blue-400'}`} />
            <span className="font-bold text-lg hidden sm:inline">
              {site?.short_name || 'DBSZL'}
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {nav.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? darkMode ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-600'
                      : darkMode
                        ? 'text-gray-300 hover:text-white hover:bg-gray-800'
                        : 'text-stone-600 hover:text-stone-800 hover:bg-stone-200'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}

            {/* Tools dropdown */}
            <div className="relative" ref={toolsRef}>
              <button
                onClick={() => setToolsOpen(!toolsOpen)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-1 ${
                  darkMode
                    ? 'text-gray-300 hover:text-white hover:bg-gray-800'
                    : 'text-stone-600 hover:text-stone-800 hover:bg-stone-200'
                }`}
              >
                Tools <ChevronDown className={`w-3.5 h-3.5 transition-transform ${toolsOpen ? 'rotate-180' : ''}`} />
              </button>
              {toolsOpen && (
                <div className={`absolute right-0 mt-1 w-56 rounded-lg border shadow-lg py-1 ${
                  darkMode ? 'bg-gray-900 border-gray-700' : 'bg-stone-50 border-stone-300'
                }`}>
                  {toolLinks.map((tool) => (
                    <a
                      key={tool.href}
                      href={tool.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setToolsOpen(false)}
                      className={`flex items-center justify-between px-4 py-2 text-sm transition-colors ${
                        darkMode
                          ? 'text-gray-300 hover:bg-gray-800 hover:text-white'
                          : 'text-stone-600 hover:bg-stone-200 hover:text-stone-800'
                      }`}
                    >
                      {tool.label}
                      <ExternalLink className="w-3.5 h-3.5 opacity-50" />
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Theme toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`ml-4 p-2 rounded-lg transition-colors ${
                darkMode
                  ? 'text-gray-400 hover:text-yellow-400 hover:bg-gray-800'
                  : 'text-stone-500 hover:text-blue-500 hover:bg-stone-200'
              }`}
              aria-label="Toggle theme"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </nav>

          {/* Mobile menu button */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg"
              aria-label="Toggle theme"
            >
              {darkMode ? <Sun className="w-5 h-5 text-gray-400" /> : <Moon className="w-5 h-5 text-gray-500" />}
            </button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 rounded-lg"
              aria-label="Toggle menu"
            >
              {mobileOpen
                ? <X className="w-6 h-6" />
                : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <nav className={`md:hidden border-t py-3 px-4 space-y-1 ${
          darkMode ? 'border-gray-800 bg-gray-950' : 'border-stone-300 bg-stone-100'
        }`}>
          {nav.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`block px-4 py-2 rounded-lg text-sm font-medium ${
                  active
                    ? darkMode ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-600'
                    : darkMode
                      ? 'text-gray-300 hover:bg-gray-800'
                      : 'text-stone-600 hover:bg-stone-200'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <div className={`border-t mt-2 pt-2 ${
            darkMode ? 'border-gray-800' : 'border-stone-300'
          }`}>
            <span className={`block px-4 py-1 text-xs font-semibold uppercase tracking-wider ${
              darkMode ? 'text-gray-500' : 'text-stone-400'
            }`}>Tools</span>
            {toolLinks.map((tool) => (
              <a
                key={tool.href}
                href={tool.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileOpen(false)}
                className={`flex items-center justify-between px-4 py-2 rounded-lg text-sm font-medium ${
                  darkMode
                    ? 'text-gray-300 hover:bg-gray-800'
                    : 'text-stone-600 hover:bg-stone-200'
                }`}
              >
                {tool.label}
                <ExternalLink className="w-3.5 h-3.5 opacity-50" />
              </a>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
