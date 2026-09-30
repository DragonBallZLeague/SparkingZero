import React, { useEffect, useMemo, useState } from 'react';
import { PAGE } from '../../shell/tableParts.jsx';
import { useMediaQuery } from '../../shell/useMediaQuery.js';
import BuildsTable from '../meta/BuildsTable.jsx';
import { leagueBuilds, filterBuilds } from '../meta/buildRows.js';

/** Where the capsule list moves from under a row to a side panel, as on Meta. */
const WIDE_QUERY = '(min-width: 1180px)';

/**
 * The Character page's Builds tab: every build the character was fielded
 * with in scope, as Meta's Builds table draws them (meta/BuildsTable.jsx)
 * without its Character column: build type and cost bar, AI strategy, uses,
 * average damage, efficiency, score and win % last, and the capsules as the
 * one-column list beside the table (under the row when narrower), with Copy
 * YAML / Download for the Match Builder. It replaced a list of the six most
 * used builds, each a card of its capsules.
 *
 * Most used first (the sort is this visit's only). A row cuts the whole page
 * to its build (`?build=`, `current` here), as the Overview's build picker
 * does, and shows its capsules; a second click removes the cut (`onToggle`).
 * Nothing is picked until then. `character` is the page's row under every cut
 * but the build: this is the list of builds.
 */
export default function CharacterBuilds({ character, charMap = {}, portraitId = null, current = null, onToggle }) {
  const isWide = useMediaQuery(WIDE_QUERY);
  const [{ sort, dir }, setSortState] = useState({ sort: 'uses', dir: 'desc' });
  const builds = useMemo(() => leagueBuilds([character], charMap), [character, charMap]);
  const rows = useMemo(
    () => filterBuilds(builds, { floor: 1, chars: [], ais: [], caps: [], group: 'all', sort, dir }),
    [builds, sort, dir]);

  // The picked build is the page's cut: highlighted, and open under its row
  // when the capsules have no side panel.
  const picked = (builds.find(b => b.code === current) || {}).id ?? null;
  const [shown, setShown] = useState(PAGE);
  useEffect(() => { setShown(PAGE); }, [builds, sort, dir]);

  const onSort = key => setSortState(cur => ({ sort: key, dir: cur.sort === key && cur.dir === 'desc' ? 'asc' : 'desc' }));
  const onPick = id => { const b = builds.find(x => x.id === id); if (b && onToggle) onToggle(b.code); };

  if (!rows.length) return <p className="m-0 text-[14px] text-slate-400">No builds in this scope.</p>;

  return (
    <div className="text-[14px] leading-[1.45] text-slate-100">
      <div className="mb-3 text-[13px] text-slate-400">
        <b className="font-semibold text-white">{rows.length}</b> build{rows.length === 1 ? '' : 's'}
      </div>
      <BuildsTable rows={rows} shown={shown} onMore={() => setShown(n => n + PAGE)}
        sort={sort} dir={dir} onSort={onSort} isWide={isWide}
        selected={picked} expanded={picked} onPick={onPick} idFor={() => portraitId}
        highlight={[]} showCharacter={false} pickFirst={false}
        emptyPanel="Pick a build to show only it, with its capsules." />
    </div>
  );
}
