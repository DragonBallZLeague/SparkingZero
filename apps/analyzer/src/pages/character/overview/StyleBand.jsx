import React, { useState } from 'react';
import { STYLES, fightingStyles } from '../../../utils/characterOverview.js';
import { styleColor, capsuleTypeColor, rankColor } from '../../../utils/overviewPalette.js';
import { fmt, RankText, Tip, TipTable, MedianTrack } from './parts.jsx';
import BuildPicker, { BuildPill } from './BuildPicker.jsx';
import Segmented from '../../../shell/Segmented.jsx';
import { useIsPhone } from '../../../shell/useMediaQuery.js';

/**
 * The Overview's lower half: what kind of fighter this is. Left, the build picker,
 * the fighting-style label, the build and the AI; right, "How it fights" as a
 * radar or as bars, over six styles in the league's order.
 */

const MUTED = 'text-slate-400';
const KICKER = `text-[11px] font-semibold uppercase tracking-wider ${MUTED}`;

/**
 * A raw zero is "never", not a rank. Ranks share the middle on ties, so the ~1 in
 * 5 characters who never use a skill would all sit at a low-but-nonzero rank, and a
 * bar drawn there reads as real use. Zero gets an empty bar and "Never".
 */
function shown(o, place, st) {
  const raw = st.rate ? o.rate[st.rate] : null;
  if (raw === 0) return { p: 0, zero: true };
  return { p: place.pct['style_' + st.key], zero: false };
}

/** The sub-stats under a style: [label, metric key, value text, raw, is-outcome, league text, unit label]. */
function subParts(o, M, key) {
  const pm = (x, d) => `${fmt(x, d)}/min`;
  if (key === 'melee') return [
    ['Rush', 'r_rush', pm(o.rate.rush, 1), o.rate.rush, false, pm(M.r_rush, 1)],
    ['Heavy', 'r_heavy', pm(o.rate.heavy, 1), o.rate.heavy, false, pm(M.r_heavy, 1)],
  ];
  if (key === 'blast') return [
    ['Super 1', 'r_s1', pm(o.rate.s1, 2), o.rate.s1, false, pm(M.r_s1, 2)],
    ['Super 2', 'r_s2', pm(o.rate.s2, 2), o.rate.s2, false, pm(M.r_s2, 2)],
  ];
  if (key === 'skill') return [
    ['Skill 1', 'r_sk1', pm(o.rate.sk1, 2), o.rate.sk1, false, pm(M.r_sk1, 2)],
    ['Skill 2', 'r_sk2', pm(o.rate.sk2, 2), o.rate.sk2, false, pm(M.r_sk2, 2)],
  ];
  if (key === 'defense') return [
    ['Guards', 'r_guard', pm(o.rate.guard, 1), o.rate.guard, false, pm(M.r_guard, 1)],
    ['Counters', 'r_counter', pm(o.rate.counter, 1), o.rate.counter, false, pm(M.r_counter, 1)],
    ['Tags', 'tags', `${fmt(o.tagsPerMatch, 1)}/match`, o.tagsPerMatch, true, `${fmt(M.tags, 1)}/match`],
    ['Survival', 'survival', `${Math.round(o.survival * 100)}%`, o.survival, true, `${Math.round((M.survival || 0) * 100)}%`],
  ];
  return [];
}
// A zero rate reads "Never"; a zero outcome (0% survival, 0 tags) keeps its number.
const partText = ([, , val, raw, outcome]) => (raw === 0 && !outcome ? 'Never' : val);

/** Everything the bars show for one style, for the radar's tooltip. */
function styleTip(o, place, M, st) {
  const s = shown(o, place, st);
  const rows = st.rate ? [['Per min', s.zero ? 'Never' : fmt(o.rate[st.rate], st.rate === 'melee' || st.rate === 'ki' ? 1 : 2), fmt(M['r_' + st.rate], st.rate === 'melee' || st.rate === 'ki' ? 1 : 2)]] : [];
  for (const part of subParts(o, M, st.key)) rows.push([part[0], partText(part), part[5]]);
  const k = 'style_' + st.key;
  return <TipTable title={st.name} rows={rows}
    foot={s.zero ? null : <>Rank <b>#{place.rank[k]} of {place.pool[k]}</b></>} />;
}

const Swatch = ({ color, className = '' }) => (
  <span className={`inline-block w-2.5 h-2.5 rounded-sm shrink-0 ${className}`} style={{ background: color }} />
);

// ---- bars -------------------------------------------------------------------
/** A sub-figure's tooltip: its value against the league's, and its rank. */
function partTip(part, place) {
  const [name, key, , raw, outcome] = part;
  const unit = key === 'tags' ? 'Per match' : key === 'survival' ? 'Survived' : 'Per min';
  return <TipTable title={name} rows={[[unit, partText(part), part[5]]]}
    foot={raw === 0 && !outcome ? null : <>Rank <b>#{place.rank[key]} of {place.pool[key]}</b></>} />;
}

const rankOrNever = (s, place, k) => (s.zero
  ? <span className={`font-bold ${MUTED}`}>Never</span>
  : <RankText rank={place.rank[k]} pool={place.pool[k]} color={rankColor(s.p)} />);

/** A tablet or desktop: a row per style, its figures in columns beside the bar. */
function StyleBars({ o, place, M }) {
  const cols = 'grid grid-cols-[96px_1fr_56px_56px_72px] gap-x-3 items-center';
  return (
    <div className="space-y-3">
      <div className={`${cols} text-[10px] font-bold uppercase tracking-wider whitespace-nowrap text-slate-500`}>
        <span /><span /><span className="text-right">Per min</span><span className="text-right">League</span><span className="text-right">Rank</span>
      </div>
      {STYLES.map(st => {
        const s = shown(o, place, st);
        const color = styleColor(st.key);
        const dp = st.rate === 'melee' || st.rate === 'ki' ? 1 : 2;
        const parts = subParts(o, M, st.key);
        return (
          <div key={st.key}>
            <div className={cols}>
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <Swatch color={color} />{st.name}
              </span>
              <MedianTrack p={s.p} color={color} height={12} empty={s.zero} />
              <span className="text-right text-sm font-semibold tabular-nums text-slate-100">
                {st.rate ? fmt(o.rate[st.rate], dp) : ''}
              </span>
              <span className={`text-right text-sm tabular-nums ${MUTED}`}>{st.rate ? fmt(M['r_' + st.rate], dp) : ''}</span>
              <span className="text-right text-sm">{rankOrNever(s, place, 'style_' + st.key)}</span>
            </div>
            {parts.length > 0 && (
              <div className="grid grid-cols-[96px_1fr] gap-x-3 mt-1">
                <span />
                {/* Two to a line, so Defense's four stack instead of running off to the right. */}
                <div className="grid grid-cols-[repeat(2,max-content)] gap-x-5 gap-y-1">
                  {parts.map(part => (
                    <Tip key={part[0]} as="span" className="inline-flex items-center gap-1.5 text-xs" content={partTip(part, place)}>
                      <span className={MUTED}>{part[0]}</span>
                      <span className="inline-block w-11"><MedianTrack p={place.pct[part[1]]} color={color} height={5} empty={part[3] === 0} /></span>
                      <b className="tabular-nums text-slate-100">{partText(part)}</b>
                    </Tip>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * A phone: each style is a block, its name, rate and rank on one line and its
 * bar the full width under them, so the bar is long enough to read (beside
 * the four columns above it shrank to a stub, 2026-09-30). The sub-figures
 * sit two to a line under it, each its name and value over a half-width bar.
 */
function PhoneStyleBars({ o, place, M }) {
  return (
    <div className="space-y-4">
      {STYLES.map(st => {
        const s = shown(o, place, st);
        const color = styleColor(st.key);
        const dp = st.rate === 'melee' || st.rate === 'ki' ? 1 : 2;
        const parts = subParts(o, M, st.key);
        return (
          <div key={st.key}>
            <Tip content={styleTip(o, place, M, st)}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="flex min-w-0 items-baseline gap-2">
                  <span className="flex items-center gap-2 text-sm font-semibold text-slate-100"><Swatch color={color} />{st.name}</span>
                  {st.rate && (
                    <span className={`whitespace-nowrap text-xs tabular-nums ${MUTED}`}>
                      <b className="font-semibold text-slate-100">{s.zero ? 'Never' : `${fmt(o.rate[st.rate], dp)}/min`}</b>
                      <span className="text-slate-500"> · league {fmt(M['r_' + st.rate], dp)}</span>
                    </span>
                  )}
                </span>
                <span className="whitespace-nowrap text-sm">{rankOrNever(s, place, 'style_' + st.key)}</span>
              </div>
              <div className="mt-1.5"><MedianTrack p={s.p} color={color} height={8} empty={s.zero} /></div>
            </Tip>
            {parts.length > 0 && (
              <div className="mt-2 grid grid-cols-2 gap-x-5 gap-y-2 pl-[18px]">
                {parts.map(part => (
                  <Tip key={part[0]} className="min-w-0" content={partTip(part, place)}>
                    <div className="flex items-baseline justify-between gap-1.5 text-xs">
                      <span className={MUTED}>{part[0]}</span>
                      <b className="tabular-nums text-slate-100">{partText(part)}</b>
                    </div>
                    <div className="mt-1"><MedianTrack p={place.pct[part[1]]} color={color} height={4} empty={part[3] === 0} /></div>
                  </Tip>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---- radar ------------------------------------------------------------------
function StyleRadar({ o, place, M, shapeColor }) {
  const R = 125, W = 440, cx = W / 2, cy = R + 44, H = cy + R + 60, N = STYLES.length;
  const pt = (i, r) => { const a = -Math.PI / 2 + i * 2 * Math.PI / N; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; };
  const poly = f => STYLES.map((_, i) => pt(i, f(i)).map(n => n.toFixed(1)).join(',')).join(' ');
  const grid = '#334155';
  const medianStroke = '#94a3b8';
  // A style never used sits at the centre, not at its tied rank.
  const vals = STYLES.map(st => { const s = shown(o, place, st); return s.zero ? 0 : Math.max(5, s.p ?? 0) / 100 * R; });
  return (
    <div className="relative mx-auto max-w-[440px]">
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full h-auto" role="img" aria-label="Fighting style radar">
        {[0.25, 0.75, 1].map(f => (
          <polygon key={f} points={poly(() => R * f)} fill={f === 1 ? ('#111827') : 'none'} stroke={grid} />
        ))}
        {/* League median: the 50th-percentile hexagon, dashed and lightly filled. */}
        <polygon points={poly(() => R * 0.5)} fill={medianStroke} fillOpacity=".08" stroke={medianStroke} strokeWidth="1.6" strokeDasharray="5 4" />
        {STYLES.map((_, i) => { const [x, y] = pt(i, R); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={grid} />; })}
        <polygon points={poly(i => vals[i])} fill={shapeColor} fillOpacity=".22" stroke={shapeColor} strokeWidth="2.4" strokeLinejoin="round" />
        {STYLES.map((st, i) => {
          const [x, y] = pt(i, vals[i]);
          return (
            <Tip key={st.key} as="g" content={styleTip(o, place, M, st)}>
              <circle cx={x} cy={y} r="14" fill="transparent" />
              <circle cx={x} cy={y} r="5" fill={styleColor(st.key)} stroke="#1a2031" strokeWidth="1.5" />
            </Tip>
          );
        })}
      </svg>
      {/* Names and ranks are HTML over the chart, so they can take hover and focus. */}
      {STYLES.map((st, i) => {
        const [x, y] = pt(i, R + 20);
        const s = shown(o, place, st);
        const side = Math.abs(x - cx) < 5 ? 'middle' : x > cx ? 'start' : 'end';
        const tx = side === 'middle' ? '-50%' : side === 'start' ? '0' : '-100%';
        const ty = y < cy - 20 ? '-55%' : y > cy + 20 ? '-5%' : '-50%';
        const k = 'style_' + st.key;
        return (
          <Tip key={st.key} content={styleTip(o, place, M, st)}
            className="absolute whitespace-nowrap text-xs sm:text-sm font-semibold leading-tight text-slate-100"
            style={{ left: `${(x / W * 100).toFixed(2)}%`, top: `${(y / H * 100).toFixed(2)}%`, transform: `translate(${tx}, ${ty})`, textAlign: side === 'middle' ? 'center' : side === 'start' ? 'left' : 'right' }}>
            <div><Swatch color={styleColor(st.key)} className="mr-1.5 align-[0px]" />{st.name}</div>
            <div className="mt-0.5">
              {s.zero ? <span className={`font-bold ${MUTED}`}>Never</span>
                : <RankText rank={place.rank[k]} pool={place.pool[k]} color={rankColor(s.p)} />}
            </div>
          </Tip>
        );
      })}
    </div>
  );
}

// ---- left column ------------------------------------------------------------
function BuildBlock({ build, isSelected, totalMatches }) {
  if (!build) return null;
  const byType = {};
  for (const c of build.capsules) byType[c.type] = (byType[c.type] || 0) + c.cost;
  const order = Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([t]) => t);
  // Grouped by type, biggest share first, so the list reads in the same order as the bar.
  const caps = [...build.capsules].sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type) || b.cost - a.cost || a.name.localeCompare(b.name));
  return (
    <div className="mt-5">
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <span className={KICKER}>{isSelected ? 'Capsules' : 'Most common build'}</span>
        <span className={`text-xs tabular-nums ${MUTED}`}>{build.cost} cost</span>
      </div>
      {!isSelected && (
        <div className="flex items-center gap-2 flex-wrap">
          <BuildPill label={build.label} />
          <span className={`text-xs ${MUTED}`}>{build.count} of {totalMatches} matches</span>
        </div>
      )}
      {!caps.length && <div className={`text-sm mt-2 ${MUTED}`}>No capsules equipped</div>}
      {caps.length > 0 && <div className="flex h-2 rounded overflow-hidden gap-0.5 my-2.5 bg-shell-track">
        {order.map(t => <span key={t} style={{ flex: byType[t], background: capsuleTypeColor(t) }} title={`${t} ${byType[t]}`} />)}
      </div>}
      <ul className="list-none m-0 p-0">
        {caps.map((c, i) => (
          <li key={`${c.name}-${i}`} className={`grid grid-cols-[10px_1fr_auto] gap-2 items-center py-1 text-sm ${
            i ? `border-0 border-t border-solid border-gray-700` : ''
          } text-slate-100`}>
            <Swatch color={capsuleTypeColor(c.type)} className="w-2 h-2" />
            <span>{c.name}</span>
            <span className={`text-xs tabular-nums ${MUTED}`}>{c.cost}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// `initialView` exists for scripts/smoke-character-page.mjs, which renders on the
// server and so can never click over to the bars.
export default function StyleBand({
  overview: o, place, baseline, builds, selected, allRow, onSelectBuild, initialView = 'radar',
}) {
  const [viz, setViz] = useState(initialView);
  const isPhone = useIsPhone();
  const M = baseline.medians;
  const styles = fightingStyles(place.pct);
  const primaryColor = styles[0] ? styleColor(styles[0].key) : ('#e2e8f0');
  const shownBuild = selected || builds[0] || null;
  const ai = o.ai;

  return (
    <div className="grid md:grid-cols-[290px_1fr] gap-7 mt-7">
      <div>
        <div className="mb-5">
          <BuildPicker builds={builds} selected={selected} allRow={allRow} onSelect={onSelectBuild} />
        </div>
        <div className="border-0 border-l-[3px] border-solid pl-3.5" style={{ borderColor: primaryColor }}>
          <div className={KICKER}>Fighting style</div>
          <h2 className="m-0 mt-0.5 text-2xl font-extrabold tracking-tight leading-tight" style={{ color: primaryColor }}>
            {styles.length ? styles[0].label : 'All-Rounder'}
            {styles[1] && <span className="block text-xl mt-0.5" style={{ color: styleColor(styles[1].key) }}>{styles[1].label}</span>}
          </h2>
          <BuildBlock build={shownBuild} isSelected={!!selected} totalMatches={allRow.matchCount} />
          {ai && (
            <div className="mt-4 pt-3 border-0 border-t border-solid border-gray-700">
              <div className={KICKER}>{selected ? 'AI' : 'Most used AI'}</div>
              <div className="text-sm font-semibold mt-0.5 text-slate-100">
                {ai.tied
                  ? <>Varied <span className={`font-normal text-xs ${MUTED}`}>{ai.strategies} strategies</span></>
                  : <>{ai.name} <span className={`font-normal text-xs ${MUTED}`}>{Math.round(ai.share * 100)}% of matches</span></>}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="min-w-0">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500">How it fights</div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs whitespace-nowrap text-slate-500">
              {viz === 'radar'
                ? <span className="inline-block w-4 border-0 border-t-2 border-dashed border-slate-400" />
                : <span className="inline-block w-0.5 h-3 bg-slate-400" />}
              <span><span className="hidden sm:inline">league </span>median</span>
            </span>
            <Segmented label="Chart type" value={viz} onChange={setViz}
              options={[{ value: 'radar', label: 'Radar' }, { value: 'bars', label: 'Bars' }]} />
          </div>
        </div>
        {viz === 'radar'
          ? <StyleRadar o={o} place={place} M={M} shapeColor={primaryColor} />
          : isPhone ? <PhoneStyleBars o={o} place={place} M={M} /> : <StyleBars o={o} place={place} M={M} />}
      </div>
    </div>
  );
}
