import React from 'react';
import { Link } from 'react-router-dom';
import Portrait from '../../components/Portrait.jsx';
import TierScorePill from '../../components/TierScorePill.jsx';
import { BuildPill } from '../character/overview/BuildPicker.jsx';
import { capsuleTypeColor } from '../../utils/overviewPalette.js';
import { NAV_H, SCOPE_H } from '../../shell/ScopeBar.jsx';
import { HEAD, SortHead, ShowMore } from '../../shell/tableParts.jsx';
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
 */

const fmtInt = v => Math.round(v || 0).toLocaleString('en-US');
const fmtEff = v => `${(v || 0).toFixed(2)}×`;

/** The build's capsule cost, split by capsule type, as one thin bar. */
export function CostBar({ capsules, className = '' }) {
  const { byType, order } = capsuleBreakdown(capsules);
  return (
    <span className={`flex h-1.5 gap-0.5 overflow-hidden rounded-[3px] bg-shell-track ${className}`}
      title={order.map(t => `${t} ${byType[t]}`).join(', ')}>
      {order.map(t => <i key={t} className="block h-full" style={{ flex: byType[t], background: capsuleTypeColor(t, true) }} />)}
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
          <i className="block h-2 w-2 rounded-[2px]" style={{ background: capsuleTypeColor(c.type, true) }} />
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

function OpenLink({ build, buildLinkFor }) {
  const to = buildLinkFor(build);
  if (!to) return null;
  return (
    <Link to={to} className="mt-3 inline-block text-[13px] font-semibold text-orange-400 no-underline hover:underline">
      Open on {build.name}’s page ↗
    </Link>
  );
}

function SidePanel({ build, idFor, buildLinkFor, highlight }) {
  const box = 'self-start sticky rounded-[10px] border border-solid border-gray-700 bg-shell-panel p-4';
  if (!build) return <div className={`${box} text-center text-slate-400`} style={{ top: NAV_H + SCOPE_H + 16 }}>Select a build</div>;
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
          <div className="mt-1"><BuildPill label={build.label} darkMode compact /></div>
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
      <OpenLink build={build} buildLinkFor={buildLinkFor} />
    </div>
  );
}

export default function BuildsTable({
  rows, shown, onMore, sort, dir, onSort, isPhone, isWide, selected, onPick, expanded, idFor, buildLinkFor, highlight,
}) {
  const list = rows.slice(0, shown);
  const cols = isPhone
    ? 'minmax(0,1fr) 40px 50px 56px'
    : '28px minmax(150px,1fr) minmax(210px,1.6fr) 44px 70px 52px 66px 48px';
  const grid = { display: 'grid', gridTemplateColumns: cols, alignItems: 'center', columnGap: isPhone ? 8 : 12 };
  const head = (key, label) => <SortHead label={label} on={sort === key} dir={dir} onClick={() => onSort(key)} />;
  const sel = isWide ? (list.find(b => b.id === selected) || list[0] || null) : null;
  const fade = fadesThinSamples(rows, b => b.provisional);

  const table = (
    <div className="min-w-0 rounded-[10px] border border-solid border-gray-700 bg-shell-panel">
      <div className="sticky z-10 min-h-[38px] rounded-t-[10px] border-0 border-b border-solid border-gray-700 bg-shell-panel px-2.5 sm:px-3.5"
        style={{ ...grid, top: NAV_H + SCOPE_H }}>
        {isPhone ? (
          <>
            <div className={`${HEAD} text-slate-400`}>Build</div>
            {head('uses', 'Uses')}{head('eff', 'Eff')}{head('score', 'Score')}
          </>
        ) : (
          <>
            <div className={`${HEAD} text-right text-slate-400`}>#</div>
            <div className={`${HEAD} text-slate-400`}>Character</div>
            <div className={`${HEAD} text-slate-400`}>Build</div>
            {head('uses', 'Uses')}{head('dmg', 'Avg dmg')}{head('eff', 'Eff')}{head('score', 'Score')}{head('win', 'Win %')}
          </>
        )}
      </div>

      {/* The last row loses its rule: the panel's edge, or "Show more", takes its place. */}
      <div className="[&>*:last-child]:border-b-0">
        {list.map((b, i) => {
          const on = sel && sel.id === b.id;
          const open = !isWide && expanded === b.id;
          const who = (
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
          const num = 'text-right text-[14px] text-slate-100 tabular-nums';
          return (
            <React.Fragment key={b.id}>
              <div role="button" tabIndex={0} aria-pressed={isWide ? on : undefined} aria-expanded={isWide ? undefined : open}
                onClick={() => onPick(b.id)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(b.id); } }}
                style={grid}
                className={`min-h-[46px] cursor-pointer px-2.5 sm:px-3.5 border-0 border-b border-solid border-gray-700/50 ${
                  on ? 'bg-brand/[.12] shadow-[inset_2px_0_0_#f97316]' : 'hover:bg-slate-400/5'}`}>
                {isPhone ? (
                  <>
                    {who}
                    <div className={num}>{b.uses}</div>
                    <div className={num}>{fmtEff(b.eff)}</div>
                    <div className="text-right"><TierScorePill score={b.score} provisional={fade && b.provisional} /></div>
                  </>
                ) : (
                  <>
                    <div className="text-right text-[12px] text-slate-500 tabular-nums">{i + 1}</div>
                    {who}
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <BuildPill label={b.label} darkMode compact className="flex-none" />
                        <CostBar capsules={b.capsules} className="min-w-[40px] max-w-[120px] flex-auto" />
                      </div>
                      <div className="mt-[3px] truncate text-[12px] text-slate-400">{b.aiName}</div>
                    </div>
                    <div className={num}>{b.uses}</div>
                    <div className={num}>{fmtInt(b.dmg)}</div>
                    <div className={num}>{fmtEff(b.eff)}</div>
                    <div className="text-right"><TierScorePill score={b.score} provisional={fade && b.provisional} /></div>
                    <div className="text-right text-[14px] text-slate-400 tabular-nums">{Math.round(b.win)}%</div>
                  </>
                )}
              </div>
              {open && (
                <div className={`border-0 border-b border-solid border-gray-700/50 ${isPhone ? 'px-2.5 pb-3 pt-1' : 'pb-3.5 pl-[58px] pr-3.5 pt-1'}`}>
                  {isPhone && <div className="mb-2 mt-0.5"><BuildPill label={b.label} darkMode compact /></div>}
                  <CapsuleList build={b} highlight={highlight} />
                  <OpenLink build={b} buildLinkFor={buildLinkFor} />
                </div>
              )}
            </React.Fragment>
          );
        })}
        {!list.length && <div className="p-7 text-center text-slate-400">No builds match.</div>}
      </div>

      <ShowMore left={rows.length - list.length} onClick={onMore} />
    </div>
  );

  if (!isWide) return table;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_330px] items-start gap-4">
      {table}
      <SidePanel build={sel} idFor={idFor} buildLinkFor={buildLinkFor} highlight={highlight} />
    </div>
  );
}
