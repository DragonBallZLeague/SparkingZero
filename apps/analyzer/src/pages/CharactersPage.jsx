import React, { useMemo, useState } from 'react';
import { SearchBox } from '../shell/tableParts.jsx';
import { useSearchParams } from 'react-router-dom';
import Segmented from '../shell/Segmented.jsx';
import ChipMenu from '../shell/ChipMenu.jsx';
import { useQueryUpdate } from '../shell/useQueryUpdate.js';
import { useIsPhone } from '../shell/useMediaQuery.js';
import { usePickedColumns, pickerChip as columnChip } from '../shell/usePickedColumns.js';
import { tierBasisSummary } from '../utils/performanceTier.js';
import CharacterTable from './characters/CharacterTable.jsx';
import TierList from './characters/TierList.jsx';
import {
  CHAR_STATS, DEFAULT_PHONE_STATS, statByKey,
  readView, readSort, readPositions, rowsForPositions, sortRows, fadeLegend, characterMatchesQuery,
} from './characters/characterRows.js';

const PHONE_COLS_KEY = 'szl.analyzer.characters.phoneCols';

/**
 * /characters: the leaderboard as a table, or the same data as a tier list.
 *
 * Its state lives in the query string, so any view of it is a link (the Home
 * page's curated boards will be exactly such links): `view=tiers`, `sort` and
 * `dir`, and `pos` for the Position chip, which App puts in the scope bar.
 *
 * A search box (as the Matches list has) narrows either view by name, and is
 * not in the URL. The bars, colours and fading stay measured against the whole
 * list, and a row keeps its place number, so a search only hides rows.
 *
 * `aggregated` is the scope's aggregated rows (App owns loading). A row opens
 * the character's page through `linkFor(name)`; `idFor(name)` gives the id its
 * portrait is filed under.
 */
export default function CharactersPage({ aggregated, charMap, idFor, linkFor, loading }) {
  const [params] = useSearchParams();
  const updateQuery = useQueryUpdate();
  const isPhone = useIsPhone();
  const [phoneStats, setPhoneStat] = usePickedColumns(PHONE_COLS_KEY, DEFAULT_PHONE_STATS, statByKey);
  const [pickerOpen, setPickerOpen] = useState(null);
  const [query, setQuery] = useState('');

  const view = readView(params);
  const { sort, dir } = readSort(params);
  const positions = readPositions(params);
  const posKey = positions.join(',');

  const pool = useMemo(() => rowsForPositions(aggregated, positions, charMap),
    // positions is re-derived each render; posKey is its identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [aggregated, posKey, charMap]);
  const rows = useMemo(() => sortRows(pool, { sort, dir }), [pool, sort, dir]);
  const hits = useMemo(() => rows.filter(r => characterMatchesQuery(r, query)), [rows, query]);
  const placeOf = useMemo(() => new Map(rows.map((r, i) => [r.name, i + 1])), [rows]);
  const noHit = `No character in this scope matches “${query.trim()}”.`;

  const update = updateQuery;
  const setView = v => update(p => (v === 'tiers' ? p.set('view', 'tiers') : p.delete('view')));
  const onSort = key => update(p => {
    const defaultDir = key === 'name' ? 'asc' : 'desc';
    const nextDir = sort === key ? (dir === 'asc' ? 'desc' : 'asc') : defaultDir;
    if (key === 'score' && nextDir === 'desc') { p.delete('sort'); p.delete('dir'); return; }
    p.set('sort', key);
    if (nextDir === defaultDir) p.delete('dir'); else p.set('dir', nextDir);
  });

  const pickerChip = slot => columnChip({
    slot, cols: phoneStats, stats: CHAR_STATS, onPick: (i, v) => { setPhoneStat(i, v); setPickerOpen(null); },
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
      {/* The search sits beside the count, as on the Matches list; on a phone it
          takes its own line under the switch and the column pickers. */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <Segmented label="View" value={view} onChange={setView}
          options={[{ value: 'table', label: 'Table' }, { value: 'tiers', label: 'Tier list' }]} />
        <div className={`flex items-center gap-3 ${isPhone ? 'contents' : ''}`}>
          {(!isPhone || view === 'tiers') && (
            <span className="text-[13px] text-slate-400">
              <b className="font-semibold text-white">{hits.length}</b> {hits.length === 1 ? 'character' : 'characters'}
            </span>
          )}
          {isPhone && view === 'table' && (
            <div className="flex items-center gap-1.5">
              {[0, 1].map(slot => (
                <ChipMenu key={slot} chip={pickerChip(slot)} isPhone open={pickerOpen === slot}
                  onOpenChange={o => setPickerOpen(o ? slot : null)} />
              ))}
            </div>
          )}
          <SearchBox value={query} onChange={setQuery} placeholder="Search characters"
            className={isPhone ? 'w-full' : 'w-[300px]'} />
        </div>
      </div>

      {view === 'tiers'
        ? (hits.length
          ? <TierList rows={hits} pool={pool} isPhone={isPhone} idFor={idFor} linkFor={linkFor} />
          : <div className="rounded-[10px] border border-solid border-gray-700 bg-shell-panel p-7 text-center text-slate-400">{noHit}</div>)
        : <CharacterTable rows={hits} pool={pool} sort={sort} dir={dir} onSort={onSort} isPhone={isPhone}
            phoneStats={phoneStats} idFor={idFor} linkFor={linkFor}
            rankOf={query.trim() ? r => placeOf.get(r.name) : null} empty={noHit} />}

      <p className="mt-2.5 mb-0 text-xs text-slate-500">
        {view === 'tiers' ? `${tierBasisSummary()} ` : ''}
        {fadeLegend(pool)}
      </p>
    </div>
  );
}
