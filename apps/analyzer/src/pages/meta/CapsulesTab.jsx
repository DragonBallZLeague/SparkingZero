import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SearchBox } from '../../shell/tableParts.jsx';
import { useQueryUpdate } from '../../shell/useQueryUpdate.js';
import { tierMatchCount } from '../../utils/performanceTier.js';
import { capsuleTypeColor } from '../../utils/overviewPalette.js';
import PooledTab, { DetailFigures, KICKER } from './PooledTab.jsx';
import { UsedMostBy } from './AIStrategiesTab.jsx';
import { readAiSort, sortAiRows } from './aiRows.js';
import { capsuleRows, capsuleMatchesQuery, readCapsuleFilters } from './capsuleRows.js';

const fmtInt = v => Math.round(v || 0).toLocaleString('en-US');
const Dot = ({ type }) => <i className="block h-2 w-2 flex-none rounded-[2px]" style={{ background: capsuleTypeColor(type, true) }} />;

/**
 * One capsule's detail: its figures, what it does (the reference's effect
 * text), the capsules most often equipped with it, and who used it most.
 */
function CapsuleDetail({ row, idFor, linkFor }) {
  const uses = row.matches.length;
  return (
    <div>
      <DetailFigures figures={[
        ['Uses', fmtInt(tierMatchCount(row))],
        ['Chars', fmtInt(row.characters)],
        ['Cost', fmtInt(row.cost)],
        ['Eff', `${(row.efficiency || 0).toFixed(2)}×`],
      ]} />
      {row.effect && <p className="mb-3.5 mt-0 whitespace-pre-line text-[13px] leading-[1.45] text-slate-300">{row.effect}</p>}
      <div className={`${KICKER} mb-1`}>Often equipped with</div>
      <ul className="m-0 mb-3.5 list-none p-0">
        {row.pairs.slice(0, 5).map(p => (
          <li key={p.name} className="grid grid-cols-[8px_1fr_auto] items-center gap-2 border-0 border-t border-solid border-gray-700/50 py-1 text-[13px] text-slate-200 first:border-t-0">
            <Dot type={p.type} />
            <span className="truncate">{p.name}</span>
            <span className="text-[12px] tabular-nums text-slate-400">{Math.round((p.n / uses) * 100)}%</span>
          </li>
        ))}
      </ul>
      <UsedMostBy byCharacter={row.byCharacter} idFor={idFor} linkFor={linkFor} />
    </div>
  );
}

/**
 * Meta's Capsules tab: a row per capsule in scope, each the leaderboard's own
 * figures over every match it was equipped in (meta/capsuleRows.js), on the
 * pooled Meta table (meta/PooledTab.jsx), with its type, cost and effect, the
 * capsules it is paired with and who used it. It replaced a table with its own
 * character picker, type and AI selects, composite score and export.
 *
 * Its filters are scope-bar chips (Capsule type, and the Builds tab's
 * Character and AI strategy); the search (name, type, effect) is in the
 * control row. `linkFor(name)` opens a character's page.
 */
export default function CapsulesTab({ aggregated, charMap, idFor, linkFor }) {
  const [params] = useSearchParams();
  const update = useQueryUpdate();
  const filters = readCapsuleFilters(params);
  const filterKey = JSON.stringify(filters);
  const { sort, dir } = readAiSort(params);
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const pool = useMemo(() => capsuleRows(aggregated, filters, charMap), [aggregated, filterKey, charMap]);
  const rows = useMemo(() => sortAiRows(pool.filter(r => capsuleMatchesQuery(r, q)), { sort, dir }), [pool, q, sort, dir]);

  const onSort = key => update(p => {
    const byDefault = key === 'name' ? 'asc' : 'desc';
    const next = sort === key ? (dir === 'asc' ? 'desc' : 'asc') : byDefault;
    if (key === 'matches' && next === 'desc') { p.delete('sort'); p.delete('dir'); return; }
    p.set('sort', key);
    if (next === byDefault) p.delete('dir'); else p.set('dir', next);
  });

  return (
    <PooledTab rows={rows} sort={sort} dir={dir} onSort={onSort} resetKey={filterKey + q}
      nameLabel="Capsule" noun="capsules"
      empty={q ? `No capsule in this scope matches “${query.trim()}”.` : 'No capsules match these filters.'}
      controls={(
        <div className="flex items-center gap-3">
          <SearchBox value={query} onChange={setQuery} placeholder="Search capsules and effects" className="w-full sm:w-[300px]" />
          <span className="hidden whitespace-nowrap text-[13px] text-slate-400 sm:inline">
            <b className="font-semibold text-white">{rows.length}</b> capsule{rows.length === 1 ? '' : 's'}
          </span>
        </div>
      )}
      nameCell={(r, compact) => (
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <Dot type={r.type} />
            <span className="truncate text-[13px] font-semibold leading-[1.25] text-slate-50 sm:text-[14px]">{r.name}</span>
          </div>
          <div className="mt-[3px] truncate pl-4 text-[12px] text-slate-400">
            {r.type} · {r.cost} cost{compact ? '' : ` · ${r.characters} character${r.characters === 1 ? '' : 's'}`}
          </div>
        </div>
      )}
      title={r => (
        <>
          <div className="flex items-center gap-2 text-[15px] font-semibold leading-[1.25] text-slate-50"><Dot type={r.type} />{r.name}</div>
          <div className="mt-1 pl-4 text-[12px] text-slate-400">{r.type} · {r.cost} cost</div>
        </>
      )}
      detail={r => <CapsuleDetail row={r} idFor={idFor} linkFor={linkFor} />}
      footnote="Each capsule's figures are every match it was equipped in, read as the Characters table reads a character's." />
  );
}
