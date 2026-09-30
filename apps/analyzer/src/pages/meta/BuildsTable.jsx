import React from 'react';
import { Link } from 'react-router-dom';
import Portrait from '../../components/Portrait.jsx';
import TierScorePill from '../../components/TierScorePill.jsx';
import { BuildPill } from '../character/overview/BuildPicker.jsx';
import { BuildYamlButtons } from '../../components/build/BuildYamlButtons.jsx';
import { capsuleTypeColor } from '../../utils/overviewPalette.js';
import { NAV_H, SCOPE_H } from '../../shell/ScopeBar.jsx';
import StatTable from '../../shell/StatTable.jsx';
import { capsuleBreakdown } from './buildRows.js';
import { fadesThinSamples } from '../../utils/performanceTier.js';

/**
 * The league-wide Builds table, in the layout the league chose on the shell
 * demo ("layout A"): one compact row per build, and the build's capsules as the
 * familiar one-column list beside the table - never spread one per column.
 *
 * From 1180px up the list sits in a sticky side panel for the selected row
 * (the first row until one is picked). Narrower, including on a phone, a row
 * opens its list underneath instead.
 *
 * Win % is the last column and is left out on a phone and in the side panel:
 * for one character's build it mostly reflects the team around it.
 *
 * The Character page's Builds tab draws one character's builds with it
 * (`showCharacter` false: no Character column, and a phone row leads with the
 * build instead). Wherever a build's capsules show, Copy YAML / Download give
 * it in the Match Builder's format.
 *
 * The table itself is the one template (shell/StatTable.jsx), whose picked
 * row and opened detail it was the model for.
 */

const fmtInt = v => Math.round(v || 0).toLocaleString('en-US');
const fmtEff = v => `${(v || 0).toFixed(2)}×`;

/** The build's capsule cost, split by capsule type, as one thin bar. */
export function CostBar({ capsules, className = '' }) {
  const { byType, order } = capsuleBreakdown(capsules);
  return (
    <span className={`flex h-1.5 gap-0.5 overflow-hidden rounded-[3px] bg-shell-track ${className}`}
      title={order.map(t => `${t} ${byType[t]}`).join(', ')}>
      {order.map(t => <i key={t} className="block h-full" style={{ flex: byType[t], background: capsuleTypeColor(t) }} />)}
    </span>
  );
}

/** The capsules as a one-column list, grouped by type, with the AI strategy last. */
export function CapsuleList({ build, highlight = [] }) {
  const { caps } = capsuleBreakdown(build.capsules);
  return (
    <ul className="m-0 list-none p-0">
      {caps.map((c, i) => (
        <li key={`${c.name}-${i}`}
          className={`grid grid-cols-[8px_1fr_auto] items-center gap-2 py-[3px] text-left text-[13px] border-0 border-t border-solid border-gray-700/50 first:border-t-0 ${
            highlight.includes(c.slug) ? 'font-semibold text-white' : 'text-slate-200'}`}>
          <i className="block h-2 w-2 rounded-[2px]" style={{ background: capsuleTypeColor(c.type) }} />
          <span>{c.name}</span>
          <em className="not-italic text-[11px] leading-[1.45] text-slate-400 tabular-nums">{c.cost}</em>
        </li>
      ))}
      <li className="mt-0.5 grid grid-cols-[auto_1fr] items-center gap-2 py-[3px] text-left text-[13px] text-slate-300 border-0 border-t border-solid border-gray-700">
        <span className="rounded border border-solid border-gray-700 px-1 text-[10px] leading-[1.45] font-bold tracking-[.05em] text-slate-400">AI</span>
        <span>{build.aiName}</span>
      </li>
    </ul>
  );
}

/** Under a build's capsules: the YAML buttons, and the link `buildLinkFor` gives (`openLabel` names it). */
function BuildActions({ build, buildLinkFor, openLabel }) {
  const to = buildLinkFor ? buildLinkFor(build) : null;
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <BuildYamlButtons characterName={build.name} capsules={build.capsules} aiStrategy={build.aiName} />
      {to && (
        <Link to={to} className="text-[13px] font-semibold text-orange-400 no-underline hover:underline">
          {openLabel ? openLabel(build) : `Open on ${build.name}’s page ↗`}
        </Link>
      )}
    </div>
  );
}

function SidePanel({ build, idFor, buildLinkFor, openLabel, highlight, empty = 'Select a build' }) {
  const box = 'self-start sticky rounded-[10px] border border-solid border-gray-700 bg-shell-panel p-4';
  if (!build) return <div className={`${box} text-center text-[13px] text-slate-400`} style={{ top: NAV_H + SCOPE_H + 16 }}>{empty}</div>;
  const { cost } = capsuleBreakdown(build.capsules);
  const stat = (label, value) => (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] leading-[1.45] uppercase tracking-[.04em] text-slate-400">{label}</span>
      <b className="text-[15px] tabular-nums text-slate-100">{value}</b>
    </div>
  );
  return (
    <div className={box} style={{ top: NAV_H + SCOPE_H + 16 }}>
      <div className="mb-3 flex items-center gap-3">
        <Portrait id={idFor(build.name)} name={build.name} size={48} rounded={10} />
        <div className="min-w-0">
          <div className="text-[15px] font-semibold leading-[1.2] text-slate-50">{build.name}</div>
          <div className="mt-1"><BuildPill label={build.label} compact /></div>
        </div>
      </div>
      <div className="mb-3 grid grid-cols-4 gap-2 border-0 border-y border-solid border-gray-700/50 pb-3 pt-2.5">
        {stat('Uses', build.uses)}
        {stat('Avg dmg', fmtInt(build.dmg))}
        {stat('Eff', fmtEff(build.eff))}
        {stat('Score', build.score === null ? '–' : build.score.toFixed(1))}
      </div>
      <div className="mb-1.5 flex items-baseline justify-between text-[11px] leading-[1.45] font-semibold uppercase tracking-[.05em] text-slate-400">
        <span>Capsules</span><span className="tabular-nums">{cost} cost</span>
      </div>
      <CostBar capsules={build.capsules} className="mb-2 w-full max-w-[150px]" />
      <CapsuleList build={build} highlight={highlight} />
      <BuildActions build={build} buildLinkFor={buildLinkFor} openLabel={openLabel} />
    </div>
  );
}

export default function BuildsTable({
  rows, shown, onMore, sort, dir, onSort, isPhone, isWide, selected, onPick, expanded, idFor, buildLinkFor, highlight,
  showCharacter = true, openLabel = null,
  // Whether the side panel shows the first row while none is picked (Meta), or
  // `emptyPanel` (the Character page, where a picked row is a filter).
  pickFirst = true, emptyPanel = undefined,
}) {
  const list = rows.slice(0, shown);
  const sel = isWide ? (list.find(b => b.id === selected) || (pickFirst ? list[0] : null) || null) : null;
  const fade = fadesThinSamples(rows, b => b.provisional);
  const num = 'text-right text-[14px] text-slate-100 tabular-nums';

  // The build: its type and cost bar, its AI strategy under them.
  const buildCell = (b, bar) => (
    <div className="min-w-0">
      <div className="flex min-w-0 items-center gap-2">
        <BuildPill label={b.label} compact className="flex-none" />
        <CostBar capsules={b.capsules} className={`${bar} flex-auto`} />
      </div>
      <div className="mt-[3px] truncate text-[12px] text-slate-400">{b.aiName}</div>
    </div>
  );
  const character = b => (
    <div className="flex min-w-0 items-center gap-2.5">
      <Portrait id={idFor(b.name)} name={b.name} size={34} />
      {isPhone ? (
        <div className="min-w-0">
          <div className="text-[13px] font-semibold leading-[1.2] text-slate-50">{b.name}</div>
          <CostBar capsules={b.capsules} className="mt-[3px] w-[120px] flex-none" />
        </div>
      ) : (
        <span className="text-[14px] font-semibold leading-[1.2] text-slate-50">{b.name}</span>
      )}
    </div>
  );
  const figure = (key, label, width, cell) => ({ key, label, width, sort: true, cell });
  const uses = w => figure('uses', 'Uses', w, b => <div className={num}>{b.uses}</div>);
  const eff = w => figure('eff', 'Eff', w, b => <div className={num}>{fmtEff(b.eff)}</div>);
  const score = w => figure('score', 'Score', w,
    b => <div className="text-right"><TierScorePill score={b.score} provisional={fade && b.provisional} /></div>);

  const columns = isPhone ? [
    // One character's builds lead with the build; the league's with the character.
    { key: 'build', label: 'Build', align: 'left', width: 'minmax(0,1fr)', sort: false,
      cell: b => (showCharacter ? character(b) : buildCell(b, 'min-w-[30px] max-w-[90px]')) },
    uses('40px'), eff('50px'), score('56px'),
  ] : [
    { key: '#', label: '#', width: '28px', sort: false,
      cell: (b, i) => <div className="text-right text-[12px] text-slate-500 tabular-nums">{i + 1}</div> },
    ...(showCharacter ? [{ key: 'character', label: 'Character', align: 'left', width: 'minmax(150px,1fr)', sort: false, cell: character }] : []),
    { key: 'build', label: 'Build', align: 'left', width: 'minmax(210px,1.6fr)', sort: false,
      cell: b => buildCell(b, 'min-w-[40px] max-w-[120px]') },
    uses('44px'),
    figure('dmg', 'Avg dmg', '70px', b => <div className={num}>{fmtInt(b.dmg)}</div>),
    eff('52px'), score('66px'),
    figure('win', 'Win %', '48px', b => <div className="text-right text-[14px] text-slate-400 tabular-nums">{Math.round(b.win)}%</div>),
  ];

  // Narrower than the side panel's width, a row opens its capsules under it,
  // lined up under the build on a desktop.
  const detail = b => (
    <div className={isPhone ? '' : 'pl-[44px]'}>
      {isPhone && showCharacter && <div className="mb-2 mt-0.5"><BuildPill label={b.label} compact /></div>}
      <CapsuleList build={b} highlight={highlight} />
      <BuildActions build={b} buildLinkFor={buildLinkFor} openLabel={openLabel} />
    </div>
  );

  const table = (
    <StatTable columns={columns} rows={rows} rowKey={b => b.id} sort={sort} dir={dir} onSort={onSort}
      onPick={b => onPick(b.id)} selected={sel ? sel.id : null}
      expanded={isWide ? null : expanded} renderExpanded={isWide ? null : detail}
      shown={shown} onMore={onMore} isPhone={isPhone} empty="No builds match." />
  );

  if (!isWide) return table;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_330px] items-start gap-4">
      {table}
      <SidePanel build={sel} idFor={idFor} buildLinkFor={buildLinkFor} openLabel={openLabel} highlight={highlight} empty={emptyPanel} />
    </div>
  );
}
