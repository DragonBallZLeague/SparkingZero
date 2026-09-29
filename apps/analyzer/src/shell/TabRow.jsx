import React from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../routes.js';

/** The site's sections, in order. */
export const TABS = [
  { id: 'home', label: 'Home', to: ROUTES.home },
  { id: 'aggregated', label: 'Characters', to: ROUTES.characters },
  { id: 'teams', label: 'Teams', to: ROUTES.teams },
  { id: 'single', label: 'Matches', to: ROUTES.matches },
  { id: 'meta', label: 'Meta', to: ROUTES.meta },
  { id: 'sandbox', label: 'Sandbox', to: ROUTES.sandbox },
];

/**
 * The slim row of section tabs under the site navbar ("Visual direction",
 * decision 1). It replaced the Analysis Mode and View Type panels.
 *
 * It holds the site's sections and nothing else: a switch that only changes
 * the current page (Table / Tier list, say) lives in that page's own control
 * row, where it reads as part of the page. The league asked for that after the
 * demo put the switch here.
 *
 * `active` is a TABS id. Links carry `search` (the scope params), so moving
 * between sections keeps the data scope; the Sandbox tab drops it, since
 * uploads have no scope.
 */
export default function TabRow({ active, search = '' }) {
  return (
    // The page column's gutter and width (tailwind.config.js `page`), so the tabs line up with the content.
    <div className="px-4 sm:px-6"><div className="max-w-page mx-auto">
      <div className="border-0 border-b border-solid border-gray-700">
      <nav aria-label="Analyzer sections"
        className="flex gap-0.5 overflow-x-auto -ml-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map(t => {
          const on = t.id === active;
          return (
            <Link key={t.id} to={t.id === 'sandbox' ? t.to : t.to + search} aria-current={on ? 'page' : undefined}
              className={`px-3 pt-[13px] pb-[11px] text-sm font-semibold whitespace-nowrap no-underline border-0 border-b-2 border-solid ${
                on ? 'text-white border-brand' : 'text-slate-400 border-transparent hover:text-slate-200'}`}>
              {t.label}
            </Link>
          );
        })}
      </nav>
      </div>
    </div></div>
  );
}
