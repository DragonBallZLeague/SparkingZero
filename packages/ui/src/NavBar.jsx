import React, { useEffect, useRef, useState } from 'react';
import { APPS, LOGO_SRC } from './toolLinks';
import './NavBar.css';

/**
 * Shared dark-themed top nav connecting the Website and the 3 tool apps.
 * Always renders in the Website's dark styling regardless of the host app's
 * own light/dark mode, so it reads as one consistent strip across all apps.
 * Uses plain CSS (NavBar.css) rather than Tailwind utility classes since not
 * every consuming app runs a Tailwind build (e.g. Analyzer).
 * Layout is a 3-column grid: brand (logo+title) left, app-specific `right`
 * controls centered, site nav links flush right (hamburger dropdown below 810px).
 *
 * @param {string} current - key of the active app: 'home' | 'analyzer' | 'matchbuilder' | 'calculator'
 * @param {string} [title] - optional page label shown next to the logo (e.g. "Character Calculator")
 * @param {React.ReactNode} [right] - app-specific controls rendered in the center (buttons, toggles)
 */
export default function NavBar({ current, title, right }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  return (
    <header className="szl-navbar">
      <div className="szl-navbar__accent" />
      <div className="szl-navbar__inner">
        <div className="szl-navbar__brand">
          <a href={LOGO_SRC.replace('/images/SZLEmblem.png', '/')} className="szl-navbar__logo">
            <img src={LOGO_SRC} alt="DBSZL" draggable={false} />
          </a>
          {title && (
            <>
              <span className="szl-navbar__divider" aria-hidden="true" />
              <span className="szl-navbar__title">{title}</span>
            </>
          )}
        </div>

        {right && <div className="szl-navbar__right">{right}</div>}

        <div className="szl-navbar__nav-group">
          <nav className="szl-navbar__links">
            {APPS.map((app) => {
              const active = app.key === current;
              return (
                <a
                  key={app.key}
                  href={app.href}
                  className={`szl-navbar__link${active ? ' szl-navbar__link--active' : ''}`}
                >
                  {app.label}
                </a>
              );
            })}
          </nav>

          <div className="szl-navbar__menu" ref={menuRef}>
            <button
              className="szl-navbar__icon-btn szl-navbar__menu-btn"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Toggle site navigation"
              aria-expanded={menuOpen}
            >
              <span className="szl-navbar__menu-icon" />
            </button>
            {menuOpen && (
              <nav className="szl-navbar__menu-panel">
                {APPS.map((app) => {
                  const active = app.key === current;
                  return (
                    <a
                      key={app.key}
                      href={app.href}
                      className={`szl-navbar__link${active ? ' szl-navbar__link--active' : ''}`}
                      onClick={() => setMenuOpen(false)}
                    >
                      {app.label}
                    </a>
                  );
                })}
              </nav>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
