import React, { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Segmented from '../shell/Segmented.jsx';
import ChipMenu from '../shell/ChipMenu.jsx';
import { useQueryUpdate } from '../shell/useQueryUpdate.js';
import { useIsPhone } from '../shell/useMediaQuery.js';
import { isProvisionalTier, tierBasisSummary } from '../utils/performanceTier.js';
import CharacterTable from './characters/CharacterTable.jsx';
import TierList from './characters/TierList.jsx';
import {
  CHAR_STATS, DEFAULT_PHONE_STATS, statByKey,
  readView, readSort, readPositions, rowsForPositions, sortRows,
} from './characters/characterRows.js';

const PHONE_COLS_KEY = 'szl.analyzer.characters.phoneCols';

/** The phone's two stat columns: a per-viewer convenience, so browser storage. */
function usePhoneStats() {
  const [cols, setCols] = useState(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(PHONE_COLS_KEY) || 'null');
      if (Array.isArray(saved) && saved.length === 2 && saved.every(statByKey) && saved[0] !== saved[1]) return saved;
    } catch { /* storage blocked or garbled: fall back */ }
    return DEFAULT_PHONE_STATS;
  });
  const set = useCallback((slot, key) => {
    setCols(prev => {
      const next = [...prev];
      next[slot] = key;
      try { window.localStorage.setItem(PHONE_COLS_KEY, JSON.stringify(next)); } catch { /* not kept */ }
      return next;
    });
  }, []);
  return [cols, set];
}

/**
 * /characters: the leaderboard as a table, or the same data as a tier list.
 *
 * Its state lives in the query string, so any view of it is a link (the Home
 * page's curated boards will be exactly such links): `view=tiers`, `sort` and
 * `dir`, and `pos` for the Position chip, which App puts in the scope bar.
 *
 * `aggregated` is the scope's aggregated rows (App owns loading). A row opens
 * the character's page through `linkFor(name)`; `idFor(name)` gives the id its
 * portrait is filed under.
 */
export default function CharactersPage({ aggregated, charMap, idFor, linkFor, loading }) {
  const [params] = useSearchParams();
  const updateQuery = useQueryUpdate();
  const isPhone = useIsPhone();
  const [phoneStats, setPhoneStat] = usePhoneStats();
  const [pickerOpen, setPickerOpen] = useState(null);

  const view = readView(params);
  const { sort, dir } = readSort(params);
  const positions = readPositions(params);
  const posKey = positions.join(',');

  const pool = useMemo(() => rowsForPositions(aggregated, positions, charMap),
    // positions is re-derived each render; posKey is its identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [aggregated, posKey, charMap]);
  const rows = useMemo(() => sortRows(pool, { sort, dir }), [pool, sort, dir]);
  const provisional = useMemo(() => pool.filter(isProvisionalTier).length, [pool]);

  const update = updateQuery;
  const setView = v => update(p => (v === 'tiers' ? p.set('view', 'tiers') : p.delete('view')));
  const onSort = key => update(p => {
    const defaultDir = key === 'name' ? 'asc' : 'desc';
    const nextDir = sort === key ? (dir === 'asc' ? 'desc' : 'asc') : defaultDir;
    if (key === 'score' && nextDir === 'desc') { p.delete('sort'); p.delete('dir'); return; }
    p.set('sort', key);
    if (nextDir === defaultDir) p.delete('dir'); else p.set('dir', nextDir);
  });

  const pickerChip = slot => ({
    id: `col${slot}`,
    name: 'Column',
    label: statByKey(phoneStats[slot]).short,
    set: false,
    multi: false,
    selected: phoneStats[slot],
    options: CHAR_STATS.map(s => ({ v: s.key, l: s.label, dis: phoneStats[1 - slot] === s.key })),
    onChange: v => { setPhoneStat(slot, v); setPickerOpen(null); },
  });

  if (!pool.length) {
    return (
      <div className="rounded-[10px] border border-solid border-gray-700 bg-shell-panel px-6 py-8 text-center text-slate-400">
        {loading ? 'Loading match data…' : 'No characters in this scope. Widen the filters above.'}
      </div>
    );
  }

  return (
    <div>
      {/* The page's own control row: its view switch lives here, not in the tab row. */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <Segmented label="View" value={view} onChange={setView}
          options={[{ value: 'table', label: 'Table' }, { value: 'tiers', label: 'Tier list' }]} />
        <div className="flex items-center gap-1.5">
          {(!isPhone || view === 'tiers') && (
            <span className="text-[13px] text-slate-400"><b className="font-semibold text-white">{pool.length}</b> characters</span>
          )}
          {isPhone && view === 'table' && [0, 1].map(slot => (
            <ChipMenu key={slot} chip={pickerChip(slot)} isPhone open={pickerOpen === slot}
              onOpenChange={o => setPickerOpen(o ? slot : null)} />
          ))}
        </div>
      </div>

      {view === 'tiers'
        ? <TierList rows={pool} isPhone={isPhone} idFor={idFor} linkFor={linkFor} />
        : <CharacterTable rows={rows} pool={pool} sort={sort} dir={dir} onSort={onSort} isPhone={isPhone}
            phoneStats={phoneStats} idFor={idFor} linkFor={linkFor} />}

      <p className="mt-2.5 mb-0 text-xs text-slate-500">
        {view === 'tiers' ? `${tierBasisSummary()} ` : ''}
        Faded = fewer than 5 matches{provisional ? ` (${provisional} here)` : ''}.
      </p>
    </div>
  );
}
