import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import HeaderFigure from '../../components/HeaderFigure.jsx';
import { SearchBox } from '../../shell/tableParts.jsx';
import { useQueryUpdate } from '../../shell/useQueryUpdate.js';
import { capsuleTypeColor } from '../../utils/overviewPalette.js';
import { POSITION_NAMES } from '../../utils/positions.js';
import PooledTab from './PooledTab.jsx';
import { Box, DataSignal, PooledTiles, POOLED_FIGURES, UsedMostBy, fmtInt, pct, tone } from './detailParts.jsx';
import { readAiSort, sortAiRows } from './aiRows.js';
import { MIN_OTHER } from './aiShift.js';
import { CAPSULE_NOISE, lineupIndex } from '../../utils/transformation.js';
import { clock } from '../character/transformRows.js';
import {
  capsuleRows, capsuleChange, capsuleTransform, capsuleMatchesQuery, readCapsuleFilters,
  BUILD_TYPES, CAPSULE_COLUMNS, CAPSULE_PHONE_DEFAULTS, capsuleStatByKey, share, fitColor,
} from './capsuleRows.js';

const Dot = ({ type }) => <i className="block h-2 w-2 flex-none rounded-[2px]" style={{ background: capsuleTypeColor(type) }} />;
const characters = r => `${r.characters} character${r.characters === 1 ? '' : 's'}`;
const qualityTitle = r => `${r.quality} data: ${fmtInt(r.matches.length)} uses over ${characters(r)}, `
  + `${fmtInt(r.comparable)} comparable with the same characters' builds of the same type without it`;
const ROW = 'border-0 border-t border-solid border-gray-700/50 py-[5px] text-[12.5px] first:border-t-0';
const rate = v => `${Math.round(v * 100)}%`;
const points = v => `${v >= 0 ? '+' : '−'}${Math.round(Math.abs(v) * 100)}`;
/** A first transformation this many seconds sooner (green) or later (red) is coloured, as on the AI strategies tab. */
const TONE_SECONDS = 5;

/**
 * Transformations, for the capsules that act on them (capsuleRows.js
 * capsuleTransform()): a skill gauge capsule's rate and first transformation,
 * the same character on the same AI without it → with it, shown above Low
 * data only and coloured from CAPSULE_NOISE (10 points; smaller, it is
 * within what unrelated capsules swing by); Broly's Ring, which blocks them,
 * as how often characters that can transform carried it.
 */
function TransformBox({ t, idFor, linkFor }) {
  if (t.kind === 'ring') {
    return (
      <Box title="Transformations">
        <p className="m-0 mb-2 text-[12.5px] leading-[1.45] text-slate-300">
          Blocks transformations and fusions. {t.matches
            ? `Carried in ${fmtInt(t.matches)} match${t.matches === 1 ? '' : 'es'} by characters that can transform, which their transformation figures leave out:`
            : 'No character that can transform carried it here.'}
        </p>
        {t.byCharacter.length > 0 && <UsedMostBy byCharacter={t.byCharacter} idFor={idFor} linkFor={linkFor} title={false} />}
      </Box>
    );
  }
  if (t.quality === 'Low' || t.with === null) {
    return (
      <Box title="Transformations">
        <p className="m-0 text-[12.5px] text-slate-400">
          Too little to compare here: {fmtInt(t.compared)} match{t.compared === 1 ? '' : 'es'} over {t.characters} character{t.characters === 1 ? '' : 's'} whose
          {' '}same AI strategy also has {MIN_OTHER}+ matches without it.
        </p>
      </Box>
    );
  }
  const dt = t.seconds ? t.seconds.with - t.seconds.usual : null;
  const shown = dt === null ? 0 : Math.round(Math.abs(dt));
  return (
    <Box title="Transformations" aside="same character, same AI: without → with">
      <div className="flex items-baseline gap-2" title="The share of matches transformed or fused in">
        <span className="text-[13px] tabular-nums text-slate-400">{rate(t.usual)} →</span>
        <span className="text-[20px] font-extrabold tabular-nums leading-tight text-slate-50">{rate(t.with)}</span>
        <b className={`text-[14px] font-semibold tabular-nums ${tone(t.gain, CAPSULE_NOISE)}`}>{points(t.gain)}</b>
      </div>
      <div className="mb-2 text-[11.5px] text-slate-500">
        of matches transformed or fused{Math.abs(t.gain) < CAPSULE_NOISE
          ? `; within the ±${Math.round(CAPSULE_NOISE * 100)} points unrelated capsules move it by` : ''}
      </div>
      {dt !== null && (
        <div className="mb-2 flex items-baseline justify-between gap-2 border-0 border-t border-solid border-gray-700/50 pt-1.5 text-[12.5px]"
          title="The median time on the field before the first transformation. Sooner is better.">
          <span className="text-slate-300">First transformation</span>
          <span className="flex flex-col items-end tabular-nums">
            <span>
              <span className="text-slate-400">{clock(t.seconds.usual)}</span><span className="mx-1.5 text-slate-500">→</span>
              <b className="font-semibold text-slate-100">{clock(t.seconds.with)}</b>
            </span>
            <span className={`text-[11px] font-semibold leading-tight ${tone(dt, TONE_SECONDS, -1)}`}>{shown ? `${shown}s ${dt < 0 ? 'sooner' : 'later'}` : 'same time'}</span>
          </span>
        </div>
      )}
      <div className="text-[11.5px] text-slate-500">
        {fmtInt(t.compared)} matches with it over {t.characters} character{t.characters === 1 ? '' : 's'} ({t.quality} data)
      </div>
    </Box>
  );
}

/** A share of its uses as a bar, with a tick where all builds sit (`usual`). */
function ShareBar({ value, usual = null, color = '#56627a' }) {
  return (
    <span className="relative block h-[4px] rounded-sm bg-shell-track">
      <span className="absolute inset-y-0 left-0 rounded-sm" style={{ width: `${Math.min(100, value * 100)}%`, background: color }} />
      {usual !== null && <span className="absolute top-1/2 h-[10px] w-px -translate-y-1/2 bg-slate-300" style={{ left: `${Math.min(100, usual * 100)}%` }} />}
    </span>
  );
}
const TickLegend = () => (
  <span className="inline-flex items-center gap-1.5">its builds<span className="inline-block h-[10px] w-px bg-slate-300" />all builds</span>
);

/**
 * Rows of name, bar and share against all builds' (the tick), for the AI
 * strategies, Lineup position and Goes with boxes, so the three read alike.
 * An item may carry a capsule type's `dot` and its own `title`.
 */
function ShareRows({ items }) {
  return (
    <ul className="m-0 list-none p-0">
      {items.map(x => (
        <li key={x.key || x.label} className={`grid grid-cols-[minmax(0,1fr)_72px_40px] items-center gap-2.5 ${ROW}`}
          title={x.title || `${share(x.share)} of its builds; ${share(x.usual)} of all builds here`}>
          <span className="flex min-w-0 items-center gap-2 text-slate-200">
            {x.dot && <Dot type={x.dot} />}<span className="truncate">{x.label}</span>
          </span>
          <ShareBar value={x.share} usual={x.usual} />
          <span className="text-right tabular-nums text-slate-100">{share(x.share)}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * One capsule's detail, under its row: header figures and the capsule's
 * effect; the pooled figures as ranked tiles, with the change "vs without
 * it" (capsuleChange: the same characters' builds of the same type without
 * it) once that comparison is above Low; then bordered boxes: Build types
 * (the row's columns as bars), AI strategies, Lineup position and Goes with
 * (its builds against all builds; Goes with ranked by how many times as often,
 * the lift), Tiers (its family), Used most by. The skill gauge capsules and
 * Broly's Ring lead the boxes with Transformations (TransformBox).
 */
function CapsuleDetail({ row, pool, aggregated, filters, ctx, idFor, linkFor }) {
  const s = useMemo(() => capsuleChange(aggregated, row.capsuleId, filters), [aggregated, row.capsuleId, filters]);
  const tr = useMemo(() => capsuleTransform(aggregated, row.capsuleId, filters, ctx), [aggregated, row.capsuleId, filters, ctx]);
  const shown = s.quality !== 'Low';
  const change = (x, fmt, better = 1) => (x && shown ? { ...x, fmt, diff: pct, min: 0.03, better } : null);
  const changes = {
    dmg: change(s.dmg, v => fmtInt(v)),
    eff: change(s.eff, v => `${v.toFixed(2)}×`),
    taken: change(s.taken, v => fmtInt(v), -1),
  };
  const one = s.characters === 1 && filters.chars.length === 1;
  const whose = (w, u) => (one
    ? `With it ${w}; in its other builds of the same type ${u}`
    : `Its ${s.characters} compared characters average ${w} with it and ${u} in their other builds of the same type`);

  const fit = BUILD_TYPES.filter(t => row.fit[t]).map(t => ({ t, ...row.fit[t] })).sort((a, b) => b.share - a.share || b.of - a.of);

  return (
    <div className="pb-1 pt-1">
      <div className="mb-2 flex flex-wrap gap-x-7 gap-y-2">
        <HeaderFigure label="Uses">{fmtInt(row.matches.length)}</HeaderFigure>
        <HeaderFigure label="Characters">{fmtInt(row.characters)}</HeaderFigure>
        <HeaderFigure label="Cost">{row.cost}</HeaderFigure>
        <HeaderFigure label="Data" title={qualityTitle(row)}>
          <span className="inline-flex items-center gap-1.5"><DataSignal level={row.quality} />{row.quality}</span>
        </HeaderFigure>
        <HeaderFigure label="Compared" title={`Uses whose character also has ${MIN_OTHER}+ builds of the same type without it`}>
          {fmtInt(s.compared)}<span className="ml-1 text-sm font-medium text-slate-500">of {fmtInt(row.matches.length)}</span>
        </HeaderFigure>
      </div>
      {row.effect && <p className="mb-3 mt-0 max-w-[760px] whitespace-pre-line text-[13px] leading-[1.45] text-slate-300">{row.effect}</p>}

      <PooledTiles row={row} pool={pool} stats={POOLED_FIGURES} changes={changes} whose={whose} vs="vs without it"
        grid="grid-cols-2 sm:grid-cols-4 lg:grid-cols-7" lastSpan="col-span-2 lg:col-span-1" />

      <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {tr && <TransformBox t={tr} idFor={idFor} linkFor={linkFor} />}
        <Box title="Build types" aside="share of each type's builds">
          <ul className="m-0 list-none p-0">
            {fit.map(x => (
              <li key={x.t} className={`grid grid-cols-[96px_minmax(0,1fr)_40px] items-center gap-2.5 ${ROW}`}
                title={`In ${fmtInt(x.n)} of ${fmtInt(x.of)} ${x.t} builds`}>
                <span className="flex items-center gap-2 text-slate-200">
                  <i className="block h-2 w-2 flex-none rounded-[2px]" style={{ background: fitColor(x.t) }} />{x.t}
                </span>
                <ShareBar value={x.share} color={fitColor(x.t)} />
                <span className="text-right tabular-nums text-slate-100">{share(x.share)}</span>
              </li>
            ))}
          </ul>
        </Box>

        <Box title="AI strategies" aside={<TickLegend />}>
          <ShareRows items={row.ais.slice(0, 6).map(a => ({ label: a.name, share: a.share, usual: a.usual }))} />
          {row.ais.length > 6 && <div className="mt-1 text-[12px] text-slate-500">and {row.ais.length - 6} more</div>}
        </Box>

        <Box title="Lineup position" aside={<TickLegend />}>
          <ShareRows items={row.positions.map(p => ({ label: POSITION_NAMES[p.pos], share: p.share, usual: p.usual }))} />
        </Box>

        <Box title="Goes with" aside={<TickLegend />}>
          {row.goesWith.length ? (
            <ShareRows items={row.goesWith.slice(0, 5).map(p => ({
              key: p.id, label: p.name, dot: p.type, share: p.share, usual: p.usual,
              title: `In ${share(p.share)} of its builds (${fmtInt(p.n)}), ${share(p.usual)} of all builds here: ${p.lift.toFixed(1)}× as often`,
            }))} />
          ) : <p className="m-0 text-[12.5px] text-slate-400">Nothing is paired with it often enough here.</p>}
        </Box>

        {row.tiers && (
          <Box title="Tiers">
            <ul className="m-0 list-none p-0">
              {row.tiers.map(t => {
                const me = t.capsuleId === row.capsuleId;
                return (
                  <li key={t.capsuleId} className={ROW}>
                    <div className="flex items-baseline gap-2">
                      <span className={`min-w-0 flex-1 truncate ${me ? 'font-semibold text-orange-400' : 'text-slate-200'}`}>{t.name}</span>
                      <span className="tabular-nums text-slate-400">{t.cost} cost</span>
                      <span className="w-[64px] text-right tabular-nums text-slate-100">{fmtInt(t.uses)} use{t.uses === 1 ? '' : 's'}</span>
                    </div>
                    {t.effect && <div className="truncate text-[11.5px] text-slate-500">{t.effect.split('\n')[0]}</div>}
                  </li>
                );
              })}
            </ul>
          </Box>
        )}

        <Box title="Used most by">
          <UsedMostBy byCharacter={row.byCharacter} idFor={idFor} linkFor={linkFor} title={false} />
        </Box>
      </div>
    </div>
  );
}

/**
 * Meta's Capsules tab: a row per capsule in scope (meta/capsuleRows.js), on
 * the pooled Meta table (meta/PooledTab.jsx).
 *
 * The COLUMNS are FIT (the league, 2026-09-30): Uses, then a column per build
 * type, the share of that type's builds that run the capsule, so a reader can
 * sort for what a build type runs; the AI strategy chip narrows them to one
 * AI's builds. No Score column: a capsule's pooled score is mostly its builds',
 * and casual readers would take it for how good the capsule is. The pooled
 * figures open in the detail.
 *
 * Its filters are scope-bar chips (Capsule type, Cost, and the Builds tab's
 * Character and AI strategy); the search (name, type, effect) is in the
 * control row. `linkFor(name)` opens a character's page. Data quality and the
 * fading follow the AI strategies tab (the markers rule included).
 */
export default function CapsulesTab({ aggregated, charMap, idFor, linkFor }) {
  const [params] = useSearchParams();
  const update = useQueryUpdate();
  const filters = readCapsuleFilters(params);
  const filterKey = JSON.stringify(filters);
  const { sort, dir } = readAiSort(params, capsuleStatByKey, { score: false });
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableFilters = useMemo(() => filters, [filterKey]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const pool = useMemo(() => capsuleRows(aggregated, filters, charMap), [aggregated, filterKey, charMap]);
  // Who was on each side, for the Transformations box's fusion check.
  const ctx = useMemo(() => ({ idFor, lineups: lineupIndex(aggregated, idFor) }), [aggregated, idFor]);
  const rows = useMemo(() => sortAiRows(pool.filter(r => capsuleMatchesQuery(r, q)), { sort, dir }, capsuleStatByKey), [pool, q, sort, dir]);
  const varied = new Set(pool.map(r => r.quality)).size > 1;

  const onSort = key => update(p => {
    const byDefault = key === 'name' ? 'asc' : 'desc';
    const next = sort === key ? (dir === 'asc' ? 'desc' : 'asc') : byDefault;
    if (key === 'matches' && next === 'desc') { p.delete('sort'); p.delete('dir'); return; }
    p.set('sort', key);
    if (next === byDefault) p.delete('dir'); else p.set('dir', next);
  });

  return (
    <PooledTab rows={rows} sort={sort} dir={dir} onSort={onSort} resetKey={filterKey + q}
      nameLabel="Capsule" noun="capsules" score={false} below
      stats={CAPSULE_COLUMNS} phone={{ key: 'szl.analyzer.capsules.phoneCols', defaults: CAPSULE_PHONE_DEFAULTS, byKey: capsuleStatByKey }}
      afterName={varied ? [{
        key: 'data', label: 'Data', width: '48px', sort: false, title: 'Data quality: uses and characters',
        cell: r => <div className="flex justify-center"><DataSignal level={r.quality} title={qualityTitle(r)} /></div>,
      }] : []}
      fadeRow={varied ? r => r.quality === 'Low' : null}
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
          <div className="mt-[3px] flex min-w-0 items-center gap-1.5 pl-4 text-[12px] text-slate-400">
            <span className="truncate">{r.type} · {r.cost} cost{compact ? '' : ` · ${characters(r)}`}</span>
            {compact && varied && <><span aria-hidden>·</span><DataSignal level={r.quality} title={qualityTitle(r)} /></>}
          </div>
        </div>
      )}
      title={r => (
        <>
          <div className="flex items-center gap-2 text-[15px] font-semibold leading-[1.25] text-slate-50"><Dot type={r.type} />{r.name}</div>
          <div className="mt-1 pl-4 text-[12px] text-slate-400">{r.type} · {r.cost} cost</div>
        </>
      )}
      detail={r => <CapsuleDetail row={r} pool={pool} aggregated={aggregated} filters={stableFilters} ctx={ctx} idFor={idFor} linkFor={linkFor} />}
      footnote={`Build type columns: the share of that type's builds here that run the capsule.${
        varied ? '' : ` Every capsule here has ${pool[0] ? pool[0].quality : 'the same'} data, so none is marked.`}`} />
  );
}
