import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Segmented from '../shell/Segmented.jsx';
import { useQueryUpdate } from '../shell/useQueryUpdate.js';
import { useIsPhone } from '../shell/useMediaQuery.js';
import { PAGE, SearchBox } from '../shell/tableParts.jsx';
import MatchList from './matches/MatchList.jsx';
import Performances from './matches/Performances.jsx';
import { matchRowMatchesQuery, readMatchesView } from './matches/matchRows.js';

/**
 * /matches: every match in the scope bar's scope, newest first, as rows that
 * open the Match page. It replaced the file tree.
 *
 * The control row holds the page's own switch, "Matches | Performances"
 * (`view=performances`): the second is one row per character per match, for
 * power users (matches/Performances.jsx).
 *
 * `rows` are matchRows() over the scope's matches; `linkFor(row)` is a row's
 * Match page link. `perf` is the Performances view's { rows, linkFor, idFor }.
 */
export default function MatchesPage({ rows, linkFor, loading, perf }) {
  const [params] = useSearchParams();
  const update = useQueryUpdate();
  const isPhone = useIsPhone();
  const view = readMatchesView(params);
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(PAGE);
  const q = query.trim().toLowerCase();
  useEffect(() => { setShown(PAGE); }, [q, rows]);

  const hits = useMemo(() => rows.filter(r => matchRowMatchesQuery(r, q)), [rows, q]);
  // Leaving Performances drops its own params: they mean nothing to the list.
  const setView = v => update(p => {
    if (v === 'performances') { p.set('view', 'performances'); return; }
    for (const k of ['view', 'cols', 'sort', 'dir', 'char', 'for', 'pos', 'res']) p.delete(k);
  });
  const viewSwitch = (
    <Segmented label="View" value={view} onChange={setView}
      options={[{ value: 'matches', label: 'Matches' }, { value: 'performances', label: 'Performances' }]} />
  );

  if (view === 'performances') return <Performances {...perf} loading={loading} viewSwitch={viewSwitch} />;

  if (!rows.length) {
    return (
      <div className="rounded-[10px] border border-solid border-gray-700 bg-shell-panel px-6 py-8 text-center text-slate-400">
        {loading ? 'Loading match data…' : 'No matches in this scope. Widen the filters above.'}
      </div>
    );
  }

  return (
    <div>
      {/* The page's own control row: its view switch lives here, not in the tab row. */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        {viewSwitch}
        <div className={`flex items-center gap-3 ${isPhone ? 'w-full' : ''}`}>
          {!isPhone && (
            <span className="text-[13px] text-slate-400">
              <b className="font-semibold text-white">{hits.length}</b> {hits.length === 1 ? 'match' : 'matches'}
            </span>
          )}
          <SearchBox value={query} onChange={setQuery} placeholder="Search matches, teams, characters"
            className={isPhone ? 'w-full' : 'w-[300px]'} />
        </div>
      </div>

      <MatchList rows={hits} shown={shown} onMore={() => setShown(n => n + PAGE)} isPhone={isPhone}
        linkFor={linkFor} empty={`No match in this scope matches “${query.trim()}”.`} />
    </div>
  );
}
