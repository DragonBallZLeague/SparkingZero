import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useIsPhone } from '../shell/useMediaQuery.js';
import { useQueryUpdate } from '../shell/useQueryUpdate.js';
import Segmented from '../shell/Segmented.jsx';
import { tierBasisSummary, isProvisionalTier, fadesThinSamples, tierForScore } from '../utils/performanceTier.js';
import { TIERS } from '../utils/tierScale.js';
import { ROUTES } from '../routes.js';
import Portrait from '../components/Portrait.jsx';
import TierScorePill from '../components/TierScorePill.jsx';
import TierList from './characters/TierList.jsx';
import StyleValue from './characters/StyleValue.jsx';
import MatchList from './matches/MatchList.jsx';
import { rowsForPositions, fadeLegend } from './characters/characterRows.js';
import { withStyles, styleByKey } from './characters/styleRows.js';
import {
  BOARDS, BOARD_MIN_MATCHES, boardPositions, boardRows, boardSearch, isStyleBoard, latestWeek,
  LATEST, readLatest, recentRows, uploadDay, UPLOADS_SHOWN,
} from './home/homeRows.js';

const PANEL = 'rounded-[10px] border border-solid border-gray-700 bg-shell-panel';
const H2 = 'm-0 text-base font-bold text-white';
const MORE = 'text-[13px] font-semibold text-orange-400 no-underline hover:underline';

/**
 * Home ("Home dashboard" in the redesign plan), a short page that points at
 * the most interesting things, in the order the league settled (2026-09-30):
 *   - Latest results lead: the newest week of season matches in scope, or,
 *     switched to Tests or Events, the newest uploads of those, so a
 *     participant finds the test they just sent in
 *   - the curated boards: six top-5 lists, each a preset over the Characters
 *     table that links into it the same way (home/homeRows.js)
 *   - the top tier: one row of the tier list, which the Characters page has
 *     whole (the full list took two phone screens and hid the rest)
 * Stats only: standings stay the website's.
 *
 * `aggregated` is the scope's aggregated rows and `matches` its Matches-list
 * rows (App owns loading); `search` is the scope's query string, which every
 * link here carries. The test and event uploads are their own small file,
 * outside the scope (the default scope is season matches).
 */
export default function HomePage({ aggregated, charMap, idFor, linkFor, search, matches, matchLinkFor, loading }) {
  const isPhone = useIsPhone();
  const rows = useMemo(() => rowsForPositions(aggregated, [], charMap), [aggregated, charMap]);
  // Each board ranks the Characters table's rows for its view and position,
  // so the position boards recompute every stat from those matches alone.
  const pools = useMemo(() => {
    const out = {};
    for (const b of BOARDS) {
      const key = poolKey(b);
      if (key in out) continue;
      const cut = boardPositions(b).length ? rowsForPositions(aggregated, boardPositions(b), charMap) : rows;
      out[key] = isStyleBoard(b) ? withStyles(cut) : cut;
    }
    return out;
  }, [aggregated, charMap, rows]);

  // The highest tier anyone in scope reaches (Z, unless the scope is narrow).
  const topTier = TIERS.find(t => rows.some(r => tierForScore(r.combatPerformanceScore) === t)) || TIERS[0];

  if (!rows.length) {
    return (
      <div className={`${PANEL} px-6 py-8 text-center text-slate-400`}>
        {loading ? 'Loading match data…' : 'No matches in this scope. Widen the filters above.'}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-8">
      <Latest matches={matches} isPhone={isPhone} matchLinkFor={matchLinkFor} search={search} />

      <Boards pools={pools} isPhone={isPhone} idFor={idFor} linkFor={linkFor} search={search} />

      <section>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className={H2}>Top tier</h2>
          <Link to={`${ROUTES.characters}${boardSearch({ view: 'tiers' }, search)}`} className={MORE}>
            Full tier list →
          </Link>
        </div>
        <TierList rows={rows} isPhone={isPhone} idFor={idFor} linkFor={linkFor} tiers={[topTier]} />
        <p className="mt-2.5 mb-0 text-xs text-slate-500">
          {tierBasisSummary()} {fadeLegend(rows)}
        </p>
      </section>
    </div>
  );
}

const poolKey = b => `${b.view || ''}|${boardPositions(b).join(',')}`;

// ---- latest results ------------------------------------------------------------

/** Loaded once per visit: a few KB, shared by every render of Home. */
let recentUploads = null;
function useRecentUploads(wanted) {
  const [file, setFile] = useState(recentUploads);
  useEffect(() => {
    if (!wanted || file) return undefined;
    let live = true;
    fetch(`${import.meta.env.BASE_URL}br-recent-uploads.json`)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(r.status))))
      .then(j => { recentUploads = j; if (live) setFile(j); })
      .catch(() => { if (live) setFile({ failed: true }); });
    return () => { live = false; };
  }, [wanted, file]);
  return file;
}

/**
 * The lead: what happened most recently. Season shows the newest week of
 * season matches in the scope; Tests and Events the newest uploads of those
 * from every team, grouped by the day they came in, whatever the scope (the
 * default scope has neither in it).
 */
function Latest({ matches, isPhone, matchLinkFor, search }) {
  const [params] = useSearchParams();
  const update = useQueryUpdate();
  const which = readLatest(params);
  const kind = LATEST.find(l => l.key === which);
  const setWhich = v => update(p => { if (v === 'season') p.delete('latest'); else p.set('latest', v); });
  const [shown, setShown] = useState(UPLOADS_SHOWN);
  useEffect(() => { setShown(UPLOADS_SHOWN); }, [which]);

  const week = useMemo(() => latestWeek(matches), [matches]);
  const file = useRecentUploads(which !== 'season');
  const uploads = useMemo(() => (which === 'season' ? [] : recentRows(file, which)), [file, which]);
  // The "All ..." link opens the newest season's list of that kind.
  const newestSeason = uploads.reduce((m, r) => (r.seasonNumber !== null && (m === null || Number(r.seasonNumber) > Number(m)) ? r.seasonNumber : m), null);

  const sub = which === 'season' ? (week ? week.label : null) : kind.sub;
  const more = which === 'season'
    ? (
      <Link to={ROUTES.matches + search} className={`${MORE} flex-none`}>
        All {matches.length} {matches.length === 1 ? 'match' : 'matches'} →
      </Link>)
    : (newestSeason !== null && (
      <Link to={`${ROUTES.matches}?seasonNumber=${encodeURIComponent(newestSeason)}&matchType=${kind.matchType}`} className={`${MORE} flex-none`}>
        All Season {newestSeason} {kind.noun} →
      </Link>));

  let body;
  if (which !== 'season') {
    if (!file) body = <div className={`${PANEL} p-6 text-center text-[13px] text-slate-400`}>Loading the newest {kind.noun}…</div>;
    else if (!uploads.length) body = <div className={`${PANEL} p-6 text-center text-[13px] text-slate-400`}>{file.failed ? `The newest ${kind.noun} could not be loaded.` : `No ${kind.noun} uploaded yet.`}</div>;
    else {
      body = (
        <MatchList rows={uploads} shown={shown} onMore={() => setShown(uploads.length)} isPhone={isPhone}
          linkFor={matchLinkFor} groupOf={file.dated ? r => uploadDay(r.uploaded) : null} />
      );
    }
  } else if (week) {
    body = <MatchList rows={week.rows} shown={week.rows.length} isPhone={isPhone} linkFor={matchLinkFor} />;
  } else {
    body = <div className={`${PANEL} p-6 text-center text-[13px] text-slate-400`}>No season matches in this scope, so no weekly results.</div>;
  }

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className={H2}>Latest results</h1>
          <Segmented label="Latest results" value={which} onChange={setWhich}
            options={LATEST.map(l => ({ value: l.key, label: l.label }))} />
          {!isPhone && sub && <span className="text-[13px] text-slate-400">{sub}</span>}
        </div>
        {!isPhone && more}
      </div>
      {isPhone && (sub || more) && (
        <div className="-mt-1 mb-2.5 flex items-baseline justify-between gap-3">
          <span className="min-w-0 text-[13px] text-slate-400">{sub}</span>
          {more}
        </div>
      )}
      {body}
    </section>
  );
}

// ---- the boards ----------------------------------------------------------------

/**
 * The six boards. A desktop shows them all, three to a line (the styles, then
 * the positions); a tablet two; a phone one at a time, picked from a two-line
 * switch of the six, so the page stays short.
 */
function Boards({ pools, isPhone, idFor, linkFor, search }) {
  const [picked, setPicked] = useState(BOARDS[0].key);
  const board = b => (
    <Board key={b.key} board={b} pool={pools[poolKey(b)] || []} idFor={idFor} linkFor={linkFor} search={search} />
  );
  return (
    <section>
      <div className="mb-3 flex items-baseline gap-2.5">
        <h2 className={H2}>Leaderboards</h2>
        <span className="text-[13px] text-slate-400">{BOARD_MIN_MATCHES}+ matches</span>
      </div>
      {isPhone ? (
        <>
          <div role="group" aria-label="Leaderboard"
            className="mb-2.5 grid grid-cols-3 gap-[3px] rounded-[9px] border border-solid border-gray-700 bg-gray-800 p-[3px]">
            {BOARDS.map(b => {
              const on = b.key === picked;
              return (
                <button key={b.key} type="button" aria-pressed={on} onClick={() => setPicked(b.key)}
                  className={`rounded-md border-0 px-1 py-1.5 text-[12px] leading-[1.45] font-semibold whitespace-nowrap cursor-pointer ${
                    on ? 'bg-gray-700 text-white' : 'bg-transparent text-slate-400'}`}>
                  {b.title}
                </button>
              );
            })}
          </div>
          {board(BOARDS.find(b => b.key === picked) || BOARDS[0])}
        </>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">{BOARDS.map(board)}</div>
      )}
    </section>
  );
}

/**
 * One board: its name and what it ranks, heading a link into the Characters
 * table sorted the same way, then its five, each opening the character's
 * page. A style board shows the figure it ranks by (a rate a minute, or
 * Defense's 0-100 rating; the league rank in the tooltip), not a rank, which
 * beside the board's own 1-5 read as a second ranking; a position board the
 * score. Only characters with 5+ matches, unless too
 * few have that many: then the rest fill in, faded as the table fades them.
 */
function Board({ board, pool, idFor, linkFor, search }) {
  const five = boardRows(pool, board);
  const fade = fadesThinSamples(pool);
  const table = ROUTES.characters + boardSearch(board, search);
  return (
    <div className={PANEL}>
      <Link to={table} title="Open the full table, sorted this way"
        className="group flex items-start justify-between gap-3 border-0 border-b border-solid border-gray-700 px-3.5 py-2.5 no-underline">
        <span className="min-w-0">
          <span className="block text-[14px] font-bold leading-[1.35] text-white">{board.title}</span>
          <span className="block text-xs leading-[1.45] text-slate-400">{board.note}</span>
        </span>
        <span className="flex-none pt-px text-xs font-semibold leading-[1.45] text-orange-400 group-hover:underline">
          All {pool.length} →
        </span>
      </Link>
      {five.length ? (
        <ol className="m-0 list-none p-0 py-1">
          {five.map((r, i) => {
            const thin = fade && isProvisionalTier(r);
            return (
              <li key={r.name}>
                <Link to={linkFor(r.name)} title={thin ? `${r.name}: fewer than 5 matches` : r.name}
                  className="flex items-center gap-2.5 px-3.5 py-[5px] text-inherit no-underline hover:bg-slate-400/[.05]">
                  <span className="w-3 flex-none text-right text-xs tabular-nums text-slate-500">{i + 1}</span>
                  <Portrait id={idFor(r.name)} name={r.name} size={28} rounded={6} dim={thin} />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-slate-100">{r.name}</span>
                  {isStyleBoard(board)
                    ? <span className="flex-none text-[13px] font-semibold tabular-nums text-white"><StyleValue f={r.styles[board.sort]} stat={styleByKey(board.sort)} unit /></span>
                    : <TierScorePill score={r.combatPerformanceScore} provisional={thin} />}
                </Link>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="m-0 px-3.5 py-4 text-[13px] text-slate-400">No character played here in this scope.</p>
      )}
    </div>
  );
}
