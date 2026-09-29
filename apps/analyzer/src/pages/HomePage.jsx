import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useIsPhone } from '../shell/useMediaQuery.js';
import { isProvisionalTier, tierBasisSummary } from '../utils/performanceTier.js';
import { ROUTES } from '../routes.js';
import TierList from './characters/TierList.jsx';
import { rowsForPositions } from './characters/characterRows.js';

/**
 * Home, first cut: the tier list for the scope in the bar (the current season
 * by default), which the plan makes Home's lead element. The curated top-5
 * boards and the latest week's results come next ("Home dashboard" in the
 * redesign plan).
 */
export default function HomePage({ aggregated, charMap, idFor, linkFor, search, loading }) {
  const isPhone = useIsPhone();
  const rows = useMemo(() => rowsForPositions(aggregated, [], charMap), [aggregated, charMap]);
  const provisional = rows.filter(isProvisionalTier).length;

  if (!rows.length) {
    return (
      <div className="rounded-[10px] border border-solid border-gray-700 bg-shell-panel px-6 py-8 text-center text-slate-400">
        {loading ? 'Loading match data…' : 'No matches in this scope. Widen the filters above.'}
      </div>
    );
  }
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h1 className="m-0 text-base font-bold text-white">Tier list</h1>
        <Link to={ROUTES.characters + search} className="text-[13px] font-semibold text-orange-400 no-underline hover:underline">
          All {rows.length} characters as a table →
        </Link>
      </div>
      <TierList rows={rows} isPhone={isPhone} idFor={idFor} linkFor={linkFor} />
      <p className="mt-2.5 mb-0 text-xs text-slate-500">
        {tierBasisSummary()} Faded = fewer than 5 matches{provisional ? ` (${provisional} here)` : ''}.
      </p>
    </div>
  );
}
